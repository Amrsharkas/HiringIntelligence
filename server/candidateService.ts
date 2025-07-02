import { Pool } from '@neondatabase/serverless';

// Service to connect to your separate candidate platform database
export class CandidateService {
  private candidateDb: Pool;

  constructor(candidateDbUrl: string) {
    this.candidateDb = new Pool({ connectionString: candidateDbUrl });
  }

  // Fetch candidates from your separate platform
  async getCandidatesForMatching(filters?: {
    skills?: string[];
    experience?: string;
    location?: string;
    availability?: boolean;
  }) {
    const query = `
      SELECT id, name, email, skills, experience, location, 
             availability, summary, profile_data
      FROM candidates 
      WHERE availability = true
      ${filters?.skills ? 'AND skills && $1' : ''}
      ${filters?.location ? 'AND location ILIKE $2' : ''}
      ORDER BY updated_at DESC
      LIMIT 100
    `;
    
    const params = [];
    if (filters?.skills) params.push(filters.skills);
    if (filters?.location) params.push(`%${filters.location}%`);
    
    const result = await this.candidateDb.query(query, params);
    return result.rows;
  }

  // Get candidate details for matching
  async getCandidateById(candidateId: string) {
    const query = `
      SELECT * FROM candidates WHERE id = $1
    `;
    const result = await this.candidateDb.query(query, [candidateId]);
    return result.rows[0];
  }

  // Search candidates by criteria
  async searchCandidates(searchCriteria: {
    jobTitle?: string;
    requiredSkills?: string[];
    location?: string;
    experienceLevel?: string;
  }) {
    let query = `
      SELECT id, name, email, skills, experience, location, summary
      FROM candidates 
      WHERE availability = true
    `;
    
    const params = [];
    let paramIndex = 1;

    if (searchCriteria.requiredSkills?.length) {
      query += ` AND skills && $${paramIndex}`;
      params.push(searchCriteria.requiredSkills);
      paramIndex++;
    }

    if (searchCriteria.location) {
      query += ` AND location ILIKE $${paramIndex}`;
      params.push(`%${searchCriteria.location}%`);
      paramIndex++;
    }

    if (searchCriteria.experienceLevel) {
      query += ` AND experience ILIKE $${paramIndex}`;
      params.push(`%${searchCriteria.experienceLevel}%`);
      paramIndex++;
    }

    query += ` ORDER BY updated_at DESC LIMIT 50`;
    
    const result = await this.candidateDb.query(query, params);
    return result.rows;
  }
}

// Initialize with your candidate database URL
export const candidateService = new CandidateService(
  process.env.CANDIDATE_DATABASE_URL || process.env.DATABASE_URL
);