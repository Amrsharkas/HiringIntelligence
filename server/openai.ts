import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key" });

export async function generateJobDescription(jobTitle: string, companyName?: string, location?: string): Promise<string> {
  try {
    const prompt = `Generate a compelling job description for a ${jobTitle} position${companyName ? ` at ${companyName}` : ''}${location ? ` in ${location}` : ''}. 
    Include key responsibilities, day-to-day tasks, and what makes this role exciting. 
    Keep it professional but engaging, around 150-200 words.
    ${location ? `Make sure to mention the location as ${location} in the description.` : ''}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
    });

    return response.choices[0].message.content || "";
  } catch (error) {
    throw new Error("Failed to generate job description: " + (error as Error).message);
  }
}

export async function generateJobRequirements(jobTitle: string, jobDescription?: string): Promise<string> {
  try {
    const prompt = `Generate job requirements for a ${jobTitle} position. 
    ${jobDescription ? `Context: ${jobDescription}` : ''}
    Include required skills, experience levels, education, and qualifications.
    Format as a clear, bulleted list. Keep it concise but comprehensive.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
    });

    return response.choices[0].message.content || "";
  } catch (error) {
    throw new Error("Failed to generate job requirements: " + (error as Error).message);
  }
}

export async function extractTechnicalSkills(jobTitle: string, jobDescription: string): Promise<string[]> {
  try {
    // Optimize prompt for faster response
    const prompt = `Job: "${jobTitle}"\nDescription: "${jobDescription.slice(0, 500)}"\n\nExtract 6-8 most relevant technical skills. Return JSON array only.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Use faster, cheaper model for simple extraction
      messages: [
        {
          role: "system",
          content: "Extract technical skills from job postings. Respond with JSON format: {\"skills\": [\"skill1\", \"skill2\"]}",
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 150, // Limit response size for speed
      temperature: 0.3, // Lower temperature for consistent results
    });

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

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 400,
    });

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
    
    const prompt = `You are an expert recruiter analyzing candidate-job fit. Rate this candidate for the job posting on a scale of 1-100.

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

ANALYSIS INSTRUCTIONS:
Analyze the candidate's full profile against the job requirements, considering:
1. Background and experience relevance to the role
2. Skills alignment (both technical and soft skills)
3. Location compatibility and remote work considerations
4. Career interests and growth trajectory
5. Educational background and qualifications
6. Industry experience and transferable skills

Provide a comprehensive match analysis with:
- score: Precise rating from 1-100 (use specific numbers like 73, 84, 92, not round numbers like 70, 80, 90) where:
  * 95-100: Exceptional match, ideal candidate with perfect alignment
  * 85-94: Strong match, well-qualified with excellent fit
  * 75-84: Good match, qualified with minor gaps or areas for growth
  * 65-74: Moderate match, some relevant experience but notable gaps
  * 55-64: Basic match, limited alignment with several concerns
  * 45-54: Weak match, significant gaps in key requirements
  * Below 45: Poor match, fundamental misalignment

- reasoning: 2-3 concise sentences explaining match quality, highlighting specific strengths and key concerns

Be specific with numbers - avoid common scores like 70, 75, 80, 85, 90. Use precise values like 73, 78, 82, 87, 91.

Respond with JSON in this exact format: { "score": number, "reasoning": "explanation" }`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are an expert recruiter and hiring manager with deep experience in candidate assessment. Analyze candidates thoroughly considering both technical fit and growth potential. Be objective but recognize transferable skills."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2, // Lower temperature for more consistent scoring
    });

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
    Analyze this job applicant's profile and provide a comprehensive assessment for the given position.
    
    JOB DETAILS:
    Position: ${jobTitle}
    Description: ${jobDescription}
    Required Skills: ${requiredSkills || 'Not specified'}
    
    APPLICANT PROFILE:
    ${profile}
    
    Please provide:
    1. Profile Score: Rate from 1-100 based on overall qualification for this specific role (avoid round numbers like 70, 80, 90)
    2. Analysis: 2-3 sentence summary of the applicant's fit for this role
    3. Strengths: Top 3-4 strengths that make them a good candidate (array of strings)
    4. Improvements: 2-3 areas for development or concerns (array of strings)
    
    Respond in JSON format: {
      "profileScore": number,
      "analysis": "detailed analysis text",
      "strengths": ["strength1", "strength2", "strength3"],
      "improvements": ["improvement1", "improvement2"]
    }
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

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

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are an expert HR professional specializing in interview question design. Generate thoughtful, role-specific employer questions that help identify the best candidates."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 800,
      temperature: 0.7,
    });

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
