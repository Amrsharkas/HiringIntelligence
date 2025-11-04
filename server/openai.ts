import OpenAI from "openai";
import { wrapOpenAIRequest } from "./openaiTracker";

// OpenAI client - models are configured via environment variables
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key" });

export async function generateJobDescription(
  jobTitle: string, 
  companyName?: string, 
  location?: string,
  metadata?: {
    employmentType?: string;
    workplaceType?: string;
    seniorityLevel?: string;
    industry?: string;
    certifications?: string;
    languagesRequired?: Array<{ language: string; fluency: string }>;
  }
): Promise<string> {
  try {

      
  console.log({
    openaiApiKeySet: process.env.OPENAI_API_KEY,
  });


    // Build context from metadata
    const contextParts = [];
    if (metadata?.employmentType) contextParts.push(`Employment: ${metadata.employmentType}`);
    if (metadata?.workplaceType) contextParts.push(`Work arrangement: ${metadata.workplaceType}`);
    if (metadata?.seniorityLevel) contextParts.push(`Seniority: ${metadata.seniorityLevel}`);
    if (metadata?.industry) contextParts.push(`Industry: ${metadata.industry}`);
    if (metadata?.certifications) contextParts.push(`Required certifications: ${metadata.certifications}`);
    if (metadata?.languagesRequired?.length) {
      const langStr = metadata.languagesRequired.map(l => `${l.language} (${l.fluency})`).join(', ');
      contextParts.push(`Languages required: ${langStr}`);
    }

    const context = contextParts.length > 0 ? `\n\nJob Context:\n${contextParts.join('\n')}` : '';

    const prompt = `Generate a comprehensive and engaging job description for: ${jobTitle}${companyName ? ` at ${companyName}` : ''}${location ? ` in ${location}` : ' in Cairo, Egypt'}.${context}

Create a professional job description with these sections:
1. **Company Overview** - Brief description of the company and its mission
2. **Role Summary** - What this position is about and its primary objectives  
3. **Key Responsibilities** - Main duties and accountabilities
4. **Team & Collaboration** - How this role fits within the team structure
5. **Impact & Growth** - Career development opportunities and impact on the organization

Important guidelines:
- Use friendly but professional tone suitable for Egyptian job market
- Make it specific to the ${metadata?.seniorityLevel || 'mid-level'} level
- Incorporate the ${metadata?.industry || 'technology'} industry context
- Emphasize growth opportunities and learning potential
- Keep it engaging and informative, around 3-4 paragraphs total

Write in clear, accessible language that attracts top talent.`;

    const response = await wrapOpenAIRequest(
      () => openai.chat.completions.create({
        model: process.env.OPENAI_MODEL_JOB_DESCRIPTION || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert HR professional specializing in Egyptian job market recruitment. Create compelling job descriptions that attract qualified candidates while being culturally appropriate and professionally engaging."
          },
          { role: "user", content: prompt }
        ],
        max_tokens: 1000,
      }),
      {
        requestType: "job_description_generation",
        model: process.env.OPENAI_MODEL_JOB_DESCRIPTION || "gpt-4o-mini",
        requestData: { jobTitle, companyName, location, metadata, prompt },
        metadata: { jobTitle, companyName }
      }
    );

    return response.choices[0].message.content || "";
  } catch (error) {
    throw new Error("Failed to generate job description: " + (error as Error).message);
  }
}

export async function generateJobRequirements(
  jobTitle: string, 
  jobDescription?: string,
  metadata?: {
    employmentType?: string;
    workplaceType?: string;
    seniorityLevel?: string;
    industry?: string;
    certifications?: string;
    languagesRequired?: Array<{ language: string; fluency: string }>;
  }
): Promise<string> {
  try {
    // Build context from metadata
    const contextParts = [];
    if (jobDescription) contextParts.push(`Job Description: ${jobDescription}`);
    if (metadata?.employmentType) contextParts.push(`Employment: ${metadata.employmentType}`);
    if (metadata?.workplaceType) contextParts.push(`Work arrangement: ${metadata.workplaceType}`);
    if (metadata?.seniorityLevel) contextParts.push(`Seniority: ${metadata.seniorityLevel}`);
    if (metadata?.industry) contextParts.push(`Industry: ${metadata.industry}`);
    if (metadata?.certifications) contextParts.push(`Required certifications: ${metadata.certifications}`);
    if (metadata?.languagesRequired?.length) {
      const langStr = metadata.languagesRequired.map(l => `${l.language} (${l.fluency})`).join(', ');
      contextParts.push(`Languages required: ${langStr}`);
    }

    const context = contextParts.length > 0 ? `\n\nContext:\n${contextParts.join('\n')}` : '';

    const prompt = `Generate comprehensive job requirements for: ${jobTitle} position.${context}

Create a detailed requirements list organized in these sections:

## Technical Skills & Experience
- Core technical skills needed for this role
- Experience levels required (years)
- Specific tools, technologies, or software

## Soft Skills & Competencies  
- Communication and interpersonal abilities
- Leadership or teamwork skills
- Problem-solving and analytical thinking

## Education & Certifications
- Minimum education requirements
- Preferred degrees or specializations
- Professional certifications (if applicable)

## Language Proficiency
- Language requirements with fluency levels
- Communication context (written/verbal)

Important guidelines:
- Make requirements appropriate for ${metadata?.seniorityLevel || 'mid-level'} level
- Include both mandatory and preferred qualifications
- Be specific about experience requirements
- Consider the ${metadata?.industry || 'technology'} industry standards
- Format as clear bullet points under each section
- Keep requirements realistic and achievable

Write in clear, professional language suitable for Egyptian job market.`;

    const response = await wrapOpenAIRequest(
      () => openai.chat.completions.create({
        model: process.env.OPENAI_MODEL_JOB_REQUIREMENTS || "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert HR professional specializing in creating detailed job requirements for the Egyptian market. Focus on realistic qualifications that attract qualified candidates while maintaining professional standards."
          },
          { role: "user", content: prompt }
        ],
        max_tokens: 800,
      }),
      {
        requestType: "job_requirements_generation",
        model: process.env.OPENAI_MODEL_JOB_REQUIREMENTS || "gpt-4o",
        requestData: { jobTitle, jobDescription, metadata, prompt },
        metadata: { jobTitle }
      }
    );

    return response.choices[0].message.content || "";
  } catch (error) {
    throw new Error("Failed to generate job requirements: " + (error as Error).message);
  }
}

export async function extractTechnicalSkills(jobTitle: string, jobDescription: string): Promise<string[]> {
  try {
    // Optimize prompt for faster response
    const prompt = `Job: "${jobTitle}"\nDescription: "${jobDescription.slice(0, 500)}"\n\nExtract 6-8 most relevant technical skills. Return JSON array only.`;

    const response = await wrapOpenAIRequest(
      () => openai.chat.completions.create({
        model: process.env.OPENAI_MODEL_TECHNICAL_SKILLS || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Extract technical skills from job postings. Respond with JSON format: {\"skills\": [\"skill1\", \"skill2\"]}",
          },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        max_tokens: 150, // Limit response size for speed
      }),
      {
        requestType: "technical_skills_extraction",
        model: process.env.OPENAI_MODEL_TECHNICAL_SKILLS || "gpt-4o-mini",
        requestData: { jobTitle, jobDescription, prompt },
        metadata: { jobTitle }
      }
    );

    const result = JSON.parse(response.choices[0].message.content || '{"skills": []}');
    return result.skills || [];
  } catch (error) {
    console.error("Skills extraction failed:", error);
    // Provide intelligent fallback based on job title
    const title = (jobTitle || "").toLowerCase();
    
    if (title.includes('react') || title.includes('frontend')) {
      return ['React', 'JavaScript', 'TypeScript', 'CSS', 'HTML', 'Git'];
    }
    if (title.includes('backend') || title.includes('api') || title.includes('server')) {
      return ['Node.js', 'Python', 'SQL', 'REST API', 'Git', 'Docker'];
    }
    if (title.includes('fullstack') || title.includes('full-stack')) {
      return ['JavaScript', 'React', 'Node.js', 'SQL', 'Git', 'TypeScript'];
    }
    if (title.includes('data') || title.includes('analyst')) {
      return ['Python', 'SQL', 'Excel', 'Tableau', 'R'];
    }
    if (title.includes('devops') || title.includes('cloud')) {
      return ['AWS', 'Docker', 'Kubernetes', 'Linux', 'Git'];
    }
    if (title.includes('mobile')) {
      return ['React Native', 'Swift', 'Kotlin', 'Flutter'];
    }
    
    // Generic fallback
    return ['JavaScript', 'Python', 'SQL', 'Git', 'Communication'];
  }
}

export async function formatUserProfile(rawProfile: string): Promise<string> {
  try {
    const prompt = `Take this raw candidate profile and format it professionally with proper styling:

"${rawProfile}"

Requirements:
- Use **bold** for important sections like experience, skills, education
- Use *italics* for emphasis on key achievements or specializations  
- Use clear sections with line breaks
- Highlight years of experience, key technologies, and achievements
- Make it scannable and professional
- Keep all original information but improve readability
- Maximum 300 words

Return only the formatted profile text with markdown styling.`;

    const response = await wrapOpenAIRequest(
      () => openai.chat.completions.create({
        model: process.env.OPENAI_MODEL_USER_PROFILE_FORMAT || "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 400,
      }),
      {
        requestType: "user_profile_formatting",
        model: process.env.OPENAI_MODEL_USER_PROFILE_FORMAT || "gpt-4o",
        requestData: { rawProfile, prompt },
        metadata: { profileLength: rawProfile.length }
      }
    );

    return response.choices[0].message.content || rawProfile;
  } catch (error) {
    console.error("Failed to format user profile:", error);
    return rawProfile; // Return original if formatting fails
  }
}

export async function generateCandidateMatchRating(
  candidate: any,
  job: any
): Promise<{ score: number; reasoning: string; skillGaps?: string[]; strengths?: string[] }> {
  try {
    // Use the complete user profile from Airtable for comprehensive analysis
    const userProfile = candidate.userProfile || candidate.rawData?.['User profile'] || '';
    
    const prompt = `You are an EXTREMELY STRICT recruiter. Be brutally honest. Do NOT inflate scores. A candidate needs SUBSTANTIAL qualifications to score well.

JOB POSTING DETAILS:
- Title: ${job.title}
- Description: ${job.description}
- Requirements: ${job.requirements || 'Not specified'}
- Location: ${job.location || 'Not specified'}
- Technical Skills Required: ${job.technicalSkills?.join(', ') || 'Not specified'}
- Salary Range: ${job.salaryRange || 'Not specified'}

CANDIDATE PROFILE:
Name: ${candidate.name}

Complete User Profile:
${userProfile}

STRICT SCORING RULES - BE BRUTAL AND HONEST:
- Empty/minimal profiles (like just "rower" or single words): 5-15 points
- No relevant experience or skills: 10-25 points
- Minimal relevant experience with major gaps: 25-40 points
- Some relevant experience but notable gaps: 40-55 points
- Good relevant experience with minor gaps: 55-70 points
- Strong qualifications meeting most requirements: 70-80 points
- Exceptional candidates exceeding most requirements: 80-90 points
- Perfect match with all requirements exceeded: 90-95 points

CRITICAL EVALUATION:
- If the profile has no substantial information, score 5-15
- If there's no relevant experience for this specific job, score 10-25
- If there are major skill gaps, be honest about low scores
- Only give high scores (70+) to truly qualified candidates
- Be HARSH and REALISTIC

Examples of LOW scores:
- Profile with just "rower" for marketing job = 8-12 points
- No relevant skills or experience = 10-20 points
- Wrong industry/field = 15-25 points

Respond with JSON in this exact format: { "score": number, "reasoning": "honest explanation of why this specific score was given" }`;

    const response = await wrapOpenAIRequest(
      () => openai.chat.completions.create({
        model: process.env.OPENAI_MODEL_CANDIDATE_MATCH_RATING || "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an EXTREMELY STRICT recruiter who gives brutally honest assessments. Do NOT inflate scores. Be harsh and realistic. Candidates with minimal or irrelevant information should get very low scores (5-25). Only exceptional candidates deserve high scores (75+)."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
      }),
      {
        requestType: "candidate_match_rating",
        model: process.env.OPENAI_MODEL_CANDIDATE_MATCH_RATING || "gpt-4o",
        requestData: { candidate, job, prompt },
        metadata: { candidateName: candidate.name, jobTitle: job.title }
      }
    );

    const result = JSON.parse(response.choices[0].message.content || '{"score": 50, "reasoning": "Analysis unavailable"}');
    
    return {
      score: Math.max(1, Math.min(100, result.score || 50)),
      reasoning: result.reasoning || "Match analysis completed using comprehensive profile review.",
      skillGaps: result.skillGaps || [],
      strengths: result.strengths || []
    };

  } catch (error) {
    console.error("Error generating candidate match rating:", error);
    return {
      score: 50,
      reasoning: "Error occurred during candidate analysis. Manual review recommended."
    };
  }
}

export async function analyzeApplicantProfile(
  applicantData: {
    name: string;
    email: string;
    experience?: string;
    skills?: string;
    resume?: string;
    coverLetter?: string;
    location?: string;
    salaryExpectation?: string;
  },
  jobTitle: string,
  jobDescription: string,
  requiredSkills?: string
): Promise<{ profileScore: number; analysis: string; strengths: string[]; improvements: string[] }> {
  try {
    const profile = `
    Name: ${applicantData.name}
    Email: ${applicantData.email}
    Location: ${applicantData.location || 'Not specified'}
    Experience: ${applicantData.experience || 'Not provided'}
    Skills: ${applicantData.skills || 'Not listed'}
    Salary Expectation: ${applicantData.salaryExpectation || 'Not specified'}
    Resume/Background: ${applicantData.resume || 'Not provided'}
    Cover Letter: ${applicantData.coverLetter || 'Not provided'}
    `;

    const prompt = `
    You are an EXTREMELY STRICT and HONEST recruiter. Evaluate this applicant with brutal honesty. DO NOT inflate scores.
    
    JOB DETAILS:
    Position: ${jobTitle}
    Description: ${jobDescription}
    Required Skills: ${requiredSkills || 'Not specified'}
    
    APPLICANT PROFILE:
    ${profile}
    
    STRICT SCORING CRITERIA:
    - Empty/minimal profiles (like just "rower"): 5-15 points
    - No relevant experience: 10-25 points  
    - Some relevant skills but major gaps: 25-45 points
    - Good skills with minor gaps: 45-65 points
    - Strong qualifications: 65-80 points
    - Exceptional fit: 80-90 points
    - Perfect match: 90-95 points
    
    Be BRUTALLY HONEST. If the profile lacks substance, information, or relevant experience, give a very low score.
    
    Respond in JSON format: {
      "profileScore": number,
      "analysis": "honest, direct analysis explaining the low/high score",
      "strengths": ["actual strengths found, empty array if none"],
      "improvements": ["specific areas needing improvement"]
    }
    `;

    const response = await wrapOpenAIRequest(
      () => openai.chat.completions.create({
        model: process.env.OPENAI_MODEL_APPLICANT_PROFILE_ANALYSIS || "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
      {
        requestType: "applicant_profile_analysis",
        model: process.env.OPENAI_MODEL_APPLICANT_PROFILE_ANALYSIS || "gpt-4o",
        requestData: { applicantData, jobTitle, jobDescription, requiredSkills, prompt },
        metadata: { jobTitle, applicantName: applicantData.name }
      }
    );

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      profileScore: Math.max(1, Math.min(100, result.profileScore || 50)),
      analysis: result.analysis || "Analysis unavailable",
      strengths: Array.isArray(result.strengths) ? result.strengths : ["Profile analysis pending"],
      improvements: Array.isArray(result.improvements) ? result.improvements : ["Assessment in progress"]
    };
  } catch (error) {
    console.error("Error analyzing applicant profile:", error);
    return {
      profileScore: 50,
      analysis: "Error analyzing applicant profile",
      strengths: ["Unable to analyze at this time"],
      improvements: ["Profile analysis failed"]
    };
  }
}

export async function generateEmployerQuestions(jobTitle: string, jobDescription?: string, requirements?: string): Promise<string[]> {
  try {
    const prompt = `Generate 3-5 thoughtful, open-ended employer questions for candidates applying to this position:

Job Title: ${jobTitle}
${jobDescription ? `Job Description: ${jobDescription}` : ''}
${requirements ? `Requirements: ${requirements}` : ''}

Create questions that:
- Are specific to this role and industry
- Help assess both technical competency and cultural fit
- Encourage candidates to provide detailed, thoughtful responses
- Go beyond what's already covered in a resume
- Help identify passion, problem-solving ability, and relevant experience

Examples of good questions:
- "Describe a challenging project where you had to [specific skill]. What was your approach and what did you learn?"
- "What interests you most about this role, and how does it align with your career goals?"
- "Tell us about a time when you had to learn a new technology/skill quickly. How did you approach it?"

Respond with JSON in this format: { "questions": ["question1", "question2", "question3"] }`;

    const response = await wrapOpenAIRequest(
      () => openai.chat.completions.create({
        model: process.env.OPENAI_MODEL_EMPLOYER_QUESTIONS || "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert HR professional specializing in interview question design. Generate thoughtful, role-specific employer questions that help identify the best candidates."
          },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        max_tokens: 800,
      }),
      {
        requestType: "employer_questions_generation",
        model: process.env.OPENAI_MODEL_EMPLOYER_QUESTIONS || "gpt-4o",
        requestData: { jobTitle, jobDescription, requirements, prompt },
        metadata: { jobTitle }
      }
    );

    const result = JSON.parse(response.choices[0].message.content || '{"questions": []}');
    return result.questions || [];
  } catch (error) {
    console.error("Error generating employer questions:", error);
    // Provide fallback questions based on job title
    const title = (jobTitle || "").toLowerCase();
    
    if (title.includes('developer') || title.includes('engineer')) {
      return [
        "Describe a challenging technical problem you solved recently. What was your approach?",
        "How do you stay current with new technologies and best practices in your field?",
        "Tell us about a time when you had to work with a difficult codebase or legacy system."
      ];
    }
    if (title.includes('manager') || title.includes('lead')) {
      return [
        "Describe your approach to managing team conflicts and ensuring productive collaboration.",
        "How do you prioritize competing demands and communicate decisions to stakeholders?",
        "Tell us about a time when you had to lead a team through a significant change."
      ];
    }
    if (title.includes('sales') || title.includes('marketing')) {
      return [
        "Describe a challenging sales situation and how you overcame objections to close the deal.",
        "How do you approach building relationships with new clients or customers?",
        "What strategies do you use to stay motivated during difficult periods?"
      ];
    }
    
    // Generic fallback questions
    return [
      "What interests you most about this role and our company?",
      "Describe a challenging situation you faced at work and how you handled it.",
      "Where do you see yourself in your career in the next 2-3 years?"
    ];
  }
}
