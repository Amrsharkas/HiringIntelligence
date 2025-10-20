// Import providers from separate files
import type { SMSProvider, SMSParams } from './providers/sms';
import { SMSMisrProvider, TwilioSMSProvider } from './providers/sms';

// SMS Service Class
class SMSService {
  private providers: SMSProvider[];
  private defaultProvider: SMSProvider | null;
  private storage: any; // Import storage to avoid circular dependency

  constructor(storage?: any) {
    this.storage = storage;
    this.providers = [
      new SMSMisrProvider(),
      new TwilioSMSProvider(),
    ];

    // Set default provider to the first configured provider
    this.defaultProvider = this.providers.find(provider => provider.isConfigured()) || null;

    if (this.defaultProvider) {
      console.log(`📱 SMSService initialized with default provider: ${this.defaultProvider.name}`);
    } else {
      console.warn('📱 SMSService initialized without any configured providers. SMS sending will be disabled.');
    }
  }

  isConfigured(): boolean {
    return this.defaultProvider !== null;
  }

  private async logSMSAttempt(params: SMSParams, provider: SMSProvider, success: boolean, error?: any, externalId?: string): Promise<void> {
    const logData = {
      to: params.to,
      message: params.message,
      type: params.type || 'notification',
      provider: provider.name,
      success,
      error: error ? String(error) : null,
      externalId: externalId || null,
      timestamp: new Date().toISOString()
    };

    if (success) {
      console.log(`✅ SMS Log: ${JSON.stringify(logData)}`);
    } else {
      console.error(`❌ SMS Log: ${JSON.stringify(logData)}`);
    }

    // Store in database if storage is available
    if (this.storage) {
      try {
        await this.storage.createSMSLog({
          to: params.to,
          message: params.message,
          type: params.type || 'notification',
          provider: provider.name,
          success,
          error: error ? String(error) : null,
          externalId: externalId || null,
        });
      } catch (dbError) {
        console.error('❌ Failed to store SMS log in database:', dbError);
      }
    }
  }

  async sendSMS(params: SMSParams, providerName?: string): Promise<boolean> {
    try {
      if (!params.to || !params.message) {
        console.error('❌ SMS sending failed: missing recipient or message');
        return false;
      }

      // Validate phone number format (basic validation)
      if (!this.isValidPhoneNumber(params.to)) {
        console.error(`❌ SMS sending failed: invalid phone number format: ${params.to}`);
        return false;
      }

      let provider: SMSProvider | null = null;

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
        console.warn('📱 Skipping SMS: No SMS provider configured');
        return false;
      }

      const success = await provider.send(params);
      await this.logSMSAttempt(params, provider, success);

      return success;

    } catch (error) {
      console.error('❌ SMSService error:', error);
      if (this.defaultProvider) {
        await this.logSMSAttempt(params, this.defaultProvider, false, error);
      }
      return false;
    }
  }

  // Convenience methods for specific use cases
  async sendVerificationSMS(to: string, code: string): Promise<boolean> {
    const message = `Your verification code is: ${code}. This code will expire in 10 minutes.`;
    return this.sendSMS({ to, message, type: 'verification' });
  }

  async sendInterviewSMS(to: string, applicantName: string, jobTitle: string, companyName: string, interviewDate: string, interviewTime: string, meetingLink?: string): Promise<boolean> {
    let message = `Hello ${applicantName}, your interview for ${jobTitle} at ${companyName} is scheduled for ${interviewDate} at ${interviewTime}.`;

    if (meetingLink) {
      message += ` Join here: ${meetingLink}`;
    }

    message += ` Please confirm your attendance.`;

    return this.sendSMS({ to, message, type: 'interview' });
  }

  async sendAlertSMS(to: string, message: string): Promise<boolean> {
    return this.sendSMS({ to, message, type: 'alert' });
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
    return this.sendSMS({ to, message: testMessage }, providerName);
  }

  private isValidPhoneNumber(phone: string): boolean {
    // Basic phone number validation - can be enhanced based on requirements
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  }
}

// Export singleton instance
export const smsService = new SMSService();
export type { SMSParams } from './providers/sms';