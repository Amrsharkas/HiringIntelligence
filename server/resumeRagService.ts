/**
 * Resume RAG (Retrieval-Augmented Generation) Service
 * Handles interactions with the vector database search API for resume matching
 */

// TypeScript interfaces for RAG API
export interface RagSearchCollection {
  name: string;
}

export interface RagSearchRequest {
  query: string;
  collections: RagSearchCollection[];
  top_k?: number;
  score_threshold?: number;
}

export interface RagResumePayload {
  id: string;  // UUID of the resume
  uuid?: string;  // Also store as uuid field for clarity
  name: string;
  email: string;
  phone: string;
  summary: string;
  experience: string[];
  skills: string[];
  education: string[];
  certifications: string[];
  languages: string[];
  organizationId: string;
  fullResume?: {
    id: string;
    name: string;
    email: string;
    phone: string;
    summary: string;
    experience: string[];
    skills: string[];
    education: string[];
    certifications: string[];
    languages: string[];
    resumeText: string;
    organizationId: string;
  };
}

export interface RagSearchResult {
  id: number;  // RAG uses integer IDs
  version: number;
  score: number;
  payload: RagResumePayload;
  vector: null;
  shard_key: null;
  order_value: null;
}

export interface RagSearchResponse {
  results: {
    resumes: RagSearchResult[];
  };
}

/**
 * Resume RAG Service Class
 */
export class ResumeRagService {
  private apiUrl: string;

  constructor() {
    this.apiUrl = process.env.RAG_API_URL || 'http://localhost:8002';
  }

  /**
   * Search for resumes in the vector database based on a query
   * @param query - The search query (typically a job description/requirements)
   * @param topK - Maximum number of results to return (default: 10)
   * @param scoreThreshold - Minimum similarity score threshold (optional)
   * @returns Array of resume search results
   */
  async searchResumes(
    query: string,
    topK: number = 10,
    scoreThreshold?: number
  ): Promise<RagSearchResult[]> {
    try {
      if (!query) {
        console.warn('⚠️ RAG search called with empty query');
        return [];
      }

      console.log({
        query
      });

      const requestBody: RagSearchRequest = {
        query: query,
        collections: [{ name: 'resumes' }],
        // top_k: topK,
      };

      // Add score threshold if provided
      if (scoreThreshold !== undefined) {
        requestBody.score_threshold = scoreThreshold;
      }

      console.log(`🔍 Searching RAG API for resumes with query length: ${query.length} characters`);

      const response = await fetch(`${this.apiUrl}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`RAG API returned status ${response.status}: ${response.statusText}`);
      }

      const data: RagSearchResponse = await response.json();

      console.log({
        response: JSON.stringify(data, null, 2),
      });

      const results = data.results?.resumes || [];
      console.log(`✅ RAG API returned ${results.length} resume matches`);

      return results;
    } catch (error) {
      console.error('❌ Error calling RAG API:', error);

      // Provide more context for common errors
      if (error instanceof Error) {
        if (error.message.includes('ECONNREFUSED')) {
          console.error(`💡 RAG API connection refused. Is the service running at ${this.apiUrl}?`);
        } else if (error.message.includes('fetch')) {
          console.error('💡 Network error connecting to RAG API');
        }
      }

      throw error;
    }
  }

  /**
   * Transform RAG search results into a format compatible with the application's resume matching interface
   * @param ragResults - Array of RAG search results
   * @returns Formatted resume matches
   */
  transformToResumeMatches(ragResults: RagSearchResult[]): any[] {
    return ragResults.map((result) => {
      const resume = result.payload.fullResume || result.payload;
      // Use the UUID from the payload (not the integer RAG ID)
      const resumeUuid = result.payload.id || (result.payload as any).uuid;

      return {
        id: resumeUuid,  // Use UUID for frontend compatibility
        matchScore: Math.round(result.score * 100), // Convert to percentage
        matchReasons: this.generateMatchReasons(result),
        resume: {
          id: resumeUuid,  // Use UUID
          name: resume.name,
          email: resume.email,
          phone: resume.phone,
          summary: resume.summary,
          experience: resume.experience || [],
          skills: resume.skills || [],
          education: resume.education || [],
          certifications: resume.certifications || [],
          languages: resume.languages || [],
        },
      };
    });
  }

  /**
   * Generate human-readable match reasons based on the RAG result
   * @param result - RAG search result
   * @returns Array of match reasons
   */
  private generateMatchReasons(result: RagSearchResult): string[] {
    const reasons: string[] = [];
    const score = result.score;

    // Generate reasons based on match score
    if (score > 0.8) {
      reasons.push('Excellent match for this position');
    } else if (score > 0.6) {
      reasons.push('Strong match for job requirements');
    } else if (score > 0.4) {
      reasons.push('Good match for the role');
    } else {
      reasons.push('Relevant experience and skills');
    }

    // Add skill-based reasons if available
    const skills = result.payload.skills;
    if (skills && skills.length > 0) {
      const topSkills = skills.slice(0, 3);
      if (topSkills.length > 0) {
        reasons.push(`Has ${topSkills.join(', ')} skills`);
      }
    }

    // Add experience if available
    const experience = result.payload.experience;
    if (experience && experience.length > 0) {
      const yearsMatch = experience[0]?.match(/\d+/);
      if (yearsMatch) {
        reasons.push(`${yearsMatch[0]}+ years of experience`);
      }
    }

    // Add education if available
    const education = result.payload.education;
    if (education && education.length > 0) {
      reasons.push('Relevant educational background');
    }

    return reasons;
  }
}

// Export singleton instance
export const resumeRagService = new ResumeRagService();
