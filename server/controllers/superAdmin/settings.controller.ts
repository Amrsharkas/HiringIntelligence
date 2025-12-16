import { Request, Response } from 'express';
import { systemSettingsService } from '../../services/systemSettingsService';
import { twilioVoiceService } from '../../services/twilioVoiceService';

class SettingsController {
  /**
   * Get Twilio settings (with masked auth token)
   */
  async getTwilioSettings(req: Request, res: Response) {
    try {
      const settings = await systemSettingsService.getTwilioSettings();

      // Mask auth token for security
      const maskedSettings = {
        accountSid: settings.accountSid,
        authToken: settings.authToken
          ? `${'*'.repeat(Math.max(0, settings.authToken.length - 4))}${settings.authToken.slice(-4)}`
          : '',
        phoneNumber: settings.phoneNumber,
        isConfigured: settings.isConfigured,
      };

      // Get connection status
      const connectionStatus = await twilioVoiceService.getConnectionStatus();

      res.json({
        settings: maskedSettings,
        connectionStatus,
      });
    } catch (error) {
      console.error('Error fetching Twilio settings:', error);
      res.status(500).json({ error: 'Failed to fetch Twilio settings' });
    }
  }

  /**
   * Update Twilio settings
   */
  async updateTwilioSettings(req: Request, res: Response) {
    try {
      const { accountSid, authToken, phoneNumber } = req.body;

      // Validate required fields
      if (!accountSid || !authToken || !phoneNumber) {
        return res.status(400).json({
          error: 'All fields are required: accountSid, authToken, phoneNumber',
        });
      }

      // Validate Account SID format (starts with AC)
      if (!accountSid.startsWith('AC') || accountSid.length !== 34) {
        return res.status(400).json({
          error: 'Invalid Account SID format. Must start with "AC" and be 34 characters.',
        });
      }

      // Validate phone number format (E.164)
      const phoneRegex = /^\+[1-9]\d{1,14}$/;
      if (!phoneRegex.test(phoneNumber)) {
        return res.status(400).json({
          error: 'Phone number must be in E.164 format (e.g., +12025551234)',
        });
      }

      // Save settings
      await systemSettingsService.setTwilioSettings({
        accountSid,
        authToken,
        phoneNumber,
      });

      // Reinitialize the Twilio service with new credentials
      await twilioVoiceService.reinitialize();

      // Test the connection with new credentials
      const connectionStatus = await twilioVoiceService.getConnectionStatus();

      res.json({
        message: 'Twilio settings updated successfully',
        settings: {
          accountSid,
          authToken: `${'*'.repeat(Math.max(0, authToken.length - 4))}${authToken.slice(-4)}`,
          phoneNumber,
          isConfigured: true,
        },
        connectionStatus,
      });
    } catch (error) {
      console.error('Error updating Twilio settings:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to update Twilio settings',
      });
    }
  }

  /**
   * Test Twilio connection with provided credentials (does NOT save them)
   */
  async testTwilioConnection(req: Request, res: Response) {
    try {
      const { accountSid, authToken, phoneNumber } = req.body;

      // Validate required fields
      if (!accountSid || !authToken || !phoneNumber) {
        return res.status(400).json({
          success: false,
          error: 'All fields are required: accountSid, authToken, phoneNumber',
        });
      }

      // Validate Account SID format
      if (!accountSid.startsWith('AC') || accountSid.length !== 34) {
        return res.status(400).json({
          success: false,
          error: 'Invalid Account SID format. Must start with "AC" and be 34 characters.',
        });
      }

      // Validate phone number format (E.164)
      const phoneRegex = /^\+[1-9]\d{1,14}$/;
      if (!phoneRegex.test(phoneNumber)) {
        return res.status(400).json({
          success: false,
          error: 'Phone number must be in E.164 format (e.g., +12025551234)',
        });
      }

      // Test connection with provided credentials (without saving)
      const twilio = await import('twilio');
      const testClient = twilio.default(accountSid, authToken);

      try {
        const account = await testClient.api.accounts(accountSid).fetch();

        res.json({
          success: account.status === 'active',
          connected: account.status === 'active',
          source: 'test',
          phoneNumber,
          accountSid,
          accountStatus: account.status,
        });
      } catch (twilioError: any) {
        res.json({
          success: false,
          connected: false,
          source: 'test',
          phoneNumber,
          accountSid,
          error: twilioError.message || 'Invalid Twilio credentials',
        });
      }
    } catch (error) {
      console.error('Error testing Twilio connection:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed',
      });
    }
  }
}

export const settingsController = new SettingsController();
