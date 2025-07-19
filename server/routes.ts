import type { Express } from "express";
import { createServer, type Server } from "http";
import fetch from "node-fetch";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertJobSchema, insertOrganizationSchema } from "@shared/schema";
import { generateJobDescription, generateJobRequirements, extractTechnicalSkills, generateCandidateMatchRating } from "./openai";
import { airtableMatchingService } from "./airtableMatchingService";
import { airtableService } from "./airtableService";
import { jobPostingsAirtableService } from "./jobPostingsAirtableService";
import { fullCleanup } from "./cleanupCandidates";
import { interviewQuestionsService } from "./interviewQuestionsService";
import { jobMatchesService } from "./jobMatchesAirtableService";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get user's organization
      const organization = await storage.getOrganizationByUser(userId);
      
      res.json({
        ...user,
        organization
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Organization routes
  app.post('/api/organizations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.post('/api/organizations/join', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.get('/api/organizations/current', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.get('/api/companies/team', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  // Job posting routes
  app.post('/api/job-postings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      
      // Automatically sync new job to Airtable (async, don't wait for completion)
      jobPostingsAirtableService.syncJobPostingsToAirtable()
        .catch(error => console.error("Error auto-syncing job to Airtable:", error));
      
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

  app.get('/api/job-postings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.get('/api/job-postings/count', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.put('/api/job-postings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const jobData = insertJobSchema.partial().parse(req.body);
      
      const job = await storage.updateJob(jobId, jobData);
      res.json(job);
    } catch (error) {
      console.error("Error updating job:", error);
      res.status(500).json({ message: "Failed to update job posting" });
    }
  });

  app.delete('/api/job-postings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
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
      
      // Delete from all Airtable tables (wait for completion to ensure it happens)
      try {
        console.log(`🚀 Starting Airtable cleanup for job ${jobId}...`);
        
        const { applicantsAirtableService } = await import('./applicantsAirtableService');
        const { airtableService } = await import('./airtableService');
        const { jobPostingsAirtableService } = await import('./jobPostingsAirtableService');
        
        // Delete applicants for this job
        await applicantsAirtableService.deleteApplicantsByJobId(jobId);
        console.log(`✅ Deleted applicants for job ${jobId} from Airtable`);
        
        // Delete job matches (platojobmatches table)
        await airtableService.deleteJobMatchesByJobId(jobId);
        console.log(`✅ Deleted job matches for job ${jobId} from Airtable`);
        
        // Delete job posting (platojobpostings table)
        await jobPostingsAirtableService.deleteJobPostingByJobId(jobId);
        console.log(`✅ Deleted job posting ${jobId} from platojobpostings table`);
        
        console.log(`🎉 Successfully deleted job ${jobId} from all Airtable tables`);
      } catch (airtableError) {
        console.error(`❌ Error deleting job ${jobId} from Airtable tables:`, airtableError);
        // Don't fail the request if Airtable cleanup fails - job is already deleted from database
      }
      
      res.json({ message: "Job deleted successfully" });
    } catch (error) {
      console.error("❌ Error deleting job:", error);
      res.status(500).json({ message: "Failed to delete job posting" });
    }
  });



  // Job postings sync to Airtable
  app.post('/api/job-postings/sync-to-airtable', isAuthenticated, async (req: any, res) => {
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
  app.get('/api/applicants/count', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.get('/api/candidates/count', isAuthenticated, async (req: any, res) => {
    try {
      const { airtableService } = await import('./airtableService');
      const candidates = await airtableService.getAllCandidates();
      
      // Only count candidates with scores > 85
      const highScoringCandidates = candidates.filter(candidate => 
        candidate.bestMatchJob && candidate.bestMatchJob.matchScore > 85
      );
      
      res.json({ count: highScoringCandidates.length });
    } catch (error) {
      console.error("Error counting candidates:", error);
      res.json({ count: 0 });
    }
  });

  // Real Applicants routes - from platojobapplications table
  app.get('/api/real-applicants/:jobId?', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

      // Score applicants using OpenAI
      if (applicants.length > 0) {
        console.log(`Scoring ${applicants.length} applicants...`);
        const scoringData = applicants
          .filter(app => app.userProfile && app.jobDescription)
          .map(app => ({
            id: app.id,
            userProfile: app.userProfile!,
            jobDescription: app.jobDescription
          }));
        
        if (scoringData.length > 0) {
          const scores = await applicantScoringService.batchScoreApplicants(scoringData);
          
          // Apply scores to applicants
          const scoresMap = new Map(scores.map(s => [s.applicantId, { score: s.score, summary: s.summary }]));
          applicants = applicants.map(app => ({
            ...app,
            matchScore: scoresMap.get(app.id)?.score || 0,
            matchSummary: scoresMap.get(app.id)?.summary || 'Unable to score'
          }));
        }
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
  app.get('/api/applicants', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.get('/api/applicants/:jobId', isAuthenticated, async (req: any, res) => {
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

  app.post('/api/applicants/:id/accept', isAuthenticated, async (req: any, res) => {
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

  app.post('/api/applicants/:id/decline', isAuthenticated, async (req: any, res) => {
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

  app.post('/api/applicants/:id/schedule-interview', isAuthenticated, async (req: any, res) => {
    try {
      const applicantId = req.params.id;
      const { jobId, scheduledDate, scheduledTime, interviewType, meetingLink, notes } = req.body;
      const userId = req.user.claims.sub;
      
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

  // AI-powered job content generation
  app.post('/api/ai/generate-description', isAuthenticated, async (req: any, res) => {
    try {
      const { jobTitle, companyName, location } = req.body;
      const description = await generateJobDescription(jobTitle, companyName, location);
      res.json({ description });
    } catch (error) {
      console.error("Error generating description:", error);
      res.status(500).json({ message: "Failed to generate job description" });
    }
  });

  app.post('/api/ai/generate-requirements', isAuthenticated, async (req: any, res) => {
    try {
      const { jobTitle, jobDescription } = req.body;
      const requirements = await generateJobRequirements(jobTitle, jobDescription);
      res.json({ requirements });
    } catch (error) {
      console.error("Error generating requirements:", error);
      res.status(500).json({ message: "Failed to generate job requirements" });
    }
  });

  app.post('/api/ai/extract-skills', isAuthenticated, async (req: any, res) => {
    try {
      const { jobTitle, jobDescription } = req.body;
      const skills = await extractTechnicalSkills(jobTitle, jobDescription || "");
      res.json({ skills });
    } catch (error) {
      console.error("Error extracting skills:", error);
      res.status(500).json({ message: "Failed to extract technical skills" });
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
  app.post('/api/real-applicants/:id/decline', isAuthenticated, async (req: any, res) => {
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
  app.post('/api/fix-recent-candidate-userid', isAuthenticated, async (req: any, res) => {
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
  app.post('/api/real-applicants/:id/undo-accept', isAuthenticated, async (req: any, res) => {
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
      const user = req.user.claims.sub;
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
  app.post('/api/ai/analyze-applicant-profile', isAuthenticated, async (req: any, res) => {
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
  app.get('/api/airtable/discover', isAuthenticated, async (req: any, res) => {
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
  app.get('/api/candidates', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
  app.get('/api/job-postings/:id/candidates', isAuthenticated, async (req: any, res) => {
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
  app.post('/api/job-postings/:jobId/candidates/:candidateId/accept', isAuthenticated, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const candidateId = req.params.candidateId;
      const userId = req.user.claims.sub;
      
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
  app.post('/api/job-postings/:jobId/candidates/:candidateId/decline', isAuthenticated, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const candidateId = req.params.candidateId;
      const userId = req.user.claims.sub;
      
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
  app.post('/api/job-postings/:jobId/candidates/:candidateId/schedule-interview', isAuthenticated, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const candidateId = req.params.candidateId;
      const userId = req.user.claims.sub;
      
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
  app.get('/api/job-postings/:id/interviews', isAuthenticated, async (req: any, res) => {
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
  app.get('/api/enhanced-candidates', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.get('/api/companies/matches', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
  app.post('/api/job-postings/:id/generate-matches', isAuthenticated, async (req: any, res) => {
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
  app.post('/api/format-profile', isAuthenticated, async (req: any, res) => {
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
  app.post('/api/cleanup-candidates', isAuthenticated, async (req: any, res) => {
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
  app.get('/api/interview-questions/jobs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.get('/api/interview-questions/:jobId', isAuthenticated, async (req: any, res) => {
    try {
      const jobId = req.params.jobId;
      const questions = await interviewQuestionsService.getInterviewQuestions(jobId);
      res.json({ questions });
    } catch (error) {
      console.error("Error fetching interview questions:", error);
      res.status(500).json({ message: "Failed to fetch interview questions" });
    }
  });

  app.put('/api/interview-questions/:jobId', isAuthenticated, async (req: any, res) => {
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
  app.post('/api/real-applicants/:id/accept', isAuthenticated, async (req: any, res) => {
    try {
      const applicantId = req.params.id;
      const userId = req.user.claims.sub;
      const { realApplicantsAirtableService } = await import('./realApplicantsAirtableService');
      
      console.log(`Accepting applicant ${applicantId}...`);
      
      // Get applicant details first
      const allApplicants = await realApplicantsAirtableService.getAllApplicants();
      const applicant = allApplicants.find(app => app.id === applicantId);
      
      if (!applicant) {
        return res.status(404).json({ message: "Applicant not found" });
      }

      // Get organization for company name
      const organization = await storage.getOrganizationByUser(userId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Create job match record
      await jobMatchesAirtableService.createJobMatch(
        applicant.name,
        applicant.userId || applicant.id, // Use userId if available, otherwise use record ID
        applicant.jobTitle,
        applicant.jobDescription || '',
        organization.companyName
      );

      console.log(`✅ Successfully accepted applicant ${applicant.name} and created job match`);
      res.json({ 
        success: true, 
        message: "Applicant accepted and job match created",
        applicant 
      });
    } catch (error) {
      console.error("Error accepting real applicant:", error);
      res.status(500).json({ message: "Failed to accept applicant" });
    }
  });

  app.post('/api/real-applicants/:id/decline', isAuthenticated, async (req: any, res) => {
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

  // Interview Management Endpoints
  app.get('/api/interviews', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.post('/api/interviews', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.patch('/api/interviews/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

      // Update Airtable if date/time, timezone, or meeting link changed
      if (scheduledDate !== undefined || scheduledTime !== undefined || timeZone !== undefined || meetingLink !== undefined) {
        try {
          console.log('🔄 Updating Airtable record for interview changes...');
          
          const AIRTABLE_API_KEY = 'pat770a3TZsbDther.a2b72657b27da4390a5215e27f053a3f0a643d66b43168adb6817301ad5051c0';
          const MATCHES_BASE_ID = 'app1u4N2W46jD43mP';
          const matchesUrl = `https://api.airtable.com/v0/${MATCHES_BASE_ID}/platojobmatches`;
          
          // Search for the record using User ID and Job title (as shown in JobMatchesAirtableService)
          const filterFormula = `AND({User ID}='${updatedInterview.candidateId}',{Job title}='${updatedInterview.jobTitle}')`;
          const searchUrl = `${matchesUrl}?filterByFormula=${encodeURIComponent(filterFormula)}`;
          
          console.log('🔍 Searching for Airtable record with:', {
            userId: updatedInterview.candidateId,
            jobTitle: updatedInterview.jobTitle,
            searchUrl: searchUrl
          });
          
          const searchResponse = await fetch(searchUrl, {
            headers: {
              'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
              'Content-Type': 'application/json'
            }
          });

          if (!searchResponse.ok) {
            const errorText = await searchResponse.text();
            console.error('❌ Failed to search Airtable:', searchResponse.status, searchResponse.statusText, errorText);
            throw new Error(`Failed to search platojobmatches: ${searchResponse.status} ${searchResponse.statusText}`);
          }

          const searchData = await searchResponse.json();
          console.log('🔍 Airtable search results:', searchData);
          
          if (!searchData.records || searchData.records.length === 0) {
            console.error(`❌ No matching record found in platojobmatches for User ID "${updatedInterview.candidateId}" and Job title "${updatedInterview.jobTitle}"`);
            throw new Error(`No matching record found for User ID "${updatedInterview.candidateId}" and Job title "${updatedInterview.jobTitle}"`);
          }

          const recordId = searchData.records[0].id;
          console.log(`✅ Found matching record: ${recordId}`);
          
          // Format datetime properly for Airtable
          const interviewDateTime = `${updatedInterview.scheduledDate} at ${updatedInterview.scheduledTime} (${updatedInterview.timeZone || 'UTC'})`;
          
          const airtableUpdateData = {
            fields: {
              'Interview date&time': interviewDateTime,
              'Interview Link': updatedInterview.meetingLink || ''
            }
          };

          console.log('📤 Updating Airtable record with:', airtableUpdateData);

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
          console.log(`✅ Successfully updated Airtable record:`, updatedRecord);
          
        } catch (airtableError) {
          console.error('❌ Failed to update Airtable with interview changes:', airtableError);
          // Don't fail the whole request if Airtable update fails, but log the error
        }
      }

      res.json(updatedInterview);
    } catch (error) {
      console.error("❌ Error updating interview:", error);
      console.error("❌ Error stack:", error.stack);
      res.status(500).json({ message: "Failed to update interview" });
    }
  });

  app.delete('/api/interviews/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

      res.json({ message: "Interview deleted successfully" });
    } catch (error) {
      console.error("Error deleting interview:", error);
      res.status(500).json({ message: "Failed to delete interview" });
    }
  });

  // Get accepted applicants for CreateInterviewModal (from platojobmatches table filtered by job ID)
  app.get('/api/accepted-applicants/:jobId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
  app.post('/api/test/add-accepted-applicant', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  const httpServer = createServer(app);
  return httpServer;
}
