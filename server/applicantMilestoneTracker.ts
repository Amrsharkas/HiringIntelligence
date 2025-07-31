import { storage } from "./storage";
import { sendApplicantMilestoneNotification } from "./emailService";

// Track applicant milestones and send notifications
export async function trackApplicantMilestone(jobId: number): Promise<void> {
  try {
    console.log(`📊 Tracking applicant milestone for job ${jobId}...`);
    
    // Get the job details
    const job = await storage.getJob(jobId);
    if (!job) {
      console.log(`❌ Job ${jobId} not found`);
      return;
    }

    // Get the job creator/owner
    const user = await storage.getUser(job.createdById);
    if (!user) {
      console.log(`❌ User ${job.createdById} not found`);
      return;
    }

    // Get current applicant count from Airtable platojobapplications table
    const { realApplicantsAirtableService } = await import('./realApplicantsAirtableService');
    const allApplicants = await realApplicantsAirtableService.getAllApplicants();
    const jobApplicants = allApplicants.filter(applicant => 
      applicant.jobId === jobId.toString()
    );
    const applicantCount = jobApplicants.length;
    
    console.log(`📊 Job "${job.title}" currently has ${applicantCount} applicants`);

    // Send milestone notifications for specific counts (5, 10, 15)
    // Only send notifications below 20 applicants as requested
    if ((applicantCount === 5 || applicantCount === 10 || applicantCount === 15) && applicantCount < 20) {
      console.log(`🎯 Milestone reached: ${applicantCount} applicants for job "${job.title}"`);
      
      try {
        await sendApplicantMilestoneNotification(user, job, applicantCount);
        console.log(`✅ Milestone notification sent for ${applicantCount} applicants`);
      } catch (error) {
        console.error(`❌ Failed to send milestone notification for ${applicantCount} applicants:`, error);
      }
    }
  } catch (error) {
    console.error('❌ Error tracking applicant milestone:', error);
  }
}

// Background service to check for milestone updates
export async function checkAllJobMilestones(): Promise<void> {
  try {
    console.log('📊 Checking all job milestones...');
    
    // Get all active jobs (this would need to be implemented in storage)
    // For now, we'll skip this as it would be called by a separate cron job
    
  } catch (error) {
    console.error('❌ Error checking job milestones:', error);
  }
}