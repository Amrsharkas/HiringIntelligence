import type { Express } from "express";
import { storage } from "./storage";
import { smsService, type SMSParams } from "./smsService";
import { smsParamsSchema } from "@shared/schema";
import { requireAuth } from "./auth";

export function registerSMSRoutes(app: Express): void {
  // Generic SMS send endpoint
  app.post('/api/sms/send', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;

      // Validate request body
      const smsData = smsParamsSchema.parse(req.body);

      // Log the SMS attempt
      console.log(`📱 [${userId}] Sending SMS to ${smsData.to}: ${smsData.message.substring(0, 50)}...`);

      // Send SMS
      const success = await smsService.sendSMS(smsData);

      if (success) {
        // Create database log
        try {
          await storage.createSMSLog({
            to: smsData.to,
            message: smsData.message,
            type: smsData.type,
            provider: 'default', // This would be updated by the service
            success: true,
            userId,
          });
        } catch (logError) {
          console.error('❌ Failed to create SMS log:', logError);
        }

        res.json({
          success: true,
          message: "SMS sent successfully"
        });
      } else {
        // Create failed log
        try {
          await storage.createSMSLog({
            to: smsData.to,
            message: smsData.message,
            type: smsData.type,
            provider: 'default',
            success: false,
            error: "SMS sending failed",
            userId,
          });
        } catch (logError) {
          console.error('❌ Failed to create SMS log:', logError);
        }

        res.status(500).json({
          success: false,
          message: "Failed to send SMS"
        });
      }

    } catch (error) {
      console.error("Error sending SMS:", error);
      res.status(500).json({
        message: "Failed to send SMS",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Convenience endpoint for verification SMS (uses generic send internally)
  app.post('/api/sms/send-verification', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { to, code } = req.body;

      if (!to || !code) {
        return res.status(400).json({
          message: "Phone number and verification code are required"
        });
      }

      const message = `Your verification code is: ${code}. This code will expire in 10 minutes.`;
      const smsData: SMSParams = {
        to,
        message,
        type: 'verification'
      };

      const success = await smsService.sendSMS(smsData);

      if (success) {
        // Create database log
        try {
          await storage.createSMSLog({
            to,
            message,
            type: 'verification',
            provider: 'default',
            success: true,
            userId,
          });
        } catch (logError) {
          console.error('❌ Failed to create SMS log:', logError);
        }

        res.json({
          success: true,
          message: "Verification SMS sent successfully"
        });
      } else {
        // Create failed log
        try {
          await storage.createSMSLog({
            to,
            message,
            type: 'verification',
            provider: 'default',
            success: false,
            error: "SMS sending failed",
            userId,
          });
        } catch (logError) {
          console.error('❌ Failed to create SMS log:', logError);
        }

        res.status(500).json({
          success: false,
          message: "Failed to send verification SMS"
        });
      }

    } catch (error) {
      console.error("Error sending verification SMS:", error);
      res.status(500).json({
        message: "Failed to send verification SMS",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Convenience endpoint for interview SMS (uses generic send internally)
  app.post('/api/sms/send-interview', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { to, applicantName, jobTitle, companyName, interviewDate, interviewTime, meetingLink } = req.body;

      if (!to || !applicantName || !jobTitle || !companyName || !interviewDate || !interviewTime) {
        return res.status(400).json({
          message: "Missing required fields for interview SMS"
        });
      }

      let message = `Hello ${applicantName}, your interview for ${jobTitle} at ${companyName} is scheduled for ${interviewDate} at ${interviewTime}.`;

      if (meetingLink) {
        message += ` Join here: ${meetingLink}`;
      }

      message += ` Please confirm your attendance.`;

      const smsData: SMSParams = {
        to,
        message,
        type: 'interview'
      };

      const success = await smsService.sendSMS(smsData);

      if (success) {
        // Create database log
        try {
          await storage.createSMSLog({
            to,
            message,
            type: 'interview',
            provider: 'default',
            success: true,
            userId,
          });
        } catch (logError) {
          console.error('❌ Failed to create SMS log:', logError);
        }

        res.json({
          success: true,
          message: "Interview SMS sent successfully"
        });
      } else {
        // Create failed log
        try {
          await storage.createSMSLog({
            to,
            message,
            type: 'interview',
            provider: 'default',
            success: false,
            error: "SMS sending failed",
            userId,
          });
        } catch (logError) {
          console.error('❌ Failed to create SMS log:', logError);
        }

        res.status(500).json({
          success: false,
          message: "Failed to send interview SMS"
        });
      }

    } catch (error) {
      console.error("Error sending interview SMS:", error);
      res.status(500).json({
        message: "Failed to send interview SMS",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get SMS logs
  app.get('/api/sms/logs', requireAuth, async (req: any, res) => {
    try {
      const { recipient, provider, limit } = req.query;

      let logs;

      if (recipient) {
        logs = await storage.getSMSLogsByRecipient(recipient as string, limit ? parseInt(limit as string) : 50);
      } else if (provider) {
        logs = await storage.getSMSLogsByProvider(provider as string, limit ? parseInt(limit as string) : 50);
      } else {
        return res.status(400).json({
          message: "Either recipient or provider parameter is required"
        });
      }

      res.json({
        success: true,
        logs
      });

    } catch (error) {
      console.error("Error fetching SMS logs:", error);
      res.status(500).json({
        message: "Failed to fetch SMS logs",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Test SMS provider
  app.post('/api/sms/test-provider', requireAuth, async (req: any, res) => {
    try {
      const { providerName, to } = req.body;

      if (!providerName || !to) {
        return res.status(400).json({
          message: "Provider name and phone number are required"
        });
      }

      const success = await smsService.testProvider(providerName, to);

      if (success) {
        res.json({
          success: true,
          message: `Test SMS sent successfully using ${providerName} provider`
        });
      } else {
        res.status(500).json({
          success: false,
          message: `Failed to send test SMS using ${providerName} provider`
        });
      }

    } catch (error) {
      console.error("Error testing SMS provider:", error);
      res.status(500).json({
        message: "Failed to test SMS provider",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get configured SMS providers
  app.get('/api/sms/providers', requireAuth, async (_req: any, res) => {
    try {
      const providers = smsService.getConfiguredProviders();

      res.json({
        success: true,
        providers,
        configured: providers.length > 0
      });

    } catch (error) {
      console.error("Error fetching SMS providers:", error);
      res.status(500).json({
        message: "Failed to fetch SMS providers",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
}