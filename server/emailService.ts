import { MailService } from '@sendgrid/mail';

const SENDGRID_API_KEY = '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';

const mailService = new MailService();
mailService.setApiKey(SENDGRID_API_KEY);

interface InvitationEmailParams {
  to: string;
  organizationName: string;
  inviterName: string;
  invitationToken: string;
  organizationId: number;
  role: string;
}

export async function sendInvitationEmail({
  to,
  organizationName,
  inviterName,
  invitationToken,
  organizationId,
  role,
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
    
    // Enhanced invitation URL with team identifiers for automatic access granting
    const acceptUrl = `${baseUrl}/invite/accept?token=${invitationToken}&org=${organizationId}&role=${role}`;
    
    // Alternative direct signup/signin URLs with embedded team identifiers
    const signupUrl = `${baseUrl}/auth/signup?invite=${invitationToken}&org=${organizationId}&role=${role}`;
    const signinUrl = `${baseUrl}/auth/signin?invite=${invitationToken}&org=${organizationId}&role=${role}`;
    
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
              
              <p>As a <strong>${role}</strong>, you'll be able to:</p>
              <ul>
                <li>📝 Create and manage job postings</li>
                <li>👥 Review and interview candidates</li>
                <li>📊 Access team analytics and insights</li>
                <li>🤝 Collaborate with other team members</li>
              </ul>
              
              <p>Click the button below to accept your invitation and get started:</p>
              
              <div style="text-align: center;">
                <a href="${acceptUrl}" class="button">Accept Invitation & Join Team</a>
              </div>
              
              <div style="margin: 20px 0; text-align: center;">
                <p style="margin: 10px 0; color: #666;">Already have an account?</p>
                <a href="${signinUrl}" style="color: #667eea; text-decoration: none;">Sign in to join this team</a>
              </div>
              
              <div style="margin: 20px 0; text-align: center;">
                <p style="margin: 10px 0; color: #666;">Need to create an account?</p>
                <a href="${signupUrl}" style="color: #667eea; text-decoration: none;">Sign up and automatically join this team</a>
              </div>
              
              <p><em>This invitation will expire in 7 days.</em></p>
              
              <p>If none of the buttons work, copy and paste this link into your browser:</p>
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

// New invite code email function for simpler team invitations
export async function sendInviteCodeEmail(
  email: string, 
  organizationName: string, 
  inviteCode: string, 
  role: string
): Promise<boolean> {
  try {
    console.log(`📧 Sending invite code email to: ${email} for ${organizationName}`);
    
    const baseUrl = process.env.REPLIT_DEV_DOMAIN ? 
      `https://${process.env.REPLIT_DEV_DOMAIN}` : 
      'https://aaf75c66-e50d-4a18-aa02-4d25b1fb4a8e-00-2n2g8qamvw3by.pike.replit.dev';
    
    const msg = {
      to: email,
      from: 'raef@platohiring.com',
      subject: `Join ${organizationName}'s hiring team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">You're Invited!</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Join ${organizationName}'s hiring team</p>
          </div>

          <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
            <h2 style="color: #333; margin: 0 0 15px 0; font-size: 20px;">Welcome to the Team!</h2>
            <p style="color: #666; margin: 0 0 20px 0; line-height: 1.6;">
              You've been invited to join <strong>${organizationName}</strong> as a <strong>${role}</strong> on their hiring platform.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 6px; border-left: 4px solid #667eea; margin-bottom: 20px;">
              <h3 style="color: #333; margin: 0 0 10px 0; font-size: 16px;">Your Invite Code:</h3>
              <div style="font-family: monospace; font-size: 24px; font-weight: bold; color: #667eea; letter-spacing: 2px;">${inviteCode}</div>
            </div>
            
            <p style="color: #666; margin: 0; line-height: 1.6;">
              To get started:
              <br>1. Visit our platform
              <br>2. Sign up or sign in
              <br>3. Enter the invite code above to join the team
            </p>
          </div>

          <div style="text-align: center; margin-bottom: 25px;">
            <a href="${baseUrl}/?inviteCode=${inviteCode}" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; margin: 10px;">
              Get Started
            </a>
          </div>

          <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center;">
            <p style="color: #999; font-size: 14px; margin: 0;">
              This invitation will expire in 7 days. If you have any questions, please contact your team administrator.
            </p>
          </div>
        </div>
      `
    };

    const result = await mailService.send(msg);
    console.log(`✅ Invite code email sent successfully to ${email}. Response:`, result[0].statusCode);
    return true;
  } catch (error) {
    console.error('❌ Error sending invite code email:', error);
    
    if (error.response) {
      console.error('📄 Response body:', error.response.body);
    }
    
    return false;
  }
}