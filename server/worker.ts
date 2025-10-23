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
    const { resumeId, userId, fileContent, fileName } = job.data;

    console.log(`Processing resume ${resumeId} for user ${userId}`);

    try {
      const result = await resumeProcessingService.processResume(fileContent, fileName);
      console.log(`Successfully processed resume ${resumeId}`);
      return result;
    } catch (error) {
      console.error(`Error processing resume ${resumeId}:`, error);
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 5,
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
    concurrency: 10,
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
    concurrency: 10,
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
    concurrency: 3,
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