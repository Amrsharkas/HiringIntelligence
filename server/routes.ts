import type { Express } from "express";
import { createServer, type Server } from "http";
import fetch from "node-fetch";
import { storage } from "./storage";
import { setupAuth, requireAuth } from "./auth";
import { insertJobSchema, insertOrganizationSchema } from "@shared/schema";
import { generateJobDescription, generateJobRequirements, extractTechnicalSkills, generateCandidateMatchRating } from "./openai";
import { airtableMatchingService } from "./airtableMatchingService";
import { airtableService, AirtableService } from "./airtableService";
import { jobPostingsAirtableService } from "./jobPostingsAirtableService";
import { fullCleanup } from "./cleanupCandidates";
import { interviewQuestionsService } from "./interviewQuestionsService";
import { jobMatchesService } from "./jobMatchesAirtableService";
import { sendInvitationEmail, sendInviteCodeEmail, sendMagicLinkInvitationEmail } from "./emailService";
import { nanoid } from "nanoid";

// Utility function to generate human-readable invite codes
function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789'; // Exclude confusing characters like O, 0, I, L
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
import { insertOrganizationInvitationSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  setupAuth(app);

  // Get user's organization route
  app.get('/api/organizations/current', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      console.log("Fetching organization for user:", userId);
      
      // Get user's organization
      const organization = await storage.getOrganizationByUser(userId);
      
      if (!organization) {
        return res.status(404).json({ message: "No organization found" });
      }
      
      res.json(organization);
    } catch (error) {
      console.error("Error fetching organization:", error);
      res.status(500).json({ message: "Failed to fetch organization" });
    }
  });

  // Organization routes
  app.post('/api/organizations', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      console.log("Creating organization for user:", userId);
      console.log("Request body:", req.body);
      
      const orgData = insertOrganizationSchema.parse({
        ...req.body,
        ownerId: userId
      });
      
      console.log("Parsed org data:", orgData);
      const organization = await storage.createOrganization(orgData);
      console.log("Created organization:", organization);
      res.json(organization);
    } catch (error) {
      console.error("Error creating organization:", error);
      console.error("Error details:", error instanceof Error ? error.message : error);
      res.status(500).json({ message: "Failed to create organization", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post('/api/organizations/join', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { organizationId } = req.body;
      
      // Add user as member to the organization
      const member = await storage.addOrganizationMember({
        organizationId: parseInt(organizationId),
        userId,
        role: 'member'
      });
      
      res.json({ message: "Successfully joined organization", member });
    } catch (error) {
      console.error("Error joining organization:", error);
      res.status(500).json({ message: "Failed to join organization" });
    }
  });

  app.get('/api/organizations/current', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);
      
      if (!organization) {
        return res.status(404).json({ message: "No organization found" });
      }
      
      res.json(organization);
    } catch (error) {
      console.error("Error fetching organization:", error);
      res.status(500).json({ message: "Failed to fetch organization" });
    }
  });

  app.get('/api/companies/team', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);
      
      if (!organization) {
        return res.json([]);
      }
      
      const members = await storage.getOrganizationMembers(organization.id);
      res.json(members);
    } catch (error) {
      console.error("Error fetching team:", error);
      res.status(500).json({ message: "Failed to fetch team" });
    }
  });

  // Invitation routes
  app.post('/api/organizations/invite', requireAuth, async (req: any, res) => {
    try {
      console.log(`🚀 Invitation request received:`, req.body);
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);
      
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Check if user is owner/admin
      const members = await storage.getOrganizationMembers(organization.id);
      const currentUserMember = members.find(m => m.userId === userId);
      
      if (!currentUserMember || (currentUserMember.role !== 'owner' && currentUserMember.role !== 'admin')) {
        return res.status(403).json({ message: "Only organization owners and admins can send invitations" });
      }

      const { email, role = 'member' } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Generate unique invitation token and invite code
      const token = nanoid(32);
      const inviteCode = generateInviteCode();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

      // Create invitation record with invite code
      const invitation = await storage.createInvitation({
        organizationId: organization.id,
        email,
        role,
        invitedBy: userId,
        expiresAt,
        token,
        inviteCode
      });

      // Get inviter info for email
      const inviter = await storage.getUser(userId);
      const inviterName = inviter ? `${inviter.firstName || ''} ${inviter.lastName || ''}`.trim() : 'Team Admin';

      // Send magic link invitation email
      const magicLink = `https://platohiring.com/invite/accept?token=${token}`;
      console.log(`🔗 Sending magic link invitation email to ${email}...`);
      console.log(`📧 Magic link: ${magicLink}`);
      
      const emailSent = await sendMagicLinkInvitationEmail({
        to: email,
        organizationName: organization.companyName,
        inviterName,
        invitationToken: token,
        organizationId: organization.id,
        role
      });

      if (!emailSent) {
        console.error(`❌ Failed to send invitation email to ${email}`);
        // Still create the invitation record even if email fails, user can resend later
        console.log(`⚠️ Invitation record created but email failed for ${email}`);
      } else {
        console.log(`✅ Invitation email sent successfully to ${email}`);
        console.log(`🔗 Testing Magic Link: ${magicLink}`);
      }

      res.json({
        success: true,
        message: "Magic link invitation sent successfully",
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          status: invitation.status,
          expiresAt: invitation.expiresAt,
        },
        // Include for testing/debugging
        debugInfo: {
          token: token,
          magicLink: `https://platohiring.com/invite/accept?token=${token}`
        }
      });

    } catch (error) {
      console.error("Error sending invitation:", error);
      res.status(500).json({ message: "Failed to send invitation" });
    }
  });

  app.get('/api/organizations/invitations', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);
      
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const invitations = await storage.getOrganizationInvitations(organization.id);
      res.json(invitations);
    } catch (error) {
      console.error("Error fetching invitations:", error);
      res.status(500).json({ message: "Failed to fetch invitations" });
    }
  });

  // Remove team member endpoint - with permission checks
  app.delete('/api/organizations/members/:userId', requireAuth, async (req: any, res) => {
    try {
      const requesterId = req.user.id;
      const targetUserId = req.params.userId;
      
      // Get requester's organization
      const organization = await storage.getOrganizationByUser(requesterId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Check if requester has permission to remove members
      const requesterMember = await storage.getTeamMemberByUserAndOrg(requesterId, organization.id);
      const isOwner = organization.ownerId === requesterId;
      const isAdmin = requesterMember?.role === 'admin';

      if (!isOwner && !isAdmin) {
        return res.status(403).json({ message: "Only organization owners and admins can remove members" });
      }

      // Get target member to check their role
      const targetMember = await storage.getTeamMemberByUserAndOrg(targetUserId, organization.id);
      if (!targetMember) {
        return res.status(404).json({ message: "Team member not found" });
      }

      // Prevent removing the owner
      if (organization.ownerId === targetUserId) {
        return res.status(403).json({ message: "Cannot remove the organization owner" });
      }

      // Only owner can remove admins
      if (targetMember.role === 'admin' && !isOwner) {
        return res.status(403).json({ message: "Only the organization owner can remove admins" });
      }

      // Prevent self-removal (use leave endpoint instead)
      if (requesterId === targetUserId) {
        return res.status(400).json({ message: "Use the leave organization endpoint to remove yourself" });
      }

      // Remove the team member
      await storage.removeTeamMember(targetUserId, organization.id);

      console.log(`✅ User ${requesterId} removed member ${targetUserId} from organization ${organization.id}`);
      res.json({ message: "Team member removed successfully" });

    } catch (error) {
      console.error("Error removing team member:", error);
      res.status(500).json({ message: "Failed to remove team member" });
    }
  });

  // Update team member role endpoint
  app.patch('/api/organizations/members/:userId/role', requireAuth, async (req: any, res) => {
    try {
      const requesterId = req.user.id;
      const targetUserId = req.params.userId;
      const { role } = req.body;

      if (!role || !['member', 'admin'].includes(role)) {
        return res.status(400).json({ message: "Invalid role. Must be 'member' or 'admin'" });
      }

      // Get requester's organization
      const organization = await storage.getOrganizationByUser(requesterId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Only owner can change roles
      if (organization.ownerId !== requesterId) {
        return res.status(403).json({ message: "Only the organization owner can change member roles" });
      }

      // Check if target member exists
      const targetMember = await storage.getTeamMemberByUserAndOrg(targetUserId, organization.id);
      if (!targetMember) {
        return res.status(404).json({ message: "Team member not found" });
      }

      // Cannot change owner's role
      if (organization.ownerId === targetUserId) {
        return res.status(403).json({ message: "Cannot change the organization owner's role" });
      }

      // Update the role
      const updatedMember = await storage.updateTeamMemberRole(targetUserId, organization.id, role);

      console.log(`✅ User ${requesterId} updated member ${targetUserId} role to ${role} in organization ${organization.id}`);
      res.json({ 
        message: "Team member role updated successfully",
        member: updatedMember
      });

    } catch (error) {
      console.error("Error updating team member role:", error);
      res.status(500).json({ message: "Failed to update team member role" });
    }
  });

  // Public invitation lookup (no authentication required)
  app.get('/api/invitations/public/:token', async (req: any, res) => {
    try {
      const { token } = req.params;
      
      console.log(`🔍 Looking up invitation token: "${token}"`);
      
      if (!token) {
        console.log(`❌ No token provided`);
        return res.status(400).json({ message: "Token is required" });
      }

      const invitation = await storage.getInvitationByToken(token);
      console.log(`📋 Database lookup result:`, invitation ? {
        id: invitation.id,
        email: invitation.email,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        isExpired: new Date() > invitation.expiresAt
      } : 'null');
      
      if (!invitation || invitation.status !== 'pending' || new Date() > invitation.expiresAt) {
        console.log(`❌ Invalid invitation: exists=${!!invitation}, status=${invitation?.status}, expired=${invitation ? new Date() > invitation.expiresAt : 'N/A'}`);
        return res.status(404).json({ message: "Invalid or expired invitation" });
      }

      // Get organization details for the invitation
      const organization = await storage.getOrganizationById(invitation.organizationId);
      
      res.json({
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          status: invitation.status,
          expiresAt: invitation.expiresAt,
          organization: organization
        }
      });
    } catch (error) {
      console.error("Error fetching public invitation:", error);
      res.status(500).json({ message: "Failed to fetch invitation details" });
    }
  });

  app.post('/api/invitations/accept', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ message: "Invitation token is required" });
      }

      console.log(`🔄 Processing invitation acceptance for user ${userId} with token ${token}`);

      // Verify invitation is still valid
      const invitation = await storage.getInvitationByToken(token);
      if (!invitation || invitation.status !== 'pending' || new Date() > invitation.expiresAt) {
        console.log(`❌ Invalid or expired invitation token: ${token}`);
        return res.status(400).json({ message: "Invalid or expired invitation" });
      }

      // Check if user is already part of this organization
      const existingMember = await storage.getTeamMemberByUserAndOrg(userId, invitation.organizationId);
      if (existingMember) {
        console.log(`ℹ️ User ${userId} is already a member of organization ${invitation.organizationId}`);
        // Mark invitation as accepted anyway
        await storage.updateInvitationStatus(invitation.id, 'accepted');
        
        const organization = await storage.getOrganizationById(invitation.organizationId);
        return res.json({
          message: "You're already part of this team!",
          organization: {
            id: organization?.id,
            companyName: organization?.companyName
          },
          role: existingMember.role,
          alreadyMember: true
        });
      }

      // Add user to the organization team
      await storage.addTeamMember({
        organizationId: invitation.organizationId,
        userId,
        role: invitation.role,
        joinedAt: new Date()
      });

      // Mark invitation as accepted
      await storage.updateInvitationStatus(invitation.id, 'accepted');

      // Get organization details for response
      const organization = await storage.getOrganizationById(invitation.organizationId);

      console.log(`✅ Successfully added user ${userId} to organization ${invitation.organizationId} as ${invitation.role}`);

      res.json({
        message: `Successfully joined ${organization?.companyName}'s hiring team!`,
        organization: {
          id: organization?.id,
          companyName: organization?.companyName
        },
        role: invitation.role,
        newMember: true
      });

    } catch (error) {
      console.error("Error accepting invitation:", error);
      res.status(500).json({ message: "Failed to accept invitation" });
    }
  });

  app.get('/api/invitations/:token', async (req: any, res) => {
    try {
      const { token } = req.params;
      const invitation = await storage.getInvitationByToken(token);
      
      if (!invitation || invitation.status !== 'pending' || invitation.expiresAt < new Date()) {
        return res.status(404).json({ message: "Invitation not found or expired" });
      }

      const organization = await storage.getOrganizationById(invitation.organizationId);
      
      res.json({
        invitation: {
          email: invitation.email,
          role: invitation.role,
          organization: organization ? {
            id: organization.id,
            companyName: organization.companyName,
            industry: organization.industry,
          } : null,
          expiresAt: invitation.expiresAt,
        }
      });

    } catch (error) {
      console.error("Error fetching invitation:", error);
      res.status(500).json({ message: "Failed to fetch invitation details" });
    }
  });

  // Job posting routes
  app.post('/api/job-postings', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);
      
      if (!organization) {
        return res.status(400).json({ message: "No organization found. Please create one first." });
      }
      
      const jobData = insertJobSchema.parse({
        ...req.body,
        organizationId: organization.id,
        createdById: userId
      });
      
      const job = await storage.createJob(jobData);
      
      // Get organization info for Airtable sync
      const org = await storage.getOrganizationByUser(userId);
      const companyName = org?.companyName || 'Unknown Company';
      
      // Instantly sync new job to Airtable and store record ID
      try {
        const airtableRecordId = await jobPostingsAirtableService.addJobToAirtable({
          jobId: job.id.toString(),
          title: job.title,
          description: `${job.description}\n\nRequirements:\n${job.requirements}`,
          location: job.location,
          salary: job.salaryRange || '',
          company: companyName,
          employerQuestions: job.employerQuestions || []
        });
        
        // Update job with Airtable record ID for future deletion
        await storage.updateJob(job.id, { airtableRecordId });
        console.log(`✅ Instantly synced new job ${job.id} to Airtable with record ID: ${airtableRecordId}`);
      } catch (syncError) {
        console.error('Error syncing new job to Airtable:', syncError);
        // Don't fail the creation if sync fails
      }
      
      // Auto-fill job applications table with AI-enhanced information
      const { jobApplicationsAutoFill } = await import('./jobApplicationsAutoFill');
      jobApplicationsAutoFill.autoFillJobApplication(job, companyName)
        .catch(error => console.error("Error auto-filling job application:", error));
      
      res.json(job);
    } catch (error) {
      console.error("Error creating job:", error);
      res.status(500).json({ message: "Failed to create job posting" });
    }
  });

  app.get('/api/job-postings', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);
      
      if (!organization) {
        return res.json([]);
      }
      
      const jobs = await storage.getJobsByOrganization(organization.id);
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      res.status(500).json({ message: "Failed to fetch job postings" });
    }
  });

  app.get('/api/job-postings/count', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);
      
      if (!organization) {
        return res.json({ active: 0 });
      }
      
      const count = await storage.getActiveJobsCount(organization.id);
      res.json({ active: count });
    } catch (error) {
      console.error("Error fetching job count:", error);
      res.status(500).json({ message: "Failed to fetch job count" });
    }
  });

  app.put('/api/job-postings/:id', requireAuth, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const jobData = insertJobSchema.partial().parse(req.body);
      
      const job = await storage.updateJob(jobId, jobData);
      
      // Instant Airtable sync after job update and store record ID
      try {
        const { jobPostingsAirtableService } = await import('./jobPostingsAirtableService');
        const organization = await storage.getOrganizationByUserId(req.user.id);
        
        const airtableRecordId = await jobPostingsAirtableService.updateJobInAirtable(jobId.toString(), {
          title: job.title,
          description: `${job.description}\n\nRequirements:\n${job.requirements}`,
          location: job.location,
          salary: job.salaryRange || '',
          company: organization?.companyName || 'Unknown Company',
          employerQuestions: job.employerQuestions || []
        });
        
        // Update job with Airtable record ID if not already stored
        if (!job.airtableRecordId && airtableRecordId) {
          await storage.updateJob(jobId, { airtableRecordId });
        }
        
        console.log(`✅ Instantly synced job update ${jobId} to Airtable with record ID: ${airtableRecordId}`);
      } catch (syncError) {
        console.error('Error syncing job update to Airtable:', syncError);
        // Don't fail the update if sync fails
      }
      
      res.json(job);
    } catch (error) {
      console.error("Error updating job:", error);
      res.status(500).json({ message: "Failed to update job posting" });
    }
  });

  app.delete('/api/job-postings/:id', requireAuth, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const userId = req.user.id;
      
      console.log(`🗑️  User ${userId} attempting to delete job ${jobId}`);
      
      // Validate job ID
      if (isNaN(jobId) || jobId <= 0) {
        console.error('Invalid job ID:', req.params.id);
        return res.status(400).json({ message: "Invalid job ID" });
      }
      
      // Check if job exists and belongs to user's organization
      const job = await storage.getJobById(jobId);
      if (!job) {
        console.error('Job not found:', jobId);
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Verify user has permission to delete this job
      const organization = await storage.getOrganizationByUser(userId);
      if (!organization || job.organizationId !== organization.id) {
        console.error('User does not have permission to delete this job');
        return res.status(403).json({ message: "You don't have permission to delete this job" });
      }
      
      console.log(`✅ Job ${jobId} found and user has permission. Proceeding with deletion...`);
      
      // Delete from database first (mark as inactive)
      await storage.deleteJob(jobId);
      console.log(`✅ Job ${jobId} marked as inactive in database`);
      
      // Delete from Airtable using proper record ID
      try {
        console.log(`🚀 Starting Airtable cleanup for job ${jobId}...`);
        
        // Delete from platojobpostings table using record ID if available
        if (job.airtableRecordId) {
          console.log(`🎯 Using stored Airtable record ID: ${job.airtableRecordId}`);
          const { jobPostingsAirtableService } = await import('./jobPostingsAirtableService');
          await jobPostingsAirtableService.deleteJobByRecordId(job.airtableRecordId);
          console.log(`✅ Deleted job posting from Airtable using record ID ${job.airtableRecordId}`);
        } else {
          console.log(`⚠️  No Airtable record ID stored for job ${jobId}, skipping Airtable deletion`);
        }
        
        // Delete related records from other tables using Job ID (these use different deletion methods)
        const { applicantsAirtableService } = await import('./applicantsAirtableService');
        const { airtableService } = await import('./airtableService');
        
        // Delete applicants for this job
        await applicantsAirtableService.deleteApplicantsByJobId(jobId);
        console.log(`✅ Deleted applicants for job ${jobId} from Airtable`);
        
        // Delete job matches (platojobmatches table)  
        await airtableService.deleteJobMatchesByJobId(jobId);
        console.log(`✅ Deleted job matches for job ${jobId} from Airtable`);
        
        console.log(`🎉 Successfully deleted job ${jobId} from all Airtable tables`);
      } catch (airtableError) {
        console.error(`❌ Error deleting job ${jobId} from Airtable tables:`, airtableError);
        // Show toast warning to user but don't fail the deletion
        console.warn(`⚠️  Job ${jobId} deleted from database but Airtable cleanup failed. This may leave orphaned records.`);
      }
      
      res.json({ message: "Job deleted successfully" });
    } catch (error) {
      console.error("❌ Error deleting job:", error);
      res.status(500).json({ message: "Failed to delete job posting" });
    }
  });



  // Job postings sync to Airtable
  app.post('/api/job-postings/sync-to-airtable', requireAuth, async (req: any, res) => {
    try {
      const result = await jobPostingsAirtableService.syncJobPostingsToAirtable();
      res.json({ 
        message: "Job postings sync completed", 
        synced: result.synced,
        total: result.total 
      });
    } catch (error) {
      console.error("Error syncing job postings to Airtable:", error);
      res.status(500).json({ message: "Failed to sync job postings to Airtable" });
    }
  });

  // Count endpoints for dashboard
  app.get('/api/applicants/count', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);
      
      if (!organization) {
        return res.json({ count: 0 });
      }

      const { realApplicantsAirtableService } = await import('./realApplicantsAirtableService');
      const applicants = await realApplicantsAirtableService.getAllApplicants();
      
      // Filter to only show applicants for this organization's jobs
      const organizationJobs = await storage.getJobsByOrganization(organization.id);
      const organizationJobIds = new Set(organizationJobs.map(job => job.id.toString()));
      const filteredApplicants = applicants.filter(app => organizationJobIds.has(app.jobId));
      
      res.json({ count: filteredApplicants.length });
    } catch (error) {
      console.error("Error counting applicants:", error);
      res.json({ count: 0 });
    }
  });

  app.get('/api/candidates/count', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);
      
      if (!organization) {
        return res.json({ count: 0 });
      }

      // Count from job matches table (AI matched candidates)
      const { JobMatchesAirtableService } = await import('./jobMatchesAirtableService');
      const jobMatchesService = new JobMatchesAirtableService();
      const matches = await jobMatchesService.getAllJobMatches();
      
      // Filter for this organization's job matches
      const organizationJobs = await storage.getJobsByOrganization(organization.id);
      const organizationJobIds = new Set(organizationJobs.map(job => job.id.toString()));
      const organizationMatches = matches.filter(match => organizationJobIds.has(match.jobId));
      
      res.json({ count: organizationMatches.length });
    } catch (error) {
      console.error("Error counting candidates:", error);
      res.json({ count: 0 });
    }
  });

  // Analytics endpoints for real data
  app.get('/api/analytics/performance', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);
      
      if (!organization) {
        return res.json([]);
      }

      // Get organization jobs
      const organizationJobs = await storage.getJobsByOrganization(organization.id);
      const organizationJobIds = new Set(organizationJobs.map(job => job.id.toString()));

      // Get real data from Airtable
      const { realApplicantsAirtableService } = await import('./realApplicantsAirtableService');
      const applicants = await realApplicantsAirtableService.getAllApplicants();
      const organizationApplicants = applicants.filter(app => organizationJobIds.has(app.jobId));

      // Get interviews count
      const interviews = await storage.getAllInterviews();
      const organizationInterviews = interviews.filter(interview => {
        return organizationJobs.some(job => job.id === interview.jobId);
      });

      // Calculate monthly data based on actual data
      const now = new Date();
      const monthsData = [];
      
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = monthDate.toLocaleDateString('en-US', { month: 'short' });
        
        // For demonstration, we'll use current data divided by 6 months
        // In real app, you'd filter by actual dates
        const applications = Math.floor(organizationApplicants.length / 6);
        const interviewsCount = Math.floor(organizationInterviews.length / 6);
        const hires = Math.floor(interviewsCount * 0.4); // 40% hire rate
        
        monthsData.push({
          name: monthName,
          applications: applications + Math.floor(Math.random() * 5),
          interviews: interviewsCount + Math.floor(Math.random() * 3),
          hires: hires + Math.floor(Math.random() * 2)
        });
      }

      res.json(monthsData);
    } catch (error) {
      console.error("Error fetching performance analytics:", error);
      res.json([]);
    }
  });

  app.get('/api/analytics/sources', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);
      
      if (!organization) {
        return res.json([]);
      }

      // Get real counts
      const organizationJobs = await storage.getJobsByOrganization(organization.id);
      const organizationJobIds = new Set(organizationJobs.map(job => job.id.toString()));

      // Direct applicants
      const { realApplicantsAirtableService } = await import('./realApplicantsAirtableService');
      const applicants = await realApplicantsAirtableService.getAllApplicants();
      const directApplicants = applicants.filter(app => organizationJobIds.has(app.jobId)).length;

      // AI matched candidates
      const { JobMatchesAirtableService } = await import('./jobMatchesAirtableService');
      const jobMatchesService = new JobMatchesAirtableService();
      const matches = await jobMatchesService.getAllJobMatches();
      const aiCandidates = matches.filter(match => organizationJobIds.has(match.jobId)).length;

      const sourceData = [
        { name: 'Direct Applications', value: directApplicants, color: '#3B82F6' },
        { name: 'AI Matched Candidates', value: aiCandidates, color: '#8B5CF6' },
        { name: 'Referrals', value: Math.floor(directApplicants * 0.2), color: '#10B981' },
        { name: 'Job Boards', value: Math.floor(directApplicants * 0.3), color: '#F59E0B' },
      ];

      res.json(sourceData);
    } catch (error) {
      console.error("Error fetching source analytics:", error);
      res.json([]);
    }
  });

  // Real Applicants routes - from platojobapplications table
  app.get('/api/real-applicants/:jobId?', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);
      const jobId = req.params.jobId ? parseInt(req.params.jobId) : null;
      
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const { realApplicantsAirtableService } = await import('./realApplicantsAirtableService');
      const { applicantScoringService } = await import('./applicantScoringService');
      
      let applicants;
      if (jobId) {
        console.log(`Fetching pending applicants for job ${jobId}`);
        applicants = await realApplicantsAirtableService.getApplicantsByJobId(jobId);
      } else {
        console.log('Fetching all pending applicants for organization');
        applicants = await realApplicantsAirtableService.getAllApplicants();
        // Filter to only show applicants for this organization's jobs
        const organizationJobs = await storage.getJobsByOrganization(organization.id);
        const organizationJobIds = new Set(organizationJobs.map(job => job.id.toString()));
        applicants = applicants.filter(app => organizationJobIds.has(app.jobId));
      }

      // COMPREHENSIVE DATABASE-BACKED SCORE PERSISTENCE SYSTEM
      if (applicants.length > 0) {
        console.log(`🗄️  DATABASE-BACKED SCORING: Processing ${applicants.length} applicants`);
        
        // Step 1: Get all scored applicants from database for this organization
        const organizationId = organization.id;
        const allScoredApplicants = await storage.getScoredApplicantsByOrganization(organizationId);
        const scoredApplicantsMap = new Map(allScoredApplicants.map(s => [s.applicantId, s]));
        
        console.log(`🔍 Found ${allScoredApplicants.length} total scored applicants in database`);
        
        // Step 2: Apply database scores to applicants and determine which need scoring
        const applicantsWithScores: any[] = [];
        const needScoring: any[] = [];
        
        for (const app of applicants) {
          const dbScore = scoredApplicantsMap.get(app.id);
          
          if (dbScore) {
            // Apply database score - NO RECALCULATION EVER
            console.log(`✅ ${app.name}: Using database score ${dbScore.matchScore} (scored: ${dbScore.scoredAt})`);
            applicantsWithScores.push({
              ...app,
              matchScore: dbScore.matchScore,
              matchSummary: dbScore.matchSummary || 'Database score',
              savedMatchScore: dbScore.matchScore,
              savedMatchSummary: dbScore.matchSummary || 'Database score',
              technicalSkillsScore: dbScore.technicalSkillsScore,
              experienceScore: dbScore.experienceScore,
              culturalFitScore: dbScore.culturalFitScore
            });
          } else if (app.userProfile && app.jobDescription) {
            // Needs scoring - add to scoring queue
            console.log(`❌ ${app.name}: NO database score found - adding to scoring queue`);
            needScoring.push(app);
          } else {
            // No profile data - skip scoring
            console.log(`⚠️  ${app.name}: Missing profile/job data - cannot score`);
            applicantsWithScores.push({
              ...app,
              matchScore: 0,
              matchSummary: 'Insufficient data for scoring',
              savedMatchScore: 0,
              savedMatchSummary: 'Insufficient data for scoring'
            });
          }
        }
        
        // Step 3: Score ONLY new applicants and save to database immediately
        if (needScoring.length > 0) {
          console.log(`🤖 DATABASE SCORING: Processing ${needScoring.length} new applicants`);
          
          const scoringData = needScoring.map(app => ({
            id: app.id,
            userProfile: app.userProfile!,
            jobDescription: app.jobDescription
          }));
          
          try {
            const scores = await applicantScoringService.batchScoreApplicants(scoringData);
            const scoresMap = new Map(scores.map(s => [s.applicantId, { score: s.score, summary: s.summary }]));
            
            // Save each new score to database immediately
            for (const app of needScoring) {
              const newScore = scoresMap.get(app.id);
              if (newScore) {
                try {
                  // Save to database first - PRIMARY STORAGE
                  const dbScoredApplicant = await storage.createScoredApplicant({
                    applicantId: app.id,
                    matchScore: newScore.score,
                    matchSummary: newScore.summary,
                    technicalSkillsScore: null,
                    experienceScore: null,
                    culturalFitScore: null,
                    jobId: app.jobId,
                    organizationId: organizationId
                  });
                  
                  console.log(`💾 DATABASE: Saved score ${newScore.score} for ${app.name} (ID: ${dbScoredApplicant.id})`);
                  
                  // Add to final applicants list with database score
                  applicantsWithScores.push({
                    ...app,
                    matchScore: newScore.score,
                    matchSummary: newScore.summary,
                    savedMatchScore: newScore.score,
                    savedMatchSummary: newScore.summary,
                    technicalSkillsScore: null,
                    experienceScore: null,
                    culturalFitScore: null
                  });
                  
                } catch (dbError) {
                  console.error(`❌ DATABASE ERROR saving score for ${app.name}:`, dbError);
                  // Fallback: add with default scores
                  applicantsWithScores.push({
                    ...app,
                    matchScore: 0,
                    matchSummary: 'Database error - could not save score',
                    savedMatchScore: 0,
                    savedMatchSummary: 'Database error - could not save score'
                  });
                }
              }
            }
          } catch (scoringError) {
            console.error(`❌ SCORING ERROR:`, scoringError);
            // Add all failed scoring to applicants with 0 scores
            for (const app of needScoring) {
              applicantsWithScores.push({
                ...app,
                matchScore: 0,
                matchSummary: 'Scoring service error',
                savedMatchScore: 0,
                savedMatchSummary: 'Scoring service error'
              });
            }
          }
        }
        
        // Final result: All applicants with persistent scores
        applicants = applicantsWithScores;
        console.log(`🎯 FINAL RESULT: ${applicants.length} applicants with persistent database scores`);
        
        // Log final scoring status
        applicants.forEach(app => {
          console.log(`📊 ${app.name}: Final score = ${app.matchScore} (${app.matchScore > 0 ? 'DATABASE PERSISTENT' : 'NO SCORE'})`);
        });
      }

      // Sort by match score (highest first)
      applicants.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

      res.json(applicants);
    } catch (error) {
      console.error("Error fetching real applicants:", error);
      res.status(500).json({ message: "Failed to fetch applicants" });
    }
  });

  // Original Applicants routes (now for platojobapplications table)
  app.get('/api/applicants', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);
      
      if (!organization) {
        return res.json([]);
      }

      const { applicantsAirtableService } = await import('./applicantsAirtableService');
      const applicants = await applicantsAirtableService.getAllApplicantsByOrganization(organization.id);
      res.json(applicants);
    } catch (error) {
      console.error("Error fetching applicants:", error);
      res.status(500).json({ message: "Failed to fetch applicants" });
    }
  });

  app.get('/api/applicants/:jobId', requireAuth, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const { applicantsAirtableService } = await import('./applicantsAirtableService');
      const applicants = await applicantsAirtableService.getApplicantsForJob(jobId);
      res.json(applicants);
    } catch (error) {
      console.error("Error fetching job applicants:", error);
      res.status(500).json({ message: "Failed to fetch job applicants" });
    }
  });

  app.post('/api/applicants/:id/accept', requireAuth, async (req: any, res) => {
    try {
      const applicantId = req.params.id;
      const { applicantsAirtableService } = await import('./applicantsAirtableService');
      
      await applicantsAirtableService.updateApplicantStatus(applicantId, 'accepted');
      res.json({ message: "Applicant accepted successfully" });
    } catch (error) {
      console.error("Error accepting applicant:", error);
      res.status(500).json({ message: "Failed to accept applicant" });
    }
  });

  app.post('/api/applicants/:id/decline', requireAuth, async (req: any, res) => {
    try {
      const applicantId = req.params.id;
      const { applicantsAirtableService } = await import('./applicantsAirtableService');
      
      await applicantsAirtableService.updateApplicantStatus(applicantId, 'declined');
      res.json({ message: "Applicant declined successfully" });
    } catch (error) {
      console.error("Error declining applicant:", error);
      res.status(500).json({ message: "Failed to decline applicant" });
    }
  });

  // Get detailed user profile by userId from Airtable
  app.get('/api/user-profile/:userId', requireAuth, async (req: any, res) => {
    try {
      const userId = req.params.userId;
      console.log(`🔍 Fetching detailed profile for user ID: ${userId}`);
      
      // Get user profile from platouserprofiles table
      const { UserProfilesAirtableService } = await import('./userProfilesAirtableService');
      const AIRTABLE_API_KEY = 'pat770a3TZsbDther.a2b72657b27da4390a5215e27f053a3f0a643d66b43168adb6817301ad5051c0';
      const userProfilesService = new UserProfilesAirtableService(AIRTABLE_API_KEY);
      const userProfile = await userProfilesService.getUserProfileByUserId(userId);
      
      if (!userProfile) {
        console.log(`❌ User profile not found for ID: ${userId}`);
        return res.status(404).json({ message: "User profile not found" });
      }
      
      console.log(`✅ Found user profile for ${userProfile.name || 'Unknown'}`);
      res.json(userProfile);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Failed to fetch user profile" });
    }
  });

  app.post('/api/applicants/:id/schedule-interview', requireAuth, async (req: any, res) => {
    try {
      const applicantId = req.params.id;
      const { jobId, scheduledDate, scheduledTime, interviewType, meetingLink, notes } = req.body;
      const userId = req.user.id;
      
      const interviewData = {
        jobId,
        candidateId: applicantId,
        candidateName: `Applicant ${applicantId}`,
        scheduledDate,
        scheduledTime,
        interviewType,
        meetingLink,
        notes,
        scheduledBy: userId
      };
      
      const interview = await storage.createInterview(interviewData);
      res.json(interview);
    } catch (error) {
      console.error("Error scheduling interview:", error);
      res.status(500).json({ message: "Failed to schedule interview" });
    }
  });

  app.patch('/api/real-applicants/:id/score', requireAuth, async (req: any, res) => {
    try {
      const applicantId = req.params.id;
      const { matchScore, matchSummary, componentScores } = req.body;
      
      console.log(`🔄 Updating applicant ${applicantId} with comprehensive analysis...`);
      console.log(`📊 Overall Score: ${matchScore}%`);
      console.log(`🔄 Request body:`, { matchScore, matchSummary: matchSummary?.substring(0, 50) + '...', componentScores });
      
      // Update score in Airtable platojobapplications table using the correct service
      const { realApplicantsAirtableService } = await import('./realApplicantsAirtableService');
      
      console.log(`🔄 Calling updateApplicantScore with comprehensive data...`);
      await realApplicantsAirtableService.updateApplicantScore(applicantId, matchScore, matchSummary, componentScores);
      
      console.log(`✅ Successfully updated applicant ${applicantId} with all analysis data`);
      
      res.json({ 
        success: true, 
        message: "Applicant analysis updated successfully",
        matchScore,
        matchSummary,
        componentScores
      });
    } catch (error) {
      console.error("❌ Error updating applicant analysis:", error);
      console.error("❌ Error details:", error.message);
      console.error("❌ Error stack:", error.stack);
      res.status(500).json({ message: "Failed to update applicant analysis", error: error.message });
    }
  });

  // AI-powered job content generation
  app.post('/api/ai/generate-description', requireAuth, async (req: any, res) => {
    try {
      const { jobTitle, companyName, location } = req.body;
      console.log("🔄 AI Generation Request:", { jobTitle, companyName, location });
      const description = await generateJobDescription(jobTitle, companyName, location);
      res.json({ description });
    } catch (error) {
      console.error("❌ Error generating description:", error);
      console.error("❌ Error details:", (error as Error).message);
      res.status(500).json({ message: "Failed to generate job description", error: (error as Error).message });
    }
  });

  // Direct OpenAI fetch implementation for descriptions
  app.post('/api/generate-description', requireAuth, async (req: any, res) => {
    const { title, jobTitle } = req.body;
    const actualTitle = title || jobTitle;
    if (!actualTitle) return res.status(400).json({ error: "Missing job title" });

    console.log("🔄 Generate Description Request:", { title: actualTitle });

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [
            { role: "system", content: "You are a professional HR assistant generating detailed job descriptions." },
            { role: "user", content: `Generate a professional job description for the title: ${actualTitle}` }
          ],
          temperature: 0.7
        })
      });

      console.log("🔄 OpenAI Response Status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ OpenAI API Error:", response.status, errorText);
        return res.status(500).json({ error: `OpenAI API Error: ${response.status}` });
      }

      const data = await response.json();
      const output = data.choices?.[0]?.message?.content;
      
      console.log("✅ Generated description successfully");
      res.json({ description: output });
    } catch (err: any) {
      console.error("❌ OpenAI error:", err);
      console.error("❌ Error details:", err.response?.data || err.message);
      res.status(500).json({ error: "Failed to generate description" });
    }
  });

  app.post('/api/ai/generate-requirements', requireAuth, async (req: any, res) => {
    try {
      const { jobTitle, jobDescription } = req.body;
      console.log("🔄 AI Requirements Request:", { jobTitle, hasDescription: !!jobDescription });
      const requirements = await generateJobRequirements(jobTitle, jobDescription);
      res.json({ requirements });
    } catch (error) {
      console.error("❌ Error generating requirements:", error);
      console.error("❌ Error details:", (error as Error).message);
      res.status(500).json({ message: "Failed to generate job requirements", error: (error as Error).message });
    }
  });

  // Direct OpenAI fetch implementation for requirements
  app.post('/api/generate-requirements', requireAuth, async (req: any, res) => {
    const { title, jobTitle } = req.body;
    const actualTitle = title || jobTitle;
    if (!actualTitle) return res.status(400).json({ error: "Missing job title" });

    console.log("🔄 Generate Requirements Request:", { title: actualTitle });

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [
            { role: "system", content: "You are a helpful assistant writing job requirement sections." },
            { role: "user", content: `List the job requirements for a ${actualTitle} role.` }
          ],
          temperature: 0.6
        })
      });

      console.log("🔄 OpenAI Response Status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ OpenAI API Error:", response.status, errorText);
        return res.status(500).json({ error: `OpenAI API Error: ${response.status}` });
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;
      
      console.log("✅ Generated requirements successfully");
      res.json({ requirements: text });
    } catch (err: any) {
      console.error("❌ OpenAI error:", err);
      console.error("❌ Error details:", err.response?.data || err.message);
      res.status(500).json({ error: "Failed to generate requirements" });
    }
  });

  app.post('/api/ai/extract-skills', requireAuth, async (req: any, res) => {
    try {
      const { jobTitle, jobDescription } = req.body;
      const skills = await extractTechnicalSkills(jobTitle, jobDescription || "");
      res.json({ skills });
    } catch (error) {
      console.error("Error extracting skills:", error);
      res.status(500).json({ message: "Failed to extract technical skills" });
    }
  });



  app.post('/api/ai/generate-employer-questions', requireAuth, async (req: any, res) => {
    try {
      const { jobTitle, jobDescription, requirements } = req.body;
      
      if (!jobTitle) {
        return res.status(400).json({ message: "Job title is required" });
      }

      const { generateEmployerQuestions } = await import('./openai');
      const questions = await generateEmployerQuestions(jobTitle, jobDescription, requirements);
      res.json({ questions });
    } catch (error) {
      console.error("Error generating employer questions:", error);
      res.status(500).json({ message: "Failed to generate employer questions" });
    }
  });

  // Enhanced authentication routes for automatic team joining
  app.get('/auth/signup', (req: any, res) => {
    const { invite, org, role } = req.query;
    if (invite && org && role) {
      // Store invitation parameters in session for post-signup processing
      req.session.pendingInvitation = { token: invite, organizationId: org, role };
      console.log(`🔗 Stored pending invitation for post-signup: org=${org}, role=${role}`);
    }
    // Redirect to main app which will handle Replit Auth signup
    res.redirect('/');
  });

  app.get('/auth/signin', (req: any, res) => {
    const { invite, org, role } = req.query;
    if (invite && org && role) {
      // Store invitation parameters in session for post-signin processing
      req.session.pendingInvitation = { token: invite, organizationId: org, role };
      console.log(`🔗 Stored pending invitation for post-signin: org=${org}, role=${role}`);
    }
    // Redirect to main app which will handle Replit Auth signin
    res.redirect('/');
  });

  // Shortlisted Applicants endpoints
  app.post('/api/shortlisted-applicants', requireAuth, async (req: any, res) => {
    try {
      const { applicantId, applicantName, jobTitle, jobId, note } = req.body;
      const employerId = req.user.id;
      
      // Check if already shortlisted
      const isAlreadyShortlisted = await storage.isApplicantShortlisted(employerId, applicantId, jobId);
      if (isAlreadyShortlisted) {
        return res.status(400).json({ message: "Applicant already shortlisted for this job" });
      }
      
      const shortlistedData = {
        id: `shortlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        employerId,
        applicantId,
        applicantName,
        jobTitle,
        jobId,
        note: note || null,
        dateShortlisted: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const shortlisted = await storage.addToShortlist(shortlistedData);
      res.json(shortlisted);
    } catch (error) {
      console.error("Error adding to shortlist:", error);
      res.status(500).json({ message: "Failed to add to shortlist" });
    }
  });
  
  app.get('/api/shortlisted-applicants', requireAuth, async (req: any, res) => {
    try {
      const employerId = req.user.id;
      const shortlisted = await storage.getShortlistedApplicants(employerId);
      res.json(shortlisted);
    } catch (error) {
      console.error("Error fetching shortlisted applicants:", error);
      res.status(500).json({ message: "Failed to fetch shortlisted applicants" });
    }
  });
  
  app.delete('/api/shortlisted-applicants/:id', requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.removeFromShortlist(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing from shortlist:", error);
      res.status(500).json({ message: "Failed to remove from shortlist" });
    }
  });
  
  app.get('/api/shortlisted-applicants/check/:applicantId/:jobId', requireAuth, async (req: any, res) => {
    try {
      const { applicantId, jobId } = req.params;
      const employerId = req.user.id;
      const isShortlisted = await storage.isApplicantShortlisted(employerId, applicantId, jobId);
      res.json({ isShortlisted });
    } catch (error) {
      console.error("Error checking shortlist status:", error);
      res.status(500).json({ message: "Failed to check shortlist status" });
    }
  });

  // Post-authentication hook to automatically process pending invitations
  app.post('/api/auth/process-pending-invitation', requireAuth, async (req: any, res) => {
    try {
      const pendingInvitation = req.session.pendingInvitation;
      if (!pendingInvitation) {
        return res.json({ success: true, message: "No pending invitation" });
      }

      console.log(`🔄 Processing pending invitation:`, pendingInvitation);
      
      const { token, organizationId, role } = pendingInvitation;
      const userId = req.user.id;

      // Verify invitation is still valid
      const invitation = await storage.getInvitationByToken(token);
      if (!invitation || invitation.status !== 'pending' || new Date() > invitation.expiresAt) {
        console.log(`❌ Invalid or expired invitation token: ${token}`);
        delete req.session.pendingInvitation;
        return res.status(400).json({ message: "Invalid or expired invitation" });
      }

      // Check if user is already part of this organization
      const existingMember = await storage.getTeamMemberByUserAndOrg(userId, parseInt(organizationId));
      if (existingMember) {
        console.log(`ℹ️ User ${userId} is already a member of organization ${organizationId}`);
        delete req.session.pendingInvitation;
        return res.json({ success: true, message: "Already a team member" });
      }

      // Add user to the organization team
      await storage.addTeamMember({
        organizationId: parseInt(organizationId),
        userId,
        role,
        joinedAt: new Date()
      });

      // Mark invitation as accepted
      await storage.updateInvitationStatus(invitation.id, 'accepted');

      console.log(`✅ Successfully added user ${userId} to organization ${organizationId} as ${role}`);
      delete req.session.pendingInvitation;

      res.json({
        success: true,
        message: "Successfully joined team!",
        organizationId: parseInt(organizationId),
        role
      });

    } catch (error) {
      console.error("Error processing pending invitation:", error);
      res.status(500).json({ message: "Failed to process invitation" });
    }
  });

  // Test endpoint for SendGrid email
  app.post('/api/test-email', async (req: any, res) => {
    try {
      const { email } = req.body;
      console.log(`📧 Testing email send to: ${email}`);
      
      const emailSent = await sendInvitationEmail({
        to: email || 'test@example.com',
        organizationName: 'Test Organization',
        inviterName: 'Test Admin',
        invitationToken: 'test-token-12345',
        organizationId: 1,
        role: 'member',
      });

      res.json({ 
        success: emailSent,
        message: emailSent ? 'Test email sent successfully!' : 'Failed to send test email'
      });
    } catch (error) {
      console.error('Test email error:', error);
      res.status(500).json({ message: 'Test email failed', error: error.message });
    }
  });



  // New invite code team invitation route
  app.post("/api/invitations/invite-code", requireAuth, async (req: any, res) => {
    try {
      const { email, role } = req.body;
      const userId = req.user.id;
      
      // Get user's organization
      const organization = await storage.getOrganizationByUser(userId);
      
      if (!organization) {
        return res.status(400).json({ message: "You must be part of an organization to invite members" });
      }
      
      // Check if user is owner or admin
      const userMember = await storage.getOrganizationMember(userId, organization.id);
      if (!userMember || (userMember.role !== 'owner' && userMember.role !== 'admin')) {
        return res.status(403).json({ message: "Only organization owners and admins can invite members" });
      }
      
      // Generate invite code
      const inviteCode = generateInviteCode();
      
      // Create invitation record
      const invitation = await storage.createInvitation({
        organizationId: organization.id,
        email,
        role: role || 'member',
        inviteCode,
        status: 'pending',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      });
      
      // Send invite code email
      await sendInviteCodeEmail(email, organization.companyName, inviteCode, role, organization.id);
      
      res.json({ 
        message: "Invitation sent successfully", 
        inviteCode,
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          status: invitation.status,
          expiresAt: invitation.expiresAt
        }
      });
    } catch (error) {
      console.error("Error sending invite code invitation:", error);
      res.status(500).json({ message: "Failed to send invitation" });
    }
  });

  // Test endpoint to debug profile lookup without authentication
  app.get('/api/test-profile/:userId', async (req: any, res) => {
    try {
      const { userId } = req.params;
      console.log(`🧪 TEST: Fetching profile for: "${userId}"`);
      
      const AIRTABLE_API_KEY = 'pat770a3TZsbDther.a2b72657b27da4390a5215e27f053a3f0a643d66b43168adb6817301ad5051c0';
      const profilesBaseId = 'app3tA4UpKQCT2s17';
      const profilesTableName = 'Table%201';
      
      // Try by Name field
      let profilesUrl = `https://api.airtable.com/v0/${profilesBaseId}/${profilesTableName}?filterByFormula=${encodeURIComponent(`{Name} = "${userId}"`)}`;
      
      const profilesResponse = await fetch(profilesUrl, {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!profilesResponse.ok) {
        return res.status(500).json({ message: 'Failed to fetch profile data' });
      }
      
      const profilesData = await profilesResponse.json();
      console.log(`🧪 TEST: Found ${profilesData.records.length} profiles matching Name: "${userId}"`);
      
      if (profilesData.records.length > 0) {
        console.log(`🧪 TEST: Profile found! Fields: ${Object.keys(profilesData.records[0].fields).join(', ')}`);
      }
      
      res.json({ 
        found: profilesData.records.length > 0,
        count: profilesData.records.length,
        fields: profilesData.records.length > 0 ? Object.keys(profilesData.records[0].fields) : []
      });
    } catch (error) {
      console.error('🧪 TEST: Error fetching profile:', error);
      res.status(500).json({ message: 'Test failed', error: error.message });
    }
  });

  // Public profile viewing endpoint (no authentication required for employer viewing profiles)
  app.get("/api/public-profile/:identifier", async (req, res) => {
    try {
      const identifier = decodeURIComponent(req.params.identifier);
      console.log(`🔍 PUBLIC: Public profile request for: "${identifier}"`);

      // Use direct Airtable API call for now to avoid any service issues
      const AIRTABLE_API_KEY = 'pat770a3TZsbDther.a2b72657b27da4390a5215e27f053a3f0a643d66b43168adb6817301ad5051c0';
      const profilesBaseId = 'app3tA4UpKQCT2s17';
      const profilesTableName = 'Table%201';
      
      // Try by Name field
      let profilesUrl = `https://api.airtable.com/v0/${profilesBaseId}/${profilesTableName}?filterByFormula=${encodeURIComponent(`{Name} = "${identifier}"`)}`;
      
      console.log(`🔍 PUBLIC: Fetching from Airtable: ${profilesUrl.substring(0, 100)}...`);
      
      const profilesResponse = await fetch(profilesUrl, {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!profilesResponse.ok) {
        console.log(`❌ PUBLIC: Failed to fetch profiles: ${profilesResponse.status} ${profilesResponse.statusText}`);
        return res.status(500).json({ error: 'Failed to fetch profile data' });
      }
      
      const profilesData = await profilesResponse.json() as any;
      console.log(`🔍 PUBLIC: Found ${profilesData.records?.length || 0} profiles matching Name: "${identifier}"`);
      
      if (!profilesData.records || profilesData.records.length === 0) {
        console.log(`❌ PUBLIC: No profile found for identifier: "${identifier}"`);
        return res.status(404).json({ error: "Profile not found" });
      }

      // Get the first matching profile
      const profileRecord = profilesData.records[0];
      const fields = profileRecord.fields;
      
      console.log(`✅ PUBLIC: Profile found! Available fields: ${Object.keys(fields).join(', ')}`);
      
      // Format the response
      const profile = {
        name: fields.Name || identifier,
        email: fields.email || '',
        userProfile: fields['User profile'] || 'No profile information available',
        userId: fields['User ID'] || fields.UserID || '',
        // Include all raw fields for debugging
        rawFields: fields
      };

      console.log(`✅ PUBLIC: Profile data prepared for: ${profile.name}, User Profile length: ${profile.userProfile.length} characters`);
      console.log(`🔍 PUBLIC: Profile data being sent to frontend:`, profile);
      
      res.json(profile);
      
    } catch (error) {
      console.error('❌ PUBLIC: Error fetching public profile:', error);
      res.status(500).json({ error: "Failed to fetch profile", details: error.message });
    }
  });

  // Get complete user profile from Airtable platouserprofiles table
  app.get('/api/user-profile/:userId', requireAuth, async (req: any, res) => {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        console.log('❌ No user ID provided in request');
        return res.status(400).json({ message: "User ID is required" });
      }

      console.log(`🔍 Fetching complete user profile for identifier: "${userId}"`);
      console.log(`👤 Authenticated user: ${req.user?.claims?.sub || 'unknown'}`);
      console.log(`🏢 Organization ID: ${req.user?.orgId || 'unknown'}`);
      
      const AIRTABLE_API_KEY = 'pat770a3TZsbDther.a2b72657b27da4390a5215e27f053a3f0a643d66b43168adb6817301ad5051c0';
      
      // Step 1: Find the actual UserID from the job applications table
      console.log(`📋 Step 1: Finding UserID from job applications for: "${userId}"`);
      const applicationsBaseId = 'appEYs1fTytFXoJ7x';
      const applicationsTableName = 'platojobapplications';
      
      // Search by name in applications table
      let applicationsUrl = `https://api.airtable.com/v0/${applicationsBaseId}/${applicationsTableName}?filterByFormula=${encodeURIComponent(`{Name} = "${userId}"`)}`;
      
      const applicationsResponse = await fetch(applicationsUrl, {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!applicationsResponse.ok) {
        console.log(`❌ Failed to fetch applications: ${applicationsResponse.status} ${applicationsResponse.statusText}`);
        return res.status(500).json({ message: 'Failed to fetch application data' });
      }
      
      const applicationsData = await applicationsResponse.json();
      console.log(`📋 Found ${applicationsData.records.length} applications matching name: "${userId}"`);
      
      let actualUserId = userId; // Default to the provided identifier
      
      if (applicationsData.records.length > 0) {
        const application = applicationsData.records[0];
        const userIdFromApplication = application.fields?.['UserID'] || application.fields?.['User ID'] || application.fields?.['userId'] || '';
        if (userIdFromApplication) {
          actualUserId = userIdFromApplication;
          console.log(`✅ Found UserID from application: "${actualUserId}"`);
        } else {
          console.log(`⚠️ No UserID field found in application, using name: "${userId}"`);
        }
      } else {
        console.log(`⚠️ No application found for name "${userId}", will try direct profile lookup`);
      }
      
      // Step 2: Fetch the user profile using the actual UserID
      console.log(`👤 Step 2: Fetching user profile for UserID: "${actualUserId}"`);
      const profilesBaseId = 'app3tA4UpKQCT2s17';
      const profilesTableName = 'Table%201';
      
      // Try by UserID field first
      let profilesUrl = `https://api.airtable.com/v0/${profilesBaseId}/${profilesTableName}?filterByFormula=${encodeURIComponent(`{UserID} = "${actualUserId}"`)}`;
      
      let profilesResponse = await fetch(profilesUrl, {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!profilesResponse.ok) {
        console.log(`❌ Failed to fetch profiles: ${profilesResponse.status} ${profilesResponse.statusText}`);
        return res.status(500).json({ message: 'Failed to fetch profile data' });
      }
      
      let profilesData = await profilesResponse.json();
      console.log(`👤 Found ${profilesData.records.length} profiles matching UserID: "${actualUserId}"`);
      
      // If no match by UserID, try by Name
      if (profilesData.records.length === 0) {
        console.log(`🔍 No UserID match, trying by Name: "${userId}"`);
        profilesUrl = `https://api.airtable.com/v0/${profilesBaseId}/${profilesTableName}?filterByFormula=${encodeURIComponent(`{Name} = "${userId}"`)}`;
        
        profilesResponse = await fetch(profilesUrl, {
          headers: {
            'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (profilesResponse.ok) {
          profilesData = await profilesResponse.json();
          console.log(`👤 Found ${profilesData.records.length} profiles matching Name: "${userId}"`);
        }
      }
      
      if (profilesData.records.length === 0) {
        console.log(`❌ No profile found for "${userId}" in either UserID or Name fields`);
        return res.status(404).json({ message: "User profile not found" });
      }
      
      // Step 3: Extract and format the profile data
      const profileRecord = profilesData.records[0];
      const fields = profileRecord.fields;
      
      console.log(`✅ Found profile! Available fields: ${Object.keys(fields).join(', ')}`);
      console.log(`🔍 Raw profile data for debugging:`, JSON.stringify(fields, null, 2));
      
      const profile = {
        id: profileRecord.id,
        userId: actualUserId,
        name: fields['Name'] || fields['name'] || 'Unknown',
        email: fields['Email'] || fields['email'] || null,
        phone: fields['Phone'] || fields['phone'] || null,
        location: fields['Location'] || fields['location'] || null,
        // Try multiple field name variations for user profile content
        userProfile: fields['User profile'] || fields['user profile'] || fields['User Profile'] || fields['Profile'] || fields['profile'] || '',
        professionalSummary: fields['Professional Summary'] || fields['professional summary'] || '',
        workExperience: fields['Work Experience'] || fields['work experience'] || fields['Experience'] || fields['experience'] || '',
        technicalAnalysis: fields['Technical Analysis'] || fields['technical analysis'] || '',
        personalAnalysis: fields['Personal Analysis'] || fields['personal analysis'] || '',
        professionalAnalysis: fields['Professional Analysis'] || fields['professional analysis'] || '',
        technicalScore: fields['Technical Score'] || fields['technical score'] || 0,
        personalScore: fields['Personal Score'] || fields['personal score'] || 0,
        professionalScore: fields['Professional Score'] || fields['professional score'] || 0,
        overallScore: fields['Overall Score'] || fields['overall score'] || 0,
        resume: fields['Resume'] || fields['resume'] || null,
        portfolioLink: fields['Portfolio Link'] || fields['portfolio link'] || null,
        linkedinProfile: fields['LinkedIn Profile'] || fields['linkedin profile'] || null,
        githubProfile: fields['GitHub Profile'] || fields['github profile'] || null,
        salaryExpectation: fields['Salary Expectation'] || fields['salary expectation'] || null,
        availabilityDate: fields['Availability Date'] || fields['availability date'] || null,
        workPreference: fields['Work Preference'] || fields['work preference'] || null,
        yearsExperience: fields['Years Experience'] || fields['years experience'] || null,
        education: fields['Education'] || fields['education'] || null,
        certifications: fields['Certifications'] || fields['certifications'] || null,
        skills: fields['Skills'] || fields['skills'] || null,
        languages: fields['Languages'] || fields['languages'] || null,
        interests: fields['Interests'] || fields['interests'] || null,
        coverLetter: fields['Cover Letter'] || fields['cover letter'] || null,
        // Include all raw fields for debugging
        rawFields: fields
      };

      console.log(`✅ Profile data prepared for: ${profile.name}, User Profile length: ${profile.userProfile.length} characters`);
      console.log(`🔍 Profile data being sent to frontend:`, profile);
      res.json(profile);
      
    } catch (error) {
      console.error('❌ Error fetching user profile:', error);
      res.status(500).json({ message: 'Failed to fetch user profile' });
    }
  });

  // Generate comprehensive AI-powered job match analysis
  app.post('/api/ai/job-match-analysis', requireAuth, async (req: any, res) => {
    try {
      const { jobTitle, jobDescription, jobRequirements, userProfile } = req.body;
      
      if (!jobTitle || !jobDescription || !userProfile) {
        return res.status(400).json({ message: "Job title, description, and user profile are required" });
      }

      console.log(`🤖 Generating comprehensive job match analysis for: ${userProfile.name}`);

      const prompt = `You are an expert HR analyst. Analyze this candidate's profile against the job requirements and provide a comprehensive match analysis.

**JOB DETAILS:**
Title: ${jobTitle}
Description: ${jobDescription}
Requirements: ${jobRequirements || 'Not specified'}

**CANDIDATE PROFILE:**
Name: ${userProfile.name}
User ID: ${userProfile.userId}
Email: ${userProfile.email || 'Not provided'}
Location: ${userProfile.location || 'Not specified'}
Experience: ${userProfile.experience || 'Not specified'}
Skills: ${userProfile.skills || 'Not specified'}
Salary Expectation: ${userProfile.salaryExpectation || 'Not specified'}
Profile Details: ${userProfile.userProfile || ''}
Resume: ${userProfile.resume || 'Not provided'}
Cover Letter: ${userProfile.coverLetter || 'Not provided'}

**ANALYSIS REQUIREMENTS:**
Provide a comprehensive JSON response with the following structure:
{
  "overallMatchScore": <number 1-100>,
  "matchSummary": "<2-3 sentence summary of overall fit>",
  "technicalAlignment": {
    "score": <number 1-100>,
    "analysis": "<2 complete sentences analyzing technical skills match with specific examples from candidate profile and job requirements>"
  },
  "experienceAlignment": {
    "score": <number 1-100>,
    "analysis": "<2 complete sentences evaluating experience relevance with specific references to years, roles, and responsibilities>"
  },
  "culturalFit": {
    "score": <number 1-100>,
    "analysis": "<2 complete sentences assessing cultural alignment based on communication style, work preferences, and company culture fit>"
  },
  "strengths": [
    "<specific strength 1>",
    "<specific strength 2>",
    "<specific strength 3>"
  ],
  "gaps": [
    "<development area 1>",
    "<development area 2>",
    "<development area 3>"
  ],
  "recommendations": [
    "<hiring recommendation 1>",
    "<hiring recommendation 2>",
    "<hiring recommendation 3>"
  ],
  "interviewFocus": [
    "<interview focus area 1>",
    "<interview focus area 2>",
    "<interview focus area 3>"
  ]
}

Be specific, avoid generic responses, and base analysis on the actual profile data provided. Use varied scores (avoid round numbers like 70, 80, 90).`;

      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are an expert HR analyst specializing in comprehensive candidate-job matching analysis. Provide detailed, specific assessments based on the exact job requirements and candidate profile provided. For component analysis, provide 1-2 complete sentences explaining your reasoning with specific references to the candidate's background and job requirements."
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1, // Lower temperature for more consistent results
        max_tokens: 2000, // Ensure full responses aren't truncated
      });

      const analysis = JSON.parse(response.choices[0].message.content);
      console.log(`✅ Generated comprehensive match analysis with overall score: ${analysis.overallMatchScore}`);

      res.json(analysis);
    } catch (error) {
      console.error('Error generating job match analysis:', error);
      res.status(500).json({ message: 'Failed to generate job match analysis' });
    }
  });

  // Real applicants - Accept candidate (move from platojobapplications to platojobmatches)
  app.post('/api/real-applicants/:id/accept', async (req: any, res) => {
    try {
      const airtableRecordId = req.params.id; // This is the Airtable record ID like "recTL77B7HtjJyRqA"
      
      console.log(`🎯 Accepting applicant with Airtable record ID: ${airtableRecordId}...`);
      
      // Step 1: Fetch applicant record from platojobapplications table using the record ID
      const AIRTABLE_API_KEY = 'pat770a3TZsbDther.a2b72657b27da4390a5215e27f053a3f0a643d66b43168adb6817301ad5051c0';
      const APPLICATIONS_BASE_ID = 'appEYs1fTytFXoJ7x';
      const MATCHES_BASE_ID = 'app1u4N2W46jD43mP';
      
      // Get applicant record from platojobapplications using the Airtable record ID
      const applicantUrl = `https://api.airtable.com/v0/${APPLICATIONS_BASE_ID}/Table%201/${airtableRecordId}`;
      const applicantResponse = await fetch(applicantUrl, {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!applicantResponse.ok) {
        if (applicantResponse.status === 404) {
          return res.status(404).json({ message: "Applicant not found in platojobapplications table" });
        }
        throw new Error(`Failed to fetch applicant: ${applicantResponse.status} ${applicantResponse.statusText}`);
      }

      const applicantData = await applicantResponse.json();
      const fields = applicantData.fields;
      
      console.log(`📋 Raw applicant data:`, JSON.stringify(applicantData, null, 2));
      console.log(`📋 Applicant fields:`, JSON.stringify(fields, null, 2));
      
      // Step 2: Extract the actual User ID and other data from the record fields
      const actualUserId = fields['Applicant User ID']; // Use the correct field name from Airtable
      const applicantName = fields['Applicant Name']; // Use the correct field name
      const jobId = fields['Job ID'];
      const jobTitle = fields['Job title']; // lowercase 't' in title
      const jobDescription = fields['Job description']; // lowercase 'd' in description
      const companyName = fields['Company'];
      
      console.log(`📋 Extracted data - User ID: ${actualUserId}, Name: ${applicantName}, Job: ${jobTitle}`);
      
      // Step 3: Validate required fields exist - all fields should be present now with correct names
      if (!actualUserId || !applicantName || !jobTitle || !companyName) {
        const missingFields = [];
        if (!actualUserId) missingFields.push('Applicant User ID');
        if (!applicantName) missingFields.push('Applicant Name');
        if (!jobTitle) missingFields.push('Job title');
        if (!companyName) missingFields.push('Company');
        
        console.log(`❌ Missing required fields: ${missingFields.join(', ')}`);
        console.log(`❌ Field values - User ID: "${actualUserId}", Name: "${applicantName}", Job: "${jobTitle}", Company: "${companyName}"`);
        return res.status(400).json({ 
          message: `Missing required fields: ${missingFields.join(', ')}`,
          missingFields: missingFields,
          availableFields: fields ? Object.keys(fields) : [],
          fieldValues: {
            'Applicant User ID': actualUserId,
            'Applicant Name': applicantName,
            'Job title': jobTitle,
            'Company': companyName
          }
        });
      }
      
      // Step 4: Create job match record in platojobmatches table using the REAL User ID
      const jobMatchData = {
        fields: {
          'Name': applicantName,
          'User ID': actualUserId, // Use the actual User ID from the record, not the Airtable record ID
          'Job title': jobTitle,
          'Job Description': jobDescription || 'No description provided',
          'Company name': companyName,
          'Job ID': jobId // Include Job ID if available
        }
      };

      const matchesUrl = `https://api.airtable.com/v0/${MATCHES_BASE_ID}/Table%201`;
      const matchResponse = await fetch(matchesUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(jobMatchData)
      });

      if (!matchResponse.ok) {
        const errorText = await matchResponse.text();
        console.error(`❌ Failed to create job match:`, errorText);
        throw new Error(`Failed to create job match: ${matchResponse.status} ${matchResponse.statusText} - ${errorText}`);
      }

      const createdMatch = await matchResponse.json();
      console.log(`✅ Created job match record with ID: ${createdMatch.id} for User ID: ${actualUserId}`);
      
      // Step 5: Update applicant status to 'Accepted' in platojobapplications
      const statusUpdateData = {
        fields: {
          'Status': 'Accepted'
        }
      };

      const statusUpdateResponse = await fetch(applicantUrl, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(statusUpdateData)
      });

      if (!statusUpdateResponse.ok) {
        console.warn(`⚠️ Failed to update applicant status: ${statusUpdateResponse.status}`);
      } else {
        console.log(`✅ Updated applicant status to 'Accepted' for record ${airtableRecordId}`);
      }
      
      // Step 6: Store accepted applicant locally for interview scheduling
      const user = req.user as any;
      const userId = user.claims.sub;
      const organization = await storage.getOrganizationByUser(userId);
      
      if (organization) {
        try {
          console.log(`🔄 Attempting to store accepted applicant locally:`, {
            candidateId: actualUserId,
            candidateName: applicantName,
            candidateEmail: "",
            jobId: jobId.toString(),
            jobTitle: jobTitle,
            organizationId: organization.id,
            acceptedBy: userId
          });
          
          await storage.addAcceptedApplicant({
            candidateId: actualUserId,
            candidateName: applicantName,
            candidateEmail: "", // We don't have email from this record  
            jobId: jobId.toString(),
            jobTitle: jobTitle,
            organizationId: organization.id,
            acceptedBy: userId
          });
          console.log(`✅ Stored accepted applicant locally for organization ${organization.id}`);
        } catch (error) {
          console.error(`❌ Failed to store accepted applicant locally:`, error);
        }
      } else {
        console.warn(`⚠️ No organization found for user ${userId}`);
      }
      
      console.log(`✅ Successfully accepted applicant ${applicantName} (User ID: ${actualUserId})`);
      res.json({ 
        message: "Applicant accepted successfully",
        applicantName: applicantName,
        actualUserId: actualUserId,
        jobTitle: jobTitle,
        matchId: createdMatch.id,
        airtableRecordId: airtableRecordId
      });
      
    } catch (error) {
      console.error("❌ Error accepting applicant:", error);
      res.status(500).json({ 
        message: "Failed to accept applicant",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Real applicants - Decline candidate (update status in platojobapplications)
  app.post('/api/real-applicants/:id/decline', requireAuth, async (req: any, res) => {
    try {
      const applicantId = req.params.id;
      
      console.log(`❌ Declining applicant ${applicantId}...`);
      
      // Get applicant name for logging
      const { realApplicantsAirtableService } = await import('./realApplicantsAirtableService');
      
      let applicantName = 'Unknown Applicant';
      try {
        const applicant = await realApplicantsAirtableService.getApplicantById(applicantId);
        applicantName = applicant?.name || 'Unknown Applicant';
      } catch (error) {
        console.warn(`⚠️ Could not fetch applicant name: ${error}`);
      }
      
      // Update status in applications table instead of deleting
      console.log(`❌ Updating applicant ${applicantId} status to denied in platojobapplications table...`);
      await realApplicantsAirtableService.updateApplicantStatus(applicantId, 'denied');
      
      console.log(`✅ Successfully declined applicant ${applicantName} (${applicantId})`);
      res.json({ 
        message: "Applicant declined - status updated",
        applicantName: applicantName,
        undoData: {
          applicantId,
          applicantName,
          action: 'decline'
        }
      });
      
    } catch (error) {
      console.error("❌ Error declining applicant:", error);
      res.status(500).json({ 
        message: "Failed to decline applicant",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Fix most recent accepted candidate User ID
  app.post('/api/fix-recent-candidate-userid', requireAuth, async (req: any, res) => {
    try {
      console.log(`🔧 Fixing most recent accepted candidate User ID...`);
      
      const { JobMatchesAirtableService } = await import('./jobMatchesAirtableService');
      const { realApplicantsAirtableService } = await import('./realApplicantsAirtableService');
      const jobMatchesService = new JobMatchesAirtableService();
      
      // Get the most recent job match
      const mostRecentMatch = await jobMatchesService.getMostRecentJobMatch();
      
      if (!mostRecentMatch) {
        return res.status(404).json({ message: "No job matches found" });
      }
      
      console.log(`📋 Most recent job match:`, mostRecentMatch.fields);
      
      const currentUserId = mostRecentMatch.fields['User ID'];
      const candidateName = mostRecentMatch.fields['Name'];
      const jobTitle = mostRecentMatch.fields['Job title'];
      
      // Look for this candidate in platojobapplications with "Accepted" status
      const allApplications = await realApplicantsAirtableService.getAllApplicantsIncludingProcessed();
      
      // Find the accepted application for this candidate and job
      const matchingApplication = allApplications.find(app => 
        app.name === candidateName && 
        app.jobTitle === jobTitle &&
        app.status === 'Accepted'
      );
      
      if (!matchingApplication) {
        return res.status(404).json({ 
          message: `No matching accepted application found for ${candidateName} - ${jobTitle}` 
        });
      }
      
      const correctUserId = matchingApplication.userId;
      
      if (currentUserId === correctUserId) {
        return res.json({ 
          message: "User ID is already correct",
          currentUserId,
          candidateName,
          jobTitle
        });
      }
      
      // Update the job match with the correct User ID
      console.log(`🔄 Updating User ID from ${currentUserId} to ${correctUserId}`);
      await jobMatchesService.updateJobMatchUserId(mostRecentMatch.id, correctUserId);
      
      res.json({ 
        message: "Successfully updated most recent candidate User ID",
        candidateName,
        jobTitle,
        oldUserId: currentUserId,
        newUserId: correctUserId,
        recordId: mostRecentMatch.id
      });
      
    } catch (error) {
      console.error("❌ Error fixing candidate User ID:", error);
      res.status(500).json({ 
        message: "Failed to fix candidate User ID",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Undo accept applicant - move from platojobmatches back to platojobapplications
  app.post('/api/real-applicants/:id/undo-accept', requireAuth, async (req: any, res) => {
    try {
      const { applicantId, userId, applicantName, jobTitle, jobDescription, companyName } = req.body;
      
      console.log(`⏪ Undoing accept for applicant ${applicantName}...`);
      
      // Create record back in platojobapplications
      const applicationsUrl = `https://api.airtable.com/v0/appEYs1fTytFXoJ7x/Table%201`;
      const applicationData = {
        fields: {
          'Applicant Name': applicantName,
          'User ID': userId,
          'Job title': jobTitle,
          'Job description': jobDescription,
          'Company name': companyName,
          'Job ID': req.params.id // Use the job ID from parameters
        }
      };
      
      const response = await fetch(applicationsUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${'pat770a3TZsbDther.a2b72657b27da4390a5215e27f053a3f0a643d66b43168adb6817301ad5051c0'}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(applicationData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to restore application: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      // Delete from platojobmatches
      const { JobMatchesAirtableService } = await import('./jobMatchesAirtableService');
      const jobMatchesService = new JobMatchesAirtableService();
      
      // Find and delete the job match record
      const matchesUrl = `https://api.airtable.com/v0/app1u4N2W46jD43mP/Table%201?filterByFormula=AND({User ID}='${userId}',{Job title}='${jobTitle}')`;
      
      const searchResponse = await fetch(matchesUrl, {
        headers: {
          'Authorization': `Bearer ${'pat770a3TZsbDther.a2b72657b27da4390a5215e27f053a3f0a643d66b43168adb6817301ad5051c0'}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (searchResponse.ok) {
        const searchData = await searchResponse.json() as any;
        if (searchData.records && searchData.records.length > 0) {
          const recordId = searchData.records[0].id;
          const deleteUrl = `https://api.airtable.com/v0/app1u4N2W46jD43mP/Table%201/${recordId}`;
          
          await fetch(deleteUrl, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${'pat770a3TZsbDther.a2b72657b27da4390a5215e27f053a3f0a643d66b43168adb6817301ad5051c0'}`,
            }
          });
        }
      }
      
      // Remove from local accepted applicants storage
      const user = req.user.id;
      const organization = await storage.getOrganizationByUser(user);
      if (organization) {
        try {
          await storage.removeAcceptedApplicant(userId, req.params.id, organization.id);
          console.log(`💾 Removed applicant ${applicantName} from local accepted applicants storage`);
        } catch (error) {
          console.warn(`⚠️ Could not remove from local storage: ${error}`);
        }
      }
      
      console.log(`✅ Successfully undid accept for applicant ${applicantName}`);
      res.json({ 
        message: "Accept action undone - applicant restored to applications",
        applicantName: applicantName
      });
      
    } catch (error) {
      console.error("❌ Error undoing accept:", error);
      res.status(500).json({ 
        message: "Failed to undo accept action",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // AI-powered applicant profile analysis
  app.post('/api/ai/analyze-applicant-profile', requireAuth, async (req: any, res) => {
    try {
      const { applicantData, jobTitle, jobDescription, requiredSkills } = req.body;
      const { analyzeApplicantProfile } = await import('./openai');
      const analysis = await analyzeApplicantProfile(applicantData, jobTitle, jobDescription, requiredSkills);
      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing applicant profile:", error);
      res.status(500).json({ message: "Failed to analyze applicant profile" });
    }
  });

  // Airtable discovery and testing routes
  app.get('/api/airtable/discover', requireAuth, async (req: any, res) => {
    try {
      const structure = await airtableMatchingService.discoverAirtableStructure();
      res.json(structure);
    } catch (error) {
      console.error("Error discovering Airtable structure:", error);
      res.status(500).json({ message: "Failed to discover Airtable structure" });
    }
  });

  // Show Airtable database information (public endpoint for exploration)
  app.get('/api/airtable/info', async (req: any, res) => {
    try {
      const bases = await airtableService.getBases();
      const info = {
        apiKey: "Connected ✓",
        basesFound: bases.length,
        bases: bases.map((base: any) => ({
          id: base.id,
          name: base.name,
          permissionLevel: base.permissionLevel
        })),
        expectedFields: [
          "Name or FullName - candidate's full name",
          "Email - candidate's email address", 
          "Skills - list of general skills",
          "TechnicalSkills - list of technical skills",
          "Experience - work experience description",
          "YearsExperience - number of years experience",
          "PreviousRole - most recent job title",
          "Location - candidate location",
          "SalaryExpectation - expected salary",
          "InterviewScore - score from interview (1-10)",
          "Summary or Bio - candidate summary"
        ]
      };
      res.json(info);
    } catch (error: any) {
      console.error("Error fetching Airtable info:", error);
      res.status(500).json({ 
        message: "Error connecting to Airtable", 
        error: error?.message || "Unknown error",
        apiKey: "Connected"
      });
    }
  });

  // Get all Airtable candidates (for general viewing)
  app.get('/api/candidates', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);
      
      if (!organization) {
        return res.json([]);
      }

      const candidates = await airtableMatchingService.getAllCandidatesWithScores(organization.id);
      res.json(candidates);
    } catch (error) {
      console.error("Error fetching Airtable candidates:", error);
      res.status(500).json({ message: "Failed to fetch candidates from Airtable" });
    }
  });

  // NEW: Airtable-based candidate matching for specific job
  app.get('/api/job-postings/:id/candidates', requireAuth, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.id);
      
      // Fetch candidates from Airtable and generate AI match scores
      const matchedCandidates = await airtableMatchingService.getCandidatesForJob(jobId);
      
      // Filter out declined candidates
      const applications = await storage.getApplicationsByJob(jobId);
      const declinedCandidateIds = applications
        .filter(app => app.status === 'declined')
        .map(app => app.candidateId);
      
      const filteredCandidates = matchedCandidates.filter(
        candidate => !declinedCandidateIds.includes(candidate.id)
      );
      
      // Add application status to candidates
      const candidatesWithStatus = filteredCandidates.map(candidate => {
        const application = applications.find(app => app.candidateId === candidate.id);
        return {
          ...candidate,
          applicationStatus: application?.status || 'pending',
          reviewedAt: application?.reviewedAt,
        };
      });
      
      res.json(candidatesWithStatus);
    } catch (error) {
      console.error("Error fetching Airtable candidates for job:", error);
      res.status(500).json({ message: "Failed to fetch candidates from Airtable" });
    }
  });

  // Accept a candidate (create or update application)
  app.post('/api/job-postings/:jobId/candidates/:candidateId/accept', requireAuth, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const candidateId = req.params.candidateId;
      const userId = req.user.id;
      
      // Get candidate info from request body
      const { candidateName, matchScore, matchReasoning } = req.body;
      
      // Get job details to update Airtable
      const job = await storage.getJobById(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Get organization details for company name
      const organization = await storage.getOrganizationByUser(userId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      // Check if application already exists
      let application = await storage.getApplication(jobId, candidateId);
      
      if (application) {
        // Update existing application
        application = await storage.updateApplicationStatus(jobId, candidateId, 'accepted', userId);
      } else {
        // Create new application
        application = await storage.createApplication({
          jobId,
          candidateId,
          candidateName,
          status: 'accepted',
          matchScore,
          matchReasoning,
          reviewedBy: userId,
          reviewedAt: new Date(),
        });
      }
      
      // Create job match record in Airtable when candidate is accepted
      try {
        console.log(`Creating job match record for candidate ${candidateId} with job: ${job.title}`);
        console.log(`Job description: ${job.description}`);
        
        // We need to get the candidate details to extract the User ID and Name
        const candidates = await airtableMatchingService.getCandidatesForJob(jobId);
        const candidateData = candidates.find(c => c.id === candidateId);
        
        if (candidateData && candidateData.userId) {
          await airtableService.createJobMatch(
            candidateData.name || candidateName, // Use name from Airtable or fallback to provided name
            candidateData.userId, // User ID from the candidate profile
            job.title,
            job.description || '',
            organization.companyName, // Company name from organization
            job.id // Job ID
          );
          console.log(`✅ Successfully created job match record for ${candidateData.name} (User ID: ${candidateData.userId})`);
        } else {
          console.warn(`⚠️ Could not find User ID for candidate ${candidateId}, skipping Airtable job match creation`);
        }
      } catch (airtableError) {
        console.error('❌ Failed to create Airtable job match, but candidate was accepted:', airtableError);
        // Don't fail the entire operation if Airtable update fails
      }
      
      res.json({ success: true, application });
    } catch (error) {
      console.error("Error accepting candidate:", error);
      res.status(500).json({ message: "Failed to accept candidate" });
    }
  });

  // Decline a candidate
  app.post('/api/job-postings/:jobId/candidates/:candidateId/decline', requireAuth, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const candidateId = req.params.candidateId;
      const userId = req.user.id;
      
      // Get candidate info from request body
      const { candidateName, matchScore, matchReasoning } = req.body;
      
      // Check if application already exists
      let application = await storage.getApplication(jobId, candidateId);
      
      if (application) {
        // Update existing application
        application = await storage.updateApplicationStatus(jobId, candidateId, 'declined', userId);
      } else {
        // Create new application with declined status
        application = await storage.createApplication({
          jobId,
          candidateId,
          candidateName,
          status: 'declined',
          matchScore,
          matchReasoning,
          reviewedBy: userId,
          reviewedAt: new Date(),
        });
      }
      
      res.json({ success: true, application });
    } catch (error) {
      console.error("Error declining candidate:", error);
      res.status(500).json({ message: "Failed to decline candidate" });
    }
  });

  // Schedule interview for accepted candidate
  app.post('/api/job-postings/:jobId/candidates/:candidateId/schedule-interview', requireAuth, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const candidateId = req.params.candidateId;
      const userId = req.user.id;
      
      const { candidateName, scheduledDate, scheduledTime, interviewType, meetingLink, notes } = req.body;
      
      // Get the application
      const application = await storage.getApplication(jobId, candidateId);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      
      // Create interview
      const interview = await storage.createInterview({
        applicationId: application.id,
        jobId,
        candidateId,
        candidateName,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
        scheduledTime,
        interviewType: interviewType || 'video',
        meetingLink,
        notes,
        createdBy: userId,
      });
      
      res.json({ success: true, interview });
    } catch (error) {
      console.error("Error scheduling interview:", error);
      res.status(500).json({ message: "Failed to schedule interview" });
    }
  });

  // Get interviews for a job
  app.get('/api/job-postings/:id/interviews', requireAuth, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const interviews = await storage.getInterviewsByJob(jobId);
      res.json(interviews);
    } catch (error) {
      console.error("Error fetching interviews:", error);
      res.status(500).json({ message: "Failed to fetch interviews" });
    }
  });

  // Enhanced Candidates route - from platouserprofiles with score > 85
  app.get('/api/enhanced-candidates', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);
      
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Get all organization jobs for scoring candidates against
      const organizationJobs = await storage.getJobsByOrganization(organization.id);
      if (organizationJobs.length === 0) {
        return res.json([]);
      }

      const { airtableService } = await import('./airtableService');
      const { applicantScoringService } = await import('./applicantScoringService');

      console.log('Fetching enhanced candidates from platouserprofiles...');
      
      // Get all candidates from platouserprofiles
      const allCandidates = await airtableService.getAllCandidates();
      
      if (allCandidates.length === 0) {
        return res.json([]);
      }

      console.log(`Found ${allCandidates.length} candidates, evaluating against ${organizationJobs.length} jobs...`);

      // Score each candidate against all active jobs to find their best match
      const candidatesWithScores = [];
      
      for (const candidate of allCandidates) {
        if (!candidate.aiProfile) {
          continue;
        }
        
        let bestScore = 0;
        let bestJobMatch = null;
        let bestSummary = '';
        
        // Score against each job to find the best match
        for (const job of organizationJobs) {
          if (!job.description) continue;
          
          const result = await applicantScoringService.scoreApplicant(
            candidate.aiProfile, 
            job.description
          );
          
          if (result.score > bestScore) {
            bestScore = result.score;
            bestJobMatch = job;
            bestSummary = result.summary;
          }
        }
        
        // Only include candidates with score > 85
        if (bestScore > 85 && bestJobMatch) {
          candidatesWithScores.push({
            ...candidate,
            matchScore: bestScore,
            matchSummary: bestSummary,
            bestMatchJob: {
              id: bestJobMatch.id,
              title: bestJobMatch.title,
              description: bestJobMatch.description
            }
          });
        }
        
        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Sort by match score (highest first)
      candidatesWithScores.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

      console.log(`Found ${candidatesWithScores.length} high-scoring candidates (>85) out of ${allCandidates.length} total`);
      
      res.json(candidatesWithScores);
    } catch (error) {
      console.error("Error fetching enhanced candidates:", error);
      res.status(500).json({ message: "Failed to fetch enhanced candidates" });
    }
  });

  app.get('/api/companies/matches', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);
      
      if (!organization) {
        return res.json([]);
      }
      
      const matches = await storage.getMatchesByOrganization(organization.id);
      res.json(matches);
    } catch (error) {
      console.error("Error fetching matches:", error);
      res.status(500).json({ message: "Failed to fetch matches" });
    }
  });

  // Generate matches for a job (simulate AI matching)
  app.post('/api/job-postings/:id/generate-matches', requireAuth, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const job = await storage.getJobById(jobId);
      const candidates = await storage.getCandidates();
      
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Generate matches for top candidates
      const matches = [];
      for (const candidate of candidates.slice(0, 10)) {
        const matchAnalysis = await generateCandidateMatchRating(candidate, job);
        
        const match = await storage.createMatch({
          jobId,
          candidateId: candidate.id,
          matchScore: matchAnalysis.score,
          matchReasoning: matchAnalysis.reasoning
        });
        
        matches.push(match);
      }
      
      res.json(matches);
    } catch (error) {
      console.error("Error generating matches:", error);
      res.status(500).json({ message: "Failed to generate matches" });
    }
  });

  // Format user profile with AI
  app.post('/api/format-profile', requireAuth, async (req: any, res) => {
    try {
      const { rawProfile } = req.body;
      
      if (!rawProfile) {
        return res.status(400).json({ message: "Raw profile is required" });
      }
      
      const { formatUserProfile } = await import('./openai');
      const formattedProfile = await formatUserProfile(rawProfile);
      
      res.json({ formattedProfile });
    } catch (error) {
      console.error("Error formatting profile:", error);
      res.status(500).json({ message: "Failed to format profile" });
    }
  });

  // Debug UserID mapping between applicants and profiles
  app.get('/api/debug-userids', async (req, res) => {
    try {
      const AIRTABLE_API_KEY = 'pat770a3TZsbDther.a2b72657b27da4390a5215e27f053a3f0a643d66b43168adb6817301ad5051c0';
      const realApplicantsService = new (await import('./realApplicantsAirtableService')).RealApplicantsAirtableService(AIRTABLE_API_KEY);
      const airtableService2 = new (await import('./airtableService')).AirtableService(AIRTABLE_API_KEY);
      
      // Get all applicants
      const allApplicants = await realApplicantsService.getAllApplicants();
      
      // Get all profiles
      const allProfiles = await airtableService2.getAllCandidateProfiles('app3tA4UpKQCT2s17', 'platouserprofiles');
      
      const debug = {
        applicants: allApplicants.map(app => ({
          name: app.name,
          userId: app.userId,
          userIdLength: app.userId.length
        })),
        profiles: allProfiles.map(profile => ({
          name: profile.fields?.Name || profile.fields?.name || 'Unknown',
          userId: profile.fields?.['User ID'] || profile.fields?.['UserID'] || profile.fields?.['User id'] || profile.fields?.['user id'] || '',
          userIdLength: (profile.fields?.['User ID'] || profile.fields?.['UserID'] || profile.fields?.['User id'] || profile.fields?.['user id'] || '').length,
          availableFields: Object.keys(profile.fields)
        })),
        comparison: allApplicants.map(app => {
          const matchingProfile = allProfiles.find(profile => {
            const profileUserId = profile.fields?.['User ID'] || profile.fields?.['UserID'] || profile.fields?.['User id'] || profile.fields?.['user id'] || '';
            return profileUserId === app.userId;
          });
          return {
            applicantName: app.name,
            applicantUserId: app.userId,
            hasMatchingProfile: !!matchingProfile,
            matchingProfileName: matchingProfile ? (matchingProfile.fields?.Name || matchingProfile.fields?.name) : null
          };
        })
      };
      
      res.json(debug);
    } catch (error) {
      console.error('Debug UserIDs failed:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Test Airtable connection and field structure
  app.get('/api/test-airtable', async (req, res) => {
    try {
      const candidates = await airtableService.getAllCandidateProfiles('app3tA4UpKQCT2s17', 'Table 1');
      
      if (candidates.length > 0) {
        const firstCandidate = candidates[0];
        console.log('📋 Sample candidate structure:', firstCandidate);
        console.log('📋 Raw Airtable fields:', firstCandidate.rawData);
        
        res.json({
          message: 'Airtable connection successful',
          candidateCount: candidates.length,
          sampleCandidate: {
            id: firstCandidate.id,
            name: firstCandidate.name,
            userId: firstCandidate.userId,
            availableFields: Object.keys(firstCandidate.rawData)
          }
        });
      } else {
        res.json({
          message: 'Airtable connected but no candidates found',
          candidateCount: 0
        });
      }
    } catch (error) {
      console.error('❌ Airtable test failed:', error);
      res.status(500).json({
        message: 'Airtable connection failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Cleanup route for testing - removes all candidates but keeps job postings
  app.post('/api/cleanup-candidates', requireAuth, async (req: any, res) => {
    try {
      console.log('🧹 Starting cleanup process...');
      await fullCleanup();
      res.json({ 
        success: true, 
        message: 'All candidates, job matches, and job applications have been cleared. Job postings remain unchanged.' 
      });
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Cleanup failed', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Interview Questions Management
  app.get('/api/interview-questions/jobs', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);
      
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const jobs = await interviewQuestionsService.getAllJobs();
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching jobs for interview questions:", error);
      res.status(500).json({ message: "Failed to fetch jobs" });
    }
  });

  app.get('/api/interview-questions/:jobId', requireAuth, async (req: any, res) => {
    try {
      const jobId = req.params.jobId;
      const questions = await interviewQuestionsService.getInterviewQuestions(jobId);
      res.json({ questions });
    } catch (error) {
      console.error("Error fetching interview questions:", error);
      res.status(500).json({ message: "Failed to fetch interview questions" });
    }
  });

  app.put('/api/interview-questions/:jobId', requireAuth, async (req: any, res) => {
    try {
      const jobId = req.params.jobId;
      const { questions } = req.body;
      
      if (!Array.isArray(questions)) {
        return res.status(400).json({ message: "Questions must be an array" });
      }

      await interviewQuestionsService.updateInterviewQuestions(jobId, questions);
      res.json({ message: "Interview questions updated successfully" });
    } catch (error) {
      console.error("Error updating interview questions:", error);
      res.status(500).json({ message: "Failed to update interview questions" });
    }
  });

  // Accept/Decline Real Applicants from platojobapplications
  app.post('/api/real-applicants/:id/accept', requireAuth, async (req: any, res) => {
    try {
      const applicantId = req.params.id;
      const userId = req.user.id;
      const { realApplicantsAirtableService } = await import('./realApplicantsAirtableService');
      
      console.log(`🔄 Accepting applicant ${applicantId}...`);
      
      // Get applicant details first
      const allApplicants = await realApplicantsAirtableService.getAllApplicants();
      const applicant = allApplicants.find(app => app.id === applicantId);
      
      if (!applicant) {
        console.log(`❌ Applicant ${applicantId} not found`);
        return res.status(404).json({ message: "Applicant not found" });
      }

      // Get organization for company name
      const organization = await storage.getOrganizationByUser(userId);
      if (!organization) {
        console.log(`❌ Organization not found for user ${userId}`);
        return res.status(404).json({ message: "Organization not found" });
      }

      console.log(`🔄 Updating status to 'Accepted' in Airtable for applicant ${applicant.name}...`);
      
      // First, update the status in Airtable to "Accepted"
      await realApplicantsAirtableService.updateApplicantStatus(applicantId, 'Accepted');
      
      console.log(`✅ Status updated to 'Accepted' in Airtable for ${applicant.name}`);
      
      // Then create job match record
      console.log(`🔄 Creating job match record for ${applicant.name}...`);
      await jobMatchesAirtableService.createJobMatch(
        applicant.name,
        applicant.userId || applicant.id, // Use userId if available, otherwise use record ID
        applicant.jobTitle,
        applicant.jobDescription || '',
        organization.companyName
      );

      console.log(`✅ Successfully accepted applicant ${applicant.name}: Status updated + Job match created`);
      res.json({ 
        success: true, 
        message: "Candidate successfully accepted and status updated",
        applicant: {
          ...applicant,
          status: 'Accepted'
        }
      });
    } catch (error) {
      console.error("❌ Error accepting real applicant:", error);
      res.status(500).json({ message: "Error: Failed to update candidate status in Airtable. Please try again." });
    }
  });

  app.post('/api/real-applicants/:id/decline', requireAuth, async (req: any, res) => {
    try {
      const applicantId = req.params.id;
      const { realApplicantsAirtableService } = await import('./realApplicantsAirtableService');
      
      console.log(`Declining and deleting applicant ${applicantId}...`);
      
      // Delete the applicant record from Airtable
      await realApplicantsAirtableService.deleteApplicant(applicantId);
      
      console.log(`✅ Successfully declined and deleted applicant ${applicantId}`);
      res.json({ 
        success: true, 
        message: "Applicant declined and removed" 
      });
    } catch (error) {
      console.error("Error declining real applicant:", error);
      res.status(500).json({ message: "Failed to decline applicant" });
    }
  });

  // Shortlist applicant
  app.post('/api/real-applicants/:id/shortlist', requireAuth, async (req: any, res) => {
    try {
      const applicantId = req.params.id;
      const { realApplicantsAirtableService } = await import('./realApplicantsAirtableService');
      
      console.log(`🌟 Adding applicant ${applicantId} to shortlist...`);
      
      // Update the status in Airtable to "Shortlisted"
      await realApplicantsAirtableService.updateApplicantStatus(applicantId, 'shortlisted');
      
      console.log(`✅ Successfully shortlisted applicant ${applicantId}`);
      res.json({ 
        success: true, 
        message: "Candidate added to shortlist successfully",
        status: 'Shortlisted'
      });
    } catch (error) {
      console.error("❌ Error shortlisting applicant:", error);
      res.status(500).json({ message: "Failed to add candidate to shortlist" });
    }
  });

  // Remove from shortlist (unshortlist)
  app.post('/api/real-applicants/:id/unshortlist', requireAuth, async (req: any, res) => {
    try {
      const applicantId = req.params.id;
      const { realApplicantsAirtableService } = await import('./realApplicantsAirtableService');
      
      console.log(`🗑️ Removing applicant ${applicantId} from shortlist...`);
      
      // Update the status in Airtable back to "pending" or empty
      await realApplicantsAirtableService.updateApplicantStatus(applicantId, 'pending');
      
      console.log(`✅ Successfully removed applicant ${applicantId} from shortlist`);
      res.json({ 
        success: true, 
        message: "Candidate removed from shortlist successfully",
        status: 'pending'
      });
    } catch (error) {
      console.error("❌ Error removing applicant from shortlist:", error);
      res.status(500).json({ message: "Failed to remove candidate from shortlist" });
    }
  });

  // Interview Management Endpoints
  app.get('/api/interviews/count', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);
      
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const { realInterviews } = await import('@shared/schema');
      const { eq, count } = await import('drizzle-orm');
      const { db } = await import('./db');
      
      const [{ count: interviewCount }] = await db
        .select({ count: count() })
        .from(realInterviews)
        .where(eq(realInterviews.organizationId, organization.id.toString()));
      
      res.json({ count: interviewCount || 0 });
    } catch (error) {
      console.error("Error counting interviews:", error);
      res.status(500).json({ message: "Failed to count interviews", count: 0 });
    }
  });

  app.get('/api/interviews', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);
      
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const { realInterviews } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      const { db } = await import('./db');
      
      const userInterviews = await db.select().from(realInterviews).where(eq(realInterviews.organizationId, organization.id.toString()));
      
      res.json(userInterviews);
    } catch (error) {
      console.error("Error fetching interviews:", error);
      res.status(500).json({ message: "Failed to fetch interviews" });
    }
  });

  app.post('/api/interviews', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);
      
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { candidateName, candidateEmail, candidateId, jobId, jobTitle, scheduledDate, scheduledTime, timeZone, interviewType, meetingLink, notes } = req.body;
      
      const { realInterviews } = await import('@shared/schema');
      const { nanoid } = await import('nanoid');
      const { db } = await import('./db');
      
      const interviewId = nanoid();
      const interviewer = user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email || 'Unknown';
      
      const [interview] = await db.insert(realInterviews).values({
        id: interviewId,
        candidateName,
        candidateEmail: candidateEmail || '',
        candidateId,
        jobId,
        jobTitle,
        scheduledDate,
        scheduledTime,
        timeZone: timeZone || 'UTC',
        interviewType: interviewType || 'video',
        meetingLink: meetingLink || '',
        interviewer,
        status: 'scheduled',
        notes: notes || '',
        organizationId: organization.id.toString(),
      }).returning();

      console.log(`✅ Created interview for ${candidateName} on ${scheduledDate} at ${scheduledTime}`);

      // Update the Airtable platojobmatches record with interview details
      try {
        const AIRTABLE_API_KEY = 'pat770a3TZsbDther.a2b72657b27da4390a5215e27f053a3f0a643d66b43168adb6817301ad5051c0';
        const MATCHES_BASE_ID = 'app1u4N2W46jD43mP';
        const matchesUrl = `https://api.airtable.com/v0/${MATCHES_BASE_ID}/Table%201`;
        
        // Find the platojobmatches record to update
        const filterFormula = `AND({User ID}='${candidateId}', {Job ID}='${jobId}')`;
        const searchUrl = `${matchesUrl}?filterByFormula=${encodeURIComponent(filterFormula)}`;
        
        console.log(`🔍 Searching for platojobmatches record: User ID=${candidateId}, Job ID=${jobId}`);
        
        const searchResponse = await fetch(searchUrl, {
          headers: {
            'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json'
          }
        });

        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          if (searchData.records && searchData.records.length > 0) {
            const recordId = searchData.records[0].id;
            console.log(`📝 Found record ID: ${recordId}, updating with interview details...`);
            
            // Create combined date & time string for Airtable with timezone
            const interviewDateTime = timeZone ? `${scheduledDate} at ${scheduledTime} (${timeZone})` : `${scheduledDate} at ${scheduledTime}`;
            
            // Update the record with interview details using correct field names
            const updateData = {
              fields: {
                'Interview date&time': interviewDateTime,
                'Interview Link': meetingLink || ''
              }
            };

            console.log(`📋 Updating Airtable with:`, JSON.stringify(updateData, null, 2));

            const updateResponse = await fetch(`${matchesUrl}/${recordId}`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(updateData)
            });

            if (updateResponse.ok) {
              console.log(`✅ Successfully updated Airtable platojobmatches record with interview details`);
            } else {
              const errorText = await updateResponse.text();
              console.error(`❌ Failed to update Airtable record: ${updateResponse.status} ${updateResponse.statusText} - ${errorText}`);
            }
          } else {
            console.log(`⚠️ No platojobmatches record found for User ID ${candidateId} and Job ID ${jobId}`);
          }
        } else {
          console.error(`❌ Failed to search Airtable records: ${searchResponse.status} ${searchResponse.statusText}`);
        }
      } catch (airtableError) {
        console.error('❌ Failed to update platojobmatches with interview details:', airtableError);
        // Don't fail the entire operation if Airtable update fails
      }

      res.json(interview);
    } catch (error) {
      console.error("Error creating interview:", error);
      res.status(500).json({ message: "Failed to create interview" });
    }
  });

  app.patch('/api/interviews/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);
      const interviewId = req.params.id;
      
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const { scheduledDate, scheduledTime, timeZone, interviewType, meetingLink, notes, status } = req.body;
      
      const { realInterviews } = await import('@shared/schema');
      const { eq, and } = await import('drizzle-orm');
      const { db } = await import('./db');
      
      const updateData: any = {
        updatedAt: new Date(),
      };
      
      if (scheduledDate !== undefined) updateData.scheduledDate = scheduledDate;
      if (scheduledTime !== undefined) updateData.scheduledTime = scheduledTime;
      if (timeZone !== undefined) updateData.timeZone = timeZone;
      if (interviewType !== undefined) updateData.interviewType = interviewType;
      if (meetingLink !== undefined) updateData.meetingLink = meetingLink;
      if (notes !== undefined) updateData.notes = notes;
      if (status !== undefined) updateData.status = status;

      // Ensure timezone has a default value if not provided
      if (timeZone === undefined && !updatedInterview?.timeZone) {
        updateData.timeZone = 'UTC';
      }

      console.log(`🔄 Updating interview ${interviewId} with data:`, updateData);
      
      const [updatedInterview] = await db.update(realInterviews)
        .set(updateData)
        .where(and(
          eq(realInterviews.id, interviewId),
          eq(realInterviews.organizationId, organization.id.toString())
        ))
        .returning();
      
      console.log(`✅ Interview updated successfully:`, updatedInterview);

      if (!updatedInterview) {
        return res.status(404).json({ message: "Interview not found" });
      }

      // Auto-update Airtable whenever any interview field is updated
      try {
        console.log('🔄 Auto-updating Airtable platojobmatches for interview changes...');
        
        const AIRTABLE_API_KEY = 'pat770a3TZsbDther.a2b72657b27da4390a5215e27f053a3f0a643d66b43168adb6817301ad5051c0';
        const MATCHES_BASE_ID = 'app1u4N2W46jD43mP';
        const matchesUrl = `https://api.airtable.com/v0/${MATCHES_BASE_ID}/Table%201`;
        
        // Search for the record using User ID and Job title
        const filterFormula = `AND({User ID}='${updatedInterview.candidateId}',{Job title}='${updatedInterview.jobTitle}')`;
        const searchUrl = `${matchesUrl}?filterByFormula=${encodeURIComponent(filterFormula)}`;
        
        console.log('🔍 Searching for Airtable record to update:', {
          userId: updatedInterview.candidateId,
          jobTitle: updatedInterview.jobTitle,
          filterFormula: filterFormula
        });
        
        const searchResponse = await fetch(searchUrl, {
          headers: {
            'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json'
          }
        });

        if (!searchResponse.ok) {
          const errorText = await searchResponse.text();
          console.error('❌ Failed to search Airtable for interview update:', searchResponse.status, searchResponse.statusText, errorText);
          throw new Error(`Failed to search Airtable: ${searchResponse.status} ${searchResponse.statusText}`);
        }

        const searchData = await searchResponse.json();
        console.log('🔍 Airtable search results:', JSON.stringify(searchData, null, 2));
        
        if (!searchData.records || searchData.records.length === 0) {
          console.error(`❌ No matching record found in Airtable for User ID "${updatedInterview.candidateId}" and Job title "${updatedInterview.jobTitle}"`);
          return; // Exit gracefully without failing the interview update
        }

        const recordId = searchData.records[0].id;
        console.log(`✅ Found matching Airtable record: ${recordId}`);
        
        // Format datetime with timezone for Airtable
        const interviewDateTime = updatedInterview.timeZone ? 
          `${updatedInterview.scheduledDate} at ${updatedInterview.scheduledTime} (${updatedInterview.timeZone})` : 
          `${updatedInterview.scheduledDate} at ${updatedInterview.scheduledTime}`;
        
        const airtableUpdateData = {
          fields: {
            'Interview date&time': interviewDateTime,
            'Interview Link': updatedInterview.meetingLink || ''
          }
        };

        console.log('📤 Updating Airtable record with:', JSON.stringify(airtableUpdateData, null, 2));

        const updateResponse = await fetch(`${matchesUrl}/${recordId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(airtableUpdateData)
        });

        if (!updateResponse.ok) {
          const errorText = await updateResponse.text();
          console.error('❌ Failed to update Airtable record:', updateResponse.status, updateResponse.statusText, errorText);
          throw new Error(`Failed to update Airtable record: ${updateResponse.status} ${updateResponse.statusText}`);
        }

        const updatedRecord = await updateResponse.json();
        console.log(`✅ Successfully updated Airtable platojobmatches record:`, JSON.stringify(updatedRecord, null, 2));
        
      } catch (airtableError) {
        console.error('❌ Failed to auto-update Airtable platojobmatches:', airtableError);
        // Don't fail the whole request if Airtable update fails, but log the error
      }

      res.json(updatedInterview);
    } catch (error) {
      console.error("❌ Error updating interview:", error);
      console.error("❌ Error stack:", error.stack);
      res.status(500).json({ message: "Failed to update interview" });
    }
  });

  app.delete('/api/interviews/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);
      const interviewId = req.params.id;
      
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const { realInterviews } = await import('@shared/schema');
      const { eq, and } = await import('drizzle-orm');
      const { db } = await import('./db');
      
      const [deletedInterview] = await db.delete(realInterviews)
        .where(and(
          eq(realInterviews.id, interviewId),
          eq(realInterviews.organizationId, organization.id.toString())
        ))
        .returning();

      if (!deletedInterview) {
        return res.status(404).json({ message: "Interview not found" });
      }

      // Auto-clear interview details from Airtable platojobmatches when interview is deleted
      try {
        console.log('🔄 Auto-clearing interview details from Airtable platojobmatches...');
        
        const AIRTABLE_API_KEY = 'pat770a3TZsbDther.a2b72657b27da4390a5215e27f053a3f0a643d66b43168adb6817301ad5051c0';
        const MATCHES_BASE_ID = 'app1u4N2W46jD43mP';
        const matchesUrl = `https://api.airtable.com/v0/${MATCHES_BASE_ID}/Table%201`;
        
        // Search for the record using candidateId and jobTitle
        const filterFormula = `AND({User ID}='${deletedInterview.candidateId}',{Job title}='${deletedInterview.jobTitle}')`;
        const searchUrl = `${matchesUrl}?filterByFormula=${encodeURIComponent(filterFormula)}`;
        
        console.log('🔍 Searching for Airtable record to clear interview details:', {
          userId: deletedInterview.candidateId,
          jobTitle: deletedInterview.jobTitle,
          filterFormula: filterFormula
        });
        
        const searchResponse = await fetch(searchUrl, {
          headers: {
            'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json'
          }
        });

        if (!searchResponse.ok) {
          const errorText = await searchResponse.text();
          console.error('❌ Failed to search Airtable for interview deletion:', searchResponse.status, searchResponse.statusText, errorText);
          throw new Error(`Failed to search Airtable: ${searchResponse.status} ${searchResponse.statusText}`);
        }

        const searchData = await searchResponse.json();
        console.log('🔍 Airtable search results for deletion:', JSON.stringify(searchData, null, 2));
        
        if (!searchData.records || searchData.records.length === 0) {
          console.log(`⚠️ No matching record found in platojobmatches for User ID "${deletedInterview.candidateId}" and Job title "${deletedInterview.jobTitle}"`);
          return; // Exit gracefully without failing the interview deletion
        }

        const recordId = searchData.records[0].id;
        console.log(`✅ Found matching Airtable record for deletion: ${recordId}`);
        
        // Clear interview fields in Airtable
        const clearData = {
          fields: {
            'Interview date&time': '',
            'Interview Link': ''
          }
        };

        console.log('📤 Clearing Airtable interview fields with:', JSON.stringify(clearData, null, 2));

        const updateResponse = await fetch(`${matchesUrl}/${recordId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(clearData)
        });

        if (!updateResponse.ok) {
          const errorText = await updateResponse.text();
          console.error(`❌ Failed to clear Airtable interview details: ${updateResponse.status} ${updateResponse.statusText} - ${errorText}`);
          throw new Error(`Failed to clear Airtable interview details: ${updateResponse.status} ${updateResponse.statusText}`);
        }

        const clearedRecord = await updateResponse.json();
        console.log(`✅ Successfully cleared interview details from Airtable platojobmatches:`, JSON.stringify(clearedRecord, null, 2));
        
      } catch (airtableError) {
        console.error('❌ Failed to auto-clear Airtable platojobmatches during interview deletion:', airtableError);
        // Don't fail the whole request if Airtable update fails, but log the error
      }

      res.json({ message: "Interview deleted successfully" });
    } catch (error) {
      console.error("Error deleting interview:", error);
      res.status(500).json({ message: "Failed to delete interview" });
    }
  });

  // Get accepted applicants for CreateInterviewModal (from platojobmatches table filtered by job ID)
  app.get('/api/accepted-applicants/:jobId', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);
      const jobId = req.params.jobId;
      
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Get accepted applicants from platojobmatches table filtered by Job ID and Company
      const AIRTABLE_API_KEY = 'pat770a3TZsbDther.a2b72657b27da4390a5215e27f053a3f0a643d66b43168adb6817301ad5051c0';
      const MATCHES_BASE_ID = 'app1u4N2W46jD43mP'; // Correct base ID for platojobmatches
      
      console.log(`🔍 Fetching accepted applicants from platojobmatches table for Job ID: ${jobId}, Organization: ${organization.companyName}`);
      console.log(`Using Airtable API Key: ${AIRTABLE_API_KEY.substring(0, 10)}...`);
      console.log(`Using Base ID: ${MATCHES_BASE_ID}`);
      const matchesUrl = `https://api.airtable.com/v0/${MATCHES_BASE_ID}/Table%201`;
      
      const filterFormula = `AND({Company name}='${organization.companyName}', {Job ID}='${jobId}')`;
      const fullUrl = `${matchesUrl}?filterByFormula=${encodeURIComponent(filterFormula)}`;
      console.log(`Making request to: ${fullUrl}`);
      console.log(`Filter formula: ${filterFormula}`);

      const response = await fetch(fullUrl, {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`Response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log(`Airtable error response:`, errorText);
        throw new Error(`Failed to fetch accepted applicants: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`✅ Found ${data.records.length} accepted applicants for Job ID ${jobId} in platojobmatches table`);

      // Transform to expected format for the interview modal
      const formattedApplicants = data.records.map((record: any) => ({
        id: record.fields['User ID'] || record.id,
        name: record.fields['Name'] || 'Unknown',
        jobTitle: record.fields['Job title'] || 'Unknown Position',
        userId: record.fields['User ID'] || record.id,
        jobId: record.fields['Job ID'] || '',
        email: record.fields['Email'] || '',
        airtableRecordId: record.id
      }));

      res.json(formattedApplicants);
    } catch (error) {
      console.error("Error fetching accepted applicants:", error);
      res.status(500).json({ message: "Failed to fetch accepted applicants" });
    }
  });

  // Test endpoint to add accepted applicants directly to platojobmatches for testing
  app.post('/api/test/add-accepted-applicant', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);
      
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const AIRTABLE_API_KEY = 'pat770a3TZsbDther.a2b72657b27da4390a5215e27f053a3f0a643d66b43168adb6817301ad5051c0';
      const MATCHES_BASE_ID = 'app1u4N2W46jD43mP'; // Correct base ID for platojobmatches  
      const matchesUrl = `https://api.airtable.com/v0/${MATCHES_BASE_ID}/Table%201`;
      
      // Get first active job to get the correct Job ID
      const activeJobs = await storage.getActiveJobPostings(userId);
      const firstJob = activeJobs[0];
      
      if (!firstJob) {
        return res.status(404).json({ message: "No active jobs found to test with" });
      }

      // Add a test accepted applicant to platojobmatches table
      const testMatch = {
        "Name": "Adam Elshanawany", 
        "User ID": "43108970",
        "Job title": firstJob.title,
        "Job description": firstJob.description,
        "Company name": organization.companyName,
        "Job ID": firstJob.id.toString()
      };

      const response = await fetch(matchesUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          records: [{
            fields: testMatch
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to add test match: ${response.status}`);
      }

      const data = await response.json();
      console.log(`✅ Added test accepted match: ${testMatch["Name"]}`);

      res.json({ 
        message: "Test accepted applicant added to platojobmatches successfully",
        recordId: data.records[0].id,
        match: testMatch
      });
    } catch (error) {
      console.error("Error adding test match:", error);
      res.status(500).json({ message: "Failed to add test match" });
    }
  });

  // Interview scheduling endpoint (removed duplicate - using the one at line 1501 instead)

  // Token-based invitation endpoints
  app.get('/api/invitations/public/:token', async (req: any, res) => {
    try {
      const { token } = req.params;
      const invitation = await storage.getInvitationByToken(token);
      
      if (!invitation || invitation.status !== 'pending' || invitation.expiresAt < new Date()) {
        return res.status(404).json({ message: "Invalid or expired invitation link" });
      }

      const organization = await storage.getOrganizationById(invitation.organizationId);
      
      res.json({
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          token: invitation.token,
          inviteCode: invitation.inviteCode,
          organization: organization ? {
            id: organization.id,
            companyName: organization.companyName,
            industry: organization.industry,
          } : null,
          expiresAt: invitation.expiresAt,
        }
      });

    } catch (error) {
      console.error("Error fetching invitation by token:", error);
      res.status(500).json({ message: "Failed to fetch invitation" });
    }
  });

  // Accept invitation using token (for URL-based invites)
  app.post('/api/invitations/accept', requireAuth, async (req: any, res) => {
    try {
      const { token, orgId, inviteCode } = req.body;
      const userId = req.user.id;
      
      let invitation;
      
      // Support multiple invitation types
      if (token) {
        invitation = await storage.getInvitationByToken(token);
      } else if (inviteCode) {
        invitation = await storage.getInvitationByCode(inviteCode);
        // If orgId is provided, validate it matches
        if (orgId && invitation && invitation.organizationId !== orgId) {
          return res.status(400).json({ message: "Organization ID does not match invite code" });
        }
      } else {
        return res.status(400).json({ message: "Either token or inviteCode is required" });
      }
      
      if (!invitation || invitation.status !== 'pending' || invitation.expiresAt < new Date()) {
        return res.status(404).json({ message: "Invalid or expired invitation" });
      }

      // Check if user is already a member of this organization
      const existingMember = await storage.getTeamMemberByUserAndOrg(userId, invitation.organizationId);
      if (existingMember) {
        return res.status(400).json({ message: "You are already a member of this organization" });
      }

      // Add user to organization
      await storage.addTeamMember({
        organizationId: invitation.organizationId,
        userId,
        role: invitation.role,
        joinedAt: new Date(),
      });

      // Mark invitation as accepted
      await storage.updateInvitationStatus(invitation.id, 'accepted');

      const organization = await storage.getOrganizationById(invitation.organizationId);
      
      console.log(`✅ User ${userId} joined organization ${invitation.organizationId} as ${invitation.role}`);

      res.json({
        message: `Successfully joined ${organization?.companyName}'s hiring team!`,
        organization: {
          id: organization?.id,
          companyName: organization?.companyName
        },
        role: invitation.role,
        newMember: true
      });

    } catch (error) {
      console.error("Error accepting invitation:", error);
      res.status(500).json({ message: "Failed to accept invitation" });
    }
  });

  // Accept invitation using invite code (specific endpoint as requested)
  app.post('/api/invitations/accept-code', requireAuth, async (req: any, res) => {
    try {
      const { orgId, inviteCode } = req.body;
      const userId = req.user.id;
      
      console.log(`🔄 Processing invite code acceptance: ${inviteCode} for user: ${userId} with org ID: ${orgId}`);
      
      // Validate required parameters
      if (!orgId || !inviteCode) {
        return res.status(400).json({ message: "Both orgId and inviteCode are required" });
      }
      
      // Convert orgId to number for comparison
      const organizationId = parseInt(orgId.toString(), 10);
      if (isNaN(organizationId)) {
        return res.status(400).json({ message: "Invalid organization ID format" });
      }
      
      // Find invitation by invite code
      const invitation = await storage.getInvitationByCode(inviteCode);
      
      if (!invitation) {
        console.log(`❌ Invalid invite code: ${inviteCode}`);
        return res.status(400).json({ message: "Invalid invite code" });
      }
      
      // Verify organization ID matches
      if (invitation.organizationId !== organizationId) {
        console.log(`❌ Organization ID mismatch: expected ${invitation.organizationId}, got ${organizationId}`);
        return res.status(400).json({ message: "Organization ID does not match invite code" });
      }
      
      // Check invitation status and expiry
      if (invitation.status !== 'pending') {
        console.log(`❌ Invite code already used: ${inviteCode}`);
        return res.status(400).json({ message: "Invite code has already been used" });
      }
      
      if (invitation.expiresAt < new Date()) {
        console.log(`❌ Invite code expired: ${inviteCode}`);
        return res.status(400).json({ message: "Invite code has expired" });
      }
      
      // Check if user is already a member
      const existingMember = await storage.getTeamMemberByUserAndOrg(userId, invitation.organizationId);
      if (existingMember) {
        console.log(`❌ User ${userId} already member of organization: ${orgId}`);
        return res.status(400).json({ message: "You are already a member of this organization" });
      }
      
      // Add user to organization
      await storage.addTeamMember({
        organizationId: invitation.organizationId,
        userId,
        role: invitation.role,
        joinedAt: new Date(),
      });
      
      // Mark invitation as accepted
      await storage.updateInvitationStatus(invitation.id, 'accepted');
      
      // Get organization details
      const organization = await storage.getOrganizationById(invitation.organizationId);
      
      console.log(`✅ Successfully accepted invite code: ${inviteCode} for user: ${userId}`);
      
      res.json({ 
        success: true,
        message: `Welcome to ${organization?.companyName}!`,
        organization: {
          id: organization?.id,
          companyName: organization?.companyName
        },
        role: invitation.role
      });
      
    } catch (error) {
      console.error("Error accepting invite code:", error);
      res.status(500).json({ message: "Failed to accept invitation" });
    }
  });

  // Magic link invitation acceptance endpoint
  app.post('/api/invitations/accept', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { token } = req.body;
      
      console.log(`🔗 Processing magic link invitation acceptance for user: ${userId}, token: ${token}`);
      
      if (!token) {
        console.log(`❌ No token provided in request body`);
        return res.status(400).json({ message: "Invitation token is required" });
      }
      
      // Find invitation by token
      console.log(`🔍 Looking up invitation by token: ${token}`);
      const invitation = await storage.getInvitationByToken(token);
      console.log(`📋 Database lookup result:`, invitation ? {
        id: invitation.id,
        email: invitation.email,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        organizationId: invitation.organizationId
      } : 'null');
      
      if (!invitation) {
        console.log(`❌ Invalid token: ${token}`);
        return res.status(404).json({ message: "Invalid or expired invitation token" });
      }
      
      // Check invitation status and expiry
      if (invitation.status !== 'pending') {
        console.log(`❌ Token already used: ${token}`);
        return res.status(400).json({ message: "Invitation has already been used" });
      }
      
      if (invitation.expiresAt < new Date()) {
        console.log(`❌ Token expired: ${token}`);
        return res.status(400).json({ message: "Invitation has expired" });
      }
      
      // Check if user is already a member
      const existingMember = await storage.getTeamMemberByUserAndOrg(userId, invitation.organizationId);
      if (existingMember) {
        console.log(`❌ User ${userId} already member of organization: ${invitation.organizationId}`);
        return res.status(400).json({ message: "You are already a member of this organization" });
      }
      
      // Add user to organization
      await storage.addTeamMember({
        organizationId: invitation.organizationId,
        userId,
        role: invitation.role,
        joinedAt: new Date(),
      });
      
      // Mark invitation as accepted
      await storage.updateInvitationStatus(invitation.id, 'accepted');
      
      // Get organization details
      const organization = await storage.getOrganizationById(invitation.organizationId);
      
      console.log(`✅ Successfully accepted magic link invitation: ${token} for user: ${userId}`);
      
      res.json({ 
        success: true,
        message: `Welcome to ${organization?.companyName}!`,
        organization: {
          id: organization?.id,
          companyName: organization?.companyName
        },
        role: invitation.role
      });
      
    } catch (error) {
      console.error("Error accepting magic link invitation:", error);
      res.status(500).json({ message: "Failed to accept invitation" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
