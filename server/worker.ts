import 'dotenv/config';
import { Worker } from 'bullmq';
import { redisConnection, closeRedisConnection } from './redis';
import { resumeProcessingService } from './resumeProcessingService';
import { emailService } from './emailService';
import { matchingService } from './matchingService';
import { fileStorageService } from './fileStorageService';
import { ragIndexingService } from './ragIndexingService';
import { localDatabaseService } from './localDatabaseService';
import { twilioVoiceService } from './services/twilioVoiceService';
import { interviewReminderQueue } from './queues';

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
        const { filePath, fileName, fileType, userId, organizationId, jobId, customRules } = job.data;
        const numericJobId = jobId ? parseInt(jobId, 10) : undefined;

        console.log(`📄 Processing single resume: ${fileName} for user ${userId}, organization ${organizationId}`);

        // Read file content from disk (optimized - file path stored in Redis instead of content)
        let fileContent: string;
        try {
          fileContent = await fileStorageService.readFileAsBase64(filePath);
          console.log(`📖 Read file from disk: ${filePath} (${fileContent.length} chars base64)`);
        } catch (readError) {
          console.error(`❌ Failed to read file from disk: ${filePath}`, readError);
          throw new Error(`Failed to read resume file: ${readError instanceof Error ? readError.message : 'Unknown error'}`);
        }

        // Update progress
        job.updateProgress(5);

        // File is already saved to disk before queuing (optimized flow)
        console.log(`📁 File already on disk at: ${filePath}`);

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

            // Schedule 2-day voice call reminder (only if phone number is available)
            if (processedResume.phone) {
              try {
                const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
                const reminderJob = await interviewReminderQueue.add(
                  'interview-call-reminder',
                  {
                    matchId: savedProfile.id.toString(),
                    profileId: savedProfile.id,
                    jobId: targetJob.id,
                    jobTitle: targetJob.title,
                    companyName,
                    applicantName: processedResume.name || processedResume.email,
                    applicantPhone: processedResume.phone,
                    token: token,
                  },
                  {
                    delay: TWO_DAYS_MS,
                    jobId: `reminder-${savedProfile.id}-${targetJob.id}`,
                  }
                );
                console.log(`⏰ Scheduled voice call reminder for 2 days: job ${reminderJob.id}`);
              } catch (reminderErr) {
                console.error('Error scheduling voice call reminder (non-blocking):', reminderErr);
              }
            } else {
              console.log(`📵 No phone number for ${processedResume.name || processedResume.email}, skipping voice call reminder scheduling`);
            }
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
    } else if (job.name === 'send-interview-reminder') {
      const { applicantName, applicantEmail, jobTitle, companyName, invitationLink, matchId, reminderType } = job.data;

      console.log(`Processing interview reminder (${reminderType}) for ${applicantEmail}`);

      try {
        // Check if interview has started (status changed from 'invited')
        const match = await localDatabaseService.getJobMatch(matchId);

        if (!match) {
          console.log(`Match ${matchId} not found, skipping reminder`);
          return { success: false, reason: 'match_not_found' };
        }

        // Only send reminder if status is still 'invited'
        if (match.status !== 'invited') {
          console.log(`Match ${matchId} status is '${match.status}', skipping reminder`);
          return { success: false, reason: 'interview_already_started' };
        }

        // Send the reminder email
        const result = await emailService.sendInterviewReminderEmail({
          applicantName,
          applicantEmail,
          jobTitle,
          companyName,
          invitationLink,
          reminderType,
        });

        // Update the reminder sent flag
        const updateData = reminderType === '1h'
          ? { reminder1hSent: true }
          : { reminder24hSent: true };
        await localDatabaseService.updateJobMatch(matchId, updateData);

        console.log(`Successfully sent interview reminder (${reminderType}) to ${applicantEmail}`);
        return { success: true, result };
      } catch (error) {
        console.error(`Error sending interview reminder to ${applicantEmail}:`, error);
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

// Voice call worker
const voiceCallWorker = new Worker(
  'voice-calls',
  async (job) => {
    const { toPhoneNumber, organizationId, systemPrompt, voice } = job.data;

    console.log(`Initiating voice call to ${toPhoneNumber} for organization ${organizationId}`);

    try {
      const result = await twilioVoiceService.initiateCall({
        toPhoneNumber,
        organizationId,
        systemPrompt: systemPrompt || "You are a helpful AI assistant having a phone conversation.",
        voice: voice || "alloy",
      });

      if (result.success) {
        console.log(`Successfully initiated voice call: ${result.callId} (SID: ${result.twilioCallSid})`);
        return result;
      } else {
        console.error(`Failed to initiate voice call: ${result.error}`);
        throw new Error(result.error);
      }
    } catch (error) {
      console.error(`Error initiating voice call to ${toPhoneNumber}:`, error);
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 5, // Limit concurrent voice calls
    settings: {
      lockDuration: 300000, // 5 minutes
      maxStalledCount: 2,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    },
    jobOptions: {
      timeout: 600000, // 10 minutes timeout
    }
  }
);

// Interview call reminder worker - calls candidates 2 days after invitation if they haven't started
const interviewReminderWorker = new Worker(
  'interview-reminders',
  async (job) => {
    if (job.name === 'interview-call-reminder') {
      const { matchId, profileId, jobId, jobTitle, companyName, applicantName, applicantPhone, token } = job.data;

      console.log(`📞 Processing interview call reminder for ${applicantName} (${jobTitle})`);

      try {
        // Check if interview has started
        const match = await localDatabaseService.getJobMatch(matchId);

        if (!match) {
          console.log(`Match ${matchId} not found, skipping call`);
          return { success: false, reason: 'match_not_found' };
        }

        // Only call if status is still 'invited'
        if (match.status !== 'invited') {
          console.log(`Match ${matchId} status is '${match.status}', skipping call`);
          return { success: false, reason: 'interview_already_started' };
        }

        // Check if phone number is available
        if (!applicantPhone) {
          console.log(`No phone number for ${applicantName}, skipping call`);
          return { success: false, reason: 'no_phone_number' };
        }

        // Build prompts with job context
        const systemPrompt = `You are an AI recruitment assistant. The candidate was invited to interview for the ${jobTitle} position at ${companyName} 2 days ago but hasn't started yet. Your goal is to remind them about this opportunity and encourage them to complete their interview. Be professional, friendly, and create urgency without being pushy.`;

        const greetingMessage = `Hi! This is Plato calling on behalf of ${companyName}. You were invited to interview for our ${jobTitle} position a couple of days ago. I wanted to check in and see if you had any questions about the opportunity!`;

        // Initiate the call
        const result = await twilioVoiceService.initiateCall({
          toPhoneNumber: applicantPhone,
          systemPrompt,
          voice: 'marin',
          greetingMessage,
        });

        if (result.success) {
          console.log(`✅ Interview reminder call initiated: ${result.callId}`);
          return { success: true, callId: result.callId };
        } else {
          console.error(`❌ Failed to initiate reminder call: ${result.error}`);
          throw new Error(result.error);
        }
      } catch (error) {
        console.error(`Error processing interview reminder for ${applicantName}:`, error);
        throw error;
      }
    }
  },
  {
    connection: redisConnection,
    concurrency: 3, // Limit concurrent reminder calls
    settings: {
      lockDuration: 300000, // 5 minutes
      maxStalledCount: 2,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    },
    jobOptions: {
      timeout: 600000, // 10 minutes timeout
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
setupWorkerEvents(voiceCallWorker, 'Voice Call Worker');
setupWorkerEvents(interviewReminderWorker, 'Interview Reminder Worker');

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down workers...');
  await Promise.all([
    resumeProcessingWorker.close(),
    emailWorker.close(),
    interviewInvitationWorker.close(),
    candidateMatchingWorker.close(),
    voiceCallWorker.close(),
    interviewReminderWorker.close(),
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
    voiceCallWorker.close(),
    interviewReminderWorker.close(),
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