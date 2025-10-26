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
export const addBulkResumeProcessingJob = async (data: {
  files: Array<{
    name: string;
    content: string;
    type: string;
  }>;
  userId: string;
  organizationId: string;
  jobId?: string;
  customRules?: string;
}) => {
  return await resumeProcessingQueue.add('process-bulk-resumes', data, {
    priority: 10,
    delay: 0,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  });
};

// Single resume processing job producer (for individual files)
export const addSingleResumeProcessingJob = async (data: {
  fileContent: string;
  fileName: string;
  fileType: string;
  userId: string;
  organizationId: string;
  jobId?: string;
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