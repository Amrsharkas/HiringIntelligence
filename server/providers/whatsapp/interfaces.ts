// WhatsApp Provider Interface
export interface WhatsAppParams {
  to: string;
  message?: string; // Optional for template messages
  type?: 'notification' | 'verification' | 'alert' | 'interview';
  templateName?: string;
  templateParams?: Record<string, any>;
}

export interface WhatsAppProvider {
  name: string;
  send(params: WhatsAppParams): Promise<boolean>;
  isConfigured(): boolean;
}