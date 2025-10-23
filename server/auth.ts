import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User, RegisterData } from "@shared/schema";
import connectPg from "connect-pg-simple";

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
          const email = profile.emails?.[0]?.value;
          const googleId = profile.id;
          const firstName = profile.name?.givenName || '';
          const lastName = profile.name?.familyName || '';
          const profileImageUrl = profile.photos?.[0]?.value;

          if (!email) {
            return done(new Error('Email is required from Google profile'));
          }

          // Check if user already exists with this Google ID
          let user = await storage.getUserByGoogleId(googleId);
          if (user) {
            console.log(`✅ Found existing Google user: ${user.email} (ID: ${user.id})`);
            return done(null, user);
          }

          // Check if user exists with this email (account linking)
          user = await storage.getUserByEmail(email);
          if (user) {
            // Link Google account to existing user
            console.log(`🔗 Linking Google account to existing user: ${user.email} (ID: ${user.id})`);
            const updatedUser = await storage.updateUserGoogleAuth(user.id, {
              googleId,
              authProvider: 'google',
              profileImageUrl: profileImageUrl || user.profileImageUrl,
            });
            console.log(`✅ Successfully linked Google account for: ${updatedUser.email}`);
            return done(null, updatedUser);
          }

          // Create new user from Google profile
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
          });

          console.log(`✅ Created new Google user: ${email} (ID: ${newUser.id})`);
          return done(null, newUser);
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
      const { email, password, firstName, lastName, username } = req.body as RegisterData;

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

      // Hash password and create user
      const hashedPassword = await hashPassword(password);
      const newUser = await storage.createUser({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        username,
        isVerified: true, // Auto-verify for now, can be changed later
      });

      // Log the user in automatically
      req.login(newUser, (err) => {
        if (err) return next(err);
        res.status(201).json({
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          username: newUser.username,
          role: newUser.role,
          isVerified: newUser.isVerified,
        });
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
    });
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
      failureFlash: true,
    }),
    (req, res) => {
      // Successful authentication
      if (req.user) {
        const user = req.user as User;
        console.log(`✅ Google OAuth successful for user: ${user.email} (ID: ${user.id})`);

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