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
  private mailService: MailService;

  constructor() {
    // Use the environment variable for SendGrid API key
    const apiKey = process.env.SENDGRID_API_KEY;
    
    if (!apiKey) {
      throw new Error("SENDGRID_API_KEY environment variable must be provided");
    }

    this.mailService = new MailService();
    this.mailService.setApiKey(apiKey);
    console.log('📧 EmailService initialized with SendGrid');
  }

  async sendInterviewScheduledEmail(data: InterviewEmailData): Promise<boolean> {
    try {
      const emailHTML = this.generateInterviewEmailHTML(data);
      const emailText = this.generateInterviewEmailText(data);

      await this.mailService.send({
        to: data.applicantEmail,
        from: 'noreply@platohiring.com', // Verified sender email
        subject: `Interview Scheduled - ${data.jobTitle} Position`,
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
      <div style="background-color: #f8f9fa; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #2563eb; margin: 0 0 12px 0;">Interview Link</h3>
        <a href="${this.formatMeetingLink(data.meetingLink)}" 
           style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Join Interview
        </a>
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

          <div style="margin-bottom: 24px;">
            <h3 style="color: #374151; margin: 0 0 8px 0; font-size: 18px;">Hello ${data.applicantName}!</h3>
            <p style="color: #6b7280; margin: 0; line-height: 1.6;">
              We're pleased to invite you for an interview for the <strong>${data.jobTitle}</strong> position at <strong>${data.companyName}</strong>.
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
    const meetingLinkSection = data.meetingLink ? `
Interview Link: ${this.formatMeetingLink(data.meetingLink)}
` : '';

    const notesSection = data.notes ? `
Additional Notes: ${data.notes}
` : '';

    return `
Interview Scheduled - ${data.jobTitle} Position

Hello ${data.applicantName}!

We're pleased to invite you for an interview for the ${data.jobTitle} position at ${data.companyName}.

Interview Details:
- Date: ${data.interviewDate}
- Time: ${data.interviewTime} ${data.timeZone}
- Type: ${data.interviewType}
- Company: ${data.companyName}
${meetingLinkSection}${notesSection}
Please reply to this email if you need to reschedule or have any questions. We look forward to speaking with you!

Best regards,
The ${data.companyName} Hiring Team
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
}

export const emailService = new EmailService();
export { InterviewEmailData };