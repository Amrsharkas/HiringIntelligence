import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User, LoginData, RegisterData } from "@shared/schema";
import connectPg from "connect-pg-simple";
import { sendVerificationEmail } from "./emailService";
import { nanoid } from "nanoid";

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
      secure: false, // Allow non-HTTPS in development
      maxAge: sessionTtl,
      sameSite: 'lax', // Allow cross-site cookies for auth
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
          console.log(`🔐 Login attempt for email: ${email}`);
          const user = await storage.getUserByEmail(email);
          if (!user) {
            console.log(`❌ User not found for email: ${email}`);
            return done(null, false, { message: "Invalid email or password" });
          }

          console.log(`🔍 User found, checking password...`);
          const isValidPassword = await comparePasswords(password, user.password);
          if (!isValidPassword) {
            console.log(`❌ Invalid password for user: ${email}`);
            return done(null, false, { message: "Invalid email or password" });
          }

          // Skip email verification check - all users are considered verified
          console.log(`📧 Email verification check skipped - auto-verified users`)

          console.log(`✅ Login successful for user: ${email}`);
          return done(null, user);
        } catch (error) {
          console.error(`❌ Login error for ${email}:`, error);
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

      // Hash password and create user as auto-verified
      const hashedPassword = await hashPassword(password);
      const newUser = await storage.createUser({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        username,
        isVerified: true, // Auto-verify all users
      });

      console.log(`✅ User ${email} created and auto-verified - no email verification required`);

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
    console.log(`🔐 Login attempt with body:`, { email: req.body.email, passwordLength: req.body.password?.length });
    
    passport.authenticate("local", (err: any, user: User | false, info: any) => {
      console.log(`🔍 Passport auth result:`, { err: !!err, user: !!user, info });
      
      if (err) {
        console.error(`❌ Authentication error:`, err);
        return res.status(500).json({ error: "Authentication failed" });
      }
      if (!user) {
        console.log(`❌ Authentication failed:`, info?.message);
        return res.status(401).json({ error: info?.message || "Invalid credentials" });
      }

      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error(`❌ Login session error:`, loginErr);
          return res.status(500).json({ error: "Login failed" });
        }
        
        console.log(`✅ Login successful for user:`, user.email);
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

  // Email verification endpoint
  app.get("/api/verify-email", async (req, res) => {
    try {
      const { token } = req.query;
      
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: "Invalid verification token" });
      }

      const user = await storage.getUserByVerificationToken(token);
      if (!user) {
        return res.status(400).json({ error: "Invalid or expired verification token" });
      }

      // Update user as verified
      await storage.verifyUser(user.id);
      
      res.json({ message: "Email verified successfully" });
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(500).json({ error: "Verification failed" });
    }
  });

  // Logout endpoint
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.json({ success: true });
    });
  });

  // Get current user endpoint
  app.get("/api/auth/user", (req, res) => {
    console.log(`🔍 GET /api/auth/user - Session ID: ${req.sessionID}`);
    console.log(`🔍 Session data:`, req.session);
    console.log(`🔍 Is authenticated:`, req.isAuthenticated());
    console.log(`🔍 User object:`, req.user);
    
    if (!req.isAuthenticated() || !req.user) {
      console.log(`❌ User not authenticated`);
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = req.user as User;
    console.log(`✅ Returning user data for: ${user.email}`);
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
}

// Middleware to check if user is authenticated
export const requireAuth = (req: any, res: any, next: any) => {
  console.log(`🔒 Auth check for ${req.method} ${req.path}`);
  console.log(`🔒 Session ID: ${req.sessionID}`);
  console.log(`🔒 Is authenticated: ${req.isAuthenticated()}`);
  console.log(`🔒 User: ${req.user?.email || 'none'}`);
  
  if (!req.isAuthenticated()) {
    console.log(`❌ Authentication required for ${req.method} ${req.path}`);
    return res.status(401).json({ error: "Authentication required" });
  }
  
  console.log(`✅ Authentication passed for ${req.user.email}`);
  next();
};