import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User, registerSchema } from "@shared/schema";
import connectPg from "connect-pg-simple";
import { emailService } from "./emailService";

declare global {
  namespace Express {
    interface User extends Omit<import("@shared/schema").User, 'password'> {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function generateVerificationToken(): Promise<string> {
  return randomBytes(32).toString("hex");
}

export function getAppBaseUrl(): string {
  const baseUrl = process.env.APP_URL || process.env.BASE_URL || 'http://localhost:5000';
  // Ensure no trailing slash and proper URL format
  return baseUrl.replace(/\/$/, '');
}

export function generateVerificationLink(token: string): string {
  const baseUrl = getAppBaseUrl();
  return `${baseUrl}/verify-email/${token}`;
}

export function generatePasswordResetLink(token: string): string {
  const baseUrl = getAppBaseUrl();
  return `${baseUrl}/reset-password/${token}`;
}

export async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  // Session configuration
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const PostgresSessionStore = connectPg(session);
  
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "fallback-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    store: new PostgresSessionStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
      ttl: sessionTtl,
      tableName: "sessions",
    }),
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Local strategy for email/password authentication
  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
      },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user) {
            return done(null, false, { message: "Invalid email or password" });
          }

          const isValidPassword = await comparePasswords(password, user.password);
          if (!isValidPassword) {
            return done(null, false, { message: "Invalid email or password" });
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  // Google OAuth strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
        scope: ['profile', 'email'],
      },
      async (_accessToken: any, _refreshToken: any, profile: any, done: any) => {
        try {
          console.log('🔍 Google OAuth callback triggered, profile:', JSON.stringify({
            id: profile.id,
            email: profile.emails?.[0]?.value,
            name: profile.name,
            hasPhoto: !!profile.photos?.[0]?.value
          }, null, 2));

          const email = profile.emails?.[0]?.value;
          const googleId = profile.id;
          const firstName = profile.name?.givenName || '';
          const lastName = profile.name?.familyName || '';
          const profileImageUrl = profile.photos?.[0]?.value;

          if (!email) {
            console.error('❌ No email found in Google profile');
            return done(new Error('Email is required from Google profile'));
          }

          console.log(`🔍 Processing Google OAuth for: ${email}, Google ID: ${googleId}`);

          // Check if user already exists with this Google ID
          let user = await storage.getUserByGoogleId(googleId);
          if (user && user.role === "user") {
            console.log(`✅ Found existing Google user: ${user.email} (ID: ${user.id})`);
            return done(null, user);
          }

          // Check if user exists with this email and same role (account linking)
          user = await storage.getUserByEmail(email);
          if (user && user.role === "user") {
            // Link Google account to existing user with 'user' role
            console.log(`🔗 Linking Google account to existing user: ${user.email} (ID: ${user.id}, Role: ${user.role})`);
            const updatedUser = await storage.updateUserGoogleAuth(user.id, {
              googleId,
              authProvider: 'google',
              profileImageUrl: profileImageUrl || user.profileImageUrl,
            });
            console.log(`✅ Successfully linked Google account for: ${updatedUser.email}`);
            return done(null, updatedUser);
          } else if (user && user.role !== "user") {
            // Email exists but with different role - reject login (don't create new account)
            console.log(`❌ Email exists with different role (${user.role}) - access denied for hiring app: ${email}`);
            return done(null, false, { message: `This email is registered with a different role (${user.role}). Please use the correct application to sign in.` });
          }

          // Create new user from Google profile
          console.log(`👤 Creating new Google user: ${email} (No existing user found)`);
          try {
            const newUser = await storage.createUser({
              email,
              password: await hashPassword(randomBytes(32).toString('hex')), // Random password for OAuth users
              firstName,
              lastName,
              profileImageUrl,
              isVerified: true, // Auto-verify Google users
              googleId,
              authProvider: 'google',
              passwordNeedsSetup: false,
              role: 'user', // Explicitly set role to 'user' for Google OAuth users
            });

            console.log(`✅ Created new Google user: ${email} (ID: ${newUser.id})`);
            return done(null, newUser);
          } catch (createError) {
            console.error(`❌ Failed to create new Google user:`, createError);
            return done(createError as Error);
          }
        } catch (error) {
          console.error('Google OAuth error:', error);
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, (user as User).id));
  
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      done(null, user);
    } catch (error) {
      done(null, false);
    }
  });

  // Registration endpoint
  app.post("/api/register", async (req, res, next) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        const firstIssue = parsed.error.issues[0];
        return res.status(400).json({
          error: firstIssue?.message ?? "Invalid registration data",
          issues: parsed.error.issues,
        });
      }

      const { email, password, firstName, lastName, username, acceptedTermsText } = parsed.data;

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "User with this email already exists" });
      }

      // Check username if provided
      if (username) {
        const existingUsername = await storage.getUserByUsername(username);
        if (existingUsername) {
          return res.status(400).json({ error: "Username is already taken" });
        }
      }

      // Generate verification token
      const verificationToken = await generateVerificationToken();

      // Hash password and create user
      const hashedPassword = await hashPassword(password);
      const newUser = await storage.createUser({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        username,
        isVerified: false, // Require email verification
        verificationToken,
        termsAcceptedAt: new Date(),
        termsAcceptedText: acceptedTermsText,
      });

      // Send verification email
      try {
        await emailService.sendVerificationEmail({
          email: newUser.email,
          firstName: newUser.firstName,
          verificationLink: generateVerificationLink(verificationToken),
        });
        console.log(`✅ Verification email sent to ${newUser.email}`);
      } catch (emailError) {
        console.error("❌ Failed to send verification email:", emailError);
        // Still allow registration to continue, but log the error
      }

      // Return user info without logging them in automatically
      res.status(201).json({
        message: "Registration successful! Please check your email to verify your account.",
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          username: newUser.username,
          role: newUser.role,
          isVerified: newUser.isVerified,
          termsAcceptedAt: newUser.termsAcceptedAt,
          termsAcceptedText: newUser.termsAcceptedText,
        }
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // Login endpoint
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: User | false, info: any) => {
      if (err) {
        return res.status(500).json({ error: "Authentication failed" });
      }
      if (!user) {
        return res.status(401).json({ error: info?.message || "Invalid credentials" });
      }

      // Check if user is verified
      if (!user.isVerified) {
        return res.status(403).json({
          error: "Email verification required",
          message: "Please verify your email address before logging in. Check your inbox for the verification email or request a new one.",
          requiresVerification: true,
          email: user.email
        });
      }

      // Check if user has the required role (only "user" role allowed)
      if (user.role !== "user") {
        return res.status(403).json({
          error: "Access denied",
          message: "This login is only available for users with 'user' role. Your account has a different role.",
          userRole: user.role
        });
      }

      req.login(user, (loginErr) => {
        if (loginErr) {
          return res.status(500).json({ error: "Login failed" });
        }
        res.json({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          role: user.role,
          isVerified: user.isVerified,
        });
      });
    })(req, res, next);
  });

  // Logout endpoint
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return next(err);
      }
      
      // Destroy the session completely
      req.session.destroy((sessionErr) => {
        if (sessionErr) {
          console.error("Session destruction error:", sessionErr);
          return res.status(500).json({ error: "Failed to destroy session" });
        }
        
        // Clear the session cookie
        res.clearCookie('connect.sid');
        console.log("✅ User logged out successfully, session destroyed");
        res.json({ success: true, message: "Logged out successfully" });
      });
    });
  });

  // Get current user endpoint
  app.get("/api/auth/user", (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = req.user as User;
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      role: user.role,
      isVerified: user.isVerified,
      isSuperAdmin: user.isSuperAdmin,
    });
  });

  // Email verification endpoint
  app.get("/api/verify-email/:token", async (req, res) => {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(400).json({ error: "Verification token is required" });
      }

      // Find user by verification token
      const user = await storage.getUserByVerificationToken(token);
      if (!user) {
        return res.status(400).json({ error: "Invalid or expired verification token" });
      }

      // Check if user is already verified
      if (user.isVerified) {
        return res.status(200).json({
          message: "Email already verified. You can proceed to login."
        });
      }

      // Mark user as verified and clear the token
      const updatedUser = await storage.verifyUserEmail(user.id);
      if (!updatedUser) {
        return res.status(500).json({ error: "Failed to verify email" });
      }

      console.log(`✅ Email verified for user: ${updatedUser.email} (ID: ${updatedUser.id})`);

      // Send success email
      try {
        await emailService.sendVerificationSuccessEmail({
          email: updatedUser.email,
          firstName: updatedUser.firstName,
        });
      } catch (emailError) {
        console.error("❌ Failed to send verification success email:", emailError);
        // Don't fail the request if email sending fails
      }

      res.status(200).json({
        message: "Email verified successfully! You can now login to your account."
      });
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(500).json({ error: "Email verification failed" });
    }
  });

  // Resend verification email endpoint
  app.post("/api/resend-verification", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check if user is already verified
      if (user.isVerified) {
        return res.status(400).json({ error: "Email is already verified" });
      }

      // Generate new verification token
      const newVerificationToken = await generateVerificationToken();
      await storage.updateVerificationToken(user.id, newVerificationToken);

      // Send verification email
      try {
        await emailService.sendVerificationEmail({
          email: user.email,
          firstName: user.firstName,
          verificationLink: generateVerificationLink(newVerificationToken),
        });
        console.log(`✅ Verification email resent to ${user.email}`);
      } catch (emailError) {
        console.error("❌ Failed to resend verification email:", emailError);
        return res.status(500).json({ error: "Failed to send verification email" });
      }

      res.status(200).json({
        message: "Verification email sent successfully. Please check your inbox."
      });
    } catch (error) {
      console.error("Resend verification error:", error);
      res.status(500).json({ error: "Failed to resend verification email" });
    }
  });

  // Test login endpoint - allows login by ID without password
  // Only enabled when ENABLE_TEST_LOGIN environment variable is true
  app.get("/api/auth/test-login", async (req, res) => {
    // Check if test login is enabled
    if (process.env.ENABLE_TEST_LOGIN !== 'true') {
      return res.status(404).json({ error: "Test login endpoint is disabled" });
    }

    try {
      const { userId } = req.query;
      const userIdStr = Array.isArray(userId) ? userId[0] : String(userId);

      if (!userIdStr) {
        return res.status(400).json({ error: "userId is required" });
      }

      // Get user by ID
      const user = await storage.getUser(userIdStr);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check if user has the required role (only "user" role allowed)
      if (user.role !== "user") {
        console.error(`❌ Test login access denied for user: ${user.email} - Role: ${user.role} (required: user)`);
        return res.status(403).json({
          error: "Access denied",
          message: "This test login is only available for users with 'user' role",
          userRole: user.role
        });
      }

      // Log the user in
      req.login(user, (loginErr) => {
        if (loginErr) {
          return res.status(500).json({ error: "Login failed" });
        }

        console.log(`🔓 Test login successful for user: ${user.email} (ID: ${user.id})`);

        res.redirect('/');
      });
    } catch (error) {
      console.error("Test login error:", error);
      res.status(500).json({ error: "Test login failed" });
    }
  });

  // Google OAuth routes
  app.get("/auth/google", passport.authenticate("google"));

  app.get(
    "/auth/google/callback",
    passport.authenticate("google", {
      failureRedirect: "/signin?error=google-auth-failed",
    }),
    (req, res) => {
      // Successful authentication
      if (req.user) {
        const user = req.user as User;
        console.log(`✅ Google OAuth successful for user: ${user.email} (ID: ${user.id}, Role: ${user.role})`);

        // Ensure session is properly saved before redirect
        req.session.save((err) => {
          if (err) {
            console.error("Session save error:", err);
            return res.redirect("/signin?error=session-save-failed");
          }

          console.log("✅ Session saved successfully, redirecting to dashboard");
          res.redirect("/dashboard");
        });
      } else {
        console.error("❌ Google OAuth failed: No user in request");
        res.redirect("/signin?error=google-auth-failed");
      }
    }
  );

  // Request password reset endpoint
  app.post("/api/request-password-reset", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if user exists or not for security
        return res.status(200).json({
          message: "If an account with this email exists, a password reset link has been sent."
        });
      }

      // Generate reset token (valid for 1 hour)
      const resetToken = await generateVerificationToken();
      const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      // Store reset token
      await storage.setPasswordResetToken(user.id, resetToken, resetTokenExpires);

      // Send password reset email
      try {
        await emailService.sendPasswordResetEmail({
          email: user.email,
          firstName: user.firstName,
          resetLink: generatePasswordResetLink(resetToken),
        });
        console.log(`✅ Password reset email sent to ${user.email}`);
      } catch (emailError) {
        console.error("❌ Failed to send password reset email:", emailError);
        return res.status(500).json({ error: "Failed to send password reset email" });
      }

      res.status(200).json({
        message: "If an account with this email exists, a password reset link has been sent."
      });
    } catch (error) {
      console.error("Password reset request error:", error);
      res.status(500).json({ error: "Failed to process password reset request" });
    }
  });

  // Verify reset token endpoint
  app.get("/api/verify-reset-token/:token", async (req, res) => {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(400).json({ error: "Reset token is required" });
      }

      // Find user by reset token
      const user = await storage.getUserByResetPasswordToken(token);
      if (!user) {
        return res.status(400).json({
          error: "Invalid or expired reset token",
          message: "This password reset link is invalid or has expired. Please request a new one."
        });
      }

      res.status(200).json({
        message: "Reset token is valid",
        email: user.email,
        firstName: user.firstName
      });
    } catch (error) {
      console.error("Token verification error:", error);
      res.status(500).json({ error: "Failed to verify reset token" });
    }
  });

  // Reset password endpoint
  app.post("/api/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(400).json({
          error: "Reset token and new password are required"
        });
      }

      // Find user by reset token
      const user = await storage.getUserByResetPasswordToken(token);
      if (!user) {
        return res.status(400).json({
          error: "Invalid or expired reset token",
          message: "This password reset link is invalid or has expired. Please request a new one."
        });
      }

      // Validate password strength
      const passwordRequirements = [
        password.length >= 8,
        /[A-Z]/.test(password),
        /[a-z]/.test(password),
        /[0-9]/.test(password),
        /[^A-Za-z0-9]/.test(password)
      ];

      if (!passwordRequirements.every(req => req)) {
        return res.status(400).json({
          error: "Password does not meet requirements",
          message: "Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character"
        });
      }

      // Hash new password
      const hashedPassword = await hashPassword(password);

      // Update user password and clear reset token
      await storage.updateUserPassword(user.id, hashedPassword);

      console.log(`✅ Password reset completed for user: ${user.email} (ID: ${user.id})`);

      // Send confirmation email
      try {
        await emailService.sendPasswordResetSuccessEmail({
          email: user.email,
          firstName: user.firstName,
        });
      } catch (emailError) {
        console.error("❌ Failed to send password reset success email:", emailError);
        // Don't fail the request if email sending fails
      }

      res.status(200).json({
        message: "Password has been reset successfully. You can now log in with your new password."
      });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // Google OAuth failure handler
  app.get("/auth/google/failure", (_req, res) => {
    res.redirect("/signin?error=google-auth-failed");
  });
}

// Middleware to check if user is authenticated
export const requireAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
};

// Middleware to check if user is authenticated and verified
export const requireVerifiedAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const user = req.user as User;
  if (!user.isVerified) {
    return res.status(403).json({
      error: "Email verification required",
      message: "Please verify your email address to access this feature."
    });
  }

  next();
};

// Middleware to check for service API key (for inter-service communication)
export const requireServiceAuth = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Authorization header required" });
  }

  const token = authHeader.replace('Bearer ', '').trim();
  const serviceApiKey = process.env.SERVICE_API_KEY;

  if (!serviceApiKey) {
    console.error('SERVICE_API_KEY environment variable not set');
    return res.status(500).json({ error: "Service authentication not configured" });
  }

  if (token !== serviceApiKey) {
    return res.status(401).json({ error: "Invalid service API key" });
  }

  next();
};

// Middleware that allows either user authentication OR service API key
export const requireAuthOrService = (req: any, res: any, next: any) => {
  if (req.user) {
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Authorization required" });
  }

  const serviceApiKey = process.env.SERVICE_API_KEY;

  // Check if it's a service API key
  if (serviceApiKey && authHeader.replace('Bearer ', '').trim() === serviceApiKey) {
    return next();
  }

  // Otherwise, check for user authentication
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Authentication required" });
  }

  next();
};