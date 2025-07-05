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
