import { storage } from "./storage";
import { sendVerificationEmail } from "./emailService";
import { nanoid } from "nanoid";

export async function createEmailVerificationToken(userId: string): Promise<string> {
  const token = nanoid(32);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await storage.createEmailVerificationToken({
    token,
    userId,
    expiresAt,
    used: false
  });

  return token;
}

export async function verifyEmailToken(token: string): Promise<{ success: boolean; message: string; userId?: string }> {
  try {
    // Get the verification token
    const verificationToken = await storage.getEmailVerificationToken(token);
    
    if (!verificationToken) {
      return { success: false, message: 'Invalid or expired verification token' };
    }

    if (verificationToken.used) {
      return { success: false, message: 'This verification link has already been used' };
    }

    if (verificationToken.expiresAt < new Date()) {
      return { success: false, message: 'This verification link has expired' };
    }

    // Mark token as used
    await storage.markEmailVerificationTokenUsed(token);

    // Update user email verification status
    await storage.updateUserEmailVerified(verificationToken.userId, true);

    return { 
      success: true, 
      message: 'Email verified successfully!',
      userId: verificationToken.userId
    };
  } catch (error) {
    console.error('Error verifying email token:', error);
    return { success: false, message: 'Verification failed. Please try again.' };
  }
}

export async function sendEmailVerification(userId: string): Promise<boolean> {
  try {
    const user = await storage.getUser(userId);
    if (!user) {
      console.error('User not found for email verification');
      return false;
    }

    if (user.emailVerified) {
      console.log('User email already verified');
      return true;
    }

    const token = await createEmailVerificationToken(userId);
    const success = await sendVerificationEmail(user, token);
    
    if (success) {
      console.log(`✅ Email verification sent to ${user.email}`);
    } else {
      console.error(`❌ Failed to send email verification to ${user.email}`);
    }

    return success;
  } catch (error) {
    console.error('Error sending email verification:', error);
    return false;
  }
}