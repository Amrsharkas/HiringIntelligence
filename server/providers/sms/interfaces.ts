// SMS Provider Interface
export interface SMSParams {
  to: string;
  message: string;
  type?: 'notification' | 'verification' | 'alert' | 'interview';
}

export interface SMSProvider {
  name: string;
  send(params: SMSParams): Promise<boolean>;
  isConfigured(): boolean;
}