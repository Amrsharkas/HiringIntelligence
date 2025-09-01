import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ProcessedResume {
  name: string;
  email: string;
  phone: string;
  summary: string;
  experience: string[];
  skills: string[];
  education: string[];
  certifications: string[];
  languages: string[];
}

export interface JobMatchScore {
  overallScore: number;
  technicalSkillsScore: number;
  experienceScore: number;
  culturalFitScore: number;
  matchSummary: string;
  strengthsHighlights: string[];
  improvementAreas: string[];
}

export class ResumeProcessingService {
  async processResume(resumeText: string): Promise<ProcessedResume> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `You are an expert resume analyzer. Extract structured information from the resume text and provide a comprehensive profile. 

Respond with JSON in this exact format:
{
  "name": "Full Name",
  "email": "email@example.com",
  "phone": "+1234567890",
  "summary": "Brief professional summary (2-3 sentences)",
  "experience": ["Job title at Company (2020-2023): Description", "Another role..."],
  "skills": ["Skill 1", "Skill 2", "Technical skills", "Software tools"],
  "education": ["Degree in Field from University (Year)", "Certification name"],
  "certifications": ["Professional certification 1", "License 2"],
  "languages": ["English (Native)", "Arabic (Fluent)", "French (Intermediate)"]
}

Extract all relevant information. If any field is missing, use an empty string for strings or empty array for arrays.`
          },
          {
            role: "user",
            content: `Analyze this resume and extract structured information:\n\n${resumeText}`
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 1500,
      });

      const result = JSON.parse(response.choices[0].message.content!);
      
      return {
        name: result.name || "Unknown",
        email: result.email || "",
        phone: result.phone || "",
        summary: result.summary || "",
        experience: Array.isArray(result.experience) ? result.experience : [],
        skills: Array.isArray(result.skills) ? result.skills : [],
        education: Array.isArray(result.education) ? result.education : [],
        certifications: Array.isArray(result.certifications) ? result.certifications : [],
        languages: Array.isArray(result.languages) ? result.languages : [],
      };
    } catch (error) {
      console.error("Error processing resume:", error);
      throw new Error("Failed to process resume with AI");
    }
  }

  async processBulkResumes(resumesText: string): Promise<ProcessedResume[]> {
    // Split resumes by the separator "---"
    const resumeTexts = resumesText
      .split("---")
      .map(text => text.trim())
      .filter(text => text.length > 50); // Filter out very short texts

    const results: ProcessedResume[] = [];
    
    for (const resumeText of resumeTexts) {
      try {
        const processed = await this.processResume(resumeText);
        results.push(processed);
      } catch (error) {
        console.error("Error processing individual resume:", error);
        // Continue processing other resumes
      }
    }

    return results;
  }

  async scoreResumeAgainstJob(
    resume: ProcessedResume, 
    jobTitle: string, 
    jobDescription: string, 
    jobRequirements: string
  ): Promise<JobMatchScore> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `You are an expert hiring manager. Analyze how well a candidate's resume matches a specific job posting. Be brutally honest in your scoring - most candidates should score between 5-25% unless they are genuinely exceptional matches.

Respond with JSON in this exact format:
{
  "overallScore": 15,
  "technicalSkillsScore": 12,
  "experienceScore": 18,
  "culturalFitScore": 15,
  "matchSummary": "Brief 2-3 sentence summary of the match quality",
  "strengthsHighlights": ["Strength 1", "Strength 2", "Strength 3"],
  "improvementAreas": ["Gap 1", "Missing skill 2", "Need more experience in 3"]
}

Scoring Guidelines:
- 80-100%: Perfect match, exceptional candidate
- 60-79%: Strong match with minor gaps
- 40-59%: Decent match with some important gaps
- 20-39%: Weak match with significant gaps
- 5-19%: Poor match, major misalignment
- 0-4%: Completely unqualified

Be harsh but fair. Most candidates should fall in the 5-25% range.`
          },
          {
            role: "user",
            content: `Score this candidate against the job:

JOB TITLE: ${jobTitle}

JOB DESCRIPTION:
${jobDescription}

JOB REQUIREMENTS:
${jobRequirements}

CANDIDATE PROFILE:
Name: ${resume.name}
Summary: ${resume.summary}
Skills: ${resume.skills.join(", ")}
Experience: ${resume.experience.join(" | ")}
Education: ${resume.education.join(" | ")}
Certifications: ${resume.certifications.join(" | ")}
Languages: ${resume.languages.join(" | ")}

Provide brutal honesty in scoring. Most candidates should score low (5-25%) unless genuinely exceptional.`
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 800,
      });

      const result = JSON.parse(response.choices[0].message.content!);
      
      return {
        overallScore: Math.max(0, Math.min(100, result.overallScore || 5)),
        technicalSkillsScore: Math.max(0, Math.min(100, result.technicalSkillsScore || 5)),
        experienceScore: Math.max(0, Math.min(100, result.experienceScore || 5)),
        culturalFitScore: Math.max(0, Math.min(100, result.culturalFitScore || 5)),
        matchSummary: result.matchSummary || "No match summary available",
        strengthsHighlights: Array.isArray(result.strengthsHighlights) ? result.strengthsHighlights : [],
        improvementAreas: Array.isArray(result.improvementAreas) ? result.improvementAreas : [],
      };
    } catch (error) {
      console.error("Error scoring resume against job:", error);
      throw new Error("Failed to score resume against job");
    }
  }
}

export const resumeProcessingService = new ResumeProcessingService();