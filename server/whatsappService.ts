// Import providers from separate files
import type { WhatsAppProvider, WhatsAppParams } from './providers/whatsapp';
import { TwilioWhatsAppProvider, OfficialWhatsAppProvider } from './providers/whatsapp';

// WhatsApp Service Class
class WhatsAppService {
  private providers: WhatsAppProvider[];
  private defaultProvider: WhatsAppProvider | null;
  private storage: any; // Import storage to avoid circular dependency

  constructor(storage?: any) {
    this.storage = storage;
    this.providers = [
      new TwilioWhatsAppProvider(),
      new OfficialWhatsAppProvider(),
    ];

    // Set default provider to the first configured provider
    this.defaultProvider = this.providers.find(provider => provider.isConfigured()) || null;

    if (this.defaultProvider) {
      console.log(`📱 WhatsAppService initialized with default provider: ${this.defaultProvider.name}`);
    } else {
      console.warn('📱 WhatsAppService initialized without any configured providers. WhatsApp sending will be disabled.');
    }
  }

  isConfigured(): boolean {
    return this.defaultProvider !== null;
  }

  private async logWhatsAppAttempt(params: WhatsAppParams, provider: WhatsAppProvider, success: boolean, error?: any, externalId?: string): Promise<void> {
    const logData = {
      to: params.to,
      message: params.message,
      type: params.type || 'notification',
      templateName: params.templateName,
      templateParams: params.templateParams,
      provider: provider.name,
      success,
      error: error ? String(error) : null,
      externalId: externalId || null,
      timestamp: new Date().toISOString()
    };

    if (success) {
      console.log(`✅ WhatsApp Log: ${JSON.stringify(logData)}`);
    } else {
      console.error(`❌ WhatsApp Log: ${JSON.stringify(logData)}`);
    }

    // Store in database if storage is available
    if (this.storage) {
      try {
        await this.storage.createWhatsAppLog({
          to: params.to,
          message: params.message,
          type: params.type || 'notification',
          templateName: params.templateName,
          templateParams: params.templateParams,
          provider: provider.name,
          success,
          error: error ? String(error) : null,
          externalId: externalId || null,
        });
      } catch (dbError) {
        console.error('❌ Failed to store WhatsApp log in database:', dbError);
      }
    }
  }

  async sendWhatsApp(params: WhatsAppParams, providerName?: string): Promise<boolean> {
    try {
      if (!params.to) {
        console.error('❌ WhatsApp sending failed: missing recipient');
        return false;
      }

      // For template messages, templateName is required
      // For regular messages, message is required
      if (params.templateName) {
        if (!params.message) {
          // Template messages don't need a message text
          console.log(`📱 Sending template message: ${params.templateName}`);
        }
      } else if (!params.message) {
        console.error('❌ WhatsApp sending failed: missing message (no template provided)');
        return false;
      }

      // Validate phone number format for WhatsApp
      if (!this.isValidWhatsAppNumber(params.to)) {
        console.error(`❌ WhatsApp sending failed: invalid WhatsApp number format: ${params.to}`);
        return false;
      }

      let provider: WhatsAppProvider | null = null;

      // Use specified provider if provided and configured
      if (providerName) {
        provider = this.providers.find(p => p.name.toLowerCase() === providerName.toLowerCase() && p.isConfigured()) || null;
        if (!provider) {
          console.warn(`📱 Specified provider "${providerName}" not found or not configured, falling back to default`);
        }
      }

      // Use default provider if no specific provider or specified provider not available
      if (!provider) {
        provider = this.defaultProvider;
      }

      if (!provider) {
        console.warn('📱 Skipping WhatsApp: No WhatsApp provider configured');
        return false;
      }

      const success = await provider.send(params);
      await this.logWhatsAppAttempt(params, provider, success);

      return success;

    } catch (error) {
      console.error('❌ WhatsAppService error:', error);
      if (this.defaultProvider) {
        await this.logWhatsAppAttempt(params, this.defaultProvider, false, error);
      }
      return false;
    }
  }

  // Convenience methods for specific use cases
  async sendVerificationWhatsApp(to: string, code: string): Promise<boolean> {
    const message = `Your verification code is: ${code}. This code will expire in 10 minutes.`;
    return this.sendWhatsApp({ to, message, type: 'verification' });
  }

  async sendInterviewWhatsApp(to: string, applicantName: string, jobTitle: string, companyName: string, interviewDate: string, interviewTime: string, meetingLink?: string): Promise<boolean> {
    let message = `Hello ${applicantName}, your interview for ${jobTitle} at ${companyName} is scheduled for ${interviewDate} at ${interviewTime}.`;

    if (meetingLink) {
      message += ` Join here: ${meetingLink}`;
    }

    message += ` Please confirm your attendance.`;

    return this.sendWhatsApp({ to, message, type: 'interview' });
  }

  async sendTemplateWhatsApp(to: string, templateName: string, templateParams: Record<string, any>): Promise<boolean> {
    return this.sendWhatsApp({
      to,
      message: '', // Template messages don't use custom message text
      type: 'notification',
      templateName,
      templateParams
    });
  }

  async sendAlertWhatsApp(to: string, message: string): Promise<boolean> {
    return this.sendWhatsApp({ to, message, type: 'alert' });
  }

  // Get list of configured providers
  getConfiguredProviders(): string[] {
    return this.providers
      .filter(provider => provider.isConfigured())
      .map(provider => provider.name);
  }

  // Test a specific provider
  async testProvider(providerName: string, to: string): Promise<boolean> {
    const provider = this.providers.find(p => p.name.toLowerCase() === providerName.toLowerCase());

    if (!provider) {
      console.error(`❌ Provider "${providerName}" not found`);
      return false;
    }

    if (!provider.isConfigured()) {
      console.error(`❌ Provider "${providerName}" is not configured`);
      return false;
    }

    const testMessage = `Test message from ${providerName} provider at ${new Date().toISOString()}`;
    return this.sendWhatsApp({ to, message: testMessage }, providerName);
  }

  private isValidWhatsAppNumber(phone: string): boolean {
    // WhatsApp number validation - should include country code
    // Remove any spaces, dashes, parentheses, plus signs (except at start)
    const cleanedPhone = phone.replace(/[\s\-\(\)]/g, '');

    // Should start with country code (1-3 digits) followed by 7-15 digits
    const whatsappRegex = /^\+?[1-9]\d{7,14}$/;
    return whatsappRegex.test(cleanedPhone);
  }
}

// Export singleton instance
export const whatsappService = new WhatsAppService();
export type { WhatsAppParams } from './providers/whatsapp';