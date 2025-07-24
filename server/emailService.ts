import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

interface InvitationEmailParams {
  to: string;
  organizationName: string;
  inviterName: string;
  invitationToken: string;
}

export async function sendInvitationEmail({
  to,
  organizationName,
  inviterName,
  invitationToken,
}: InvitationEmailParams): Promise<boolean> {
  try {
    console.log(`📧 Starting email send process...`);
    console.log(`📧 To: ${to}`);
    console.log(`📧 Organization: ${organizationName}`);
    console.log(`📧 Inviter: ${inviterName}`);
    console.log(`📧 Token: ${invitationToken.substring(0, 8)}...`);
    
    const baseUrl = process.env.REPLIT_DEV_DOMAIN ? 
      `https://${process.env.REPLIT_DEV_DOMAIN}` : 
      'https://aaf75c66-e50d-4a18-aa02-4d25b1fb4a8e-00-2n2g8qamvw3by.pike.replit.dev';
    const acceptUrl = `${baseUrl}/invite/accept?token=${invitationToken}`;
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Team Invitation - ${organizationName}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; border-radius: 0 0 8px 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 You're Invited to Join ${organizationName}</h1>
            </div>
            <div class="content">
              <p>Hi there!</p>
              
              <p><strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> on our hiring platform.</p>
              
              <p>As a team member, you'll be able to:</p>
              <ul>
                <li>📝 Create and manage job postings</li>
                <li>👥 Review and interview candidates</li>
                <li>📊 Access team analytics and insights</li>
                <li>🤝 Collaborate with other team members</li>
              </ul>
              
              <p>Click the button below to accept your invitation and get started:</p>
              
              <div style="text-align: center;">
                <a href="${acceptUrl}" class="button">Accept Invitation</a>
              </div>
              
              <p><em>This invitation will expire in 7 days.</em></p>
              
              <p>If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #667eea;">${acceptUrl}</p>
            </div>
            <div class="footer">
              <p>This invitation was sent by ${organizationName} through our hiring platform.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailText = `
You're invited to join ${organizationName}!

${inviterName} has invited you to join ${organizationName} on our hiring platform.

As a team member, you'll be able to:
• Create and manage job postings
• Review and interview candidates  
• Access team analytics and insights
• Collaborate with other team members

Accept your invitation: ${acceptUrl}

This invitation will expire in 7 days.

This invitation was sent by ${organizationName} through our hiring platform.
    `;

    console.log(`📧 Sending email via SendGrid...`);
    const emailData = {
      to,
      from: {
        email: 'raef@platohiring.com', // Plato Hiring official sender email
        name: `${organizationName} Team`
      },
      subject: `Invitation to join ${organizationName} team`,
      text: emailText,
      html: emailHtml,
    };
    
    console.log(`📧 Email data:`, {
      to: emailData.to,
      from: emailData.from,
      subject: emailData.subject
    });
    
    const result = await mailService.send(emailData);
    console.log(`📧 SendGrid response:`, result);
    console.log(`✅ Email sent successfully via SendGrid`);

    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    if (error && typeof error === 'object' && 'response' in error) {
      console.error('SendGrid response details:', (error as any).response?.body);
    }
    return false;
  }
}