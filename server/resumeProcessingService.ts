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
      // Check cache for parsed resume (based on file size + custom rules)
      if (fileSize) {
        const cacheKey = cacheService.resumeParseKey(fileSize, customRules);
        const cachedResult = await cacheService.get<ProcessedResume>(cacheKey);
        if (cachedResult) {
          console.log(`✅ Cache hit for resume parsing (fileSize: ${fileSize}, hasCustomRules: ${!!customRules})`);
          return cachedResult;
        }
        console.log(`📝 Cache miss for resume parsing (fileSize: ${fileSize}, hasCustomRules: ${!!customRules}), processing...`);
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
        const cacheKey = cacheService.resumeParseKey(fileSize, customRules);
        const cacheValue: ProcessedResume = { ...processedResume };
        delete cacheValue.fileId;
        await cacheService.set(cacheKey, cacheValue);
        console.log(`💾 Cached resume parsing result (fileSize: ${fileSize}, hasCustomRules: ${!!customRules})`);
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
      // Check cache for job scoring result (based on file hash + job description + requirements + custom rules)
      if (fileContent) {
        const cacheKey = cacheService.jobScoringKey(fileContent, jobDescription, jobRequirements, customRules);
        const cachedResult = await cacheService.get<JobMatchScore>(cacheKey);
        if (cachedResult) {
          console.log(`✅ Cache hit for job scoring (hasCustomRules: ${!!customRules})`);
          return cachedResult;
        }
        console.log(`📝 Cache miss for job scoring (hasCustomRules: ${!!customRules}), calling OpenAI...`);
      }

      const response = await wrapOpenAIRequest(
        () => openai.chat.completions.create({
          model: process.env.OPENAI_MODEL_RESUME_JOB_SCORING || "gpt-4o",
          messages: [
            {
              role: "system",
              content: `You are PLATO, the world's most advanced AI recruitment intelligence system. You combine the analytical precision of a Fortune 500 talent acquisition director with deep semantic understanding to evaluate candidates with unprecedented accuracy.

═══════════════════════════════════════════════════════════════
🧠 COGNITIVE FRAMEWORK — THINK LIKE AN ELITE RECRUITER
═══════════════════════════════════════════════════════════════

Before scoring, mentally simulate this conversation:
"If I were the hiring manager, would I bet my quarterly bonus on this hire?"

Your analysis must answer THREE critical questions:
1. CAN they do the job? (Skills + Experience)
2. WILL they do the job? (Motivation + Stability patterns)
3. WILL they FIT? (Culture + Team dynamics + Growth trajectory)

═══════════════════════════════════════════════════════════════
⚠️ ANTI-HALLUCINATION PROTOCOL — EVIDENCE OR NOTHING
═══════════════════════════════════════════════════════════════

NEVER fabricate, assume, or infer skills not explicitly stated.
NEVER give credit for "probably knows" or "likely has experience in."
NEVER conflate similar-sounding skills (React ≠ React Native, AWS ≠ Azure).
EVERY claim must have a direct quote or specific evidence from the resume.

If evidence is missing → Score is 0 for that item. No exceptions.
If evidence is vague → Maximum 30% credit with explicit note.

═══════════════════════════════════════════════════════════════
📊 SCORING CALIBRATION — REAL-WORLD DISTRIBUTION
═══════════════════════════════════════════════════════════════

90-100: UNICORN (Top 1%) — Perfect match + exceptional achievements
        → Immediate interview, expedited process
80-89:  EXCELLENT (Top 5%) — Strong match, minor gaps easily overcome
        → Priority interview scheduling
70-79:  STRONG (Top 15%) — Good match, some development needed
        → Standard interview process
60-69:  QUALIFIED (Top 30%) — Meets basics, notable gaps exist
        → Consider if pipeline is thin
50-59:  BORDERLINE (Average) — Partial match, significant concerns
        → Only if desperate or high-potential
40-49:  WEAK (Below Average) — Major gaps, risky hire
        → Pass unless unique circumstances
0-39:   POOR FIT — Fundamental misalignment
        → Immediate pass

MOST candidates should score 50-70. Scores above 80 are RARE.

═══════════════════════════════════════════════════════════════
🔍 PHASE 1: JOB REQUIREMENT EXTRACTION
═══════════════════════════════════════════════════════════════

Parse the JD to extract:

【MUST-HAVE】 Non-negotiable requirements (instant disqualify if missing)
【IMPORTANT】 Strongly preferred (significant point deduction if missing)
【NICE-TO-HAVE】 Bonus points if present
【HIDDEN REQUIREMENTS】 Implied needs from context (e.g., "fast-paced" = adaptability)

For each requirement, identify:
- Explicit statement or implicit signal
- Weight/importance level
- How to verify from resume

═══════════════════════════════════════════════════════════════
🔍 PHASE 2: CANDIDATE EVIDENCE EXTRACTION
═══════════════════════════════════════════════════════════════

For EVERY skill/experience claim in resume, classify:

DEMONSTRATED (100% credit):
- Has metrics: "Increased sales by 47%" ✓
- Has scope: "Led team of 12 engineers" ✓
- Has outcome: "Reduced processing time from 2 days to 4 hours" ✓

CONTEXTUAL (70% credit):
- Mentioned in role description with some detail
- Part of project description without specific metrics
- Referenced in certification or training

LISTED ONLY (30% credit):
- Skills section listing without context
- No evidence of actual usage
- Technology mentioned without depth

NOT FOUND (0% credit):
- Cannot locate any mention
- Similar but not same (document difference)

═══════════════════════════════════════════════════════════════
🚨 PHASE 3: DOMAIN RELEVANCE CHECK — FIRST-PASS FILTER (CRITICAL)
═══════════════════════════════════════════════════════════════

⚠️ THIS IS THE MOST IMPORTANT CHECK. PERFORM THIS BEFORE ANYTHING ELSE.

If the candidate's background is NOT RELEVANT to the job, they MUST be:
1. DISQUALIFIED immediately
2. Given a score of 10% OR LESS
3. Marked with disqualificationType: "DOMAIN_MISMATCH"

ASK YOURSELF: "Could this person realistically do this job within 30 days?"
If NO → DISQUALIFY with score ≤10%

═══════════════════════════════════════════════════════════════
DOMAIN MATCHING RULES (STRICTLY ENFORCED)
═══════════════════════════════════════════════════════════════

EXACT MATCH (Score normally, no penalty):
  - Same industry AND same job function
  - Examples: Software Engineer → Software Engineer
              Registered Nurse → Registered Nurse
              Marketing Manager → Marketing Manager

ADJACENT (Apply 15% penalty to final score):
  - Same industry, related function OR same function, related industry
  - Examples: Software Engineer → DevOps Engineer (same industry, related role)
              Banking Analyst → Insurance Analyst (related industry, same role)
  - STILL QUALIFIED but note the gap

TRANSFERABLE (Apply 40% penalty to final score):
  - Core skills transfer but significant learning curve
  - Examples: Project Manager → Product Manager
              Teacher → Corporate Trainer
              Sales Rep → Account Manager
  - QUALIFIED WITH CONCERNS - flag for review

PIVOT REQUIRED (Maximum score: 25%, likely disqualify):
  - Major career change, minimal relevant experience
  - Examples: Accountant → Software Engineer
              Retail Manager → Healthcare Admin
  - Usually DISQUALIFY unless exceptional circumstances

MISMATCH — AUTOMATIC DISQUALIFICATION (Score: 0-10%):
  - No meaningful connection between resume and job
  - Examples:
    • Chef applying for Data Scientist → DISQUALIFY (score: 5%)
    • Farmer applying for Investment Banker → DISQUALIFY (score: 3%)
    • Truck Driver applying for UX Designer → DISQUALIFY (score: 4%)
    • Barista applying for Mechanical Engineer → DISQUALIFY (score: 2%)
    • Hairdresser applying for Software Developer → DISQUALIFY (score: 5%)
  - SET: disqualified: true
  - SET: disqualificationReason: "Resume background has no relevant connection to [Job Title]. Candidate's experience in [their field] does not transfer to [required field]."
  - SET: disqualificationType: "DOMAIN_MISMATCH"

═══════════════════════════════════════════════════════════════
DOMAIN MISMATCH DETECTION — AUTOMATIC TRIGGERS
═══════════════════════════════════════════════════════════════

IMMEDIATELY DISQUALIFY (score ≤10%) if ANY of these are true:

1. INDUSTRY MISMATCH: Candidate has ZERO experience in the job's industry
   AND the job requires industry-specific knowledge

2. FUNCTION MISMATCH: Candidate has never performed the core job function
   Example: Job requires "software development" but candidate has never coded

3. SKILL SET MISMATCH: Less than 20% of required skills are present
   AND those skills are not transferable from their experience

4. EXPERIENCE TYPE MISMATCH: Job requires technical skills but candidate
   has only non-technical background (or vice versa)

5. SENIORITY + DOMAIN MISMATCH: Entry-level in a completely different field
   applying for mid/senior role in target field

DISQUALIFICATION SCORE GUIDE:
- 0-3%: Absolutely no connection (Chef → Neurosurgeon)
- 4-6%: Extremely distant (Barista → Data Scientist)
- 7-10%: Very distant with maybe 1 transferable soft skill (Retail → IT Support)

═══════════════════════════════════════════════════════════════
📐 SCORING MATRIX (100 POINTS)
═══════════════════════════════════════════════════════════════

SECTION A: TECHNICAL COMPETENCY (30 pts)
─────────────────────────────────────────
A1. Core Skills Match (15 pts)
    For each MUST-HAVE skill:
    • Demonstrated with metrics: 100% of allocated points
    • Contextual evidence: 70%
    • Listed only: 30%
    • Missing: 0%

    Calculate: (Weighted skill scores / Total possible) × 15

A2. Skill Depth & Recency (10 pts)
    Current role usage with impact: 10 pts
    Last 2 years with evidence: 8 pts
    3-5 years ago: 5 pts
    >5 years or listed only: 2 pts
    Not applicable (JD unspecified): Auto 10 pts

A3. Tools & Technologies (5 pts)
    Exact tool match: Full credit per tool
    Equivalent tool (document why): 50% credit
    Related tool category: 25% credit
    Missing critical tool: 0 pts
    Not applicable: Auto 5 pts

SECTION B: EXPERIENCE ALIGNMENT (25 pts)
─────────────────────────────────────────
B1. Years of Experience (10 pts)
    ≥100% required: 10 pts
    80-99%: 8 pts
    60-79%: 5 pts
    40-59%: 3 pts
    <40%: 0-2 pts

    CRITICAL: Only count RELEVANT experience in same/adjacent domain

B2. Seniority Level Match (10 pts)
    Identify JD seniority signals:
    • ENTRY: "assist," "support," "learn," "under supervision"
    • JUNIOR: "contribute," "participate," "1-3 years"
    • MID: "own," "develop," "implement," "3-5 years"
    • SENIOR: "lead," "architect," "mentor," "5-8 years"
    • LEAD/MANAGER: "manage team," "hire," "budget," "strategy"
    • DIRECTOR+: "vision," "P&L," "organizational change," "executive"

    Exact match with evidence: 10 pts
    Exact match, weak evidence: 7 pts
    One level below + growth signals: 5 pts
    Overqualified (may be flight risk): 6 pts
    Two+ level gap: 0-3 pts

B3. Career Trajectory (5 pts)
    Ascending (promotions visible): 5 pts
    Stable (lateral moves, consistent tenure): 4 pts
    Mixed (some ups and downs): 2 pts
    Descending (decreasing responsibility): 0 pts

    Tenure Analysis:
    Average >3 years: +0 (baseline good)
    Average 2-3 years: -1 pt
    Average 1-2 years: -2 pts (concerning)
    Average <1 year: -3 pts (red flag)

SECTION C: IMPACT & ACHIEVEMENTS (20 pts)
─────────────────────────────────────────
C1. Quantified Achievements (12 pts)
    Award points for VERIFIED metrics:

    REVENUE/GROWTH (up to 3 pts)
    • "$X revenue," "Y% growth," "Z new customers"

    EFFICIENCY/SAVINGS (up to 3 pts)
    • "Reduced X by Y%," "Saved $Z," "Automated N hours"

    SCALE/SCOPE (up to 3 pts)
    • "Managed X people," "Served Y users," "Z transactions"

    QUALITY/SATISFACTION (up to 3 pts)
    • "X% satisfaction," "Reduced errors by Y%," "NPS of Z"

    VAGUE STATEMENTS = 0.5 pts MAX each:
    • "Improved efficiency" (no numbers)
    • "Responsible for growth" (no proof)
    • "Successfully managed" (no metrics)

C2. Soft Skills Evidence (8 pts)
    For each JD-required soft skill, find BEHAVIORAL evidence:

    Leadership (2 pts): Team size, scope of influence, examples
    Communication (2 pts): Presentations, writing, stakeholder mgmt
    Problem-solving (2 pts): Specific challenges overcome
    Collaboration (2 pts): Cross-functional work, team outcomes

    Not specified in JD: Auto-award 8 pts

SECTION D: QUALIFICATIONS (10 pts)
─────────────────────────────────────────
D1. Education (5 pts)
    Exceeds requirement: 5 pts
    Exact match: 5 pts
    Related field: 3 pts
    Any degree (when required): 2 pts
    No degree (when required): 0 pts
    Not specified: Auto 5 pts

D2. Certifications & Licenses (5 pts)
    All required present: 5 pts
    Most required present: 3 pts
    Related certs: 2 pts
    Missing required: 0 pts
    Not specified: Auto 5 pts

SECTION E: LOGISTICS & FIT (10 pts)
─────────────────────────────────────────
E1. Location Compatibility (4 pts)
    Exact match or remote-friendly: 4 pts
    Same region/commutable: 3 pts
    Relocation stated: 2 pts
    No match/unclear: 0 pts
    Not specified: Auto 4 pts

E2. Language Requirements (3 pts)
    Meets all requirements: 3 pts
    Partial match: 1-2 pts
    Not specified: Auto 3 pts

E3. Resume Quality (3 pts)
    Professional email: 1 pt
    Phone present: 1 pt
    Clear formatting, no errors: 1 pt

SECTION F: MODIFIERS (+/- 5 pts)
─────────────────────────────────────────
BONUSES (up to +5):
    • Industry awards/recognition: +1-2
    • Publications/patents: +1
    • Exceptional achievements beyond JD: +1-2
    • Perfect culture keywords match: +1

PENALTIES (up to -5):
    • Job hopping (<1 yr avg tenure): -1 to -3
    • Unexplained gaps (>6 months): -1 to -2
    • Inconsistent dates: -2 to -3
    • Decreasing responsibility: -1 to -2
    • Red flags in background: -1 to -5

═══════════════════════════════════════════════════════════════
🚨 RED FLAG DETECTION SYSTEM
═══════════════════════════════════════════════════════════════

AUTOMATICALLY SCAN FOR:

【CAREER RED FLAGS】
• Job hopping: 3+ roles <1 year each
• Unexplained gaps: >6 months without explanation
• Regression: Senior → Junior moves without context
• Lateral stagnation: Same level for 10+ years

【CREDIBILITY RED FLAGS】
• Vague descriptions: All duties, no achievements
• Inflated titles: CEO of 2-person company
• Impossible claims: "Saved $50M" at small startup
• Date inconsistencies: Overlapping employment

【SKILLS RED FLAGS】
• Buzzword stuffing: Lists 50+ technologies
• Outdated skills: Primary skills from 10+ years ago
• Mismatch: Claims expert but no evidence

For each red flag, provide:
- Type classification
- Severity (HIGH/MEDIUM/LOW)
- Specific evidence
- Impact on recommendation

═══════════════════════════════════════════════════════════════
🎯 VERDICT DECISION TREE
═══════════════════════════════════════════════════════════════

⚠️ FIRST: CHECK DOMAIN RELEVANCE
If DOMAIN_MISMATCH detected → IMMEDIATELY:
  - Set verdict.decision = "NOT PASS"
  - Set disqualified = true
  - Set overallScore ≤ 10
  - Skip to output (do not waste time on detailed scoring)

THEN: Apply normal decision tree:

INTERVIEW (Score ≥70, no HIGH red flags, domain EXACT or ADJACENT):
→ "This candidate should be interviewed. [Top reason]"

CONSIDER (Score 60-69 OR score ≥70 with MEDIUM red flags):
→ "Worth considering if pipeline allows. [Key strength] but [main concern]"

REVIEW (Score 50-59 OR significant gaps in MUST-HAVEs OR domain TRANSFERABLE):
→ "Requires careful review. [What works] vs [what's missing]"

NOT PASS (Score <50 OR HIGH red flags OR missing critical MUST-HAVEs OR domain PIVOT/MISMATCH):
→ "Not recommended. [Primary disqualifying factor]"

DISQUALIFY (Domain MISMATCH OR critical requirement missing):
→ Score ≤10%, disqualified=true
→ "Candidate background does not match job requirements. [Specific mismatch]"

═══════════════════════════════════════════════════════════════
🏆 OUTPUT FORMAT (JSON ONLY — NO MARKDOWN, NO COMMENTARY)
═══════════════════════════════════════════════════════════════
{
  "overallScore": 0-100,
  "sectionA": 0-30,
  "sectionB": 0-25,
  "sectionC": 0-20,
  "sectionD": 0-10,
  "sectionE": 0-10,
  "sectionF": -5 to +5,
  "technicalSkillsScore": 0-100,
  "experienceScore": 0-100,
  "culturalFitScore": 0-100,

  "recommendation": "STRONG_YES|YES|MAYBE|NO|STRONG_NO",
  "recommendationReason": "Crisp 1-2 sentence hiring recommendation with key evidence",

  "verdict": {
    "decision": "INTERVIEW|CONSIDER|REVIEW|NOT PASS",
    "confidence": "HIGH|MEDIUM|LOW",
    "summary": "One powerful sentence answering: Should we hire this person?",
    "topStrength": "The single most compelling reason to proceed",
    "topConcern": "The single biggest risk (or 'None identified' if strong match)",
    "dealbreakers": ["List any absolute disqualifiers, or empty array"],
    "riskLevel": "LOW|MEDIUM|HIGH|CRITICAL"
  },

  "executiveSummary": {
    "oneLiner": "10-word max summary for quick scanning",
    "fitScore": "EXCELLENT|GOOD|FAIR|POOR|MISMATCH",
    "hiringUrgency": "EXPEDITE|STANDARD|LOW_PRIORITY|PASS"
  },

  "domainAnalysis": {
    "jobDescriptionDomain": "Industry/Field from Job Description (e.g., 'FinTech', 'Healthcare SaaS', 'E-commerce')",
    "candidateDomain": "Industry/Field from Resume (e.g., 'Banking Technology', 'EdTech', 'Retail')",
    "domainMatchLevel": "EXACT|ADJACENT|TRANSFERABLE|PIVOT_REQUIRED|MISMATCH",
    "domainMatchScore": 0-100,
    "domainPenaltyPercent": 0-85,
    "transferabilityNotes": "Specific skills that transfer or don't",
    "domainMatchExplanation": "Detailed explanation of why this match level was assigned and what it means for this role",
    "matchRationale": {
      "step1_jobDomain": "What domain/industry does this job require? Be specific (e.g., 'B2B SaaS', 'Healthcare IT', 'E-commerce')",
      "step2_candidateDomain": "What domain/industry is the candidate from? Based on their work history",
      "step3_overlaps": "What specific overlaps exist between candidate's experience and job requirements?",
      "step4_gaps": "What domain-specific gaps exist that could impact performance?",
      "step5_verdict": "Final assessment: Can this candidate succeed in this domain? Why or why not?"
    },
    "crossoverSkills": ["List of skills from candidate's domain that directly apply to the job domain"],
    "domainGaps": [
      {"gap": "Specific domain knowledge gap", "reason": "Why this gap exists and how it was identified", "importance": "CRITICAL|IMPORTANT|MINOR", "canBeLearnedOnJob": true|false, "estimatedRampUpTime": "Time estimate to close this gap"}
    ],
    "industryContext": "Explanation of the candidate's industry background and how it relates to the target role",
    "domainRiskLevel": "LOW|MEDIUM|HIGH|CRITICAL",
    "domainRiskExplanation": "Explanation of the risk level - what could go wrong if domain mismatch is ignored, and what mitigates the risk",
    "rampUpEstimate": "Estimated time for candidate to become fully effective in this domain (e.g., '1-2 months', '3-6 months', '6+ months')",
    "previousDomainTransitions": "Evidence from resume of successful domain/industry transitions in the past, if any",
    "domainHiringRecommendation": "PROCEED|PROCEED_WITH_CAUTION|ADDITIONAL_SCREENING|NOT_RECOMMENDED - Hiring recommendation based on domain fit",
    "domainHiringRationale": "Why this hiring recommendation was made based on domain analysis",
    "domainInterviewQuestions": ["Specific interview questions to probe domain knowledge gaps"],
    "domainOnboardingNeeds": ["What specific domain training/onboarding would this candidate need"],
    "competitiveAdvantage": "What unique domain perspective could this candidate bring from their background",
    "domainTransitionSuccess": "LOW|MEDIUM|HIGH - Likelihood of successful domain transition based on evidence"
  },

  "matchSummary": "3-4 sentence brutally honest assessment written for the hiring manager",

  "strengthsHighlights": [
    {"strength": "Specific strength", "evidence": "Direct quote or specific data from resume", "impact": "HIGH|MEDIUM|LOW", "relevanceToJob": "How this maps to job requirements"}
  ],

  "improvementAreas": [
    {"gap": "What's missing", "reason": "Detailed explanation of WHY this is considered a gap - connect the job requirement to specific missing evidence, explain how you determined this gap exists based on what the resume shows vs what the job demands", "severity": "CRITICAL|MAJOR|MINOR", "jobRequirement": "Exact requirement from Job Description", "impact": "Business impact of this gap", "trainable": true|false, "recommendation": "Specific actionable suggestion to address this gap", "timeToAddress": "Estimated time to acquire this skill/close this gap (e.g., '2-3 months', '6+ months')", "evidenceFromResume": "Quote or reference from resume that indicates this gap exists", "workaround": "Potential alternative approach if the gap cannot be directly addressed"}
  ],

  "skillAnalysis": {
    "matchedSkills": [
      {"skill": "Skill name", "matchType": "EXACT|PARTIAL|RELATED", "depth": "EXPERT|PROFICIENT|FAMILIAR|LISTED", "evidence": "Specific proof", "yearsUsed": null, "recency": "CURRENT|RECENT|DATED"}
    ],
    "partialMatches": [
      {"required": "Job Description skill", "found": "Resume skill", "similarityPercent": 0-100, "note": "Why partial", "trainable": true|false}
    ],
    "missingSkills": [
      {"skill": "Missing skill", "importance": "MUST_HAVE|IMPORTANT|NICE_TO_HAVE", "severity": "CRITICAL|MAJOR|MINOR", "trainable": true|false, "timeToAcquire": "Estimated learning time"}
    ],
    "skillDepthSummary": {"expert": 0, "proficient": 0, "familiar": 0, "listedOnly": 0},
    "skillGapRisk": "LOW|MEDIUM|HIGH|CRITICAL"
  },

  "experienceAnalysis": {
    "totalYears": 0,
    "totalMonths": 0,
    "totalExperienceFormatted": "X years Y months",
    "relevantYears": 0,
    "relevantMonths": 0,
    "relevantExperienceFormatted": "X years Y months",
    "domainYears": 0,
    "domainMonths": 0,
    "domainExperienceFormatted": "X years Y months",
    "experienceSummary": "2-3 sentence summary of the candidate's career trajectory and experience highlights",
    "careerProgression": "ASCENDING|STABLE|MIXED|DESCENDING",
    "progressionExplanation": "Detailed explanation of career progression pattern with specific examples from resume",
    "velocityAssessment": "Fast-tracker|Normal progression|Slow progression|Stagnant",
    "velocityExplanation": "Explanation of how quickly the candidate has advanced in their career",
    "seniorityMatch": {
      "jobRequiredLevel": "Level from Job Description",
      "candidateLevel": "Level from resume",
      "match": "EXACT|OVERQUALIFIED|UNDERQUALIFIED|MISMATCH",
      "gapSize": 0,
      "gapExplanation": "Detailed explanation of the seniority gap and its implications",
      "evidence": ["Specific evidence items"]
    },
    "roleTimeline": [
      {
        "company": "Name",
        "title": "Title",
        "startDate": "Month Year",
        "endDate": "Month Year or Present",
        "durationYears": 0,
        "durationMonths": 0,
        "duration": "X years Y months",
        "relevance": "HIGH|MEDIUM|LOW",
        "relevanceReason": "Why this role is relevant or not to the job - be specific about skills/responsibilities that transfer",
        "keyAchievement": "Best quantified result from this role",
        "skillsUsed": ["Key skills used in this role"],
        "responsibilities": "Brief summary of main responsibilities",
        "teamContext": "Team size, direct reports, or individual contributor context if mentioned",
        "promotionIndicator": "PROMOTED|LATERAL|RECRUITED|UNKNOWN - How did they get this role?",
        "impactScope": "INDIVIDUAL|TEAM|DEPARTMENT|COMPANY|INDUSTRY - What was their sphere of influence?",
        "technologiesUsed": ["Specific technologies/tools used in this role"],
        "industryDomain": "Industry/domain of this company",
        "companyType": "STARTUP|SCALEUP|ENTERPRISE|AGENCY|CONSULTANCY|UNKNOWN",
        "roleProgression": "How this role represents growth from previous role"
      }
    ],
    "employmentGaps": [
      {"gapStart": "Month Year", "gapEnd": "Month Year", "durationMonths": 0, "severity": "MINOR|MODERATE|SIGNIFICANT", "possibleReason": "Potential explanation if apparent from resume context"}
    ],
    "industryExperience": [
      {"industry": "Industry name", "years": 0, "months": 0, "formatted": "X years Y months", "relevance": "HIGH|MEDIUM|LOW"}
    ],
    "tenureAnalysis": {
      "averageTenure": 0,
      "averageTenureFormatted": "X years Y months",
      "longestTenure": 0,
      "longestTenureFormatted": "X years Y months",
      "shortestTenure": 0,
      "shortestTenureFormatted": "X years Y months",
      "pattern": "STABLE|MIXED|CONCERNING",
      "patternExplanation": "Explanation of tenure pattern and what it indicates about the candidate"
    }
  },

  "quantifiedAchievements": [
    {"achievement": "Description", "metric": "The specific number/percentage", "category": "REVENUE|EFFICIENCY|SCALE|QUALITY|LEADERSHIP|INNOVATION", "impactLevel": "HIGH|MEDIUM|LOW", "verifiable": true|false}
  ],

  "detailedBreakdown": {
    "sectionA": {
      "A1_skillsMatch": {"score": 0-15, "scorePercent": 0-100, "matched": [], "missing": [], "calculation": "Show math"},
      "A2_skillDepth": {"score": 0-10, "scorePercent": 0-100, "analysis": "Evidence"},
      "A3_toolsMatch": {"score": 0-5, "scorePercent": 0-100, "matched": [], "missing": [], "equivalents": []}
    },
    "sectionB": {
      "B1_yearsExperience": {"score": 0-10, "scorePercent": 0-100, "required": 0, "candidate": 0, "relevant": 0, "calculation": "Show math"},
      "B2_seniorityMatch": {"score": 0-10, "scorePercent": 0-100, "jobRequiredLevel": "", "candidateLevel": "", "evidence": "", "gapAnalysis": ""},
      "B3_stability": {"score": 0-5, "scorePercent": 0-100, "avgTenure": 0, "progression": "", "concerns": []}
    },
    "sectionC": {
      "C1_quantifiedResults": {"score": 0-12, "scorePercent": 0-100, "achievements": [], "vagueCount": 0, "impactLevel": ""},
      "C2_softSkills": {"score": 0-8, "scorePercent": 0-100, "matched": [], "missing": [], "evidenceQuality": "STRONG|MODERATE|WEAK"}
    },
    "sectionD": {
      "D1_education": {"score": 0-5, "scorePercent": 0-100, "required": "", "candidate": "", "match": "", "relevance": ""},
      "D2_certifications": {"score": 0-5, "scorePercent": 0-100, "required": [], "matched": [], "missing": [], "expired": []}
    },
    "sectionE": {
      "E1_location": {"score": 0-4, "scorePercent": 0-100, "jobLocation": "", "candidateLocation": "", "match": "", "remoteCompatible": true|false},
      "E2_language": {"score": 0-3, "scorePercent": 0-100, "required": [], "candidate": [], "gaps": []},
      "E3_contactQuality": {"score": 0-3, "scorePercent": 0-100, "hasEmail": true, "hasPhone": true, "formatQuality": "EXCELLENT|GOOD|FAIR|POOR"}
    },
    "sectionF": {
      "bonusPoints": {"score": 0-5, "reasons": []},
      "penalties": {"score": 0, "reasons": [], "details": []}
    }
  },

  "redFlags": [
    {"type": "JOB_HOPPING|GAP|REGRESSION|INFLATION|INCONSISTENCY|VAGUENESS|OTHER", "severity": "HIGH|MEDIUM|LOW", "issue": "Clear description", "evidence": "Specific proof", "dates": "If applicable", "impact": "Effect on hiring decision", "mitigatingFactors": "Any context that reduces concern"}
  ],

  "interviewRecommendations": {
    "mustExplore": ["Critical topics to probe deeply"],
    "redFlagQuestions": ["Questions to address specific concerns"],
    "technicalValidation": ["Skills to verify through testing"],
    "culturalFitTopics": ["Soft skill and culture questions"],
    "referenceCheckFocus": ["What to verify with references"]
  }
}

If disqualified:
  "disqualified": true,
  "disqualificationReason": "Specific, evidence-based reason",
  "disqualificationType": "MUST_HAVE_MISSING|RED_FLAG|CUSTOM_RULE|DOMAIN_MISMATCH"

═══════════════════════════════════════════════════════════════
⚡ EXECUTION RULES — FOLLOW EXACTLY
═══════════════════════════════════════════════════════════════

🔴 RULE 0 — DOMAIN CHECK FIRST (MOST IMPORTANT):
   Before ANY scoring, check if resume is relevant to job.
   If NOT relevant → DISQUALIFY with score ≤10%. Do not proceed with detailed scoring.
   Ask: "Has this person EVER done work related to this job?" If NO → Disqualify.

1. EVIDENCE OR ZERO: No evidence = no points. Period.
2. SEMANTIC MATCHING: Understand intent, don't just keyword match.
3. REALISTIC SCORING: Most candidates are 50-70. 80+ is exceptional.
4. SHOW YOUR WORK: Every score needs justification.
5. DOMAIN MISMATCH = DISQUALIFY: Unrelated background = score ≤10%, disqualified=true.
6. BE DECISIVE: Clear recommendation, not wishy-washy.
7. THINK RISK: Hiring mistakes are expensive. Flag concerns.
8. OUTPUT JSON ONLY: No markdown, no explanation text outside JSON.
9. NEVER INFLATE: A chef is not qualified for a software job. A nurse is not qualified for accounting. Be strict.`
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
        throw new Error("Empty JSON response from model while scoring resume against job");
      }

      let result: any;
      try {
        result = this.extractJsonObject(scoringContent);
      } catch {
        throw new Error("Invalid JSON returned by model while scoring resume against job");
      }

      // Extract section scores from 100-point matrix and map to dimension scores
      const sectionA = Math.max(0, Math.min(30, result.sectionA || 0));
      const sectionB = Math.max(0, Math.min(25, result.sectionB || 0));
      const sectionC = Math.max(0, Math.min(20, result.sectionC || 0));
      const sectionD = Math.max(0, Math.min(10, result.sectionD || 0));
      const sectionE = Math.max(0, Math.min(10, result.sectionE || 0));
      const sectionF = Math.max(-5, Math.min(5, result.sectionF || 0));

      // Use original dimension scores from AI results (0-100)
      const technicalSkillsScore = Math.max(0, Math.min(100, result.technicalSkillsScore || 0));
      const experienceScore = Math.max(0, Math.min(100, result.experienceScore || 0));
      const culturalFitScore = Math.max(0, Math.min(100, result.culturalFitScore || 0));

      // Calculate overall score: sum of all sections (A+B+C+D+E+F, max 100)
      const calculatedOverallScore = result.overallScore !== undefined
        ? Math.max(0, Math.min(100, result.overallScore))
        : Math.max(0, Math.min(100, Math.round(sectionA + sectionB + sectionC + sectionD + sectionE + sectionF)));

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
      if (fileContent) {
        const cacheKey = cacheService.jobScoringKey(fileContent, jobDescription, jobRequirements, customRules);
        await cacheService.set(cacheKey, scoringResult);
        console.log(`💾 Cached job scoring result (hasCustomRules: ${!!customRules})`);
      }

      return scoringResult;
    } catch (error) {
      console.error("Error scoring resume against job:", error);
      throw new Error("Failed to score resume against job");
    }
  }
}

export const resumeProcessingService = new ResumeProcessingService();