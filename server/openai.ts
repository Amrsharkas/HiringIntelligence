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
    // Build structured job profile from all available metadata
    const employmentType = metadata?.employmentType || 'Full-time';
    const workplaceType = metadata?.workplaceType || 'On-site';
    const seniorityLevel = metadata?.seniorityLevel || 'Mid-level';
    const industry = metadata?.industry || 'Technology';
    const certifications = metadata?.certifications;
    const languagesRequired = metadata?.languagesRequired || [];
    const jobLocation = location || 'Cairo, Egypt';

    // Build language requirements string
    const languageDetails = languagesRequired.length > 0
      ? languagesRequired.map(l => `${l.language} (${l.fluency})`).join(', ')
      : 'Arabic and English preferred';

    // Define seniority-specific expectations
    const seniorityExpectations: Record<string, { yearsExp: string; leadership: string; scope: string }> = {
      'Internship': { yearsExp: 'No prior experience required', leadership: 'Learning and assisting senior team members', scope: 'Supporting tasks and gaining practical experience' },
      'Entry-level': { yearsExp: '0-1 years of experience', leadership: 'Individual contributor with guidance', scope: 'Executing assigned tasks with increasing independence' },
      'Junior': { yearsExp: '1-2 years of experience', leadership: 'Individual contributor', scope: 'Handling standard tasks with moderate supervision' },
      'Mid-level': { yearsExp: '3-5 years of experience', leadership: 'May mentor junior team members', scope: 'Independently managing projects and deliverables' },
      'Senior': { yearsExp: '5-8 years of experience', leadership: 'Leading projects and mentoring others', scope: 'Driving initiatives and making technical/strategic decisions' },
      'Lead': { yearsExp: '8+ years of experience', leadership: 'Managing teams and cross-functional collaboration', scope: 'Setting direction, architecture decisions, and team leadership' },
    };

    const seniorityDetails = seniorityExpectations[seniorityLevel] || seniorityExpectations['Mid-level'];

    const prompt = `You are creating a job description for a **${seniorityLevel} ${jobTitle}** position${companyName ? ` at ${companyName}` : ''} located in **${jobLocation}**.

=== JOB PROFILE ===
• Position: ${jobTitle}
• Seniority Level: ${seniorityLevel}
• Employment Type: ${employmentType}
• Workplace Arrangement: ${workplaceType}
• Industry: ${industry}
• Location: ${jobLocation}
${certifications ? `• Required Certifications: ${certifications}` : ''}
• Language Requirements: ${languageDetails}

=== SENIORITY CONTEXT ===
• Experience Level: ${seniorityDetails.yearsExp}
• Leadership Expectations: ${seniorityDetails.leadership}
• Role Scope: ${seniorityDetails.scope}

=== GENERATION INSTRUCTIONS ===

Generate a compelling, role-specific job description that is TAILORED to this exact position. DO NOT generate generic descriptions.

**Structure your response with these sections:**

**About the Role**
- Write a compelling 2-3 sentence hook that captures what makes this ${seniorityLevel} ${jobTitle} role exciting
- Clearly state this is a ${employmentType} ${workplaceType} position
- Mention the industry context (${industry}) naturally

**What You'll Do**
- List 5-7 key responsibilities that are SPECIFIC to a ${seniorityLevel} ${jobTitle}
- Adjust complexity based on seniority: ${seniorityLevel} means ${seniorityDetails.scope}
- For ${workplaceType} roles, mention relevant collaboration aspects (remote meetings, on-site collaboration, hybrid flexibility)
- Include responsibilities appropriate for the ${industry} industry

**What You'll Bring**
- Experience: ${seniorityDetails.yearsExp} in relevant fields
- Technical skills expected for a ${jobTitle} in ${industry}
${certifications ? `- Required: ${certifications}` : ''}
- Language proficiency: ${languageDetails}

**Why Join Us**
- Growth opportunities aligned with ${seniorityLevel} progression
- Benefits of ${workplaceType} work arrangement
- Industry positioning in ${industry}

=== TONE & STYLE ===
- Professional yet engaging, suitable for Egyptian job market
- Confident and clear, avoiding vague language
- Specific to ${industry} industry terminology and practices
- Appropriate for ${seniorityLevel} candidates (not too junior, not too senior)
- ${employmentType === 'Internship' ? 'Emphasize learning opportunities and mentorship' : employmentType === 'Freelance' || employmentType === 'Contract' ? 'Highlight project scope and flexibility' : 'Emphasize career growth and team culture'}

=== OUTPUT FORMAT ===
Use markdown formatting with **bold** headers. Keep the description focused and scannable (around 400-500 words). Make every sentence purposeful and specific to THIS role.`;

    const systemPrompt = `You are an expert talent acquisition specialist with deep knowledge of the ${industry} industry and the Egyptian job market. Your job descriptions are known for being specific, engaging, and highly effective at attracting qualified ${seniorityLevel}-level candidates.

Key principles:
- Never use generic filler text - every sentence must be specific to the role
- Match the tone and complexity to the seniority level
- Incorporate industry-specific terminology naturally
- Highlight what makes this specific opportunity compelling
- Write descriptions that qualified candidates would want to read and apply to`;

    const response = await wrapOpenAIRequest(
      () => openai.chat.completions.create({
        model: process.env.OPENAI_MODEL_JOB_DESCRIPTION || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          { role: "user", content: prompt }
        ],
        max_tokens: 1500,
      }),
      {
        requestType: "job_description_generation",
        model: process.env.OPENAI_MODEL_JOB_DESCRIPTION || "gpt-4o-mini",
        requestData: { jobTitle, companyName, location, metadata, prompt },
        metadata: { jobTitle, companyName, seniorityLevel, employmentType, workplaceType, industry }
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
    // Build structured job profile from all available metadata
    const employmentType = metadata?.employmentType || 'Full-time';
    const workplaceType = metadata?.workplaceType || 'On-site';
    const seniorityLevel = metadata?.seniorityLevel || 'Mid-level';
    const industry = metadata?.industry || 'Technology';
    const certifications = metadata?.certifications;
    const languagesRequired = metadata?.languagesRequired || [];

    // Build language requirements string
    const languageDetails = languagesRequired.length > 0
      ? languagesRequired.map(l => `${l.language} (${l.fluency})`).join(', ')
      : null;

    // Define seniority-specific requirements calibration
    const seniorityRequirements: Record<string, {
      yearsExp: string;
      education: string;
      leadershipExpectation: string;
      technicalDepth: string;
    }> = {
      'Internship': {
        yearsExp: 'No prior professional experience required',
        education: 'Currently enrolled in or recently graduated from relevant degree program',
        leadershipExpectation: 'Willingness to learn and take direction',
        technicalDepth: 'Basic understanding of fundamental concepts'
      },
      'Entry-level': {
        yearsExp: '0-1 years of relevant experience',
        education: "Bachelor's degree in relevant field or equivalent practical experience",
        leadershipExpectation: 'Self-motivated with ability to work under guidance',
        technicalDepth: 'Foundational knowledge with eagerness to develop skills'
      },
      'Junior': {
        yearsExp: '1-2 years of hands-on experience',
        education: "Bachelor's degree in relevant field",
        leadershipExpectation: 'Collaborative team player',
        technicalDepth: 'Working knowledge of core tools and methodologies'
      },
      'Mid-level': {
        yearsExp: '3-5 years of progressive experience',
        education: "Bachelor's degree required; Master's preferred",
        leadershipExpectation: 'Ability to mentor junior colleagues and work independently',
        technicalDepth: 'Strong proficiency in key technologies with proven track record'
      },
      'Senior': {
        yearsExp: '5-8 years of demonstrated expertise',
        education: "Bachelor's degree required; Master's or advanced certifications preferred",
        leadershipExpectation: 'Experience leading projects and mentoring team members',
        technicalDepth: 'Deep expertise with ability to architect solutions and make technical decisions'
      },
      'Lead': {
        yearsExp: '8+ years of extensive experience',
        education: "Bachelor's degree required; Master's or MBA strongly preferred",
        leadershipExpectation: 'Proven leadership experience managing teams and cross-functional initiatives',
        technicalDepth: 'Expert-level mastery with strategic vision and industry thought leadership'
      },
    };

    const seniorityDetails = seniorityRequirements[seniorityLevel] || seniorityRequirements['Mid-level'];

    // Build workplace-specific requirements
    const workplaceRequirements: Record<string, string> = {
      'Remote': 'Self-disciplined with excellent time management; reliable home office setup and stable internet connection; experience with remote collaboration tools',
      'Hybrid': 'Flexibility to work both on-site and remotely; ability to maintain productivity across different work environments',
      'On-site': 'Ability to commute to office location; collaborative in-person work style'
    };

    const prompt = `You are generating job requirements for a **${seniorityLevel} ${jobTitle}** position in the **${industry}** industry.

=== COMPLETE JOB PROFILE ===
• Position: ${jobTitle}
• Seniority Level: ${seniorityLevel}
• Employment Type: ${employmentType}
• Workplace: ${workplaceType}
• Industry: ${industry}
${certifications ? `• Mandatory Certifications: ${certifications}` : ''}
${languageDetails ? `• Language Requirements: ${languageDetails}` : ''}

=== SENIORITY CALIBRATION ===
• Experience Requirement: ${seniorityDetails.yearsExp}
• Education Baseline: ${seniorityDetails.education}
• Leadership Expectation: ${seniorityDetails.leadershipExpectation}
• Technical Depth: ${seniorityDetails.technicalDepth}

=== WORKPLACE REQUIREMENTS ===
${workplaceRequirements[workplaceType] || workplaceRequirements['On-site']}

${jobDescription ? `=== JOB DESCRIPTION CONTEXT ===\n${jobDescription}\n` : ''}
=== GENERATION INSTRUCTIONS ===

Generate SPECIFIC, CALIBRATED requirements for this exact role. Requirements should be REALISTIC for the Egyptian job market and appropriate for ${seniorityLevel} candidates.

**Structure your response with these sections:**

## Required Qualifications (Must-Have)

**Experience**
- Specify: ${seniorityDetails.yearsExp}
- Include industry-specific experience relevant to ${industry}
- List concrete accomplishments or project types expected at this level

**Technical Skills**
- List 5-8 core technical skills SPECIFIC to a ${jobTitle} role
- Calibrate skill depth for ${seniorityLevel} level (${seniorityDetails.technicalDepth})
- Include tools, technologies, methodologies standard in ${industry}

**Education & Certifications**
- ${seniorityDetails.education}
${certifications ? `- REQUIRED: ${certifications}` : '- List relevant certifications for this role'}

${languageDetails ? `**Language Requirements**\n- ${languageDetails}\n- Specify context: written documentation, verbal communication, client-facing, etc.` : ''}

## Preferred Qualifications (Nice-to-Have)

- Additional certifications or advanced degrees that would be advantageous
- Bonus technical skills or emerging technologies
- Industry-specific knowledge that differentiates top candidates
- 3-5 items that elevate candidates without being barriers

## Competencies & Soft Skills

- ${seniorityDetails.leadershipExpectation}
- 4-6 soft skills critical for ${industry} industry
- Skills relevant to ${workplaceType} work environment
- Communication and collaboration requirements for ${employmentType} role

=== CALIBRATION RULES ===
1. DO NOT over-inflate requirements - match ${seniorityLevel} level expectations exactly
2. DO NOT list generic requirements - every item must be relevant to ${jobTitle} in ${industry}
3. Distinguish clearly between REQUIRED (must-have for screening) and PREFERRED (nice-to-have)
4. For ${seniorityLevel} roles: ${seniorityLevel === 'Internship' || seniorityLevel === 'Entry-level' ? 'Focus on potential, foundational skills, and willingness to learn rather than extensive experience' : seniorityLevel === 'Junior' ? 'Balance foundational skills with some proven capabilities' : 'Expect demonstrated expertise and measurable achievements'}
5. ${employmentType === 'Contract' || employmentType === 'Freelance' ? 'Emphasize self-management and delivery track record' : employmentType === 'Part-time' ? 'Focus on flexibility and time management' : 'Include team collaboration and growth mindset'}

=== OUTPUT FORMAT ===
Use markdown with ## headers and bullet points. Be specific and actionable. Each requirement should help hiring managers screen candidates effectively.`;

    const systemPrompt = `You are a senior talent acquisition expert specializing in ${industry} roles in the Egyptian market. You craft requirements that are:
- Precisely calibrated to seniority level (never over-qualified or under-qualified)
- Specific to the industry and role (no generic filler)
- Realistic for the local talent market
- Structured to enable effective candidate screening

Your requirements attract the right candidates while filtering out mismatches. You understand that overly demanding requirements for junior roles drive away good candidates, while vague requirements for senior roles fail to set proper expectations.`;

    const response = await wrapOpenAIRequest(
      () => openai.chat.completions.create({
        model: process.env.OPENAI_MODEL_JOB_REQUIREMENTS || "gpt-4o",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          { role: "user", content: prompt }
        ],
        max_tokens: 1200,
      }),
      {
        requestType: "job_requirements_generation",
        model: process.env.OPENAI_MODEL_JOB_REQUIREMENTS || "gpt-4o",
        requestData: { jobTitle, jobDescription, metadata, prompt },
        metadata: { jobTitle, seniorityLevel, employmentType, workplaceType, industry }
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
