import { Request, Response, Router } from "express";
import { twilioVoiceService } from "../services/twilioVoiceService.js";
import { db } from "../db.js";
import { voiceCalls, jobs, organizations, resumeProfiles, resumeJobScores } from "../../shared/schema.js";
import { eq, and } from "drizzle-orm";
import { scheduleVoiceCallJob } from "../jobProducers.js";

const router = Router();

/**
 * POST /api/voice/test-call/:phoneNumber
 * Test endpoint for initiating outbound voice calls
 * No authentication required for testing
 */
router.post("/test-call/:phoneNumber", async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = req.params;
    const { systemPrompt, voice, greetingMessage } = req.body;

    // Validate phone number
    if (!phoneNumber || !phoneNumber.startsWith("+")) {
      return res.status(400).json({
        success: false,
        error: "Invalid phone number. Must include country code (e.g., +1234567890)",
      });
    }

    // Optional: Add rate limiting for test endpoint
    // You could use Redis or in-memory rate limiting here

    console.log(`Initiating test voice call to: ${phoneNumber}`);

    const result = await twilioVoiceService.initiateCall({
      toPhoneNumber: phoneNumber,
      systemPrompt: systemPrompt || "You are a helpful AI assistant having a phone conversation.",
      voice: voice || "alloy",
      greetingMessage: greetingMessage,
    });

    if (result.success) {
      res.json({
        success: true,
        message: "Voice call initiated successfully",
        data: {
          callId: result.callId,
          twilioCallSid: result.twilioCallSid,
          toPhoneNumber: phoneNumber,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error("Error in test voice call endpoint:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * POST /api/voice/call
 * Authenticated endpoint for initiating outbound voice calls
 */
router.post("/call", async (req: Request, res: Response) => {
  try {
    // @ts-ignore - User is attached by authentication middleware
    const user = req.user;
    // @ts-ignore - Organization is attached by authentication middleware
    const organization = req.organization;

    const { toPhoneNumber, systemPrompt, voice, greetingMessage } = req.body;

    // Validate required fields
    if (!toPhoneNumber) {
      return res.status(400).json({
        success: false,
        error: "Phone number is required",
      });
    }

    // Validate phone number format
    if (!toPhoneNumber.startsWith("+")) {
      return res.status(400).json({
        success: false,
        error: "Invalid phone number. Must include country code (e.g., +1234567890)",
      });
    }

    console.log(`User ${user.id} initiating voice call to: ${toPhoneNumber}`);

    const result = await twilioVoiceService.initiateCall({
      toPhoneNumber,
      organizationId: organization?.id,
      systemPrompt: systemPrompt || "You are a helpful AI assistant having a phone conversation.",
      voice: voice || "alloy",
      greetingMessage: greetingMessage,
    });

    if (result.success) {
      res.json({
        success: true,
        message: "Voice call initiated successfully",
        data: {
          callId: result.callId,
          twilioCallSid: result.twilioCallSid,
          toPhoneNumber,
          organizationId: organization?.id,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error("Error in voice call endpoint:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * POST /api/voice/call-candidate
 * Schedule a voice call to a candidate with job-specific context
 */
router.post("/call-candidate", async (req: Request, res: Response) => {
  try {
    // @ts-ignore - User is attached by authentication middleware
    const user = req.user;
    // @ts-ignore - Organization is attached by authentication middleware
    const organization = req.organization;

    const { toPhoneNumber, profileId, jobId, scheduledAt } = req.body;

    // Validate required fields
    if (!toPhoneNumber) {
      return res.status(400).json({
        success: false,
        error: "Phone number is required",
      });
    }

    if (!profileId || !jobId) {
      return res.status(400).json({
        success: false,
        error: "Profile ID and Job ID are required",
      });
    }

    if (!scheduledAt) {
      return res.status(400).json({
        success: false,
        error: "Scheduled time is required",
      });
    }

    // Validate phone number format
    if (!toPhoneNumber.startsWith("+")) {
      return res.status(400).json({
        success: false,
        error: "Invalid phone number. Must include country code (e.g., +1234567890)",
      });
    }

    // Validate scheduled time is in the future
    const scheduledDate = new Date(scheduledAt);
    const now = new Date();
    if (scheduledDate <= now) {
      return res.status(400).json({
        success: false,
        error: "Scheduled time must be in the future",
      });
    }

    // Calculate delay in milliseconds
    const delayMs = scheduledDate.getTime() - now.getTime();

    // Fetch job details
    const jobResults = await db
      .select()
      .from(jobs)
      .where(eq(jobs.id, parseInt(jobId)))
      .limit(1);

    if (!jobResults.length) {
      return res.status(404).json({
        success: false,
        error: "Job not found",
      });
    }

    const job = jobResults[0];

    // Fetch resume profile data
    const profileResults = await db
      .select()
      .from(resumeProfiles)
      .where(eq(resumeProfiles.id, profileId))
      .limit(1);

    if (!profileResults.length) {
      return res.status(404).json({
        success: false,
        error: "Resume profile not found",
      });
    }

    const profile = profileResults[0];

    // Fetch job score/match analysis (optional but helpful for context)
    const scoreResults = await db
      .select()
      .from(resumeJobScores)
      .where(
        and(
          eq(resumeJobScores.profileId, profileId),
          eq(resumeJobScores.jobId, parseInt(jobId))
        )
      )
      .limit(1);

    const jobScore = scoreResults.length > 0 ? scoreResults[0] : null;

    // Get company name - prefer job.company, then organization name
    let companyName = job.company || "";
    if (!companyName && job.organizationId) {
      const orgResults = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, job.organizationId))
        .limit(1);

      if (orgResults.length) {
        companyName = orgResults[0].companyName || "the company";
      }
    }
    companyName = companyName || "the company";

    // Build comprehensive system prompt with full context
    let systemPrompt = `You are an AI recruitment assistant for ${companyName}. You are calling ${profile.name} regarding the ${job.title} position they were invited to interview for.

CANDIDATE INFORMATION:
- Name: ${profile.name}
- Email: ${profile.email || 'Not provided'}
- Phone: ${profile.phone || 'Not provided'}`;

    if (profile.summary) {
      systemPrompt += `\n- Professional Summary: ${profile.summary}`;
    }

    if (profile.skills && profile.skills.length > 0) {
      systemPrompt += `\n- Skills: ${profile.skills.join(', ')}`;
    }

    if (profile.experience && profile.experience.length > 0) {
      systemPrompt += `\n- Experience: ${profile.experience.join('; ')}`;
    }

    if (profile.education && profile.education.length > 0) {
      systemPrompt += `\n- Education: ${profile.education.join('; ')}`;
    }

    if (profile.certifications && profile.certifications.length > 0) {
      systemPrompt += `\n- Certifications: ${profile.certifications.join(', ')}`;
    }

    if (profile.languages && profile.languages.length > 0) {
      systemPrompt += `\n- Languages: ${profile.languages.join(', ')}`;
    }

    systemPrompt += `

JOB DETAILS:
- Position: ${job.title}
- Company: ${companyName}
- Location: ${job.location || 'Not specified'}
- Employment Type: ${job.employmentType}
- Workplace Type: ${job.workplaceType}
- Seniority Level: ${job.seniorityLevel}`;

    if (job.salaryRange) {
      systemPrompt += `\n- Salary Range: ${job.salaryRange}`;
    } else if (job.salaryMin && job.salaryMax) {
      systemPrompt += `\n- Salary Range: $${job.salaryMin} - $${job.salaryMax}`;
    }

    if (job.industry) {
      systemPrompt += `\n- Industry: ${job.industry}`;
    }

    systemPrompt += `\n\nJOB DESCRIPTION:\n${job.description}`;

    systemPrompt += `\n\nJOB REQUIREMENTS:\n${job.requirements}`;

    if (job.technicalSkills && job.technicalSkills.length > 0) {
      systemPrompt += `\n\nTechnical Skills Required: ${job.technicalSkills.join(', ')}`;
    }

    if (job.softSkills && job.softSkills.length > 0) {
      systemPrompt += `\n\nSoft Skills Required: ${job.softSkills.join(', ')}`;
    }

    if (job.certifications) {
      systemPrompt += `\n\nCertifications: ${job.certifications}`;
    }

    if (job.benefits) {
      systemPrompt += `\n\nBenefits: ${job.benefits}`;
    }

    // Add match analysis if available
    if (jobScore) {
      systemPrompt += `\n\nMATCH ANALYSIS:`;
      systemPrompt += `\n- Overall Score: ${jobScore.overallScore}/100`;

      if (jobScore.matchSummary) {
        systemPrompt += `\n- Match Summary: ${jobScore.matchSummary}`;
      }

      if (jobScore.strengthsHighlights && jobScore.strengthsHighlights.length > 0) {
        systemPrompt += `\n- Candidate Strengths: ${jobScore.strengthsHighlights.join('; ')}`;
      }

      if (jobScore.improvementAreas && jobScore.improvementAreas.length > 0) {
        systemPrompt += `\n- Areas for Discussion: ${jobScore.improvementAreas.join('; ')}`;
      }
    }

    systemPrompt += `\n\nYOUR ROLE:
Your goal is to remind ${profile.name} about this opportunity and encourage them to complete their interview. Be professional, friendly, and helpful. You have full context about their background and the job requirements, so you can have an informed conversation about why they're a good fit and answer basic questions about the role. If they have detailed questions about the application process or technical interview details, suggest they check their email for the interview link and additional information.`;

    const greetingMessage = `Hi ${profile.name}! This is Plato calling on behalf of ${companyName}. You were recently invited to interview for our ${job.title} position. Do you have a moment to chat about this opportunity?`;

    console.log(`User ${user?.id || 'anonymous'} scheduling candidate call to: ${toPhoneNumber} for job: ${job.title} at ${scheduledAt}`);

    // Schedule the voice call job
    const queueJob = await scheduleVoiceCallJob({
      toPhoneNumber,
      organizationId: organization?.id,
      systemPrompt,
      voice: "marin",
      greetingMessage,
    }, delayMs);

    res.json({
      success: true,
      message: "Voice call scheduled successfully",
      data: {
        queueJobId: queueJob.id,
        scheduledAt,
        toPhoneNumber,
        jobTitle: job.title,
        companyName,
      },
    });
  } catch (error) {
    console.error("Error in call-candidate endpoint:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * GET /api/voice/calls/:callId
 * Get details of a specific voice call
 */
router.get("/calls/:callId", async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;

    const callDetails = await twilioVoiceService.getCallDetails(callId);

    if (!callDetails) {
      return res.status(404).json({
        success: false,
        error: "Call not found",
      });
    }

    res.json({
      success: true,
      data: callDetails,
    });
  } catch (error) {
    console.error("Error getting call details:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * GET /api/voice/calls
 * Get list of voice calls for the authenticated organization
 */
router.get("/calls", async (req: Request, res: Response) => {
  try {
    // @ts-ignore - Organization is attached by authentication middleware
    const organization = req.organization;

    const {
      limit = "50",
      offset = "0",
      status,
      startDate,
      endDate,
    } = req.query;

    const limitNum = parseInt(limit as string, 10);
    const offsetNum = parseInt(offset as string, 10);

    // Build query
    let query = db
      .select()
      .from(voiceCalls)
      .where(eq(voiceCalls.organizationId, organization.id));

    // Add status filter if provided
    if (status) {
      // @ts-ignore - Drizzle ORM query building
      query = query.where(eq(voiceCalls.status, status as string));
    }

    // Add date filters if provided
    if (startDate) {
      // @ts-ignore - Drizzle ORM query building
      query = query.where(voiceCalls.createdAt.gte(new Date(startDate as string)));
    }

    if (endDate) {
      // @ts-ignore - Drizzle ORM query building
      query = query.where(voiceCalls.createdAt.lte(new Date(endDate as string)));
    }

    // Execute query with pagination
    const calls = await query
      .orderBy(voiceCalls.createdAt)
      .limit(limitNum)
      .offset(offsetNum);

    res.json({
      success: true,
      data: calls,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        hasMore: calls.length === limitNum,
      },
    });
  } catch (error) {
    console.error("Error getting organization calls:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * GET /api/voice/calls/:callId/events
 * Get events for a specific voice call
 */
router.get("/calls/:callId/events", async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;

    // Verify call exists and user has access
    const callDetails = await twilioVoiceService.getCallDetails(callId);

    if (!callDetails) {
      return res.status(404).json({
        success: false,
        error: "Call not found",
      });
    }

    // For authenticated users, check organization access
    if (req.user && req.organization) {
      // @ts-ignore
      if (callDetails.organization && callDetails.organization.id !== req.organization.id) {
        return res.status(403).json({
          success: false,
          error: "Access denied",
        });
      }
    }

    const events = await twilioVoiceService.getCallEvents(callId);

    res.json({
      success: true,
      data: events,
    });
  } catch (error) {
    console.error("Error getting call events:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * POST /api/voice/webhook/call-status
 * Webhook endpoint for Twilio call status updates
 * No authentication required (Twilio validates via request signature)
 */
router.post("/webhook/call-status", async (req: Request, res: Response) => {
  try {
    const { CallSid, CallStatus, CallDuration } = req.body;

    if (!CallSid || !CallStatus) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    console.log(`Received call status update: ${CallSid} - ${CallStatus}`);

    // Parse duration if provided
    const duration = CallDuration ? parseInt(CallDuration, 10) : undefined;

    await twilioVoiceService.handleCallStatusWebhook(
      CallSid,
      CallStatus,
      duration
    );

    // Return TwiML response
    res.setHeader("Content-Type", "text/xml");
    res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  } catch (error) {
    console.error("Error handling call status webhook:", error);
    res.status(500).send("Error");
  }
});

/**
 * GET /api/voice/status
 * Get voice service status
 */
router.get("/status", async (req: Request, res: Response) => {
  try {
    const status = {
      service: "twilio-voice",
      status: "active",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      features: {
        outboundCalls: true,
        realTimeAudio: true,
        callRecording: true,
        transcription: true,
      },
    };

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error("Error getting voice service status:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

export default router;