import twilio from "twilio";
import { db } from "../db.js";
import { voiceCalls, voiceCallEvents, organizations } from "../../shared/schema.js";
import { eq, and } from "drizzle-orm";
import WebSocket from "ws";

export interface VoiceCallOptions {
  toPhoneNumber: string;
  organizationId?: string;
  systemPrompt?: string;
  voice?: string;
  greetingMessage?: string;
}

export interface VoiceCallResult {
  success: boolean;
  callId?: string;
  twilioCallSid?: string;
  error?: string;
}

export class TwilioVoiceService {
  private twilioClient: twilio.Twilio;
  private openaiApiKey: string;
  private twilioPhoneNumber: string;
  private domain: string;
  private voiceWsPath: string;

  // Constants from HiringPhone
  private readonly SYSTEM_MESSAGE = 'You are a helpful and bubbly AI assistant who loves to chat and offer facts. Stay positive and sprinkle in light humor when suitable. Start the conversation with a warm greeting and ask how you can help today.';
  private readonly VOICE = 'marin';
  private readonly TEMPERATURE = 0.8;
  private readonly DEFAULT_GREETING_MESSAGE = 'Hello there! I\'m Plato, your AI assistant from the Hiring Intelligence platform. How can I help you today?';
  private readonly LOG_EVENT_TYPES = [
    'error',
    'response.content.done',
    'rate_limits.updated',
    'response.done',
    'input_audio_buffer.committed',
    'input_audio_buffer.speech_stopped',
    'input_audio_buffer.speech_started',
    'session.created',
    'session.updated',
  ];

  constructor() {
    // Validate environment variables
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.openaiApiKey = process.env.OPENAI_REALTIME_API_KEY || process.env.OPENAI_API_KEY;
    this.twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER || "";
    let rawDomain = process.env.DOMAIN || "localhost:3005";
    this.voiceWsPath = process.env.VOICE_WS_PATH || "/voice-stream";

    if (!accountSid || !authToken) {
      throw new Error("Twilio credentials not configured");
    }

    if (!this.openaiApiKey) {
      throw new Error("OpenAI API key not configured");
    }

    // Clean domain (remove protocol/trailing slashes) - same as HiringPhone
    this.domain = rawDomain.replace(/^(\w+:|^)\/\//, '').replace(/\/+$/, '');

    this.twilioClient = twilio(accountSid, authToken);
  }

  /**
   * Validate phone number format
   */
  private validatePhoneNumber(phoneNumber: string): boolean {
    // Basic E.164 format validation
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber);
  }

  /**
   * Create a new voice call record
   */
  private async createVoiceCallRecord(
    options: VoiceCallOptions,
    twilioCallSid?: string
  ): Promise<string> {
    const callId = crypto.randomUUID();

    const callData: any = {
      id: callId,
      toPhoneNumber: options.toPhoneNumber,
      fromPhoneNumber: this.twilioPhoneNumber,
      status: "initiated",
      metadata: {
        systemPrompt: options.systemPrompt || this.SYSTEM_MESSAGE,
        voice: options.voice || this.VOICE,
        greetingMessage: options.greetingMessage || this.DEFAULT_GREETING_MESSAGE,
      },
    };

    if (options.organizationId) {
      callData.organizationId = options.organizationId;
    }

    if (twilioCallSid) {
      callData.twilioCallSid = twilioCallSid;
    }

    await db.insert(voiceCalls).values(callData);

    // Log initiation event
    await db.insert(voiceCallEvents).values({
      id: crypto.randomUUID(),
      voiceCallId: callId,
      eventType: "call.initiated",
      eventData: {
        toPhoneNumber: options.toPhoneNumber,
        fromPhoneNumber: this.twilioPhoneNumber,
      },
    });

    return callId;
  }

  /**
   * Update voice call status
   */
  async updateCallStatus(
    callId: string,
    status: string,
    additionalData?: Record<string, any>
  ): Promise<void> {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (additionalData) {
      Object.assign(updateData, additionalData);
    }

    await db
      .update(voiceCalls)
      .set(updateData)
      .where(eq(voiceCalls.id, callId));

    // Log status change event
    await db.insert(voiceCallEvents).values({
      id: crypto.randomUUID(),
      voiceCallId: callId,
      eventType: `call.${status}`,
      eventData: additionalData || {},
    });
  }

  /**
   * Initiate an outbound voice call
   */
  async initiateCall(options: VoiceCallOptions): Promise<VoiceCallResult> {
    try {
      // Validate phone number
      if (!this.validatePhoneNumber(options.toPhoneNumber)) {
        return {
          success: false,
          error: "Invalid phone number format. Must be in E.164 format (e.g., +1234567890)",
        };
      }

      // Check if organization exists and is valid (if provided)
      if (options.organizationId) {
        const org = await db
          .select()
          .from(organizations)
          .where(eq(organizations.id, options.organizationId))
          .limit(1);

        if (!org.length) {
          return {
            success: false,
            error: "Invalid organization ID",
          };
        }
      }

      // Create WebSocket URL for Twilio to connect to
      const wsUrl = `wss://${this.domain}${this.voiceWsPath}`;

      // TwiML that Twilio should use when making the outbound call
      // Use PCMU encoding to match OpenAI's PCM output format - same as HiringPhone
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Connect>
        <Stream url="wss://${this.domain}/voice-stream" />
    </Connect>
</Response>`;

      // Initiate call via Twilio
      const call = await this.twilioClient.calls.create({
        to: options.toPhoneNumber,
        from: this.twilioPhoneNumber,
        twiml: twiml,
        record: true, // Enable call recording
      });

      // Create call record in database
      const callId = await this.createVoiceCallRecord(options, call.sid);

      return {
        success: true,
        callId,
        twilioCallSid: call.sid,
      };
    } catch (error) {
      console.error("Failed to initiate voice call:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Get call details by ID
   */
  async getCallDetails(callId: string): Promise<any> {
    const calls = await db
      .select({
        call: voiceCalls,
        organization: {
          id: organizations.id,
          companyName: organizations.companyName,
        },
      })
      .from(voiceCalls)
      .leftJoin(organizations, eq(voiceCalls.organizationId, organizations.id))
      .where(eq(voiceCalls.id, callId))
      .limit(1);

    if (!calls.length) {
      return null;
    }

    return calls[0];
  }

  /**
   * Get list of calls for an organization
   */
  async getOrganizationCalls(
    organizationId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<any[]> {
    return await db
      .select()
      .from(voiceCalls)
      .where(eq(voiceCalls.organizationId, organizationId))
      .orderBy(voiceCalls.createdAt)
      .limit(limit)
      .offset(offset);
  }

  /**
   * Get call events for a specific call
   */
  async getCallEvents(callId: string): Promise<any[]> {
    return await db
      .select()
      .from(voiceCallEvents)
      .where(eq(voiceCallEvents.voiceCallId, callId))
      .orderBy(voiceCallEvents.timestamp);
  }

  /**
   * Calculate call cost based on duration
   */
  calculateCallCost(durationSeconds: number): number {
    // Twilio pricing: approximately $0.013 per minute for outbound calls
    // OpenAI Realtime API pricing: approximately $0.06 per minute
    // Total: ~$0.073 per minute = 7.3 cents per minute
    const costPerMinute = 7.3;
    const durationMinutes = Math.ceil(durationSeconds / 60);
    return Math.round(durationMinutes * costPerMinute);
  }

  /**
   * Handle Twilio call status webhook
   */
  async handleCallStatusWebhook(
    callSid: string,
    status: string,
    callDuration?: number
  ): Promise<void> {
    // Find the call in our database
    const calls = await db
      .select()
      .from(voiceCalls)
      .where(eq(voiceCalls.twilioCallSid, callSid))
      .limit(1);

    if (!calls.length) {
      console.warn(`Call with SID ${callSid} not found in database`);
      return;
    }

    const call = calls[0];

    // Prepare update data
    const updateData: any = {
      status,
    };

    if (callDuration !== undefined && callDuration > 0) {
      updateData.durationSeconds = callDuration;
      updateData.costCents = this.calculateCallCost(callDuration);
    }

    // Update call status
    await this.updateCallStatus(call.id, status, updateData);

    // If call is completed, get the recording URL
    if (status === "completed") {
      try {
        const recordings = await this.twilioClient.recordings.list({
          callSid,
          limit: 1
        });

        if (recordings.length > 0) {
          const recordingUrl = `https://api.twilio.com${recordings[0].uri}.mp3`;
          await this.updateCallStatus(call.id, "recording_available", {
            recordingUrl,
          });
        }
      } catch (error) {
        console.error("Failed to fetch call recording:", error);
      }
    }
  }

  /**
   * Process WebSocket media stream - matches HiringPhone logic
   */
  async processMediaStream(twilioWs: WebSocket, callId?: string, systemPrompt?: string, voice?: string, greetingMessage?: string): Promise<void> {
    let twilioSocketReady = true;
    let openAiSocketReady = false;
    let streamSid = null; // CRITICAL: Track the stream ID for Twilio
    console.log('✅ Twilio socket ready for audio forwarding');

    // Use custom parameters or fall back to defaults
    const effectiveSystemPrompt = systemPrompt || this.SYSTEM_MESSAGE;
    const effectiveVoice = voice || this.VOICE;
    const effectiveGreetingMessage = greetingMessage || this.DEFAULT_GREETING_MESSAGE;

    console.log(`🎙️ Using system prompt: ${effectiveSystemPrompt.substring(0, 100)}...`);
    console.log(`🔊 Using voice: ${effectiveVoice}`);
    console.log(`👋 Using greeting: ${effectiveGreetingMessage.substring(0, 80)}...`);

    // Connect to OpenAI Realtime API (remove temperature from URL) - same as HiringPhone
    const openAiWs = new WebSocket(`wss://api.openai.com/v1/realtime?model=gpt-realtime`, {
      headers: {
        Authorization: `Bearer ${this.openaiApiKey}`,
      },
    });

    // Function to trigger initial AI response - same as HiringPhone
    let retryCount = 0;
    const MAX_RETRIES = 5;

    const triggerInitialResponse = () => {
      if (!openAiSocketReady) {
        retryCount++;
        if (retryCount <= MAX_RETRIES) {
          console.log(`⏳ OpenAI socket not ready, retrying initial response (${retryCount}/${MAX_RETRIES})`);
          setTimeout(triggerInitialResponse, 1000); // Retry in 1 second
        } else {
          console.error('❌ Max retries reached for initial response, giving up');
        }
        return;
      }

      try {
        const sessionUpdate = {
          type: 'session.update',
          session: {
            type: 'realtime',
            model: "gpt-realtime",
            output_modalities: ["audio"],
            audio: {
              input: { format: { type: 'audio/pcmu' }, turn_detection: { type: "server_vad" } },
              output: { format: { type: 'audio/pcmu' }, voice: effectiveVoice },
            },
            instructions: effectiveSystemPrompt,
          },
        };

        console.log('Sending session update:', JSON.stringify(sessionUpdate));
        openAiWs.send(JSON.stringify(sessionUpdate));

        const initialConversationItem = {
          type: 'conversation.item.create',
          item: {
            type: 'message',
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: `Greet the user with "${effectiveGreetingMessage}"`
              }
            ]
          }
        };

        openAiWs.send(JSON.stringify(initialConversationItem));
        openAiWs.send(JSON.stringify({ type: 'response.create' }));
        console.log('🎯 Triggered initial AI response');
      } catch (err) {
        console.error('❌ Failed to trigger initial response:', err);
      }
    };

    openAiWs.on('open', () => {
      console.log('🤖 Connected to OpenAI Realtime API');
      openAiSocketReady = true;
      console.log('✅ OpenAI socket ready');

      setTimeout(triggerInitialResponse, 50);

      // Send keep-alive messages every 30 seconds using a WebSocket ping frame
      const keepAliveInterval = setInterval(() => {
        if (openAiWs.readyState === WebSocket.OPEN) {
          try {
            if (typeof openAiWs.ping === 'function') {
              openAiWs.ping();
            } else {
              openAiWs.send(JSON.stringify({ type: 'session.update', session: { instructions: this.SYSTEM_MESSAGE } }));
            }
          } catch (err) {
            console.error('❗Failed to send keepalive to OpenAI:', err);
          }
        } else {
          clearInterval(keepAliveInterval);
        }
      }, 30000);

      openAiWs.on('close', () => clearInterval(keepAliveInterval));
    });

    // Handle messages from OpenAI and forward audio back into Twilio - same as HiringPhone
    openAiWs.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());

        if (this.LOG_EVENT_TYPES.includes(msg.type)) {
          console.log(`📡 OpenAI event: ${msg.type}`);
        }

        if (msg.type === 'error' || msg.error) {
          console.error('🛑 OpenAI error event:', JSON.stringify(msg, null, 2));
        }

        // Forward synthesized audio deltas back to Twilio
        const isAudioDelta = (
          msg.type === 'response.output_audio.delta' ||
          msg.type === 'response.audio.delta' ||
          msg.type === 'response.audio_transcript.delta'
        );

        if (isAudioDelta && msg.delta) {
          if (twilioSocketReady && twilioWs && typeof twilioWs.send === 'function') {
            try {
              let audioPayload = msg.delta;

              if (!/^[A-Za-z0-9+/=]+$/.test(audioPayload)) {
                console.warn('⚠️ Audio delta contains invalid base64 characters, skipping');
                return;
              }

              const mediaMessage = {
                event: 'media',
                streamSid,
                media: {
                  payload: Buffer.from(audioPayload, 'base64').toString('base64')
                }
              };

              if (streamSid) {
                mediaMessage.streamSid = streamSid;
                console.log(`🔊 Sending ${msg.type} audio to stream: ${streamSid.substring(0, 8)}...`);
              } else {
                console.log(`⚠️ No streamSid available, sending ${msg.type} audio without stream identification`);
              }

              const messageStr = JSON.stringify(mediaMessage);
              twilioWs.send(messageStr);
              console.log(`🔊 Sent ${msg.type} delta to Twilio (${audioPayload.length} chars)`);
            } catch (sendError) {
              console.error('❌ Failed to send audio to Twilio:', sendError);
            }
          } else {
            console.log('⏳ Waiting for Twilio socket to be ready before forwarding audio...');
          }
        }

        if (msg.type === 'response.done') {
          console.log('✅ AI response completed');
        }

        // Handle speech detection like ApplicantTracker
        if (msg.type === 'input_audio_buffer.speech_started') {
          console.log('👂 User started speaking');
        } else if (msg.type === 'input_audio_buffer.speech_stopped') {
          console.log('👂 User stopped speaking - triggering AI response');
          setTimeout(() => {
            if (openAiSocketReady && openAiWs.readyState === WebSocket.OPEN) {
              console.log('🤖 Sending response trigger to AI');
              const responseCreate = {
                type: 'response.create',
                response: {
                  modalities: ['text', 'audio']
                }
              };
              openAiWs.send(JSON.stringify(responseCreate));
            }
          }, 800); // Optimized delay like ApplicantTracker
        }
      } catch (err) {
        console.error('🛑 OpenAI message parse error', err);
      }
    });

    // Forward Twilio audio packets to OpenAI - same as HiringPhone
    twilioWs.on('message', (message) => {
      try {
        const twilioMsg = JSON.parse(message.toString());

        switch (twilioMsg.event) {
          case 'media':
            if (openAiSocketReady && openAiWs.readyState === WebSocket.OPEN) {
              openAiWs.send(JSON.stringify({
                type: 'input_audio_buffer.append',
                audio: twilioMsg.media.payload
              }));
            } else {
              console.log('⏳ OpenAI socket not ready, dropping audio packet');
            }
            break;
          case 'start':
            console.log('📞 Stream started');
            if (twilioMsg.streamSid) {
              streamSid = twilioMsg.streamSid;
              console.log(`📡 Stream started with streamSid: ${streamSid.substring(0, 8)}...`);
            }
            break;
          case 'stop':
            console.log('📞 Stream stopped');
            twilioSocketReady = false;
            streamSid = null;
            break;
          case 'connected':
            console.log('📞 Call connected');
            if (twilioMsg.streamSid) {
              streamSid = twilioMsg.streamSid;
              console.log(`📡 Call connected with streamSid: ${streamSid.substring(0, 8)}...`);
            }
            break;
          case 'disconnect':
            console.log('📞 Call disconnected');
            twilioSocketReady = false;
            streamSid = null;
            break;
        }
      } catch (err) {
        console.error('❗Twilio WS message error:', err);
      }
    });

    twilioWs.on('close', (event) => {
      console.log(`🚫 Twilio media stream closed. Code: ${event.code}, Reason: ${event.reason}`);
      twilioSocketReady = false;
      streamSid = null;
      if (openAiWs.readyState === WebSocket.OPEN) {
        openAiWs.close(1000, 'Twilio connection closed');
      }
    });

    twilioWs.on('error', (err) => {
      console.error('🔥 Twilio WS error:', err);
      twilioSocketReady = false;
      streamSid = null;
      if (openAiWs.readyState === WebSocket.OPEN) {
        openAiWs.close(1000, 'OpenAI connection error');
      }
    });

    openAiWs.on('close', (event) => {
      console.log(`🛑 OpenAI Realtime API connection closed. Code: ${event.code}, Reason: ${event.reason}`);
      openAiSocketReady = false;
    });

    openAiWs.on('error', (err) => {
      console.error('🔥 OpenAI WS error:', err);
      openAiSocketReady = false;
      twilioWs.close(1000, 'OpenAI connection error');
    });
  }
}

// Export singleton instance
export const twilioVoiceService = new TwilioVoiceService();