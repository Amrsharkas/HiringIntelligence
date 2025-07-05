import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertJobSchema, insertOrganizationSchema } from "@shared/schema";
import { generateJobDescription, generateJobRequirements, extractTechnicalSkills, generateCandidateMatchRating } from "./openai";
import { airtableMatchingService } from "./airtableMatchingService";

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
      await storage.deleteJob(jobId);
      res.json({ message: "Job deleted successfully" });
    } catch (error) {
      console.error("Error deleting job:", error);
      res.status(500).json({ message: "Failed to delete job posting" });
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
        apiKey: "pat770a3TZsbDther.a2b72657b27da4390a5215e27f053a3f0a643d66b43168adb6817301ad5051c0" ? "Connected ✓" : "Not configured",
        basesFound: bases.length,
        bases: bases.map(base => ({
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
    } catch (error) {
      console.error("Error fetching Airtable info:", error);
      res.status(500).json({ 
        message: "Error connecting to Airtable", 
        error: error.message,
        apiKey: "pat770a3TZsbDther.a2b72657b27da4390a5215e27f053a3f0a643d66b43168adb6817301ad5051c0" ? "Connected" : "Missing"
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
      
      res.json(matchedCandidates);
    } catch (error) {
      console.error("Error fetching Airtable candidates for job:", error);
      res.status(500).json({ message: "Failed to fetch candidates from Airtable" });
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

  const httpServer = createServer(app);
  return httpServer;
}
