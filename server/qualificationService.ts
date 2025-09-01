import { db } from "./db";
import { qualificationResults, resumeProfiles, jobs } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

interface QualificationRequest {
  candidateId: string;
  jobId: number;
  passThreshold: number;
  autoAdvanceEnabled: boolean;
}

interface QualificationResult {
  id?: number;
  candidateId: string;
  jobId: number;
  qualificationScore: number;
  matchedSkills: string[] | null;
  missingSkills: string[] | null;
  decision: string;
  passThreshold: number;
  autoAdvanceEnabled: boolean;
  candidateStage: string | null;
  organizationId: string;
  createdBy: string;
  createdAt?: Date | null;
}

export class QualificationService {
  /**
   * Normalizes text for comparison by removing extra spaces, lowercasing, and standardizing punctuation
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
      .replace(/\s+/g, ' ') // Normalize multiple spaces
      .trim();
  }

  /**
   * Extracts skills from text using keyword matching and common patterns
   */
  private extractSkillsFromText(text: string): string[] {
    const normalizedText = this.normalizeText(text);
    const skills: Set<string> = new Set();

    // Common technical skills patterns
    const techSkills = [
      'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'php', 'ruby', 'go', 'rust',
      'react', 'angular', 'vue', 'node.js', 'express', 'django', 'flask', 'spring', 'laravel',
      'html', 'css', 'sass', 'scss', 'bootstrap', 'tailwind',
      'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch',
      'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'git', 'jenkins', 'ci/cd',
      'project management', 'agile', 'scrum', 'kanban', 'leadership', 'communication',
      'autocad', 'revit', 'solidworks', 'civil engineering', 'structural engineering',
      'procurement', 'construction', 'real estate', 'engineering', 'architecture'
    ];

    // Find exact matches
    techSkills.forEach(skill => {
      const normalizedSkill = this.normalizeText(skill);
      if (normalizedText.includes(normalizedSkill)) {
        skills.add(skill);
      }
    });

    // Extract programming languages pattern
    const progLangPattern = /\b(programming|development|coding|experience with|proficient in|skilled in|knowledge of)\s+([a-z+#.]+)/gi;
    let match;
    while ((match = progLangPattern.exec(normalizedText)) !== null) {
      const lang = match[2].trim();
      if (lang.length > 1) {
        skills.add(lang);
      }
    }

    return Array.from(skills);
  }

  /**
   * Computes qualification score based on skill matching and job requirements
   */
  private computeQualificationScore(
    candidateSkills: string[],
    requiredSkills: string[],
    niceToHaveSkills: string[],
    jobDescription: string
  ): {
    score: number;
    matchedSkills: string[];
    missingSkills: string[];
  } {
    const normalizedCandidateSkills = candidateSkills.map(skill => this.normalizeText(skill));
    const normalizedRequiredSkills = requiredSkills.map(skill => this.normalizeText(skill));
    const normalizedNiceToHaveSkills = niceToHaveSkills.map(skill => this.normalizeText(skill));

    // Extract additional relevant skills from job description
    const jobSkills = this.extractSkillsFromText(jobDescription);
    const normalizedJobSkills = jobSkills.map(skill => this.normalizeText(skill));

    const matchedSkills: string[] = [];
    const missingSkills: string[] = [];

    // Check required skills
    let requiredMatches = 0;
    requiredSkills.forEach((skill, index) => {
      const normalizedSkill = normalizedRequiredSkills[index];
      const isMatched = normalizedCandidateSkills.some(candidateSkill => 
        candidateSkill.includes(normalizedSkill) || normalizedSkill.includes(candidateSkill)
      );
      
      if (isMatched) {
        requiredMatches++;
        matchedSkills.push(skill);
      } else {
        missingSkills.push(skill);
      }
    });

    // Check nice-to-have skills
    let niceToHaveMatches = 0;
    niceToHaveSkills.forEach((skill, index) => {
      const normalizedSkill = normalizedNiceToHaveSkills[index];
      const isMatched = normalizedCandidateSkills.some(candidateSkill => 
        candidateSkill.includes(normalizedSkill) || normalizedSkill.includes(candidateSkill)
      );
      
      if (isMatched) {
        niceToHaveMatches++;
        if (!matchedSkills.includes(skill)) {
          matchedSkills.push(skill);
        }
      }
    });

    // Check job description keywords
    let jobKeywordMatches = 0;
    jobSkills.forEach((skill, index) => {
      const normalizedSkill = normalizedJobSkills[index];
      const isMatched = normalizedCandidateSkills.some(candidateSkill => 
        candidateSkill.includes(normalizedSkill) || normalizedSkill.includes(candidateSkill)
      );
      
      if (isMatched) {
        jobKeywordMatches++;
        if (!matchedSkills.includes(skill)) {
          matchedSkills.push(skill);
        }
      }
    });

    // Calculate score
    const requiredWeight = 0.7; // 70% weight for required skills
    const niceToHaveWeight = 0.2; // 20% weight for nice-to-have skills
    const jobKeywordWeight = 0.1; // 10% weight for job keyword matches

    const requiredScore = requiredSkills.length > 0 ? (requiredMatches / requiredSkills.length) * 100 : 100;
    const niceToHaveScore = niceToHaveSkills.length > 0 ? (niceToHaveMatches / niceToHaveSkills.length) * 100 : 0;
    const jobKeywordScore = jobSkills.length > 0 ? (jobKeywordMatches / jobSkills.length) * 100 : 0;

    let finalScore = (
      requiredScore * requiredWeight +
      niceToHaveScore * niceToHaveWeight +
      jobKeywordScore * jobKeywordWeight
    );

    // Apply penalty if more than half of required skills are missing
    if (requiredSkills.length > 0 && (requiredMatches / requiredSkills.length) < 0.5) {
      finalScore = Math.min(finalScore, 60); // Cap at 60% if less than half required skills match
    }

    // Ensure score is between 0 and 100
    finalScore = Math.max(0, Math.min(100, Math.round(finalScore)));

    return {
      score: finalScore,
      matchedSkills,
      missingSkills
    };
  }

  /**
   * Qualifies a candidate against a job posting
   */
  async qualifyCandidate(
    request: QualificationRequest,
    organizationId: string,
    userId: string
  ): Promise<QualificationResult> {
    // Get candidate profile
    const [candidate] = await db
      .select()
      .from(resumeProfiles)
      .where(eq(resumeProfiles.id, request.candidateId));

    if (!candidate) {
      throw new Error('Candidate not found');
    }

    // Get job details
    const [job] = await db
      .select()
      .from(jobs)
      .where(eq(jobs.id, request.jobId));

    if (!job) {
      throw new Error('Job not found');
    }

    // Extract skills from candidate resume
    const candidateSkills = [
      ...candidate.skills || [],
      ...this.extractSkillsFromText(candidate.resumeText)
    ];

    // Get job skills
    const requiredSkills = job.technicalSkills || [];
    const niceToHaveSkills = job.softSkills || [];

    // Compute qualification score
    const { score, matchedSkills, missingSkills } = this.computeQualificationScore(
      candidateSkills,
      requiredSkills,
      niceToHaveSkills,
      job.description
    );

    // Determine decision
    const decision = score >= request.passThreshold ? 'Advanced' : 'Not Advanced';
    
    // Determine candidate stage
    let candidateStage = 'Application Review';
    if (decision === 'Advanced' && request.autoAdvanceEnabled) {
      candidateStage = 'Interview 1';
    }

    // Store qualification result
    const [result] = await db
      .insert(qualificationResults)
      .values({
        candidateId: request.candidateId,
        jobId: request.jobId,
        qualificationScore: score,
        matchedSkills,
        missingSkills,
        decision,
        passThreshold: request.passThreshold,
        autoAdvanceEnabled: request.autoAdvanceEnabled,
        candidateStage,
        organizationId,
        createdBy: userId
      })
      .returning();

    return result;
  }

  /**
   * Gets the latest qualification result for a candidate
   */
  async getLatestQualificationResult(candidateId: string): Promise<QualificationResult | null> {
    const [result] = await db
      .select()
      .from(qualificationResults)
      .where(eq(qualificationResults.candidateId, candidateId))
      .orderBy(desc(qualificationResults.createdAt))
      .limit(1);

    return result || null;
  }

  /**
   * Gets all qualification results for a candidate
   */
  async getCandidateQualificationHistory(candidateId: string): Promise<QualificationResult[]> {
    const results = await db
      .select()
      .from(qualificationResults)
      .where(eq(qualificationResults.candidateId, candidateId))
      .orderBy(desc(qualificationResults.createdAt));

    return results;
  }

  /**
   * Gets qualification results for a specific job
   */
  async getJobQualificationResults(jobId: number, organizationId: string): Promise<QualificationResult[]> {
    const results = await db
      .select()
      .from(qualificationResults)
      .where(and(
        eq(qualificationResults.jobId, jobId),
        eq(qualificationResults.organizationId, organizationId)
      ))
      .orderBy(desc(qualificationResults.createdAt));

    return results;
  }
}

export const qualificationService = new QualificationService();