import { MailService } from '@sendgrid/mail';
import { User, Job } from '@shared/schema';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

const FROM_EMAIL = 'raef@platohiring.com';
const FROM_NAME = 'Plato Hiring Platform';

interface EmailParams {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    await mailService.send({
      to: params.to,
      from: {
        email: FROM_EMAIL,
        name: FROM_NAME
      },
      subject: params.subject,
      html: params.html,
    });
    console.log(`✅ Email sent successfully to ${params.to}`);
    return true;
  } catch (error) {
    console.error('❌ SendGrid email error:', error);
    return false;
  }
}

export async function sendVerificationEmail(user: User, verificationToken: string): Promise<boolean> {
  const verificationUrl = `${process.env.BASE_URL || 'https://platohiring.com'}/verify-email?token=${verificationToken}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email - Plato Hiring</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Welcome to Plato Hiring!</h1>
        </div>
        
        <div style="background: white; padding: 40px 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-bottom: 20px;">Hi ${user.firstName || 'there'}!</h2>
          
          <p style="font-size: 16px; margin-bottom: 25px;">
            Thank you for signing up for Plato Hiring Platform. To complete your registration and start posting jobs, please verify your email address.
          </p>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="${verificationUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 35px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
              Verify Email Address
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${verificationUrl}" style="color: #667eea; word-break: break-all;">${verificationUrl}</a>
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="font-size: 14px; color: #666; margin-bottom: 0;">
            If you didn't create an account with us, please ignore this email.
          </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          © 2025 Plato Hiring Platform. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: user.email,
    subject: 'Verify Your Email - Plato Hiring Platform',
    html
  });
}

export async function sendJobPostingConfirmation(user: User, job: Job): Promise<boolean> {
  const dashboardUrl = `${process.env.BASE_URL || 'https://platohiring.com'}/`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Job Posted Successfully - Plato Hiring</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Job Posted Successfully! 🎉</h1>
        </div>
        
        <div style="background: white; padding: 40px 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-bottom: 20px;">Hi ${user.firstName || 'there'}!</h2>
          
          <p style="font-size: 16px; margin-bottom: 25px;">
            Great news! Your job posting has been successfully created and is now live on the platform.
          </p>
          
          <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #10b981;">
            <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">${job.title}</h3>
            <p style="color: #666; margin: 5px 0;"><strong>Location:</strong> ${job.location}</p>
            <p style="color: #666; margin: 5px 0;"><strong>Salary:</strong> ${job.salaryRange || 'Not specified'}</p>
            <p style="color: #666; margin: 5px 0;"><strong>Type:</strong> Full-time</p>
          </div>
          
          <p style="font-size: 16px; margin-bottom: 25px;">
            Our AI-powered matching system is already working to find the best candidates for your position. You'll receive notifications as qualified applicants start applying.
          </p>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="${dashboardUrl}" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 15px 35px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);">
              View Dashboard
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="font-size: 14px; color: #666; margin-bottom: 0;">
            Happy hiring! We'll keep you updated on your job's progress.
          </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          © 2025 Plato Hiring Platform. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: user.email,
    subject: `Job Posted: ${job.title} - Plato Hiring`,
    html
  });
}

export async function sendApplicantMilestoneNotification(user: User, job: Job, applicantCount: number): Promise<boolean> {
  const dashboardUrl = `${process.env.BASE_URL || 'https://platohiring.com'}/`;
  
  const milestoneMessage = applicantCount === 5 
    ? "You've received your first 5 applicants!" 
    : applicantCount === 10 
    ? "Great progress - 10 candidates have applied!"
    : "Excellent response - 15 qualified candidates!";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Applicants - ${job.title}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">${milestoneMessage}</h1>
        </div>
        
        <div style="background: white; padding: 40px 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-bottom: 20px;">Hi ${user.firstName || 'there'}!</h2>
          
          <p style="font-size: 16px; margin-bottom: 25px;">
            Your job posting is attracting quality candidates! You now have <strong>${applicantCount} applicants</strong> for your position.
          </p>
          
          <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #f59e0b;">
            <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">${job.title}</h3>
            <p style="color: #666; margin: 5px 0;"><strong>Location:</strong> ${job.location}</p>
            <p style="color: #666; margin: 5px 0;"><strong>Applicants:</strong> ${applicantCount} candidates</p>
          </div>
          
          <p style="font-size: 16px; margin-bottom: 25px;">
            Review the applications in your dashboard and start scheduling interviews with the most promising candidates.
          </p>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="${dashboardUrl}" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 15px 35px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);">
              Review Applicants
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="font-size: 14px; color: #666; margin-bottom: 0;">
            Keep up the momentum! Quality candidates are finding your posting.
          </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          © 2025 Plato Hiring Platform. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: user.email,
    subject: `${applicantCount} Applicants for ${job.title} - Plato Hiring`,
    html
  });
}

export async function sendInterviewScheduledNotification(user: User, candidateName: string, jobTitle: string, interviewDate: string, interviewTime: string, timezone: string): Promise<boolean> {
  const dashboardUrl = `${process.env.BASE_URL || 'https://platohiring.com'}/`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Interview Scheduled - ${jobTitle}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
        <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Interview Scheduled! 📅</h1>
        </div>
        
        <div style="background: white; padding: 40px 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-bottom: 20px;">Hi ${user.firstName || 'there'}!</h2>
          
          <p style="font-size: 16px; margin-bottom: 25px;">
            Your interview has been successfully scheduled! Here are the details:
          </p>
          
          <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #8b5cf6;">
            <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">Interview Details</h3>
            <p style="color: #666; margin: 8px 0;"><strong>Candidate:</strong> ${candidateName}</p>
            <p style="color: #666; margin: 8px 0;"><strong>Position:</strong> ${jobTitle}</p>
            <p style="color: #666; margin: 8px 0;"><strong>Date:</strong> ${interviewDate}</p>
            <p style="color: #666; margin: 8px 0;"><strong>Time:</strong> ${interviewTime}</p>
            <p style="color: #666; margin: 8px 0;"><strong>Timezone:</strong> ${timezone}</p>
          </div>
          
          <p style="font-size: 16px; margin-bottom: 25px;">
            We recommend preparing questions specific to the role and reviewing the candidate's profile beforehand. Good luck with your interview!
          </p>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="${dashboardUrl}" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 15px 35px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);">
              View Dashboard
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="font-size: 14px; color: #666; margin-bottom: 0;">
            You can manage all your interviews from your dashboard. Best of luck!
          </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          © 2025 Plato Hiring Platform. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: user.email,
    subject: `Interview Scheduled: ${candidateName} for ${jobTitle}`,
    html
  });
}