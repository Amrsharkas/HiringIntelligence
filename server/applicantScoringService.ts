// Service for scoring applicants using OpenAI
import OpenAI from "openai";
import { wrapOpenAIRequest } from "./openaiTracker";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface DetailedApplicantScore {
  overallMatch: number; // 0-100
  technicalSkills: number; // 0-100
  experience: number; // 0-100
  culturalFit: number; // 0-100
  summary: string;
  reasoning: string;
}

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
  
  async scoreApplicantDetailed(
    userProfile: string, 
    jobTitle: string,
    jobDescription: string,
    jobRequirements: string,
    jobSkills?: string[]
  ): Promise<DetailedApplicantScore> {
    try {
      console.log(`🔍 Detailed AI scoring for job: "${jobTitle}"`);
      console.log(`👤 User profile preview: "${userProfile.substring(0, 100)}..."`);
      
      // Check for completely empty or minimal profiles
      const profileLength = userProfile.trim().length;
      const profileWords = userProfile.trim().split(/\s+/).filter(word => word.length > 0).length;
      
      if (profileLength < 10 || profileWords < 3) {
        console.log(`❌ Profile extremely minimal (${profileLength} chars, ${profileWords} words) - automatic low scores`);
        return {
          overallMatch: Math.floor(Math.random() * 5) + 1, // 1-5%
          technicalSkills: Math.floor(Math.random() * 3) + 1, // 1-3%
          experience: Math.floor(Math.random() * 3) + 1, // 1-3%
          culturalFit: Math.floor(Math.random() * 8) + 2, // 2-9%
          summary: "Profile contains insufficient information for proper evaluation",
          reasoning: `Extremely minimal profile with only ${profileWords} words cannot be properly assessed against job requirements.`
        };
      }

      const prompt = `You are a professional recruiter providing realistic candidate assessments. Evaluate candidates fairly based on their actual qualifications and how well they match the job requirements.

JOB DETAILS:
Title: ${jobTitle}
Description: ${jobDescription}
Requirements: ${jobRequirements}
Required Skills: ${jobSkills?.join(', ') || 'Not specified'}

CANDIDATE PROFILE:
${userProfile}

SCORING INSTRUCTIONS - BE FAIR AND REALISTIC:

Evaluate each area (Overall Match, Technical Skills, Experience, Cultural Fit) on a 0-100 scale based on actual qualifications:

SCORING GUIDELINES:
- 0-20: No relevant qualifications, completely unsuitable for the role
- 21-40: Minimal qualifications, significant gaps in key areas
- 41-60: Some relevant qualifications but missing important requirements
- 61-80: Good qualifications that meet most job requirements
- 81-95: Strong qualifications that exceed job requirements
- 96-100: Exceptional qualifications, perfect match for the role

EVALUATION CRITERIA:

1. OVERALL MATCH (0-100): How well does the candidate's overall profile fit the job requirements?
2. TECHNICAL SKILLS (0-100): Does the candidate have the technical skills needed for this role?
3. EXPERIENCE (0-100): Does the candidate have relevant work experience at the appropriate level?
4. CULTURAL FIT (0-100): Based on available information, how well might the candidate fit the work environment?

REALISTIC ASSESSMENT APPROACH:
- Score based on what's actually stated in the profile
- Consider transferable skills and related experience
- Account for career progression and growth potential
- Be honest about gaps while recognizing potential
- Don't penalize candidates for information not provided unless it's critical
- Consider if requirements are "must-have" vs "nice-to-have"

Return JSON in this exact format:
{
  "overallMatch": <0-100>,
  "technicalSkills": <0-100>, 
  "experience": <0-100>,
  "culturalFit": <0-100>,
  "summary": "Honest one-sentence assessment of candidate fit",
  "reasoning": "Detailed explanation of scoring rationale, highlighting specific gaps and strengths"
}`;

      const response = await wrapOpenAIRequest(
        () => openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are a professional recruiter who provides realistic and fair candidate assessments. Evaluate candidates honestly based on their qualifications relative to job requirements. Scores should reflect actual match quality - from 1% for completely unsuitable candidates to 100% for perfect matches. Most candidates will fall somewhere in the middle based on their actual qualifications."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          response_format: { type: "json_object" }
        }),
        {
          requestType: "detailed_applicant_scoring",
          model: "gpt-4o",
          requestData: { userProfile, jobTitle, jobDescription, jobRequirements, jobSkills, prompt },
          metadata: { jobTitle, profileLength: userProfile.length }
        }
      );

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      // Validate and clamp all scores
      const scores = {
        overallMatch: Math.max(0, Math.min(100, Math.round(result.overallMatch || 0))),
        technicalSkills: Math.max(0, Math.min(100, Math.round(result.technicalSkills || 0))),
        experience: Math.max(0, Math.min(100, Math.round(result.experience || 0))),
        culturalFit: Math.max(0, Math.min(100, Math.round(result.culturalFit || 0))),
        summary: result.summary || "Assessment completed with limited profile information.",
        reasoning: result.reasoning || "Detailed scoring analysis completed."
      };

      console.log(`📊 Detailed scores - Overall: ${scores.overallMatch}%, Technical: ${scores.technicalSkills}%, Experience: ${scores.experience}%, Culture: ${scores.culturalFit}%`);
      console.log(`📝 Summary: ${scores.summary}`);

      return scores;

    } catch (error) {
      console.error('Error in detailed scoring:', error);
      return {
        overallMatch: 0,
        technicalSkills: 0,
        experience: 0,
        culturalFit: 0,
        summary: "Technical error during evaluation - manual review required.",
        reasoning: "Unable to complete AI assessment due to system error."
      };
    }
  }

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
      
      const prompt = `You are a professional recruiter evaluating a job applicant. Provide a realistic assessment based on how well the candidate matches the job requirements.

Job Description:
${jobDescription}

Applicant Profile:
${userProfile}

EVALUATION APPROACH:
- Score from 1-100 based on actual qualifications and job fit
- Consider relevant experience, skills, education, and potential
- Account for transferable skills and growth potential
- Be fair but honest about strengths and gaps

SCORING GUIDELINES:
- 0-20: No relevant qualifications, completely unsuitable
- 21-40: Minimal qualifications, significant gaps
- 41-60: Some relevant qualifications, missing key requirements
- 61-80: Good qualifications, meets most requirements
- 81-95: Strong qualifications, exceeds requirements
- 96-100: Exceptional qualifications, perfect match

Please respond with JSON in the following format:
{
  "score": <number between 0-100>,
  "summary": "<one sentence explaining the assessment and score rationale>"
}

Provide an honest, fair assessment that reflects the candidate's actual suitability for the role.`;

      const response = await wrapOpenAIRequest(
        () => openai.chat.completions.create({
          model: "gpt-4o",
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
          response_format: { type: "json_object" }
        }),
        {
          requestType: "applicant_scoring",
          model: "gpt-4o",
          requestData: { userProfile, jobDescription, prompt },
          metadata: { profileLength: userProfile.length }
        }
      );

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
export { ApplicantScoringService, DetailedApplicantScore };