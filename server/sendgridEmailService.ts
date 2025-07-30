import sgMail from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  console.warn("SENDGRID_API_KEY not found. Email functionality will not work.");
} else {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

interface EmailOptions {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      console.error("SendGrid API key not configured. Email not sent.");
      return false;
    }

    const msg = {
      to: options.to,
      from: options.from,
      subject: options.subject,
      text: options.text,
      html: options.html,
    };

    await sgMail.send(msg);
    console.log(`✅ Email sent successfully to ${options.to}`);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    if (error.response) {
      console.error("SendGrid error response:", error.response.body);
    }
    return false;
  }
}

// Function for sending team invitations
export async function sendMagicLinkInvitationEmail(
  toEmail: string,
  organizationName: string,
  inviteToken: string,
  inviterName: string,
  baseUrl: string = "https://platohiring.com"
): Promise<boolean> {
  const magicLink = `${baseUrl}/invite/accept?token=${inviteToken}`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">You're Invited!</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Join ${organizationName} on Plato</p>
      </div>
      
      <div style="background: white; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
          ${inviterName} has invited you to join <strong>${organizationName}</strong> on Plato, the AI-powered hiring platform.
        </p>
        
        <p style="font-size: 16px; color: #374151; margin-bottom: 30px;">
          Click the button below to accept the invitation and start collaborating on your team's hiring process.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${magicLink}" 
             style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 14px 0 rgba(59, 130, 246, 0.39);">
            Join the Team
          </a>
        </div>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 30px 0;">
          <p style="font-size: 14px; color: #6b7280; margin: 0; text-align: center;">
            If the button doesn't work, copy and paste this link in your browser:<br>
            <a href="${magicLink}" style="color: #3b82f6; word-break: break-all;">${magicLink}</a>
          </p>
        </div>
        
        <p style="font-size: 14px; color: #9ca3af; margin-top: 30px; text-align: center;">
          This invitation link will expire in 7 days.<br>
          If you have any questions, contact your team administrator or reply to this email.
        </p>
      </div>
    </div>
  `;

  const textContent = `
You're invited to join ${organizationName} on Plato!

${inviterName} has invited you to join their team on Plato, the AI-powered hiring platform.

Click here to accept the invitation: ${magicLink}

This invitation link will expire in 7 days.

If you have any questions, contact your team administrator.

Best regards,
The Plato Team
  `;

  return await sendEmail({
    to: toEmail,
    from: 'support@platohiring.com',
    subject: `You're invited to join ${organizationName} on Plato`,
    text: textContent,
    html: htmlContent,
  });
}