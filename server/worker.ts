import 'dotenv/config';
import { Worker } from 'bullmq';
import { redisConnection, closeRedisConnection } from './redis';
import { resumeProcessingService } from './resumeProcessingService';
import { emailService } from './emailService';
import { matchingService } from './matchingService';
import { fileStorageService } from './fileStorageService';
import { ragIndexingService } from './ragIndexingService';

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
        job.updateProgress(5);

        // For text files, we don't need to save locally - just use the content directly
        // For other file types, save locally for processing
        if (fileType !== 'text') {
          console.log(`💾 Saving file locally...`);
          let savedFileInfo;
          try {
            savedFileInfo = await fileStorageService.saveFileFromBase64(
              fileContent,
              fileName,
              fileType || 'text/plain',
              userId
            );
            console.log(`✅ File saved locally: ${savedFileInfo.relativePath}`);
          } catch (fileError) {
            console.warn(`⚠️ Failed to save file locally (will continue without local file):`, fileError);
            // Continue processing even if file saving fails
          }
        } else {
          console.log(`📝 Text file detected - using content directly, no local save needed`);
        }

        job.updateProgress(10);

        // Process resume with AI
        const fileSize = fileContent?.length || 0;
        console.log(`🔄 Processing resume with AI, file type: ${fileType}, file size: ${fileSize}, custom rules: ${customRules ? 'provided' : 'none'}`);
        const processedResume = await resumeProcessingService.processResume(fileContent, fileType, customRules, fileSize);
        console.log(`✅ Resume processed successfully:`, { name: processedResume.name, email: processedResume.email });

        job.updateProgress(30);

        // Get organization for database operations
        const { storage } = await import('./storage');
        const organization = await storage.getOrganizationById(organizationId);
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

        // Index resume in RAG system for semantic search
        try {
          console.log(`📚 Indexing resume ${savedProfile.id} in RAG system...`);
          const ragResult = await ragIndexingService.indexResume({
            id: savedProfile.id,
            name: savedProfile.name,
            email: savedProfile.email,
            phone: savedProfile.phone,
            summary: savedProfile.summary,
            experience: savedProfile.experience,
            skills: savedProfile.skills,
            education: savedProfile.education,
            certifications: savedProfile.certifications,
            languages: savedProfile.languages,
            resumeText: savedProfile.resumeText,
            organizationId: savedProfile.organizationId
          });
          console.log(`📚 RAG indexing result:`, ragResult.message);
        } catch (ragError) {
          console.error(`⚠️ Failed to index resume in RAG (non-blocking):`, ragError);
          // Don't fail the entire job if RAG indexing fails
        }

        job.updateProgress(50);

        // Score against the specific job (jobId is now always required)
        if (!numericJobId) {
          throw new Error('Job ID is required for resume processing');
        }

        const targetJob = await storage.getJob(numericJobId);
        if (!targetJob || targetJob.organizationId !== organization.id) {
          throw new Error('Job not found or doesn\'t belong to your organization');
        }
        console.log(`🎯 Scoring resume against job: ${targetJob.title}`);

        job.updateProgress(60);

        // Process job scoring and invitation for the single job
        try {
          const jobScore = await resumeProcessingService.scoreResumeAgainstJob(
            processedResume,
            targetJob.title,
            targetJob.description,
            targetJob.requirements || targetJob.description,
            customRules,
            targetJob.id,
            fileContent
          );

          await storage.createJobScore({
            profileId: savedProfile.id,
            jobId: targetJob.id,
            ...jobScore,
          });

          job.updateProgress(80);

          // Auto-invite if score meets threshold
          const threshold = typeof (targetJob as any).emailInviteThreshold === 'number' ? (targetJob as any).emailInviteThreshold : (typeof (targetJob as any).scoreMatchingThreshold === 'number' ? (targetJob as any).scoreMatchingThreshold : 30);
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
                jobId: targetJob.id.toString(),
                name: processedResume.name || processedResume.email,
                jobTitle: targetJob.title,
                jobDescription: targetJob.description,
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
              jobTitle: targetJob.title,
              companyName,
              invitationLink,
              matchScore: overall,
              matchSummary: jobScore.matchSummary,
            }).catch(err => console.warn('📧 Invitation email failed (non-blocking):', err));
          }

          job.updateProgress(90);

        } catch (error) {
          console.error(`Error scoring resume against job ${targetJob.id}:`, error);
          throw error; // Fail the job if scoring fails
        }

        job.updateProgress(100);

        console.log(`✅ Successfully completed single resume processing for ${fileName} against job ${targetJob.title}`);
        return {
          success: true,
          profile: savedProfile,
          processedResume,
          jobId: targetJob.id,
          jobTitle: targetJob.title,
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
            job.updateProgress(baseProgress + 3);

            // For text files, we don't need to save locally - just use the content directly
            // For other file types, save locally for processing
            if (file.type !== 'text') {
              console.log(`💾 Saving file locally...`);
              let savedFileInfo;
              try {
                savedFileInfo = await fileStorageService.saveFileFromBase64(
                  file.content,
                  file.name,
                  file.type || 'text/plain',
                  userId
                );
                console.log(`✅ File saved locally: ${savedFileInfo.relativePath}`);
              } catch (fileError) {
                console.warn(`⚠️ Failed to save file locally (will continue without local file):`, fileError);
                // Continue processing even if file saving fails
              }
            } else {
              console.log(`📝 Text file detected - using content directly, no local save needed`);
            }

            job.updateProgress(baseProgress + 5);

            // Process resume with AI
            const bulkFileSize = file.content?.length || 0;
            const processedResume = await resumeProcessingService.processResume(file.content, file.type, customRules, bulkFileSize);
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

            // Index resume in RAG system for semantic search
            try {
              console.log(`📚 Indexing resume ${savedProfile.id} in RAG system...`);
              const ragResult = await ragIndexingService.indexResume({
                id: savedProfile.id,
                name: savedProfile.name,
                email: savedProfile.email,
                phone: savedProfile.phone,
                summary: savedProfile.summary,
                experience: savedProfile.experience,
                skills: savedProfile.skills,
                education: savedProfile.education,
                certifications: savedProfile.certifications,
                languages: savedProfile.languages,
                resumeText: savedProfile.resumeText,
                organizationId: savedProfile.organizationId
              });
              console.log(`📚 RAG indexing result:`, ragResult.message);
            } catch (ragError) {
              console.error(`⚠️ Failed to index resume in RAG (non-blocking):`, ragError);
              // Don't fail the entire job if RAG indexing fails
            }

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
                  customRules,
                  jobItem.id,
                  file.content
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
    concurrency: 15, // Increased concurrency for better job throughput
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
    concurrency: 15, // Increased concurrency for better email throughput
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
    concurrency: 15, // Increased concurrency for better email throughput
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
    concurrency: 8, // Increased concurrency for better matching throughput
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