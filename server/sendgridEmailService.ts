import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

export interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    await mailService.send({
      to: params.to,
      from: params.from,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    console.log(`✅ Email sent successfully to ${params.to}`);
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

export async function sendVerificationEmail(email: string, verificationToken: string, baseUrl: string): Promise<boolean> {
  const verificationLink = `${baseUrl}/verify-email?token=${verificationToken}`;
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #3B82F6; font-size: 28px; margin: 0;">Plato</h1>
        <p style="color: #64748B; margin: 5px 0;">AI-Powered Hiring Platform</p>
      </div>
      
      <div style="background: #F8FAFC; border-radius: 8px; padding: 30px; margin-bottom: 30px;">
        <h2 style="color: #1E293B; margin-top: 0;">Verify Your Email Address</h2>
        <p style="color: #475569; line-height: 1.6;">
          Thank you for signing up with Plato! To complete your registration and access your account, 
          please verify your email address by clicking the button below.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" 
             style="background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%); 
                    color: white; 
                    text-decoration: none; 
                    padding: 15px 30px; 
                    border-radius: 8px; 
                    font-weight: 600; 
                    display: inline-block;">
            Verify Email Address
          </a>
        </div>
        
        <p style="color: #6B7280; font-size: 14px; margin-bottom: 0;">
          This verification link will expire in 24 hours. If you didn't create an account with Plato, 
          you can safely ignore this email.
        </p>
      </div>
      
      <div style="border-top: 1px solid #E2E8F0; padding-top: 20px; text-align: center;">
        <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
          © 2025 Plato Hiring Platform. All rights reserved.
        </p>
      </div>
    </div>
  `;

  return await sendEmail({
    to: email,
    from: 'noreply@platohiring.com',
    subject: 'Verify Your Email - Plato',
    text: `Please verify your email address by visiting: ${verificationLink}`,
    html: htmlContent,
  });
}

export async function sendPasswordResetEmail(email: string, resetToken: string, baseUrl: string): Promise<boolean> {
  const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #3B82F6; font-size: 28px; margin: 0;">Plato</h1>
        <p style="color: #64748B; margin: 5px 0;">AI-Powered Hiring Platform</p>
      </div>
      
      <div style="background: #F8FAFC; border-radius: 8px; padding: 30px; margin-bottom: 30px;">
        <h2 style="color: #1E293B; margin-top: 0;">Reset Your Password</h2>
        <p style="color: #475569; line-height: 1.6;">
          We received a request to reset your password for your Plato account. 
          Click the button below to create a new password.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" 
             style="background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%); 
                    color: white; 
                    text-decoration: none; 
                    padding: 15px 30px; 
                    border-radius: 8px; 
                    font-weight: 600; 
                    display: inline-block;">
            Reset Password
          </a>
        </div>
        
        <p style="color: #6B7280; font-size: 14px; margin-bottom: 0;">
          This reset link will expire in 1 hour. If you didn't request a password reset, 
          you can safely ignore this email.
        </p>
      </div>
      
      <div style="border-top: 1px solid #E2E8F0; padding-top: 20px; text-align: center;">
        <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
          © 2025 Plato Hiring Platform. All rights reserved.
        </p>
      </div>
    </div>
  `;

  return await sendEmail({
    to: email,
    from: 'noreply@platohiring.com',
    subject: 'Reset Your Password - Plato',
    text: `Reset your password by visiting: ${resetLink}`,
    html: htmlContent,
  });
}