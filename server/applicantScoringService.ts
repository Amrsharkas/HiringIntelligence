// Service for scoring applicants using OpenAI
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ApplicantScore {
  score: number; // 0-100
  summary: string;
}

interface ScoringResult {
  applicantId: string;
  score: number;
  summary: string;
}

class ApplicantScoringService {
  async scoreApplicant(userProfile: string, jobDescription: string): Promise<ApplicantScore> {
    try {
      console.log('Scoring applicant using OpenAI...');
      
      const prompt = `You're evaluating a job applicant. Given the following job description and their AI-generated profile, return a match score between 0 and 100, and provide a 1-sentence summary of your reasoning.

Job Description:
${jobDescription}

Applicant Profile:
${userProfile}

Please respond with JSON in the following format:
{
  "score": <number between 0-100>,
  "summary": "<one sentence explaining the match score>"
}

Guidelines:
- Score 0-30: Poor match, major skill gaps or misalignment
- Score 31-60: Fair match, some relevant experience but notable gaps
- Score 61-85: Good match, solid alignment with most requirements
- Score 86-100: Excellent match, strong alignment with all key requirements

Avoid round numbers like 70, 80, 90. Use specific numbers like 67, 73, 82, 91, etc.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are an expert recruiter evaluating job candidates. Provide accurate, fair assessments based on job requirements and candidate qualifications."
          },
          {
            role: "user", 
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1, // Lower temperature for more consistent scoring
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      // Validate and clamp score
      const score = Math.max(0, Math.min(100, Math.round(result.score || 0)));
      const summary = result.summary || "Unable to generate assessment summary.";

      console.log(`Applicant scored: ${score}/100 - ${summary}`);

      return {
        score,
        summary
      };

    } catch (error) {
      console.error('Error scoring applicant with OpenAI:', error);
      return {
        score: 0,
        summary: "Unable to score applicant due to technical error."
      };
    }
  }

  async batchScoreApplicants(applicants: Array<{id: string, userProfile: string, jobDescription: string}>): Promise<ScoringResult[]> {
    console.log(`Batch scoring ${applicants.length} applicants...`);
    
    const results: ScoringResult[] = [];
    
    // Process in smaller batches to avoid rate limits
    const batchSize = 5;
    
    for (let i = 0; i < applicants.length; i += batchSize) {
      const batch = applicants.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (applicant) => {
        if (!applicant.userProfile || !applicant.jobDescription) {
          return {
            applicantId: applicant.id,
            score: 0,
            summary: "Insufficient profile or job information for scoring."
          };
        }
        
        const result = await this.scoreApplicant(applicant.userProfile, applicant.jobDescription);
        return {
          applicantId: applicant.id,
          score: result.score,
          summary: result.summary
        };
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Small delay between batches to respect rate limits
      if (i + batchSize < applicants.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log(`Completed batch scoring for ${results.length} applicants`);
    return results;
  }
}

export const applicantScoringService = new ApplicantScoringService();