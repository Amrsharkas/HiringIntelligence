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
      
      // Check for minimal profiles and give very low scores immediately
      const profileLength = userProfile.trim().length;
      const profileWords = userProfile.trim().split(/\s+/).length;
      
      if (profileLength < 20 || profileWords < 5) {
        console.log(`⚠️ Profile too short (${profileLength} chars, ${profileWords} words) - giving low score`);
        return {
          score: Math.floor(Math.random() * 10) + 5, // 5-14 points for minimal profiles
          summary: "Insufficient profile information provided. Profile contains minimal data for proper evaluation."
        };
      }
      
      const prompt = `You are an EXTREMELY STRICT recruiter evaluating a job applicant. Be brutally honest and accurate. A candidate must have SUBSTANTIAL relevant experience and skills to score well.

Job Description:
${jobDescription}

Applicant Profile:
${userProfile}

CRITICAL EVALUATION CRITERIA:
- If the profile is empty, vague, or has minimal information (like just "rower" or single words), score 0-15
- If there's no relevant experience or skills mentioned, score 0-25
- If there's some relevant experience but major gaps, score 25-45
- If there's good relevant experience with minor gaps, score 45-65
- If there's strong relevant experience with most requirements met, score 65-80
- Only score 80+ if the candidate is exceptionally qualified with all key requirements

SCORING RULES:
- Be HARSH and REALISTIC
- Incomplete profiles = Very low scores (0-15)
- Irrelevant experience = Low scores (0-30)
- Questionable fit = Medium scores (30-50)
- Good fit = Higher scores (50-70)
- Exceptional fit = High scores (70-85)
- Perfect fit = Very high scores (85-95)

Please respond with JSON in the following format:
{
  "score": <number between 0-100>,
  "summary": "<one sentence explaining why this specific score was given>"
}

Be honest and accurate. Don't inflate scores. A profile with minimal information should get a very low score.`;

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