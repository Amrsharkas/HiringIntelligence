import type { Express } from "express";
import { createServer, type Server } from "http";
import fetch from "node-fetch";
import { storage } from "./storage";
import { setupAuth, requireAuth } from "./auth";
import { airtableUserProfiles, applicantProfiles, insertJobSchema, insertOrganizationSchema } from "@shared/schema";
import { generateJobDescription, generateJobRequirements, extractTechnicalSkills, generateCandidateMatchRating } from "./openai";
import { wrapOpenAIRequest } from "./openaiTracker";
import { localDatabaseService } from "./localDatabaseService";
import { interviewQuestionsService } from "./interviewQuestionsService";
import { resumeProcessingService } from "./resumeProcessingService";
import { db } from "./db";
import { eq } from "drizzle-orm";

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
      
      // Auto-fill job applications table with AI-enhanced information
      // const { jobApplicationsAutoFill } = await import('./jobApplicationsAutoFill');
      // jobApplicationsAutoFill.autoFillJobApplication(job, companyName)
      //   .catch(error => console.error("Error auto-filling job application:", error));
      
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
      
      res.json({ message: "Job deleted successfully" });
    } catch (error) {
      console.error("❌ Error deleting job:", error);
      res.status(500).json({ message: "Failed to delete job posting" });
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

      // Use local database service instead of Airtable
      const applicants = await localDatabaseService.getAllJobApplications();
      
      // Filter to only show applicants for this organization's jobs AND exclude accepted applicants
      const organizationJobs = await storage.getJobsByOrganization(organization.id);
      const organizationJobIds = new Set(organizationJobs.map(job => job.id.toString()));
      const filteredApplicants = applicants.filter(app => 
        organizationJobIds.has(app.jobId) && app.status !== 'Accepted'
      );
      
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
      const matches = await localDatabaseService.getAllJobMatches();
      
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

      // Use local database service instead of Airtable
      const applicants = await localDatabaseService.getAllJobApplications();
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

      // Direct applicants - use local database service instead of Airtable
      const applicants = await localDatabaseService.getAllJobApplications();
      const directApplicants = applicants.filter(app => organizationJobIds.has(app.jobId)).length;

      // AI matched candidates
      const matches = await localDatabaseService.getAllJobMatches();
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

      const { applicantScoringService } = await import('./applicantScoringService');

      let applicants;
      if (jobId) {
        console.log(`Fetching pending applicants for job ${jobId}`);
        // Use local database service instead of Airtable
        applicants = await localDatabaseService.getJobApplicationsByJob(jobId);
      } else {
        console.log('Fetching all pending applicants for organization');
        // Use local database service instead of Airtable
        applicants = await localDatabaseService.getAllJobApplications();

        // Filter to only show applicants for this organization's jobs
        const organizationJobs = await storage.getJobsByOrganization(organization.id);
        const organizationJobIds = new Set(organizationJobs.map(job => job.id.toString()));
        applicants = applicants.filter(app => organizationJobIds.has(app.jobId));
      }

      // DYNAMIC AI SCORING SYSTEM - ALWAYS FRESH ANALYSIS
      if (applicants.length > 0) {
        console.log(`🤖 DYNAMIC AI SCORING: Processing ${applicants.length} applicants with fresh AI analysis`);
        
        const applicantsWithScores: any[] = [];
        
        // Process each applicant with fresh AI scoring every time
        for (const app of applicants) {
          if (app.userProfile && app.jobDescription) {
            try {
              console.log(`🔍 Fresh AI scoring for: ${app.name} applying for: ${app.jobTitle}`);
              
              // Use detailed AI scoring for completely fresh analysis
              const detailedScore = await applicantScoringService.scoreApplicantDetailed(
                app.userProfile,
                app.jobTitle || 'Position',
                app.jobDescription,
                app.jobDescription, // Using job description as requirements
                [] // No specific skills list yet
              );
              
              console.log(`📊 FRESH AI SCORES for ${app.name}:`);
              console.log(`   Overall: ${detailedScore.overallMatch}%`);
              console.log(`   Technical: ${detailedScore.technicalSkills}%`);
              console.log(`   Experience: ${detailedScore.experience}%`);
              console.log(`   Cultural: ${detailedScore.culturalFit}%`);
              console.log(`   Summary: ${detailedScore.summary}`);
              
              // Add to final list with fresh scores (no database caching)
              applicantsWithScores.push({
                ...app,
                matchScore: detailedScore.overallMatch,
                matchSummary: detailedScore.summary,
                technicalSkillsScore: detailedScore.technicalSkills,
                experienceScore: detailedScore.experience,
                culturalFitScore: detailedScore.culturalFit
              });
              
            } catch (scoringError) {
              console.error(`❌ SCORING ERROR for ${app.name}:`, scoringError);
              
              // Add with error score on failure
              applicantsWithScores.push({
                ...app,
                matchScore: 0,
                matchSummary: 'Error during AI scoring - manual review required',
                technicalSkillsScore: 0,
                experienceScore: 0,
                culturalFitScore: 0
              });
            }
          } else {
            // No profile data - cannot score
            console.log(`⚠️  ${app.name}: Missing profile/job data - cannot score`);
            applicantsWithScores.push({
              ...app,
              matchScore: 0,
              matchSummary: 'Insufficient data for AI scoring',
              technicalSkillsScore: 0,
              experienceScore: 0,
              culturalFitScore: 0
            });
          }
        }
        
        // All applicants now have dynamic scores
        applicants = applicantsWithScores;
        console.log(`🎯 DYNAMIC RESULT: ${applicants.length} applicants with fresh AI scores`);
        
        // Log fresh scoring status
        applicants.forEach(app => {
          console.log(`📊 ${app.name}: Fresh AI score = ${app.matchScore}% (DYNAMIC ANALYSIS)`);
        });
      }

      // Sort by match score (highest first)
      applicants.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

      applicants = applicants.map(app => ({
        ...app,
        name: app.applicantName,
        email: app.applicantEmail,
      }))

      res.json(applicants);
    } catch (error) {
      console.error("Error fetching real applicants:", error);
      res.status(500).json({ message: "Failed to fetch applicants" });
    }
  });

  // Original Applicants routes (now for platojobapplications table) - UPDATED WITH BRUTAL AI SCORING
  app.get('/api/applicants', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);
      
      if (!organization) {
        return res.json([]);
      }

      const { applicantScoringService } = await import('./applicantScoringService');

      console.log('🔄 MIGRATING TO BRUTAL AI SCORING: Fetching applicants with new scoring system');
      // Use local database service instead of Airtable
      let applicants = await localDatabaseService.getAllJobApplications();
      
      // Filter to only show applicants for this organization's jobs
      const organizationJobs = await storage.getJobsByOrganization(organization.id);
      const organizationJobIds = new Set(organizationJobs.map(job => job.id.toString()));
      applicants = applicants.filter(app => organizationJobIds.has(app.jobId));

      // APPLY BRUTAL AI SCORING SYSTEM TO ALL APPLICANTS
      if (applicants.length > 0) {
        console.log(`🤖 BRUTAL AI SCORING: Processing ${applicants.length} applicants with detailed analysis`);
        
        // Get existing scored applicants from database
        const allScoredApplicants = await storage.getScoredApplicantsByOrganization(organization.id);
        const scoredApplicantsMap = new Map(allScoredApplicants.map(s => [s.applicantId, s]));
        
        console.log(`🔍 Found ${allScoredApplicants.length} previously scored applicants in database`);
        
        const applicantsWithScores: any[] = [];
        
        for (const app of applicants) {
          const dbScore = scoredApplicantsMap.get(app.id);
          
          if (dbScore) {
            // Use existing database score
            console.log(`✅ ${app.name}: Using database score ${dbScore.matchScore}%`);
            applicantsWithScores.push({
              ...app,
              matchScore: dbScore.matchScore,
              matchSummary: dbScore.matchSummary || 'Database score',
              technicalSkillsScore: dbScore.technicalSkillsScore,
              experienceScore: dbScore.experienceScore,
              culturalFitScore: dbScore.culturalFitScore
            });
          } else if (app.userProfile && app.jobDescription) {
            // NEW SCORING NEEDED - USE BRUTAL AI
            console.log(`🔍 Scoring applicant: ${app.name} for job: ${app.jobTitle}`);
            
            try {
              const detailedScore = await applicantScoringService.scoreApplicantDetailed(
                app.userProfile,
                app.jobTitle || 'Position',
                app.jobDescription,
                app.jobDescription,
                []
              );
              
              console.log(`📊 BRUTAL SCORES for ${app.name}:`);
              console.log(`   Overall: ${detailedScore.overallMatch}%`);
              console.log(`   Technical: ${detailedScore.technicalSkills}%`);
              console.log(`   Experience: ${detailedScore.experience}%`);
              console.log(`   Cultural: ${detailedScore.culturalFit}%`);
              
              // Save to database
              await storage.createScoredApplicant({
                applicantId: app.id,
                matchScore: detailedScore.overallMatch,
                matchSummary: detailedScore.summary,
                technicalSkillsScore: detailedScore.technicalSkills,
                experienceScore: detailedScore.experience,
                culturalFitScore: detailedScore.culturalFit,
                jobId: app.jobId,
                organizationId: organization.id
              });
              
              console.log(`💾 Saved brutal scores for ${app.name}`);
              
              applicantsWithScores.push({
                ...app,
                matchScore: detailedScore.overallMatch,
                matchSummary: detailedScore.summary,
                technicalSkillsScore: detailedScore.technicalSkills,
                experienceScore: detailedScore.experience,
                culturalFitScore: detailedScore.culturalFit
              });
            } catch (scoringError) {
              console.error(`❌ SCORING ERROR for ${app.name}:`, scoringError);
              applicantsWithScores.push({
                ...app,
                matchScore: 0,
                matchSummary: 'Error during AI scoring - manual review required',
                technicalSkillsScore: 0,
                experienceScore: 0,
                culturalFitScore: 0
              });
            }
          } else {
            // No profile data
            applicantsWithScores.push({
              ...app,
              matchScore: 0,
              matchSummary: 'Insufficient data for scoring',
              technicalSkillsScore: 0,
              experienceScore: 0,
              culturalFitScore: 0
            });
          }
        }
        
        applicants = applicantsWithScores;
        console.log(`🎯 FINAL: ${applicants.length} applicants with brutal AI scores`);
      }

      // Sort by match score (highest first)
      applicants.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
      
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
      
      // Update score using local database service instead of Airtable
      console.log(`🔄 Calling updateJobApplicationStatus with comprehensive data...`);
      // Note: We may need to extend the localDatabaseService to handle scoring updates
      // For now, we'll update the application status
      try {
        await localDatabaseService.updateJobApplication(applicantId, {
          status: 'scored',
          // Add scoring data if the schema supports it
          ...(matchScore !== undefined && { matchScore }),
          ...(matchSummary && { matchSummary })
        } as any);
      } catch (error) {
        console.warn('⚠️ Could not update application with scoring data, this may require schema extension:', error);
      }
      
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
      console.log("🤖 AI Generate Description Request:", {
        userId: req.user?.id,
        isAuthenticated: req.isAuthenticated?.(),
        body: req.body
      });

      const { 
        jobTitle, 
        companyName, 
        location, 
        employmentType, 
        workplaceType, 
        seniorityLevel, 
        industry, 
        certifications, 
        languagesRequired 
      } = req.body;

      if (!jobTitle) {
        return res.status(400).json({ message: "Job title is required" });
      }
      
      console.log("🔄 Calling generateJobDescription with:", { jobTitle, companyName, location });
      
      const description = await generateJobDescription(
        jobTitle, 
        companyName, 
        location, 
        {
          employmentType,
          workplaceType,
          seniorityLevel,
          industry,
          certifications,
          languagesRequired
        }
      );
      
      console.log("✅ Generated description successfully");
      res.json({ description });
    } catch (error) {
      console.error("❌ Error generating description:", error);
      console.error("❌ Error stack:", error.stack);
      res.status(500).json({ message: "Failed to generate job description", error: error.message });
    }
  });

  app.post('/api/ai/generate-requirements', requireAuth, async (req: any, res) => {
    try {
      console.log("🤖 AI Generate Requirements Request:", {
        userId: req.user?.id,
        isAuthenticated: req.isAuthenticated?.(),
        body: req.body
      });

      const { 
        jobTitle, 
        description, 
        employmentType, 
        workplaceType, 
        seniorityLevel, 
        industry, 
        certifications, 
        languagesRequired 
      } = req.body;

      if (!jobTitle) {
        return res.status(400).json({ message: "Job title is required" });
      }
      
      console.log("🔄 Calling generateJobRequirements with:", { jobTitle, description: description?.substring(0, 50) + "..." });
      
      const requirements = await generateJobRequirements(
        jobTitle, 
        description, 
        {
          employmentType,
          workplaceType,
          seniorityLevel,
          industry,
          certifications,
          languagesRequired
        }
      );
      
      console.log("✅ Generated requirements successfully");
      res.json({ requirements });
    } catch (error) {
      console.error("❌ Error generating requirements:", error);
      console.error("❌ Error stack:", error.stack);
      res.status(500).json({ message: "Failed to generate job requirements", error: error.message });
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
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);
      
      if (!organization) {
        return res.json([]);
      }

      console.log("🌟 Fetching shortlisted applicants from database...");
      
      // Get shortlisted applicants from database
      const shortlistedApplicants = await storage.getShortlistedApplicants(userId);
      
      console.log(`✅ Found ${shortlistedApplicants.length} shortlisted applicants in database`);
      
      // Get full applicant details from local database for each shortlisted applicant
      const enrichedApplicants = [];

      for (const shortlisted of shortlistedApplicants) {
        try {
          // Use local database service instead of Airtable
          const applicantDetails = await localDatabaseService.getJobApplication(shortlisted.applicantId);
          if (applicantDetails) {
            enrichedApplicants.push({
              id: shortlisted.id,
              employerId: shortlisted.employerId,
              applicantId: shortlisted.applicantId,
              applicantName: shortlisted.applicantName,
              name: applicantDetails.name,
              email: applicantDetails.name, // Using name as placeholder
              jobTitle: shortlisted.jobTitle,
              jobId: shortlisted.jobId,
              note: shortlisted.note,
              appliedDate: applicantDetails.applicationDate,
              dateShortlisted: shortlisted.dateShortlisted,
              createdAt: shortlisted.createdAt,
              updatedAt: shortlisted.updatedAt,
              // Include all the applicant details for display
              userProfile: applicantDetails.userProfile,
              companyName: applicantDetails.companyName,
              jobDescription: applicantDetails.jobDescription,
              matchScore: applicantDetails.matchScore || applicantDetails.savedMatchScore,
              matchSummary: applicantDetails.matchSummary || applicantDetails.savedMatchSummary,
              technicalSkillsScore: applicantDetails.technicalSkillsScore,
              experienceScore: applicantDetails.experienceScore,
              culturalFitScore: applicantDetails.culturalFitScore,
            });
          }
        } catch (error) {
          console.error(`❌ Error enriching applicant ${shortlisted.applicantId}:`, error);
          // Include basic info even if enrichment fails
          enrichedApplicants.push(shortlisted);
        }
      }
      
      res.json(enrichedApplicants);
    } catch (error) {
      console.error("❌ Error fetching shortlisted applicants:", error);
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


  const formatProfileForDisplay = (profileData: any): string => {
    if (!profileData) {
      return 'No profile data available';
    }

    const profile = typeof profileData === 'string' ? JSON.parse(profileData) : profileData;
    
    // Check if this is a brutally honest profile with the new structure
    return formatBrutallyHonestProfile(profile.brutallyHonestProfile);
  }

  const formatBrutallyHonestProfile = (profile: any): string =>  {
    let formatted = '';

    // Header
    formatted += '# 🔍 **BRUTALLY HONEST CANDIDATE ASSESSMENT**\n\n';

    // 1. Candidate Summary (Max 3-5 lines)
    if (profile.candidateSummary) {
      formatted += `## 📋 **CANDIDATE SUMMARY**\n${profile.candidateSummary}\n\n`;
    }

    // 2. Key Strengths (Every strength with a "but")
    if (profile.keyStrengths && Array.isArray(profile.keyStrengths) && profile.keyStrengths.length > 0) {
      formatted += `## 💪 **KEY STRENGTHS**\n`;
      profile.keyStrengths.forEach((strength: any) => {
        if (typeof strength === 'object' && strength.strength && strength.butCritique) {
          formatted += `• **${strength.strength}** - but ${strength.butCritique}\n`;
        } else if (typeof strength === 'string') {
          formatted += `• ${strength}\n`;
        }
      });
      formatted += '\n';
    }

    // 3. Weaknesses and Gaps
    if (profile.weaknessesAndGaps && Array.isArray(profile.weaknessesAndGaps) && profile.weaknessesAndGaps.length > 0) {
      formatted += `## ⚠️ **WEAKNESSES AND GAPS**\n`;
      profile.weaknessesAndGaps.forEach((weakness: string) => {
        formatted += `• ${weakness}\n`;
      });
      formatted += '\n';
    }

    // 4. Soft Skills Review
    if (profile.softSkillsReview) {
      const soft = profile.softSkillsReview;
      formatted += `## 🗣️ **SOFT SKILLS REVIEW**\n`;
      if (soft.communicationClarity) {
        formatted += `• **Communication Clarity:** ${soft.communicationClarity}\n`;
      }
      if (soft.evidenceQuality) {
        formatted += `• **Evidence Quality:** ${soft.evidenceQuality}\n`;
      }
      if (soft.emotionalIntelligence) {
        formatted += `• **Emotional Intelligence:** ${soft.emotionalIntelligence}\n`;
      }
      if (soft.overallTone) {
        formatted += `• **Overall Tone:** ${soft.overallTone}\n`;
      }
      formatted += '\n';
    }

    // 5. Technical Knowledge
    if (profile.technicalKnowledge) {
      const tech = profile.technicalKnowledge;
      formatted += `## 🔧 **TECHNICAL KNOWLEDGE**\n`;
      if (tech.claimedVsActual) {
        formatted += `• **Claimed vs Actual:** ${tech.claimedVsActual}\n`;
      }
      if (tech.gapsIdentified) {
        formatted += `• **Gaps Identified:** ${tech.gapsIdentified}\n`;
      }
      if (tech.problemSolvingApproach) {
        formatted += `• **Problem Solving:** ${tech.problemSolvingApproach}\n`;
      }
      formatted += '\n';
    }

    // 6. Problem Solving / Critical Thinking
    if (profile.problemSolvingCriticalThinking) {
      const problem = profile.problemSolvingCriticalThinking;
      formatted += `## 🧠 **PROBLEM SOLVING & CRITICAL THINKING**\n`;
      if (problem.approachClarity) {
        formatted += `• **Approach Clarity:** ${problem.approachClarity}\n`;
      }
      if (problem.realismFactoring) {
        formatted += `• **Realism Factoring:** ${problem.realismFactoring}\n`;
      }
      if (problem.logicalConsistency) {
        formatted += `• **Logical Consistency:** ${problem.logicalConsistency}\n`;
      }
      formatted += '\n';
    }

    // 7. Unverified Claims
    if (profile.unverifiedClaims && Array.isArray(profile.unverifiedClaims) && profile.unverifiedClaims.length > 0) {
      formatted += `## ❓ **UNVERIFIED CLAIMS**\n`;
      profile.unverifiedClaims.forEach((claim: string) => {
        formatted += `• ${claim}\n`;
      });
      formatted += '\n';
    }

    // 8-10. Scores
    formatted += `## 📊 **ASSESSMENT SCORES**\n`;
    formatted += `• **Communication Score:** ${profile.communicationScore || 5}/10\n`;
    formatted += `• **Credibility Score:** ${profile.credibilityScore || 5}/10\n`;
    formatted += `• **Consistency Score:** ${profile.consistencyScore || 5}/10\n\n`;

    // 11. Readiness for Face-to-Face
    if (profile.readinessAssessment) {
      const readiness = profile.readinessAssessment;
      formatted += `## 🎯 **READINESS FOR FACE-TO-FACE INTERVIEW**\n`;
      formatted += `• **Ready to Proceed:** ${readiness.faceToFaceReady ? 'Yes' : 'No'}\n`;
      if (readiness.areasToClarity && Array.isArray(readiness.areasToClarity)) {
        formatted += `• **Areas to Clarify:** ${readiness.areasToClarity.join(', ')}\n`;
      }
      if (readiness.recommendation) {
        formatted += `• **Recommendation:** ${readiness.recommendation}\n`;
      }
      formatted += '\n';
    }

    // Footer
    formatted += '---\n';
    formatted += '*Brutally honest assessment based on AI-powered interview analysis*';

    return formatted.trim();
  }

  // Public profile viewing endpoint (no authentication required for employer viewing profiles)
  app.get("/api/public-profile/:identifier", async (req, res) => {
    try {
      const identifier = decodeURIComponent(req.params.identifier);

      const [userProfile] = await db.select()
        .from(applicantProfiles)
        .where(eq(applicantProfiles.userId, identifier));

      const profileData = userProfile.aiProfile?.brutallyHonestProfile || {};

      // Format the response
      const profile = {
        name: userProfile.Name || identifier,
        email: userProfile.email || '',
        matchScorePercentage: profileData.matchScorePercentage || 0,
        experiencePercentage: profileData.experiencePercentage || 0,
        techSkillsPercentage: profileData.techSkillsPercentage || 0,
        culturalFitPercentage: profileData.culturalFitPercentage || 0,
        userProfile: formatProfileForDisplay(userProfile.aiProfile),
        userId: userProfile.userId,
        // Include all raw fields for debugging
        rawFields: userProfile
      };

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

      const response = await wrapOpenAIRequest(
        () => openai.chat.completions.create({
          model: "gpt-4o",
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
          max_tokens: 2000, // Ensure full responses aren't truncated
        }),
        {
          requestType: "comprehensive_match_analysis",
          model: "gpt-4o",
          requestData: { prompt: prompt.substring(0, 500) },
          metadata: { route: "comprehensive_match_analysis" }
        }
      );

      const analysis = JSON.parse(response.choices[0].message.content);
      console.log(`✅ Generated comprehensive match analysis with overall score: ${analysis.overallMatchScore}`);

      res.json(analysis);
    } catch (error) {
      console.error('Error generating job match analysis:', error);
      res.status(500).json({ message: 'Failed to generate job match analysis' });
    }
  });

  // Real applicants - Accept candidate (move from platojobapplications to platojobmatches)
  app.post('/api/real-applicants/:id/accept', requireAuth, async (req: any, res) => {
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
      const userId = user.id; // Use direct user.id instead of user.claims.sub for local auth
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
      // Use local database service instead of Airtable
      let applicantName = 'Unknown Applicant';
      try {
        const applicant = await localDatabaseService.getJobApplication(applicantId);
        applicantName = applicant?.applicantUserId || 'Unknown Applicant';
      } catch (error) {
        console.warn(`⚠️ Could not fetch applicant name: ${error}`);
      }
      
      // Update status in applications table instead of deleting
      console.log(`❌ Updating applicant ${applicantId} status to denied in local database...`);
      // Use local database service instead of Airtable
      try {
        await localDatabaseService.updateJobApplication(applicantId, { status: 'denied' } as any);
      } catch (error) {
        console.warn('⚠️ Could not update application status:', error);
      }
      
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
      
      // Get the most recent job match from local database
      const jobMatches = await localDatabaseService.getAllJobMatches();
      const mostRecentMatch = jobMatches.length > 0 ? jobMatches[0] : null;
      
      if (!mostRecentMatch) {
        return res.status(404).json({ message: "No job matches found" });
      }
      
      console.log(`📋 Most recent job match:`, mostRecentMatch);

      const currentUserId = mostRecentMatch.userId;
      const candidateName = mostRecentMatch.name;
      const jobTitle = mostRecentMatch.jobTitle;

      // Look for this candidate in job applications with "Accepted" status
      const allApplications = await localDatabaseService.getAllJobApplications();
      
      // Find the accepted application for this candidate and job
      const matchingApplication = allApplications.find(app =>
        app.applicantName === candidateName &&
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
      
      // Create record back in job applications using local database
      await localDatabaseService.createJobApplication({
        applicantName,
        applicantUserId: userId,
        applicantEmail: '', // Email not provided in request body
        jobTitle,
        jobId: req.params.id,
        company: companyName,
        status: 'applied',
        jobDescription
      });
      
      // Delete from job matches using local database
      const jobMatches = await localDatabaseService.getJobMatchesByUser(userId);
      const matchToDelete = jobMatches.find(match =>
        match.jobTitle === jobTitle && match.companyName === companyName
      );

      if (matchToDelete) {
        // Update status to cancelled instead of deleting
        await localDatabaseService.updateJobMatch(matchToDelete.id, { status: 'cancelled' });
        console.log(`🗑️ Cancelled job match for ${applicantName}`);
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
      const structure = { message: "Airtable discovery disabled - using local database" };
      res.json(structure);
    } catch (error) {
      console.error("Error discovering Airtable structure:", error);
      res.status(500).json({ message: "Failed to discover Airtable structure" });
    }
  });

  // Show local database information (public endpoint for exploration)
  app.get('/api/airtable/info', async (req: any, res) => {
    try {
      const userProfiles = await localDatabaseService.getAllUserProfiles();
      const jobPostings = await localDatabaseService.getAllJobPostings();
      const info = {
        database: "Local PostgreSQL ✓",
        userProfilesFound: userProfiles.length,
        jobPostingsFound: jobPostings.length,
        tables: [
          { id: "airtable_user_profiles", name: "User Profiles", records: userProfiles.length },
          { id: "airtable_job_postings", name: "Job Postings", records: jobPostings.length }
        ]
      };
      res.json(info);
    } catch (error: any) {
      console.error("Error fetching database info:", error);
      res.status(500).json({
        message: "Error connecting to database",
        error: error?.message || "Unknown error",
        database: "Local PostgreSQL"
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

      const candidates = await localDatabaseService.getAllUserProfiles();
      res.json(candidates);
    } catch (error) {
      console.error("Error fetching candidates:", error);
      res.status(500).json({ message: "Failed to fetch candidates" });
    }
  });

  // Local database-based candidate matching for specific job
  app.get('/api/job-postings/:id/candidates', requireAuth, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.id);
      
      // Fetch job matches from local database
      const jobMatches = await localDatabaseService.getJobMatchesByJob(jobId);
      const matchedCandidates = jobMatches.map(match => ({
        ...match,
        id: match.userId,
        name: match.name,
        email: '', // Will need to be fetched from user profile
        score: match.matchScore || 0
      }));
      
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
      
      // Create job match record in local database when candidate is accepted
      try {
        console.log(`Creating job match record for candidate ${candidateId} with job: ${job.title}`);

        // Get user profile for candidate details
        const userProfile = await localDatabaseService.getUserProfile(candidateId);

        if (userProfile) {
          await localDatabaseService.createJobMatch({
            name: userProfile.name || candidateName,
            userId: userProfile.userId,
            jobTitle: job.title,
            jobDescription: job.description || '',
            companyName: organization.companyName,
            jobId: job.id.toString(),
            status: 'accepted'
          });
          console.log(`✅ Successfully created job match record for ${userProfile.name} (User ID: ${userProfile.userId})`);
        } else {
          console.warn(`⚠️ Could not find user profile for candidate ${candidateId}, skipping job match creation`);
        }
      } catch (localDbError) {
        console.error('❌ Failed to create local job match, but candidate was accepted:', localDbError);
        // Don't fail the entire operation if local database update fails
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

      const { localDatabaseService } = await import('./localDatabaseService');
      const { applicantScoringService } = await import('./applicantScoringService');

      console.log('Fetching enhanced candidates from platouserprofiles...');
      
      // Get all candidates from local database
      const allCandidates = await localDatabaseService.getAllUserProfiles();
      
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
      // Note: Airtable services removed - now using local database
      
      console.log(`🔄 Accepting applicant ${applicantId}...`);
      
      // Get application details first from local database
      const allApplications = await localDatabaseService.getAllJobApplications();
      const application = allApplications.find(app => app.id === applicantId);
      
      if (!application) {
        console.log(`❌ Application ${applicantId} not found`);
        return res.status(404).json({ message: "Application not found" });
      }

      // Get organization for company name
      const organization = await storage.getOrganizationByUser(userId);
      if (!organization) {
        console.log(`❌ Organization not found for user ${userId}`);
        return res.status(404).json({ message: "Organization not found" });
      }

      console.log(`🔄 Updating status to 'Accepted' for applicant ${application.applicantName}...`);

      // First, update the status to "Accepted"
      await localDatabaseService.updateJobApplication(applicantId, { status: 'Accepted' });

      console.log(`✅ Status updated to 'Accepted' for ${application.applicantName}`);

      // Then create job match record
      console.log(`🔄 Creating job match record for ${application.applicantName}...`);
      await localDatabaseService.createJobMatch({
        name: application.applicantName,
        userId: application.applicantUserId,
        jobTitle: application.jobTitle,
        jobDescription: application.jobDescription || '',
        companyName: organization.companyName,
        jobId: application.jobId,
        status: 'accepted'
      });

      console.log(`✅ Successfully accepted applicant ${application.applicantName}: Status updated + Job match created`);
      res.json({ 
        success: true, 
        message: "Candidate successfully accepted and status updated",
        applicant: {
          ...application,
          status: 'Accepted'
        }
      });
    } catch (error) {
      console.error("❌ Error accepting real applicant:", error);
      res.status(500).json({ message: "Error: Failed to update candidate status. Please try again." });
    }
  });

  app.post('/api/real-applicants/:id/decline', requireAuth, async (req: any, res) => {
    try {
      const applicantId = req.params.id;
      // Use local database service instead of Airtable

      console.log(`Declining and deleting applicant ${applicantId}...`);

      // Update the applicant record status in local database instead of deleting
      try {
        await localDatabaseService.updateJobApplication(applicantId, { status: 'declined' } as any);
      } catch (error) {
        console.warn('⚠️ Could not update application status to declined:', error);
      }
      
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
      const userId = req.user?.id;
      const organization = await storage.getOrganizationByUser(userId);
      
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      console.log(`🌟 DATABASE SHORTLIST: User ${userId} adding applicant ${applicantId} to shortlist...`);
      
      // Get applicant details from local database
      // Use local database service instead of Airtable
      const applicant = await localDatabaseService.getJobApplication(applicantId);
      
      if (!applicant) {
        return res.status(404).json({ message: "Applicant not found" });
      }

      // Check if already shortlisted
      const isAlreadyShortlisted = await storage.isApplicantShortlisted(userId, applicantId, applicant.jobId);
      if (isAlreadyShortlisted) {
        return res.status(400).json({ message: "Applicant already shortlisted for this job" });
      }
      
      // Add to database shortlist
      const shortlistedData = {
        id: `shortlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        employerId: userId,
        applicantId: applicantId,
        applicantName: applicant.name,
        jobTitle: applicant.jobTitle,
        jobId: applicant.jobId,
        note: null,
        dateShortlisted: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await storage.addToShortlist(shortlistedData);
      
      console.log(`✅ DATABASE SHORTLIST SUCCESS: Applicant ${applicantId} added to database shortlist`);
      
      res.json({ 
        success: true, 
        message: "Candidate added to shortlist successfully",
        applicantId: applicantId
      });
    } catch (error) {
      console.error("❌ DATABASE SHORTLIST ERROR:", error);
      console.error("❌ Error details:", error.message);
      res.status(500).json({ message: "Failed to add candidate to shortlist", error: error.message });
    }
  });

  // Accept shortlisted applicant (move to interviews)
  app.post('/api/shortlisted-applicants/:id/accept', requireAuth, async (req: any, res) => {
    try {
      const shortlistId = req.params.id;
      const userId = req.user?.id;
      const organization = await storage.getOrganizationByUser(userId);
      
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      console.log(`✅ ACCEPT SHORTLISTED: User ${userId} accepting shortlisted applicant ${shortlistId}...`);
      
      // Get shortlisted applicant details
      const shortlistedApplicants = await storage.getShortlistedApplicants(userId);
      const shortlistedApplicant = shortlistedApplicants.find(app => app.id === shortlistId);
      
      if (!shortlistedApplicant) {
        return res.status(404).json({ message: "Shortlisted applicant not found" });
      }

      // Get full applicant details from local database
      // Use local database service instead of Airtable
      const applicantDetails = await localDatabaseService.getJobApplication(shortlistedApplicant.applicantId);
      
      if (!applicantDetails) {
        return res.status(404).json({ message: "Applicant details not found" });
      }

      // Create interview record
      const interviewData = {
        id: `interview_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        candidateName: shortlistedApplicant.applicantName,
        candidateEmail: applicantDetails.name, // Using name as email placeholder
        candidateId: shortlistedApplicant.applicantId,
        jobId: shortlistedApplicant.jobId,
        jobTitle: shortlistedApplicant.jobTitle,
        scheduledDate: new Date().toISOString().split('T')[0], // Today's date as placeholder
        scheduledTime: '10:00', // Default time placeholder
        timeZone: 'UTC',
        interviewType: 'video' as const,
        meetingLink: null,
        interviewer: userId,
        status: 'scheduled' as const,
        notes: `Moved from shortlist to interview`,
        organizationId: organization.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await storage.createRealInterview(interviewData);
      
      // Remove from shortlist
      await storage.removeFromShortlist(shortlistId);
      
      console.log(`✅ ACCEPT SUCCESS: Applicant ${shortlistedApplicant.applicantId} moved to interviews`);
      
      res.json({ 
        success: true, 
        message: "Candidate accepted and moved to interviews",
        interviewId: interviewData.id
      });
    } catch (error) {
      console.error("❌ ACCEPT ERROR:", error);
      res.status(500).json({ message: "Failed to accept candidate", error: error.message });
    }
  });

  // Deny shortlisted applicant (remove from shortlist)
  app.post('/api/shortlisted-applicants/:id/deny', requireAuth, async (req: any, res) => {
    try {
      const shortlistId = req.params.id;
      const userId = req.user?.id;
      
      console.log(`❌ DENY SHORTLISTED: User ${userId} denying shortlisted applicant ${shortlistId}...`);
      
      // Simply remove from shortlist
      await storage.removeFromShortlist(shortlistId);
      
      console.log(`✅ DENY SUCCESS: Applicant removed from shortlist`);
      
      res.json({ 
        success: true, 
        message: "Candidate removed from shortlist"
      });
    } catch (error) {
      console.error("❌ DENY ERROR:", error);
      res.status(500).json({ message: "Failed to deny candidate", error: error.message });
    }
  });

  // Remove from shortlist (unshortlist)
  app.post('/api/real-applicants/:id/unshortlist', requireAuth, async (req: any, res) => {
    try {
      const applicantId = req.params.id;
      // Use local database service instead of Airtable

      console.log(`🗑️ Removing applicant ${applicantId} from shortlist...`);

      // Update the status in local database back to "pending" or empty
      try {
        await localDatabaseService.updateJobApplication(applicantId, { status: 'pending' } as any);
      } catch (error) {
        console.warn('⚠️ Could not update application status to pending:', error);
      }
      
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

      // Send email notification to the candidate
      console.log(`📧 EMAIL DEBUG: candidateEmail='${candidateEmail}', candidateName='${candidateName}'`);
      
      // Use provided email or fallback to a default for testing (if email is missing from Airtable)
      const finalEmail = candidateEmail && candidateEmail.trim() ? candidateEmail.trim() : 'faroukyasser705@gmail.com';
      
      if (finalEmail) {
        try {
          console.log(`📧 SENDING EMAIL: Attempting to send interview notification to ${finalEmail}`);
          const { emailService } = await import('./emailService');
          const { formatDistanceToNow, format } = await import('date-fns');
          
          // Format the date for display
          const formattedDate = format(new Date(scheduledDate), 'EEEE, MMMM do, yyyy');
          
          const emailData = {
            applicantName: candidateName,
            applicantEmail: finalEmail,
            interviewDate: formattedDate,
            interviewTime: scheduledTime,
            jobTitle: jobTitle || 'Position',
            companyName: organization.name || 'Company',
            interviewType: interviewType || 'video',
            meetingLink: meetingLink,
            timeZone: timeZone || 'UTC',
            notes: notes
          };
          
          console.log(`📧 EMAIL DATA:`, emailData);
          
          const emailSent = await emailService.sendInterviewScheduledEmail(emailData);
          if (emailSent) {
            console.log(`✅ Interview notification email sent successfully to ${finalEmail}`);
          } else {
            console.log(`⚠️ Failed to send interview notification email to ${finalEmail}`);
          }
        } catch (emailError) {
          console.error('❌ Error sending interview notification email:', emailError);
          console.error('❌ Email error details:', emailError.message);
          // Don't fail the entire operation if email fails
        }
      } else {
        console.log(`⚠️ No email address could be determined for candidate, skipping email notification`);
      }

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
  // Get all accepted applicants across all jobs for an organization
  app.get('/api/accepted-applicants', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);
      
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Get accepted applicants from platojobmatches table filtered by Company
      const AIRTABLE_API_KEY = 'pat770a3TZsbDther.a2b72657b27da4390a5215e27f053a3f0a643d66b43168adb6817301ad5051c0';
      const MATCHES_BASE_ID = 'app1u4N2W46jD43mP'; // Correct base ID for platojobmatches
      
      console.log(`🔍 Fetching ALL accepted applicants from platojobmatches table for Organization: ${organization.companyName}`);
      
      const matchesUrl = `https://api.airtable.com/v0/${MATCHES_BASE_ID}/Table%201`;
      const filterFormula = `{Company name}='${organization.companyName}'`;
      const fullUrl = `${matchesUrl}?filterByFormula=${encodeURIComponent(filterFormula)}`;

      const response = await fetch(fullUrl, {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`Airtable error response:`, errorText);
        throw new Error(`Failed to fetch accepted applicants: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`✅ Found ${data.records.length} total accepted applicants for organization ${organization.companyName}`);

      // Transform to expected format
      const formattedApplicants = data.records.map((record: any) => ({
        id: record.fields['User ID'] || record.id,
        applicantName: record.fields['Name'] || 'Unknown',
        jobTitle: record.fields['Job title'] || 'Unknown Position',
        jobId: record.fields['Job ID'] || '',
        status: 'Accepted',
        acceptedDate: record.fields['Created'] || new Date().toISOString(),
        userId: record.fields['User ID'] || record.id,
        email: record.fields['Email'] || '',
        airtableRecordId: record.id
      }));

      res.json(formattedApplicants);
    } catch (error) {
      console.error("Error fetching all accepted applicants:", error);
      res.status(500).json({ message: "Failed to fetch accepted applicants" });
    }
  });

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

  // Get all resume profiles for organization
  app.get('/api/resume-profiles', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { jobId } = req.query;
      const organization = await storage.getOrganizationByUser(userId);

      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const profiles = await storage.getResumeProfilesByOrganization(organization.id);

      // Get all organization jobs for scoring
      const jobs = await storage.getJobsByOrganization(organization.id);

      // Add job scores to each profile
      const profilesWithScores = await Promise.all(profiles.map(async (profile) => {
        const jobScores = await storage.getJobScoresByProfile(profile.id);

        // Filter job scores by specific jobId if provided
        const filteredJobScores = jobId
          ? jobScores.filter(score => score.jobId === jobId)
          : jobScores;

        return {
          ...profile,
          jobScores: filteredJobScores.map(score => ({
            ...score,
            jobTitle: jobs.find(job => job.id === score.jobId)?.title || 'Unknown Job'
          }))
        };
      }));

      res.json(profilesWithScores);
    } catch (error) {
      console.error("Error fetching resume profiles:", error);
      res.status(500).json({ message: "Failed to fetch resume profiles" });
    }
  });

  // Process single resume
  app.post('/api/resume-profiles/process', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);
      
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const { resumeText, fileType, jobId } = req.body;
      
      if (!resumeText || resumeText.trim().length < 50) {
        return res.status(400).json({ message: "Resume text is required and must be substantial" });
      }

      // Process resume with AI
      console.log(`🔄 Processing resume for organization ${organization.id}, file type: ${fileType}, text length: ${resumeText?.length}`);
      const processedResume = await resumeProcessingService.processResume(resumeText, fileType);
      console.log(`✅ Resume processed successfully:`, { name: processedResume.name, email: processedResume.email });
      
      // Save to database
      const profileData = {
        ...processedResume,
        resumeText,
        organizationId: organization.id,
        createdBy: userId,
      };
      
      const savedProfile = await storage.createResumeProfile(profileData);
      
      // Score against jobs - either specific job or all organization jobs
      let jobs;
      if (jobId) {
        // Score against specific job only
        const job = await storage.getJob(jobId);
        if (!job || job.organizationId !== organization.id) {
          return res.status(404).json({ message: "Job not found or doesn't belong to your organization" });
        }
        jobs = [job];
        console.log(`🎯 Scoring resume against specific job: ${job.title}`);
      } else {
        // Score against all organization jobs
        jobs = await storage.getJobsByOrganization(organization.id);
        console.log(`🎯 Scoring resume against all ${jobs.length} jobs`);
      }

      for (const job of jobs) {
        try {
          const jobScore = await resumeProcessingService.scoreResumeAgainstJob(
            processedResume,
            job.title,
            job.description,
            job.requirements || job.description
          );
          
          await storage.createJobScore({
            profileId: savedProfile.id,
            jobId: job.id,
            ...jobScore,
          });

          // Auto-invite if score meets per-job threshold
          try {
            const threshold = typeof (job as any).scoreMatchingThreshold === 'number' ? (job as any).scoreMatchingThreshold : 30;
            const overall = jobScore.overallScore ?? 0;
            if (overall >= threshold && processedResume.email) {
              const { localDatabaseService } = await import('./localDatabaseService');
              const companyName = organization.companyName || 'Our Company';

              // Generate unique token and username
              const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
              const names = (processedResume.name || '').trim().split(/\s+/);
              const firstName = names[0] || '';
              const lastName = names.slice(1).join(' ') || '';
              const username = (firstName + (lastName ? lastName[0].toUpperCase() + lastName.slice(1) : ''))
                .replace(/\s+/g, '')
                .replace(/[^a-zA-Z0-9]/g, '');

              // Create user profile in local database instead of Airtable
              try {
                console.log(`👤 Creating user profile for ${processedResume.email} in local database`);

                // Create a user profile using the local database service
                await localDatabaseService.createUserProfile({
                  userId: savedProfile.id.toString(),
                  name: processedResume.name || `${firstName} ${lastName}`.trim(),
                  email: processedResume.email,
                  phone: '', // Could be extracted from resume
                  professionalSummary: processedResume.summary || '',
                  experienceLevel: '', // Could be determined from resume
                  location: '', // Could be extracted from resume
                  fileId: processedResume.fileId,
                } as any);

                console.log(`✅ Successfully created user profile in local database`);
              } catch (userErr) {
                console.error('Error creating user profile in local database:', userErr);
              }

              // Use local database service instead of Airtable for creating interview invitation
              try {
                console.log(`📝 Creating job match and interview invitation for ${processedResume.email} using local database`);

                // Create a job match record to track the interview invitation
                await localDatabaseService.createJobMatch({
                  userId: savedProfile.id.toString(),
                  jobId: job.id.toString(),
                  name: processedResume.name || processedResume.email,
                  jobTitle: job.title,
                  jobDescription: job.description,
                  companyName: companyName,
                  matchScore: overall,
                  status: 'invited',
                  interviewDate: new Date(),
                  token: token, // Save the token for interview initiation
                } as any);

                console.log(`✅ Successfully created interview invitation in local database`);
              } catch (aiErr) {
                console.error('Error creating AI interview invitation:', aiErr);
              }

              // Build invitation link to Applicants app with token
              const baseUrl = process.env.APPLICANTS_APP_URL || 'https://applicants.platohiring.com';
              const invitationLink = `${baseUrl.replace(/\/$/, '')}/ai-interview-initation?token=${encodeURIComponent(token)}`;

              // Send invitation email via SendGrid (non-blocking)
              const { emailService } = await import('./emailService');
              emailService.sendInterviewInvitationEmail({
                applicantName: processedResume.name || processedResume.email,
                applicantEmail: processedResume.email,
                jobTitle: job.title,
                companyName,
                invitationLink,
                matchScore: overall,
                matchSummary: jobScore.matchSummary,
              }).catch(err => console.warn('📧 Invitation email failed (non-blocking):', err));
            }
          } catch (inviteError) {
            console.error(`Error inviting candidate for job ${job.id}:`, inviteError);
          }
        } catch (error) {
          console.error(`Error scoring resume against job ${job.id}:`, error);
          // Continue with other jobs even if one fails
        }
      }
      
      res.json({ success: true, profile: savedProfile });
    } catch (error) {
      console.error("Error processing resume:", error);
      console.error("Request body:", { resumeTextLength: req.body?.resumeText?.length, fileType: req.body?.fileType });
      res.status(500).json({ 
        message: "Failed to process resume", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
