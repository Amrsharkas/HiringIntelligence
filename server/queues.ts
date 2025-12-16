import { Queue } from 'bullmq';
import { redisConnection, closeRedisConnection } from './redis';

// Export queue instances
export const resumeProcessingQueue = new Queue('resume-processing', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

export const emailQueue = new Queue('email-sending', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

export const candidateMatchingQueue = new Queue('candidate-matching', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

export const voiceCallQueue = new Queue('voice-calls', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

export const interviewReminderQueue = new Queue('interview-reminders', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
});

// Close queues and Redis connection
export const closeQueues = async () => {
  await Promise.all([
    resumeProcessingQueue.close(),
    emailQueue.close(),
    candidateMatchingQueue.close(),
    voiceCallQueue.close(),
    interviewReminderQueue.close(),
  ]);
  await closeRedisConnection();
};