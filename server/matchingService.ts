import { candidateService } from './candidateService';
import { generateCandidateMatchRating } from './openai';
import { storage } from './storage';

export class MatchingService {
  // Generate matches for a specific job using external candidate database
  async generateJobMatches(jobId: number) {
    try {
      const job = await storage.getJobById(jobId);
      if (!job) throw new Error('Job not found');

      // Search candidates from external platform based on job requirements
      const candidates = await candidateService.searchCandidates({
        jobTitle: job.title,
        requiredSkills: [...(job.technicalSkills || []), ...(job.softSkills || [])],
        location: job.location || undefined,
      });

      const matches = [];

      // Generate AI-powered matches for each candidate
      for (const candidate of candidates) {
        try {
          const matchResult = await generateCandidateMatchRating(candidate, job);
          
          // Only store matches above the per-job threshold (default 30)
          const threshold = typeof job.scoreMatchingThreshold === 'number' ? job.scoreMatchingThreshold : 30;
          if (matchResult.score >= threshold) {
            const match = await storage.createMatch({
              jobId: job.id,
              candidateId: candidate.id, // External candidate ID
              matchScore: matchResult.score,
              matchReasoning: matchResult.reasoning,
            });
            matches.push({ ...match, candidate });
          }
        } catch (error) {
          console.error(`Error matching candidate ${candidate.id}:`, error);
        }
      }

      return matches;
    } catch (error) {
      console.error('Error generating job matches:', error);
      throw error;
    }
  }

  // Get enhanced matches with candidate data from external platform
  async getJobMatchesWithCandidates(jobId: number) {
    try {
      const matches = await storage.getMatchesByJob(jobId);
      
      // Fetch candidate details from external platform
      const enhancedMatches = await Promise.all(
        matches.map(async (match) => {
          try {
            const candidate = await candidateService.getCandidateById(match.candidateId.toString());
            return { ...match, candidate };
          } catch (error) {
            console.error(`Error fetching candidate ${match.candidateId}:`, error);
            return { ...match, candidate: null };
          }
        })
      );

      return enhancedMatches.filter(match => match.candidate !== null);
    } catch (error) {
      console.error('Error getting job matches:', error);
      throw error;
    }
  }

  // Search and match candidates in real-time
  async searchAndMatchCandidates(searchCriteria: {
    jobTitle?: string;
    skills?: string[];
    location?: string;
    experienceLevel?: string;
    minMatchScore?: number;
  }) {
    try {
      const candidates = await candidateService.searchCandidates({
        jobTitle: searchCriteria.jobTitle,
        requiredSkills: searchCriteria.skills,
        location: searchCriteria.location,
        experienceLevel: searchCriteria.experienceLevel,
      });

      // If no specific job, return candidates with basic info
      return candidates.map(candidate => ({
        ...candidate,
        matchScore: null,
        matchReasoning: null,
      }));
    } catch (error) {
      console.error('Error searching candidates:', error);
      throw error;
    }
  }

  // Bulk match all active jobs against candidate database
  async bulkMatchAllJobs(organizationId: number) {
    try {
      const jobs = await storage.getJobsByOrganization(organizationId);
      const results = [];

      for (const job of jobs) {
        try {
          const matches = await this.generateJobMatches(job.id);
          results.push({ jobId: job.id, matchCount: matches.length });
        } catch (error) {
          console.error(`Error matching job ${job.id}:`, error);
          results.push({ jobId: job.id, matchCount: 0, error: error.message });
        }
      }

      return results;
    } catch (error) {
      console.error('Error in bulk matching:', error);
      throw error;
    }
  }
}

export const matchingService = new MatchingService();