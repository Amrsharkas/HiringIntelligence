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
  candidateIdentity?: string;
  strengths?: string[];
  gaps?: string[];
  roleMatchAnalysis?: string;
  hiringRecommendation?: string;
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

      const prompt = `You are an expert recruitment consultant conducting a comprehensive candidate evaluation. Provide honest, detailed analysis with realistic scoring.

JOB DETAILS:
Title: ${jobTitle}
Description: ${jobDescription}
Requirements: ${jobRequirements}
Required Skills: ${jobSkills?.join(', ') || 'Not specified'}

CANDIDATE PROFILE:
${userProfile}

PROVIDE A COMPREHENSIVE CANDIDATE ANALYSIS INCLUDING:

1. CANDIDATE IDENTITY & BACKGROUND:
   - Who is this person professionally?
   - What is their career trajectory and current position?
   - Key educational background and certifications
   - Years of experience and domain expertise

2. DETAILED SCORING BREAKDOWN:
   - OVERALL MATCH (0-100): Realistic assessment of role fit
   - TECHNICAL SKILLS (0-100): Specific skills alignment with job requirements
   - EXPERIENCE (0-100): Relevant experience level and quality
   - CULTURAL FIT (0-100): Soft skills, communication style, work preferences

3. STRENGTHS ANALYSIS:
   - Key competencies that make this candidate valuable
   - Standout achievements and accomplishments
   - Transferable skills from related fields
   - Leadership qualities and problem-solving abilities

4. GAPS & DEVELOPMENT AREAS:
   - Missing technical skills or certifications
   - Experience gaps relative to job requirements
   - Areas where the candidate needs growth
   - Potential training or development needs

5. ROLE MATCH REASONING:
   - Why this candidate fits or doesn't fit the specific role
   - How their background aligns with job responsibilities
   - Risk assessment for hiring this candidate
   - Potential for growth and advancement in the role

6. HIRING RECOMMENDATION:
   - Clear recommendation with rationale
   - Suggested interview focus areas
   - Onboarding considerations if hired
   - Alternative roles that might be better suited

SCORING GUIDELINES:
- 80-100: Exceptional match with all key requirements
- 60-79: Strong candidate with minor gaps
- 40-59: Potential candidate with notable development needs
- 20-39: Limited fit with significant training required
- 0-19: Poor match or insufficient relevant experience

RESPONSE FORMAT - Return ONLY valid JSON in this exact structure:
{
  "overallMatch": 65,
  "technicalSkills": 70,
  "experience": 85,
  "culturalFit": 50,
  "summary": "John is a senior software engineer with 8 years of experience in full-stack development. He has strong technical skills in React, Node.js, and cloud platforms, with proven leadership experience in agile environments.",
  "reasoning": "CANDIDATE IDENTITY: John Smith is an experienced full-stack developer with strong technical leadership skills and proven track record in enterprise software development.\n\nSTRENGTHS: Extensive experience with required tech stack (React, Node.js, AWS), proven leadership and mentoring abilities, strong problem-solving skills demonstrated through successful project deliveries, excellent communication skills.\n\nGAPS & DEVELOPMENT AREAS: Limited experience with specific domain mentioned in job requirements, no mentioned experience with CI/CD pipeline management, missing specific certifications preferred for the role.\n\nROLE MATCH REASONING: Strong technical fit with minor gaps in domain expertise. Candidate's leadership experience aligns well with team lead responsibilities. Risk is low due to strong foundational skills.\n\nHIRING RECOMMENDATION: Recommend for interview with focus on domain knowledge assessment and leadership scenarios. Strong potential for success with minimal onboarding.",
  "candidateIdentity": "John Smith is an experienced full-stack developer with strong technical leadership skills and proven track record in enterprise software development.",
  "strengths": [
    "Extensive experience with required tech stack (React, Node.js, AWS)",
    "Proven leadership and mentoring abilities", 
    "Strong problem-solving skills demonstrated through successful project deliveries",
    "Excellent communication skills evidenced by technical writing and presentations"
  ],
  "gaps": [
    "Limited experience with specific domain (healthcare/fintech) mentioned in job requirements",
    "No mentioned experience with CI/CD pipeline management",
    "Missing specific certifications preferred for the role"
  ],
  "roleMatchAnalysis": "Strong technical fit with minor gaps in domain expertise. Candidate's leadership experience aligns well with team lead responsibilities. Risk is low due to strong foundational skills.",
  "hiringRecommendation": "Recommend for interview with focus on domain knowledge assessment and leadership scenarios. Strong potential for success with minimal onboarding."
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // Using gpt-4o which is the latest stable model available
        messages: [
          {
            role: "system",
            content: "You are a professional recruitment consultant providing comprehensive candidate analysis. Analyze each candidate thoroughly and provide detailed insights about their professional background, strengths, gaps, and role fit. Be realistic but fair in your assessments."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3
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
      console.error('❌ Error in detailed scoring:', error);
      console.error('❌ Error details:', error instanceof Error ? error.message : String(error));
      
      // Return error information in the response for debugging
      return {
        overallMatch: 0,
        technicalSkills: 0,
        experience: 0,
        culturalFit: 0,
        summary: `AI processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        reasoning: `System error occurred during AI evaluation. Error: ${error instanceof Error ? error.message : String(error)}`
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