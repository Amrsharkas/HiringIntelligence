import 'dotenv/config';
import { Worker } from 'bullmq';
import { redisConnection, closeRedisConnection } from './redis';
import { resumeProcessingService } from './resumeProcessingService';
import { emailService } from './emailService';
import { matchingService } from './matchingService';

// Check Redis connection health
const checkRedisHealth = async () => {
  try {
    // Test connection with ping
    const result = await redisConnection.ping();
    console.log('🔗 Redis connection check successful:', result);
  } catch (error) {
    console.error('❌ Redis health check failed:', error);
    // Don't exit, just log the error as BullMQ will handle reconnection
  }
};

// Resume processing worker
const resumeProcessingWorker = new Worker(
  'resume-processing',
  async (job) => {
    console.log(`🔄 Processing resume job ${job.id} with name: ${job.name}`);

    try {
      if (job.name === 'process-single-resume') {
        const { fileContent, fileName, fileType, userId, organizationId, jobId, customRules } = job.data;
        const numericJobId = jobId ? parseInt(jobId, 10) : undefined;

        console.log(`📄 Processing single resume: ${fileName} for user ${userId}, organization ${organizationId}`);

        // Update progress
        job.updateProgress(10);

        // Process resume with AI
        console.log(`🔄 Processing resume with AI, file type: ${fileType}, custom rules: ${customRules ? 'provided' : 'none'}`);
        const processedResume = await resumeProcessingService.processResume(fileContent, fileType, customRules);
        console.log(`✅ Resume processed successfully:`, { name: processedResume.name, email: processedResume.email });

        job.updateProgress(30);

        // Get organization for database operations
        const { storage } = await import('./storage');
        const organization = await storage.getOrganizationByUser(userId);
        if (!organization) {
          throw new Error('Organization not found');
        }

        // Save to database
        const profileData = {
          ...processedResume,
          resumeText: fileContent,
          organizationId: organization.id,
          createdBy: userId,
        };

        const savedProfile = await storage.createResumeProfile(profileData);
        console.log(`💾 Saved profile to database: ${savedProfile.id}`);

        job.updateProgress(50);

        // Score against jobs - either specific job or all organization jobs
        let jobs;
        if (numericJobId) {
          // Score against specific job only
          const job = await storage.getJob(numericJobId);
          if (!job || job.organizationId !== organization.id) {
            throw new Error('Job not found or doesn\'t belong to your organization');
          }
          jobs = [job];
          console.log(`🎯 Scoring resume against specific job: ${job.title}`);
        } else {
          // Score against all organization jobs
          jobs = await storage.getJobsByOrganization(organization.id);
          console.log(`🎯 Scoring resume against all ${jobs.length} jobs`);
        }

        job.updateProgress(60);

        // Process job scoring and invitations
        for (let i = 0; i < jobs.length; i++) {
          const jobItem = jobs[i];
          try {
            const jobScore = await resumeProcessingService.scoreResumeAgainstJob(
              processedResume,
              jobItem.title,
              jobItem.description,
              jobItem.requirements || jobItem.description,
              customRules
            );

            await storage.createJobScore({
              profileId: savedProfile.id,
              jobId: jobItem.id,
              ...jobScore,
            });

            // Auto-invite if score meets threshold
            const threshold = typeof (jobItem as any).emailInviteThreshold === 'number' ? (jobItem as any).emailInviteThreshold : (typeof (jobItem as any).scoreMatchingThreshold === 'number' ? (jobItem as any).scoreMatchingThreshold : 30);
            const overall = jobScore.overallScore ?? 0;
            if (overall >= threshold && processedResume.email) {
              const { localDatabaseService } = await import('./localDatabaseService');
              const companyName = organization.companyName || 'Our Company';

              // Generate unique token and username
              const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
              const names = (processedResume.name || '').trim().split(/\s+/);
              const firstName = names[0] || '';
              const lastName = names.slice(1).join(' ') || '';

              // Create user profile in local database
              try {
                await localDatabaseService.createUserProfile({
                  userId: savedProfile.id.toString(),
                  name: processedResume.name || `${firstName} ${lastName}`.trim(),
                  email: processedResume.email,
                  phone: '',
                  professionalSummary: processedResume.summary || '',
                  experienceLevel: '',
                  location: '',
                  fileId: processedResume.fileId,
                } as any);
                console.log(`✅ Created user profile in local database`);
              } catch (userErr) {
                console.error('Error creating user profile in local database:', userErr);
              }

              // Create interview invitation
              try {
                await localDatabaseService.createJobMatch({
                  userId: savedProfile.id.toString(),
                  jobId: jobItem.id.toString(),
                  name: processedResume.name || processedResume.email,
                  jobTitle: jobItem.title,
                  jobDescription: jobItem.description,
                  companyName: companyName,
                  matchScore: overall,
                  status: 'invited',
                  interviewDate: new Date(),
                  token: token,
                } as any);
                console.log(`✅ Created interview invitation in local database`);
              } catch (aiErr) {
                console.error('Error creating AI interview invitation:', aiErr);
              }

              // Send invitation email
              const baseUrl = process.env.APPLICANTS_APP_URL || 'https://applicants.platohiring.com';
              const invitationLink = `${baseUrl.replace(/\/$/, '')}/ai-interview-initation?token=${encodeURIComponent(token)}`;

              const { emailService } = await import('./emailService');
              emailService.sendInterviewInvitationEmail({
                applicantName: processedResume.name || processedResume.email,
                applicantEmail: processedResume.email,
                jobTitle: jobItem.title,
                companyName,
                invitationLink,
                matchScore: overall,
                matchSummary: jobScore.matchSummary,
              }).catch(err => console.warn('📧 Invitation email failed (non-blocking):', err));
            }

            // Update progress based on job completion
            job.updateProgress(60 + Math.floor((i + 1) / jobs.length * 30));

          } catch (error) {
            console.error(`Error scoring resume against job ${jobItem.id}:`, error);
            // Continue with other jobs even if one fails
          }
        }

        job.updateProgress(100);

        console.log(`✅ Successfully completed single resume processing for ${fileName}`);
        return {
          success: true,
          profile: savedProfile,
          processedResume,
          scoresCount: jobs.length,
          message: 'Resume processed successfully'
        };

      } else if (job.name === 'process-bulk-resumes') {
        const { files, userId, organizationId, jobId, customRules } = job.data;
        const numericJobId = jobId ? parseInt(jobId, 10) : undefined;

        console.log(`📦 Processing bulk resumes: ${files.length} files for user ${userId}, organization ${organizationId}`);

        const results = [];

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const baseProgress = Math.floor((i / files.length) * 90);

          try {
            console.log(`📄 Processing file ${i + 1}/${files.length}: ${file.name}`);

            // Update progress for current file
            job.updateProgress(baseProgress + 5);

            // Process resume with AI
            const processedResume = await resumeProcessingService.processResume(file.content, file.type, customRules);
            console.log(`✅ Processed resume: ${processedResume.name} (${processedResume.email})`);

            job.updateProgress(baseProgress + 15);

            // Get organization and save to database
            const { storage } = await import('./storage');
            const organization = await storage.getOrganizationByUser(userId);
            if (!organization) {
              throw new Error('Organization not found');
            }

            const profileData = {
              ...processedResume,
              resumeText: file.content,
              organizationId: organization.id,
              createdBy: userId,
            };

            const savedProfile = await storage.createResumeProfile(profileData);
            console.log(`💾 Saved profile: ${savedProfile.id}`);

            job.updateProgress(baseProgress + 25);

            // Score against jobs
            let jobs;
            if (numericJobId) {
              const job = await storage.getJob(numericJobId);
              if (!job || job.organizationId !== organization.id) {
                throw new Error('Job not found or doesn\'t belong to your organization');
              }
              jobs = [job];
            } else {
              jobs = await storage.getJobsByOrganization(organization.id);
            }

            // Process job scoring (simplified for bulk processing)
            let scoresCount = 0;
            for (const jobItem of jobs) {
              try {
                const jobScore = await resumeProcessingService.scoreResumeAgainstJob(
                  processedResume,
                  jobItem.title,
                  jobItem.description,
                  jobItem.requirements || jobItem.description,
                  customRules
                );

                await storage.createJobScore({
                  profileId: savedProfile.id,
                  jobId: jobItem.id,
                  ...jobScore,
                });

                scoresCount++;

                // Auto-invite high-scoring candidates
                const threshold = typeof (jobItem as any).emailInviteThreshold === 'number' ? (jobItem as any).emailInviteThreshold : (typeof (jobItem as any).scoreMatchingThreshold === 'number' ? (jobItem as any).scoreMatchingThreshold : 30);
                const overall = jobScore.overallScore ?? 0;
                if (overall >= threshold && processedResume.email) {
                  // For bulk processing, just log invitations but don't send them immediately
                  console.log(`📧 Candidate ${processedResume.name} qualifies for invitation to ${jobItem.title} (score: ${overall}%)`);
                }

              } catch (error) {
                console.error(`Error scoring against job ${jobItem.id}:`, error);
              }
            }

            job.updateProgress(baseProgress + 35);

            results.push({
              file: file.name,
              success: true,
              profile: savedProfile,
              processedResume,
              scoresCount,
              message: 'Resume processed successfully'
            });

            console.log(`✅ Completed processing ${file.name}`);

          } catch (error) {
            console.error(`❌ Failed to process ${file.name}:`, error);
            results.push({
              file: file.name,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
              message: 'Failed to process resume'
            });
          }

          // Update overall progress
          job.updateProgress(Math.floor((i + 1) / files.length * 90));
        }

        job.updateProgress(100);

        console.log(`✅ Successfully completed bulk resume processing: ${results.filter(r => r.success).length}/${files.length} files processed`);

        return {
          success: true,
          results,
          totalFiles: files.length,
          successfulFiles: results.filter(r => r.success).length,
          failedFiles: results.filter(r => !r.success).length,
          message: `Bulk processing completed: ${results.filter(r => r.success).length}/${files.length} files processed successfully`
        };

      } else {
        // Legacy resume processing (for backward compatibility)
        const { resumeId, userId, fileContent, fileName } = job.data;

        console.log(`🔄 Processing legacy resume ${resumeId} for user ${userId}`);

        job.updateProgress(50);

        const result = await resumeProcessingService.processResume(fileContent, fileName);
        console.log(`✅ Successfully processed resume ${resumeId}`);

        job.updateProgress(100);
        return result;
      }
    } catch (error) {
      console.error(`❌ Error processing resume job ${job.id}:`, error);
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 3, // Reduced concurrency for better resource management
    // Set job timeout to handle long-running operations
    settings: {
      // Increase lock duration to handle long-running operations
      lockDuration: 180000, // 3 minutes
      // Increase max stalled count to prevent job loss
      maxStalledCount: 3,
      // Set backoff strategy for failed jobs
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    },
    // Set job timeout to prevent Redis timeouts
    jobOptions: {
      // Timeout for individual jobs
      timeout: 300000, // 5 minutes
    }
  }
);

// Email sending worker
const emailWorker = new Worker(
  'email-sending',
  async (job) => {
    const { to, subject, template, data } = job.data;

    console.log(`Sending email to ${to} with subject: ${subject}`);

    try {
      let result;

      switch (template) {
        case 'interview-scheduled':
          result = await emailService.sendInterviewScheduledEmail(data);
          break;
        default:
          throw new Error(`Unknown email template: ${template}`);
      }

      console.log(`Successfully sent email to ${to}`);
      return { success: true, result };
    } catch (error) {
      console.error(`Error sending email to ${to}:`, error);
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 5, // Reduced from 10 to reduce Redis load
    settings: {
      lockDuration: 180000, // 3 minutes
      maxStalledCount: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    },
    jobOptions: {
      timeout: 120000, // 2 minutes timeout
    }
  }
);

// Interview invitation email worker
const interviewInvitationWorker = new Worker(
  'email-sending',
  async (job) => {
    if (job.name === 'send-interview-invitation') {
      const { applicantName, applicantEmail, jobTitle, companyName, invitationLink, matchScore, matchSummary } = job.data;

      console.log(`Sending interview invitation email to ${applicantEmail} for job: ${jobTitle}`);

      try {
        const result = await emailService.sendInterviewInvitationEmail({
          applicantName,
          applicantEmail,
          jobTitle,
          companyName,
          invitationLink,
          matchScore,
          matchSummary,
        });

        console.log(`Successfully sent interview invitation email to ${applicantEmail}`);
        return { success: true, result };
      } catch (error) {
        console.error(`Error sending interview invitation email to ${applicantEmail}:`, error);
        throw error;
      }
    }
  },
  {
    connection: redisConnection,
    concurrency: 5, // Reduced from 10 to reduce Redis load
    settings: {
      lockDuration: 180000, // 3 minutes
      maxStalledCount: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    },
    jobOptions: {
      timeout: 120000, // 2 minutes timeout
    }
  }
);

// Candidate matching worker
const candidateMatchingWorker = new Worker(
  'candidate-matching',
  async (job) => {
    const { jobId } = job.data;

    console.log(`Finding matching candidates for job ${jobId}`);

    try {
      const result = await matchingService.generateJobMatches(parseInt(jobId));
      console.log(`Successfully found ${result.length} candidates for job ${jobId}`);
      return result;
    } catch (error) {
      console.error(`Error finding candidates for job ${jobId}:`, error);
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 2, // Reduced from 3 to reduce Redis load further
    settings: {
      lockDuration: 180000, // 3 minutes
      maxStalledCount: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    },
    jobOptions: {
      timeout: 300000, // 5 minutes timeout
    }
  }
);

// Handle worker events
const setupWorkerEvents = (worker: Worker, workerName: string) => {
  worker.on('completed', (job) => {
    console.log(`${workerName} completed job ${job.id}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`${workerName} failed job ${job?.id}:`, err);
  });

  worker.on('error', (err) => {
    console.error(`${workerName} error:`, err);
  });
};

setupWorkerEvents(resumeProcessingWorker, 'Resume Processing Worker');
setupWorkerEvents(emailWorker, 'Email Worker');
setupWorkerEvents(interviewInvitationWorker, 'Interview Invitation Worker');
setupWorkerEvents(candidateMatchingWorker, 'Candidate Matching Worker');

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down workers...');
  await Promise.all([
    resumeProcessingWorker.close(),
    emailWorker.close(),
    interviewInvitationWorker.close(),
    candidateMatchingWorker.close(),
  ]);
  await closeRedisConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down workers...');
  await Promise.all([
    resumeProcessingWorker.close(),
    emailWorker.close(),
    interviewInvitationWorker.close(),
    candidateMatchingWorker.close(),
  ]);
  await closeRedisConnection();
  process.exit(0);
});

// Start workers
console.log('BullMQ workers started...');

// Optional: Check Redis health after a delay
setTimeout(() => {
  checkRedisHealth();
}, 2000);