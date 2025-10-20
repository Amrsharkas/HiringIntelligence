import type { Express } from "express";
import { storage } from "./storage";
import { whatsappService, type WhatsAppParams } from "./whatsappService";
import { whatsappParamsSchema } from "@shared/schema";
import { requireAuth } from "./auth";

export function registerWhatsAppRoutes(app: Express): void {
  // Generic WhatsApp send endpoint
  app.post('/api/whatsapp/send', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;

      // Validate request body
      const whatsappData = whatsappParamsSchema.parse(req.body);

      // Log the WhatsApp attempt
      console.log(`📱 [${userId}] Sending WhatsApp to ${whatsappData.to}: ${whatsappData.message?.substring(0, 50) || 'Template message'}...`);

      // Send WhatsApp message
      const success = await whatsappService.sendWhatsApp(whatsappData);

      if (success) {
        // Create database log
        try {
          await storage.createWhatsAppLog({
            to: whatsappData.to,
            message: whatsappData.message || null,
            type: whatsappData.type,
            templateName: whatsappData.templateName || null,
            templateParams: whatsappData.templateParams || null,
            provider: 'default', // This would be updated by the service
            success: true,
            userId,
          });
        } catch (logError) {
          console.error('❌ Failed to create WhatsApp log:', logError);
        }

        res.json({
          success: true,
          message: "WhatsApp message sent successfully"
        });
      } else {
        // Create failed log
        try {
          await storage.createWhatsAppLog({
            to: whatsappData.to,
            message: whatsappData.message || null,
            type: whatsappData.type,
            templateName: whatsappData.templateName || null,
            templateParams: whatsappData.templateParams || null,
            provider: 'default',
            success: false,
            error: "WhatsApp sending failed",
            userId,
          });
        } catch (logError) {
          console.error('❌ Failed to create WhatsApp log:', logError);
        }

        res.status(500).json({
          success: false,
          message: "Failed to send WhatsApp message"
        });
      }

    } catch (error) {
      console.error("Error sending WhatsApp message:", error);
      res.status(500).json({
        message: "Failed to send WhatsApp message",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Convenience endpoint for template WhatsApp messages (uses generic send internally)
  app.post('/api/whatsapp/send-template', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { to, templateName, templateParams } = req.body;

      if (!to || !templateName) {
        return res.status(400).json({
          message: "Phone number and template name are required"
        });
      }

      const whatsappData: WhatsAppParams = {
        to,
        message: '', // Empty message for template messages
        type: 'notification',
        templateName,
        templateParams: templateParams || {}
      };

      const success = await whatsappService.sendWhatsApp(whatsappData);

      if (success) {
        // Create database log
        try {
          await storage.createWhatsAppLog({
            to,
            message: null,
            type: 'notification',
            templateName,
            templateParams: templateParams || {},
            provider: 'default',
            success: true,
            userId,
          });
        } catch (logError) {
          console.error('❌ Failed to create WhatsApp log:', logError);
        }

        res.json({
          success: true,
          message: "WhatsApp template message sent successfully"
        });
      } else {
        // Create failed log
        try {
          await storage.createWhatsAppLog({
            to,
            message: null,
            type: 'notification',
            templateName,
            templateParams: templateParams || {},
            provider: 'default',
            success: false,
            error: "WhatsApp sending failed",
            userId,
          });
        } catch (logError) {
          console.error('❌ Failed to create WhatsApp log:', logError);
        }

        res.status(500).json({
          success: false,
          message: "Failed to send WhatsApp template message"
        });
      }

    } catch (error) {
      console.error("Error sending WhatsApp template message:", error);
      res.status(500).json({
        message: "Failed to send WhatsApp template message",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Convenience endpoint for interview WhatsApp messages (uses generic send internally)
  app.post('/api/whatsapp/send-interview', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { to, applicantName, jobTitle, companyName, interviewDate, interviewTime, meetingLink } = req.body;

      if (!to || !applicantName || !jobTitle || !companyName || !interviewDate || !interviewTime) {
        return res.status(400).json({
          message: "Missing required fields for interview WhatsApp message"
        });
      }

      let message = `Hello ${applicantName}, your interview for ${jobTitle} at ${companyName} is scheduled for ${interviewDate} at ${interviewTime}.`;

      if (meetingLink) {
        message += ` Join here: ${meetingLink}`;
      }

      message += ` Please confirm your attendance.`;

      const whatsappData: WhatsAppParams = {
        to,
        message,
        type: 'interview'
      };

      const success = await whatsappService.sendWhatsApp(whatsappData);

      if (success) {
        // Create database log
        try {
          await storage.createWhatsAppLog({
            to,
            message,
            type: 'interview',
            templateName: null,
            templateParams: null,
            provider: 'default',
            success: true,
            userId,
          });
        } catch (logError) {
          console.error('❌ Failed to create WhatsApp log:', logError);
        }

        res.json({
          success: true,
          message: "Interview WhatsApp message sent successfully"
        });
      } else {
        // Create failed log
        try {
          await storage.createWhatsAppLog({
            to,
            message,
            type: 'interview',
            templateName: null,
            templateParams: null,
            provider: 'default',
            success: false,
            error: "WhatsApp sending failed",
            userId,
          });
        } catch (logError) {
          console.error('❌ Failed to create WhatsApp log:', logError);
        }

        res.status(500).json({
          success: false,
          message: "Failed to send interview WhatsApp message"
        });
      }

    } catch (error) {
      console.error("Error sending interview WhatsApp message:", error);
      res.status(500).json({
        message: "Failed to send interview WhatsApp message",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get WhatsApp logs
  app.get('/api/whatsapp/logs', requireAuth, async (req: any, res) => {
    try {
      const { recipient, provider, limit } = req.query;

      let logs;

      if (recipient) {
        logs = await storage.getWhatsAppLogsByRecipient(recipient as string, limit ? parseInt(limit as string) : 50);
      } else if (provider) {
        logs = await storage.getWhatsAppLogsByProvider(provider as string, limit ? parseInt(limit as string) : 50);
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
      console.error("Error fetching WhatsApp logs:", error);
      res.status(500).json({
        message: "Failed to fetch WhatsApp logs",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Test WhatsApp provider
  app.post('/api/whatsapp/test-provider', requireAuth, async (req: any, res) => {
    try {
      const { providerName, to } = req.body;

      if (!providerName || !to) {
        return res.status(400).json({
          message: "Provider name and phone number are required"
        });
      }

      const success = await whatsappService.testProvider(providerName, to);

      if (success) {
        res.json({
          success: true,
          message: `Test WhatsApp message sent successfully using ${providerName} provider`
        });
      } else {
        res.status(500).json({
          success: false,
          message: `Failed to send test WhatsApp message using ${providerName} provider`
        });
      }

    } catch (error) {
      console.error("Error testing WhatsApp provider:", error);
      res.status(500).json({
        message: "Failed to test WhatsApp provider",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get configured WhatsApp providers
  app.get('/api/whatsapp/providers', requireAuth, async (_req: any, res) => {
    try {
      const providers = whatsappService.getConfiguredProviders();

      res.json({
        success: true,
        providers,
        configured: providers.length > 0
      });

    } catch (error) {
      console.error("Error fetching WhatsApp providers:", error);
      res.status(500).json({
        message: "Failed to fetch WhatsApp providers",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
}