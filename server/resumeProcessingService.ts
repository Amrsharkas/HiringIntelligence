import OpenAI from "openai";
import { toFile } from "openai/uploads";
import { wrapOpenAIRequest } from "./openaiTracker";

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
  fileId?: string;
}

export interface JobMatchScore {
  overallScore: number;
  technicalSkillsScore: number;
  experienceScore: number;
  culturalFitScore: number;
  matchSummary: string;
  strengthsHighlights: string[];
  improvementAreas: string[];
  detailedBreakdown?: {
    technicalSkills: Array<{
      requirement: string;
      present: boolean | 'partial';
      evidence: string;
      gapPercentage: number;
      missingDetail: string;
    }>;
    experience: Array<{
      requirement: string;
      present: boolean | 'partial';
      evidence: string;
      gapPercentage: number;
      missingDetail: string;
    }>;
    educationAndCertifications: Array<{
      requirement: string;
      present: boolean | 'partial';
      evidence: string;
      gapPercentage: number;
      missingDetail: string;
    }>;
    culturalFitAndSoftSkills: Array<{
      requirement: string;
      present: boolean | 'partial';
      evidence: string;
      gapPercentage: number;
      missingDetail: string;
    }>;
  };
}

export class ResumeProcessingService {
  private extractJsonObject(raw: string): any {
    const trimmed = (raw || '').trim();
    try {
      return JSON.parse(trimmed);
    } catch {}
    const first = trimmed.indexOf('{');
    if (first === -1) throw new Error('No JSON object found in text');
    let depth = 0;
    for (let i = first; i < trimmed.length; i++) {
      const ch = trimmed[i];
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          const candidate = trimmed.slice(first, i + 1);
          try { return JSON.parse(candidate); } catch {}
          break;
        }
      }
    }
    throw new Error('Failed to extract valid JSON object from text');
  }
  private async extractTextFromFile(fileData: string, fileType: string): Promise<{ text: string; fileId?: string }> {
    console.log(`🔄 Extracting text from file type: ${fileType}, data length: ${fileData?.length}`);
    
    // Use OpenAI Files + Responses API to extract text from PDFs and Word docs
    if (
      fileType === 'application/pdf' ||
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileType === 'application/msword'
    ) {
      try {
        const buffer = Buffer.from(fileData, 'base64');
        const inferredName = fileType === 'application/pdf' ? 'resume.pdf'
          : fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ? 'resume.docx'
          : 'resume.doc';

        console.log('📤 Uploading file to OpenAI Files API for text extraction...');
        const uploaded = await openai.files.create({
          file: await toFile(buffer, inferredName),
          purpose: 'assistants'
        });

        console.log(`🔎 Requesting text extraction via Responses API for file ${uploaded.id} (${inferredName})`);
        const response: any = await (openai as any).responses.create({
          model: 'gpt-5',
          input: [
            {
              role: 'user',
              content: [
                { type: 'input_text', text: 'Extract all readable text from the attached resume file and return plain text only. Preserve natural reading order; omit images and formatting artifacts.' },
                { type: 'input_file', file_id: uploaded.id }
              ]
            }
          ],
          max_output_tokens: 4000
        });

        // Best-effort extraction of text from Responses API
        const extractedText = response?.output_text
          || response?.output?.flatMap((o: any) => o?.content || [])
              .map((c: any) => c?.text?.value || '')
              .join('\n')
          || '';

        if (!extractedText || extractedText.trim().length < 50) {
          throw new Error('Insufficient text extracted from file');
        }

        console.log(`✅ File text extraction successful. Length: ${extractedText.length}`);
        return { text: extractedText, fileId: uploaded.id };
      } catch (error) {
        console.error('File-to-text extraction failed via Files API:', error);
        throw new Error(`Unable to extract text from file using OpenAI Files API: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // For plain text-like files, return as-is
    return { text: fileData };
  }

  async processResume(resumeText: string, fileType?: string): Promise<ProcessedResume> {
    try {
      // Extract text from file if needed
      console.log(`🔄 Starting resume processing. File type: ${fileType}, text length: ${resumeText?.length}`);
      const extraction = fileType ? await this.extractTextFromFile(resumeText, fileType) : { text: resumeText };
      const extractedText = extraction.text;
      console.log(`📄 Text extraction complete. Extracted length: ${extractedText?.length}`);
      
      const baseMessages = [
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
            content: `Analyze this resume and extract structured information:\n\n${extractedText}`
          }
      ] as const;

      const response = await wrapOpenAIRequest(
        () => openai.chat.completions.create({
          model: "gpt-4o",
          messages: baseMessages as any,
          response_format: { type: "json_object" },
          max_tokens: 1500,
        }),
        {
          requestType: "resume_processing",
          model: "gpt-4o",
          requestData: { extractedText: extractedText.substring(0, 500), baseMessages: baseMessages.slice(0, 2) },
          metadata: { textLength: extractedText.length }
        }
      );

      const rawContent = response.choices?.[0]?.message?.content || '';
      if (!rawContent || rawContent.trim().length === 0) {
        console.warn("Model returned empty content for resume processing. Retrying without response_format...");
        const retry = await wrapOpenAIRequest(
          () => openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              ...baseMessages,
              { role: "system", content: "Return ONLY a valid JSON object. No markdown, no commentary." }
            ] as any,
            temperature: 0,
            max_tokens: 1500,
          }),
          {
            requestType: "resume_processing_retry",
            model: "gpt-4o",
            requestData: { extractedText: extractedText.substring(0, 500), retry: true },
            metadata: { textLength: extractedText.length, isRetry: true }
          }
        );
        const retryContent = retry.choices?.[0]?.message?.content || '';
        if (!retryContent || retryContent.trim().length === 0) {
          console.error("Second attempt also returned empty content.", { responseId: retry.id });
          throw new Error("Empty JSON response from model while processing resume (after retry)");
        }
        let resultRetry;
        try {
          resultRetry = this.extractJsonObject(retryContent);
        } catch (parseErr) {
          console.error("Retry content not valid JSON.", { sample: retryContent.slice(0, 400) });
          throw new Error("Invalid JSON returned by model while processing resume (after retry)");
        }
        return {
          name: resultRetry.name || "Unknown",
          email: resultRetry.email || "",
          phone: resultRetry.phone || "",
          summary: resultRetry.summary || "",
          experience: Array.isArray(resultRetry.experience) ? resultRetry.experience : [],
          skills: Array.isArray(resultRetry.skills) ? resultRetry.skills : [],
          education: Array.isArray(resultRetry.education) ? resultRetry.education : [],
          certifications: Array.isArray(resultRetry.certifications) ? resultRetry.certifications : [],
          languages: Array.isArray(resultRetry.languages) ? resultRetry.languages : [],
        };
      }
      let result: any;
      try {
        result = this.extractJsonObject(rawContent);
      } catch (parseError) {
        console.warn("First parse failed. Retrying request without response_format...");
        const retry = await wrapOpenAIRequest(
          () => openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              ...baseMessages,
              { role: "system", content: "Return ONLY a valid JSON object. No markdown, no commentary." }
            ] as any,
            temperature: 0,
            max_tokens: 1500,
          }),
          {
            requestType: "resume_processing_parse_retry",
            model: "gpt-4o",
            requestData: { extractedText: extractedText.substring(0, 500), retry: true, parseError: true },
            metadata: { textLength: extractedText.length, isRetry: true, parseError: true }
          }
        );
        const retryContent = retry.choices?.[0]?.message?.content || '';
        try {
          result = this.extractJsonObject(retryContent);
        } catch (retryParseError) {
          console.error("Failed to parse retry content.", { sample: retryContent.slice(0, 400) });
          throw new Error("Invalid JSON returned by model while processing resume (after retry)");
        }
      }
      
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
        fileId: extraction.fileId,
      };
    } catch (error) {
      console.error("Error processing resume:", error);
      console.error("Error details:", error instanceof Error ? error.message : error);
      throw new Error(`Failed to process resume with AI: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      const response = await wrapOpenAIRequest(
        () => openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `You are an expert hiring manager and resume evaluator. Your task is to analyze how well a candidate's resume matches a specific job posting and create a scoring profile that reflects the complete truth. Do not inflate scores, do not soften gaps, and do not add compliments. Your evaluation must be a factual mirror of the job description versus the CV, backed only by what is explicitly present in the CV.

If something is missing or only partially satisfied, highlight it clearly with exact detail from the job requirements and what the CV fails to provide. All percentages and scores must be fully justified with proof from the CV.

Your response MUST be in this exact JSON format:
{
  \"overallScore\": 0-100,
  \"technicalSkillsScore\": 0-100,
  \"experienceScore\": 0-100,
  \"culturalFitScore\": 0-100,
  \"matchSummary\": \"Brief 2-3 sentence summary of match quality, describing exact alignment and gaps without exaggeration\",
  \"strengthsHighlights\": [\"Strength 1 with CV evidence\", \"Strength 2 with CV evidence\", \"Strength 3 with CV evidence\"],
  \"improvementAreas\": [\"Gap 1 with exact missing detail from job posting\", \"Gap 2 with exact missing detail from job posting\", \"Gap 3 with exact missing detail from job posting\"],
  \"detailedBreakdown\": {
    \"technicalSkills\": [
      {
        \"requirement\": \"Exact requirement from job description\",
        \"present\": true|false|partial,
        \"evidence\": \"What the CV shows (quote or paraphrase)\",
        \"gapPercentage\": 0-100,
        \"missingDetail\": \"If incomplete, state exactly what is missing in plain terms (e.g., 'Job requires Django, CV only shows Flask')\"
      }
    ],
    \"experience\": [
      {
        \"requirement\": \"e.g., '5 years of backend development'\",
        \"present\": true|false|partial,
        \"evidence\": \"What the CV shows (e.g., '3 years backend at Company X')\",
        \"gapPercentage\": 0-100,
        \"missingDetail\": \"Explain exactly how much or what kind of experience is missing (e.g., '2 years less experience than required, no leadership role')\"
      }
    ],
    \"educationAndCertifications\": [
      {
        \"requirement\": \"e.g., 'Bachelor's in Computer Science'\",
        \"present\": true|false|partial,
        \"evidence\": \"What the CV shows\",
        \"gapPercentage\": 0-100,
        \"missingDetail\": \"If not satisfied, state exact gap (e.g., 'Bachelor's in IT, but Computer Science required')\"
      }
    ],
    \"culturalFitAndSoftSkills\": [
      {
        \"requirement\": \"e.g., 'Strong teamwork and leadership skills'\",
        \"present\": true|false|partial,
        \"evidence\": \"Examples from CV, or lack thereof\",
        \"gapPercentage\": 0-100,
        \"missingDetail\": \"If missing, explain clearly (e.g., 'No teamwork or collaboration evidence provided')\"
      }
    ]
  }
}

### Scoring Guidelines & Weighting:
- OverallScore = (TechnicalSkills 40%) + (Experience 40%) + (CulturalFit 20%).
- Scores must reflect only what is actually supported by CV evidence compared against the job description.
- TechnicalSkillsScore: Based only on technical skills explicitly listed in the job description. Partial credit allowed only when the CV shows transferable skills that realistically apply.
- ExperienceScore: Based on years, industry/domain, level of responsibility, and relevance. Partial credit if similar but not exact.
- CulturalFitScore: Based only on CV evidence of teamwork, leadership, communication, adaptability, or values mentioned in the job posting. No assumptions if not shown.
- Gap Percentages: Must clearly state what portion is missing and why (e.g., required 5 years, candidate has 3 = 40% gap). Each missingDetail must reference the job posting requirement.

### Match Legend:
- 90–100: Meets or exceeds nearly all requirements with full supporting evidence.
- 75–89: Meets most requirements, only minor missing details.
- 60–74: Several gaps but has solid evidence of transferable strengths.
- 40–59: Many important gaps; limited direct alignment.
- 20–39: Very poor match; only a few requirements covered.
- 0–19: Not qualified; no realistic alignment with requirements.

### Key Instructions:
- This is not about being harsh or generous — it is about being accurate, realistic, and reliable.
- Every requirement in the job posting must be represented in detailedBreakdown with present/partial/missing status, CV evidence, and missingDetail explanation.
- MatchSummary must give an honest, factual overview.
- StrengthsHighlights must come directly from the CV and align with job requirements.
- ImprovementAreas must list specific missing requirements from the job posting, not vague advice.
- Return only the JSON object — no extra commentary.`
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

Provide brutal honesty in scoring.`
            }
          ],
          response_format: { type: "json_object" },
        }),
        {
          requestType: "resume_job_scoring",
          model: "gpt-4o",
          requestData: { resumeName: resume.name, jobTitle, skills: resume.skills },
          metadata: { candidateName: resume.name, jobTitle }
        }
      );

      const scoringContent = response.choices?.[0]?.message?.content || '';
      
      if (!scoringContent || scoringContent.trim().length === 0) {
        console.warn("Model returned empty content for job scoring. Retrying without response_format...");
        const retry = await wrapOpenAIRequest(
          () => openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: `You are an expert hiring manager and resume evaluator. Your task is to analyze how well a candidate's resume matches a specific job posting and create a scoring profile that reflects the complete truth. Do not inflate scores, do not soften gaps, and do not add compliments. Your evaluation must be a factual mirror of the job description versus the CV, backed only by what is explicitly present in the CV.

Return JSON with this format: { "overallScore": 0-100, "technicalSkillsScore": 0-100, "experienceScore": 0-100, "culturalFitScore": 0-100, "matchSummary": "Brief summary", "strengthsHighlights": ["Strength 1 with evidence"], "improvementAreas": ["Gap 1 with detail"], "detailedBreakdown": { "technicalSkills": [], "experience": [], "educationAndCertifications": [], "culturalFitAndSoftSkills": [] } }`
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
Languages: ${resume.languages.join(" | ")}`
              }
            ],
            temperature: 0,
            max_tokens: 1500,
          }),
          {
            requestType: "resume_job_scoring_retry",
            model: "gpt-4o",
            requestData: { resumeName: resume.name, jobTitle, retry: true },
            metadata: { candidateName: resume.name, jobTitle, isRetry: true }
          }
        );
        // If still empty, throw (keep error minimal here since original issue is in processing)
        const rc = retry.choices?.[0]?.message?.content || '';
        if (!rc || rc.trim().length === 0) {
          throw new Error("Empty JSON response from model while scoring resume against job (after retry)");
        }
        let result: any;
        try {
          result = this.extractJsonObject(rc);
        } catch {
          throw new Error("Invalid JSON returned by model while scoring resume against job (after retry)");
        }
        return {
          overallScore: Math.max(0, Math.min(100, result.overallScore || 5)),
          technicalSkillsScore: Math.max(0, Math.min(100, result.technicalSkillsScore || 5)),
          experienceScore: Math.max(0, Math.min(100, result.experienceScore || 5)),
          culturalFitScore: Math.max(0, Math.min(100, result.culturalFitScore || 5)),
          matchSummary: result.matchSummary || "No match summary available",
          strengthsHighlights: Array.isArray(result.strengthsHighlights) ? result.strengthsHighlights : [],
          improvementAreas: Array.isArray(result.improvementAreas) ? result.improvementAreas : [],
          detailedBreakdown: result.detailedBreakdown
        };
      }
      let result: any;
      try {
        result = this.extractJsonObject(scoringContent);
      } catch (parseError) {
        console.warn("Failed to parse scoring JSON. Attempting JSON extraction...");
        try {
          result = this.extractJsonObject(scoringContent);
        } catch {
          throw new Error("Invalid JSON returned by model while scoring resume against job");
        }
      }
      
      return {
        overallScore: Math.max(0, Math.min(100, result.overallScore || 5)),
        technicalSkillsScore: Math.max(0, Math.min(100, result.technicalSkillsScore || 5)),
        experienceScore: Math.max(0, Math.min(100, result.experienceScore || 5)),
        culturalFitScore: Math.max(0, Math.min(100, result.culturalFitScore || 5)),
        matchSummary: result.matchSummary || "No match summary available",
        strengthsHighlights: Array.isArray(result.strengthsHighlights) ? result.strengthsHighlights : [],
        improvementAreas: Array.isArray(result.improvementAreas) ? result.improvementAreas : [],
        detailedBreakdown: result.detailedBreakdown
      };
    } catch (error) {
      console.error("Error scoring resume against job:", error);
      throw new Error("Failed to score resume against job");
    }
  }
}

export const resumeProcessingService = new ResumeProcessingService();