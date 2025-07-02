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
): Promise<{ score: number; reasoning: string; skillGaps: string[]; strengths?: string[] }> {
  try {
    // Build comprehensive candidate profile for analysis
    const candidateProfile = `
    Name: ${candidate.name}
    Previous Role: ${candidate.previousRole || 'Not specified'}
    Years of Experience: ${candidate.yearsExperience || 'Not specified'}
    Location: ${candidate.location || 'Not specified'}
    Summary/Bio: ${candidate.summary || 'Not provided'}
    Technical Skills: ${candidate.technicalSkills?.join(', ') || candidate.skills?.join(', ') || 'Not specified'}
    Soft Skills: ${candidate.softSkills?.join(', ') || 'Not specified'}
    Education: ${candidate.education || 'Not specified'}
    Previous Experience: ${candidate.experience || 'Not specified'}
    Interview Score: ${candidate.interviewScore || 'Not available'}
    Salary Expectation: ${candidate.salaryExpectation || 'Not specified'}
    Portfolio: ${candidate.portfolio || 'Not provided'}
    Additional Notes: ${candidate.notes || 'None'}
    `;

    const jobProfile = `
    Job Title: ${job.title}
    Location: ${job.location || 'Not specified'}
    Salary Range: ${job.salaryRange || 'Not specified'}
    Job Description: ${job.description}
    Job Requirements: ${job.requirements}
    Required Technical Skills: ${job.technicalSkills?.join(', ') || 'Not specified'}
    Required Soft Skills: ${job.softSkills?.join(', ') || 'Not specified'}
    `;

    const prompt = `You are an expert recruiter analyzing candidate-job fit. Rate this candidate for the job on a scale of 1-100.

    JOB DETAILS:
    ${jobProfile}

    CANDIDATE PROFILE:
    ${candidateProfile}

    Analyze the following factors:
    1. Skills alignment (technical and soft skills match)
    2. Experience level and relevance
    3. Location compatibility
    4. Salary expectations vs. job offer
    5. Overall profile quality and interview performance
    6. Cultural fit indicators

    Provide a detailed analysis in JSON format with:
    - score (1-100, where 90+ is exceptional match, 70-89 is good match, 50-69 is moderate match, 30-49 is poor match, below 30 is not suitable)
    - reasoning (3-4 sentences explaining the match quality, highlighting strengths and concerns)
    - skillGaps (array of specific missing or weak skills/qualifications)
    - strengths (array of candidate's key strengths for this role)`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert recruiter. Analyze candidate-job fit and respond with JSON.",
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || '{"score": 50, "reasoning": "Analysis unavailable", "skillGaps": [], "strengths": []}');
    
    return {
      score: Math.max(1, Math.min(100, result.score || 50)),
      reasoning: result.reasoning || "Match analysis completed",
      skillGaps: result.skillGaps || [],
      strengths: result.strengths || []
    };
  } catch (error) {
    // Fallback scoring based on simple skill matching
    const candidateSkills = candidate.skills || [];
    const requiredSkills = [...(job.technicalSkills || []), ...(job.softSkills || [])];
    const matchingSkills = candidateSkills.filter((skill: string) => 
      requiredSkills.some(req => req.toLowerCase().includes(skill.toLowerCase()))
    );
    const score = Math.min(95, Math.max(30, (matchingSkills.length / requiredSkills.length) * 100));
    
    return {
      score: Math.round(score),
      reasoning: `Candidate matches ${matchingSkills.length} out of ${requiredSkills.length} key requirements.`,
      skillGaps: requiredSkills.filter(skill => 
        !candidateSkills.some((cSkill: string) => cSkill.toLowerCase().includes(skill.toLowerCase()))
      ),
      strengths: matchingSkills
    };
  }
}
