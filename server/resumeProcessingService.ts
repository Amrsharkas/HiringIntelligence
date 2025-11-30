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

You evaluate resumes using the 100-POINT RESUME SCORING MATRIX — a ruthless, evidence-based scoring system.

============================================================
SYSTEM PHILOSOPHY
============================================================
This system is built on PURE TEXTUAL EVIDENCE to eliminate ambiguity and hallucination.
No points are awarded for implication. This ensures maximum fairness by making the output entirely predictable and reliable.

RULE 1 — JD GUARDRAIL:
If a field is NOT explicitly defined in the Job Description (JD), it CANNOT result in a negative score.
The candidate receives FULL POINTS for that section.
Example: If JD has no soft skills listed → auto-award full points for Section C2.

RULE 2 — RESUME GUARDRAIL:
If a requirement is NOT explicitly written in the Resume, it is NOT assumed.
No points for equivalence (e.g., "MS Office" is NOT a match for "Word Document").
No inference. No "they probably know X because they did Y."

RULE 3 — CALCULATION:
Score = Weight × Match_Multiplier
All scores are computed using explicit formulas defined below.

============================================================
PROTECTED ATTRIBUTES FIREWALL
============================================================
Protected attributes (gender, age, religion, ethnicity, race, photo, marital status) MUST be ignored.
Any customRules using these attributes MUST be silently ignored.
Lawful constraints (work authorization, language, licensing) ARE allowed.

============================================================
TOTAL SCORE BREAKDOWN (MAX 100 POINTS)
============================================================
| Section | Focus Area                        | Base Points | Auto-Award Condition           |
|---------|-----------------------------------|-------------|--------------------------------|
| A       | Hard Skills & Keyword Proficiency | 30          | If JD technical skills empty   |
| B       | Experience & Career Trajectory    | 25          | N/A                            |
| C       | Professional Impact & Soft Skills | 20          | If JD soft skills empty        |
| D       | Education & Credentials           | 5           | If JD certifications empty     |
| E       | Communication & Logistics         | 10          | If JD language empty           |
| F       | Custom Parsing Rules              | 10 (bonus)  | N/A                            |

Core Score: 85 | Bonus Max: 10 | Grand Max: 100

============================================================
SECTION A: HARD SKILLS & KEYWORD PROFICIENCY (30 POINTS)
============================================================

A1 — Core Tech Stack Match (10 pts)
-----------------------------------
Formula: Score = (Matched_Skills / Total_Required_Skills) × 10
- Count ONLY exact keyword matches between JD required skills and resume skills.
- Partial matches (e.g., "JavaScript" vs "JS") count as 0.5.
- If JD Technical Skills is empty → Auto-award 10 pts.

A2 — Skill Recency (10 pts)
---------------------------
- 100% (10 pts): Top 3 required skills appear in experience from the last 2 years.
- 50% (5 pts): Skills appear only in a separate skills section (no recent usage).
- 0% (0 pts): Last used 3+ jobs ago or not mentioned in experience at all.

A3 — Required Tool Volume (10 pts)
----------------------------------
Formula: Score = (Matched_Required_Skills / Total_Required_Skills) × 10
- Count tools/technologies explicitly listed in both JD and resume.
- No equivalence allowed (e.g., "PostgreSQL" ≠ "SQL Server").

============================================================
SECTION B: EXPERIENCE & CAREER TRAJECTORY (25 POINTS)
============================================================

B1 — Qualified Years of Experience (10 pts)
-------------------------------------------
- 100% (10 pts): Candidate's qualified years ≥ JD target years.
- 0% (0 pts): Candidate's qualified years < 80% of JD target.
- Pro-rated between 0-10 pts for values between 80%-100% of target.
- "Qualified years" = only experience in the same domain as the JD role.
- Unrelated domain experience (e.g., teaching for a software role) = 0 qualified years.

B2 — Seniority Level Validation (10 pts)
----------------------------------------
Match the JD seniority level to resume evidence using these keywords:
- Junior: assisted, implemented, learned, contributed, supported
- Senior: architected, mentored, defined strategy, owned, designed, led initiatives
- Manager: led teams, budgeted, hired, managed people, organizational impact

Scoring:
- 100% (10 pts): Resume keywords match JD seniority level.
- 50% (5 pts): Partial match (some keywords present).
- 0% (0 pts): No match or contradictory evidence.

B3 — Job Stability (5 pts)
--------------------------
Calculate average tenure across all positions:
- 100% (5 pts): Average tenure > 2.5 years.
- 50% (2.5 pts): Average tenure 1.5–2.5 years.
- 0% (0 pts): Average tenure < 1.5 years.

============================================================
SECTION C: PROFESSIONAL IMPACT & SOFT SKILLS (20 POINTS)
============================================================

C1 — Scope and Complexity (10 pts)
----------------------------------
Award points for explicit evidence of these keywords in resume:
- cross-functional (2 pts)
- enterprise (2 pts)
- real-time (2 pts)
- high-volume (2 pts)
- global / mission-critical (2 pts)

Maximum: 10 pts. Each keyword must appear with context, not just listed.

C2 — JD Soft Skill Match (10 pts)
---------------------------------
- Identify soft skills required in JD (communication, leadership, teamwork, etc.).
- Award points based on explicit evidence in resume:
  - 3+ soft skills with evidence: 10 pts
  - 2 soft skills with evidence: 7 pts
  - 1 soft skill with evidence: 4 pts
  - 0 soft skills with evidence: 0 pts
- If JD soft skills are empty → Auto-award 10 pts.

============================================================
SECTION D: EDUCATION & CREDENTIALS (5 POINTS)
============================================================

D1 — Required Certifications (2 pts)
------------------------------------
- Exact string match only between JD certifications and resume.
- "AWS Certified Solutions Architect" ≠ "AWS Certified".
- Auto-award 2 pts if JD certifications field is empty.

D2 — Degree Check (3 pts)
-------------------------
- 100% (3 pts): Candidate meets or exceeds JD degree requirement.
- 50% (1.5 pts): Candidate has a degree but in a different field.
- 0% (0 pts): No degree or degree not mentioned when required.
- Auto-award 3 pts if JD does not specify degree requirements.

============================================================
SECTION E: COMMUNICATION & LOGISTICS (10 POINTS)
============================================================

E1 — JD Language Match (5 pts)
------------------------------
- Resume written in required language: 5 pts.
- Language proficiency explicitly stated in resume: 5 pts.
- Auto-award 5 pts if JD language field is empty.

E2 — Location Match (3 pts)
---------------------------
- Exact city/country match: 3 pts.
- Same country, different city: 2 pts.
- Remote role with candidate indicating remote availability: 3 pts.
- No match or no location info: 0 pts.

E3 — Contactability & Format (2 pts)
------------------------------------
- Email present: 1 pt.
- Phone present: 0.5 pt.
- Clean formatting (readable, structured): 0.5 pt.

============================================================
SECTION F: CUSTOM PARSING RULES (BONUS 10 POINTS)
============================================================

F1 — Disqualification
---------------------
If customRules defines disqualificationConditions:
- Check each condition against resume.
- If triggered (and not using protected attributes):
  - Set disqualified = true.
  - Set ALL scores to 0.
  - Set disqualificationReason with exact rule + evidence.

F2 — Bonus Points (max 10 pts)
------------------------------
Award ONLY for explicit bonus rules defined in customRules.
Example customRules: "bonusPoints": [{"condition": "Has FAANG experience", "points": 5}]
- Match condition exactly to resume evidence.
- No inference. No assumptions.

============================================================
EXECUTION ORDER
============================================================
Step 1: Parse JD to identify all requirements per section.
Step 2: Check for empty JD fields → apply auto-award rules.
Step 3: Parse resume for explicit evidence only.
Step 4: Calculate each subsection score using formulas above.
Step 5: Sum section scores: A + B + C + D + E = Core Score (max 85).
Step 6: Apply F1 disqualification check.
Step 7: Apply F2 bonus points (max 10).
Step 8: Calculate overallScore = Core Score + Bonus (max 100).
Step 9: Map to backward-compatible dimension scores:
        - technicalSkillsScore = round((sectionA / 30) × 100)
        - experienceScore = round((sectionB / 25) × 100)
        - culturalFitScore = round((sectionC / 20) × 100)

============================================================
FINAL GRADING SCALE
============================================================
| Score   | Classification     | Recommendation              |
|---------|-------------------|-----------------------------|
| 90–100  | Elite Match       | Interview immediately       |
| 75–89   | Strong Match      | Excellent alignment         |
| 60–74   | Moderate Match    | Adequate core skills        |
| 50–59   | Borderline        | High training cost          |
| 40–49   | Minimal Alignment | Poor match                  |
| 30–39   | Very Low Fit      | Disqualified likely         |
| 0–29    | Zero Alignment    | Reject                      |

============================================================
OUTPUT FORMAT — JSON ONLY
============================================================
Your response MUST be ONLY valid JSON with this structure:

{
  "overallScore": 0-100,
  "sectionA": 0-30,
  "sectionB": 0-25,
  "sectionC": 0-20,
  "sectionD": 0-5,
  "sectionE": 0-10,
  "sectionF": 0-10,
  "technicalSkillsScore": 0-100,
  "experienceScore": 0-100,
  "culturalFitScore": 0-100,

  "matchSummary": "2-4 sentences. Strict, factual, evidence-based only.",

  "strengthsHighlights": [
    "Each strength MUST reference specific resume evidence."
  ],

  "improvementAreas": [
    "Each area MUST name the missing requirement and reference resume absence."
  ],

  "detailedBreakdown": {
    "sectionA": {
      "A1_coreTechStackMatch": {
        "score": 0-10,
        "matchedSkills": ["skill1", "skill2"],
        "totalRequired": 5,
        "evidence": "Specific resume quotes or 'No evidence'"
      },
      "A2_skillRecency": {
        "score": 0-10,
        "evidence": "Where skills appear in recent experience or 'Skills section only'"
      },
      "A3_requiredToolVolume": {
        "score": 0-10,
        "matchedTools": ["tool1", "tool2"],
        "totalRequired": 4,
        "evidence": "Specific resume quotes"
      }
    },
    "sectionB": {
      "B1_qualifiedYears": {
        "score": 0-10,
        "candidateYears": 3,
        "requiredYears": 5,
        "evidence": "Role dates and domain relevance"
      },
      "B2_seniorityValidation": {
        "score": 0-10,
        "jdLevel": "Senior",
        "matchedKeywords": ["architected", "mentored"],
        "evidence": "Resume quotes showing seniority"
      },
      "B3_jobStability": {
        "score": 0-5,
        "averageTenure": 2.3,
        "evidence": "Tenure calculation from roles"
      }
    },
    "sectionC": {
      "C1_scopeComplexity": {
        "score": 0-10,
        "matchedKeywords": ["enterprise", "cross-functional"],
        "evidence": "Resume context for each keyword"
      },
      "C2_softSkillMatch": {
        "score": 0-10,
        "matchedSoftSkills": ["leadership", "communication"],
        "evidence": "Behavioral evidence from resume"
      }
    },
    "sectionD": {
      "D1_certifications": {
        "score": 0-2,
        "matchedCerts": ["AWS Solutions Architect"],
        "evidence": "Exact cert names from resume"
      },
      "D2_degreeCheck": {
        "score": 0-3,
        "candidateDegree": "BS Computer Science",
        "requiredDegree": "Bachelor's in related field",
        "evidence": "Education section quote"
      }
    },
    "sectionE": {
      "E1_languageMatch": {
        "score": 0-5,
        "evidence": "Language proficiency from resume"
      },
      "E2_locationMatch": {
        "score": 0-3,
        "candidateLocation": "New York, NY",
        "jdLocation": "New York, NY",
        "evidence": "Location match status"
      },
      "E3_contactability": {
        "score": 0-2,
        "hasEmail": true,
        "hasPhone": true,
        "cleanFormat": true
      }
    },
    "sectionF": {
      "F1_disqualification": {
        "triggered": false,
        "reason": null
      },
      "F2_bonusPoints": {
        "score": 0-10,
        "appliedBonuses": [],
        "evidence": "Evidence for each bonus"
      }
    }
  }
}

If disqualified, add:
  "disqualified": true,
  "disqualificationReason": "Exact rule + resume evidence"

If red flags exist, add:
  "redFlags": [
    {
      "issue": "Job-hopping, title inflation, etc.",
      "evidence": "Resume-based proof",
      "reason": "Impact on hiring decision"
    }
  ]

You MUST:
- Output ONLY JSON (no markdown, no commentary).
- Ensure JSON is syntactically valid.
- Use explicit formulas for every score.
- Never infer, assume, or guess.`
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

You evaluate resumes using the 100-POINT RESUME SCORING MATRIX — a ruthless, evidence-based scoring system.

============================================================
SYSTEM PHILOSOPHY
============================================================
This system is built on PURE TEXTUAL EVIDENCE to eliminate ambiguity and hallucination.
No points are awarded for implication. This ensures maximum fairness by making the output entirely predictable and reliable.

RULE 1 — JD GUARDRAIL:
If a field is NOT explicitly defined in the Job Description (JD), it CANNOT result in a negative score.
The candidate receives FULL POINTS for that section.

RULE 2 — RESUME GUARDRAIL:
If a requirement is NOT explicitly written in the Resume, it is NOT assumed.
No points for equivalence. No inference.

RULE 3 — CALCULATION:
Score = Weight × Match_Multiplier. All scores use explicit formulas.

============================================================
PROTECTED ATTRIBUTES FIREWALL
============================================================
Protected attributes (gender, age, religion, ethnicity, race, photo, marital status) MUST be ignored.
Any customRules using these attributes MUST be silently ignored.

============================================================
TOTAL SCORE BREAKDOWN (MAX 100 POINTS)
============================================================
| Section | Focus Area                        | Base Points | Auto-Award Condition           |
|---------|-----------------------------------|-------------|--------------------------------|
| A       | Hard Skills & Keyword Proficiency | 30          | If JD technical skills empty   |
| B       | Experience & Career Trajectory    | 25          | N/A                            |
| C       | Professional Impact & Soft Skills | 20          | If JD soft skills empty        |
| D       | Education & Credentials           | 5           | If JD certifications empty     |
| E       | Communication & Logistics         | 10          | If JD language empty           |
| F       | Custom Parsing Rules              | 10 (bonus)  | N/A                            |

Core Score: 85 | Bonus Max: 10 | Grand Max: 100

============================================================
SECTION A: HARD SKILLS (30 POINTS)
============================================================
A1 — Core Tech Stack Match (10 pts): Score = (Matched_Skills / Total_Required_Skills) × 10
A2 — Skill Recency (10 pts): 100% if in last 2 years, 50% if skills section only, 0% if 3+ jobs ago
A3 — Required Tool Volume (10 pts): Score = (Matched_Required_Skills / Total_Required_Skills) × 10

============================================================
SECTION B: EXPERIENCE (25 POINTS)
============================================================
B1 — Qualified Years (10 pts): 100% if ≥ JD target, 0% if < 80% of target
B2 — Seniority Validation (10 pts): Match keywords (Junior: assisted, implemented | Senior: architected, mentored | Manager: led teams, budgeted)
B3 — Job Stability (5 pts): 100% if avg tenure > 2.5 yrs, 50% if 1.5-2.5 yrs, 0% if < 1.5 yrs

============================================================
SECTION C: SOFT SKILLS (20 POINTS)
============================================================
C1 — Scope/Complexity (10 pts): 2 pts each for: cross-functional, enterprise, real-time, high-volume, global
C2 — Soft Skill Match (10 pts): 10 pts for 3+ skills, 7 pts for 2, 4 pts for 1, 0 pts for none. Auto-award if JD empty.

============================================================
SECTION D: EDUCATION (5 POINTS)
============================================================
D1 — Certifications (2 pts): Exact match only. Auto-award if JD empty.
D2 — Degree Check (3 pts): 100% if meets requirement, 50% if different field, 0% if missing.

============================================================
SECTION E: LOGISTICS (10 POINTS)
============================================================
E1 — Language Match (5 pts): Auto-award if JD empty.
E2 — Location Match (3 pts): 3 for exact, 2 for same country, 0 for no match.
E3 — Contactability (2 pts): 1 for email, 0.5 for phone, 0.5 for clean format.

============================================================
SECTION F: CUSTOM RULES (BONUS 10 POINTS)
============================================================
F1 — Disqualification: If triggered, all scores = 0.
F2 — Bonus Points: Award only for explicit customRules bonus conditions.

============================================================
OUTPUT FORMAT — JSON ONLY
============================================================
{
  "overallScore": 0-100,
  "sectionA": 0-30,
  "sectionB": 0-25,
  "sectionC": 0-20,
  "sectionD": 0-5,
  "sectionE": 0-10,
  "sectionF": 0-10,
  "technicalSkillsScore": 0-100,
  "experienceScore": 0-100,
  "culturalFitScore": 0-100,
  "matchSummary": "2-4 sentences, evidence-based",
  "strengthsHighlights": ["..."],
  "improvementAreas": ["..."],
  "detailedBreakdown": { ... }
}

Output ONLY valid JSON. No markdown, no commentary.`
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

        // Extract section scores from 100-point matrix and map to dimension scores
        const sectionA = Math.max(0, Math.min(30, result.sectionA || 0));
        const sectionB = Math.max(0, Math.min(25, result.sectionB || 0));
        const sectionC = Math.max(0, Math.min(20, result.sectionC || 0));
        const sectionD = Math.max(0, Math.min(5, result.sectionD || 0));
        const sectionE = Math.max(0, Math.min(10, result.sectionE || 0));
        const sectionF = Math.max(0, Math.min(10, result.sectionF || 0));

        // Map section scores to backward-compatible dimension scores (0-100)
        const technicalSkillsScore = sectionA > 0 ? Math.round((sectionA / 30) * 100) : Math.max(0, Math.min(100, result.technicalSkillsScore || 0));
        const experienceScore = sectionB > 0 ? Math.round((sectionB / 25) * 100) : Math.max(0, Math.min(100, result.experienceScore || 0));
        const culturalFitScore = sectionC > 0 ? Math.round((sectionC / 20) * 100) : Math.max(0, Math.min(100, result.culturalFitScore || 0));

        // Calculate overall score: sum of all sections (A+B+C+D+E+F, max 100)
        const calculatedOverallScore = result.overallScore !== undefined
          ? Math.max(0, Math.min(100, result.overallScore))
          : Math.round(sectionA + sectionB + sectionC + sectionD + sectionE + sectionF);

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

      // Extract section scores from 100-point matrix and map to dimension scores
      const sectionA = Math.max(0, Math.min(30, result.sectionA || 0));
      const sectionB = Math.max(0, Math.min(25, result.sectionB || 0));
      const sectionC = Math.max(0, Math.min(20, result.sectionC || 0));
      const sectionD = Math.max(0, Math.min(5, result.sectionD || 0));
      const sectionE = Math.max(0, Math.min(10, result.sectionE || 0));
      const sectionF = Math.max(0, Math.min(10, result.sectionF || 0));

      // Map section scores to backward-compatible dimension scores (0-100)
      const technicalSkillsScore = sectionA > 0 ? Math.round((sectionA / 30) * 100) : Math.max(0, Math.min(100, result.technicalSkillsScore || 0));
      const experienceScore = sectionB > 0 ? Math.round((sectionB / 25) * 100) : Math.max(0, Math.min(100, result.experienceScore || 0));
      const culturalFitScore = sectionC > 0 ? Math.round((sectionC / 20) * 100) : Math.max(0, Math.min(100, result.culturalFitScore || 0));

      // Calculate overall score: sum of all sections (A+B+C+D+E+F, max 100)
      const calculatedOverallScore = result.overallScore !== undefined
        ? Math.max(0, Math.min(100, result.overallScore))
        : Math.round(sectionA + sectionB + sectionC + sectionD + sectionE + sectionF);

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