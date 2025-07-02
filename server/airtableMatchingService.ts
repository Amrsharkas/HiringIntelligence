import { airtableService } from './airtableService';
import { generateCandidateMatchRating } from './openai';
import { storage } from './storage';

export class AirtableMatchingService {
  // You'll need to set these based on your Airtable setup
  private baseId: string = ''; // Will be set via environment or discovery
  private tableName: string = 'Candidates'; // Default table name

  async discoverAirtableStructure() {
    try {
      const bases = await airtableService.getBases();
      console.log('Available Airtable bases:', bases.map(b => ({ id: b.id, name: b.name })));
      
      if (bases.length > 0) {
        this.baseId = bases[0].id; // Use first base for now
        const tables = await airtableService.getTables(this.baseId);
        console.log('Available tables:', tables.map(t => ({ id: t.id, name: t.name })));
        
        // Look for a candidates table
        const candidateTable = tables.find(t => 
          t.name.toLowerCase().includes('candidate') || 
          t.name.toLowerCase().includes('profile') ||
          t.name.toLowerCase().includes('user')
        );
        
        if (candidateTable) {
          this.tableName = candidateTable.name;
        }
      }
      
      return { baseId: this.baseId, tableName: this.tableName };
    } catch (error) {
      console.error('Error discovering Airtable structure:', error);
      throw error;
    }
  }

  async getCandidatesForJob(jobId: number) {
    try {
      // Ensure we have the base structure
      if (!this.baseId) {
        await this.discoverAirtableStructure();
      }

      // Get the job details
      const job = await storage.getJobById(jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      // Fetch all candidates from Airtable
      const candidates = await airtableService.getAllCandidateProfiles(this.baseId, this.tableName);
      console.log(`Found ${candidates.length} candidates in Airtable`);

      // Generate matches for each candidate
      const matchedCandidates = [];
      
      for (const candidate of candidates) {
        try {
          console.log(`Analyzing candidate: ${candidate.name}`);
          
          const matchResult = await generateCandidateMatchRating(candidate, job);
          
          matchedCandidates.push({
            ...candidate,
            matchScore: matchResult.score,
            matchReasoning: matchResult.reasoning,
            skillGaps: matchResult.skillGaps,
            strengths: matchResult.strengths || []
          });
          
          // Small delay to avoid API rate limits
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.error(`Error analyzing candidate ${candidate.name}:`, error);
          
          // Add candidate with basic info if AI analysis fails
          matchedCandidates.push({
            ...candidate,
            matchScore: 0,
            matchReasoning: 'Analysis failed',
            skillGaps: [],
            strengths: []
          });
        }
      }

      // Sort by match score (highest first)
      matchedCandidates.sort((a, b) => b.matchScore - a.matchScore);

      return matchedCandidates;
    } catch (error) {
      console.error('Error getting candidates for job:', error);
      throw error;
    }
  }

  async getAllCandidatesWithScores(organizationId: number) {
    try {
      // Ensure we have the base structure
      if (!this.baseId) {
        await this.discoverAirtableStructure();
      }

      // Get all organization jobs for context
      const jobs = await storage.getJobsByOrganization(organizationId);
      
      // Fetch all candidates from Airtable
      const candidates = await airtableService.getAllCandidateProfiles(this.baseId, this.tableName);
      
      // For general viewing, return candidates with basic info
      return candidates.map(candidate => ({
        ...candidate,
        availableForMatching: true,
        totalJobs: jobs.length
      }));
      
    } catch (error) {
      console.error('Error getting all candidates:', error);
      throw error;
    }
  }

  // Set Airtable configuration manually if needed
  setAirtableConfig(baseId: string, tableName: string = 'Candidates') {
    this.baseId = baseId;
    this.tableName = tableName;
  }
}

export const airtableMatchingService = new AirtableMatchingService();