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

interface MagicLinkInvitationEmailParams {
  to: string;
  organizationName: string;
  inviterName: string;
  invitationToken: string;
  organizationId: number;
  role: string;
}

export async function sendMagicLinkInvitationEmail(params: MagicLinkInvitationEmailParams): Promise<boolean> {
  try {
    console.log(`🔗 Sending magic link invitation email to ${params.to}...`);
    
    const magicLink = `https://platohiring.com/invite/accept?token=${params.invitationToken}`;
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Team Invitation - ${params.organizationName}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
            .magic-link { background: #f8f9fa; border: 3px solid #667eea; padding: 25px; margin: 25px 0; text-align: center; border-radius: 12px; }
            .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 15px 0; font-weight: bold; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3); }
            .button:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4); }
            .steps { background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; border-radius: 0 0 8px 8px; }
            .icon { font-size: 48px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="icon">🎉</div>
              <h1>You're Invited to Join ${params.organizationName}</h1>
            </div>
            <div class="content">
              <p>Hi there!</p>
              
              <p><strong>${params.inviterName}</strong> has invited you to join <strong>${params.organizationName}</strong> as a <strong>${params.role}</strong> on our AI-powered hiring platform.</p>
              
              <div class="magic-link">
                <h3 style="color: #667eea; margin: 0 0 15px 0;">✨ One-Click Access</h3>
                <p style="margin: 0 0 20px 0; color: #666;">Click the button below to instantly join the team!</p>
                <a href="${magicLink}" class="button" style="color: white;">
                  🚀 Join ${params.organizationName}
                </a>
              </div>
              
              <div class="steps">
                <h3>What happens next:</h3>
                <ol>
                  <li><strong>Click "Join ${params.organizationName}"</strong> above</li>
                  <li><strong>Sign in or create your account</strong> (if needed)</li>
                  <li><strong>You'll automatically join the team</strong> and access the dashboard</li>
                </ol>
              </div>
              
              <p>🔒 <strong>Secure & Simple:</strong> This invitation link is unique to you and expires in 7 days for security.</p>
              
              <p>Welcome to the future of hiring! 🚀</p>
              
              <p>Best regards,<br>
              <strong>${params.inviterName}</strong><br>
              ${params.organizationName} Team</p>
            </div>
            <div class="footer">
              <p>This invitation was sent to ${params.to}</p>
              <p>If you have any questions, please contact ${params.inviterName} or the ${params.organizationName} team.</p>
              <p style="font-size: 12px; color: #999;">
                If you can't click the button above, copy and paste this link into your browser:<br>
                <a href="${magicLink}" style="color: #667eea; word-break: break-all;">${magicLink}</a>
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const textVersion = `
You're Invited to Join ${params.organizationName}!

Hi there!

${params.inviterName} has invited you to join ${params.organizationName} as a ${params.role} on our AI-powered hiring platform.

🔗 JOIN NOW: ${magicLink}

What happens next:
1. Click the link above
2. Sign in or create your account (if needed)  
3. You'll automatically join the team and access the dashboard

This invitation link is unique to you and expires in 7 days for security.

Welcome to the future of hiring!

Best regards,
${params.inviterName}
${params.organizationName} Team

---
If you have any questions, please contact ${params.inviterName} or the ${params.organizationName} team.
This invitation was sent to ${params.to}
    `;

    const msg = {
      to: params.to,
      from: {
        email: 'raef@platohiring.com', // Verified email address
        name: 'Plato' // Display name shown to recipients
      },
      subject: `🎉 Join ${params.organizationName}'s Hiring Team`,
      text: textVersion,
      html: emailHtml,
    };

    console.log('📤 Sending magic link email via SendGrid...');
    await mailService.send(msg);
    console.log('✅ Magic link invitation email sent successfully!');
    return true;

  } catch (error) {
    console.error('❌ Error sending magic link invitation email:', error);
    return false;
  }
}

export async function sendInviteCodeEmail(
  to: string, 
  organizationName: string, 
  inviteCode: string, 
  role: string,
  organizationId: string
): Promise<boolean> {
  try {
    console.log(`📧 Sending invite code email to ${to} with code: ${inviteCode}...`);
    
    const baseUrl = process.env.REPLIT_DEV_DOMAIN ? 
      `https://${process.env.REPLIT_DEV_DOMAIN}` : 
      'https://aaf75c66-e50d-4a18-aa02-4d25b1fb4a8e-00-2n2g8qamvw3by.pike.replit.dev';
    
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
            .invite-code { background: #f8f9fa; border: 3px solid #667eea; padding: 20px; margin: 20px 0; text-align: center; border-radius: 8px; }
            .invite-code h2 { color: #667eea; margin: 0; font-size: 32px; letter-spacing: 4px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
            .steps { background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px; }
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
              
              <p>You've been invited to join <strong>${organizationName}</strong> as a <strong>${role}</strong> on our hiring platform.</p>
              
              <div class="invite-code">
                <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Your Invite Code:</p>
                <h2>${inviteCode}</h2>
              </div>
              
              <div class="invite-code">
                <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Organization ID:</p>
                <h2 style="font-size: 18px; word-break: break-all;">${organizationId}</h2>
              </div>
              
              <div class="steps">
                <h3>How to Join (4 Easy Steps):</h3>
                <ol>
                  <li><strong>Click "Join the Team"</strong> below to go to our platform</li>
                  <li><strong>Sign up or log in</strong> with your account</li>
                  <li><strong>Enter Organization ID:</strong> <code style="word-break: break-all;">${organizationId}</code></li>
                  <li><strong>Enter your invite code:</strong> <code>${inviteCode}</code></li>
                </ol>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://platohiring.com" class="button">Join the Team</a>
              </div>
              
              <p>As a <strong>${role}</strong>, you'll be able to:</p>
              <ul>
                <li>📝 Create and manage job postings</li>
                <li>👥 Review and interview candidates</li>
                <li>📊 Access team analytics and insights</li>
                <li>🤝 Collaborate with other team members</li>
              </ul>
              
              <p>Welcome to the team!</p>
            </div>
            <div class="footer">
              <p>This invitation will expire in 7 days.</p>
              <p>If you have any questions, please contact your team administrator.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const msg = {
      to,
      from: {
        email: 'raef@platohiring.com', // Verified email address
        name: 'Plato' // Display name shown to recipients
      },
      subject: `You're invited to join ${organizationName}`,
      html: emailHtml,
    };

    console.log(`📧 Attempting to send email via SendGrid...`);
    await mailService.send(msg);
    console.log(`✅ Invite code email sent successfully to ${to}`);
    
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
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