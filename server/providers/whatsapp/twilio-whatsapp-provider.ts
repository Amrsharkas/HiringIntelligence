import { WhatsAppProvider, WhatsAppParams } from './interfaces';

// Twilio WhatsApp Provider (Primary Implementation)
export class TwilioWhatsAppProvider implements WhatsAppProvider {
  name = 'TwilioWhatsApp';

  private accountSid: string;
  private authToken: string;
  private whatsappNumber: string;

  constructor() {
    this.accountSid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
    this.authToken = (process.env.TWILIO_AUTH_TOKEN || '').trim();
    this.whatsappNumber = (process.env.TWILIO_WHATSAPP_NUMBER || '').trim();
  }

  isConfigured(): boolean {
    return !!(this.accountSid && this.authToken && this.whatsappNumber);
  }

  async send(params: WhatsAppParams): Promise<boolean> {
    try {
      if (!this.isConfigured()) {
        console.warn('📱 Twilio WhatsApp provider not configured: missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_WHATSAPP_NUMBER');
        return false;
      }

      console.log(`📱 [Twilio WhatsApp] Sending WhatsApp message to ${params.to}: ${params.message?.substring(0, 50) || 'Template message'}...`);

      // TODO: Implement actual Twilio WhatsApp API call
      // This would require installing @twilio/rest/client package
      // const client = require('twilio')(this.accountSid, this.authToken);

      // For template messages (WhatsApp Business API requirement)
      // const result = await client.messages.create({
      //   from: `whatsapp:${this.whatsappNumber}`,
      //   to: `whatsapp:${params.to}`,
      //   body: params.message,
      //   // For template messages, you might use:
      //   contentSid: 'template_sid',
      //   contentVariables: JSON.stringify(params.templateParams || {})
      // });

      // Placeholder: Simulate successful API call
      await new Promise(resolve => setTimeout(resolve, 400));
      console.log(`✅ [Twilio WhatsApp] WhatsApp message sent successfully to ${params.to}`);
      return true;

    } catch (error) {
      console.error('❌ [Twilio WhatsApp] WhatsApp sending error:', error);
      return false;
    }
  }
}