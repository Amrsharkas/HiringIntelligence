import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { URL } from "url";
import { db } from "../db.js";
import { voiceCalls, voiceCallEvents } from "../../shared/schema.js";
import { eq, desc, or } from "drizzle-orm";

/**
 * Voice Stream Server - Handles real-time voice conversations with OpenAI
 *
 * Key Features:
 * - Immediate AI interruption: When user starts speaking, AI response is immediately cancelled
 * - Server-side VAD: Voice Activity Detection configured with optimized thresholds
 * - Clean audio buffer management: Clears buffer on interruption, commits before response
 * - Responsive conversation flow: 500ms delay for natural turn-taking
 */

// Constants for voice calls
const SYSTEM_MESSAGE = 'You are Plato, an AI assistant from Hiring Intelligence. Remind candidates about their interview invitation briefly and professionally.';
const VOICE = 'marin'; // Use the same voice as ApplicantTracker
const TEMPERATURE = 0.8;
const DEFAULT_GREETING_MESSAGE = 'Hi! This is Plato from Hiring Intelligence calling about your interview. Do you have a moment?';
const LOG_EVENT_TYPES = [
  'error',
  'response.content.done',
  'rate_limits.updated',
  'response.done',
  'response.cancelled',
  'input_audio_buffer.committed',
  'input_audio_buffer.speech_stopped',
  'input_audio_buffer.speech_started',
  'input_audio_buffer.cleared',
  'session.created',
  'session.updated',
];

export interface VoiceStreamSession {
  callId: string;
  twilioWs: WebSocket;
  openaiWs: WebSocket;
  isOpenAIConnected: boolean;
  startTime: Date;
  lastActivity: Date;
  transcript: string[];
  streamSid: string | null;
  twilioSocketReady: boolean;
  openAiSocketReady: boolean;
  isAiSpeaking: boolean;
}

export class VoiceStreamServer {
  private wss: WebSocketServer;
  private openaiApiKey: string;
  private activeSessions: Map<string, VoiceStreamSession> = new Map();
  private sessionCleanupInterval: NodeJS.Timeout | null = null;

  constructor(server: any, path: string = "/voice-stream") {
    this.wss = new WebSocketServer({
      server,
      path,
      verifyClient: this.verifyClient.bind(this),
    });

    this.openaiApiKey = process.env.OPENAI_REALTIME_API_KEY || process.env.OPENAI_API_KEY || "";

    if (!this.openaiApiKey) {
      throw new Error("OpenAI API key not configured for voice streaming");
    }

    this.setupWebSocketServer();
    this.startSessionCleanup();
  }

  /**
   * Verify WebSocket connection request
   */
  private verifyClient(_info: { origin: string; secure: boolean; req: IncomingMessage }) {
    // Allow all origins for now, but you might want to restrict this in production
    return true;
  }

  /**
   * Setup WebSocket server event handlers
   */
  private setupWebSocketServer() {
    this.wss.on("connection", async (ws: WebSocket, req: IncomingMessage) => {
      try {
        console.log('🛰️ Twilio media stream connected');

        // We'll get call information from Twilio's "start" event, not URL params
        // According to Twilio Media Streams docs, call info is sent in the start event
        let voiceCall = null;
        let systemPrompt = SYSTEM_MESSAGE; // default
        let voice = VOICE; // default
        let greetingMessage = DEFAULT_GREETING_MESSAGE; // default
        let callInfoReceived = false;

        // Function to look up call and configure system based on call details
        const lookupCallAndConfigure = async (callSid: string | null, fromNumber: string | null, toNumber: string | null) => {
          console.log('📞 Call information received from Twilio start event:', { callSid, fromNumber, toNumber });

          // Try to find the call by callSid first
          if (callSid) {
            const calls = await db
              .select()
              .from(voiceCalls)
              .where(eq(voiceCalls.twilioCallSid, callSid))
              .limit(1);

            if (calls.length > 0) {
              voiceCall = calls[0];
              console.log(`✅ Found call by callSid: ${voiceCall.id}`);
            }
          }

          // If callSid is null or not found, try to get the most recent call by phone number
          if (!voiceCall && (fromNumber || toNumber)) {
            console.log('🔍 callSid not found, searching by phone number...');

            const conditions = [];
            if (toNumber) {
              conditions.push(eq(voiceCalls.toPhoneNumber, toNumber));
            }
            if (fromNumber) {
              conditions.push(eq(voiceCalls.fromPhoneNumber, fromNumber));
            }

            const calls = await db
              .select()
              .from(voiceCalls)
              .where(or(...conditions))
              .orderBy(desc(voiceCalls.createdAt))
              .limit(1);

            if (calls.length > 0) {
              voiceCall = calls[0];
              session.callId = voiceCall.id;
              console.log(`✅ Found most recent call for phone number: ${voiceCall.id}`);
            } else {
              console.log('⚠️ No call found for phone numbers:', { fromNumber, toNumber });
            }
          }

          // Extract custom system prompt, voice, and greeting from metadata
          if (voiceCall?.metadata) {
            systemPrompt = voiceCall.metadata.systemPrompt || SYSTEM_MESSAGE;
            voice = voiceCall.metadata.voice || VOICE;
            greetingMessage = voiceCall.metadata.greetingMessage || DEFAULT_GREETING_MESSAGE;

            console.log(`🎙️ Using custom system prompt: ${systemPrompt.substring(0, 100)}...`);
            console.log(`🔊 Using custom voice: ${voice}`);
            console.log(`👋 Using custom greeting: ${greetingMessage.substring(0, 80)}...`);

            // Update OpenAI session with custom configuration
            if (session.openAiSocketReady && openAiWs.readyState === WebSocket.OPEN) {
              try {
                const sessionUpdate = {
                  type: 'session.update',
                  session: {
                    instructions: systemPrompt,
                    voice: voice,
                  },
                };
                openAiWs.send(JSON.stringify(sessionUpdate));
                console.log('✅ Updated OpenAI session with custom configuration');
              } catch (err) {
                console.error('❌ Failed to update OpenAI session:', err);
              }
            }
          }

          callInfoReceived = true;

          // Update call status to in-progress
          if (voiceCall) {
            await this.updateCallStatus(voiceCall.id, "in-progress");
          }
        };

        // Track connection readiness and stream ID - same as HiringPhone
        let session: VoiceStreamSession = {
          callId: voiceCall?.id || crypto.randomUUID(),
          twilioWs: ws,
          openaiWs: null as any,
          isOpenAIConnected: false,
          startTime: new Date(),
          lastActivity: new Date(),
          transcript: [],
          streamSid: null,
          twilioSocketReady: true,
          openAiSocketReady: false,
          isAiSpeaking: false,
        };

        console.log('✅ Twilio socket ready for audio forwarding');

        const sessionId = crypto.randomUUID();
        this.activeSessions.set(sessionId, session);

        // Connect to OpenAI Realtime API (remove temperature from URL) - same as HiringPhone
        const openAiWs = new WebSocket(`wss://api.openai.com/v1/realtime?model=gpt-realtime`, {
          headers: {
            Authorization: `Bearer ${this.openaiApiKey}`,
          },
        });

        session.openaiWs = openAiWs;

        // Function to trigger initial AI response - same as HiringPhone
        let retryCount = 0;
        const MAX_RETRIES = 5;

        const triggerInitialResponse = () => {
          if (!session.openAiSocketReady) {
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
                  output: { format: { type: 'audio/pcmu' }, voice: voice },
                },
                instructions: systemPrompt,
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
                    text: `Greet the user with "${greetingMessage}"`
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
          session.openAiSocketReady = true;
          session.isOpenAIConnected = true;
          console.log('✅ OpenAI socket ready');

          setTimeout(triggerInitialResponse, 50);

          // Send keep-alive messages every 30 seconds using a WebSocket ping frame
          const keepAliveInterval = setInterval(() => {
            if (openAiWs.readyState === WebSocket.OPEN) {
              try {
                if (typeof openAiWs.ping === 'function') {
                  openAiWs.ping();
                } else {
                  openAiWs.send(JSON.stringify({ type: 'session.update', session: { instructions: systemPrompt } }));
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
            session.lastActivity = new Date();

            const msg = JSON.parse(data.toString());

            if (LOG_EVENT_TYPES.includes(msg.type)) {
              console.log(`📡 OpenAI event: ${msg.type}`);
            }

            // If OpenAI reports an error, log full payload for debugging
            if (msg.type === 'error' || msg.error) {
              console.error('🛑 OpenAI error event:', JSON.stringify(msg, null, 2));
            }

            // Track when AI starts speaking
            if (msg.type === 'response.audio.delta' || msg.type === 'response.output_audio.delta') {
              if (!session.isAiSpeaking) {
                session.isAiSpeaking = true;
                console.log('🗣️ AI started speaking');
              }
            }

            // Forward synthesized audio deltas back to Twilio (handle all possible event types)
            const isAudioDelta = (
              msg.type === 'response.output_audio.delta' ||
              msg.type === 'response.audio.delta' ||
              msg.type === 'response.audio_transcript.delta'
            );

            if (isAudioDelta && msg.delta) {
              // Only forward audio if AI is supposed to be speaking
              if (!session.isAiSpeaking) {
                console.log('⏳ Skipping audio delta forwarding - AI is not speaking (possibly interrupted)');
                return;
              }

              if (session.twilioSocketReady && session.twilioWs && typeof session.twilioWs.send === 'function') {
                try {
                  // Twilio Media Stream expects audio in base64 format
                  let audioPayload = msg.delta;

                  // More lenient base64 validation for audio data
                  if (!/^[A-Za-z0-9+/=]+$/.test(audioPayload)) {
                    console.warn('⚠️ Audio delta contains invalid base64 characters, skipping');
                    return;
                  }

                  // Build the media message with proper structure
                  const mediaMessage = {
                    event: 'media',
                    streamSid: session.streamSid,
                    media: {
                      payload: Buffer.from(audioPayload, 'base64').toString('base64')
                    }
                  };

                  // Add streamSid if available (critical for proper audio routing)
                  if (session.streamSid) {
                    mediaMessage.streamSid = session.streamSid;
                    console.log(`🔊 Sending ${msg.type} audio to stream: ${session.streamSid.substring(0, 8)}...`);
                  } else {
                    console.log(`⚠️ No streamSid available, sending ${msg.type} audio without stream identification`);
                  }

                  const messageStr = JSON.stringify(mediaMessage);
                  session.twilioWs.send(messageStr);
                  console.log(`🔊 Sent ${msg.type} delta to Twilio (${audioPayload.length} chars)`);
                } catch (sendError) {
                  console.error('❌ Failed to send audio to Twilio:', sendError);
                }
              } else {
                console.log('⏳ Waiting for Twilio socket to be ready before forwarding audio...');
              }
            }

            // Log response completion
            if (msg.type === 'response.done') {
              session.isAiSpeaking = false;
              console.log('✅ AI response completed');
            }

            // Track response cancellation
            if (msg.type === 'response.cancelled') {
              session.isAiSpeaking = false;
              console.log('🛑 AI response cancelled');
            }

            // Handle speech detection - immediate interruption
            if (msg.type === 'input_audio_buffer.speech_started') {
              console.log('👂 User started speaking - IMMEDIATELY interrupting AI');

              // IMMEDIATELY cancel any ongoing AI response
              if (session.openAiSocketReady && openAiWs.readyState === WebSocket.OPEN) {
                try {
                  // Send cancel command
                  openAiWs.send(JSON.stringify({ type: 'response.cancel' }));

                  // Also clear the input audio buffer to ensure clean interruption
                  openAiWs.send(JSON.stringify({ type: 'input_audio_buffer.clear' }));

                  // Clear Twilio buffer to stop any queued audio from playing
                  if (session.twilioSocketReady && session.twilioWs && session.streamSid) {
                    session.twilioWs.send(JSON.stringify({
                      event: 'clear',
                      streamSid: session.streamSid
                    }));
                    console.log('🗑️ Sent clear event to Twilio for stream:', session.streamSid);
                  }

                  session.isAiSpeaking = false;
                  console.log('🛑 Cancelled ongoing AI response and cleared buffer due to user interruption');
                } catch (err) {
                  console.error('❌ Failed to cancel AI response:', err);
                }
              }
            } else if (msg.type === 'input_audio_buffer.speech_stopped') {
              console.log('👂 User stopped speaking - preparing AI response');

              // Commit the audio buffer first, then trigger response
              setTimeout(() => {
                if (session.openAiSocketReady && openAiWs.readyState === WebSocket.OPEN) {
                  try {
                    console.log('🤖 Committing audio buffer and triggering AI response');

                    // Commit the audio buffer
                    openAiWs.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));

                    // Then trigger the response
                    openAiWs.send(JSON.stringify({ type: 'response.create' }));
                  } catch (err) {
                    console.error('❌ Failed to trigger AI response:', err);
                  }
                }
              }, 500); // Reduced delay for more responsive conversation
            }
          } catch (err) {
            console.error('🛑 OpenAI message parse error', err);
          }
        });

        // Forward Twilio audio packets to OpenAI - same as HiringPhone
        ws.on('message', (message) => {
          try {
            session.lastActivity = new Date();

            const twilioMsg = JSON.parse(message.toString());

            // Handle different Twilio events
            switch (twilioMsg.event) {
              case 'media':
                // Only forward to OpenAI if socket is ready
                if (session.openAiSocketReady && openAiWs.readyState === WebSocket.OPEN) {
                  try {
                    openAiWs.send(JSON.stringify({
                      type: 'input_audio_buffer.append',
                      audio: twilioMsg.media.payload
                    }));
                  } catch (err) {
                    console.error('❌ Failed to forward audio to OpenAI:', err);
                  }
                } else {
                  console.log('⏳ OpenAI socket not ready, dropping audio packet');
                }
                break;
              case 'start':
                console.log('📞 Stream started');
                console.log('📋 Start event data:', JSON.stringify(twilioMsg, null, 2));

                // Capture streamSid on start event if available
                if (twilioMsg.streamSid) {
                  session.streamSid = twilioMsg.streamSid;
                  console.log(`📡 Stream started with streamSid: ${session.streamSid.substring(0, 8)}...`);
                }

                // Extract call information from start event
                // According to Twilio docs, the start event contains: start.callSid, start.customParameters, etc.
                const startData = twilioMsg.start;
                if (startData && !callInfoReceived) {
                  const callSid = startData.callSid || null;
                  const customParams = startData.customParameters || {};
                  const fromNumber = customParams.From || null;
                  const toNumber = customParams.To || null;

                  // Look up call and configure system
                  lookupCallAndConfigure(callSid, fromNumber, toNumber).catch(err => {
                    console.error('❌ Failed to lookup and configure call:', err);
                  });
                }
                break;
              case 'stop':
                console.log('📞 Stream stopped');
                session.twilioSocketReady = false;
                session.streamSid = null; // Clear streamSid on stop
                break;
              case 'connected':
                console.log('📞 Call connected');
                // Capture streamSid on connected event if available
                if (twilioMsg.streamSid) {
                  session.streamSid = twilioMsg.streamSid;
                  console.log(`📡 Call connected with streamSid: ${session.streamSid.substring(0, 8)}...`);
                }
                break;
              case 'disconnect':
                console.log('📞 Call disconnected');
                session.twilioSocketReady = false;
                session.streamSid = null; // Clear streamSid on disconnect
                break;
            }
          } catch (err) {
            console.error('❗Twilio WS message error:', err);
          }
        });

        ws.on('close', (event) => {
          console.log(`🚫 Twilio media stream closed. Code: ${event}, Reason: ${event}`);
          session.twilioSocketReady = false;
          session.streamSid = null; // Clear streamSid on close
          if (openAiWs.readyState === WebSocket.OPEN) {
            openAiWs.close(1000, 'Twilio connection closed');
          }
          this.cleanupSession(sessionId);
        });

        ws.on('error', (err) => {
          console.error('🔥 Twilio WS error:', err);
          session.twilioSocketReady = false;
          session.streamSid = null; // Clear streamSid on error
          if (openAiWs.readyState === WebSocket.OPEN) {
            openAiWs.close(1000, 'OpenAI connection error');
          }
        });

        openAiWs.on('close', (event) => {
          console.log(`🛑 OpenAI Realtime API connection closed. Code: ${event}, Reason: ${event}`);
          session.openAiSocketReady = false;
          session.isOpenAIConnected = false;
        });

        openAiWs.on('error', (err) => {
          console.error('🔥 OpenAI WS error:', err);
          session.openAiSocketReady = false;
          session.isOpenAIConnected = false;
          ws.close(1000, 'OpenAI connection error');
        });

        console.log(`Voice stream session created: ${sessionId}`);
      } catch (error) {
        console.error("Error establishing WebSocket connection:", error);
        ws.close(1011, "Internal server error");
      }
    });

    console.log(`Voice WebSocket server listening on path: ${this.wss.options.path}`);
  }

  /**
   * Cleanup session resources
   */
  private async cleanupSession(sessionId: string) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    console.log(`Cleaning up session ${sessionId}`);

    // Close WebSockets
    if (session.twilioWs.readyState === 1) { // WebSocket.OPEN = 1
      session.twilioWs.close();
    }

    if (session.openaiWs && session.openaiWs.readyState === 1) { // WebSocket.OPEN = 1
      session.openaiWs.close();
    }

    // Update call status to completed
    if (session.callId) {
      const duration = Math.floor(
        (new Date().getTime() - session.startTime.getTime()) / 1000
      );

      await this.updateCallStatus(session.callId, "completed", {
        durationSeconds: duration,
      });

      // Save final transcript
      if (session.transcript.length > 0) {
        await this.updateCallTranscript(session.callId, session.transcript.join("\n"));
      }
    }

    // Remove from active sessions
    this.activeSessions.delete(sessionId);
  }

  /**
   * Update call status in database
   */
  private async updateCallStatus(callId: string, status: string, additionalData?: any) {
    try {
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
    } catch (error) {
      console.error("Error updating call status:", error);
    }
  }

  /**
   * Update call transcript
   */
  private async updateCallTranscript(callId: string, transcript: string) {
    try {
      await db
        .update(voiceCalls)
        .set({
          transcript,
          updatedAt: new Date(),
        })
        .where(eq(voiceCalls.id, callId));
    } catch (error) {
      console.error("Error updating call transcript:", error);
    }
  }

  /**
   * Log call event
   */
  private async logCallEvent(callId: string, eventType: string, eventData: any) {
    try {
      await db.insert(voiceCallEvents).values({
        id: crypto.randomUUID(),
        voiceCallId: callId,
        eventType,
        eventData,
      });
    } catch (error) {
      console.error("Error logging call event:", error);
    }
  }

  /**
   * Start session cleanup interval
   */
  private startSessionCleanup() {
    // Clean up inactive sessions every 30 seconds
    this.sessionCleanupInterval = setInterval(() => {
      const now = new Date();
      const inactiveThreshold = 5 * 60 * 1000; // 5 minutes

      for (const [sessionId, session] of this.activeSessions.entries()) {
        const inactiveTime = now.getTime() - session.lastActivity.getTime();

        if (inactiveTime > inactiveThreshold) {
          console.log(`Cleaning up inactive session: ${sessionId}`);
          this.cleanupSession(sessionId);
        }
      }
    }, 30000);
  }

  /**
   * Get active session count
   */
  getActiveSessionCount(): number {
    return this.activeSessions.size;
  }

  /**
   * Close all sessions and shutdown server
   */
  async shutdown() {
    console.log("Shutting down voice stream server...");

    // Clear cleanup interval
    if (this.sessionCleanupInterval !== null) {
      clearInterval(this.sessionCleanupInterval);
    }

    // Close all active sessions
    for (const [sessionId] of this.activeSessions) {
      await this.cleanupSession(sessionId);
    }

    // Close WebSocket server
    this.wss.close();
  }
}

// Export factory function
export function createVoiceStreamServer(server: any, path?: string): VoiceStreamServer {
  return new VoiceStreamServer(server, path);
}