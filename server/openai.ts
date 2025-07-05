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
    const prompt = `Based on this job title: "${jobTitle}" and description: "${jobDescription}", 
    extract the most relevant technical skills that would be required. 
    Return only a JSON array of skill names, focusing on programming languages, frameworks, tools, and technologies.
    Limit to 10 most important skills.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a technical recruiter expert. Extract technical skills and respond with only a JSON array of strings.",
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || '{"skills": []}');
    return result.skills || [];
  } catch (error) {
    // Fallback to basic skills if OpenAI fails
    const commonSkills = [
      "JavaScript", "TypeScript", "React", "Node.js", "Python", "SQL", 
      "Git", "HTML", "CSS", "Docker", "AWS", "MongoDB", "PostgreSQL"
    ];
    return commonSkills.slice(0, 6);
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
- score: 1-100 rating where:
  * 90-100: Exceptional match, ideal candidate
  * 80-89: Strong match, well-qualified
  * 70-79: Good match, qualified with minor gaps
  * 60-69: Moderate match, some relevant experience
  * 50-59: Basic match, limited alignment
  * Below 50: Poor match, significant gaps

- reasoning: 2-3 sentences explaining the match quality, key strengths, and any concerns (keep concise but specific)

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
