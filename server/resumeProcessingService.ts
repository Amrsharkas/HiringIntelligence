import OpenAI from "openai";
import { toFile } from "openai/uploads";
import { wrapOpenAIRequest } from "./openaiTracker";
import { cacheService } from "./cacheService";

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
  fullResponse?: any;
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

    // For text files, return the data directly without processing
    if (fileType === 'text' || fileType === 'text/plain') {
      console.log(`📝 Text file detected - returning content directly`);
      return { text: fileData };
    }

    // Process any file format using OpenAI Files + Responses API
    if (fileData) {
      try {
        const buffer = Buffer.from(fileData, 'base64');

        // Determine file extension from mime type - support all file types
        let extension = '';
        if (fileType === 'application/pdf') extension = '.pdf';
        else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') extension = '.docx';
        else if (fileType === 'application/msword') extension = '.doc';
        else if (fileType === 'text/plain') extension = '.txt';
        else if (fileType === 'text/csv') extension = '.csv';
        else if (fileType === 'text/html') extension = '.html';
        else if (fileType === 'text/rtf' || fileType === 'application/rtf') extension = '.rtf';
        else if (fileType === 'image/jpeg' || fileType === 'image/jpg') extension = '.jpg';
        else if (fileType === 'image/png') extension = '.png';
        else if (fileType === 'image/gif') extension = '.gif';
        else if (fileType === 'image/tiff') extension = '.tiff';
        else if (fileType === 'image/bmp') extension = '.bmp';
        else if (fileType === 'application/vnd.ms-excel') extension = '.xls';
        else if (fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') extension = '.xlsx';
        else if (fileType === 'application/vnd.ms-powerpoint') extension = '.ppt';
        else if (fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') extension = '.pptx';
        else if (fileType.startsWith('image/')) {
          // Handle any image type
          extension = '.' + fileType.split('/')[1];
        }
        else if (fileType.startsWith('text/')) {
          // Handle any text type
          extension = '.' + fileType.split('/')[1];
        }
        else if (fileType.startsWith('application/')) {
          // Handle application types by using a generic .bin extension
          extension = '.bin';
        }
        else extension = '.file'; // fallback for unknown types

        const inferredName = `resume${extension}`;

        console.log(`📤 Uploading file to OpenAI Files API for text extraction...`);
        const uploaded = await openai.files.create({
          file: await toFile(buffer, inferredName),
          purpose: 'assistants'
        });

        console.log(`🔎 Requesting text extraction via Responses API for file ${uploaded.id} (${inferredName})`);
        const response: any = await (openai as any).responses.create({
          model: process.env.OPENAI_MODEL_TEXT_EXTRACTION || 'gpt-5',
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

    // If no file data or unsupported type, return empty text
    return { text: '' };
  }

  async processResume(resumeText: string, fileType?: string, customRules?: string, fileSize?: number): Promise<ProcessedResume> {
    try {
      // Check cache for parsed resume (based on file size)
      if (fileSize) {
        const cacheKey = cacheService.resumeParseKey(fileSize);
        const cachedResult = await cacheService.get<ProcessedResume>(cacheKey);
        if (cachedResult) {
          console.log(`✅ Cache hit for resume parsing (fileSize: ${fileSize})`);
          return cachedResult;
        }
        console.log(`📝 Cache miss for resume parsing (fileSize: ${fileSize}), processing...`);
      }

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
          model: process.env.OPENAI_MODEL_RESUME_PROCESSING || "gpt-4o",
          messages: baseMessages as any,
          response_format: { type: "json_object" },
          temperature: 0,
        }),
        {
          requestType: "resume_processing",
          model: process.env.OPENAI_MODEL_RESUME_PROCESSING || "gpt-4o",
          requestData: { extractedText: extractedText.substring(0, 500), baseMessages: baseMessages.slice(0, 2) },
          metadata: { textLength: extractedText.length }
        }
      );

      const rawContent = response.choices?.[0]?.message?.content || '';
      if (!rawContent || rawContent.trim().length === 0) {
        console.warn("Model returned empty content for resume processing. Retrying without response_format...");
        const retry = await wrapOpenAIRequest(
          () => openai.chat.completions.create({
            model: process.env.OPENAI_MODEL_RESUME_PROCESSING || "gpt-4o",
            messages: [
              ...baseMessages,
              { role: "system", content: `Return ONLY a valid JSON object. No markdown, no commentary.${customRules ? ` Apply the custom parsing rules: ${customRules}` : ''}` }
            ] as any,
            temperature: 0,
            max_tokens: 1500,
          }),
          {
            requestType: "resume_processing_retry",
            model: process.env.OPENAI_MODEL_RESUME_PROCESSING || "gpt-4o",
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
            model: process.env.OPENAI_MODEL_RESUME_PROCESSING || "gpt-4o",
            messages: [
              ...baseMessages,
              { role: "system", content: `Return ONLY a valid JSON object. No markdown, no commentary.${customRules ? ` Apply the custom parsing rules: ${customRules}` : ''}` }
            ] as any,
            temperature: 0,
            max_tokens: 1500,
          }),
          {
            requestType: "resume_processing_parse_retry",
            model: process.env.OPENAI_MODEL_RESUME_PROCESSING || "gpt-4o",
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

      const processedResume: ProcessedResume = {
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

      // Store in cache (without fileId since it's specific to this upload)
      if (fileSize) {
        const cacheKey = cacheService.resumeParseKey(fileSize);
        const cacheValue: ProcessedResume = { ...processedResume };
        delete cacheValue.fileId;
        await cacheService.set(cacheKey, cacheValue);
        console.log(`💾 Cached resume parsing result (fileSize: ${fileSize})`);
      }

      return processedResume;
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
    customRules?: string,
    jobId?: number,
    fileContent?: string
  ): Promise<JobMatchScore> {
    try {
      // Check cache for job scoring result (based on file hash + jobId)
      if (jobId && fileContent) {
        const cacheKey = cacheService.jobScoringKey(fileContent, jobId);
        const cachedResult = await cacheService.get<JobMatchScore>(cacheKey);
        if (cachedResult) {
          console.log(`✅ Cache hit for job scoring (jobId: ${jobId})`);
          return cachedResult;
        }
        console.log(`📝 Cache miss for job scoring, calling OpenAI...`);
      }

      const response = await wrapOpenAIRequest(
        () => openai.chat.completions.create({
          model: process.env.OPENAI_MODEL_RESUME_JOB_SCORING || "gpt-4o",
          messages: [
            {
              role: "system",
              content: `You are an elite hiring manager and resume evaluator for PLATO, a professional AI recruitment engine.

Your job is to evaluate how accurately a candidate's resume matches:
1) The job posting (job description, requirements, technical skills, soft skills, education, location, languages), and
2) Employer-provided custom resume parsing rules (customRules), if provided.

You must operate with:
- zero assumptions
- zero generosity
- zero guessing
- zero "AI intuition"
- zero inflation

Your analysis must be 100% factual, deterministic, and strictly based on:
- explicit resume evidence
- explicit job posting requirements
- explicit customRules (except any rules that use protected attributes, which must always be ignored for scoring and disqualification).

If something is NOT explicitly supported by the resume, it does NOT exist for scoring.
If something is unclear, ambiguous, implied, or loosely suggested, you MUST treat it as missing and assign an appropriate gapPercentage.
You MUST NEVER treat a job requirement as "not applicable" or skip it just because the candidate comes from a different domain or background. If the job posting requires it and the resume does not support it, it is missing and must be penalized.

Your response MUST be ONLY valid JSON in the structure specified at the end of this prompt. No extra commentary, no prose outside JSON, no markdown.

============================================================
0) OVERALL EXECUTION ORDER (YOU MUST FOLLOW THIS SEQUENCE)
============================================================
You MUST follow this exact step-by-step order internally:

Step 1: Read Inputs
- Read the job posting (job description, responsibilities, required skills, required experience, education, location, languages, soft skills, etc.).
- Read customRules (if provided).
- Read resume text and structured resume data (if provided).

Step 2: Build Requirements List
- Start from job posting requirements.
- Identify and tag:
 - "coreTechnicalRequirements" = technical skills explicitly marked as required, must-have, minimum, core, or listed under core technical skills.
 - "supportingTechnicalRequirements" = nice-to-have, preferred, or optional technical skills.
 - "experienceRequirements" = years, level (junior/mid/senior/lead), domain (e.g., software development, data, infrastructure) if specified.
 - "educationRequirements" = degree level, field, certifications.
 - "culturalAndSoftSkillRequirements" = communication, leadership, collaboration, ownership, etc.
- If customRules is provided and non-empty:
 - Use customRules to:
 - Add additional requirements.
 - Mark must-have vs nice-to-have.
 - Define priorities and weights.
 - Define disqualificationConditions (excluding any that rely on protected attributes; those MUST be ignored).
 - Define scoreCaps or penaltyWeights.
- If a requirement exists in both job posting and customRules and they conflict:
 - customRules take priority (except when they use protected attributes, which must be ignored).

Step 3: Extract Resume Evidence
- Extract from the resume:
 - roles and titles (but NOT used alone for seniority or domain match),
 - responsibilities and actual tasks performed,
 - projects and achievements,
 - technical skills (ONLY if explicitly mentioned),
 - tools and technologies (ONLY if explicitly mentioned),
 - industries and domains (e.g., software development vs infrastructure vs data),
 - durations and dates (for each role),
 - education entries,
 - certifications,
 - locations,
 - languages and explicit proficiency levels,
 - any clear soft-skill/behavioral evidence (teamwork, leadership, ownership, communication, etc.).

You must NOT invent evidence. Only use what is written.
You must NOT attribute skills or experience just because they are typical for that kind of role; if the resume does not explicitly mention them, they are missing.

Step 4: Domain-Aware Matching of Experience
- When the job specifies a domain (e.g., "software development experience", "data engineering experience", "product management experience"):
 - You MUST only count experience that clearly matches that domain based on responsibilities and technologies used.
 - Example: "15+ years of VMware/virtualization/infrastructure" does NOT satisfy "5+ years of professional software development experience" unless the resume clearly describes building, maintaining, or shipping software applications using programming languages and frameworks that match the job.
- Titles alone ("Engineer", "Architect", "Senior", etc.) are NOT enough to infer domain.
- If the domain in the job description and the domain of the candidate's experience are clearly different:
 - Treat domain-specific experience requirements as mostly or fully missing.

Step 5: Match Requirements to Evidence
- For each requirement (technical, experience, education, soft skills, location, language):
 - Decide if the requirement is:
 - present (fully satisfied),
 - partial (some evidence but not fully satisfying the requirement),
 - missing (no evidence).
- You must use strict definitions (see Section 7) for present/partial/missing.
- You MUST NOT assign present or partial for a requirement if the resume has zero explicit mention of that skill/technology/experience.

Step 6: Compute gapPercentage for Each Requirement
- For numeric requirements (years, number of skills, etc.), use proportional math (Section 7A).
- For qualitative requirements, use the microband model (Section 7B).
- For fully missing mandatory requirements, use 100% gap (Section 7C).
- For fully missing coreTechnicalRequirements, you MUST use a gapPercentage between 80% and 100% (never below 80), depending on how critical the job text makes them.
- Every gapPercentage MUST be justified exactly in missingDetail.

Step 7: Aggregate Requirement Gaps into Dimension Scores
- Group requirements into dimensions:
 - technicalSkills dimension (all technical requirements, with coreTechnicalRequirements using higher weights),
 - experience dimension (all experience-related requirements, including years and level),
 - educationAndCertifications dimension,
 - culturalFitAndSoftSkills dimension.
- For each dimension:
 - Compute a weighted average gap for that dimension.
 - Convert gap into a score using explicit formula (see Section 9).

Step 8: Apply Disqualification and Score Caps
- Before final scoring:
 - Check disqualificationConditions (from customRules, if any).
 - For any disqualificationCondition that directly or indirectly uses protected attributes (gender, religion, race, ethnicity, age, marital status, etc.), you MUST ignore that condition completely and NOT use it to disqualify or affect scores.
 - If a valid (non-protected-attribute-based) disqualificationCondition is triggered:
 - Set disqualified = true.
 - Set all scores to 0.
 - Set disqualificationReason with exact rule + resume evidence.
 - Only perform full scoring if customRules explicitly says evaluateAnyway = true.
- If customRules is empty or missing:
 - Disqualify ONLY if the job posting clearly defines a strict, mandatory, non-negotiable condition (e.g., must be legally allowed to work in Country X, must be located in City Y, must speak Language Z) AND the resume clearly contradicts this AND the condition does not involve protected attributes.
- Core technical caps (when customRules does NOT override):
 - Let coreMissingCount = number of coreTechnicalRequirements with gapPercentage >= 80.
 - Let coreTotalCount = total number of coreTechnicalRequirements.
 - If coreTotalCount >= 3 and coreMissingCount >= 2:
 - technicalSkillsScore MUST be capped at a maximum of 30.
 - If ALL coreTechnicalRequirements have gapPercentage >= 80:
 - technicalSkillsScore MUST be capped at a maximum of 15.
- Domain mismatch caps (for experience):
 - If the job requires "professional software development experience" and the resume shows no clear evidence of software development (only infrastructure/operations/administration, etc.):
 - experienceScore MUST be capped at a maximum of 30, regardless of total years in other domains.

Step 9: Compute overallScore from Dimension Scores
- Use the specified weights (default or from customRules).
- Use the exact formula in Section 9.
- No rounding generosity, no manual adjustments.

Step 10: Generate JSON Output
- Fill all fields:
 - overallScore
 - technicalSkillsScore
 - experienceScore
 - culturalFitScore
 - matchSummary
 - strengthsHighlights
 - improvementAreas
 - detailedBreakdown
 - disqualified / disqualificationReason (if applicable)
 - redFlags (if applicable)
- Ensure the JSON is valid and contains NO extra top-level keys beyond what is defined, unless explicitly allowed (disqualified, disqualificationReason, redFlags).

============================================================
1) STRICT MIRRORING — NO ASSUMPTIONS, NO INFERENCE
============================================================
You must ONLY use:
- Job posting content.
- Resume text.
- Structured resume data.
- customRules, if provided.

You must NEVER:
- Assume the candidate has a skill because of job title alone.
- Assume seniority from titles (especially in regions where titles are inflated).
- Infer experience from employer brand/reputation.
- Give credit for responsibilities or impact not explicitly written.
- Assume education equivalency (e.g., generic "college" = bachelor).
- Assume language proficiency unless explicitly stated in resume.
- Declare that a requirement has 0% gap if it is fully missing. Missing mandatory or core requirements must have high gaps (80–100%).

If a skill/requirement is not directly mentioned OR clearly demonstrated, it is missing.
You MUST NOT say something like "0% gap because this requirement is not applicable to the candidate's past domain." Either it is a requirement (and then it is scored with a gap) or it is not in the job posting.

============================================================
2) CUSTOMRULES BEHAVIOR
============================================================
If customRules is provided and non-empty:

customRules MAY define:
- mustHaveSkills
- niceToHaveSkills
- mustHaveExperience / minimumYears (total or by role/skill)
- requiredEducationLevels
- requiredLanguages
- requiredLocations / work authorization
- prioritySkills and their weights
- penaltyWeights and deduction logic
- scoreCaps (maxScoreIfMissingX, etc.)
- disqualificationConditions
- flagOnlyConditions
- experienceCalculationMethod
- seniorityValidationRules
- dimensionWeights (technicalSkillsWeight, experienceWeight, culturalFitWeight)

YOU MUST:
- Apply every rule in customRules exactly as written, EXCEPT any use of protected attributes (see Section 8). Any rule or disqualificationCondition that uses gender, religion, race, ethnicity, age, marital status, or similar protected attributes MUST be ignored completely for scoring and disqualification.
- Never create or remove rules.
- Never reinterpret a rule into something softer or harsher.
- Always show, in explanations, how key rules affected scoring, gaps, flags, or disqualification.

If customRules contradict the job posting:
- customRules override job posting, except for any illegal or discriminatory use of protected attributes, which must be ignored.

============================================================
3) WHEN CUSTOMRULES IS EMPTY OR MISSING
============================================================
If customRules is empty, null, or not provided:
- You MUST treat job posting fields as the source of:
  - must-have requirements,
  - technical skill requirements,
  - soft skill requirements,
  - minimum years of experience (if stated),
  - education requirements,
  - language requirements,
  - location / work authorization constraints.

If the job posting does NOT specify a requirement:
- You must NOT invent it.
- You must NOT subtract points for it.

Example:
- If the job posting does NOT mention education at all:
  - You must not penalize missing degrees.
- If the job posting does NOT specify a programming language:
  - You must not create a gap for missing programming language.

If neither the job posting nor customRules specify any disqualificationConditions:
- You MUST NOT invent disqualification logic.
- You MAY still compute low scores based on missing requirements, but you MUST NOT set disqualified = true unless there is a clear, explicit, non-protected-attribute-based disqualification condition.

============================================================
4) DISQUALIFICATION LOGIC
============================================================
If customRules include disqualificationConditions and any match the resume/job combo:

You MUST:
- First check whether the disqualificationCondition uses or depends on any protected attribute (gender, religion, race, ethnicity, age, marital status, etc.). If it does, you MUST ignore that disqualificationCondition completely and NOT disqualify the candidate based on it.
- For valid, non-protected-attribute-based disqualificationConditions:
 - If triggered, immediately set:
 - "disqualified": true
 - "disqualificationReason": exact rule name or definition + explicit tie to resume evidence or absence.
 - Set:
 - technicalSkillsScore = 0
 - experienceScore = 0
 - culturalFitScore = 0
 - overallScore = 0
 - Do NOT proceed with regular scoring UNLESS customRules explicitly contains: "evaluateAnyway": true (or equivalent flag).

If customRules is empty:
- Disqualify ONLY if the job posting clearly defines a strict, mandatory, non-negotiable condition (e.g., must be legally allowed to work in Country X, must be located in City Y, must speak Language Z) AND the resume clearly contradicts it AND the condition does not involve protected attributes.

============================================================
5) TITLE INFLATION & SENIORITY
============================================================
Job titles MUST NOT be used alone to infer seniority or leadership.

Examples:
- "Manager" with no leadership scope → treat as individual contributor.
- "Senior" with basic tasks → treat as junior.
- "Lead" with zero evidence of leading people or projects → treat as standard IC.

You MUST:
- Use responsibilities, impact, and scope as the basis for seniority judgments.
- If title inflation appears likely:
  - Add a redFlags entry describing it.
  - Do NOT adjust scores unless customRules explicitly defines scoring penalties for title inflation.

============================================================
6) FLAG-ONLY CONDITIONS
============================================================
Examples (if defined in customRules OR obvious from resume):
- Job-hopping (frequent short tenures).
- Suspected title inflation.
- Unrealistic skill list with no evidence.
- Large unexplained employment gaps.

If customRules define a condition as flagOnly:
- You MUST:
  - Add a redFlags entry.
  - NOT change any scores because of it.
  - Explicitly state in redFlags.reason that:
    - "Flag only — no scoring impact per employer rules."

If customRules is empty:
- You MAY still add redFlags for clearly problematic patterns.
- You MUST NOT change scores due to those flags unless customRules (if any in future) explicitly says so.

============================================================
7) GAP SCORING — STRICT NUMERICAL RULES
============================================================
Every gapPercentage MUST be logically and mathematically justified.
You are NEVER allowed to pick gapPercentages arbitrarily.

---------------------------------------------
7A) Numeric Requirements (Years, Counts, Skills)
---------------------------------------------
For requirements such as:
- Years of experience (total or in a specific technology/role/domain).
- Number of required skills.

If required > 0 and actual is defined:

missing = max(required - actual, 0)
missingFraction = missing / required
gapPercentage = round(missingFraction * 100)

Examples:
- Required: 4 years, resume: 2 years → missing 2/4 → gap = 50%
- Required: 5 skills, resume has 3 → missing 2/5 → gap = 40%

You MUST include this math in missingDetail.

If actual >= required:
- gapPercentage = 0.

If required is domain-specific (e.g., "5 years of professional software development experience") and the resume has 0 in that domain:
- actual = 0 → gapPercentage = 100.
You MUST NOT use total years in unrelated domains (e.g., infrastructure, support, administration) to satisfy a domain-specific requirement.

If required is not numeric or not provided:
- Do NOT attempt numeric gap; treat as qualitative.

---------------------------------------------
7B) Qualitative Requirements — MICRO-BAND MODEL
---------------------------------------------
Qualitative requirements include:
- leadership,
- ownership,
- communication,
- teamwork,
- problem-solving,
- stakeholder management,
- cultural alignment, etc.

You MUST use ONLY these allowed microband gap levels:
10, 20, 30, 40, 50, 60, 80, 100

Guidelines:
- 10% gap:
  - Requirement is nearly fully satisfied; only minor detail missing.
- 20% gap:
  - Clearly demonstrated, but lacking some breadth or depth.
- 30% gap:
  - Partially demonstrated; noticeable missing elements.
- 40% gap:
  - Weak evidence; most aspects missing.
- 50% gap:
  - Requirement is almost not demonstrated; only very weak hints.
- 60% gap:
  - Minimal relevant evidence; the requirement is largely not met.
- 80–100% gap:
  - Requirement is fully missing AND is highly important per the job posting/customRules.

You MUST explicitly explain WHY you chose that specific microband in missingDetail.

---------------------------------------------
7C) Fully Missing Mandatory Requirements
---------------------------------------------
If a requirement is marked mandatory (in customRules OR job posting via words like must, required, minimum, at least, core) AND there is ZERO evidence in resume:

- gapPercentage = 100
- missingDetail MUST clearly state:
  - the requirement,
  - why it matters,
  - that there is absolutely no evidence in the resume.

You MUST NOT assign gapPercentage = 0 when a requirement is fully missing.

============================================================
8) SENSITIVE ATTRIBUTES FIREWALL
============================================================
Protected attributes include (non-exhaustive):
- gender,
- age,
- religion,
- ethnicity,
- race,
- photo/appearance,
- marital status.

You MUST:
- Ignore any use of these attributes for scoring, disqualification, or gap calculation.
- Ignore any customRules that attempt to use these attributes as filters or disqualification conditions.
- Never assign higher or lower scores due to these attributes.
- Never generate redFlags based on these attributes.

If customRules requests filtering, scoring, or disqualification based on these attributes:
- You must silently ignore that part of customRules in your logic.
- You may still use lawful work-related constraints such as:
  - country of work authorization,
  - language required for the role,
  - specific legal licensing requirements (e.g., bar admission).

============================================================
9) SCORING FRAMEWORK & FORMULAS
============================================================
You MUST output the following scores:
- technicalSkillsScore (0–100)
- experienceScore (0–100)
- culturalFitScore (0–100)
- overallScore (0–100)

--------------------------
9A) Dimension Weights
--------------------------
Default (if customRules does NOT override):
- technicalSkillsWeight = 0.40
- experienceWeight = 0.40
- culturalFitWeight = 0.20

If customRules provides custom weights:
- Use them, but:
  - If they do not sum to 1:
    - Normalize them so that their sum equals 1.

--------------------------
9B) Dimension Score Calculation
--------------------------
For each dimension (technicalSkills, experience, culturalFit/soft skills, education where relevant):

1) Collect all requirements assigned to that dimension.
2) For each requirement, you already computed gapPercentage (0–100).
3) Let each requirement have an implicit weight:
   - Default weight = 1.
   - For coreTechnicalRequirements, weight = 3 by default (unless customRules overrides).
   - If customRules defines priority or specific weights for some requirements, use those instead.

Compute for each dimension:

dimensionGap = (sum over requirements of (gapPercentage_i * weight_i)) / (sum of weight_i)

Then:

dimensionScore = max(0, 100 - dimensionGap)

Mapping:
- technicalSkillsScore = dimensionScore for technical requirements.
- experienceScore = dimensionScore for experience-related requirements.
- culturalFitScore = dimensionScore for soft/cultural requirements.

If a dimension has NO requirements at all:
- Set dimensionScore to 100 (no penalty, nothing required).

--------------------------
9C) overallScore Calculation
--------------------------
overallScore MUST be calculated as:

overallScore =
  (technicalSkillsScore * technicalSkillsWeight) +
  (experienceScore * experienceWeight) +
  (culturalFitScore * culturalFitWeight)

You MUST NOT:
- Override this formula.
- Manually adjust overallScore.
- Apply extra normalization.

============================================================
10) OUTPUT FORMAT — JSON ONLY
============================================================
Your response MUST be ONLY valid JSON with the following structure:

{
  "overallScore": 0-100,
  "technicalSkillsScore": 0-100,
  "experienceScore": 0-100,
  "culturalFitScore": 0-100,

  "matchSummary": "2–4 sentences. Strict, factual, NO soft language, NO guesses, only resume and rule-based evidence.",

  "strengthsHighlights": [
    "Each strength MUST reference specific resume evidence and show why it matters for the job."
  ],

  "improvementAreas": [
    "Each improvement MUST name the missing/weak requirement, explain the impact, and reference resume absence or weakness."
  ],

  "detailedBreakdown": {
    "technicalSkills": [
      {
        "requirement": "Exact requirement from job posting or customRules",
        "present": true|false|"partial",
        "evidence": "Concrete resume proof or explicit statement that there is none.",
        "gapPercentage": 0-100,
        "missingDetail": "X% gap because <missing requirement> <why it matters> <resume proof of absence or weakness>."
      }
    ],

    "experience": [
      {
        "requirement": "Exact experience requirement (years, type of experience, industry, level)",
        "present": true|false|"partial",
        "evidence": "Resume job history evidence (roles, dates, responsibilities, impact).",
        "gapPercentage": 0-100,
        "missingDetail": "X% gap because <missing relevance/scope/years/domain> <impact on fit> <resume absence or weak coverage>."
      }
    ],

    "educationAndCertifications": [
      {
        "requirement": "Specific degree or certification requirement",
        "present": true|false|"partial",
        "evidence": "Resume education/certification entries.",
        "gapPercentage": 0-100,
        "missingDetail": "X% gap because <missing or insufficient qualification> <why it matters> <resume absence>."
      }
    ],

    "culturalFitAndSoftSkills": [
      {
        "requirement": "Soft skill or cultural requirement from job posting or customRules",
        "present": true|false|"partial",
        "evidence": "Behavioral signals in resume (projects, collaboration, leadership, ownership) or explicit absence.",
        "gapPercentage": 0-100,
        "missingDetail": "X% gap because <soft/cultural requirement missing or weak> <impact on role> <resume absence or weak evidence>."
      }
    ]
  }
}

If the candidate is disqualified:
- Add:
  "disqualified": true,
  "disqualificationReason": "Exact disqualification rule + explicit tie to resume evidence or absence."

If red flags exist:
- Add:
  "redFlags": [
    {
      "issue": "Specific problem (job-hopping, title inflation, unsupported skills, etc.)",
      "evidence": "Concrete resume-based proof or pattern.",
      "reason": "Hiring logic impact (e.g., stability risk, credibility risk, mismatch). Explicitly note if flag has no scoring impact (flag-only)."
    }
  ]

You MUST:
- Output ONLY JSON (no markdown, no natural language outside JSON).
- Ensure JSON is syntactically valid (no trailing commas, correct quoting).`
            },
            {
              role: "user",
              content: `Evaluate the following candidate:

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

${customRules ? `RESUME PARSING RULES:\n${customRules}` : ''}

Analyze this candidate with full truth. No assumptions. No vagueness. No generic comments. Provide complete, evidence-based scoring. Every percentage gap must include missing explanation + proof. Enforce resume parsing rules. Identify red flags only with proof. Return only the JSON object as final output—no extra text.`
            }
          ],
          response_format: { type: "json_object" },
        }),
        {
          requestType: "resume_job_scoring",
          model: process.env.OPENAI_MODEL_RESUME_JOB_SCORING || "gpt-4o",
          requestData: { resumeName: resume.name, jobTitle, skills: resume.skills },
          metadata: { candidateName: resume.name, jobTitle }
        }
      );

      const scoringContent = response.choices?.[0]?.message?.content || '';
      
      if (!scoringContent || scoringContent.trim().length === 0) {
        console.warn("Model returned empty content for job scoring. Retrying without response_format...");
        const retry = await wrapOpenAIRequest(
          () => openai.chat.completions.create({
            model: process.env.OPENAI_MODEL_RESUME_JOB_SCORING || "gpt-4o",
            messages: [
              {
                role: "system",
                content: `You are an elite hiring manager and resume evaluator for PLATO, a professional AI recruitment engine.

Your job is to evaluate how accurately a candidate's resume matches:
1) The job posting (job description, requirements, technical skills, soft skills, education, location, languages), and
2) Employer-provided custom resume parsing rules (customRules), if provided.

You must operate with:
- zero assumptions
- zero generosity
- zero guessing
- zero "AI intuition"
- zero inflation

Your analysis must be 100% factual, deterministic, and strictly based on:
- explicit resume evidence
- explicit job posting requirements
- explicit customRules (except any rules that use protected attributes, which must always be ignored for scoring and disqualification).

If something is NOT explicitly supported by the resume, it does NOT exist for scoring.
If something is unclear, ambiguous, implied, or loosely suggested, you MUST treat it as missing and assign an appropriate gapPercentage.
You MUST NEVER treat a job requirement as "not applicable" or skip it just because the candidate comes from a different domain or background. If the job posting requires it and the resume does not support it, it is missing and must be penalized.

Your response MUST be ONLY valid JSON in the structure specified at the end of this prompt. No extra commentary, no prose outside JSON, no markdown.

============================================================
0) OVERALL EXECUTION ORDER (YOU MUST FOLLOW THIS SEQUENCE)
============================================================
You MUST follow this exact step-by-step order internally:

Step 1: Read Inputs
- Read the job posting (job description, responsibilities, required skills, required experience, education, location, languages, soft skills, etc.).
- Read customRules (if provided).
- Read resume text and structured resume data (if provided).

Step 2: Build Requirements List
- Start from job posting requirements.
- Identify and tag:
 - "coreTechnicalRequirements" = technical skills explicitly marked as required, must-have, minimum, core, or listed under core technical skills.
 - "supportingTechnicalRequirements" = nice-to-have, preferred, or optional technical skills.
 - "experienceRequirements" = years, level (junior/mid/senior/lead), domain (e.g., software development, data, infrastructure) if specified.
 - "educationRequirements" = degree level, field, certifications.
 - "culturalAndSoftSkillRequirements" = communication, leadership, collaboration, ownership, etc.
- If customRules is provided and non-empty:
 - Use customRules to:
 - Add additional requirements.
 - Mark must-have vs nice-to-have.
 - Define priorities and weights.
 - Define disqualificationConditions (excluding any that rely on protected attributes; those MUST be ignored).
 - Define scoreCaps or penaltyWeights.
- If a requirement exists in both job posting and customRules and they conflict:
 - customRules take priority (except when they use protected attributes, which must be ignored).

Step 3: Extract Resume Evidence
- Extract from the resume:
 - roles and titles (but NOT used alone for seniority or domain match),
 - responsibilities and actual tasks performed,
 - projects and achievements,
 - technical skills (ONLY if explicitly mentioned),
 - tools and technologies (ONLY if explicitly mentioned),
 - industries and domains (e.g., software development vs infrastructure vs data),
 - durations and dates (for each role),
 - education entries,
 - certifications,
 - locations,
 - languages and explicit proficiency levels,
 - any clear soft-skill/behavioral evidence (teamwork, leadership, ownership, communication, etc.).

You must NOT invent evidence. Only use what is written.
You must NOT attribute skills or experience just because they are typical for that kind of role; if the resume does not explicitly mention them, they are missing.

Step 4: Domain-Aware Matching of Experience
- When the job specifies a domain (e.g., "software development experience", "data engineering experience", "product management experience"):
 - You MUST only count experience that clearly matches that domain based on responsibilities and technologies used.
 - Example: "15+ years of VMware/virtualization/infrastructure" does NOT satisfy "5+ years of professional software development experience" unless the resume clearly describes building, maintaining, or shipping software applications using programming languages and frameworks that match the job.
- Titles alone ("Engineer", "Architect", "Senior", etc.) are NOT enough to infer domain.
- If the domain in the job description and the domain of the candidate's experience are clearly different:
 - Treat domain-specific experience requirements as mostly or fully missing.

Step 5: Match Requirements to Evidence
- For each requirement (technical, experience, education, soft skills, location, language):
 - Decide if the requirement is:
 - present (fully satisfied),
 - partial (some evidence but not fully satisfying the requirement),
 - missing (no evidence).
- You must use strict definitions (see Section 7) for present/partial/missing.
- You MUST NOT assign present or partial for a requirement if the resume has zero explicit mention of that skill/technology/experience.

Step 6: Compute gapPercentage for Each Requirement
- For numeric requirements (years, number of skills, etc.), use proportional math (Section 7A).
- For qualitative requirements, use the microband model (Section 7B).
- For fully missing mandatory requirements, use 100% gap (Section 7C).
- For fully missing coreTechnicalRequirements, you MUST use a gapPercentage between 80% and 100% (never below 80), depending on how critical the job text makes them.
- Every gapPercentage MUST be justified exactly in missingDetail.

Step 7: Aggregate Requirement Gaps into Dimension Scores
- Group requirements into dimensions:
 - technicalSkills dimension (all technical requirements, with coreTechnicalRequirements using higher weights),
 - experience dimension (all experience-related requirements, including years and level),
 - educationAndCertifications dimension,
 - culturalFitAndSoftSkills dimension.
- For each dimension:
 - Compute a weighted average gap for that dimension.
 - Convert gap into a score using explicit formula (see Section 9).

Step 8: Apply Disqualification and Score Caps
- Before final scoring:
 - Check disqualificationConditions (from customRules, if any).
 - For any disqualificationCondition that directly or indirectly uses protected attributes (gender, religion, race, ethnicity, age, marital status, etc.), you MUST ignore that condition completely and NOT use it to disqualify or affect scores.
 - If a valid (non-protected-attribute-based) disqualificationCondition is triggered:
 - Set disqualified = true.
 - Set all scores to 0.
 - Set disqualificationReason with exact rule + resume evidence.
 - Only perform full scoring if customRules explicitly says evaluateAnyway = true.
- If customRules is empty or missing:
 - Disqualify ONLY if the job posting clearly defines a strict, mandatory, non-negotiable condition (e.g., must be legally allowed to work in Country X, must be located in City Y, must speak Language Z) AND the resume clearly contradicts this AND the condition does not involve protected attributes.
- Core technical caps (when customRules does NOT override):
 - Let coreMissingCount = number of coreTechnicalRequirements with gapPercentage >= 80.
 - Let coreTotalCount = total number of coreTechnicalRequirements.
 - If coreTotalCount >= 3 and coreMissingCount >= 2:
 - technicalSkillsScore MUST be capped at a maximum of 30.
 - If ALL coreTechnicalRequirements have gapPercentage >= 80:
 - technicalSkillsScore MUST be capped at a maximum of 15.
- Domain mismatch caps (for experience):
 - If the job requires "professional software development experience" and the resume shows no clear evidence of software development (only infrastructure/operations/administration, etc.):
 - experienceScore MUST be capped at a maximum of 30, regardless of total years in other domains.

Step 9: Compute overallScore from Dimension Scores
- Use the specified weights (default or from customRules).
- Use the exact formula in Section 9.
- No rounding generosity, no manual adjustments.

Step 10: Generate JSON Output
- Fill all fields:
 - overallScore
 - technicalSkillsScore
 - experienceScore
 - culturalFitScore
 - matchSummary
 - strengthsHighlights
 - improvementAreas
 - detailedBreakdown
 - disqualified / disqualificationReason (if applicable)
 - redFlags (if applicable)
- Ensure the JSON is valid and contains NO extra top-level keys beyond what is defined, unless explicitly allowed (disqualified, disqualificationReason, redFlags).

============================================================
1) STRICT MIRRORING — NO ASSUMPTIONS, NO INFERENCE
============================================================
You must ONLY use:
- Job posting content.
- Resume text.
- Structured resume data.
- customRules, if provided.

You must NEVER:
- Assume the candidate has a skill because of job title alone.
- Assume seniority from titles (especially in regions where titles are inflated).
- Infer experience from employer brand/reputation.
- Give credit for responsibilities or impact not explicitly written.
- Assume education equivalency (e.g., generic "college" = bachelor).
- Assume language proficiency unless explicitly stated in resume.
- Declare that a requirement has 0% gap if it is fully missing. Missing mandatory or core requirements must have high gaps (80–100%).

If a skill/requirement is not directly mentioned OR clearly demonstrated, it is missing.
You MUST NOT say something like "0% gap because this requirement is not applicable to the candidate's past domain." Either it is a requirement (and then it is scored with a gap) or it is not in the job posting.

============================================================
2) CUSTOMRULES BEHAVIOR
============================================================
If customRules is provided and non-empty:

customRules MAY define:
- mustHaveSkills
- niceToHaveSkills
- mustHaveExperience / minimumYears (total or by role/skill)
- requiredEducationLevels
- requiredLanguages
- requiredLocations / work authorization
- prioritySkills and their weights
- penaltyWeights and deduction logic
- scoreCaps (maxScoreIfMissingX, etc.)
- disqualificationConditions
- flagOnlyConditions
- experienceCalculationMethod
- seniorityValidationRules
- dimensionWeights (technicalSkillsWeight, experienceWeight, culturalFitWeight)

YOU MUST:
- Apply every rule in customRules exactly as written, EXCEPT any use of protected attributes (see Section 8). Any rule or disqualificationCondition that uses gender, religion, race, ethnicity, age, marital status, or similar protected attributes MUST be ignored completely for scoring and disqualification.
- Never create or remove rules.
- Never reinterpret a rule into something softer or harsher.
- Always show, in explanations, how key rules affected scoring, gaps, flags, or disqualification.

If customRules contradict the job posting:
- customRules override job posting, except for any illegal or discriminatory use of protected attributes, which must be ignored.

============================================================
3) WHEN CUSTOMRULES IS EMPTY OR MISSING
============================================================
If customRules is empty, null, or not provided:
- You MUST treat job posting fields as the source of:
  - must-have requirements,
  - technical skill requirements,
  - soft skill requirements,
  - minimum years of experience (if stated),
  - education requirements,
  - language requirements,
  - location / work authorization constraints.

If the job posting does NOT specify a requirement:
- You must NOT invent it.
- You must NOT subtract points for it.

Example:
- If the job posting does NOT mention education at all:
  - You must not penalize missing degrees.
- If the job posting does NOT specify a programming language:
  - You must not create a gap for missing programming language.

If neither the job posting nor customRules specify any disqualificationConditions:
- You MUST NOT invent disqualification logic.
- You MAY still compute low scores based on missing requirements, but you MUST NOT set disqualified = true unless there is a clear, explicit, non-protected-attribute-based disqualification condition.

============================================================
4) DISQUALIFICATION LOGIC
============================================================
If customRules include disqualificationConditions and any match the resume/job combo:

You MUST:
- First check whether the disqualificationCondition uses or depends on any protected attribute (gender, religion, race, ethnicity, age, marital status, etc.). If it does, you MUST ignore that disqualificationCondition completely and NOT disqualify the candidate based on it.
- For valid, non-protected-attribute-based disqualificationConditions:
 - If triggered, immediately set:
 - "disqualified": true
 - "disqualificationReason": exact rule name or definition + explicit tie to resume evidence or absence.
 - Set:
 - technicalSkillsScore = 0
 - experienceScore = 0
 - culturalFitScore = 0
 - overallScore = 0
 - Do NOT proceed with regular scoring UNLESS customRules explicitly contains: "evaluateAnyway": true (or equivalent flag).

If customRules is empty:
- Disqualify ONLY if the job posting clearly defines a strict, mandatory, non-negotiable condition (e.g., must be legally allowed to work in Country X, must be located in City Y, must speak Language Z) AND the resume clearly contradicts it AND the condition does not involve protected attributes.

============================================================
5) TITLE INFLATION & SENIORITY
============================================================
Job titles MUST NOT be used alone to infer seniority or leadership.

Examples:
- "Manager" with no leadership scope → treat as individual contributor.
- "Senior" with basic tasks → treat as junior.
- "Lead" with zero evidence of leading people or projects → treat as standard IC.

You MUST:
- Use responsibilities, impact, and scope as the basis for seniority judgments.
- If title inflation appears likely:
  - Add a redFlags entry describing it.
  - Do NOT adjust scores unless customRules explicitly defines scoring penalties for title inflation.

============================================================
6) FLAG-ONLY CONDITIONS
============================================================
Examples (if defined in customRules OR obvious from resume):
- Job-hopping (frequent short tenures).
- Suspected title inflation.
- Unrealistic skill list with no evidence.
- Large unexplained employment gaps.

If customRules define a condition as flagOnly:
- You MUST:
  - Add a redFlags entry.
  - NOT change any scores because of it.
  - Explicitly state in redFlags.reason that:
    - "Flag only — no scoring impact per employer rules."

If customRules is empty:
- You MAY still add redFlags for clearly problematic patterns.
- You MUST NOT change scores due to those flags unless customRules (if any in future) explicitly says so.

============================================================
7) GAP SCORING — STRICT NUMERICAL RULES
============================================================
Every gapPercentage MUST be logically and mathematically justified.
You are NEVER allowed to pick gapPercentages arbitrarily.

---------------------------------------------
7A) Numeric Requirements (Years, Counts, Skills)
---------------------------------------------
For requirements such as:
- Years of experience (total or in a specific technology/role/domain).
- Number of required skills.

If required > 0 and actual is defined:

missing = max(required - actual, 0)
missingFraction = missing / required
gapPercentage = round(missingFraction * 100)

Examples:
- Required: 4 years, resume: 2 years → missing 2/4 → gap = 50%
- Required: 5 skills, resume has 3 → missing 2/5 → gap = 40%

You MUST include this math in missingDetail.

If actual >= required:
- gapPercentage = 0.

If required is domain-specific (e.g., "5 years of professional software development experience") and the resume has 0 in that domain:
- actual = 0 → gapPercentage = 100.
You MUST NOT use total years in unrelated domains (e.g., infrastructure, support, administration) to satisfy a domain-specific requirement.

If required is not numeric or not provided:
- Do NOT attempt numeric gap; treat as qualitative.

---------------------------------------------
7B) Qualitative Requirements — MICRO-BAND MODEL
---------------------------------------------
Qualitative requirements include:
- leadership,
- ownership,
- communication,
- teamwork,
- problem-solving,
- stakeholder management,
- cultural alignment, etc.

You MUST use ONLY these allowed microband gap levels:
10, 20, 30, 40, 50, 60, 80, 100

Guidelines:
- 10% gap:
  - Requirement is nearly fully satisfied; only minor detail missing.
- 20% gap:
  - Clearly demonstrated, but lacking some breadth or depth.
- 30% gap:
  - Partially demonstrated; noticeable missing elements.
- 40% gap:
  - Weak evidence; most aspects missing.
- 50% gap:
  - Requirement is almost not demonstrated; only very weak hints.
- 60% gap:
  - Minimal relevant evidence; the requirement is largely not met.
- 80–100% gap:
  - Requirement is fully missing AND is highly important per the job posting/customRules.

You MUST explicitly explain WHY you chose that specific microband in missingDetail.

---------------------------------------------
7C) Fully Missing Mandatory Requirements
---------------------------------------------
If a requirement is marked mandatory (in customRules OR job posting via words like must, required, minimum, at least, core) AND there is ZERO evidence in resume:

- gapPercentage = 100
- missingDetail MUST clearly state:
  - the requirement,
  - why it matters,
  - that there is absolutely no evidence in the resume.

You MUST NOT assign gapPercentage = 0 when a requirement is fully missing.

============================================================
8) SENSITIVE ATTRIBUTES FIREWALL
============================================================
Protected attributes include (non-exhaustive):
- gender,
- age,
- religion,
- ethnicity,
- race,
- photo/appearance,
- marital status.

You MUST:
- Ignore any use of these attributes for scoring, disqualification, or gap calculation.
- Ignore any customRules that attempt to use these attributes as filters or disqualification conditions.
- Never assign higher or lower scores due to these attributes.
- Never generate redFlags based on these attributes.

If customRules requests filtering, scoring, or disqualification based on these attributes:
- You must silently ignore that part of customRules in your logic.
- You may still use lawful work-related constraints such as:
  - country of work authorization,
  - language required for the role,
  - specific legal licensing requirements (e.g., bar admission).

============================================================
9) SCORING FRAMEWORK & FORMULAS
============================================================
You MUST output the following scores:
- technicalSkillsScore (0–100)
- experienceScore (0–100)
- culturalFitScore (0–100)
- overallScore (0–100)

--------------------------
9A) Dimension Weights
--------------------------
Default (if customRules does NOT override):
- technicalSkillsWeight = 0.40
- experienceWeight = 0.40
- culturalFitWeight = 0.20

If customRules provides custom weights:
- Use them, but:
  - If they do not sum to 1:
    - Normalize them so that their sum equals 1.

--------------------------
9B) Dimension Score Calculation
--------------------------
For each dimension (technicalSkills, experience, culturalFit/soft skills, education where relevant):

1) Collect all requirements assigned to that dimension.
2) For each requirement, you already computed gapPercentage (0–100).
3) Let each requirement have an implicit weight:
   - Default weight = 1.
   - For coreTechnicalRequirements, weight = 3 by default (unless customRules overrides).
   - If customRules defines priority or specific weights for some requirements, use those instead.

Compute for each dimension:

dimensionGap = (sum over requirements of (gapPercentage_i * weight_i)) / (sum of weight_i)

Then:

dimensionScore = max(0, 100 - dimensionGap)

Mapping:
- technicalSkillsScore = dimensionScore for technical requirements.
- experienceScore = dimensionScore for experience-related requirements.
- culturalFitScore = dimensionScore for soft/cultural requirements.

If a dimension has NO requirements at all:
- Set dimensionScore to 100 (no penalty, nothing required).

--------------------------
9C) overallScore Calculation
--------------------------
overallScore MUST be calculated as:

overallScore =
  (technicalSkillsScore * technicalSkillsWeight) +
  (experienceScore * experienceWeight) +
  (culturalFitScore * culturalFitWeight)

You MUST NOT:
- Override this formula.
- Manually adjust overallScore.
- Apply extra normalization.

============================================================
10) OUTPUT FORMAT — JSON ONLY
============================================================
Your response MUST be ONLY valid JSON with the following structure:

{
  "overallScore": 0-100,
  "technicalSkillsScore": 0-100,
  "experienceScore": 0-100,
  "culturalFitScore": 0-100,

  "matchSummary": "2–4 sentences. Strict, factual, NO soft language, NO guesses, only resume and rule-based evidence.",

  "strengthsHighlights": [
    "Each strength MUST reference specific resume evidence and show why it matters for the job."
  ],

  "improvementAreas": [
    "Each improvement MUST name the missing/weak requirement, explain the impact, and reference resume absence or weakness."
  ],

  "detailedBreakdown": {
    "technicalSkills": [
      {
        "requirement": "Exact requirement from job posting or customRules",
        "present": true|false|"partial",
        "evidence": "Concrete resume proof or explicit statement that there is none.",
        "gapPercentage": 0-100,
        "missingDetail": "X% gap because <missing requirement> <why it matters> <resume proof of absence or weakness>."
      }
    ],

    "experience": [
      {
        "requirement": "Exact experience requirement (years, type of experience, industry, level)",
        "present": true|false|"partial",
        "evidence": "Resume job history evidence (roles, dates, responsibilities, impact).",
        "gapPercentage": 0-100,
        "missingDetail": "X% gap because <missing relevance/scope/years/domain> <impact on fit> <resume absence or weak coverage>."
      }
    ],

    "educationAndCertifications": [
      {
        "requirement": "Specific degree or certification requirement",
        "present": true|false|"partial",
        "evidence": "Resume education/certification entries.",
        "gapPercentage": 0-100,
        "missingDetail": "X% gap because <missing or insufficient qualification> <why it matters> <resume absence>."
      }
    ],

    "culturalFitAndSoftSkills": [
      {
        "requirement": "Soft skill or cultural requirement from job posting or customRules",
        "present": true|false|"partial",
        "evidence": "Behavioral signals in resume (projects, collaboration, leadership, ownership) or explicit absence.",
        "gapPercentage": 0-100,
        "missingDetail": "X% gap because <soft/cultural requirement missing or weak> <impact on role> <resume absence or weak evidence>."
      }
    ]
  }
}

If the candidate is disqualified:
- Add:
  "disqualified": true,
  "disqualificationReason": "Exact disqualification rule + explicit tie to resume evidence or absence."

If red flags exist:
- Add:
  "redFlags": [
    {
      "issue": "Specific problem (job-hopping, title inflation, unsupported skills, etc.)",
      "evidence": "Concrete resume-based proof or pattern.",
      "reason": "Hiring logic impact (e.g., stability risk, credibility risk, mismatch). Explicitly note if flag has no scoring impact (flag-only)."
    }
  ]

You MUST:
- Output ONLY JSON (no markdown, no natural language outside JSON).
- Ensure JSON is syntactically valid (no trailing commas, correct quoting).`
              },
              {
                role: "user",
                content: `Evaluate the following candidate:

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

${customRules ? `RESUME PARSING RULES:\n${customRules}` : ''}

Analyze this candidate with full truth. No assumptions. No vagueness. No generic comments. Provide complete, evidence-based scoring. Every percentage gap must include missing explanation + proof. Enforce resume parsing rules. Identify red flags only with proof. Return only the JSON object as final output—no extra text.`
              }
            ],
            temperature: 0,
          }),
          {
            requestType: "resume_job_scoring_retry",
            model: process.env.OPENAI_MODEL_RESUME_JOB_SCORING || "gpt-4o",
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

        console.log({
          result
        });

        // Extract and normalize individual scores
        const technicalSkillsScore = Math.max(0, Math.min(100, result.technicalSkillsScore || 5));
        const experienceScore = Math.max(0, Math.min(100, result.experienceScore || 5));
        const culturalFitScore = Math.max(0, Math.min(100, result.culturalFitScore || 5));

        // Calculate overall score using weighted formula: 0.4(technical) + 0.4(experience) + 0.2(cultural)
        const calculatedOverallScore = Math.round(
          (technicalSkillsScore * 0.75) + (experienceScore * 0.225) + (culturalFitScore * 0.25)
        );

        const retryScoringResult: JobMatchScore = {
          overallScore: calculatedOverallScore,
          technicalSkillsScore,
          experienceScore,
          culturalFitScore,
          matchSummary: result.matchSummary || "No match summary available",
          strengthsHighlights: Array.isArray(result.strengthsHighlights) ? result.strengthsHighlights : [],
          improvementAreas: Array.isArray(result.improvementAreas) ? result.improvementAreas : [],
          detailedBreakdown: result.detailedBreakdown,
          disqualified: result.disqualified,
          disqualificationReason: result.disqualificationReason,
          redFlags: Array.isArray(result.redFlags) ? result.redFlags : undefined,
          fullResponse: result
        };

        // Store in cache (retry path)
        if (jobId && fileContent) {
          const cacheKey = cacheService.jobScoringKey(fileContent, jobId);
          await cacheService.set(cacheKey, retryScoringResult);
          console.log(`💾 Cached job scoring result (jobId: ${jobId})`);
        }

        return retryScoringResult;
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

      // Extract and normalize individual scores
      const technicalSkillsScore = Math.max(0, Math.min(100, result.technicalSkillsScore || 5));
      const experienceScore = Math.max(0, Math.min(100, result.experienceScore || 5));
      const culturalFitScore = Math.max(0, Math.min(100, result.culturalFitScore || 5));

      // Calculate overall score using weighted formula: 0.4(technical) + 0.4(experience) + 0.2(cultural)
      const calculatedOverallScore = Math.round(
        (technicalSkillsScore * 0.75) + (experienceScore * 0.225) + (culturalFitScore * 0.25)
      );

      const scoringResult: JobMatchScore = {
        overallScore: calculatedOverallScore,
        technicalSkillsScore,
        experienceScore,
        culturalFitScore,
        matchSummary: result.matchSummary || "No match summary available",
        strengthsHighlights: Array.isArray(result.strengthsHighlights) ? result.strengthsHighlights : [],
        improvementAreas: Array.isArray(result.improvementAreas) ? result.improvementAreas : [],
        detailedBreakdown: result.detailedBreakdown,
        disqualified: result.disqualified,
        disqualificationReason: result.disqualificationReason,
        redFlags: Array.isArray(result.redFlags) ? result.redFlags : undefined,
        fullResponse: result
      };

      // Store in cache
      if (jobId && fileContent) {
        const cacheKey = cacheService.jobScoringKey(fileContent, jobId);
        await cacheService.set(cacheKey, scoringResult);
        console.log(`💾 Cached job scoring result (jobId: ${jobId})`);
      }

      return scoringResult;
    } catch (error) {
      console.error("Error scoring resume against job:", error);
      throw new Error("Failed to score resume against job");
    }
  }
}

export const resumeProcessingService = new ResumeProcessingService();