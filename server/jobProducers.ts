import { resumeProcessingQueue, emailQueue, candidateMatchingQueue } from './queues';
import { InterviewEmailData } from './emailService';

// Resume processing job producer
export const addResumeProcessingJob = async (data: {
  resumeId: string;
  userId: string;
  fileContent: string;
  fileName: string;
}) => {
  return await resumeProcessingQueue.add('process-resume', data, {
    priority: 10,
    delay: 0,
  });
};

// Interview scheduled email job producer
export const addInterviewScheduledEmailJob = async (data: InterviewEmailData) => {
  return await emailQueue.add('send-email', {
    to: data.applicantEmail,
    subject: `🎯 Interview Scheduled: ${data.applicantName} - ${data.jobTitle} at ${data.companyName}`,
    template: 'interview-scheduled',
    data
  }, {
    priority: 5,
    delay: 0,
  });
};

// Interview invitation email job producer
export const addInterviewInvitationEmailJob = async (data: {
  applicantName: string;
  applicantEmail: string;
  jobTitle: string;
  companyName: string;
  invitationLink: string;
  matchScore?: number;
  matchSummary?: string;
}) => {
  return await emailQueue.add('send-interview-invitation', data, {
    priority: 5,
    delay: 0,
  });
};

// Generic email job producer for future templates
export const addEmailJob = async (data: {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
}) => {
  return await emailQueue.add('send-email', data, {
    priority: 5,
    delay: 0,
  });
};

// Candidate matching job producer
export const addCandidateMatchingJob = async (data: {
  jobId: string;
}) => {
  return await candidateMatchingQueue.add('find-candidates', data, {
    priority: 8,
    delay: 0,
  });
};

// Scheduled job producers
export const scheduleEmailJob = async (
  data: {
    to: string;
    subject: string;
    template: string;
    data: Record<string, any>;
  },
  delay: number
) => {
  return await emailQueue.add('send-email', data, {
    delay,
    priority: 3,
  });
};

export const scheduleResumeProcessingJob = async (
  data: {
    resumeId: string;
    userId: string;
    fileContent: string;
    fileName: string;
  },
  delay: number
) => {
  return await resumeProcessingQueue.add('process-resume', data, {
    delay,
    priority: 7,
  });
};

export const scheduleInterviewEmailJob = async (
  data: InterviewEmailData,
  delay: number
) => {
  return await emailQueue.add('send-email', {
    to: data.applicantEmail,
    subject: `🎯 Interview Scheduled: ${data.applicantName} - ${data.jobTitle} at ${data.companyName}`,
    template: 'interview-scheduled',
    data
  }, {
    delay,
    priority: 3,
  });
};

// Bulk resume processing job producer
// Note: This is now primarily used for creating multiple queue jobs for files against a SINGLE job
// For processing against ALL jobs, the routes.ts handles creating jobs for each file+job combination
// OPTIMIZED: Now accepts filePath instead of content to reduce Redis memory usage
export const addBulkResumeProcessingJob = async (data: {
  files: Array<{
    name: string;
    filePath: string;  // Path to file on disk (optimized)
    type: string;
  }>;
  userId: string;
  organizationId: string;
  jobId: string; // Required - must be a specific job ID
  customRules?: string;
}) => {
  const jobPromises = data.files.map(file =>
    addSingleResumeProcessingJob({
      filePath: file.filePath,
      fileName: file.name,
      fileType: file.type,
      userId: data.userId,
      organizationId: data.organizationId,
      jobId: data.jobId,
      customRules: data.customRules
    })
  );

  return await Promise.all(jobPromises);
};

// Single resume processing job producer (for individual files)
// Note: jobId is now required - each queue job processes one resume against one specific job
// OPTIMIZED: Now accepts filePath instead of fileContent to reduce Redis memory usage
export const addSingleResumeProcessingJob = async (data: {
  filePath: string;      // Path to file on disk (optimized - reduces Redis memory)
  fileName: string;
  fileType: string;
  userId: string;
  organizationId: string;
  jobId: string; // Required - each queue job handles exactly one resume + one job
  customRules?: string;
}) => {
  return await resumeProcessingQueue.add('process-single-resume', data, {
    priority: 10,
    delay: 0,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  });
};