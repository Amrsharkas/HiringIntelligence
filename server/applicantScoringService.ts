// Service for scoring applicants using OpenAI
import OpenAI from "openai";

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

      const prompt = `You are a BRUTALLY HONEST, STRICT recruiter who gives realistic assessments. NO INFLATED SCORES ALLOWED.

JOB DETAILS:
Title: ${jobTitle}
Description: ${jobDescription}
Requirements: ${jobRequirements}
Required Skills: ${jobSkills?.join(', ') || 'Not specified'}

CANDIDATE PROFILE:
${userProfile}

CRITICAL SCORING INSTRUCTIONS - BE EXTREMELY HARSH AND REALISTIC - MOST CANDIDATES SHOULD SCORE POORLY:

1. OVERALL MATCH (0-100): How well does this candidate actually fit this specific job? BE STRICT - most should score 20-40%.
2. TECHNICAL SKILLS (0-100): Do they have the exact technical abilities mentioned in requirements? DEMAND SPECIFICS - generic mentions = low scores.
3. EXPERIENCE (0-100): Do they have directly relevant work experience for this exact role and level? YEARS MATTER - junior for senior = very low score.
4. CULTURAL FIT (0-100): Based on available info, would they fit the work style and values? MINIMAL INFO = LOW SCORE.

MANDATORY SCORING GUIDELINES - NO EXCEPTIONS:
- 0-15: No relevant information, profile too vague, completely wrong field, or irrelevant experience
- 16-30: Some basic info but major gaps, wrong experience level, unrelated skills, or entry-level for senior role
- 31-45: Has some relevant background but missing key requirements, insufficient experience, or skills don't match
- 46-60: Meets some requirements but has notable gaps, moderate experience, or some skill mismatches
- 61-75: Good match with minor gaps, relevant experience, most skills present
- 76-85: Strong match with all major requirements, solid experience, excellent skills
- 86-95: Exceptional candidate, exceeds requirements, extensive relevant experience
- 96-100: Perfect match, world-class expertise, ideal candidate (EXTREMELY RARE)
- 26-40: Partially relevant but significant shortcomings in key areas
- 41-60: Decent match with some relevant experience but missing important requirements
- 61-75: Good candidate with most requirements but not exceptional
- 76-90: Strong candidate with all/most requirements and good experience
- 91-100: Perfect match with exceptional qualifications (RARE)

HARSH REALITY CHECKS:
- If the profile mentions "student" or "looking for experience" and job requires 5+ years → Experience should be 5-15%
- If they list irrelevant skills (e.g., social media for engineering role) → Technical Skills should be 10-25%  
- If profile is vague without concrete examples → All scores should be 15-35%
- If no cultural indicators are provided → Cultural Fit should be 20-40%
- NEVER give high scores without clear evidence in the profile

EXAMPLES OF REALISTIC SCORING:
- Junior candidate for senior role: Overall 15-25%, Experience 5-15%
- Unrelated field experience: Technical 10-20%, Overall 15-30%
- Vague generic profile: All scores 20-35%
- Missing key requirements: Relevant scores 15-40%
- 16-30: Minimal relevance, major gaps in all areas
- 31-50: Some basic relevance but significant gaps
- 51-70: Good qualifications with minor gaps
- 71-85: Strong qualifications meeting most requirements
- 86-95: Exceptional candidate exceeding requirements
- 96-100: Perfect match (extremely rare)

CRITICAL RULES:
- If profile mentions completely unrelated skills (like "rower" for a developer job), give 5-15 points max
- If no relevant experience is mentioned, technical skills should be 0-20
- If no education/background info, experience should be 0-25
- Be honest about gaps - don't assume qualifications that aren't explicitly stated
- A good candidate should score 60-75, exceptional 75-85, perfect 85+

Return JSON in this exact format:
{
  "overallMatch": <0-100>,
  "technicalSkills": <0-100>, 
  "experience": <0-100>,
  "culturalFit": <0-100>,
  "summary": "Honest one-sentence assessment of candidate fit",
  "reasoning": "Detailed explanation of scoring rationale, highlighting specific gaps and strengths"
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an EXTREMELY STRICT recruiter who gives honest, harsh assessments. CRITICAL: Most candidates should score 10-40%. Be brutally honest - irrelevant experience = 0-15%, missing skills = 0-20%, generic profiles = 10-30%. DO NOT be generous. Protect the company from bad hires."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      });

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
export { ApplicantScoringService, DetailedApplicantScore };