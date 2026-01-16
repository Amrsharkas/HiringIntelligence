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

interface PasswordResetEmailData {
  email: string;
  firstName: string;
  resetLink: string;
}

interface PasswordResetSuccessEmailData {
  email: string;
  firstName: string;
}

interface ApplicantStatusEmailData {
  applicantName: string;
  applicantEmail: string;
  jobTitle: string;
  companyName: string;
  appliedDate?: string;
  skills?: string[];
  experience?: string;
  matchScore?: number;
}

interface OfferLetterEmailData {
  recipientEmail: string;
  recipientName: string;
  companyName: string;
  jobTitle: string;
  offerContentText: string;
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
            <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto 16px; width: 60px; height: 60px; background-color: #2563eb; border-radius: 50%;">
              <tr>
                <td style="text-align: center; vertical-align: middle; font-size: 24px; line-height: 60px;">📅</td>
              </tr>
            </table>
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
      const subject = `Your Application with Orange – Next Steps`;

      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 640px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #111827;">Dear ${params.applicantName},</h2>
          <p>Thank you for applying to Orange. After reviewing your resume, we are pleased to inform you that you have been identified as a strong potential candidate for the <strong>${params.jobTitle}</strong> position.</p>
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
          <p>Best regards,<br>The Plato Team<br><em>(On behalf of Orange)</em></p>
        </div>`;

      const fromEmail = (process.env.SENDGRID_FROM || 'noreply@platohiring.com').trim();
      const fromName = (process.env.SENDGRID_FROM_NAME || 'Plato Hiring').trim();
      await this.mailService.send({
        to: process.env.TO_EMAIL || params.applicantEmail || 'adam.1.elshanawany@gmail.com',
        from: { email: fromEmail, name: fromName },
        subject,
        text: `Dear ${params.applicantName},

Thank you for applying to Orange. After reviewing your resume, we are pleased to inform you that you have been identified as a strong potential candidate for the ${params.jobTitle} position.

As the next step in our hiring process, we invite you to complete a short AI-powered interview through our platform. This will allow us to get to know you better and assess your fit for the role.

Please use the link below to complete your interview:

${params.invitationLink}

IMPORTANT: The link will expire ${this.getExpirationDateTime()} by 11:59 pm.

We look forward to learning more about you.

Best regards,
The Plato Team
(On behalf of Orange)`,
        html,
      });
      console.log(`✅ Invitation email sent to ${params.applicantEmail}`);
      return true;
    } catch (error) {
      console.error('❌ SendGrid invitation email error:', error);
      return false;
    }
  }

  async sendInterviewReminderEmail(params: {
    applicantName: string;
    applicantEmail: string;
    jobTitle: string;
    companyName: string;
    invitationLink: string;
    reminderType: '1h' | '24h';
  }): Promise<boolean> {
    try {
      if (!this.mailService) {
        console.warn('📧 Skipping reminder email: SendGrid not configured');
        return false;
      }

      const urgencyText = params.reminderType === '1h'
        ? 'Your interview invitation expires soon!'
        : 'Don\'t forget to complete your interview!';

      const subject = `Reminder: Complete Your AI Interview for ${params.jobTitle} at Orange`;

      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 640px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #111827;">Dear ${params.applicantName},</h2>
          <div style="margin: 16px 0; padding: 12px 16px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
            <p style="color: #92400e; margin: 0; font-weight: 600;">${urgencyText}</p>
          </div>
          <p>This is a friendly reminder that you have a pending AI interview for the <strong>${params.jobTitle}</strong> position at Orange.</p>
          <p>Please complete your interview using the link below:</p>
          <div style="margin: 24px 0; text-align: center;">
            <a href="${params.invitationLink}" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">Complete Your Interview</a>
          </div>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #2563eb;">${params.invitationLink}</p>
          <p>We look forward to learning more about you.</p>
          <p>Best regards,<br>The Plato Team<br><em>(On behalf of Orange)</em></p>
        </div>`;

      const fromEmail = (process.env.SENDGRID_FROM || 'noreply@platohiring.com').trim();
      const fromName = (process.env.SENDGRID_FROM_NAME || 'Plato Hiring').trim();

      await this.mailService.send({
        to: process.env.TO_EMAIL || params.applicantEmail,
        from: { email: fromEmail, name: fromName },
        subject,
        text: `Dear ${params.applicantName},

${urgencyText}

This is a friendly reminder that you have a pending AI interview for the ${params.jobTitle} position at Orange.

Please complete your interview using the link below:

${params.invitationLink}

We look forward to learning more about you.

Best regards,
The Plato Team
(On behalf of Orange)`,
        html,
      });

      console.log(`✅ Interview reminder email (${params.reminderType}) sent to ${params.applicantEmail}`);
      return true;
    } catch (error) {
      console.error('❌ SendGrid reminder email error:', error);
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

      const subject = `You've been added to ${params.organizationName} on Plato Hiring`;

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
          <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto 20px; width: 80px; height: 80px; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); border-radius: 50%;">
            <tr>
              <td style="text-align: center; vertical-align: middle; font-size: 32px; line-height: 80px;">👥</td>
            </tr>
          </table>
          <h1 style="color: #1f2937; margin: 0; font-size: 28px;">You've Been Added to the Team!</h1>
          <p style="color: #6b7280; margin: 8px 0 0 0; font-size: 16px;">Welcome to ${params.organizationName}</p>
        </div>

        <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 32px; margin-bottom: 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">

          <div style="text-align: center; margin-bottom: 32px;">
            <h2 style="color: #1f2937; margin: 0; font-size: 24px;">Welcome to ${params.organizationName}!</h2>
            <p style="color: #6b7280; margin: 8px 0 0 0;">
              ${params.invitedByName} has added you to the team as a <strong style="color: #3b82f6; text-transform: capitalize;">${params.role}</strong>
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
              <h3 style="color: white; margin: 0 0 16px 0; font-size: 20px;">🚀 Get Started</h3>
              <p style="color: #d1fae5; margin: 0 0 24px 0; font-size: 16px;">Click below to set up your account and join ${params.organizationName}</p>
              <a href="${params.registrationLink}"
                 style="background: white; color: #059669; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 18px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: all 0.3s ease;">
                Set Up Account
              </a>
            </div>

            <div style="background-color: #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
              <p style="color: #92400e; margin: 0; font-weight: 600; margin-bottom: 8px;">Access Code: <span style="font-family: 'Courier New', monospace; font-size: 18px; background: #fff; padding: 4px 8px; border-radius: 4px; border: 1px solid #d97706;">${params.inviteCode}</span></p>
              <p style="color: #92400e; margin: 0; font-size: 14px;">You can also use this code to set up your account on the registration page</p>
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
              <strong>Important:</strong> This link will expire in 7 days. If you need assistance or have questions, please contact ${params.invitedByName} or our support team.
            </p>
          </div>

        </div>

        <div style="text-align: center; color: #9ca3af; font-size: 14px; margin-top: 24px;">
          <p style="margin: 0;">
            Best regards,<br>
            The ${params.organizationName} Team<br>
            <em>Added by ${params.invitedByName}</em>
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
👥 YOU'VE BEEN ADDED TO ${params.organizationName.toUpperCase()}!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${params.invitedByName} has added you to the team as a ${params.role.toUpperCase()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Welcome to ${params.organizationName}! We're excited to have you join our hiring team.

${messageSection}

🚀 GET STARTED:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Click here to set up your account: ${params.registrationLink}

Access Code: ${params.inviteCode}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

IMPORTANT: This link will expire in 7 days.

If you have any questions or need assistance, please contact ${params.invitedByName}.

We look forward to having you on the team!

Best regards,
${params.organizationName} Team
Added by ${params.invitedByName}
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
          <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto 20px; width: 80px; height: 80px; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); border-radius: 50%;">
            <tr>
              <td style="text-align: center; vertical-align: middle; font-size: 32px; line-height: 80px;">✉️</td>
            </tr>
          </table>
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
          <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto 20px; width: 80px; height: 80px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%;">
            <tr>
              <td style="text-align: center; vertical-align: middle; font-size: 32px; line-height: 80px;">✅</td>
            </tr>
          </table>
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

  async sendPasswordResetEmail(data: PasswordResetEmailData): Promise<boolean> {
    try {
      if (!this.mailService) {
        console.warn('📧 Skipping password reset email: SendGrid not configured');
        return false;
      }

      const subject = 'Reset Your Password - Plato Hiring';
      const html = this.generatePasswordResetEmailHTML(data);
      const text = this.generatePasswordResetEmailText(data);

      const fromEmail = (process.env.SENDGRID_FROM || 'noreply@platohiring.com').trim();
      const fromName = (process.env.SENDGRID_FROM_NAME || 'Plato Hiring').trim();

      await this.mailService.send({
        to: data.email,
        from: { email: fromEmail, name: fromName },
        subject,
        text,
        html,
      });

      console.log(`✅ Password reset email sent to ${data.email}`);
      return true;
    } catch (error) {
      console.error('❌ SendGrid password reset email error:', error);
      return false;
    }
  }

  async sendPasswordResetSuccessEmail(data: PasswordResetSuccessEmailData): Promise<boolean> {
    try {
      if (!this.mailService) {
        console.warn('📧 Skipping password reset success email: SendGrid not configured');
        return false;
      }

      const subject = 'Password Reset Successfully - Plato Hiring';
      const html = this.generatePasswordResetSuccessEmailHTML(data);
      const text = this.generatePasswordResetSuccessEmailText(data);

      const fromEmail = (process.env.SENDGRID_FROM || 'noreply@platohiring.com').trim();
      const fromName = (process.env.SENDGRID_FROM_NAME || 'Plato Hiring').trim();

      await this.mailService.send({
        to: data.email,
        from: { email: fromEmail, name: fromName },
        subject,
        text,
        html,
      });

      console.log(`✅ Password reset success email sent to ${data.email}`);
      return true;
    } catch (error) {
      console.error('❌ SendGrid password reset success email error:', error);
      return false;
    }
  }

  private generatePasswordResetEmailHTML(data: PasswordResetEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">

        <div style="text-align: center; margin-bottom: 40px;">
          <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto 20px; width: 80px; height: 80px; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); border-radius: 50%;">
            <tr>
              <td style="text-align: center; vertical-align: middle; font-size: 32px; line-height: 80px;">🔐</td>
            </tr>
          </table>
          <h1 style="color: #1f2937; font-size: 28px; font-weight: 700; margin-bottom: 10px;">Reset Your Password</h1>
          <p style="color: #6b7280; font-size: 16px;">Hi ${data.firstName || 'there'}, we received a request to reset your password</p>
        </div>

        <div style="background: #f9fafb; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
          <h2 style="color: #1f2937; font-size: 20px; font-weight: 600; margin-bottom: 15px;">Password Reset Request</h2>
          <p style="color: #6b7280; margin-bottom: 20px;">
            We received a request to reset the password for your Plato Hiring account. If you made this request, click the button below to reset your password:
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.resetLink}" style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
              Reset Password
            </a>
          </div>

          <p style="color: #6b7280; font-size: 14px; text-align: center;">
            or copy and paste this link into your browser:
          </p>
          <p style="background: #f3f4f6; padding: 10px; border-radius: 6px; word-break: break-all; font-size: 12px; text-align: center; color: #6b7280;">
            ${data.resetLink}
          </p>
        </div>

        <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
          <h3 style="color: #92400e; font-size: 16px; font-weight: 600; margin-bottom: 10px;">⚠️ Security Notice</h3>
          <ul style="color: #92400e; margin: 0; padding-left: 20px; font-size: 14px;">
            <li>This link will expire in 1 hour for security reasons</li>
            <li>If you didn't request this password reset, please ignore this email</li>
            <li>Your password will remain unchanged if you don't click the link</li>
            <li>Never share this link with anyone</li>
          </ul>
        </div>

        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
          <p>If you have any questions or concerns, contact our support team at support@platohiring.com</p>
          <p style="margin-top: 10px;">© 2024 Plato Hiring. All rights reserved.</p>
        </div>

      </body>
      </html>
    `.trim();
  }

  private generatePasswordResetEmailText(data: PasswordResetEmailData): string {
    return `
RESET YOUR PASSWORD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Hi ${data.firstName || 'there'},

We received a request to reset the password for your Plato Hiring account.

RESET LINK:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${data.resetLink}

INSTRUCTIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Click the link above or copy and paste it into your browser
2. Create a new password for your account
3. Use your new password to log in

SECURITY NOTICE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• This link expires in 1 hour for security reasons
• If you didn't request this reset, please ignore this email
• Your password will remain unchanged if you don't use the link
• Never share this link with anyone

If you have any questions, contact us at support@platohiring.com

Best regards,
The Plato Hiring Team
    `.trim();
  }

  private generatePasswordResetSuccessEmailHTML(data: PasswordResetSuccessEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset Successfully</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">

        <div style="text-align: center; margin-bottom: 40px;">
          <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto 20px; width: 80px; height: 80px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%;">
            <tr>
              <td style="text-align: center; vertical-align: middle; font-size: 32px; line-height: 80px;">✅</td>
            </tr>
          </table>
          <h1 style="color: #1f2937; font-size: 28px; font-weight: 700; margin-bottom: 10px;">Password Reset Successfully!</h1>
          <p style="color: #6b7280; font-size: 16px;">Hi ${data.firstName || 'there'}, your password has been reset</p>
        </div>

        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
          <h2 style="color: #166534; font-size: 20px; font-weight: 600; margin-bottom: 15px;">✅ Password Reset Complete</h2>
          <p style="color: #166534; margin-bottom: 20px;">
            Your password for your Plato Hiring account has been successfully reset. You can now use your new password to log in to your account.
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${getAppBaseUrl()}/signin" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
              Log In to Your Account
            </a>
          </div>
        </div>

        <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
          <h3 style="color: #1f2937; font-size: 16px; font-weight: 600; margin-bottom: 10px;">🔐 Security Tips</h3>
          <ul style="color: #6b7280; margin: 0; padding-left: 20px; font-size: 14px;">
            <li>Use a strong, unique password for your account</li>
            <li>Never share your password with anyone</li>
            <li>Enable two-factor authentication if available</li>
            <li>Change your password regularly</li>
          </ul>
        </div>

        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
          <p>If you didn't reset your password, please contact our support team immediately at support@platohiring.com</p>
          <p style="margin-top: 10px;">© 2024 Plato Hiring. All rights reserved.</p>
        </div>

      </body>
      </html>
    `.trim();
  }

  private generatePasswordResetSuccessEmailText(data: PasswordResetSuccessEmailData): string {
    return `
PASSWORD RESET SUCCESSFUL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Hi ${data.firstName || 'there'},

Your password for your Plato Hiring account has been successfully reset!

LOGIN:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
You can now log in to your account with your new password:
${getAppBaseUrl()}/signin

SECURITY TIPS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Use a strong, unique password
• Never share your password with anyone
• Enable two-factor authentication if available
• Change your password regularly

If you didn't reset your password, please contact us immediately at support@platohiring.com

Best regards,
The Plato Hiring Team
    `.trim();
  }

  async sendApplicantAcceptanceEmail(data: ApplicantStatusEmailData): Promise<boolean> {
    try {
      if (!this.mailService) {
        console.warn('📧 Skipping applicant acceptance email: SendGrid not configured');
        return false;
      }
      const emailHTML = this.generateApplicantAcceptanceEmailHTML(data);
      const emailText = this.generateApplicantAcceptanceEmailText(data);

      const fromEmail = (process.env.SENDGRID_FROM || 'noreply@platohiring.com').trim();
      const fromName = (process.env.SENDGRID_FROM_NAME || 'Plato Hiring').trim();
      await this.mailService.send({
        to: data.applicantEmail,
        from: { email: fromEmail, name: fromName },
        subject: `🎉 Congratulations! Your Application for ${data.jobTitle} at ${data.companyName}`,
        text: emailText,
        html: emailHTML,
      });

      console.log(`✅ Applicant acceptance email sent successfully to ${data.applicantEmail}`);
      return true;
    } catch (error) {
      console.error('❌ SendGrid applicant acceptance email error:', error);
      return false;
    }
  }

  async sendApplicantRejectionEmail(data: ApplicantStatusEmailData): Promise<boolean> {
    try {
      if (!this.mailService) {
        console.warn('📧 Skipping applicant rejection email: SendGrid not configured');
        return false;
      }
      const emailHTML = this.generateApplicantRejectionEmailHTML(data);
      const emailText = this.generateApplicantRejectionEmailText(data);

      const fromEmail = (process.env.SENDGRID_FROM || 'noreply@platohiring.com').trim();
      const fromName = (process.env.SENDGRID_FROM_NAME || 'Plato Hiring').trim();
      await this.mailService.send({
        to: data.applicantEmail,
        from: { email: fromEmail, name: fromName },
        subject: `Update on Your Application for ${data.jobTitle} at ${data.companyName}`,
        text: emailText,
        html: emailHTML,
      });

      console.log(`✅ Applicant rejection email sent successfully to ${data.applicantEmail}`);
      return true;
    } catch (error) {
      console.error('❌ SendGrid applicant rejection email error:', error);
      return false;
    }
  }

  async sendApplicantShortlistEmail(data: ApplicantStatusEmailData): Promise<boolean> {
    try {
      if (!this.mailService) {
        console.warn('📧 Skipping applicant shortlist email: SendGrid not configured');
        return false;
      }
      const emailHTML = this.generateApplicantShortlistEmailHTML(data);
      const emailText = this.generateApplicantShortlistEmailText(data);

      const fromEmail = (process.env.SENDGRID_FROM || 'noreply@platohiring.com').trim();
      const fromName = (process.env.SENDGRID_FROM_NAME || 'Plato Hiring').trim();
      await this.mailService.send({
        to: data.applicantEmail,
        from: { email: fromEmail, name: fromName },
        subject: `📋 Great News! You've been Shortlisted for ${data.jobTitle} at ${data.companyName}`,
        text: emailText,
        html: emailHTML,
      });

      console.log(`✅ Applicant shortlist email sent successfully to ${data.applicantEmail}`);
      return true;
    } catch (error) {
      console.error('❌ SendGrid applicant shortlist email error:', error);
      return false;
    }
  }

  private generateApplicantAcceptanceEmailHTML(data: ApplicantStatusEmailData): string {
    const skillsSection = data.skills && data.skills.length > 0 ? `
      <div style="margin: 20px 0;">
        <h4 style="color: #374151; margin: 0 0 8px 0; font-size: 14px;">Your Key Skills That Impressed Us:</h4>
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
          ${data.skills.map(skill => `<span style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); color: #1e40af; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 500;">${skill}</span>`).join('')}
        </div>
      </div>
    ` : '';

    const matchScoreSection = data.matchScore ? `
      <div style="margin: 20px 0; padding: 16px; background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 8px; border: 2px solid #10b981;">
        <h4 style="color: #065f46; margin: 0 0 8px 0; font-size: 14px;">AI Match Score: ${data.matchScore}%</h4>
        <p style="color: #065f46; margin: 0; font-size: 13px;">Our AI analysis found strong alignment between your profile and this role's requirements.</p>
      </div>
    ` : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Application Accepted</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">

        <div style="text-align: center; margin-bottom: 40px;">
          <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto 20px; width: 80px; height: 80px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%;">
            <tr>
              <td style="text-align: center; vertical-align: middle; font-size: 32px; line-height: 80px;">🎉</td>
            </tr>
          </table>
          <h1 style="color: #059669; margin: 0; font-size: 28px;">Congratulations!</h1>
          <p style="color: #6b7280; margin: 8px 0 0 0; font-size: 16px;">Your application has been accepted</p>
        </div>

        <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 32px; margin-bottom: 24px;">

          <div style="text-align: center; margin-bottom: 32px;">
            <h2 style="color: #1f2937; margin: 0; font-size: 24px;">Dear ${data.applicantName},</h2>
            <p style="color: #6b7280; margin: 8px 0 0 0;">
              We are thrilled to offer you the <strong style="color: #059669;">${data.jobTitle}</strong> position at <strong style="color: #059669;">${data.companyName}</strong>!
            </p>
          </div>

          <div style="margin: 24px 0; padding: 20px; background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 12px; border: 2px solid #10b981;">
            <h3 style="color: #065f46; margin: 0 0 12px 0;">🌟 Welcome to the Team!</h3>
            <p style="color: #065f46; margin: 0; line-height: 1.6;">
              After careful review of your application, we were impressed with your qualifications and experience. We believe you'll be a valuable addition to our team and are excited to have you join us.
            </p>
          </div>

          ${skillsSection}
          ${matchScoreSection}

          <div style="display: grid; gap: 16px; margin: 24px 0;">
            <div style="display: flex; align-items: center; padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
              <span style="margin-right: 12px; font-size: 18px;">💼</span>
              <div>
                <strong style="color: #374151;">Position:</strong>
                <span style="color: #6b7280; margin-left: 8px;">${data.jobTitle}</span>
              </div>
            </div>
            <div style="display: flex; align-items: center; padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
              <span style="margin-right: 12px; font-size: 18px;">🏢</span>
              <div>
                <strong style="color: #374151;">Company:</strong>
                <span style="color: #6b7280; margin-left: 8px;">${data.companyName}</span>
              </div>
            </div>
            <div style="display: flex; align-items: center; padding: 12px 0;">
              <span style="margin-right: 12px; font-size: 18px;">📅</span>
              <div>
                <strong style="color: #374151;">Applied:</strong>
                <span style="color: #6b7280; margin-left: 8px;">${data.appliedDate || 'Recently'}</span>
              </div>
            </div>
          </div>

          <div style="text-align: center; margin: 32px 0;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; border-radius: 12px;">
              <h3 style="color: white; margin: 0 0 16px 0; font-size: 20px;">🚀 What's Next?</h3>
              <p style="color: #d1fae5; margin: 0 0 24px 0; font-size: 16px;">
                Our HR team will contact you shortly with the formal offer letter and next steps for onboarding.
              </p>
              <p style="color: #d1fae5; margin: 0; font-size: 14px;">
                Please keep an eye on your email for important follow-up communications.
              </p>
            </div>
          </div>

          <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #f3f4f6;">
            <p style="color: #6b7280; margin: 0; font-size: 14px; line-height: 1.6;">
              If you have any questions or need to discuss anything, please don't hesitate to reach out to us. We're here to support your transition and help you get started.
            </p>
          </div>

        </div>

        <div style="text-align: center; color: #9ca3af; font-size: 14px;">
          <p style="margin: 0;">
            Congratulations again, and welcome aboard!<br>
            The ${data.companyName} Hiring Team
          </p>
        </div>

      </body>
      </html>
    `;
  }

  private generateApplicantAcceptanceEmailText(data: ApplicantStatusEmailData): string {
    return `
🎉 CONGRATULATIONS! YOUR APPLICATION HAS BEEN ACCEPTED

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Dear ${data.applicantName},

We are thrilled to offer you the ${data.jobTitle} position at ${data.companyName}!

After careful review of your application, we were impressed with your qualifications and experience. We believe you'll be a valuable addition to our team and are excited to have you join us.

${data.matchScore ? `🎯 AI Match Score: ${data.matchScore}%
Our AI analysis found strong alignment between your profile and this role's requirements.` : ''}

${data.skills && data.skills.length > 0 ? `🔑 Your Key Skills That Impressed Us:
${data.skills.join(', ')}` : ''}

JOB DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💼 Position: ${data.jobTitle}
🏢 Company: ${data.companyName}
📅 Applied: ${data.appliedDate || 'Recently'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 WHAT'S NEXT?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Our HR team will contact you shortly with the formal offer letter and next steps for onboarding.

Please keep an eye on your email for important follow-up communications.

If you have any questions or need to discuss anything, please don't hesitate to reach out to us.

Congratulations again, and welcome aboard!

${data.companyName} Hiring Team
    `.trim();
  }

  private generateApplicantRejectionEmailHTML(data: ApplicantStatusEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Application Update</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">

        <div style="text-align: center; margin-bottom: 40px;">
          <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto 20px; width: 80px; height: 80px; background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); border-radius: 50%;">
            <tr>
              <td style="text-align: center; vertical-align: middle; font-size: 32px; line-height: 80px;">📧</td>
            </tr>
          </table>
          <h1 style="color: #4b5563; margin: 0; font-size: 28px;">Application Update</h1>
          <p style="color: #6b7280; margin: 8px 0 0 0; font-size: 16px;">Thank you for your interest</p>
        </div>

        <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 32px; margin-bottom: 24px;">

          <div style="text-align: center; margin-bottom: 32px;">
            <h2 style="color: #1f2937; margin: 0; font-size: 24px;">Dear ${data.applicantName},</h2>
            <p style="color: #6b7280; margin: 8px 0 0 0;">
              Thank you for your interest in the <strong style="color: #4b5563;">${data.jobTitle}</strong> position at <strong style="color: #4b5563;">${data.companyName}</strong>.
            </p>
          </div>

          <div style="margin: 24px 0; padding: 20px; background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%); border-radius: 12px; border: 2px solid #d1d5db;">
            <h3 style="color: #4b5563; margin: 0 0 12px 0;">📝 Application Status Update</h3>
            <p style="color: #4b5563; margin: 0; line-height: 1.6;">
              After careful consideration of your application and qualifications, we have decided to move forward with other candidates whose experience more closely aligns with the specific requirements of this role.
            </p>
          </div>

          <div style="margin: 24px 0; padding: 20px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; border: 2px solid #f59e0b;">
            <h3 style="color: #92400e; margin: 0 0 12px 0;">💡 Keep in Touch</h3>
            <p style="color: #92400e; margin: 0; line-height: 1.6;">
              We were impressed with your background and encourage you to apply for future positions that match your skills and experience. We'll keep your resume on file for future opportunities.
            </p>
          </div>

          <div style="display: grid; gap: 16px; margin: 24px 0;">
            <div style="display: flex; align-items: center; padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
              <span style="margin-right: 12px; font-size: 18px;">💼</span>
              <div>
                <strong style="color: #374151;">Position Applied:</strong>
                <span style="color: #6b7280; margin-left: 8px;">${data.jobTitle}</span>
              </div>
            </div>
            <div style="display: flex; align-items: center; padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
              <span style="margin-right: 12px; font-size: 18px;">🏢</span>
              <div>
                <strong style="color: #374151;">Company:</strong>
                <span style="color: #6b7280; margin-left: 8px;">${data.companyName}</span>
              </div>
            </div>
            <div style="display: flex; align-items: center; padding: 12px 0;">
              <span style="margin-right: 12px; font-size: 18px;">📅</span>
              <div>
                <strong style="color: #374151;">Applied:</strong>
                <span style="color: #6b7280; margin-left: 8px;">${data.appliedDate || 'Recently'}</span>
              </div>
            </div>
          </div>

          <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #f3f4f6;">
            <h3 style="color: #374151; margin: 0 0 12px 0;">🌟 Best Wishes for Your Job Search</h3>
            <p style="color: #6b7280; margin: 0; font-size: 14px; line-height: 1.6;">
              We appreciate the time and effort you invested in your application and wish you the very best in your job search. We hope you find a great opportunity that matches your talents and career goals.
            </p>
          </div>

        </div>

        <div style="text-align: center; color: #9ca3af; font-size: 14px;">
          <p style="margin: 0;">
            Best regards,<br>
            The ${data.companyName} Hiring Team
          </p>
        </div>

      </body>
      </html>
    `;
  }

  private generateApplicantRejectionEmailText(data: ApplicantStatusEmailData): string {
    return `
📧 APPLICATION UPDATE

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Dear ${data.applicantName},

Thank you for your interest in the ${data.jobTitle} position at ${data.companyName}.

APPLICATION STATUS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
After careful consideration of your application and qualifications, we have decided to move forward with other candidates whose experience more closely aligns with the specific requirements of this role.

💡 KEEP IN TOUCH:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
We were impressed with your background and encourage you to apply for future positions that match your skills and experience. We'll keep your resume on file for future opportunities.

JOB DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💼 Position Applied: ${data.jobTitle}
🏢 Company: ${data.companyName}
📅 Applied: ${data.appliedDate || 'Recently'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌟 BEST WISHES FOR YOUR JOB SEARCH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
We appreciate the time and effort you invested in your application and wish you the very best in your job search. We hope you find a great opportunity that matches your talents and career goals.

Best regards,
${data.companyName} Hiring Team
    `.trim();
  }

  private generateApplicantShortlistEmailHTML(data: ApplicantStatusEmailData): string {
    const skillsSection = data.skills && data.skills.length > 0 ? `
      <div style="margin: 20px 0;">
        <h4 style="color: #374151; margin: 0 0 8px 0; font-size: 14px;">Your Relevant Skills:</h4>
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
          ${data.skills.map(skill => `<span style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); color: #1e40af; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 500;">${skill}</span>`).join('')}
        </div>
      </div>
    ` : '';

    const matchScoreSection = data.matchScore ? `
      <div style="margin: 20px 0; padding: 16px; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 8px; border: 2px solid #3b82f6;">
        <h4 style="color: #1e40af; margin: 0 0 8px 0; font-size: 14px;">AI Match Score: ${data.matchScore}%</h4>
        <p style="color: #1e40af; margin: 0; font-size: 13px;">Our AI analysis identified strong alignment between your profile and this role.</p>
      </div>
    ` : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>You've Been Shortlisted</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">

        <div style="text-align: center; margin-bottom: 40px;">
          <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto 20px; width: 80px; height: 80px; background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); border-radius: 50%;">
            <tr>
              <td style="text-align: center; vertical-align: middle; font-size: 32px; line-height: 80px;">📋</td>
            </tr>
          </table>
          <h1 style="color: #2563eb; margin: 0; font-size: 28px;">You've Been Shortlisted!</h1>
          <p style="color: #6b7280; margin: 8px 0 0 0; font-size: 16px;">Great news about your application</p>
        </div>

        <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 32px; margin-bottom: 24px;">

          <div style="text-align: center; margin-bottom: 32px;">
            <h2 style="color: #1f2937; margin: 0; font-size: 24px;">Dear ${data.applicantName},</h2>
            <p style="color: #6b7280; margin: 8px 0 0 0;">
              Great news! You've been shortlisted for the <strong style="color: #2563eb;">${data.jobTitle}</strong> position at <strong style="color: #2563eb;">${data.companyName}</strong>!
            </p>
          </div>

          <div style="margin: 24px 0; padding: 20px; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 12px; border: 2px solid #2563eb;">
            <h3 style="color: #1e40af; margin: 0 0 12px 0;">🌟 Congratulations on Making the Shortlist!</h3>
            <p style="color: #1e40af; margin: 0; line-height: 1.6;">
              After reviewing your application, our team was impressed with your qualifications and experience. You've been selected as one of our top candidates and we'd like to move forward with the next steps in the hiring process.
            </p>
          </div>

          ${skillsSection}
          ${matchScoreSection}

          <div style="display: grid; gap: 16px; margin: 24px 0;">
            <div style="display: flex; align-items: center; padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
              <span style="margin-right: 12px; font-size: 18px;">💼</span>
              <div>
                <strong style="color: #374151;">Position:</strong>
                <span style="color: #6b7280; margin-left: 8px;">${data.jobTitle}</span>
              </div>
            </div>
            <div style="display: flex; align-items: center; padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
              <span style="margin-right: 12px; font-size: 18px;">🏢</span>
              <div>
                <strong style="color: #374151;">Company:</strong>
                <span style="color: #6b7280; margin-left: 8px;">${data.companyName}</span>
              </div>
            </div>
            <div style="display: flex; align-items: center; padding: 12px 0;">
              <span style="margin-right: 12px; font-size: 18px;">📅</span>
              <div>
                <strong style="color: #374151;">Applied:</strong>
                <span style="color: #6b7280; margin-left: 8px;">${data.appliedDate || 'Recently'}</span>
              </div>
            </div>
          </div>

          <div style="text-align: center; margin: 32px 0;">
            <div style="background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); padding: 32px; border-radius: 12px;">
              <h3 style="color: white; margin: 0 0 16px 0; font-size: 20px;">🚀 What's Next?</h3>
              <p style="color: #dbeafe; margin: 0 0 24px 0; font-size: 16px;">
                Our hiring team will review the shortlisted candidates and contact you within 3-5 business days to schedule an interview or discuss the next steps.
              </p>
              <div style="background: rgba(255,255,255,0.2); border-radius: 8px; padding: 16px;">
                <p style="color: white; margin: 0; font-size: 14px;">
                  <strong>💡 Tip:</strong> Keep an eye on your email for interview invitations and be prepared to discuss your experience and how it relates to this role.
                </p>
              </div>
            </div>
          </div>

          <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #f3f4f6;">
            <p style="color: #6b7280; margin: 0; font-size: 14px; line-height: 1.6;">
              We're excited about the possibility of working with you! If you have any questions in the meantime, please don't hesitate to reach out.
            </p>
          </div>

        </div>

        <div style="text-align: center; color: #9ca3af; font-size: 14px;">
          <p style="margin: 0;">
            Best regards,<br>
            The ${data.companyName} Hiring Team
          </p>
        </div>

      </body>
      </html>
    `;
  }

  private generateApplicantShortlistEmailText(data: ApplicantStatusEmailData): string {
    return `
📋 YOU'VE BEEN SHORTLISTED!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Dear ${data.applicantName},

Great news! You've been shortlisted for the ${data.jobTitle} position at ${data.companyName}!

🌟 CONGRATULATIONS ON MAKING THE SHORTLIST!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
After reviewing your application, our team was impressed with your qualifications and experience. You've been selected as one of our top candidates and we'd like to move forward with the next steps in the hiring process.

${data.matchScore ? `🎯 AI Match Score: ${data.matchScore}%
Our AI analysis identified strong alignment between your profile and this role.` : ''}

${data.skills && data.skills.length > 0 ? `🔑 Your Relevant Skills:
${data.skills.join(', ')}` : ''}

JOB DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💼 Position: ${data.jobTitle}
🏢 Company: ${data.companyName}
📅 Applied: ${data.appliedDate || 'Recently'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 WHAT'S NEXT?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Our hiring team will review the shortlisted candidates and contact you within 3-5 business days to schedule an interview or discuss the next steps.

💡 TIP: Keep an eye on your email for interview invitations and be prepared to discuss your experience and how it relates to this role.

We're excited about the possibility of working with you! If you have any questions in the meantime, please don't hesitate to reach out.

Best regards,
${data.companyName} Hiring Team
    `.trim();
  }

  /**
   * Convert plain text offer letter to professional HTML email
   */
  private convertTextOfferToHTML(text: string, companyName: string, jobTitle: string): string {
    // Split text into lines and process
    const lines = text.split('\n');

    // Convert plain text to HTML with formatting
    let htmlBody = '';
    let inSection = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Skip empty lines (we'll add spacing manually)
      if (!trimmedLine) {
        htmlBody += '<div style="margin: 12px 0;"></div>';
        continue;
      }

      // Detect section headers (all caps or contains dashes)
      if (trimmedLine.match(/^[A-Z\s:━]+$/) || trimmedLine.includes('━━━')) {
        if (trimmedLine.includes('━━━')) {
          // Separator line
          htmlBody += '<div style="border-top: 2px solid #e5e7eb; margin: 20px 0;"></div>';
        } else {
          // Section header
          htmlBody += `<h3 style="color: #2563eb; margin: 24px 0 12px 0; font-size: 16px; font-weight: 600;">${trimmedLine}</h3>`;
        }
        inSection = true;
        continue;
      }

      // Detect bullet points
      if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-')) {
        const bulletText = trimmedLine.substring(1).trim();
        htmlBody += `<div style="margin: 8px 0; padding-left: 20px;"><span style="color: #2563eb; margin-right: 8px;">•</span>${bulletText}</div>`;
        continue;
      }

      // Detect key-value pairs (e.g., "Role: Software Engineer")
      if (trimmedLine.includes(':') && trimmedLine.split(':')[0].length < 30) {
        const [key, ...valueParts] = trimmedLine.split(':');
        const value = valueParts.join(':').trim();
        htmlBody += `<div style="margin: 10px 0;"><strong style="color: #374151;">${key}:</strong> <span style="color: #6b7280;">${value}</span></div>`;
        continue;
      }

      // Regular paragraph
      htmlBody += `<p style="color: #4b5563; line-height: 1.6; margin: 12px 0;">${trimmedLine}</p>`;
    }

    // Wrap in professional email template
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Job Offer - ${jobTitle}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 700px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">

        <div style="text-align: center; margin-bottom: 40px;">
          <div style="display: inline-block; width: 80px; height: 80px; background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); border-radius: 50%; margin: 0 auto 20px; line-height: 80px; font-size: 36px;">
            🎉
          </div>
          <h1 style="color: #1e40af; margin: 0; font-size: 32px; font-weight: 700;">Job Offer</h1>
          <p style="color: #6b7280; margin: 8px 0 0 0; font-size: 18px;">We're excited to offer you this opportunity!</p>
        </div>

        <div style="background: white; border: 2px solid #e5e7eb; border-radius: 12px; padding: 32px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
          ${htmlBody}
        </div>

        <div style="text-align: center; margin-top: 32px; color: #9ca3af; font-size: 13px;">
          <p style="margin: 0;">This offer letter was sent from ${companyName}</p>
          <p style="margin: 8px 0 0 0;">© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
        </div>

      </body>
      </html>
    `;
  }

  /**
   * Send offer letter email to applicant
   */
  async sendOfferLetterEmail(data: OfferLetterEmailData): Promise<boolean> {
    try {
      if (!this.mailService) {
        console.warn('📧 Skipping offer letter email: SendGrid not configured');
        return false;
      }

      const subject = `🎉 Job Offer: ${data.jobTitle} at ${data.companyName}`;

      // Convert plain text to HTML
      const htmlContent = this.convertTextOfferToHTML(
        data.offerContentText,
        data.companyName,
        data.jobTitle
      );

      const fromEmail = (process.env.SENDGRID_FROM || 'noreply@platohiring.com').trim();
      const fromName = (process.env.SENDGRID_FROM_NAME || 'Plato Hiring').trim();

      await this.mailService.send({
        to: data.recipientEmail,
        from: { email: fromEmail, name: fromName },
        subject: subject,
        text: data.offerContentText, // Plain text version
        html: htmlContent,           // HTML version
      });

      console.log(`✅ Offer letter email sent to ${data.recipientEmail} for ${data.jobTitle}`);
      return true;
    } catch (error) {
      console.error('❌ Offer letter email error:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();
export { InterviewEmailData, VerificationEmailData, VerificationSuccessEmailData, PasswordResetEmailData, PasswordResetSuccessEmailData, ApplicantStatusEmailData, OfferLetterEmailData };