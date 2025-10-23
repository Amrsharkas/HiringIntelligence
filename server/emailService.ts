import { MailService } from '@sendgrid/mail';
import { getAppBaseUrl } from '../server/auth';

interface InterviewEmailData {
  applicantName: string;
  applicantEmail: string;
  interviewDate: string;
  interviewTime: string;
  jobTitle: string;
  companyName: string;
  interviewType: string;
  meetingLink?: string;
  timeZone: string;
  notes?: string;
}

interface VerificationEmailData {
  email: string;
  firstName: string;
  verificationLink: string;
}

interface VerificationSuccessEmailData {
  email: string;
  firstName: string;
}

class EmailService {
  private mailService: MailService | null;

  constructor() {
    // Use the environment variable for SendGrid API key
    const apiKey = (process.env.SENDGRID_API_KEY || '').trim();
    if (!apiKey) {
      this.mailService = null;
      console.warn('📧 SendGrid disabled: missing SENDGRID_API_KEY. Emails will be skipped.');
      return;
    }

    this.mailService = new MailService();
    this.mailService.setApiKey(apiKey);
    console.log('📧 EmailService initialized with SendGrid');
  }

  async sendInterviewScheduledEmail(data: InterviewEmailData): Promise<boolean> {
    try {
      if (!this.mailService) {
        console.warn('📧 Skipping interview email: SendGrid not configured');
        return false;
      }
      const emailHTML = this.generateInterviewEmailHTML(data);
      const emailText = this.generateInterviewEmailText(data);

      const fromEmail = (process.env.SENDGRID_FROM || 'noreply@platohiring.com').trim();
      const fromName = (process.env.SENDGRID_FROM_NAME || 'Plato Hiring').trim();
      await this.mailService.send({
        to: data.applicantEmail,
        from: { email: fromEmail, name: fromName }, // Verified sender email with display name
        subject: `🎯 Interview Scheduled: ${data.applicantName} - ${data.jobTitle} at ${data.companyName}`,
        text: emailText,
        html: emailHTML,
      });

      console.log(`✅ Interview email sent successfully to ${data.applicantEmail}`);
      return true;
    } catch (error) {
      console.error('❌ SendGrid email error:', error);
      return false;
    }
  }

  private generateInterviewEmailHTML(data: InterviewEmailData): string {
    const meetingLinkSection = data.meetingLink ? `
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 24px; border-radius: 12px; margin: 24px 0; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <h3 style="color: white; margin: 0 0 16px 0; font-size: 20px;">🔗 Join Your Interview</h3>
        <p style="color: #d1fae5; margin: 0 0 16px 0; font-size: 16px;">Click below to join the meeting for ${data.applicantName}</p>
        <a href="${this.formatMeetingLink(data.meetingLink)}" 
           style="background: white; color: #059669; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 18px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: all 0.3s ease;">
          🚀 JOIN INTERVIEW NOW
        </a>
        <div style="margin-top: 16px; padding: 12px; background: rgba(255,255,255,0.2); border-radius: 6px;">
          <p style="color: #d1fae5; margin: 0; font-size: 14px; word-break: break-all;">Meeting Link: ${data.meetingLink}</p>
        </div>
      </div>
    ` : '';

    const notesSection = data.notes ? `
      <div style="margin: 20px 0;">
        <h3 style="color: #374151; margin: 0 0 8px 0;">Additional Notes</h3>
        <p style="color: #6b7280; line-height: 1.6;">${data.notes}</p>
      </div>
    ` : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Interview Scheduled</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">
        
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: #2563eb; margin: 0; font-size: 28px;">Interview Scheduled</h1>
          <p style="color: #6b7280; margin: 8px 0 0 0; font-size: 16px;">We're excited to meet with you!</p>
        </div>

        <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 32px; margin-bottom: 24px;">
          
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="background-color: #2563eb; width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
              <span style="color: white; font-size: 24px;">📅</span>
            </div>
            <h2 style="color: #1f2937; margin: 0; font-size: 24px;">Interview Details</h2>
          </div>

          <div style="text-align: center; margin-bottom: 32px; padding: 20px; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 12px; border: 2px solid #2563eb;">
            <h3 style="color: #1e40af; margin: 0 0 12px 0; font-size: 24px;">👋 Hello ${data.applicantName}!</h3>
            <p style="color: #1f2937; margin: 0; line-height: 1.6; font-size: 18px;">
              We're excited to invite you for an interview for the <strong style="color: #2563eb;">${data.jobTitle}</strong> position at <strong style="color: #2563eb;">${data.companyName}</strong>.
            </p>
          </div>

          <div style="display: grid; gap: 16px; margin: 24px 0;">
            
            <div style="display: flex; align-items: center; padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
              <span style="margin-right: 12px; font-size: 18px;">📅</span>
              <div>
                <strong style="color: #374151;">Date:</strong>
                <span style="color: #6b7280; margin-left: 8px;">${data.interviewDate}</span>
              </div>
            </div>

            <div style="display: flex; align-items: center; padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
              <span style="margin-right: 12px; font-size: 18px;">🕐</span>
              <div>
                <strong style="color: #374151;">Time:</strong>
                <span style="color: #6b7280; margin-left: 8px;">${data.interviewTime} ${data.timeZone}</span>
              </div>
            </div>

            <div style="display: flex; align-items: center; padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
              <span style="margin-right: 12px; font-size: 18px;">${this.getInterviewTypeIcon(data.interviewType)}</span>
              <div>
                <strong style="color: #374151;">Type:</strong>
                <span style="color: #6b7280; margin-left: 8px; text-transform: capitalize;">${data.interviewType}</span>
              </div>
            </div>

            <div style="display: flex; align-items: center; padding: 12px 0;">
              <span style="margin-right: 12px; font-size: 18px;">🏢</span>
              <div>
                <strong style="color: #374151;">Company:</strong>
                <span style="color: #6b7280; margin-left: 8px;">${data.companyName}</span>
              </div>
            </div>

          </div>

          ${meetingLinkSection}
          ${notesSection}

          <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #f3f4f6;">
            <p style="color: #6b7280; margin: 0; font-size: 14px; line-height: 1.6;">
              Please reply to this email if you need to reschedule or have any questions. We look forward to speaking with you!
            </p>
          </div>

        </div>

        <div style="text-align: center; color: #9ca3af; font-size: 14px;">
          <p style="margin: 0;">Best regards,<br>The ${data.companyName} Hiring Team</p>
        </div>

      </body>
      </html>
    `;
  }

  private generateInterviewEmailText(data: InterviewEmailData): string {
    const meetingLinkText = data.meetingLink ? `
🔗 INTERVIEW MEETING LINK FOR ${data.applicantName.toUpperCase()}:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${data.meetingLink}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 CLICK THE LINK ABOVE TO JOIN YOUR INTERVIEW

` : '';

    const notesText = data.notes ? `
📝 IMPORTANT NOTES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${data.notes}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

` : '';

    return `
🎯 INTERVIEW SCHEDULED: ${data.jobTitle} at ${data.companyName}

👋 Hello ${data.applicantName.toUpperCase()}!

We're excited to invite you for an interview for the ${data.jobTitle} position at ${data.companyName}.

📅 INTERVIEW DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 Date: ${data.interviewDate}
⏰ Time: ${data.interviewTime} (${data.timeZone})
💼 Role: ${data.jobTitle}
🏢 Company: ${data.companyName}
📹 Type: ${data.interviewType}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${meetingLinkText}${notesText}

Please confirm your attendance by replying to this email.
If you need to reschedule or have questions, don't hesitate to contact us.

We're excited to meet you, ${data.applicantName}!

Best regards,
${data.companyName} Hiring Team
    `.trim();
  }

  private formatMeetingLink(link: string): string {
    if (link.startsWith('http://') || link.startsWith('https://')) {
      return link;
    }
    return `https://${link}`;
  }

  private getInterviewTypeIcon(type: string): string {
    switch (type) {
      case 'video':
        return '📹';
      case 'phone':
        return '📞';
      case 'in-person':
        return '🏢';
      default:
        return '💼';
    }
  }

  private getExpirationDateTime(): string {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 2);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    };
    return expirationDate.toLocaleDateString('en-US', options);
  }

  async sendInterviewInvitationEmail(params: {
    applicantName: string;
    applicantEmail: string;
    jobTitle: string;
    companyName: string;
    invitationLink: string;
    matchScore?: number;
    matchSummary?: string;
  }): Promise<boolean> {
    try {
      if (!this.mailService) {
        console.warn('📧 Skipping invitation email: SendGrid not configured');
        return false;
      }
      const subject = `Your Application with ${params.companyName} – Next Steps`;

      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 640px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #111827;">Dear ${params.applicantName},</h2>
          <p>Thank you for applying to ${params.companyName}. After reviewing your resume, we are pleased to inform you that you have been identified as a strong potential candidate for the <strong>${params.jobTitle}</strong> position.</p>
          <p>As the next step in our hiring process, we invite you to complete a short AI-powered interview through our platform. This will allow us to get to know you better and assess your fit for the role.</p>
          <p>Please use the link below to complete your interview:</p>
          <div style="margin: 24px 0; text-align: center;">
            <a href="${params.invitationLink}" style="background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">Start Your Interview</a>
          </div>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #2563eb;">${params.invitationLink}</p>
          <div style="margin-top: 24px; padding: 16px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
            <p style="color: #92400e; margin: 0; font-weight: 600;">Important:</p>
            <p style="color: #92400e; margin: 8px 0 0 0;">The link will expire ${this.getExpirationDateTime()} by 11:59 pm.</p>
          </div>
          <p>We look forward to learning more about you.</p>
          <p>Best regards,<br>The Plato Team<br><em>(On behalf of ${params.companyName})</em></p>
        </div>`;

      const fromEmail = (process.env.SENDGRID_FROM || 'noreply@platohiring.com').trim();
      const fromName = (process.env.SENDGRID_FROM_NAME || 'Plato Hiring').trim();
      await this.mailService.send({
        to: process.env.TO_EMAIL || params.applicantEmail || 'adam.1.elshanawany@gmail.com',
        from: { email: fromEmail, name: fromName },
        subject,
        text: `Dear ${params.applicantName},

Thank you for applying to ${params.companyName}. After reviewing your resume, we are pleased to inform you that you have been identified as a strong potential candidate for the ${params.jobTitle} position.

As the next step in our hiring process, we invite you to complete a short AI-powered interview through our platform. This will allow us to get to know you better and assess your fit for the role.

Please use the link below to complete your interview:

${params.invitationLink}

IMPORTANT: The link will expire ${this.getExpirationDateTime()} by 11:59 pm.

We look forward to learning more about you.

Best regards,
The Plato Team
(On behalf of ${params.companyName})`,
        html,
      });
      console.log(`✅ Invitation email sent to ${params.applicantEmail}`);
      return true;
    } catch (error) {
      console.error('❌ SendGrid invitation email error:', error);
      return false;
    }
  }

  async sendTeamInvitationEmail(params: {
    email: string;
    organizationName: string;
    invitedByName: string;
    role: string;
    message: string;
    registrationLink: string;
    inviteCode: string;
  }): Promise<boolean> {
    try {
      if (!this.mailService) {
        console.warn('📧 Skipping team invitation email: SendGrid not configured');
        return false;
      }

      const subject = `You're invited to join ${params.organizationName} on Plato Hiring`;

      const html = this.generateTeamInvitationHTML(params);
      const text = this.generateTeamInvitationText(params);

      const fromEmail = (process.env.SENDGRID_FROM || 'noreply@platohiring.com').trim();
      const fromName = (process.env.SENDGRID_FROM_NAME || 'Plato Hiring').trim();

      await this.mailService.send({
        to: params.email,
        from: { email: fromEmail, name: fromName },
        subject,
        text,
        html,
      });

      console.log(`✅ Team invitation email sent to ${params.email}`);
      return true;
    } catch (error) {
      console.error('❌ SendGrid team invitation email error:', error);
      return false;
    }
  }

  private generateTeamInvitationHTML(params: {
    email: string;
    organizationName: string;
    invitedByName: string;
    role: string;
    message: string;
    registrationLink: string;
    inviteCode: string;
  }): string {
    const messageSection = params.message ? `
      <div style="margin: 24px 0; padding: 20px; background-color: #f8fafc; border-radius: 8px; border-left: 4px solid #3b82f6;">
        <h3 style="color: #1e40af; margin: 0 0 12px 0;">Personal Message</h3>
        <p style="color: #374151; margin: 0; line-height: 1.6; font-style: italic;">"${params.message}"</p>
      </div>
    ` : '';

    const roleDescription = {
      admin: 'full administrative access including managing team members, jobs, and settings',
      member: 'access to create and manage jobs, view candidates, and participate in hiring',
      viewer: 'read-only access to view jobs, candidates, and hiring analytics'
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Team Invitation</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">

        <div style="text-align: center; margin-bottom: 40px;">
          <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
            <span style="color: white; font-size: 32px;">👥</span>
          </div>
          <h1 style="color: #1f2937; margin: 0; font-size: 28px;">You're Invited!</h1>
          <p style="color: #6b7280; margin: 8px 0 0 0; font-size: 16px;">Join the team at ${params.organizationName}</p>
        </div>

        <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 32px; margin-bottom: 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">

          <div style="text-align: center; margin-bottom: 32px;">
            <h2 style="color: #1f2937; margin: 0; font-size: 24px;">Welcome to ${params.organizationName}!</h2>
            <p style="color: #6b7280; margin: 8px 0 0 0;">
              ${params.invitedByName} has invited you to join as a <strong style="color: #3b82f6; text-transform: capitalize;">${params.role}</strong>
            </p>
          </div>

          <div style="margin: 24px 0; padding: 20px; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 8px; border: 2px solid #3b82f6;">
            <h3 style="color: #1e40af; margin: 0 0 12px 0;">What you'll have access to:</h3>
            <p style="color: #374151; margin: 0; line-height: 1.6;">
              ${roleDescription[params.role as keyof typeof roleDescription] || 'access to team collaboration tools'}
            </p>
          </div>

          ${messageSection}

          <div style="text-align: center; margin: 32px 0;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; border-radius: 12px; margin-bottom: 24px;">
              <h3 style="color: white; margin: 0 0 16px 0; font-size: 20px;">🚀 Join Your Team</h3>
              <p style="color: #d1fae5; margin: 0 0 24px 0; font-size: 16px;">Click below to accept the invitation and join ${params.organizationName}</p>
              <a href="${params.registrationLink}"
                 style="background: white; color: #059669; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 18px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: all 0.3s ease;">
                Accept Invitation
              </a>
            </div>

            <div style="background-color: #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
              <p style="color: #92400e; margin: 0; font-weight: 600; margin-bottom: 8px;">Invite Code: <span style="font-family: 'Courier New', monospace; font-size: 18px; background: #fff; padding: 4px 8px; border-radius: 4px; border: 1px solid #d97706;">${params.inviteCode}</span></p>
              <p style="color: #92400e; margin: 0; font-size: 14px;">You can also join using this code on the registration page</p>
            </div>

            <p style="color: #6b7280; margin: 0; font-size: 14px;">
              If the button doesn't work, copy and paste this link into your browser:
            </p>
            <p style="word-break: break-all; color: #3b82f6; font-size: 12px; margin: 8px 0 0 0;">
              ${params.registrationLink}
            </p>
          </div>

          <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #f3f4f6;">
            <p style="color: #6b7280; margin: 0; font-size: 14px; line-height: 1.6;">
              <strong>Important:</strong> This invitation will expire in 7 days. If you need assistance or have questions, please contact ${params.invitedByName} or our support team.
            </p>
          </div>

        </div>

        <div style="text-align: center; color: #9ca3af; font-size: 14px; margin-top: 24px;">
          <p style="margin: 0;">
            Best regards,<br>
            The ${params.organizationName} Team<br>
            <em>Invited by ${params.invitedByName}</em>
          </p>
        </div>

      </body>
      </html>
    `;
  }

  private generateTeamInvitationText(params: {
    email: string;
    organizationName: string;
    invitedByName: string;
    role: string;
    message: string;
    registrationLink: string;
    inviteCode: string;
  }): string {
    const messageSection = params.message ? `

📝 PERSONAL MESSAGE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"${params.message}"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    ` : '';

    return `
👥 YOU'RE INVITED TO JOIN ${params.organizationName.toUpperCase()}!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${params.invitedByName} has invited you to join the team as a ${params.role.toUpperCase()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Welcome to ${params.organizationName}! We're excited to have you join our hiring team.

${messageSection}

🚀 JOIN YOUR TEAM:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Click here to accept: ${params.registrationLink}

Invite Code: ${params.inviteCode}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

IMPORTANT: This invitation will expire in 7 days.

If you have any questions or need assistance, please contact ${params.invitedByName}.

We look forward to having you on the team!

Best regards,
${params.organizationName} Team
Invited by ${params.invitedByName}
    `.trim();
  }

  async sendVerificationEmail(data: VerificationEmailData): Promise<boolean> {
    try {
      if (!this.mailService) {
        console.warn('📧 Skipping verification email: SendGrid not configured');
        return false;
      }

      const subject = 'Verify Your Email Address - Plato Hiring';
      const html = this.generateVerificationEmailHTML(data);
      const text = this.generateVerificationEmailText(data);

      const fromEmail = (process.env.SENDGRID_FROM || 'noreply@platohiring.com').trim();
      const fromName = (process.env.SENDGRID_FROM_NAME || 'Plato Hiring').trim();

      await this.mailService.send({
        to: data.email,
        from: { email: fromEmail, name: fromName },
        subject,
        text,
        html,
      });

      console.log(`✅ Verification email sent successfully to ${data.email}`);
      return true;
    } catch (error) {
      console.error('❌ SendGrid verification email error:', error);
      return false;
    }
  }

  async sendVerificationSuccessEmail(data: VerificationSuccessEmailData): Promise<boolean> {
    try {
      if (!this.mailService) {
        console.warn('📧 Skipping verification success email: SendGrid not configured');
        return false;
      }

      const subject = 'Email Verified Successfully - Welcome to Plato Hiring!';
      const html = this.generateVerificationSuccessEmailHTML(data);
      const text = this.generateVerificationSuccessEmailText(data);

      const fromEmail = (process.env.SENDGRID_FROM || 'noreply@platohiring.com').trim();
      const fromName = (process.env.SENDGRID_FROM_NAME || 'Plato Hiring').trim();

      await this.mailService.send({
        to: data.email,
        from: { email: fromEmail, name: fromName },
        subject,
        text,
        html,
      });

      console.log(`✅ Verification success email sent to ${data.email}`);
      return true;
    } catch (error) {
      console.error('❌ SendGrid verification success email error:', error);
      return false;
    }
  }

  private generateVerificationEmailHTML(data: VerificationEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email Address</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">

        <div style="text-align: center; margin-bottom: 40px;">
          <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
            <span style="color: white; font-size: 32px;">✉️</span>
          </div>
          <h1 style="color: #1f2937; margin: 0; font-size: 28px;">Verify Your Email</h1>
          <p style="color: #6b7280; margin: 8px 0 0 0; font-size: 16px;">Welcome to Plato Hiring!</p>
        </div>

        <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 32px; margin-bottom: 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">

          <div style="text-align: center; margin-bottom: 32px;">
            <h2 style="color: #1f2937; margin: 0; font-size: 24px;">Hi ${data.firstName}!</h2>
            <p style="color: #6b7280; margin: 8px 0 0 0;">Thanks for signing up for Plato Hiring.</p>
          </div>

          <div style="margin: 24px 0; padding: 20px; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 12px; border: 2px solid #3b82f6;">
            <h3 style="color: #1e40af; margin: 0 0 12px 0;">Please verify your email address</h3>
            <p style="color: #374151; margin: 0; line-height: 1.6;">
              To complete your registration and access all features of Plato Hiring, please verify your email address by clicking the button below.
            </p>
          </div>

          <div style="text-align: center; margin: 32px 0;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; border-radius: 12px; margin-bottom: 24px;">
              <h3 style="color: white; margin: 0 0 16px 0; font-size: 20px;">🚀 Verify Your Email</h3>
              <p style="color: #d1fae5; margin: 0 0 24px 0; font-size: 16px;">Click below to verify your email and activate your account</p>
              <a href="${data.verificationLink}"
                 style="background: white; color: #059669; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 18px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: all 0.3s ease;">
                Verify Email Address
              </a>
            </div>

            <div style="background-color: #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
              <p style="color: #92400e; margin: 0; font-weight: 600;">Important:</p>
              <p style="color: #92400e; margin: 8px 0 0 0; font-size: 14px;">This verification link will expire in 1 week for security reasons.</p>
            </div>

            <p style="color: #6b7280; margin: 0; font-size: 14px;">
              If the button doesn't work, copy and paste this link into your browser:
            </p>
            <p style="word-break: break-all; color: #3b82f6; font-size: 12px; margin: 8px 0 0 0;">
              ${data.verificationLink}
            </p>
          </div>

          <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #f3f4f6;">
            <p style="color: #6b7280; margin: 0; font-size: 14px; line-height: 1.6;">
              If you didn't create an account with Plato Hiring, you can safely ignore this email.
              The verification link will expire automatically.
            </p>
          </div>

        </div>

        <div style="text-align: center; color: #9ca3af; font-size: 14px; margin-top: 24px;">
          <p style="margin: 0;">
            Best regards,<br>
            The Plato Hiring Team
          </p>
        </div>

      </body>
      </html>
    `;
  }

  private generateVerificationEmailText(data: VerificationEmailData): string {
    return `
✉️ VERIFY YOUR EMAIL ADDRESS - PLATO HIRING

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Hi ${data.firstName}!

Welcome to Plato Hiring! Thanks for signing up for our platform.

VERIFY YOUR EMAIL:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
To complete your registration and access all features, please verify your email address by clicking the link below:

${data.verificationLink}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 CLICK THE LINK ABOVE TO VERIFY YOUR EMAIL

IMPORTANT: This verification link will expire in 1 week for security reasons.

If you didn't create an account with Plato Hiring, you can safely ignore this email. The verification link will expire automatically.

We're excited to have you join our platform!

Best regards,
The Plato Hiring Team
    `.trim();
  }

  private generateVerificationSuccessEmailHTML(data: VerificationSuccessEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verified Successfully</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">

        <div style="text-align: center; margin-bottom: 40px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
            <span style="color: white; font-size: 32px;">✅</span>
          </div>
          <h1 style="color: #1f2937; margin: 0; font-size: 28px;">Email Verified!</h1>
          <p style="color: #6b7280; margin: 8px 0 0 0; font-size: 16px;">Welcome to Plato Hiring</p>
        </div>

        <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 32px; margin-bottom: 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">

          <div style="text-align: center; margin-bottom: 32px;">
            <h2 style="color: #1f2937; margin: 0; font-size: 24px;">Congratulations ${data.firstName}!</h2>
            <p style="color: #6b7280; margin: 8px 0 0 0;">Your email address has been successfully verified.</p>
          </div>

          <div style="margin: 24px 0; padding: 20px; background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 12px; border: 2px solid #10b981;">
            <h3 style="color: #065f46; margin: 0 0 12px 0;">🎉 What's Next?</h3>
            <p style="color: #374151; margin: 0; line-height: 1.6;">
              Your account is now active and ready to use! You can log in to Plato Hiring and start using all our features to streamline your hiring process.
            </p>
          </div>

          <div style="text-align: center; margin: 32px 0;">
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 24px; border-radius: 12px;">
              <h3 style="color: white; margin: 0 0 16px 0; font-size: 20px;">🚀 Get Started Now</h3>
              <a href="${getAppBaseUrl()}/signin"
                 style="background: white; color: #3b82f6; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                Login to Your Account
              </a>
            </div>
          </div>

          <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #f3f4f6;">
            <h3 style="color: #374151; margin: 0 0 12px 0;">With Plato Hiring, you can:</h3>
            <ul style="color: #6b7280; margin: 0; padding-left: 20px; line-height: 1.8;">
              <li>Post job opportunities and manage applications</li>
              <li>AI-powered resume screening and matching</li>
              <li>Schedule interviews and communicate with candidates</li>
              <li>Collaborate with your hiring team</li>
              <li>Track candidates through the entire hiring pipeline</li>
            </ul>
          </div>

        </div>

        <div style="text-align: center; color: #9ca3af; font-size: 14px; margin-top: 24px;">
          <p style="margin: 0;">
            Best regards,<br>
            The Plato Hiring Team
          </p>
        </div>

      </body>
      </html>
    `;
  }

  private generateVerificationSuccessEmailText(data: VerificationSuccessEmailData): string {
    return `
✅ EMAIL VERIFIED SUCCESSFULLY - PLATO HIRING

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Congratulations ${data.firstName}!

Your email address has been successfully verified and your account is now active.

🎉 WELCOME TO PLATO HIRING!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
You can now log in and start using all our features:

• Post job opportunities and manage applications
• AI-powered resume screening and matching
• Schedule interviews and communicate with candidates
• Collaborate with your hiring team
• Track candidates through the entire hiring pipeline

GET STARTED:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Login to your account now: ${getAppBaseUrl()}/signin

We're excited to help you streamline your hiring process!

Best regards,
The Plato Hiring Team
    `.trim();
  }
}

export const emailService = new EmailService();
export { InterviewEmailData, VerificationEmailData, VerificationSuccessEmailData };