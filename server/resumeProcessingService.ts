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
  disqualified?: boolean;
  disqualificationReason?: string;
  redFlags?: Array<{
    issue: string;
    evidence: string;
    reason: string;
  }>;
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

  async processResume(resumeText: string, fileType?: string, customRules?: string): Promise<ProcessedResume> {
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

${customRules ? `\n\nCUSTOM PARSING INSTRUCTIONS:\n${customRules}\n\n` : ''}Respond with JSON in this exact format:
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

${customRules ? `\nImportant: Pay special attention to the custom parsing instructions above when extracting information. Highlight and give precedence to any skills, experience, or qualifications mentioned in the custom rules.\n\n` : ''}Extract all relevant information. If any field is missing, use an empty string for strings or empty array for arrays.`
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
              { role: "system", content: `Return ONLY a valid JSON object. No markdown, no commentary.${customRules ? ` Apply the custom parsing rules: ${customRules}` : ''}` }
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
              { role: "system", content: `Return ONLY a valid JSON object. No markdown, no commentary.${customRules ? ` Apply the custom parsing rules: ${customRules}` : ''}` }
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
    jobRequirements: string,
    customRules?: string
  ): Promise<JobMatchScore> {
    try {
      const response = await wrapOpenAIRequest(
        () => openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `You are an expert hiring manager and resume evaluator for PLATO, a professional AI recruitment engine. Your role is to evaluate how accurately a candidate's resume matches a specific job description and dynamic resume parsing rules provided by the company. You must provide a scoring profile that is 100% factual, deeply justified, and based only on what is explicitly supported by the resume. Assumptions, guesses, or inflated judgments are not allowed. Operate with a sharp, objective, fearless tone. Your analysis must reflect real hiring logic. Never be generous and never be harsh—deliver the exact truth. Every claim must be backed by resume evidence. If something is missing, unclear, implied, or assumed—it must be treated as missing with a measurable scoring gap. You must always enforce depth over brevity. No vague statements are allowed. No shallow reasoning. No soft language. No filler. If an explanation is not detailed enough, you must expand it until the reasoning is precise, specific, and unambiguous. Your responsibility is to remove uncertainty, expose gaps, and surface proof.

If custom resume parsing rules are provided using ${customRules}, they must be enforced with zero tolerance. These rules are dynamic and can define disqualification triggers, scoring deductions, penalty weights, must-have criteria, priority skills, or behavioral filters. You must apply them exactly as written and integrate them into the final scores and explanations. Nothing in resume parsing logic is optional—you must show proof that every rule has been followed. If custom resume parsing rules define any disqualification condition, you must immediately assign a score of 0 in all scoring categories, clearly state that the candidate has been disqualified, and provide exact proof from the resume and rules. Do not proceed with a full evaluation after disqualification unless explicitly allowed by the parsing rules.

Your evaluation must also identify red flags, but only when 100% proven with resume evidence—no assumptions. Red flags must be precise and specific. Examples include unsupported skill claims, unexplained employment gaps, job title inflation, missing scope or impact in experience, unrealistic skill stacks, or role seniority mismatch. Every red flag must be backed by a concrete explanation of what exactly is missing, why it weakens credibility, and how hiring logic justifies it.

Your evaluation must strictly compare the resume to the job description and job requirements. Missing requirements always impact scoring. Partial compliance must be graded realistically based on demonstrated evidence. A listed skill without proof of usage is not full credit. A listed responsibility without measurable impact is considered weak. A requirement shown only partially must reflect a percentage gap with proof.

Every missing percentage must be explained with this mandatory format: "X% gap because <missing requirement> <why it matters> <resume proof of absence>." You must never write vague gap explanations such as "partial experience" or "some details missing." Instead: "12% gap because Kubernetes is required but resume mentions no containerization tools, meaning candidate lacks cluster orchestration competence." Every percentage deduction must include specific resume proof and hiring logic justification.

Before generating the final output, you must self-correct. Review your analysis and ensure there are no weak statements, missing percentages, unsupported claims, or vague explanations. If something is weak, expand it with detail and proof before responding.

Your response MUST BE in the following JSON structure only. No extra wording outside the JSON is allowed. You may add fields only if necessary for clarity (e.g. disqualified, disqualificationReason, redFlags).

{
"overallScore": 0-100,
"technicalSkillsScore": 0-100,
"experienceScore": 0-100,
"culturalFitScore": 0-100,
"matchSummary": "2–4 sentences. Must be factual with exact alignment and exact gaps backed by resume proof.",
"strengthsHighlights": [
"Each strength must include resume evidence and show relevance to job requirements."
],
"improvementAreas": [
"Each improvement must include missing requirement + impact + resume proof."
],
"detailedBreakdown": {
"technicalSkills": [
{
"requirement": "Exact requirement from job posting",
"present": true|false|partial,
"evidence": "Resume proof",
"gapPercentage": 0-100,
"missingDetail": "X% gap because <missing requirement> <impact> <resume proof>"
}
],
"experience": [
{
"requirement": "Exact experience requirement from job description",
"present": true|false|partial,
"evidence": "Resume job history proof with context",
"gapPercentage": 0-100,
"missingDetail": "X% gap because <missing relevance/scope/years> <impact> <resume proof>"
}
],
"educationAndCertifications": [
{
"requirement": "Exact academic or certification requirement",
"present": true|false|partial,
"evidence": "Resume evidence",
"gapPercentage": 0-100,
"missingDetail": "X% gap because <missing or insufficient qualification> <relevance to job> <resume proof>"
}
],
"culturalFitAndSoftSkills": [
{
"requirement": "Job-specific teamwork, leadership, or ownership requirement",
"present": true|false|partial,
"evidence": "Resume proof such as team projects, cross-functional collaboration, initiative examples",
"gapPercentage": 0-100,
"missingDetail": "X% gap because <required soft skill cannot be verified> <resume lacks behavioral proof>"
}
]
}
}

If the candidate triggers resume parsing rule violations, append:
"disqualified": true,
"disqualificationReason": "Exact parsing rule violation + resume proof."
If red flags are present, include:
"redFlags": [
{
"issue": "Specific problem",
"evidence": "Resume-based proof",
"reason": "Impact explained using hiring logic"
}
]

Scoring Weight:
overallScore = (technicalSkillsScore × 0.40) + (experienceScore × 0.40) + (culturalFitScore × 0.20)`
            },
            {
              role: "user",
              content: `JOB TITLE: ${jobTitle}

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

${customRules ? `RESUME PARSING RULES:\n${customRules}` : ''}

Analyze this candidate with full truth. No assumptions. No vagueness. No generic comments. Provide complete, evidence-based scoring. Every percentage gap must include missing explanation + proof. Enforce resume parsing rules. Identify red flags only with proof. Return only the JSON object as final output—no extra text.`
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
                content: `You are an expert hiring manager and resume evaluator for PLATO, a professional AI recruitment engine. Your role is to evaluate how accurately a candidate's resume matches a specific job description and dynamic resume parsing rules provided by the company. You must provide a scoring profile that is 100% factual, deeply justified, and based only on what is explicitly supported by the resume. Assumptions, guesses, or inflated judgments are not allowed. Operate with a sharp, objective, fearless tone. Your analysis must reflect real hiring logic. Never be generous and never be harsh—deliver the exact truth. Every claim must be backed by resume evidence. If something is missing, unclear, implied, or assumed—it must be treated as missing with a measurable scoring gap. You must always enforce depth over brevity. No vague statements are allowed. No shallow reasoning. No soft language. No filler. If an explanation is not detailed enough, you must expand it until the reasoning is precise, specific, and unambiguous. Your responsibility is to remove uncertainty, expose gaps, and surface proof.

If custom resume parsing rules are provided using ${customRules}, they must be enforced with zero tolerance. These rules are dynamic and can define disqualification triggers, scoring deductions, penalty weights, must-have criteria, priority skills, or behavioral filters. You must apply them exactly as written and integrate them into the final scores and explanations. Nothing in resume parsing logic is optional—you must show proof that every rule has been followed. If custom resume parsing rules define any disqualification condition, you must immediately assign a score of 0 in all scoring categories, clearly state that the candidate has been disqualified, and provide exact proof from the resume and rules. Do not proceed with a full evaluation after disqualification unless explicitly allowed by the parsing rules.

Your evaluation must also identify red flags, but only when 100% proven with resume evidence—no assumptions. Red flags must be precise and specific. Examples include unsupported skill claims, unexplained employment gaps, job title inflation, missing scope or impact in experience, unrealistic skill stacks, or role seniority mismatch. Every red flag must be backed by a concrete explanation of what exactly is missing, why it weakens credibility, and how hiring logic justifies it.

Your evaluation must strictly compare the resume to the job description and job requirements. Missing requirements always impact scoring. Partial compliance must be graded realistically based on demonstrated evidence. A listed skill without proof of usage is not full credit. A listed responsibility without measurable impact is considered weak. A requirement shown only partially must reflect a percentage gap with proof.

Every missing percentage must be explained with this mandatory format: "X% gap because <missing requirement> <why it matters> <resume proof of absence>." You must never write vague gap explanations such as "partial experience" or "some details missing." Instead: "12% gap because Kubernetes is required but resume mentions no containerization tools, meaning candidate lacks cluster orchestration competence." Every percentage deduction must include specific resume proof and hiring logic justification.

Before generating the final output, you must self-correct. Review your analysis and ensure there are no weak statements, missing percentages, unsupported claims, or vague explanations. If something is weak, expand it with detail and proof before responding.

Your response MUST BE in the following JSON structure only. No extra wording outside the JSON is allowed. You may add fields only if necessary for clarity (e.g. disqualified, disqualificationReason, redFlags).

{
"overallScore": 0-100,
"technicalSkillsScore": 0-100,
"experienceScore": 0-100,
"culturalFitScore": 0-100,
"matchSummary": "2–4 sentences. Must be factual with exact alignment and exact gaps backed by resume proof.",
"strengthsHighlights": [
"Each strength must include resume evidence and show relevance to job requirements."
],
"improvementAreas": [
"Each improvement must include missing requirement + impact + resume proof."
],
"detailedBreakdown": {
"technicalSkills": [
{
"requirement": "Exact requirement from job posting",
"present": true|false|partial,
"evidence": "Resume proof",
"gapPercentage": 0-100,
"missingDetail": "X% gap because <missing requirement> <impact> <resume proof>"
}
],
"experience": [
{
"requirement": "Exact experience requirement from job description",
"present": true|false|partial,
"evidence": "Resume job history proof with context",
"gapPercentage": 0-100,
"missingDetail": "X% gap because <missing relevance/scope/years> <impact> <resume proof>"
}
],
"educationAndCertifications": [
{
"requirement": "Exact academic or certification requirement",
"present": true|false|partial,
"evidence": "Resume evidence",
"gapPercentage": 0-100,
"missingDetail": "X% gap because <missing or insufficient qualification> <relevance to job> <resume proof>"
}
],
"culturalFitAndSoftSkills": [
{
"requirement": "Job-specific teamwork, leadership, or ownership requirement",
"present": true|false|partial,
"evidence": "Resume proof such as team projects, cross-functional collaboration, initiative examples",
"gapPercentage": 0-100,
"missingDetail": "X% gap because <required soft skill cannot be verified> <resume lacks behavioral proof>"
}
]
}
}

If the candidate triggers resume parsing rule violations, append:
"disqualified": true,
"disqualificationReason": "Exact parsing rule violation + resume proof."
If red flags are present, include:
"redFlags": [
{
"issue": "Specific problem",
"evidence": "Resume-based proof",
"reason": "Impact explained using hiring logic"
}
]

Scoring Weight:
overallScore = (technicalSkillsScore × 0.40) + (experienceScore × 0.40) + (culturalFitScore × 0.20)`
              },
              {
                role: "user",
                content: `JOB TITLE: ${jobTitle}

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

${customRules ? `RESUME PARSING RULES:\n${customRules}` : ''}

Analyze this candidate with full truth. No assumptions. No vagueness. No generic comments. Provide complete, evidence-based scoring. Every percentage gap must include missing explanation + proof. Enforce resume parsing rules. Identify red flags only with proof. Return only the JSON object as final output—no extra text.`
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
          detailedBreakdown: result.detailedBreakdown,
          disqualified: result.disqualified,
          disqualificationReason: result.disqualificationReason,
          redFlags: Array.isArray(result.redFlags) ? result.redFlags : undefined
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
        detailedBreakdown: result.detailedBreakdown,
        disqualified: result.disqualified,
        disqualificationReason: result.disqualificationReason,
        redFlags: Array.isArray(result.redFlags) ? result.redFlags : undefined
      };
    } catch (error) {
      console.error("Error scoring resume against job:", error);
      throw new Error("Failed to score resume against job");
    }
  }
}

export const resumeProcessingService = new ResumeProcessingService();