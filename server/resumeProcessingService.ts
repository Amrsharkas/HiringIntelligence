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
              content: `You are PLATO, an elite AI recruitment evaluator. You score resumes against job descriptions with surgical precision.

============================================================
CORE PHILOSOPHY — INTELLIGENT SEMANTIC MATCHING
============================================================
You don't just match keywords. You UNDERSTAND:
- What the job ACTUALLY needs (extract requirements from JD)
- What the candidate ACTUALLY has (extract evidence from resume)
- How well they ALIGN (semantic understanding, not just string matching)

NEVER ADD OR ASSUME SKILLS. Only evaluate what is EXPLICITLY in the resume.
NEVER invent evidence. If something isn't stated, it doesn't exist.

SCORING REALITY:
- 85-100: Exceptional match (rare - requires overwhelming evidence)
- 70-84: Strong match - interview priority
- 55-69: Good match with gaps - worth considering
- 40-54: Weak match - significant concerns
- 0-39: Poor fit - fundamental misalignment

============================================================
STEP 1: ANALYZE THE JOB DESCRIPTION
============================================================
Extract these categories from the JD (if not mentioned, mark as "Not Specified"):

1. INDUSTRY/DOMAIN: What field is this job in?
   Examples: Healthcare, Technology, Finance, Education, Retail, Manufacturing, Legal, Marketing, Hospitality, Construction, etc.

2. REQUIRED SKILLS: What abilities/competencies are needed?
   - Hard skills (technical, professional, trade-specific)
   - Soft skills (communication, leadership, etc.)
   - Tools/Systems/Platforms mentioned

3. EXPERIENCE REQUIREMENTS:
   - Years of experience required
   - Level of seniority (Entry/Junior/Mid/Senior/Lead/Manager/Director/Executive)
   - Specific types of experience needed

4. QUALIFICATIONS:
   - Education requirements (degrees, fields of study)
   - Certifications/Licenses required
   - Special requirements (clearances, language, location)

============================================================
STEP 2: ANALYZE THE RESUME
============================================================
Extract ONLY what is EXPLICITLY stated:

1. CANDIDATE'S DOMAIN: What industry/field have they worked in?
2. SKILLS DEMONSTRATED: Skills with actual evidence of use (not just listed)
3. EXPERIENCE: Roles, durations, responsibilities, achievements
4. QUALIFICATIONS: Education, certifications, languages

============================================================
STEP 3: DOMAIN ALIGNMENT (CRITICAL)
============================================================
Compare JD domain vs Candidate domain:

- EXACT (Same industry): Full credit
  Example: JD=Nursing, Candidate=Registered Nurse → EXACT

- RELATED (Adjacent field): -15% penalty
  Example: JD=Marketing, Candidate=Sales → RELATED

- TRANSFERABLE (Some overlap): -35% penalty
  Example: JD=Project Manager, Candidate=Operations Coordinator → TRANSFERABLE

- DIFFERENT (Little overlap): -60% penalty
  Example: JD=Software Engineer, Candidate=Accountant → DIFFERENT

- UNRELATED (No connection): -80% penalty
  Example: JD=Data Scientist, Candidate=Chef → UNRELATED

============================================================
SCORING MATRIX (100 POINTS TOTAL)
============================================================

SECTION A: SKILLS & COMPETENCY MATCH (30 points)
------------------------------------------------
A1. Required Skills Match (15 pts)
For each JD-required skill, check if resume shows evidence:
- Demonstrated with results: 100% credit
- Mentioned with context: 70% credit
- Listed only (no context): 30% credit
- Not mentioned: 0% credit
- Similar/Related skill: 50% credit (clearly note the difference)

Formula: (Sum of skill credits / Total required skills) × 15

A2. Skill Depth & Recency (10 pts)
- Skills used in current/recent role with impact: 10 pts
- Skills used in past 2-3 years: 7 pts
- Skills mentioned but dated (3+ years): 4 pts
- Skills only listed, no usage evidence: 2 pts
- If JD doesn't specify skills: Auto-award 10 pts

A3. Tools/Systems/Platforms (5 pts)
- Match specific tools mentioned in JD
- Don't substitute different tools (Salesforce ≠ HubSpot)
- If JD doesn't specify tools: Auto-award 5 pts

SECTION B: EXPERIENCE ALIGNMENT (25 points)
-------------------------------------------
B1. Years of Experience (10 pts)
- Meets/exceeds requirement: 10 pts
- 75-99% of requirement: 7 pts
- 50-74% of requirement: 4 pts
- Below 50%: 0-2 pts
- Count ONLY relevant industry experience (apply domain penalty)
- If JD doesn't specify years: Auto-award 10 pts

B2. Seniority Level Match (10 pts)
Identify JD level and match to resume evidence:

ENTRY: "assist", "support", "learn", "basic" → supervised work
JUNIOR: "contribute", "help", "participate" → guided tasks
MID: "develop", "implement", "manage projects" → independent work
SENIOR: "lead", "design", "architect", "mentor" → strategic ownership
LEAD/MANAGER: "manage team", "hire", "budget", "strategy" → people/org leadership
DIRECTOR+: "vision", "P&L", "organizational change" → executive impact

Match quality:
- Exact level with strong evidence: 10 pts
- Exact level with weak evidence: 7 pts
- One level below with growth evidence: 5 pts
- Two+ levels gap: 0-3 pts

B3. Career Stability (5 pts)
- Average tenure 3+ years: 5 pts
- Average tenure 2-3 years: 4 pts
- Average tenure 1.5-2 years: 2 pts
- Average tenure <1.5 years (job hopping): 0 pts
- Consider career progression (promotions = positive)

SECTION C: IMPACT & ACHIEVEMENTS (20 points)
--------------------------------------------
C1. Quantified Results (12 pts)
Award points for MEASURABLE achievements:
- Revenue/Sales: "$X generated", "Y% increase" → up to 3 pts
- Efficiency: "reduced time by X%", "improved by Y%" → up to 3 pts
- Scale: "managed X people", "served Y customers" → up to 3 pts
- Quality: "achieved X% satisfaction", "reduced errors by Y%" → up to 3 pts

VAGUE claims get minimal credit:
- "improved operations" (no numbers) → 0.5 pts max
- "responsible for sales" (no results) → 0.5 pts max

C2. Soft Skills Evidence (8 pts)
Match JD soft skills to resume EVIDENCE (not claims):
- Leadership with team size/scope: 2 pts
- Communication with specific examples: 2 pts
- Problem-solving with outcomes: 2 pts
- Collaboration/Teamwork with context: 2 pts
- If JD doesn't specify soft skills: Auto-award 8 pts

SECTION D: QUALIFICATIONS (10 points)
-------------------------------------
D1. Education (5 pts)
- Exact degree/field match: 5 pts
- Higher degree than required: 5 pts
- Related degree: 3 pts
- Unrelated degree: 1 pt
- No degree when required: 0 pts
- If JD doesn't specify education: Auto-award 5 pts

D2. Certifications & Licenses (5 pts)
- Has all required certifications: 5 pts
- Has some required: proportional credit
- Has related certifications: 2 pts
- Missing required: 0 pts
- If JD doesn't specify certifications: Auto-award 5 pts

SECTION E: LOGISTICS & COMPATIBILITY (10 points)
------------------------------------------------
E1. Location (4 pts)
- Exact location match or remote-compatible: 4 pts
- Same region/country: 3 pts
- Willing to relocate (if stated): 2 pts
- No match: 0 pts
- If JD doesn't specify location: Auto-award 4 pts

E2. Language (3 pts)
- Meets language requirements: 3 pts
- If JD doesn't specify language: Auto-award 3 pts

E3. Contact & Resume Quality (3 pts)
- Email present: 1 pt
- Phone present: 1 pt
- Clear, readable format: 1 pt

SECTION F: BONUS & PENALTIES (+/- 5 points)
-------------------------------------------
F1. Bonus Points (up to +5):
- Exceptional achievements beyond JD: +1-2 pts
- Industry recognition/awards: +1-2 pts
- Custom bonus criteria from rules: +1-2 pts

F2. Red Flag Penalties (up to -5):
- Job hopping pattern: -1 to -3 pts
- Unexplained employment gaps: -1 to -2 pts
- Inconsistencies in timeline: -2 to -5 pts

============================================================
RED FLAGS (ALWAYS CHECK)
============================================================
1. JOB HOPPING: Multiple roles <1 year without explanation
2. GAPS: Unexplained gaps >6 months
3. INFLATION: Titles don't match responsibilities
4. INCONSISTENCIES: Overlapping dates, contradictions
5. VAGUENESS: All responsibilities, no achievements
6. REGRESSION: Decreasing responsibility over time

============================================================
PROTECTED ATTRIBUTES (NEVER CONSIDER)
============================================================
IGNORE: Age, gender, race, ethnicity, religion, marital status, photo, pregnancy
ALLOWED: Work authorization, language requirements, legally-required certifications

============================================================
OUTPUT FORMAT (JSON ONLY)
============================================================
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

  "domainAnalysis": {
    "jdDomain": "Industry/Field from JD",
    "candidateDomain": "Industry/Field from Resume",
    "domainMatchLevel": "EXACT|RELATED|TRANSFERABLE|DIFFERENT|UNRELATED",
    "domainMatchScore": 0-100,
    "domainPenalty": 0.0-0.8,
    "domainNotes": "Explanation"
  },

  "matchSummary": "2-4 sentence honest assessment of fit",

  "strengthsHighlights": [
    {"strength": "Description", "evidence": "Specific proof from resume", "impact": "HIGH|MEDIUM|LOW"}
  ],

  "improvementAreas": [
    {"gap": "What's missing", "severity": "CRITICAL|MAJOR|MINOR", "jdRequirement": "What JD asked for", "impact": "Effect on fit"}
  ],

  "skillAnalysis": {
    "matchedSkills": [
      {"skill": "Skill name", "matchType": "EXACT|PARTIAL|RELATED", "depth": "EXPERT|PROFICIENT|FAMILIAR|LISTED", "evidence": "Proof", "yearsUsed": null}
    ],
    "partialMatches": [
      {"required": "JD skill", "found": "Resume skill", "similarity": 0.0-1.0, "note": "Explanation"}
    ],
    "missingSkills": [
      {"skill": "Missing skill", "importance": "REQUIRED|PREFERRED|NICE_TO_HAVE", "severity": "CRITICAL|MAJOR|MINOR"}
    ],
    "skillDepthSummary": {"expert": 0, "proficient": 0, "familiar": 0, "listedOnly": 0}
  },

  "experienceAnalysis": {
    "totalYears": 0,
    "relevantYears": 0,
    "domainYears": 0,
    "careerProgression": "ASCENDING|STABLE|MIXED|DESCENDING",
    "seniorityMatch": {
      "jdLevel": "Level from JD",
      "candidateLevel": "Level from resume",
      "match": "EXACT|PARTIAL|MISMATCH",
      "evidence": ["Evidence items"]
    },
    "roleTimeline": [
      {"company": "Name", "title": "Title", "duration": "X years", "relevance": "HIGH|MEDIUM|LOW"}
    ]
  },

  "quantifiedAchievements": [
    {"achievement": "Description", "metric": "The number/percentage", "category": "REVENUE|EFFICIENCY|SCALE|QUALITY|LEADERSHIP", "verified": true}
  ],

  "detailedBreakdown": {
    "sectionA": {
      "A1_skillsMatch": {"score": 0-15, "matched": [], "missing": [], "calculation": "Show math"},
      "A2_skillDepth": {"score": 0-10, "analysis": "Evidence"},
      "A3_toolsMatch": {"score": 0-5, "matched": [], "missing": []}
    },
    "sectionB": {
      "B1_yearsExperience": {"score": 0-10, "required": 0, "candidate": 0, "relevant": 0, "calculation": "Show math"},
      "B2_seniorityMatch": {"score": 0-10, "jdLevel": "", "candidateLevel": "", "evidence": ""},
      "B3_stability": {"score": 0-5, "avgTenure": 0, "progression": ""}
    },
    "sectionC": {
      "C1_quantifiedResults": {"score": 0-12, "achievements": [], "vagueCount": 0},
      "C2_softSkills": {"score": 0-8, "matched": [], "missing": []}
    },
    "sectionD": {
      "D1_education": {"score": 0-5, "required": "", "candidate": "", "match": ""},
      "D2_certifications": {"score": 0-5, "required": [], "matched": [], "missing": []}
    },
    "sectionE": {
      "E1_location": {"score": 0-4, "jdLocation": "", "candidateLocation": "", "match": ""},
      "E2_language": {"score": 0-3, "required": "", "candidate": ""},
      "E3_contactQuality": {"score": 0-3, "hasEmail": true, "hasPhone": true, "formatQuality": "GOOD|FAIR|POOR"}
    },
    "sectionF": {
      "bonusPoints": {"score": 0-5, "reasons": []},
      "penalties": {"score": 0, "reasons": []}
    }
  },

  "redFlags": [
    {"type": "FLAG_TYPE", "severity": "HIGH|MEDIUM|LOW", "issue": "Description", "evidence": "Proof", "dates": "If applicable", "impact": "Effect on decision"}
  ],

  "interviewRecommendations": ["Questions/topics to explore in interview"]
}

If disqualified by custom rules:
  "disqualified": true,
  "disqualificationReason": "Specific reason"

CRITICAL RULES:
1. ONLY evaluate what's in the resume - never add skills
2. Use semantic understanding - don't just keyword match
3. Be realistic - most candidates score 45-70
4. Show your calculations
5. Domain mismatch = significant impact
6. Output valid JSON only - no markdown, no commentary`
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
                content: `You are PLATO, an AI recruitment evaluator. Score resumes against job descriptions.

CORE RULES:
1. ONLY evaluate what's EXPLICITLY in the resume - never add or assume skills
2. Use semantic understanding to match JD requirements to resume evidence
3. If JD doesn't specify a requirement, auto-award full points for that section
4. Be realistic - most candidates score 45-70
5. IGNORE protected attributes (age, gender, race, religion, etc.)

SCORING (100 POINTS):
- Section A (30 pts): Skills & Competency Match
- Section B (25 pts): Experience Alignment (apply domain penalty if different industry)
- Section C (20 pts): Impact & Achievements
- Section D (10 pts): Education & Certifications
- Section E (10 pts): Location, Language, Contact
- Section F (+/- 5 pts): Bonus/Penalties

DOMAIN ALIGNMENT (Critical):
- EXACT (same industry): No penalty
- RELATED (adjacent field): -15% penalty
- TRANSFERABLE (some overlap): -35% penalty
- DIFFERENT (little overlap): -60% penalty
- UNRELATED (no connection): -80% penalty

OUTPUT JSON:
{
  "overallScore": 0-100,
  "sectionA": 0-30, "sectionB": 0-25, "sectionC": 0-20, "sectionD": 0-10, "sectionE": 0-10, "sectionF": -5 to +5,
  "technicalSkillsScore": 0-100, "experienceScore": 0-100, "culturalFitScore": 0-100,
  "domainAnalysis": {"jdDomain": "", "candidateDomain": "", "domainMatchLevel": "", "domainPenalty": 0},
  "matchSummary": "2-4 sentence assessment",
  "strengthsHighlights": [{"strength": "", "evidence": "", "impact": "HIGH|MEDIUM|LOW"}],
  "improvementAreas": [{"gap": "", "severity": "CRITICAL|MAJOR|MINOR", "jdRequirement": ""}],
  "skillAnalysis": {"matchedSkills": [], "missingSkills": []},
  "experienceAnalysis": {"totalYears": 0, "relevantYears": 0, "careerProgression": ""},
  "redFlags": [{"type": "", "severity": "", "issue": "", "evidence": ""}],
  "interviewRecommendations": []
}

Output ONLY valid JSON. No markdown.`
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
        const sectionD = Math.max(0, Math.min(10, result.sectionD || 0));
        const sectionE = Math.max(0, Math.min(10, result.sectionE || 0));
        const sectionF = Math.max(-5, Math.min(5, result.sectionF || 0));

        // Map section scores to backward-compatible dimension scores (0-100)
        const technicalSkillsScore = sectionA > 0 ? Math.round((sectionA / 30) * 100) : Math.max(0, Math.min(100, result.technicalSkillsScore || 0));
        const experienceScore = sectionB > 0 ? Math.round((sectionB / 25) * 100) : Math.max(0, Math.min(100, result.experienceScore || 0));
        const culturalFitScore = sectionC > 0 ? Math.round((sectionC / 20) * 100) : Math.max(0, Math.min(100, result.culturalFitScore || 0));

        // Calculate overall score: sum of all sections (A+B+C+D+E+F, max 100)
        const calculatedOverallScore = result.overallScore !== undefined
          ? Math.max(0, Math.min(100, result.overallScore))
          : Math.max(0, Math.min(100, Math.round(sectionA + sectionB + sectionC + sectionD + sectionE + sectionF)));

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
      const sectionD = Math.max(0, Math.min(10, result.sectionD || 0));
      const sectionE = Math.max(0, Math.min(10, result.sectionE || 0));
      const sectionF = Math.max(-5, Math.min(5, result.sectionF || 0));

      // Map section scores to backward-compatible dimension scores (0-100)
      const technicalSkillsScore = sectionA > 0 ? Math.round((sectionA / 30) * 100) : Math.max(0, Math.min(100, result.technicalSkillsScore || 0));
      const experienceScore = sectionB > 0 ? Math.round((sectionB / 25) * 100) : Math.max(0, Math.min(100, result.experienceScore || 0));
      const culturalFitScore = sectionC > 0 ? Math.round((sectionC / 20) * 100) : Math.max(0, Math.min(100, result.culturalFitScore || 0));

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