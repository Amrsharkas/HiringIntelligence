import { MailService } from '@sendgrid/mail';

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
      const subject = `You're invited to interview for ${params.jobTitle} at ${params.companyName}`;
      const preview = params.matchScore != null
        ? `Your score: ${params.matchScore}% - ${params.matchSummary || 'Great fit!'}`
        : `We'd like to invite you to interview`;

      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 640px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #111827;">Hello ${params.applicantName},</h2>
          <p>Based on your resume, we believe you could be a strong fit for the <strong>${params.jobTitle}</strong> role at <strong>${params.companyName}</strong>.</p>
          ${params.matchScore != null ? `<p><strong>Match Score:</strong> ${params.matchScore}%</p>` : ''}
          ${params.matchSummary ? `<p style="color: #4b5563;">${params.matchSummary}</p>` : ''}
          <div style="margin: 24px 0; text-align: center;">
            <a href="${params.invitationLink}" style="background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">View and Confirm Interview</a>
          </div>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #2563eb;">${params.invitationLink}</p>
          <p>We look forward to speaking with you!</p>
          <p>— ${params.companyName} Hiring Team</p>
        </div>`;

      const fromEmail = (process.env.SENDGRID_FROM || 'noreply@platohiring.com').trim();
      const fromName = (process.env.SENDGRID_FROM_NAME || 'Plato Hiring').trim();
      await this.mailService.send({
        to: process.env.TO_EMAIL || params.applicantEmail || 'adam.1.elshanawany@gmail.com',
        from: { email: fromEmail, name: fromName },
        subject,
        text: preview + `\n\n` + params.invitationLink,
        html,
      });
      console.log(`✅ Invitation email sent to ${params.applicantEmail}`);
      return true;
    } catch (error) {
      console.error('❌ SendGrid invitation email error:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();
export { InterviewEmailData };