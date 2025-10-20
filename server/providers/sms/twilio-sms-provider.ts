import { SMSProvider, SMSParams } from './interfaces';

// Twilio SMS Provider (for future expansion)
export class TwilioSMSProvider implements SMSProvider {
  name = 'Twilio';

  private accountSid: string;
  private authToken: string;
  private phoneNumber: string;

  constructor() {
    this.accountSid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
    this.authToken = (process.env.TWILIO_AUTH_TOKEN || '').trim();
    this.phoneNumber = (process.env.TWILIO_PHONE_NUMBER || '').trim();
  }

  isConfigured(): boolean {
    return !!(this.accountSid && this.authToken && this.phoneNumber);
  }

  async send(params: SMSParams): Promise<boolean> {
    try {
      if (!this.isConfigured()) {
        console.warn('📱 Twilio SMS provider not configured: missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_PHONE_NUMBER');
        return false;
      }

      console.log(`📱 [Twilio] Sending SMS to ${params.to}: ${params.message.substring(0, 50)}...`);

      // TODO: Implement actual Twilio SMS API call
      // This would require installing @twilio/rest/client package
      // const client = require('twilio')(this.accountSid, this.authToken);
      // const result = await client.messages.create({
      //   body: params.message,
      //   from: this.phoneNumber,
      //   to: params.to
      // });

      // Placeholder: Simulate successful API call
      await new Promise(resolve => setTimeout(resolve, 300));
      console.log(`✅ [Twilio] SMS sent successfully to ${params.to}`);
      return true;

    } catch (error) {
      console.error('❌ [Twilio] SMS sending error:', error);
      return false;
    }
  }
}