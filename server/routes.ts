import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
import fetch from "node-fetch";
import crypto from "crypto";
import { createVoiceStreamServer } from "./websocket/voiceStreamServer";
import { storage } from "./storage";
import { setupAuth, requireAuth, requireVerifiedAuth, requireAuthOrService } from "./auth";
import { requireCredits, deductCredits, attachCreditBalance } from "./creditMiddleware";
import { requireResumeProcessingCredits, deductResumeProcessingCredits } from "./resumeCreditMiddleware";
import { creditService } from "./creditService";
import { stripeService } from "./stripeService";
import { subscriptionService } from "./subscriptionService";
import { setupSubscriptionSystem } from "./setupSubscriptionSystem";
import { airtableUserProfiles, applicantProfiles, insertJobSchema, insertOrganizationSchema, type InsertOrganization, users, organizations, offerLetters } from "@shared/schema";
import { generateJobDescription, generateJobRequirements, extractTechnicalSkills, generateCandidateMatchRating, generateOfferLetter } from "./openai";
import { wrapOpenAIRequest } from "./openaiTracker";
import { localDatabaseService } from "./localDatabaseService";
import { interviewQuestionsService } from "./interviewQuestionsService";
import { resumeProcessingService } from "./resumeProcessingService";
import { fileStorageService } from "./fileStorageService";
import { emailService } from "./emailService";
import { ragIndexingService } from "./ragIndexingService";
import { resumeRagService } from "./resumeRagService";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";
import { setupBullDashboard } from "./dashboard";
import { resumeProcessingQueue } from "./queues";
import { setupCreditPackages } from "./setupCreditPackages";
import { setupRegionalPricing } from "./setupRegionalPricing";
import { geoService } from "./geoService";
import superAdminRoutes from "./routes/superAdmin";
import voiceRoutes from "./routes/twilioVoice.routes";
import tutorialRoutes from "./routes/tutorial.routes";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  setupAuth(app);

  // Setup BullMQ Dashboard
  setupBullDashboard(app);

  // Mount Super Admin routes
  app.use('/api/super-admin', superAdminRoutes);

  // Mount Voice API routes
  app.use('/api/voice', voiceRoutes);

  // Mount Tutorial routes (authenticated users)
  app.use('/api/tutorial', tutorialRoutes);

  // Get user's organization route
  app.get('/api/organizations/current', requireVerifiedAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      console.log("Fetching organization for user:", userId);

      // Get user's organization
      const organization = await storage.getOrganizationByUser(userId);

      if (!organization) {
        return res.status(404).json({ message: "No organization found" });
      }

      // Get credit balance for the organization
      const creditBalance = await creditService.getCreditBalance(organization.id);

      res.json({
        ...organization,
        creditBalance
      });
    } catch (error) {
      console.error("Error fetching organization:", error);
      res.status(500).json({ message: "Failed to fetch organization" });
    }
  });

  // Update user's organization route
  app.put('/api/organizations/current', requireVerifiedAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const orgData = req.body;

      console.log("Updating organization for user:", userId);
      console.log("Organization data:", orgData);

      // Get user's current organization
      const currentOrganization = await storage.getOrganizationByUser(userId);

      if (!currentOrganization) {
        return res.status(404).json({ message: "No organization found" });
      }

      // Check if user is an admin
      const isAdmin = await storage.isOrganizationAdmin(userId, parseInt(currentOrganization.id));

      // Check if user is trying to update restricted fields (companyName or url)
      const isUpdatingRestrictedFields =
        (orgData.companyName !== undefined && orgData.companyName !== currentOrganization.companyName) ||
        (orgData.url !== undefined && orgData.url !== currentOrganization.url);

      if (isUpdatingRestrictedFields && !isAdmin) {
        return res.status(403).json({
          message: "Only administrators can update organization name and URL settings"
        });
      }

      // If URL is being updated, check if it's already taken by another organization
      if (orgData.url && orgData.url !== currentOrganization.url) {
        const existingOrg = await storage.getOrganizationByUrl(orgData.url);
        if (existingOrg) {
          return res.status(409).json({ message: "Organization URL already in use" });
        }
      }

      // Update organization with only the allowed fields
      const updates: Partial<InsertOrganization> = {
        companyName: orgData.companyName,
        url: orgData.url,
        industry: orgData.industry,
        companySize: orgData.companySize,
        description: orgData.description,
      };

      // Remove undefined values
      Object.keys(updates).forEach(key => {
        if (updates[key as keyof typeof updates] === undefined) {
          delete updates[key as keyof typeof updates];
        }
      });

      const updatedOrganization = await storage.updateOrganization(currentOrganization.id, updates);

      console.log("Updated organization:", updatedOrganization);
      res.json(updatedOrganization);
    } catch (error) {
      console.error("Error updating organization:", error);
      console.error("Error details:", error instanceof Error ? error.message : error);

      if (
        error instanceof Error &&
        (error.message.includes('organizations_url_unique') || error.message.includes('duplicate key value'))
      ) {
        return res.status(409).json({ message: "Organization URL already in use" });
      }

      res.status(500).json({ message: "Failed to update organization" });
    }
  });

  // Organization Branding routes
  // Upload organization logo
  app.post('/api/organizations/current/branding/logo', requireVerifiedAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { fileName, fileType, fileContent } = req.body;

      if (!fileName || !fileType || !fileContent) {
        return res.status(400).json({ message: "Missing required fields: fileName, fileType, fileContent" });
      }

      // Get user's organization
      const organization = await storage.getOrganizationByUser(userId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Check if user is admin
      const isAdmin = await storage.isOrganizationAdmin(userId, organization.id);
      if (!isAdmin) {
        return res.status(403).json({ message: "Only administrators can update branding" });
      }

      // Save logo using fileStorageService
      const { relativePath } = await fileStorageService.saveOrganizationLogo(
        fileContent,
        fileName,
        fileType,
        organization.id
      );

      // Update organization with logo path
      await storage.updateOrganization(organization.id, { brandLogoPath: relativePath });

      const logoUrl = `/api/organizations/logos/${organization.id}/${relativePath}`;
      console.log("✅ Organization logo uploaded:", logoUrl);

      res.json({ logoUrl, fileName: relativePath });
    } catch (error) {
      console.error("Error uploading organization logo:", error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to upload logo"
      });
    }
  });

  // Update organization branding (primary color)
  app.put('/api/organizations/current/branding', requireVerifiedAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { primaryColor } = req.body;

      // Get user's organization
      const organization = await storage.getOrganizationByUser(userId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Check if user is admin
      const isAdmin = await storage.isOrganizationAdmin(userId, organization.id);
      if (!isAdmin) {
        return res.status(403).json({ message: "Only administrators can update branding" });
      }

      // Validate HSL color format (should be like "207, 90%, 54%")
      if (primaryColor) {
        const hslRegex = /^\d+,\s*\d+%,\s*\d+%$/;
        if (!hslRegex.test(primaryColor)) {
          return res.status(400).json({
            message: "Invalid color format. Expected HSL format like '207, 90%, 54%'"
          });
        }
      }

      // Update organization with primary color
      const updatedOrg = await storage.updateOrganization(organization.id, {
        brandPrimaryColor: primaryColor
      });

      console.log("✅ Organization branding updated:", updatedOrg.brandPrimaryColor);
      res.json(updatedOrg);
    } catch (error) {
      console.error("Error updating organization branding:", error);
      res.status(500).json({ message: "Failed to update branding" });
    }
  });

  // Delete organization logo
  app.delete('/api/organizations/current/branding/logo', requireVerifiedAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;

      // Get user's organization
      const organization = await storage.getOrganizationByUser(userId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Check if user is admin
      const isAdmin = await storage.isOrganizationAdmin(userId, organization.id);
      if (!isAdmin) {
        return res.status(403).json({ message: "Only administrators can update branding" });
      }

      // Delete logo file if exists
      if (organization.brandLogoPath) {
        try {
          await fileStorageService.deleteOrganizationLogo(
            organization.id,
            organization.brandLogoPath
          );
        } catch (error) {
          console.error("Error deleting logo file:", error);
          // Continue even if file deletion fails
        }
      }

      // Update organization to remove logo path
      await storage.updateOrganization(organization.id, { brandLogoPath: null });

      console.log("✅ Organization logo deleted");
      res.json({ message: "Logo deleted successfully" });
    } catch (error) {
      console.error("Error deleting organization logo:", error);
      res.status(500).json({ message: "Failed to delete logo" });
    }
  });

  // Serve organization logo files
  app.get('/api/organizations/logos/:organizationId/:filename', async (req, res) => {
    try {
      const { organizationId, filename } = req.params;
      const filePath = fileStorageService.getOrganizationLogoPath(organizationId, filename);

      // Check if file exists
      const exists = await fileStorageService.fileExists(filePath);
      if (!exists) {
        return res.status(404).json({ message: "Logo not found" });
      }

      // Set cache headers
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day

      // Determine content type from filename
      const ext = filename.split('.').pop()?.toLowerCase();
      const contentTypeMap: { [key: string]: string } = {
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'svg': 'image/svg+xml'
      };
      const contentType = ext ? contentTypeMap[ext] : 'application/octet-stream';
      res.setHeader('Content-Type', contentType);

      // Send file
      res.sendFile(filePath);
    } catch (error) {
      console.error("Error serving organization logo:", error);
      res.status(500).json({ message: "Failed to serve logo" });
    }
  });

  // User profile routes
  app.get('/api/user/profile', requireVerifiedAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      console.log("Fetching user profile for user:", userId);

      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          displayName: true,
          username: true,
          profileImageUrl: true,
          authProvider: true,
          isVerified: true,
          createdAt: true,
        }
      });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Failed to fetch user profile" });
    }
  });

  app.put('/api/user/profile', requireVerifiedAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { firstName, lastName, displayName } = req.body;

      console.log("Updating user profile for user:", userId);
      console.log("Update data:", { firstName, lastName, displayName });

      // Validate input
      if (!firstName || !lastName) {
        return res.status(400).json({ message: "First name and last name are required" });
      }

      // Update user profile
      const [updatedUser] = await db
        .update(users)
        .set({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          displayName: displayName ? displayName.trim() : `${firstName} ${lastName}`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          displayName: users.displayName,
          username: users.username,
          profileImageUrl: users.profileImageUrl,
          authProvider: users.authProvider,
          isVerified: users.isVerified,
          createdAt: users.createdAt,
        });

      console.log("Updated user profile:", updatedUser);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update user profile" });
    }
  });

  // Organization routes
  app.get('/api/organizations/check-url', requireAuth, async (req: any, res) => {
    try {
      const url = typeof req.query.url === 'string' ? req.query.url.trim() : '';

      if (!url) {
        return res.status(400).json({ available: false, message: "URL is required" });
      }

      const existing = await storage.getOrganizationByUrl(url);
      res.json({ available: !existing });
    } catch (error) {
      console.error("Error checking organization URL:", error);
      res.status(500).json({ available: false, message: "Failed to check URL availability" });
    }
  });

  app.post('/api/organizations', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      console.log("Creating organization for user:", userId);
      console.log("Request body:", req.body);
      
      const orgData = insertOrganizationSchema.parse({
        ...req.body,
        ownerId: userId
      });
      
      const normalizedUrl = orgData.url.trim();
      const existingOrganization = await storage.getOrganizationByUrl(normalizedUrl);

      if (existingOrganization) {
        return res.status(409).json({ message: "Organization URL already in use" });
      }

      const organization = await storage.createOrganization({
        ...orgData,
        url: normalizedUrl,
      });

      console.log("Parsed org data:", orgData);
      console.log("Created organization:", organization);
      res.json(organization);
    } catch (error) {
      console.error("Error creating organization:", error);
      console.error("Error details:", error instanceof Error ? error.message : error);

      if (
        error instanceof Error &&
        (error.message.includes('organizations_url_unique') || error.message.includes('duplicate key value'))
      ) {
        return res.status(409).json({ message: "Organization URL already in use" });
      }

      res.status(500).json({ message: "Failed to create organization", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get('/api/organizations/current', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);
      
      if (!organization) {
        return res.status(404).json({ message: "No organization found" });
      }
      
      res.json(organization);
    } catch (error) {
      console.error("Error fetching organization:", error);
      res.status(500).json({ message: "Failed to fetch organization" });
    }
  });

  // Credit management endpoints
  app.get('/api/organizations/current/credits', requireVerifiedAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);

      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const creditBalance = await creditService.getCreditBalance(organization.id);

      if (!creditBalance) {
        return res.status(404).json({ message: "Credit balance not found" });
      }

      res.json(creditBalance);
    } catch (error) {
      console.error("Error fetching credit balance:", error);
      res.status(500).json({ message: "Failed to fetch credit balance" });
    }
  });

  app.get('/api/organizations/current/credits/history', requireVerifiedAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);

      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const creditHistory = await creditService.getCreditHistory(organization.id, limit);

      res.json(creditHistory);
    } catch (error) {
      console.error("Error fetching credit history:", error);
      res.status(500).json({ message: "Failed to fetch credit history" });
    }
  });

  app.get('/api/organizations/current/credits/usage', requireVerifiedAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);

      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const creditUsage = await creditService.getCreditUsage(organization.id);

      res.json(creditUsage);
    } catch (error) {
      console.error("Error fetching credit usage:", error);
      res.status(500).json({ message: "Failed to fetch credit usage" });
    }
  });

  // Admin endpoint to add credits (should be protected by additional admin checks in production)
  app.post('/api/organizations/:organizationId/credits/add', requireAuth, async (req: any, res) => {
    try {
      const { organizationId } = req.params;
      const { amount, description } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Credit amount must be a positive number" });
      }

      // In production, add admin role verification here
      // For now, we'll allow the organization owner to add credits
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);

      if (!organization || organization.id !== organizationId) {
        return res.status(403).json({ message: "Not authorized to add credits to this organization" });
      }

      await creditService.addCredits(
        organizationId,
        amount,
        description || `Manual credit addition by ${userId}`
      );

      const updatedBalance = await creditService.getCreditBalance(organizationId);

      res.json({
        success: true,
        message: `Successfully added ${amount} credits`,
        creditBalance: updatedBalance
      });
    } catch (error) {
      console.error("Error adding credits:", error);
      res.status(500).json({
        message: "Failed to add credits",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Credit pricing endpoints
  app.get('/api/credits/pricing', requireVerifiedAuth, async (req: any, res) => {
    try {
      const pricing = await creditService.getAllPricing();
      res.json(pricing);
    } catch (error) {
      console.error("Error fetching pricing:", error);
      res.status(500).json({ message: "Failed to fetch pricing" });
    }
  });

  app.get('/api/credits/pricing/:actionType', requireVerifiedAuth, async (req: any, res) => {
    try {
      const { actionType } = req.params;
      const cost = await creditService.getActionCost(actionType as any);
      res.json({ actionType, cost });
    } catch (error) {
      console.error("Error fetching action cost:", error);
      res.status(500).json({ message: "Failed to fetch action cost" });
    }
  });

  // Admin endpoint to update pricing
  app.post('/api/credits/pricing', requireAuth, async (req: any, res) => {
    try {
      const { actionType, cost, description, isActive } = req.body;

      if (!actionType || cost === undefined) {
        return res.status(400).json({ message: "Action type and cost are required" });
      }

      if (cost < 0) {
        return res.status(400).json({ message: "Cost must be a non-negative number" });
      }

      // In production, add admin role verification here
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);

      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      await creditService.upsertPricing(actionType, cost, description, isActive);

      res.json({
        success: true,
        message: `Successfully updated pricing for ${actionType}`,
        actionType,
        cost
      });
    } catch (error) {
      console.error("Error updating pricing:", error);
      res.status(500).json({
        message: "Failed to update pricing",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Initialize default pricing on first request
  app.post('/api/credits/pricing/initialize', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);

      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      await creditService.initializeDefaultPricing();

      res.json({
        success: true,
        message: "Default pricing initialized successfully"
      });
    } catch (error) {
      console.error("Error initializing pricing:", error);
      res.status(500).json({
        message: "Failed to initialize pricing",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Geolocation endpoints for regional pricing
  app.get('/api/geo/country', async (req: any, res) => {
    try {
      // Express trust proxy is enabled, so req.ip should be the real client IP
      const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
      const locationInfo = await geoService.getLocationInfo(ip);
      res.json(locationInfo);
    } catch (error) {
      console.error("Error detecting country:", error);
      res.json({
        detected: { countryCode: 'EG', countryName: 'Egypt' },
        supported: 'EG',
      });
    }
  });

  app.get('/api/geo/countries', async (req: any, res) => {
    try {
      const countries = await subscriptionService.getSupportedCountries();
      res.json(countries);
    } catch (error) {
      console.error("Error fetching supported countries:", error);
      res.status(500).json({ message: "Failed to fetch supported countries" });
    }
  });

  // Subscription plan endpoints
  app.get('/api/subscriptions/plans', async (req: any, res) => {
    try {
      // Auto-detect country from IP, or use query param as override
      let countryCode = req.query.country as string | undefined;

      if (!countryCode) {
        // Detect from IP address
        const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
        countryCode = await geoService.getSupportedCountryCode(ip);
      }

      // Validate country code - only allow supported countries
      const supportedCountries = ['EG', 'US'];
      const validCountry = supportedCountries.includes(countryCode.toUpperCase())
        ? countryCode.toUpperCase()
        : 'EG';

      // Get plans with country-specific pricing
      const plansWithPricing = await subscriptionService.getPlansWithPricing(validCountry);

      // Transform response to include pricing info in a backwards-compatible way
      const response = plansWithPricing.map(plan => ({
        ...plan,
        // Override legacy price fields with country-specific pricing if available
        monthlyPrice: plan.pricing?.monthlyPrice ?? plan.monthlyPrice,
        yearlyPrice: plan.pricing?.yearlyPrice ?? plan.yearlyPrice,
        currency: plan.pricing?.currency ?? 'EGP',
        countryCode: plan.pricing?.countryCode ?? 'EG',
        stripePriceIdMonthly: plan.pricing?.stripePriceIdMonthly ?? plan.stripePriceIdMonthly,
        stripePriceIdYearly: plan.pricing?.stripePriceIdYearly ?? plan.stripePriceIdYearly,
      }));

      res.json(response);
    } catch (error) {
      console.error("Error fetching subscription plans:", error);
      res.status(500).json({ message: "Failed to fetch subscription plans" });
    }
  });

  app.post('/api/subscriptions/plans/initialize', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);

      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const plans = await subscriptionService.createDefaultSubscriptionPlans();

      res.json({
        success: true,
        message: "Default subscription plans created successfully",
        plans
      });
    } catch (error) {
      console.error("Error initializing subscription plans:", error);
      res.status(500).json({
        message: "Failed to initialize subscription plans",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get current organization subscription
  app.get('/api/subscriptions/current', requireVerifiedAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);

      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const subscription = await subscriptionService.getActiveSubscription(organization.id);

      if (!subscription) {
        return res.json(null);
      }

      res.json(subscription);
    } catch (error) {
      console.error("Error fetching subscription:", error);
      res.status(500).json({ message: "Failed to fetch subscription" });
    }
  });

  // Subscribe to a plan
  app.post('/api/subscriptions/subscribe', requireVerifiedAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { planId, billingCycle, trialDays, countryCode } = req.body;

      if (!planId || !billingCycle) {
        return res.status(400).json({ message: "Plan ID and billing cycle are required" });
      }

      if (!['monthly', 'yearly'].includes(billingCycle)) {
        return res.status(400).json({ message: "Billing cycle must be 'monthly' or 'yearly'" });
      }

      // Validate and default country code
      const supportedCountries = ['EG', 'US'];
      const selectedCountry = countryCode && supportedCountries.includes(countryCode.toUpperCase())
        ? countryCode.toUpperCase()
        : 'EG';

      const organization = await storage.getOrganizationByUser(userId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Check if already subscribed
      const existingSubscription = await subscriptionService.getActiveSubscription(organization.id);
      if (existingSubscription) {
        return res.status(400).json({
          message: "Organization already has an active subscription",
          subscription: existingSubscription
        });
      }

      // Create Stripe checkout session with country-specific pricing
      const checkoutSession = await stripeService.createSubscriptionCheckout({
        organizationId: organization.id,
        planId,
        billingCycle,
        countryCode: selectedCountry,
        successUrl: `${process.env.APP_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${process.env.APP_URL}/subscription/canceled`,
        customerEmail: req.user.email,
        trialDays: trialDays || 0,
      });

      res.json({
        success: true,
        checkoutUrl: checkoutSession.url,
        sessionId: checkoutSession.sessionId
      });
    } catch (error) {
      console.error("Error creating subscription:", error);
      res.status(500).json({
        message: "Failed to create subscription",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Cancel subscription
  app.post('/api/subscriptions/cancel', requireVerifiedAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { immediate } = req.body;

      const organization = await storage.getOrganizationByUser(userId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const subscription = await subscriptionService.getActiveSubscription(organization.id);
      if (!subscription) {
        return res.status(404).json({ message: "No active subscription found" });
      }

      await subscriptionService.cancelSubscription(subscription.id, immediate || false);

      res.json({
        success: true,
        message: immediate 
          ? "Subscription canceled immediately" 
          : "Subscription will be canceled at the end of the billing period"
      });
    } catch (error) {
      console.error("Error canceling subscription:", error);
      res.status(500).json({
        message: "Failed to cancel subscription",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get expiring credits
  app.get('/api/subscriptions/credits/expiring', requireVerifiedAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);

      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const expiringCredits = await subscriptionService.getExpiringCredits(organization.id);

      res.json(expiringCredits);
    } catch (error) {
      console.error("Error fetching expiring credits:", error);
      res.status(500).json({ message: "Failed to fetch expiring credits" });
    }
  });

  // Admin: Create Stripe subscription products
  app.post('/api/subscriptions/stripe/create-products', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);

      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      await stripeService.createSubscriptionProducts();

      res.json({
        success: true,
        message: "Stripe subscription products created successfully"
      });
    } catch (error) {
      console.error("Error creating Stripe products:", error);
      res.status(500).json({
        message: "Failed to create Stripe products",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Admin: Complete subscription system setup (one-time setup)
  app.get('/api/subscriptions/setup', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);

      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Run the complete setup
      await setupSubscriptionSystem();

      await setupCreditPackages();

      await setupRegionalPricing();

      res.json({
        success: true,
        message: "Subscription system setup completed successfully"
      });
    } catch (error) {
      console.error("Error setting up subscription system:", error);
      res.status(500).json({
        message: "Failed to setup subscription system",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get('/api/companies/team', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);
      
      if (!organization) {
        return res.json([]);
      }
      
      const members = await storage.getOrganizationMembers(organization.id);
      res.json(members);
    } catch (error) {
      console.error("Error fetching team:", error);
      res.status(500).json({ message: "Failed to fetch team" });
    }
  });

  // Public invitation lookup (no authentication required)
  app.get('/api/invitations/public/:token', async (req: any, res) => {
    try {
      const { token } = req.params;
      
      console.log(`🔍 Looking up invitation token: "${token}"`);
      
      if (!token) {
        console.log(`❌ No token provided`);
        return res.status(400).json({ message: "Token is required" });
      }

      const invitation = await storage.getInvitationByToken(token);
      console.log(`📋 Database lookup result:`, invitation ? {
        id: invitation.id,
        email: invitation.email,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        isExpired: new Date() > invitation.expiresAt
      } : 'null');
      
      if (!invitation || invitation.status !== 'pending' || new Date() > invitation.expiresAt) {
        console.log(`❌ Invalid invitation: exists=${!!invitation}, status=${invitation?.status}, expired=${invitation ? new Date() > invitation.expiresAt : 'N/A'}`);
        return res.status(404).json({ message: "Invalid or expired invitation" });
      }

      // Get organization details for the invitation
      const organization = await storage.getOrganizationById(invitation.organizationId);
      
      res.json({
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          status: invitation.status,
          expiresAt: invitation.expiresAt,
          organization: organization
        }
      });
    } catch (error) {
      console.error("Error fetching public invitation:", error);
      res.status(500).json({ message: "Failed to fetch invitation details" });
    }
  });

  app.post('/api/invitations/accept', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ message: "Invitation token is required" });
      }

      console.log(`🔄 Processing invitation acceptance for user ${userId} with token ${token}`);

      // Verify invitation is still valid
      const invitation = await storage.getInvitationByToken(token);
      if (!invitation || invitation.status !== 'pending' || new Date() > invitation.expiresAt) {
        console.log(`❌ Invalid or expired invitation token: ${token}`);
        return res.status(400).json({ message: "Invalid or expired invitation" });
      }

      // Check if user is already part of this organization
      const existingMember = await storage.getTeamMemberByUserAndOrg(userId, invitation.organizationId);
      if (existingMember) {
        console.log(`ℹ️ User ${userId} is already a member of organization ${invitation.organizationId}`);
        // Mark invitation as accepted anyway
        await storage.updateInvitationStatus(invitation.id, 'accepted');
        
        const organization = await storage.getOrganizationById(invitation.organizationId);
        return res.json({
          message: "You're already part of this team!",
          organization: {
            id: organization?.id,
            companyName: organization?.companyName
          },
          role: existingMember.role,
          alreadyMember: true
        });
      }

      // Add user to the organization team
      await storage.addTeamMember({
        organizationId: invitation.organizationId,
        userId,
        role: invitation.role,
        joinedAt: new Date()
      });

      // Mark invitation as accepted
      await storage.updateInvitationStatus(invitation.id, 'accepted');

      // Get organization details for response
      const organization = await storage.getOrganizationById(invitation.organizationId);

      console.log(`✅ Successfully added user ${userId} to organization ${invitation.organizationId} as ${invitation.role}`);

      res.json({
        message: `Successfully joined ${organization?.companyName}'s hiring team!`,
        organization: {
          id: organization?.id,
          companyName: organization?.companyName
        },
        role: invitation.role,
        newMember: true
      });

    } catch (error) {
      console.error("Error accepting invitation:", error);
      res.status(500).json({ message: "Failed to accept invitation" });
    }
  });

  app.get('/api/invitations/:token', async (req: any, res) => {
    try {
      const { token } = req.params;
      const invitation = await storage.getInvitationByToken(token);
      
      if (!invitation || invitation.status !== 'pending' || invitation.expiresAt < new Date()) {
        return res.status(404).json({ message: "Invitation not found or expired" });
      }

      const organization = await storage.getOrganizationById(invitation.organizationId);
      
      res.json({
        invitation: {
          email: invitation.email,
          role: invitation.role,
          organization: organization ? {
            id: organization.id,
            companyName: organization.companyName,
            industry: organization.industry,
          } : null,
          expiresAt: invitation.expiresAt,
        }
      });

    } catch (error) {
      console.error("Error fetching invitation:", error);
      res.status(500).json({ message: "Failed to fetch invitation details" });
    }
  });

  // Job posting routes
  app.post('/api/job-postings', requireVerifiedAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);

      if (!organization) {
        return res.status(400).json({ message: "No organization found. Please create one first." });
      }

      const jobData = insertJobSchema.parse({
        ...req.body,
        organizationId: organization.id,
        createdById: userId
      });

      const job = await storage.createJob(jobData);

      // Get organization info for Airtable sync
      const org = await storage.getOrganizationByUser(userId);
      const companyName = org?.companyName || 'Unknown Company';

      // Auto-fill job applications table with AI-enhanced information
      // const { jobApplicationsAutoFill } = await import('./jobApplicationsAutoFill');
      // jobApplicationsAutoFill.autoFillJobApplication(job, companyName)
      //   .catch(error => console.error("Error auto-filling job application:", error));

      // Index job in RAG system for search
      try {
        console.log(`📚 Indexing job ${job.id} in RAG system...`);
        const ragResult = await ragIndexingService.indexJob({
          id: job.id,
          title: job.title,
          description: job.description,
          requirements: job.requirements,
          technicalSkills: job.technicalSkills || [],
          softSkills: job.softSkills || [],
          experience: job.experienceLevel,
          employmentType: job.employmentType,
          workplaceType: job.workplaceType,
          seniorityLevel: job.seniorityLevel,
          industry: job.industry,
          location: job.location,
          organizationId: organization.id
        });

        if (ragResult.success) {
          console.log(`✅ ${ragResult.message}`);
        } else {
          console.warn(`⚠️ ${ragResult.message}`);
        }
      } catch (ragError) {
        // Log error but don't fail the job creation
        console.error("❌ Error indexing job in RAG:", ragError);
      }

      res.json(job);
    } catch (error) {
      console.error("Error creating job:", error);
      res.status(500).json({ message: "Failed to create job posting" });
    }
  });

  app.get('/api/job-postings', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);
      
      if (!organization) {
        return res.json([]);
      }
      
      const jobs = await storage.getJobsByOrganization(organization.id);
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      res.status(500).json({ message: "Failed to fetch job postings" });
    }
  });

  app.get('/api/job-postings/count', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);

      if (!organization) {
        return res.json({ active: 0 });
      }

      const count = await storage.getActiveJobsCount(organization.id);
      res.json({ active: count });
    } catch (error) {
      console.error("Error fetching job count:", error);
      res.status(500).json({ message: "Failed to fetch job count" });
    }
  });

  // Get single job by ID
  app.get('/api/job-postings/:id', requireAuth, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);

      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const job = await storage.getJobById(jobId);

      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      // Verify job belongs to user's organization
      if (job.organizationId !== organization.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(job);
    } catch (error) {
      console.error("Error fetching job:", error);
      res.status(500).json({ message: "Failed to fetch job posting" });
    }
  });

  app.put('/api/job-postings/:id', requireAuth, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const userId = req.user.id;
      const jobData = insertJobSchema.partial().parse(req.body);

      const job = await storage.updateJob(jobId, jobData);

      // Re-index updated job in RAG system
      try {
        console.log(`📚 Re-indexing job ${jobId} in RAG system after update...`);
        const organization = await storage.getOrganizationByUser(userId);
        const ragResult = await ragIndexingService.indexJob({
          id: job.id,
          title: job.title,
          description: job.description,
          requirements: job.requirements,
          technicalSkills: job.technicalSkills || [],
          softSkills: job.softSkills || [],
          experience: job.experienceLevel,
          employmentType: job.employmentType,
          workplaceType: job.workplaceType,
          seniorityLevel: job.seniorityLevel,
          industry: job.industry,
          location: job.location,
          organizationId: organization?.id
        });

        if (ragResult.success) {
          console.log(`✅ ${ragResult.message}`);
        } else {
          console.warn(`⚠️ ${ragResult.message}`);
        }
      } catch (ragError) {
        // Log error but don't fail the job update
        console.error("❌ Error re-indexing job in RAG:", ragError);
      }

      res.json(job);
    } catch (error) {
      console.error("Error updating job:", error);
      res.status(500).json({ message: "Failed to update job posting" });
    }
  });

  app.delete('/api/job-postings/:id', requireAuth, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const userId = req.user.id;
      
      console.log(`🗑️  User ${userId} attempting to delete job ${jobId}`);
      
      // Validate job ID
      if (isNaN(jobId) || jobId <= 0) {
        console.error('Invalid job ID:', req.params.id);
        return res.status(400).json({ message: "Invalid job ID" });
      }
      
      // Check if job exists and belongs to user's organization
      const job = await storage.getJobById(jobId);
      if (!job) {
        console.error('Job not found:', jobId);
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Verify user has permission to delete this job
      const organization = await storage.getOrganizationByUser(userId);
      if (!organization || job.organizationId !== organization.id) {
        console.error('User does not have permission to delete this job');
        return res.status(403).json({ message: "You don't have permission to delete this job" });
      }
      
      console.log(`✅ Job ${jobId} found and user has permission. Proceeding with deletion...`);

      // Delete from database first (mark as inactive)
      await storage.deleteJob(jobId);
      console.log(`✅ Job ${jobId} marked as inactive in database`);

      // Remove job from RAG system
      try {
        console.log(`📚 Removing job ${jobId} from RAG system...`);
        const ragResult = await ragIndexingService.removeJob(jobId);

        if (ragResult.success) {
          console.log(`✅ ${ragResult.message}`);
        } else {
          console.warn(`⚠️ ${ragResult.message}`);
        }
      } catch (ragError) {
        // Log error but don't fail the job deletion
        console.error("❌ Error removing job from RAG:", ragError);
      }

      res.json({ message: "Job deleted successfully" });
    } catch (error) {
      console.error("❌ Error deleting job:", error);
      res.status(500).json({ message: "Failed to delete job posting" });
    }
  });

  // Count endpoints for dashboard
  app.get('/api/applicants/count', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);

      if (!organization) {
        return res.json({ count: 0 });
      }

      // Use local database service instead of Airtable
      const applicants = await localDatabaseService.getAllJobApplications();
      
      // Filter to only show applicants for this organization's jobs AND exclude accepted applicants
      const organizationJobs = await storage.getJobsByOrganization(organization.id);
      const organizationJobIds = new Set(organizationJobs.map(job => job.id.toString()));
      const filteredApplicants = applicants.filter(app => 
        organizationJobIds.has(app.jobId) && app.status !== 'Accepted'
      );
      
      res.json({ count: filteredApplicants.length });
    } catch (error) {
      console.error("Error counting applicants:", error);
      res.json({ count: 0 });
    }
  });

  app.get('/api/candidates/count', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);
      
      if (!organization) {
        return res.json({ count: 0 });
      }

      // Count from job matches table (AI matched candidates)
      const matches = await localDatabaseService.getAllJobMatches();
      
      // Filter for this organization's job matches
      const organizationJobs = await storage.getJobsByOrganization(organization.id);
      const organizationJobIds = new Set(organizationJobs.map(job => job.id.toString()));
      const organizationMatches = matches.filter(match => organizationJobIds.has(match.jobId));
      
      res.json({ count: organizationMatches.length });
    } catch (error) {
      console.error("Error counting candidates:", error);
      res.json({ count: 0 });
    }
  });

  // Analytics endpoints for real data
  app.get('/api/analytics/performance', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);
      
      if (!organization) {
        return res.json([]);
      }

      // Get organization jobs
      const organizationJobs = await storage.getJobsByOrganization(organization.id);
      const organizationJobIds = new Set(organizationJobs.map(job => job.id.toString()));

      // Use local database service instead of Airtable
      const applicants = await localDatabaseService.getAllJobApplications();
      const organizationApplicants = applicants.filter(app => organizationJobIds.has(app.jobId));

      // Get interviews count
      const interviews = await storage.getAllInterviews();
      const organizationInterviews = interviews.filter(interview => {
        return organizationJobs.some(job => job.id === interview.jobId);
      });

      // Calculate monthly data based on actual data
      const now = new Date();
      const monthsData = [];
      
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = monthDate.toLocaleDateString('en-US', { month: 'short' });
        
        // For demonstration, we'll use current data divided by 6 months
        // In real app, you'd filter by actual dates
        const applications = Math.floor(organizationApplicants.length / 6);
        const interviewsCount = Math.floor(organizationInterviews.length / 6);
        const hires = Math.floor(interviewsCount * 0.4); // 40% hire rate
        
        monthsData.push({
          name: monthName,
          applications: applications + Math.floor(Math.random() * 5),
          interviews: interviewsCount + Math.floor(Math.random() * 3),
          hires: hires + Math.floor(Math.random() * 2)
        });
      }

      res.json(monthsData);
    } catch (error) {
      console.error("Error fetching performance analytics:", error);
      res.json([]);
    }
  });

  app.get('/api/analytics/sources', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);
      
      if (!organization) {
        return res.json([]);
      }

      // Get real counts
      const organizationJobs = await storage.getJobsByOrganization(organization.id);
      const organizationJobIds = new Set(organizationJobs.map(job => job.id.toString()));

      // Direct applicants - use local database service instead of Airtable
      const applicants = await localDatabaseService.getAllJobApplications();
      const directApplicants = applicants.filter(app => organizationJobIds.has(app.jobId)).length;

      // AI matched candidates
      const matches = await localDatabaseService.getAllJobMatches();
      const aiCandidates = matches.filter(match => organizationJobIds.has(match.jobId)).length;

      const sourceData = [
        { name: 'Direct Applications', value: directApplicants, color: '#3B82F6' },
        { name: 'AI Matched Candidates', value: aiCandidates, color: '#8B5CF6' },
        { name: 'Referrals', value: Math.floor(directApplicants * 0.2), color: '#10B981' },
        { name: 'Job Boards', value: Math.floor(directApplicants * 0.3), color: '#F59E0B' },
      ];

      res.json(sourceData);
    } catch (error) {
      console.error("Error fetching source analytics:", error);
      res.json([]);
    }
  });

  // Real Applicants routes - from platojobapplications table
  app.get('/api/real-applicants/:jobId?', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);
      const jobId = req.params.jobId || null;

      // Pagination parameters
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      const statusFilter = req.query.status || 'active'; // 'active', 'denied', or 'all'

      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const { applicantScoringService } = await import('./applicantScoringService');

      let applicants;
      if (jobId) {
        console.log(`Fetching pending applicants for job ${jobId}`);
        // Use local database service instead of Airtable
        applicants = await localDatabaseService.getJobApplicationsByJob(jobId);
      } else {
        console.log('Fetching all pending applicants for organization');
        // Use local database service instead of Airtable
        applicants = await localDatabaseService.getAllJobApplications();

        // Filter to only show applicants for this organization's jobs
        const organizationJobs = await storage.getJobsByOrganization(organization.id);
        const organizationJobIds = new Set(organizationJobs.map(job => job.id.toString()));
        applicants = applicants.filter(app => organizationJobIds.has(app.jobId));
      }

      // Apply status filtering
      if (statusFilter === 'active') {
        // Show only active applicants (not declined, not shortlisted, not accepted)
        applicants = applicants.filter(app =>
          app.status?.toLowerCase() !== 'declined' &&
          app.status?.toLowerCase() !== 'shortlisted' &&
          app.status?.toLowerCase() !== 'accepted'
        );
      } else if (statusFilter === 'denied') {
        // Show only declined applicants
        applicants = applicants.filter(app => app.status?.toLowerCase() === 'declined');
      }
      // If statusFilter === 'all', don't filter by status

      // DYNAMIC AI SCORING SYSTEM - ALWAYS FRESH ANALYSIS
      if (applicants.length > 0) {
        console.log(`🤖 DYNAMIC AI SCORING: Processing ${applicants.length} applicants with fresh AI analysis`);
        
        const applicantsWithScores: any[] = [];
        
        // Process each applicant with fresh AI scoring every time
        for (const app of applicants) {
          if (app.userProfile && app.jobDescription) {
            try {
              console.log(`🔍 Fresh AI scoring for: ${app.applicantName} applying for: ${app.jobTitle}`);
              
              // Use detailed AI scoring for completely fresh analysis
              const detailedScore = await applicantScoringService.scoreApplicantDetailed(
                app.userProfile,
                app.jobTitle || 'Position',
                app.jobDescription,
                app.jobDescription, // Using job description as requirements
                [] // No specific skills list yet
              );
              
              console.log(`📊 FRESH AI SCORES for ${app.applicantName}:`);
              console.log(`   Overall: ${detailedScore.overallMatch}%`);
              console.log(`   Technical: ${detailedScore.technicalSkills}%`);
              console.log(`   Experience: ${detailedScore.experience}%`);
              console.log(`   Cultural: ${detailedScore.culturalFit}%`);
              console.log(`   Summary: ${detailedScore.summary}`);
              
              // Add to final list with fresh scores (no database caching)
              applicantsWithScores.push({
                ...app,
                matchScore: detailedScore.overallMatch,
                matchSummary: detailedScore.summary,
                technicalSkillsScore: detailedScore.technicalSkills,
                experienceScore: detailedScore.experience,
                culturalFitScore: detailedScore.culturalFit
              });
              
            } catch (scoringError) {
              console.error(`❌ SCORING ERROR for ${app.applicantName}:`, scoringError);
              
              // Add with error score on failure
              applicantsWithScores.push({
                ...app,
                matchScore: 0,
                matchSummary: 'Error during AI scoring - manual review required',
                technicalSkillsScore: 0,
                experienceScore: 0,
                culturalFitScore: 0
              });
            }
          } else {
            // No profile data - cannot score
            console.log(`⚠️  ${app.applicantName}: Missing profile/job data - cannot score`);
            applicantsWithScores.push({
              ...app,
              matchScore: 0,
              matchSummary: 'Insufficient data for AI scoring',
              technicalSkillsScore: 0,
              experienceScore: 0,
              culturalFitScore: 0
            });
          }
        }
        
        // All applicants now have dynamic scores
        applicants = applicantsWithScores;
        console.log(`🎯 DYNAMIC RESULT: ${applicants.length} applicants with fresh AI scores`);
        
        // Log fresh scoring status
        applicants.forEach(app => {
          console.log(`📊 ${app.applicantName}: Fresh AI score = ${app.matchScore}% (DYNAMIC ANALYSIS)`);
        });
      }

      // Sort by match score (highest first)
      applicants.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

      // Fetch job matches to get assessment responses
      const jobIds = Array.from(new Set(applicants.map(app => app.jobId)));
      const jobMatches = await localDatabaseService.getJobMatchesByJobIds(jobIds);

      // Create a map of jobId+userId -> assessmentResponses
      const assessmentResponsesMap = new Map<string, any>();
      for (const match of jobMatches) {
        if (match.assessmentResponses) {
          const key = `${match.jobId}_${match.userId}`;
          assessmentResponsesMap.set(key, match.assessmentResponses);
        }
      }

      applicants = applicants.map(app => {
        // Look up assessment responses for this applicant
        const assessmentKey = `${app.jobId}_${app.applicantUserId}`;
        const assessmentResponses = assessmentResponsesMap.get(assessmentKey) || null;

        return {
          ...app,
          name: app.applicantName,
          email: app.applicantEmail,
          assessmentResponses,
        };
      });

      // Apply pagination
      const totalCount = applicants.length;
      const paginatedApplicants = applicants.slice(offset, offset + limit);
      const totalPages = Math.ceil(totalCount / limit);

      // Return paginated response with metadata
      res.json({
        data: paginatedApplicants,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      });
    } catch (error) {
      console.error("Error fetching real applicants:", error);
      res.status(500).json({ message: "Failed to fetch applicants" });
    }
  });

  // Original Applicants routes (now for platojobapplications table) - UPDATED WITH BRUTAL AI SCORING
  // Supports ?status=shortlisted|accepted|denied|applied&jobId=123 filters
  app.get('/api/applicants', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);
      const { status, jobId } = req.query; // Optional status and jobId filters

      if (!organization) {
        return res.json([]);
      }

      let applicants = await localDatabaseService.getJobApplicationsFiltered({
        organizationId: organization.id,
        jobId: jobId as string | undefined,
        status: status as string | undefined
      });

      res.json(applicants);
    } catch (error) {
      console.error("Error fetching applicants:", error);
      res.status(500).json({ message: "Failed to fetch applicants" });
    }
  });

  // Get single applicant by ID
  app.get('/api/applicants/detail/:applicantId', requireAuth, async (req: any, res) => {
    try {
      const applicantId = req.params.applicantId;
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);

      if (!organization) {
        return res.status(403).json({ message: "Organization not found" });
      }

      // Get the applicant from local database
      const applicant = await localDatabaseService.getJobApplication(applicantId);

      if (!applicant) {
        return res.status(404).json({ message: "Applicant not found" });
      }

      // Get the scored data if available
      const allScoredApplicants = await storage.getScoredApplicantsByOrganization(organization.id);
      const scoredData = allScoredApplicants.find(s => s.applicantId === applicantId);

      // Parse userProfile to extract structured data
      let parsedProfile: any = {};
      if (applicant.userProfile) {
        const profile = typeof applicant.userProfile === 'string'
          ? JSON.parse(applicant.userProfile)
          : applicant.userProfile;

        parsedProfile = {
          name: profile.name || profile.fullName || applicant.applicantName,
          email: profile.email || applicant.applicantEmail,
          phone: profile.phone || profile.phoneNumber,
          location: profile.location || profile.city,
          summary: profile.summary || profile.professionalSummary || profile.objective,
          skills: profile.skills || profile.technicalSkills || [],
          experience: profile.experience || profile.workExperience || [],
          education: profile.education || [],
          certifications: profile.certifications || profile.certificates || [],
          languages: profile.languages || [],
        };
      }

      // Check if there's a matching resume profile with detailed analysis
      let fullResponse = null;
      try {
        // Try to find a resume profile that matches this applicant by email
        const resumeProfiles = await storage.getResumeProfilesByOrganization(organization.id.toString());
        const matchingProfile = resumeProfiles.find(
          p => p.email?.toLowerCase() === applicant.applicantEmail?.toLowerCase()
        );

        if (matchingProfile) {
          // Get job scores for this profile
          const jobScores = await storage.getJobScoresByProfile(matchingProfile.id);
          const matchingJobScore = jobScores.find(js => js.jobId?.toString() === applicant.jobId);

          if (matchingJobScore?.fullResponse) {
            fullResponse = matchingJobScore.fullResponse;
          }
        }
      } catch (e) {
        console.log('Could not fetch resume profile for detailed analysis:', e);
      }

      // Parse generatedProfile if available
      let generatedProfile: any = null;
      if (applicant.generatedProfile) {
        generatedProfile = typeof applicant.generatedProfile === 'string'
          ? JSON.parse(applicant.generatedProfile)
          : applicant.generatedProfile;
      }

      // Get interview video URL and transcription from application's session
      let interviewVideoUrl = null;
      let interviewTranscription = null;
      if (applicant.sessionId) {
        try {
          const { interviewSessions } = await import('@shared/schema');
          const [session] = await db.select()
            .from(interviewSessions)
            .where(eq(interviewSessions.id, applicant.sessionId));

          if (session?.interviewVideoUrl) {
            interviewVideoUrl = session.interviewVideoUrl;
          }

          // Extract transcription from session data
          if (session?.sessionData?.responses) {
            interviewTranscription = session.sessionData.responses;
          } else if (session?.sessionData?.conversation) {
            // Handle different data structure
            interviewTranscription = session.sessionData.conversation;
          }
        } catch (videoError) {
          console.warn('Could not fetch interview video or transcription:', videoError);
        }
      }

      const enrichedApplicant = {
        ...applicant,
        // Basic info
        name: parsedProfile.name || applicant.applicantName,
        email: parsedProfile.email || applicant.applicantEmail,
        phone: parsedProfile.phone,
        location: parsedProfile.location,
        summary: generatedProfile?.summary || parsedProfile.summary,

        // Structured data from profile
        skills: generatedProfile?.skills?.length > 0 ? generatedProfile.skills : parsedProfile.skills,
        experience: generatedProfile?.experience?.length > 0 ? generatedProfile.experience : parsedProfile.experience,
        education: parsedProfile.education,
        certifications: parsedProfile.certifications,
        languages: parsedProfile.languages,

        // Score data - prefer generatedProfile scores if available
        matchScore: generatedProfile?.matchScorePercentage || scoredData?.matchScore || (applicant as any).matchScore,
        matchSummary: generatedProfile?.summary || scoredData?.matchSummary || (applicant as any).matchSummary,
        technicalSkillsScore: generatedProfile?.techSkillsPercentage || scoredData?.technicalSkillsScore,
        experienceScore: generatedProfile?.experiencePercentage || scoredData?.experienceScore,
        culturalFitScore: generatedProfile?.culturalFitPercentage || scoredData?.culturalFitScore,

        // AI Generated Profile data
        generatedProfile: generatedProfile,
        hireRecommendation: generatedProfile?.hireRecommendation,
        strengths: generatedProfile?.strengths,
        careerGoals: generatedProfile?.careerGoals,
        workStyle: generatedProfile?.workStyle,
        personality: generatedProfile?.personality,
        jobMatch: generatedProfile?.jobMatch,
        brutallyHonestProfile: generatedProfile?.brutallyHonestProfile,

        // Detailed analysis (if available from resume profile)
        fullResponse: fullResponse,

        // Interview video URL and transcription
        interviewVideoUrl: interviewVideoUrl,
        interviewTranscription: interviewTranscription,
      };

      res.json(enrichedApplicant);
    } catch (error) {
      console.error("Error fetching applicant details:", error);
      res.status(500).json({ message: "Failed to fetch applicant details" });
    }
  });

  app.get('/api/applicants/:jobId', requireAuth, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const { applicantsAirtableService } = await import('./applicantsAirtableService');
      const applicants = await applicantsAirtableService.getApplicantsForJob(jobId);
      res.json(applicants);
    } catch (error) {
      console.error("Error fetching job applicants:", error);
      res.status(500).json({ message: "Failed to fetch job applicants" });
    }
  });

  app.post('/api/applicants/:id/accept', requireAuth, async (req: any, res) => {
    try {
      const applicantId = req.params.id;
      await localDatabaseService.updateJobApplication(applicantId, { status: 'accepted' });
      res.json({ message: "Applicant accepted successfully" });
    } catch (error) {
      console.error("Error accepting applicant:", error);
      res.status(500).json({ message: "Failed to accept applicant" });
    }
  });

  app.post('/api/applicants/:id/decline', requireAuth, async (req: any, res) => {
    try {
      const applicantId = req.params.id;
      await localDatabaseService.updateJobApplication(applicantId, { status: 'declined' });
      res.json({ message: "Applicant declined successfully" });
    } catch (error) {
      console.error("Error declining applicant:", error);
      res.status(500).json({ message: "Failed to decline applicant" });
    }
  });

  // Alias for deny (same as decline)
  app.post('/api/applicants/:id/deny', requireAuth, async (req: any, res) => {
    try {
      const applicantId = req.params.id;
      await localDatabaseService.updateJobApplication(applicantId, { status: 'denied' });
      res.json({ message: "Applicant denied successfully" });
    } catch (error) {
      console.error("Error denying applicant:", error);
      res.status(500).json({ message: "Failed to deny applicant" });
    }
  });

  // Shortlist an applicant
  app.post('/api/applicants/:id/shortlist', requireAuth, async (req: any, res) => {
    try {
      const applicantId = req.params.id;
      await localDatabaseService.updateJobApplication(applicantId, { status: 'shortlisted' });
      res.json({ message: "Applicant shortlisted successfully" });
    } catch (error) {
      console.error("Error shortlisting applicant:", error);
      res.status(500).json({ message: "Failed to shortlist applicant" });
    }
  });

  // Get detailed user profile by userId from Airtable
  app.get('/api/user-profile/:userId', requireAuth, async (req: any, res) => {
    try {
      const userId = req.params.userId;
      console.log(`🔍 Fetching detailed profile for user ID: ${userId}`);
      
      // Get user profile from platouserprofiles table
      const { UserProfilesAirtableService } = await import('./userProfilesAirtableService');
      const AIRTABLE_API_KEY = 'pat770a3TZsbDther.a2b72657b27da4390a5215e27f053a3f0a643d66b43168adb6817301ad5051c0';
      const userProfilesService = new UserProfilesAirtableService(AIRTABLE_API_KEY);
      const userProfile = await userProfilesService.getUserProfileByUserId(userId);
      
      if (!userProfile) {
        console.log(`❌ User profile not found for ID: ${userId}`);
        return res.status(404).json({ message: "User profile not found" });
      }
      
      console.log(`✅ Found user profile for ${userProfile.name || 'Unknown'}`);
      res.json(userProfile);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Failed to fetch user profile" });
    }
  });

  app.post('/api/applicants/:id/schedule-interview', requireAuth, async (req: any, res) => {
    try {
      const applicantId = req.params.id;
      const { jobId, scheduledDate, scheduledTime, interviewType, meetingLink, notes } = req.body;
      const userId = req.user.id;

      const interviewData = {
        jobId,
        candidateId: applicantId,
        candidateName: `Applicant ${applicantId}`,
        scheduledDate,
        scheduledTime,
        interviewType,
        meetingLink,
        notes,
        scheduledBy: userId
      };

      const interview = await storage.createInterview(interviewData);
      res.json(interview);
    } catch (error) {
      console.error("Error scheduling interview:", error);
      res.status(500).json({ message: "Failed to schedule interview" });
    }
  });

  // Generate offer letter for applicant
  app.post('/api/applicants/:id/generate-offer-letter', requireAuth, async (req: any, res) => {
    try {
      const applicantId = req.params.id;
      const { customMessage } = req.body;
      const userId = req.user.id;

      console.log(`📝 Generating AI offer letter for applicant ${applicantId}...`);
      console.log(`Custom message provided: ${customMessage ? 'Yes' : 'No'}`);

      // Get applicant details
      const application = await localDatabaseService.getJobApplication(applicantId);
      if (!application) {
        console.error(`❌ Applicant ${applicantId} not found`);
        return res.status(404).json({ message: "Applicant not found" });
      }

      // Get job details
      const job = await storage.getJob(application.jobId);
      if (!job) {
        console.error(`❌ Job ${application.jobId} not found`);
        return res.status(404).json({ message: "Job not found" });
      }

      // Get organization details from user
      const organization = await storage.getOrganizationByUser(userId);
      if (!organization) {
        console.error(`❌ Organization not found for user ${userId}`);
        return res.status(404).json({ message: "Organization not found" });
      }

      // Extract applicant profile data
      const applicantName = application.applicantName || 'Candidate';
      const jobTitle = application.jobTitle || job.title;
      const companyName = organization.companyName || 'Our Company';
      const location = job.location || 'Not specified';
      const employmentType = job.employmentType || 'Full-time';
      const workplaceType = job.workplaceType || 'On-site';
      const salaryRange = job.salaryRange || (job.salaryMin && job.salaryMax ? `$${job.salaryMin.toLocaleString()} - $${job.salaryMax.toLocaleString()}` : 'Competitive compensation');
      const benefits = job.benefits || [];

      // Parse applicant profile for AI personalization
      let applicantSkills = [];
      let applicantExperience = '';
      try {
        const generatedProfile = typeof application.generatedProfile === 'string'
          ? JSON.parse(application.generatedProfile)
          : application.generatedProfile;

        if (generatedProfile) {
          applicantSkills = generatedProfile.skills || [];
          if (generatedProfile.strengths && generatedProfile.strengths.length > 0) {
            applicantExperience = generatedProfile.strengths.join(', ');
          }
        }
      } catch (e) {
        console.log('Note: Could not parse applicant profile for personalization');
      }

      console.log(`🤖 Using AI to generate personalized offer letter...`);

      let offerText = '';
      try {
        offerText = await generateOfferLetter({
          applicantName,
          jobTitle,
          companyName,
          location,
          employmentType,
          workplaceType,
          salaryRange,
          benefits,
          customMessage,
          applicantSkills,
          applicantExperience
        });

        console.log(`✅ AI-generated offer letter created (${offerText.length} characters)`);
      } catch (aiError) {
        console.error('⚠️  AI generation failed, falling back to template:', aiError);

        // Fallback to template-based generation
        offerText = `Dear ${applicantName},

We are delighted to offer you the position of ${jobTitle} at ${companyName}.`;

        if (customMessage) {
          offerText += `\n\n${customMessage}`;
        }

        offerText += `\n\nPOSITION DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Role: ${jobTitle}
Location: ${location}
Employment Type: ${employmentType}
Workplace: ${workplaceType}
Compensation: ${salaryRange}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

        if (benefits.length > 0) {
          offerText += `\n\nBENEFITS:`;
          benefits.forEach((benefit: string) => {
            offerText += `\n• ${benefit}`;
          });
        }

        offerText += `\n\nNEXT STEPS:
Please review this offer carefully. Our HR team will contact you soon with formal documentation and additional details about the onboarding process.

We're excited about the possibility of you joining our team and look forward to your response!

Best regards,
${companyName} Hiring Team

---
This is a preliminary offer. A formal offer letter with complete terms will follow.`;
      }

      // Ensure offerText is not empty
      if (!offerText || offerText.trim().length === 0) {
        throw new Error('Generated offer text is empty');
      }

      const response = {
        offerText: offerText.trim(),
        applicantName,
        jobTitle,
        companyName
      };

      console.log(`✅ Offer letter response prepared:`, {
        offerTextLength: response.offerText.length,
        applicantName: response.applicantName,
        jobTitle: response.jobTitle
      });

      res.json(response);

    } catch (error) {
      console.error("❌ Error generating offer letter:", error);
      res.status(500).json({
        message: "Failed to generate offer letter",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Send offer letter email to applicant
  app.post('/api/applicants/:id/send-offer-letter', requireAuth, async (req: any, res) => {
    try {
      const applicantId = req.params.id;
      const { offerContent, subject } = req.body;
      const userId = req.user.id;

      console.log(`📧 Sending offer letter to applicant ${applicantId}...`);

      // Validate offer content is provided
      if (!offerContent || offerContent.trim().length === 0) {
        return res.status(400).json({ message: "Offer content is required" });
      }

      // Get applicant details
      const application = await localDatabaseService.getJobApplication(applicantId);
      if (!application) {
        return res.status(404).json({ message: "Applicant not found" });
      }

      if (!application.applicantEmail) {
        return res.status(400).json({ message: "Applicant has no email address" });
      }

      // Get job details
      const job = await storage.getJob(application.jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      // Get organization details from user
      const organization = await storage.getOrganizationByUser(userId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const applicantName = application.applicantName || 'Candidate';
      const jobTitle = application.jobTitle || job.title;
      const companyName = organization.companyName || 'Our Company';
      const salaryRange = job.salaryRange || (job.salaryMin && job.salaryMax ? `$${job.salaryMin.toLocaleString()} - $${job.salaryMax.toLocaleString()}` : undefined);

      // Create offer letter record in database
      const sentAt = new Date();
      const offerLetterId = crypto.randomUUID();

      try {
        await db.insert(offerLetters).values({
          id: offerLetterId,
          applicantId,
          jobId: application.jobId,
          organizationId: organization.id,
          offerContent,
          position: jobTitle,
          salary: salaryRange,
          recipientEmail: application.applicantEmail,
          recipientName: applicantName,
          status: 'sent',
          sentAt,
          sentBy: userId,
        });
        console.log(`✅ Offer letter record created in database: ${offerLetterId}`);
      } catch (dbError) {
        console.error('❌ Error creating offer letter record:', dbError);
        // Continue anyway - email is more important
      }

      // Send email
      try {
        const emailSent = await emailService.sendOfferLetterEmail({
          recipientEmail: application.applicantEmail,
          recipientName: applicantName,
          companyName,
          jobTitle,
          offerContentText: offerContent,
        });

        if (emailSent) {
          console.log(`✅ Offer letter email sent successfully to ${application.applicantEmail}`);
        } else {
          console.warn(`⚠️ Failed to send offer letter email to ${application.applicantEmail}`);
        }
      } catch (emailError) {
        console.error(`❌ Error sending offer letter email:`, emailError);
        // Continue with response even if email fails
      }

      res.json({
        success: true,
        message: "Offer letter sent successfully",
        sentAt: sentAt.toISOString()
      });

    } catch (error) {
      console.error("❌ Error sending offer letter:", error);
      res.status(500).json({ message: "Failed to send offer letter" });
    }
  });

  app.patch('/api/real-applicants/:id/score', requireAuth, async (req: any, res) => {
    try {
      const applicantId = req.params.id;
      const { matchScore, matchSummary, componentScores } = req.body;
      
      console.log(`🔄 Updating applicant ${applicantId} with comprehensive analysis...`);
      console.log(`📊 Overall Score: ${matchScore}%`);
      console.log(`🔄 Request body:`, { matchScore, matchSummary: matchSummary?.substring(0, 50) + '...', componentScores });
      
      // Update score using local database service instead of Airtable
      console.log(`🔄 Calling updateJobApplicationStatus with comprehensive data...`);
      // Note: We may need to extend the localDatabaseService to handle scoring updates
      // For now, we'll update the application status
      try {
        await localDatabaseService.updateJobApplication(applicantId, {
          status: 'scored',
          // Add scoring data if the schema supports it
          ...(matchScore !== undefined && { matchScore }),
          ...(matchSummary && { matchSummary })
        } as any);
      } catch (error) {
        console.warn('⚠️ Could not update application with scoring data, this may require schema extension:', error);
      }
      
      console.log(`✅ Successfully updated applicant ${applicantId} with all analysis data`);
      
      res.json({ 
        success: true, 
        message: "Applicant analysis updated successfully",
        matchScore,
        matchSummary,
        componentScores
      });
    } catch (error) {
      console.error("❌ Error updating applicant analysis:", error);
      console.error("❌ Error details:", error.message);
      console.error("❌ Error stack:", error.stack);
      res.status(500).json({ message: "Failed to update applicant analysis", error: error.message });
    }
  });

  // AI-powered job content generation
  app.post('/api/ai/generate-description', requireAuth, async (req: any, res) => {
    try {
      console.log("🤖 AI Generate Description Request:", {
        userId: req.user?.id,
        isAuthenticated: req.isAuthenticated?.(),
        body: req.body
      });

      const { 
        jobTitle, 
        companyName, 
        location, 
        employmentType, 
        workplaceType, 
        seniorityLevel, 
        industry, 
        certifications, 
        languagesRequired 
      } = req.body;

      if (!jobTitle) {
        return res.status(400).json({ message: "Job title is required" });
      }
      
      console.log("🔄 Calling generateJobDescription with:", { jobTitle, companyName, location });
      
      const description = await generateJobDescription(
        jobTitle, 
        companyName, 
        location, 
        {
          employmentType,
          workplaceType,
          seniorityLevel,
          industry,
          certifications,
          languagesRequired
        }
      );
      
      console.log("✅ Generated description successfully");
      res.json({ description });
    } catch (error) {
      console.error("❌ Error generating description:", error);
      console.error("❌ Error stack:", error.stack);
      res.status(500).json({ message: "Failed to generate job description", error: error.message });
    }
  });

  app.post('/api/ai/generate-requirements', requireAuth, async (req: any, res) => {
    try {
      console.log("🤖 AI Generate Requirements Request:", {
        userId: req.user?.id,
        isAuthenticated: req.isAuthenticated?.(),
        body: req.body
      });

      const { 
        jobTitle, 
        description, 
        employmentType, 
        workplaceType, 
        seniorityLevel, 
        industry, 
        certifications, 
        languagesRequired 
      } = req.body;

      if (!jobTitle) {
        return res.status(400).json({ message: "Job title is required" });
      }
      
      console.log("🔄 Calling generateJobRequirements with:", { jobTitle, description: description?.substring(0, 50) + "..." });
      
      const requirements = await generateJobRequirements(
        jobTitle, 
        description, 
        {
          employmentType,
          workplaceType,
          seniorityLevel,
          industry,
          certifications,
          languagesRequired
        }
      );
      
      console.log("✅ Generated requirements successfully");
      res.json({ requirements });
    } catch (error) {
      console.error("❌ Error generating requirements:", error);
      console.error("❌ Error stack:", error.stack);
      res.status(500).json({ message: "Failed to generate job requirements", error: error.message });
    }
  });

  app.post('/api/ai/extract-skills', requireAuth, async (req: any, res) => {
    try {
      const { jobTitle, jobDescription } = req.body;
      const skills = await extractTechnicalSkills(jobTitle, jobDescription || "");
      res.json({ skills });
    } catch (error) {
      console.error("Error extracting skills:", error);
      res.status(500).json({ message: "Failed to extract technical skills" });
    }
  });



  app.post('/api/ai/generate-employer-questions', requireAuth, async (req: any, res) => {
    try {
      const { jobTitle, jobDescription, requirements } = req.body;
      
      if (!jobTitle) {
        return res.status(400).json({ message: "Job title is required" });
      }

      const { generateEmployerQuestions } = await import('./openai');
      const questions = await generateEmployerQuestions(jobTitle, jobDescription, requirements);
      res.json({ questions });
    } catch (error) {
      console.error("Error generating employer questions:", error);
      res.status(500).json({ message: "Failed to generate employer questions" });
    }
  });

  // Enhanced authentication routes for automatic team joining
  app.get('/auth/signup', (req: any, res) => {
    const { invite, org, role } = req.query;
    if (invite && org && role) {
      // Store invitation parameters in session for post-signup processing
      req.session.pendingInvitation = { token: invite, organizationId: org, role };
      console.log(`🔗 Stored pending invitation for post-signup: org=${org}, role=${role}`);
    }
    // Redirect to main app which will handle Replit Auth signup
    res.redirect('/');
  });

  app.get('/auth/signin', (req: any, res) => {
    const { invite, org, role } = req.query;
    if (invite && org && role) {
      // Store invitation parameters in session for post-signin processing
      req.session.pendingInvitation = { token: invite, organizationId: org, role };
      console.log(`🔗 Stored pending invitation for post-signin: org=${org}, role=${role}`);
    }
    // Redirect to main app which will handle Replit Auth signin
    res.redirect('/');
  });

  // Shortlisted Applicants endpoints
  // Now updates the status field in airtableJobApplications instead of creating separate record
  app.post('/api/shortlisted-applicants', requireAuth, async (req: any, res) => {
    try {
      const { applicantId } = req.body;

      // Get the applicant to check current status
      const applicant = await localDatabaseService.getJobApplication(applicantId);
      if (!applicant) {
        return res.status(404).json({ message: "Applicant not found" });
      }

      // Check if already shortlisted
      if (applicant.status === 'shortlisted') {
        return res.status(400).json({ message: "Applicant already shortlisted for this job" });
      }

      // Update status to 'shortlisted'
      await localDatabaseService.updateJobApplication(applicantId, { status: 'shortlisted' });

      console.log(`✅ Updated applicant ${applicantId} status to 'shortlisted'`);
      res.json({ success: true, message: "Applicant shortlisted successfully" });
    } catch (error) {
      console.error("Error adding to shortlist:", error);
      res.status(500).json({ message: "Failed to add to shortlist" });
    }
  });
  
  app.get('/api/shortlisted-applicants', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);

      if (!organization) {
        return res.json([]);
      }

      console.log("🌟 Fetching shortlisted applicants by status from airtableJobApplications...");

      // Get all job applications and filter by status = 'shortlisted'
      const allApplicants = await localDatabaseService.getAllJobApplications();

      // Get organization's jobs to filter by
      const organizationJobs = await storage.getJobsByOrganization(organization.id);
      const organizationJobIds = new Set(organizationJobs.map(job => job.id.toString()));

      // Filter by organization's jobs and status = 'shortlisted'
      const shortlistedApplicants = allApplicants.filter((app: any) =>
        organizationJobIds.has(app.jobId?.toString()) && app.status === 'shortlisted'
      );

      console.log(`✅ Found ${shortlistedApplicants.length} shortlisted applicants by status`);

      // Transform to expected format
      const enrichedApplicants = shortlistedApplicants.map((app: any) => ({
        id: app.id,
        applicantId: app.id,
        applicantName: app.applicantName,
        name: app.applicantName || 'Unknown Applicant',
        email: app.applicantEmail || app.email || 'No email available',
        jobTitle: app.jobTitle,
        jobId: app.jobId,
        note: app.note || null,
        appliedDate: app.applicationDate,
        dateShortlisted: app.updatedAt || app.createdAt,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
        applicantUserId: app.applicantUserId,
        userProfile: app.userProfile,
        companyName: app.companyName,
        jobDescription: app.jobDescription,
        matchScore: app.matchScore || app.savedMatchScore,
        matchSummary: app.matchSummary || app.savedMatchSummary,
        technicalSkillsScore: app.technicalSkillsScore,
        experienceScore: app.experienceScore,
        culturalFitScore: app.culturalFitScore,
      }));

      res.json(enrichedApplicants);
    } catch (error) {
      console.error("❌ Error fetching shortlisted applicants:", error);
      res.status(500).json({ message: "Failed to fetch shortlisted applicants" });
    }
  });
  
  app.delete('/api/shortlisted-applicants/:id', requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.removeFromShortlist(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing from shortlist:", error);
      res.status(500).json({ message: "Failed to remove from shortlist" });
    }
  });
  
  app.get('/api/shortlisted-applicants/check/:applicantId/:jobId', requireAuth, async (req: any, res) => {
    try {
      const { applicantId } = req.params;

      // Check status from the main applicant record
      const applicant = await localDatabaseService.getJobApplication(applicantId);
      const isShortlisted = applicant?.status === 'shortlisted';

      res.json({ isShortlisted });
    } catch (error) {
      console.error("Error checking shortlist status:", error);
      res.status(500).json({ message: "Failed to check shortlist status" });
    }
  });

  // Post-authentication hook to automatically process pending invitations
  app.post('/api/auth/process-pending-invitation', requireAuth, async (req: any, res) => {
    try {
      const pendingInvitation = req.session.pendingInvitation;
      if (!pendingInvitation) {
        return res.json({ success: true, message: "No pending invitation" });
      }

      console.log(`🔄 Processing pending invitation:`, pendingInvitation);
      
      const { token, organizationId, role } = pendingInvitation;
      const userId = req.user.id;

      // Verify invitation is still valid
      const invitation = await storage.getInvitationByToken(token);
      if (!invitation || invitation.status !== 'pending' || new Date() > invitation.expiresAt) {
        console.log(`❌ Invalid or expired invitation token: ${token}`);
        delete req.session.pendingInvitation;
        return res.status(400).json({ message: "Invalid or expired invitation" });
      }

      // Check if user is already part of this organization
      const existingMember = await storage.getTeamMemberByUserAndOrg(userId, parseInt(organizationId));
      if (existingMember) {
        console.log(`ℹ️ User ${userId} is already a member of organization ${organizationId}`);
        delete req.session.pendingInvitation;
        return res.json({ success: true, message: "Already a team member" });
      }

      // Add user to the organization team
      await storage.addTeamMember({
        organizationId: parseInt(organizationId),
        userId,
        role,
        joinedAt: new Date()
      });

      // Mark invitation as accepted
      await storage.updateInvitationStatus(invitation.id, 'accepted');

      console.log(`✅ Successfully added user ${userId} to organization ${organizationId} as ${role}`);
      delete req.session.pendingInvitation;

      res.json({
        success: true,
        message: "Successfully joined team!",
        organizationId: parseInt(organizationId),
        role
      });

    } catch (error) {
      console.error("Error processing pending invitation:", error);
      res.status(500).json({ message: "Failed to process invitation" });
    }
  });


  const formatProfileForDisplay = (profileData: any): string => {
    if (!profileData) {
      return 'No profile data available';
    }

    const profile = typeof profileData === 'string' ? JSON.parse(profileData) : profileData;
    
    // Check if this is a brutally honest profile with the new structure
    return formatBrutallyHonestProfile(profile.brutallyHonestProfile);
  }

  const formatBrutallyHonestProfile = (profile: any): string =>  {
    if (!profile) return 'No profile data available';

    // Check if this is version 2 format
    if (profile.version === 2) {
      return formatBrutallyHonestProfileV2(profile);
    }

    // Check if this is the new structured format (version 1)
    const isNewFormat = profile.meta && profile.scores;

    if (isNewFormat) {
      return formatNewStructuredProfile(profile);
    } else {
      return formatLegacyProfile(profile);
    }
  };

  const formatBrutallyHonestProfileV2 = (profile: any): string => {
    let formatted = '';

    // Header
    formatted += '# 🔍 **BRUTALLY HONEST CANDIDATE ASSESSMENT v2**\n\n';

    // Meta Profile Overview
    if (profile.meta_profile_overview) {
      const meta = profile.meta_profile_overview;
      formatted += `## 📋 **PROFILE OVERVIEW**\n`;
      if (meta.headline) {
        formatted += `• **Headline:** ${meta.headline}\n`;
      }
      if (meta.one_line_summary) {
        formatted += `• **Summary:** ${meta.one_line_summary}\n`;
      }
      if (meta.key_highlights && Array.isArray(meta.key_highlights)) {
        formatted += `• **Key Highlights:**\n`;
        meta.key_highlights.forEach((highlight: string) => {
          formatted += `  - ${highlight}\n`;
        });
      }
      if (meta.key_watchouts && Array.isArray(meta.key_watchouts)) {
        formatted += `• **Key Watchouts:**\n`;
        meta.key_watchouts.forEach((watchout: string) => {
          formatted += `  - ${watchout}\n`;
        });
      }
      formatted += '\n';
    }

    // Identity and Background
    if (profile.identity_and_background) {
      const identity = profile.identity_and_background;
      formatted += `## 👤 **IDENTITY & BACKGROUND**\n`;
      if (identity.full_name) formatted += `• **Name:** ${identity.full_name}\n`;
      if (identity.city && identity.country) {
        formatted += `• **Location:** ${identity.city}, ${identity.country}\n`;
      }
      if (identity.primary_role) formatted += `• **Primary Role:** ${identity.primary_role}\n`;
      if (identity.seniority_level) formatted += `• **Seniority Level:** ${identity.seniority_level}\n`;
      if (identity.years_of_experience) formatted += `• **Years of Experience:** ${identity.years_of_experience}\n`;
      if (identity.brief_background_summary) {
        formatted += `• **Background:** ${identity.brief_background_summary}\n`;
      }
      formatted += '\n';
    }

    // Career Story
    if (profile.career_story) {
      const career = profile.career_story;
      formatted += `## 📈 **CAREER STORY**\n`;
      if (career.narrative) {
        formatted += `• **Career Narrative:** ${career.narrative}\n`;
      }
      if (career.key_milestones && Array.isArray(career.key_milestones)) {
        formatted += `• **Key Milestones:**\n`;
        career.key_milestones.forEach((milestone: string) => {
          formatted += `  - ${milestone}\n`;
        });
      }
      if (career.representative_achievements && Array.isArray(career.representative_achievements)) {
        formatted += `• **Representative Achievements:**\n`;
        career.representative_achievements.forEach((achievement: string) => {
          formatted += `  - ${achievement}\n`;
        });
      }
      formatted += '\n';
    }

    // Skills and Capabilities
    if (profile.skills_and_capabilities) {
      const skills = profile.skills_and_capabilities;
      formatted += `## 🛠️ **SKILLS & CAPABILITIES**\n`;
      if (skills.core_hard_skills && Array.isArray(skills.core_hard_skills)) {
        formatted += `• **Core Hard Skills:** ${skills.core_hard_skills.join(', ')}\n`;
      }
      if (skills.tools_and_technologies && Array.isArray(skills.tools_and_technologies)) {
        formatted += `• **Tools & Technologies:** ${skills.tools_and_technologies.join(', ')}\n`;
      }
      if (skills.soft_skills_and_behaviors && Array.isArray(skills.soft_skills_and_behaviors)) {
        formatted += `• **Soft Skills & Behaviors:** ${skills.soft_skills_and_behaviors.join(', ')}\n`;
      }
      if (skills.strengths_summary) {
        formatted += `• **Strengths Summary:** ${skills.strengths_summary}\n`;
      }
      if (skills.notable_gaps_or_limits && Array.isArray(skills.notable_gaps_or_limits)) {
        formatted += `• **Notable Gaps/Limits:**\n`;
        skills.notable_gaps_or_limits.forEach((gap: string) => {
          formatted += `  - ${gap}\n`;
        });
      }
      formatted += '\n';
    }

    // Personality and Values
    if (profile.personality_and_values) {
      const personality = profile.personality_and_values;
      formatted += `## 🧠 **PERSONALITY & VALUES**\n`;
      if (personality.personality_summary) {
        formatted += `• **Personality Summary:** ${personality.personality_summary}\n`;
      }
      if (personality.values_and_what_matters && Array.isArray(personality.values_and_what_matters)) {
        formatted += `• **Values & What Matters:**\n`;
        personality.values_and_what_matters.forEach((value: string) => {
          formatted += `  - ${value}\n`;
        });
      }
      if (personality.response_to_stress_and_feedback) {
        formatted += `• **Response to Stress & Feedback:** ${personality.response_to_stress_and_feedback}\n`;
      }
      if (personality.decision_making_style) {
        formatted += `• **Decision Making Style:** ${personality.decision_making_style}\n`;
      }
      formatted += '\n';
    }

    // Work Style and Collaboration
    if (profile.work_style_and_collaboration) {
      const work = profile.work_style_and_collaboration;
      formatted += `## 💼 **WORK STYLE & COLLABORATION**\n`;
      if (work.day_to_day_work_style) {
        formatted += `• **Day-to-Day Work Style:** ${work.day_to_day_work_style}\n`;
      }
      if (work.team_and_collaboration_style) {
        formatted += `• **Team & Collaboration Style:** ${work.team_and_collaboration_style}\n`;
      }
      if (work.communication_style) {
        formatted += `• **Communication Style:** ${work.communication_style}\n`;
      }
      if (work.examples_from_interview && Array.isArray(work.examples_from_interview)) {
        formatted += `• **Examples from Interview:**\n`;
        work.examples_from_interview.forEach((example: string) => {
          formatted += `  - ${example}\n`;
        });
      }
      formatted += '\n';
    }

    // Technical and Domain Profile
    if (profile.technical_and_domain_profile) {
      const tech = profile.technical_and_domain_profile;
      formatted += `## 🔧 **TECHNICAL & DOMAIN PROFILE**\n`;
      if (tech.domain_focus && Array.isArray(tech.domain_focus)) {
        formatted += `• **Domain Focus:** ${tech.domain_focus.join(', ')}\n`;
      }
      if (tech.technical_depth_summary) {
        formatted += `• **Technical Depth:** ${tech.technical_depth_summary}\n`;
      }
      if (tech.typical_problems_they_can_solve && Array.isArray(tech.typical_problems_they_can_solve)) {
        formatted += `• **Typical Problems They Can Solve:**\n`;
        tech.typical_problems_they_can_solve.forEach((problem: string) => {
          formatted += `  - ${problem}\n`;
        });
      }
      if (tech.areas_for_further_development && Array.isArray(tech.areas_for_further_development)) {
        formatted += `• **Areas for Further Development:**\n`;
        tech.areas_for_further_development.forEach((area: string) => {
          formatted += `  - ${area}\n`;
        });
      }
      formatted += '\n';
    }

    // Motivation and Career Direction
    if (profile.motivation_and_career_direction) {
      const motivation = profile.motivation_and_career_direction;
      formatted += `## 🎯 **MOTIVATION & CAREER DIRECTION**\n`;
      if (motivation.why_they_are_in_this_field) {
        formatted += `• **Why in This Field:** ${motivation.why_they_are_in_this_field}\n`;
      }
      if (motivation.reasons_for_looking_or_leaving) {
        formatted += `• **Reasons for Looking/Leaving:** ${motivation.reasons_for_looking_or_leaving}\n`;
      }
      if (motivation.short_term_goals_1_2_years) {
        formatted += `• **Short-term Goals (1-2 years):** ${motivation.short_term_goals_1_2_years}\n`;
      }
      if (motivation.long_term_direction_3_5_years) {
        formatted += `• **Long-term Direction (3-5 years):** ${motivation.long_term_direction_3_5_years}\n`;
      }
      if (motivation.clarity_and_realism_assessment) {
        formatted += `• **Clarity & Realism Assessment:** ${motivation.clarity_and_realism_assessment}\n`;
      }
      formatted += '\n';
    }

    // Risk and Stability
    if (profile.risk_and_stability) {
      const risk = profile.risk_and_stability;
      formatted += `## ⚠️ **RISK & STABILITY**\n`;
      if (risk.integrated_risk_view) {
        formatted += `• **Integrated Risk View:** ${risk.integrated_risk_view}\n`;
      }
      if (risk.job_hopping_risk_note) {
        formatted += `• **Job Hopping Risk:** ${risk.job_hopping_risk_note}\n`;
      }
      if (risk.unemployment_gap_risk_note) {
        formatted += `• **Unemployment Gap Risk:** ${risk.unemployment_gap_risk_note}\n`;
      }
      if (risk.stability_overall_assessment) {
        formatted += `• **Stability Assessment:** ${risk.stability_overall_assessment}\n`;
      }
      formatted += '\n';
    }

    // Environment and Culture Fit
    if (profile.environment_and_culture_fit) {
      const environment = profile.environment_and_culture_fit;
      formatted += `## 🏢 **ENVIRONMENT & CULTURE FIT**\n`;
      if (environment.environments_where_they_thrive && Array.isArray(environment.environments_where_they_thrive)) {
        formatted += `• **Environments Where They Thrive:**\n`;
        environment.environments_where_they_thrive.forEach((env: string) => {
          formatted += `  - ${env}\n`;
        });
      }
      if (environment.environments_where_they_struggle && Array.isArray(environment.environments_where_they_struggle)) {
        formatted += `• **Environments Where They Struggle:**\n`;
        environment.environments_where_they_struggle.forEach((env: string) => {
          formatted += `  - ${env}\n`;
        });
      }
      if (environment.non_negotiables_summary) {
        formatted += `• **Non-negotiables:** ${environment.non_negotiables_summary}\n`;
      }
      if (environment.culture_fit_notes) {
        formatted += `• **Culture Fit Notes:** ${environment.culture_fit_notes}\n`;
      }
      formatted += '\n';
    }

    // Recommended Roles and Pathways
    if (profile.recommended_roles_and_pathways) {
      const roles = profile.recommended_roles_and_pathways;
      formatted += `## 🎯 **RECOMMENDED ROLES & PATHWAYS**\n`;
      if (roles.recommended_role_types && Array.isArray(roles.recommended_role_types)) {
        formatted += `• **Recommended Role Types:**\n`;
        roles.recommended_role_types.forEach((role: string) => {
          formatted += `  - ${role}\n`;
        });
      }
      if (roles.suitable_team_or_org_contexts && Array.isArray(roles.suitable_team_or_org_contexts)) {
        formatted += `• **Suitable Team/Org Contexts:**\n`;
        roles.suitable_team_or_org_contexts.forEach((context: string) => {
          formatted += `  - ${context}\n`;
        });
      }
      if (roles.leadership_vs_ic_potential) {
        formatted += `• **Leadership vs IC Potential:** ${roles.leadership_vs_ic_potential}\n`;
      }
      if (roles.development_recommendations && Array.isArray(roles.development_recommendations)) {
        formatted += `• **Development Recommendations:**\n`;
        roles.development_recommendations.forEach((rec: string) => {
          formatted += `  - ${rec}\n`;
        });
      }
      formatted += '\n';
    }

    // Derived Tags
    if (profile.derived_tags && Array.isArray(profile.derived_tags)) {
      formatted += `## 🏷️ **DERIVED TAGS**\n`;
      formatted += `${profile.derived_tags.map((tag: string) => `\`${tag}\``).join(' ')}\n\n`;
    }

    // Data Quality and Limits
    if (profile.data_quality_and_limits) {
      const dataQuality = profile.data_quality_and_limits;
      formatted += `## 📊 **DATA QUALITY & LIMITS**\n`;
      if (dataQuality.overall_confidence_0_100 !== undefined) {
        formatted += `• **Overall Confidence:** ${dataQuality.overall_confidence_0_100}/100\n`;
      }
      if (dataQuality.major_gaps_in_information && Array.isArray(dataQuality.major_gaps_in_information)) {
        formatted += `• **Major Information Gaps:**\n`;
        dataQuality.major_gaps_in_information.forEach((gap: string) => {
          formatted += `  - ${gap}\n`;
        });
      }
      if (dataQuality.inconsistencies && Array.isArray(dataQuality.inconsistencies)) {
        formatted += `• **Inconsistencies:**\n`;
        dataQuality.inconsistencies.forEach((inconsistency: string) => {
          formatted += `  - ${inconsistency}\n`;
        });
      }
      if (dataQuality.notes) {
        formatted += `• **Notes:** ${dataQuality.notes}\n`;
      }
      formatted += '\n';
    }

    // Footer
    formatted += '---\n';
    formatted += '*Brutally honest assessment based on AI-powered interview analysis (v2 format)*';

    return formatted.trim();
  };

  const formatNewStructuredProfile = (profile: any): string => {
    let formatted = '';

    // Header with confidence score
    formatted += '# 🔍 **BRUTALLY HONEST CANDIDATE ASSESSMENT**\n\n';

    if (profile.meta) {
      formatted += `## 📈 **ASSESSMENT METADATA**\n`;
      formatted += `• **Confidence Score:** ${profile.meta.confidenceScore?.value || 'N/A'}/10\n`;
      if (profile.meta.confidenceScore?.justification) {
        formatted += `  - *${profile.meta.confidenceScore.justification}*\n`;
      }

      if (profile.meta.dataCoverage) {
        formatted += `• **Data Coverage:**\n`;
        formatted += `  - Profile: ${profile.meta.dataCoverage.profileCoveragePercentage || 0}%\n`;
        formatted += `  - Interview: ${profile.meta.dataCoverage.interviewCoveragePercentage || 0}%\n`;
        formatted += `  - Resume: ${profile.meta.dataCoverage.resumeCoveragePercentage || 0}%\n`;
      }

      if (profile.meta.missingInputs && profile.meta.missingInputs.length > 0) {
        formatted += `• **Missing Inputs:** ${profile.meta.missingInputs.join(', ')}\n`;
      }
      formatted += '\n';
    }

    // Candidate Summary
    if (profile.candidateSummary) {
      formatted += `## 📋 **CANDIDATE SUMMARY**\n`;
      if (profile.candidateSummary.executiveNote) {
        formatted += `${profile.candidateSummary.executiveNote}\n`;
      }
      if (profile.candidateSummary.overallVerdict) {
        formatted += `**Overall Verdict:** ${profile.candidateSummary.overallVerdict}\n`;
      }
      formatted += '\n';
    }

    // Key Strengths with evidence
    if (profile.keyStrengths && Array.isArray(profile.keyStrengths) && profile.keyStrengths.length > 0) {
      formatted += `## 💪 **KEY STRENGTHS**\n`;
      profile.keyStrengths.forEach((strength: any) => {
        formatted += `• **${strength.strength}**\n`;
        if (strength.supportingEvidence) {
          formatted += `  - *Evidence:* "${strength.supportingEvidence}"\n`;
        }
        if (strength.butCritique) {
          formatted += `  - *But:* ${strength.butCritique}\n`;
        }
        formatted += '\n';
      });
    }

    // Weaknesses and Gaps with detailed analysis
    if (profile.weaknessesAndGaps && Array.isArray(profile.weaknessesAndGaps) && profile.weaknessesAndGaps.length > 0) {
      formatted += `## ⚠️ **WEAKNESSES AND GAPS**\n`;
      profile.weaknessesAndGaps.forEach((weakness: any) => {
        formatted += `• **${weakness.gap}**\n`;
        if (weakness.evidence) {
          formatted += `  - *Evidence:* ${weakness.evidence}\n`;
        }
        if (weakness.impact) {
          formatted += `  - *Impact:* ${weakness.impact}\n`;
        }
        if (weakness.possibleCompensation && weakness.possibleCompensation !== 'none') {
          formatted += `  - *Compensation:* ${weakness.possibleCompensation}\n`;
        }
        formatted += '\n';
      });
    }

    // Contradiction Matrix
    if (profile.contradictionMatrix && Array.isArray(profile.contradictionMatrix) && profile.contradictionMatrix.length > 0) {
      formatted += `## ⚡ **CONTRADICTIONS**\n`;
      profile.contradictionMatrix.forEach((contradiction: any) => {
        formatted += `• **${contradiction.topic}**\n`;
        if (contradiction.resumeQuote) {
          formatted += `  - *Resume:* "${contradiction.resumeQuote}"\n`;
        }
        if (contradiction.interviewQuote) {
          formatted += `  - *Interview:* "${contradiction.interviewQuote}"\n`;
        }
        if (contradiction.profileReference) {
          formatted += `  - *Profile:* ${contradiction.profileReference}\n`;
        }
        if (contradiction.impact) {
          formatted += `  - *Impact:* ${contradiction.impact}\n`;
        }
        formatted += '\n';
      });
    }

    // Evidence Map
    if (profile.evidenceMap) {
      formatted += `## 🗂️ **EVIDENCE MAP**\n`;

      if (profile.evidenceMap.claimsSupported && Array.isArray(profile.evidenceMap.claimsSupported)) {
        formatted += `• **Supported Claims:**\n`;
        profile.evidenceMap.claimsSupported.forEach((claim: any) => {
          formatted += `  - ${claim.claim} (${claim.source}): "${claim.quoteOrLine}"\n`;
        });
      }

      if (profile.evidenceMap.claimsUnsupported && Array.isArray(profile.evidenceMap.claimsUnsupported)) {
        formatted += `• **Unsupported Claims:**\n`;
        profile.evidenceMap.claimsUnsupported.forEach((claim: any) => {
          formatted += `  - ${claim.claim}\n`;
          if (claim.expectedEvidence) {
            formatted += `    - *Expected:* ${claim.expectedEvidence}\n`;
          }
        });
      }
      formatted += '\n';
    }

    // Soft Skills Review with detailed scoring
    if (profile.softSkillsReview) {
      const soft = profile.softSkillsReview;
      formatted += `## 🗣️ **SOFT SKILLS REVIEW**\n`;

      if (soft.communicationClarity) {
        formatted += `• **Communication Clarity:** ${soft.communicationClarity.score || 'N/A'}\n`;
        if (soft.communicationClarity.earnedReasons) {
          formatted += `  - *Strengths:* ${soft.communicationClarity.earnedReasons.join(', ')}\n`;
        }
        if (soft.communicationClarity.lostPercentageReasons) {
          soft.communicationClarity.lostPercentageReasons.forEach((reason: any) => {
            formatted += `  - *Issue:* ${reason.reason} (-${reason.percent}%)\n`;
            if (reason.evidence) {
              formatted += `    - *Evidence:* ${reason.evidence}\n`;
            }
          });
        }
      }

      if (soft.emotionalIntelligence) {
        formatted += `• **Emotional Intelligence:** ${soft.emotionalIntelligence.score || 'N/A'}\n`;
        if (soft.emotionalIntelligence.analysis) {
          formatted += `  - *Analysis:* ${soft.emotionalIntelligence.analysis}\n`;
        }
      }

      if (soft.adaptability) {
        formatted += `• **Adaptability:** ${soft.adaptability.score || 'N/A'}\n`;
        if (soft.adaptability.analysis) {
          formatted += `  - *Analysis:* ${soft.adaptability.analysis}\n`;
        }
      }

      formatted += '\n';
    }

    // Technical Knowledge with scoring
    if (profile.technicalKnowledge) {
      const tech = profile.technicalKnowledge;
      formatted += `## 🔧 **TECHNICAL KNOWLEDGE**\n`;

      if (tech.claimedVsActual) {
        formatted += `• **Claimed vs Actual:** ${tech.claimedVsActual.score || 'N/A'}\n`;
        if (tech.claimedVsActual.analysis) {
          formatted += `  - *Analysis:* ${tech.claimedVsActual.analysis}\n`;
        }
        if (tech.claimedVsActual.earnedReasons) {
          formatted += `  - *Demonstrated:* ${tech.claimedVsActual.earnedReasons.join(', ')}\n`;
        }
      }

      if (tech.gapsIdentified && Array.isArray(tech.gapsIdentified)) {
        formatted += `• **Technical Gaps:**\n`;
        tech.gapsIdentified.forEach((gap: any) => {
          formatted += `  - ${gap.gap}\n`;
          if (gap.evidence) {
            formatted += `    - *Evidence:* ${gap.evidence}\n`;
          }
          if (gap.impact) {
            formatted += `    - *Impact:* ${gap.impact}\n`;
          }
        });
      }

      formatted += '\n';
    }

    // Problem Solving & Critical Thinking
    if (profile.problemSolvingCriticalThinking) {
      const problem = profile.problemSolvingCriticalThinking;
      formatted += `## 🧠 **PROBLEM SOLVING & CRITICAL THINKING**\n`;

      Object.keys(problem).forEach((key: string) => {
        const section = problem[key];
        if (section.score) {
          formatted += `• **${key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}:** ${section.score}\n`;
          if (section.earnedReasons) {
            formatted += `  - *Strengths:* ${section.earnedReasons.join(', ')}\n`;
          }
          if (section.lostPercentageReasons) {
            section.lostPercentageReasons.forEach((reason: any) => {
              formatted += `  - *Issue:* ${reason.reason} (-${reason.percent}%)\n`;
              if (reason.evidence) {
                formatted += `    - *Evidence:* ${reason.evidence}\n`;
              }
            });
          }
        }
      });
      formatted += '\n';
    }

    // Growth Potential
    if (profile.growthPotential) {
      const growth = profile.growthPotential;
      formatted += `## 📈 **GROWTH POTENTIAL**\n`;

      if (growth.coachability) {
        formatted += `• **Coachability:** ${growth.coachability.score || 'N/A'}\n`;
        if (growth.coachability.evidence) {
          formatted += `  - *Evidence:* ${growth.coachability.evidence}\n`;
        }
      }

      if (growth.trajectory) {
        formatted += `• **Career Trajectory:** ${growth.trajectory.assessment}\n`;
        if (growth.trajectory.evidence) {
          formatted += `  - *Evidence:* ${growth.trajectory.evidence}\n`;
        }
      }

      formatted += '\n';
    }

    // Cultural Fit
    if (profile.culturalFit) {
      const culture = profile.culturalFit;
      formatted += `## 🏢 **CULTURAL FIT**\n`;

      if (culture.teamDynamics) {
        formatted += `• **Team Role:** ${culture.teamDynamics.assessment}\n`;
        if (culture.teamDynamics.evidence) {
          formatted += `  - *Evidence:* ${culture.teamDynamics.evidence}\n`;
        }
      }

      if (culture.organizationalFit) {
        formatted += `• **Organization Type:** ${culture.organizationalFit.fit}\n`;
        if (culture.organizationalFit.reasoning) {
          formatted += `  - *Reasoning:* ${culture.organizationalFit.reasoning}\n`;
        }
      }

      if (culture.riskFactors && Array.isArray(culture.riskFactors)) {
        formatted += `• **Risk Factors:**\n`;
        culture.riskFactors.forEach((risk: any) => {
          formatted += `  - ${risk.risk} (${risk.severity})\n`;
          if (risk.evidence) {
            formatted += `    - *Evidence:* ${risk.evidence}\n`;
          }
        });
      }

      formatted += '\n';
    }

    // Unverified Claims
    if (profile.unverifiedClaims && Array.isArray(profile.unverifiedClaims) && profile.unverifiedClaims.length > 0) {
      formatted += `## ❓ **UNVERIFIED CLAIMS**\n`;
      profile.unverifiedClaims.forEach((claim: any) => {
        formatted += `• **${claim.claim}**\n`;
        if (claim.reasonForFlag) {
          formatted += `  - *Reason:* ${claim.reasonForFlag}\n`;
        }
        if (claim.followUp) {
          formatted += `  - *Follow-up needed:* ${claim.followUp}\n`;
        }
      });
      formatted += '\n';
    }

    // Detailed Scores
    if (profile.scores) {
      formatted += `## 📊 **DETAILED ASSESSMENT SCORES**\n`;

      Object.keys(profile.scores).forEach((key: string) => {
        const score = profile.scores[key];
        if (score.value) {
          formatted += `• **${key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}:** ${score.value}\n`;
          if (score.breakdown) {
            formatted += `  - *Breakdown:* ${score.breakdown}\n`;
          }
        }
      });
      formatted += '\n';
    }

    // Readiness Assessment
    if (profile.readinessAssessment) {
      const readiness = profile.readinessAssessment;
      formatted += `## 🎯 **READINESS ASSESSMENT**\n`;
      formatted += `• **Face-to-Face Ready:** ${readiness.faceToFaceReady ? 'Yes' : 'No'}\n`;

      if (readiness.areasToClarify && Array.isArray(readiness.areasToClarify)) {
        formatted += `• **Areas to Clarify:**\n`;
        readiness.areasToClarify.forEach((area: string) => {
          formatted += `  - ${area}\n`;
        });
      }

      if (readiness.recommendation) {
        formatted += `• **Recommendation:** ${readiness.recommendation.level}\n`;
        if (readiness.recommendation.justification) {
          formatted += `  - *Justification:* ${readiness.recommendation.justification}\n`;
        }
      }
      formatted += '\n';
    }

    // Footer
    formatted += '---\n';
    formatted += '*Brutally honest assessment based on AI-powered interview analysis*';

    return formatted.trim();
  };

  const formatLegacyProfile = (profile: any): string => {
    let formatted = '';

    // Header
    formatted += '# 🔍 **BRUTALLY HONEST CANDIDATE ASSESSMENT**\n\n';

    // 1. Candidate Summary (Max 3-5 lines)
    if (profile.candidateSummary) {
      formatted += `## 📋 **CANDIDATE SUMMARY**\n${profile.candidateSummary}\n\n`;
    }

    // 2. Key Strengths (Every strength with a "but")
    if (profile.keyStrengths && Array.isArray(profile.keyStrengths) && profile.keyStrengths.length > 0) {
      formatted += `## 💪 **KEY STRENGTHS**\n`;
      profile.keyStrengths.forEach((strength: any) => {
        if (typeof strength === 'object' && strength.strength && strength.butCritique) {
          formatted += `• **${strength.strength}** - but ${strength.butCritique}\n`;
        } else if (typeof strength === 'string') {
          formatted += `• ${strength}\n`;
        }
      });
      formatted += '\n';
    }

    // 3. Weaknesses and Gaps
    if (profile.weaknessesAndGaps && Array.isArray(profile.weaknessesAndGaps) && profile.weaknessesAndGaps.length > 0) {
      formatted += `## ⚠️ **WEAKNESSES AND GAPS**\n`;
      if (typeof profile.weaknessesAndGaps[0] === 'object') {
        profile.weaknessesAndGaps.forEach((weakness: any) => {
          formatted += `• **${weakness.gap}**\n`;
          if (weakness.evidence) formatted += `  - *Evidence:* ${weakness.evidence}\n`;
          if (weakness.impact) formatted += `  - *Impact:* ${weakness.impact}\n`;
        });
      } else {
        profile.weaknessesAndGaps.forEach((weakness: string) => {
          formatted += `• ${weakness}\n`;
        });
      }
      formatted += '\n';
    }

    // 4. Soft Skills Review
    if (profile.softSkillsReview) {
      const soft = profile.softSkillsReview;
      formatted += `## 🗣️ **SOFT SKILLS REVIEW**\n`;
      if (soft.communicationClarity) {
        formatted += `• **Communication Clarity:** ${soft.communicationClarity}\n`;
      }
      if (soft.evidenceQuality) {
        formatted += `• **Evidence Quality:** ${soft.evidenceQuality}\n`;
      }
      if (soft.emotionalIntelligence) {
        formatted += `• **Emotional Intelligence:** ${soft.emotionalIntelligence}\n`;
      }
      if (soft.overallTone) {
        formatted += `• **Overall Tone:** ${soft.overallTone}\n`;
      }
      formatted += '\n';
    }

    // 5. Technical Knowledge
    if (profile.technicalKnowledge) {
      const tech = profile.technicalKnowledge;
      formatted += `## 🔧 **TECHNICAL KNOWLEDGE**\n`;
      if (tech.claimedVsActual) {
        formatted += `• **Claimed vs Actual:** ${tech.claimedVsActual}\n`;
      }
      if (tech.gapsIdentified) {
        formatted += `• **Gaps Identified:** ${tech.gapsIdentified}\n`;
      }
      if (tech.problemSolvingApproach) {
        formatted += `• **Problem Solving:** ${tech.problemSolvingApproach}\n`;
      }
      formatted += '\n';
    }

    // 6. Problem Solving / Critical Thinking
    if (profile.problemSolvingCriticalThinking) {
      const problem = profile.problemSolvingCriticalThinking;
      formatted += `## 🧠 **PROBLEM SOLVING & CRITICAL THINKING**\n`;
      if (problem.approachClarity) {
        formatted += `• **Approach Clarity:** ${problem.approachClarity}\n`;
      }
      if (problem.realismFactoring) {
        formatted += `• **Realism Factoring:** ${problem.realismFactoring}\n`;
      }
      if (problem.logicalConsistency) {
        formatted += `• **Logical Consistency:** ${problem.logicalConsistency}\n`;
      }
      formatted += '\n';
    }

    // 7. Unverified Claims
    if (profile.unverifiedClaims && Array.isArray(profile.unverifiedClaims) && profile.unverifiedClaims.length > 0) {
      formatted += `## ❓ **UNVERIFIED CLAIMS**\n`;
      profile.unverifiedClaims.forEach((claim: any) => {
        if (typeof claim === 'object') {
          formatted += `• **${claim.claim}**\n`;
          if (claim.reasonForFlag) formatted += `  - *Reason:* ${claim.reasonForFlag}\n`;
        } else {
          formatted += `• ${claim}\n`;
        }
      });
      formatted += '\n';
    }

    // 8-10. Scores
    formatted += `## 📊 **ASSESSMENT SCORES**\n`;
    formatted += `• **Communication Score:** ${profile.communicationScore || 5}/10\n`;
    formatted += `• **Credibility Score:** ${profile.credibilityScore || 5}/10\n`;
    formatted += `• **Consistency Score:** ${profile.consistencyScore || 5}/10\n\n`;

    // 11. Readiness for Face-to-Face
    if (profile.readinessAssessment) {
      const readiness = profile.readinessAssessment;
      formatted += `## 🎯 **READINESS FOR FACE-TO-FACE INTERVIEW**\n`;
      formatted += `• **Ready to Proceed:** ${readiness.faceToFaceReady ? 'Yes' : 'No'}\n`;
      if (readiness.areasToClarity && Array.isArray(readiness.areasToClarity)) {
        formatted += `• **Areas to Clarify:** ${readiness.areasToClarity.join(', ')}\n`;
      }
      if (readiness.recommendation) {
        formatted += `• **Recommendation:** ${readiness.recommendation}\n`;
      }
      formatted += '\n';
    }

    // Footer
    formatted += '---\n';
    formatted += '*Brutally honest assessment based on AI-powered interview analysis*';

    return formatted.trim();
  };

  // Public profile viewing endpoint (no authentication required for employer viewing profiles)
  app.get("/api/public-profile/:identifier", async (req, res) => {
    try {
      const identifier = decodeURIComponent(req.params.identifier);
      const jobId = req.query.jobId as string | undefined;
      const profileId = req.query.profileId as string | undefined;

      let userProfile;
      if (profileId) {
        // Use exact profile ID if provided - for precise profile lookup when multiple profiles exist
        [userProfile] = await db.select()
          .from(applicantProfiles)
          .where(eq(applicantProfiles.id, parseInt(profileId)));
      } else {
        // Fallback to userId lookup
        [userProfile] = await db.select()
          .from(applicantProfiles)
          .where(eq(applicantProfiles.userId, identifier));
      }

      const profileData = userProfile?.aiProfile?.brutallyHonestProfile || {};

      // Get interview video URL from job applications -> interview sessions
      let interviewVideoUrl = null;
      try {
        const { airtableJobApplications, interviewSessions } = await import('@shared/schema');

        // Get the application for this user - filter by jobId if provided, otherwise get most recent
        let application;
        if (jobId) {
          // Filter by specific job to get the correct application
          const [specificApplication] = await db.select()
            .from(airtableJobApplications)
            .where(and(
              eq(airtableJobApplications.applicantUserId, identifier),
              eq(airtableJobApplications.jobId, jobId)
            ))
            .limit(1);
          application = specificApplication;
        }

        // Fallback to most recent if no jobId provided or no match found
        if (!application) {
          const [recentApplication] = await db.select()
            .from(airtableJobApplications)
            .where(eq(airtableJobApplications.applicantUserId, identifier))
            .orderBy(desc(airtableJobApplications.applicationDate))
            .limit(1);
          application = recentApplication;
        }

        // If application has sessionId, get the interview video URL
        if (application?.sessionId) {
          const [session] = await db.select()
            .from(interviewSessions)
            .where(eq(interviewSessions.id, application.sessionId));

          if (session?.interviewVideoUrl) {
            interviewVideoUrl = session.interviewVideoUrl;
            console.log('✅ Found interview video URL for user:', identifier);
          }
        }
      } catch (videoError) {
        console.warn('⚠️  Could not fetch interview video:', videoError);
        // Continue without video - non-critical failure
      }

      // Extract brutallyHonestProfile directly - no transformation needed
      // The UI will use the raw structure from V4 profile generator
      const brutallyHonestProfile = userProfile?.aiProfile?.brutallyHonestProfile || {};
      const profileVersion = brutallyHonestProfile.version || 1;

      // Pass brutallyHonestProfile directly as structuredProfile
      // This ensures all V4 fields are available without manual mapping
      const structuredProfile = profileVersion >= 3 ? brutallyHonestProfile : null;

      // Format the response
      const profile = {
        name: userProfile?.name || identifier,
        email: userProfile?.email || '',
        matchScorePercentage: userProfile?.aiProfile?.matchScorePercentage || 0,
        experiencePercentage: userProfile?.aiProfile?.experiencePercentage || 0,
        techSkillsPercentage: userProfile?.aiProfile?.techSkillsPercentage || 0,
        culturalFitPercentage: userProfile?.aiProfile?.culturalFitPercentage || 0,
        // NEW: Include profile version and structured data
        profileVersion,
        structuredProfile,
        // Keep userProfile markdown for backward compatibility
        userProfile: formatProfileForDisplay(userProfile?.aiProfile),
        userId: userProfile?.userId,
        interviewVideoUrl, // Add video URL to response
        // Include all raw fields for debugging
        rawFields: userProfile
      };

      res.json(profile);

    } catch (error) {
      console.error('❌ PUBLIC: Error fetching public profile:', error);
      res.status(500).json({ error: "Failed to fetch profile", details: error.message });
    }
  });

  // Get profile by application ID - fetches the specific application's profile data
  app.get("/api/application-profile/:applicationId", async (req, res) => {
    try {
      const applicationId = decodeURIComponent(req.params.applicationId);
      console.log('📋 Fetching application profile for ID:', applicationId);

      // Get the specific application by its ID
      const { airtableJobApplications, interviewSessions } = await import('@shared/schema');

      const [application] = await db.select()
        .from(airtableJobApplications)
        .where(eq(airtableJobApplications.id, applicationId))
        .limit(1);

      console.log('📋 Application found:', application ? 'Yes' : 'No');

      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      console.log('📋 Application details:', {
        id: application.id,
        applicantName: application.applicantName,
        applicantUserId: application.applicantUserId,
        hasUserProfile: !!application.userProfile,
        sessionId: application.sessionId
      });

      // Get interview video URL from THIS specific application's session
      let interviewVideoUrl = null;
      if (application.sessionId) {
        const [session] = await db.select()
          .from(interviewSessions)
          .where(eq(interviewSessions.id, application.sessionId));

        if (session?.interviewVideoUrl) {
          interviewVideoUrl = session.interviewVideoUrl;
          console.log('✅ Found interview video URL for application:', applicationId);
        }
      }

      // Get profile data from applicantProfiles table (where aiProfile.brutallyHonestProfile lives)
      // Use applicantProfileId if available for precise lookup, fallback to applicantUserId
      const [applicantProfile] = await db.select()
        .from(applicantProfiles)
        .where(
          application.applicantProfileId
            ? eq(applicantProfiles.id, application.applicantProfileId)
            : eq(applicantProfiles.userId, application.applicantUserId)
        );

      console.log('📋 ApplicantProfile found:', applicantProfile ? 'Yes' : 'No');
      console.log('📋 Lookup method:', application.applicantProfileId ? `by profileId: ${application.applicantProfileId}` : `by userId: ${application.applicantUserId}`);
      console.log('📋 ApplicantProfile has aiProfile:', !!applicantProfile?.aiProfile);
      console.log('📋 ApplicantProfile has brutallyHonestProfile:', !!applicantProfile?.aiProfile?.brutallyHonestProfile);

      // Use applicantProfiles.aiProfile as primary source, fall back to application.userProfile
      const aiProfileData = applicantProfile?.aiProfile || {};
      const applicationUserProfile = (application.userProfile as any) || {};

      // brutallyHonestProfile is in aiProfile
      const brutallyHonestProfile = aiProfileData.brutallyHonestProfile || applicationUserProfile.brutallyHonestProfile || {};
      const profileVersion = brutallyHonestProfile.version || aiProfileData.profileVersion || 1;

      // Restructure V4 profile to match client expectations
      // V4 has deeply nested structure inside executive_summary that client expects at top level
      let structuredProfile: any = profileVersion >= 3 ? { ...brutallyHonestProfile } : null;
      if (structuredProfile && structuredProfile.executive_summary) {
        const execSummary = structuredProfile.executive_summary;

        // Move scores from executive_summary.scores to top level
        if (execSummary.scores) {
          structuredProfile.scores = execSummary.scores;

          // detailed_profile is inside scores in V4
          if (execSummary.scores.detailed_profile) {
            structuredProfile.detailed_profile = execSummary.scores.detailed_profile;
          }

          // cross_reference_analysis is inside scores in V4
          if (execSummary.scores.cross_reference_analysis) {
            structuredProfile.cross_reference_analysis = execSummary.scores.cross_reference_analysis;
          }
        }

        // transcript_analysis is directly in executive_summary
        if (execSummary.transcript_analysis) {
          structuredProfile.transcript_analysis = {
            ...execSummary.transcript_analysis,
            // Also include response analysis from exec_summary
            strongest_responses: execSummary.strongest_responses,
            weakest_responses: execSummary.weakest_responses,
            linguistic_patterns: execSummary.linguistic_patterns,
            authenticity_assessment: execSummary.authenticity_assessment,
          };
        }

        // Red/green flags - keep as objects for detailed view
        if (execSummary.red_flags_detected) {
          structuredProfile.red_flags = execSummary.red_flags_detected;
        }
        if (execSummary.green_flags_detected) {
          structuredProfile.green_flags = execSummary.green_flags_detected;
        }

        // Interview analysis for client - convert V4 object flags to strings for legacy rendering
        const greenFlagsAsStrings = execSummary.green_flags_detected?.map((f: any) =>
          typeof f === 'string' ? f : f.description || f.flag_type || 'Green flag'
        ) || [];
        const redFlagsAsStrings = execSummary.red_flags_detected?.map((f: any) =>
          typeof f === 'string' ? f : f.description || f.issue || f.flag_type || 'Red flag'
        ) || [];

        structuredProfile.interview_analysis = {
          strongest_responses: execSummary.strongest_responses,
          weakest_responses: execSummary.weakest_responses,
          green_flags_detected: greenFlagsAsStrings,
          red_flags_detected: redFlagsAsStrings,
        };
      }

      // Extract scores from structured profile (prefer these over legacy scores)
      const v4Scores = structuredProfile?.scores;
      const overallScore = v4Scores?.overall_score?.value ?? v4Scores?.overall_score?.score ?? aiProfileData.matchScorePercentage ?? applicationUserProfile.matchScorePercentage ?? 0;
      const techScore = v4Scores?.technical_competence?.score ?? aiProfileData.techSkillsPercentage ?? applicationUserProfile.techSkillsPercentage ?? 0;
      const expScore = v4Scores?.experience_quality?.score ?? aiProfileData.experiencePercentage ?? applicationUserProfile.experiencePercentage ?? 0;
      const culturalScore = v4Scores?.cultural_collaboration_fit?.score ?? aiProfileData.culturalFitPercentage ?? applicationUserProfile.culturalFitPercentage ?? 0;

      // Format the response - same structure as /api/public-profile
      const profile = {
        name: applicantProfile?.name || application.applicantName,
        email: applicantProfile?.email || application.applicantEmail,
        jobTitle: application.jobTitle,
        jobId: application.jobId,
        applicationId: application.id,
        applicationDate: application.applicationDate,
        matchScorePercentage: overallScore,
        experiencePercentage: expScore,
        techSkillsPercentage: techScore,
        culturalFitPercentage: culturalScore,
        profileVersion,
        structuredProfile,
        userProfile: formatProfileForDisplay(aiProfileData.brutallyHonestProfile ? aiProfileData : applicationUserProfile),
        userId: application.applicantUserId,
        interviewVideoUrl,
        rawFields: {
          application,
          applicantProfile
        }
      };

      res.json(profile);

    } catch (error) {
      console.error('❌ Error fetching application profile:', error);
      res.status(500).json({ error: "Failed to fetch profile", details: error.message });
    }
  });

  // Get complete user profile from Airtable platouserprofiles table
  app.get('/api/user-profile/:userId', requireAuth, async (req: any, res) => {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        console.log('❌ No user ID provided in request');
        return res.status(400).json({ message: "User ID is required" });
      }

      console.log(`🔍 Fetching complete user profile for identifier: "${userId}"`);
      console.log(`👤 Authenticated user: ${req.user?.claims?.sub || 'unknown'}`);
      console.log(`🏢 Organization ID: ${req.user?.orgId || 'unknown'}`);
      
      const AIRTABLE_API_KEY = 'pat770a3TZsbDther.a2b72657b27da4390a5215e27f053a3f0a643d66b43168adb6817301ad5051c0';
      
      // Step 1: Find the actual UserID from the job applications table
      console.log(`📋 Step 1: Finding UserID from job applications for: "${userId}"`);
      const applicationsBaseId = 'appEYs1fTytFXoJ7x';
      const applicationsTableName = 'platojobapplications';
      
      // Search by name in applications table
      let applicationsUrl = `https://api.airtable.com/v0/${applicationsBaseId}/${applicationsTableName}?filterByFormula=${encodeURIComponent(`{Name} = "${userId}"`)}`;
      
      const applicationsResponse = await fetch(applicationsUrl, {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!applicationsResponse.ok) {
        console.log(`❌ Failed to fetch applications: ${applicationsResponse.status} ${applicationsResponse.statusText}`);
        return res.status(500).json({ message: 'Failed to fetch application data' });
      }
      
      const applicationsData = await applicationsResponse.json();
      console.log(`📋 Found ${applicationsData.records.length} applications matching name: "${userId}"`);
      
      let actualUserId = userId; // Default to the provided identifier
      
      if (applicationsData.records.length > 0) {
        const application = applicationsData.records[0];
        const userIdFromApplication = application.fields?.['UserID'] || application.fields?.['User ID'] || application.fields?.['userId'] || '';
        if (userIdFromApplication) {
          actualUserId = userIdFromApplication;
          console.log(`✅ Found UserID from application: "${actualUserId}"`);
        } else {
          console.log(`⚠️ No UserID field found in application, using name: "${userId}"`);
        }
      } else {
        console.log(`⚠️ No application found for name "${userId}", will try direct profile lookup`);
      }
      
      // Step 2: Fetch the user profile using the actual UserID
      console.log(`👤 Step 2: Fetching user profile for UserID: "${actualUserId}"`);
      const profilesBaseId = 'app3tA4UpKQCT2s17';
      const profilesTableName = 'Table%201';
      
      // Try by UserID field first
      let profilesUrl = `https://api.airtable.com/v0/${profilesBaseId}/${profilesTableName}?filterByFormula=${encodeURIComponent(`{UserID} = "${actualUserId}"`)}`;
      
      let profilesResponse = await fetch(profilesUrl, {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!profilesResponse.ok) {
        console.log(`❌ Failed to fetch profiles: ${profilesResponse.status} ${profilesResponse.statusText}`);
        return res.status(500).json({ message: 'Failed to fetch profile data' });
      }
      
      let profilesData = await profilesResponse.json();
      console.log(`👤 Found ${profilesData.records.length} profiles matching UserID: "${actualUserId}"`);
      
      // If no match by UserID, try by Name
      if (profilesData.records.length === 0) {
        console.log(`🔍 No UserID match, trying by Name: "${userId}"`);
        profilesUrl = `https://api.airtable.com/v0/${profilesBaseId}/${profilesTableName}?filterByFormula=${encodeURIComponent(`{Name} = "${userId}"`)}`;
        
        profilesResponse = await fetch(profilesUrl, {
          headers: {
            'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (profilesResponse.ok) {
          profilesData = await profilesResponse.json();
          console.log(`👤 Found ${profilesData.records.length} profiles matching Name: "${userId}"`);
        }
      }
      
      if (profilesData.records.length === 0) {
        console.log(`❌ No profile found for "${userId}" in either UserID or Name fields`);
        return res.status(404).json({ message: "User profile not found" });
      }
      
      // Step 3: Extract and format the profile data
      const profileRecord = profilesData.records[0];
      const fields = profileRecord.fields;
      
      console.log(`✅ Found profile! Available fields: ${Object.keys(fields).join(', ')}`);
      console.log(`🔍 Raw profile data for debugging:`, JSON.stringify(fields, null, 2));
      
      const profile = {
        id: profileRecord.id,
        userId: actualUserId,
        name: fields['Name'] || fields['name'] || 'Unknown',
        email: fields['Email'] || fields['email'] || null,
        phone: fields['Phone'] || fields['phone'] || null,
        location: fields['Location'] || fields['location'] || null,
        // Try multiple field name variations for user profile content
        userProfile: fields['User profile'] || fields['user profile'] || fields['User Profile'] || fields['Profile'] || fields['profile'] || '',
        professionalSummary: fields['Professional Summary'] || fields['professional summary'] || '',
        workExperience: fields['Work Experience'] || fields['work experience'] || fields['Experience'] || fields['experience'] || '',
        technicalAnalysis: fields['Technical Analysis'] || fields['technical analysis'] || '',
        personalAnalysis: fields['Personal Analysis'] || fields['personal analysis'] || '',
        professionalAnalysis: fields['Professional Analysis'] || fields['professional analysis'] || '',
        technicalScore: fields['Technical Score'] || fields['technical score'] || 0,
        personalScore: fields['Personal Score'] || fields['personal score'] || 0,
        professionalScore: fields['Professional Score'] || fields['professional score'] || 0,
        overallScore: fields['Overall Score'] || fields['overall score'] || 0,
        resume: fields['Resume'] || fields['resume'] || null,
        portfolioLink: fields['Portfolio Link'] || fields['portfolio link'] || null,
        linkedinProfile: fields['LinkedIn Profile'] || fields['linkedin profile'] || null,
        githubProfile: fields['GitHub Profile'] || fields['github profile'] || null,
        salaryExpectation: fields['Salary Expectation'] || fields['salary expectation'] || null,
        availabilityDate: fields['Availability Date'] || fields['availability date'] || null,
        workPreference: fields['Work Preference'] || fields['work preference'] || null,
        yearsExperience: fields['Years Experience'] || fields['years experience'] || null,
        education: fields['Education'] || fields['education'] || null,
        certifications: fields['Certifications'] || fields['certifications'] || null,
        skills: fields['Skills'] || fields['skills'] || null,
        languages: fields['Languages'] || fields['languages'] || null,
        interests: fields['Interests'] || fields['interests'] || null,
        coverLetter: fields['Cover Letter'] || fields['cover letter'] || null,
        // Include all raw fields for debugging
        rawFields: fields
      };

      console.log(`✅ Profile data prepared for: ${profile.name}, User Profile length: ${profile.userProfile.length} characters`);
      console.log(`🔍 Profile data being sent to frontend:`, profile);
      res.json(profile);
      
    } catch (error) {
      console.error('❌ Error fetching user profile:', error);
      res.status(500).json({ message: 'Failed to fetch user profile' });
    }
  });

  // Generate comprehensive AI-powered job match analysis
  app.post('/api/ai/job-match-analysis', requireAuth, async (req: any, res) => {
    try {
      const { jobTitle, jobDescription, jobRequirements, userProfile } = req.body;
      
      if (!jobTitle || !jobDescription || !userProfile) {
        return res.status(400).json({ message: "Job title, description, and user profile are required" });
      }

      console.log(`🤖 Generating comprehensive job match analysis for: ${userProfile.name}`);

      const prompt = `You are an expert HR analyst. Analyze this candidate's profile against the job requirements and provide a comprehensive match analysis.

**JOB DETAILS:**
Title: ${jobTitle}
Description: ${jobDescription}
Requirements: ${jobRequirements || 'Not specified'}

**CANDIDATE PROFILE:**
Name: ${userProfile.name}
User ID: ${userProfile.userId}
Email: ${userProfile.email || 'Not provided'}
Location: ${userProfile.location || 'Not specified'}
Experience: ${userProfile.experience || 'Not specified'}
Skills: ${userProfile.skills || 'Not specified'}
Salary Expectation: ${userProfile.salaryExpectation || 'Not specified'}
Profile Details: ${userProfile.userProfile || ''}
Resume: ${userProfile.resume || 'Not provided'}
Cover Letter: ${userProfile.coverLetter || 'Not provided'}

**ANALYSIS REQUIREMENTS:**
Provide a comprehensive JSON response with the following structure:
{
  "overallMatchScore": <number 1-100>,
  "matchSummary": "<2-3 sentence summary of overall fit>",
  "technicalAlignment": {
    "score": <number 1-100>,
    "analysis": "<2 complete sentences analyzing technical skills match with specific examples from candidate profile and job requirements>"
  },
  "experienceAlignment": {
    "score": <number 1-100>,
    "analysis": "<2 complete sentences evaluating experience relevance with specific references to years, roles, and responsibilities>"
  },
  "culturalFit": {
    "score": <number 1-100>,
    "analysis": "<2 complete sentences assessing cultural alignment based on communication style, work preferences, and company culture fit>"
  },
  "strengths": [
    "<specific strength 1>",
    "<specific strength 2>",
    "<specific strength 3>"
  ],
  "gaps": [
    "<development area 1>",
    "<development area 2>",
    "<development area 3>"
  ],
  "recommendations": [
    "<hiring recommendation 1>",
    "<hiring recommendation 2>",
    "<hiring recommendation 3>"
  ],
  "interviewFocus": [
    "<interview focus area 1>",
    "<interview focus area 2>",
    "<interview focus area 3>"
  ]
}

Be specific, avoid generic responses, and base analysis on the actual profile data provided. Use varied scores (avoid round numbers like 70, 80, 90).`;

      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const response = await wrapOpenAIRequest(
        () => openai.chat.completions.create({
          model: process.env.OPENAI_MODEL_COMPREHENSIVE_MATCH_ANALYSIS || "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are an expert HR analyst specializing in comprehensive candidate-job matching analysis. Provide detailed, specific assessments based on the exact job requirements and candidate profile provided. For component analysis, provide 1-2 complete sentences explaining your reasoning with specific references to the candidate's background and job requirements."
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          response_format: { type: "json_object" },
          max_tokens: 2000, // Ensure full responses aren't truncated
        }),
        {
          requestType: "comprehensive_match_analysis",
          model: process.env.OPENAI_MODEL_COMPREHENSIVE_MATCH_ANALYSIS || "gpt-4o",
          requestData: { prompt: prompt.substring(0, 500) },
          metadata: { route: "comprehensive_match_analysis" }
        }
      );

      const analysis = JSON.parse(response.choices[0].message.content);
      console.log(`✅ Generated comprehensive match analysis with overall score: ${analysis.overallMatchScore}`);

      res.json(analysis);
    } catch (error) {
      console.error('Error generating job match analysis:', error);
      res.status(500).json({ message: 'Failed to generate job match analysis' });
    }
  });

  // Fix most recent accepted candidate User ID
  app.post('/api/fix-recent-candidate-userid', requireAuth, async (req: any, res) => {
    try {
      console.log(`🔧 Fixing most recent accepted candidate User ID...`);
      
      // Get the most recent job match from local database
      const jobMatches = await localDatabaseService.getAllJobMatches();
      const mostRecentMatch = jobMatches.length > 0 ? jobMatches[0] : null;
      
      if (!mostRecentMatch) {
        return res.status(404).json({ message: "No job matches found" });
      }
      
      console.log(`📋 Most recent job match:`, mostRecentMatch);

      const currentUserId = mostRecentMatch.userId;
      const candidateName = mostRecentMatch.name;
      const jobTitle = mostRecentMatch.jobTitle;

      // Look for this candidate in job applications with "Accepted" status
      const allApplications = await localDatabaseService.getAllJobApplications();
      
      // Find the accepted application for this candidate and job
      const matchingApplication = allApplications.find(app =>
        app.applicantName === candidateName &&
        app.jobTitle === jobTitle &&
        app.status === 'Accepted'
      );
      
      if (!matchingApplication) {
        return res.status(404).json({ 
          message: `No matching accepted application found for ${candidateName} - ${jobTitle}` 
        });
      }
      
      const correctUserId = matchingApplication.userId;
      
      if (currentUserId === correctUserId) {
        return res.json({ 
          message: "User ID is already correct",
          currentUserId,
          candidateName,
          jobTitle
        });
      }
      
      // Update the job match with the correct User ID
      console.log(`🔄 Updating User ID from ${currentUserId} to ${correctUserId}`);
      await jobMatchesService.updateJobMatchUserId(mostRecentMatch.id, correctUserId);
      
      res.json({ 
        message: "Successfully updated most recent candidate User ID",
        candidateName,
        jobTitle,
        oldUserId: currentUserId,
        newUserId: correctUserId,
        recordId: mostRecentMatch.id
      });
      
    } catch (error) {
      console.error("❌ Error fixing candidate User ID:", error);
      res.status(500).json({ 
        message: "Failed to fix candidate User ID",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Undo accept applicant - move from platojobmatches back to platojobapplications
  app.post('/api/real-applicants/:id/undo-accept', requireAuth, async (req: any, res) => {
    try {
      const { applicantId, userId, applicantName, jobTitle, jobDescription, companyName } = req.body;
      
      console.log(`⏪ Undoing accept for applicant ${applicantName}...`);
      
      // Create record back in job applications using local database
      await localDatabaseService.createJobApplication({
        applicantName,
        applicantUserId: userId,
        applicantEmail: '', // Email not provided in request body
        jobTitle,
        jobId: req.params.id,
        company: companyName,
        status: 'applied',
        jobDescription
      });
      
      // Delete from job matches using local database
      const jobMatches = await localDatabaseService.getJobMatchesByUser(userId);
      const matchToDelete = jobMatches.find(match =>
        match.jobTitle === jobTitle && match.companyName === companyName
      );

      if (matchToDelete) {
        // Update status to cancelled instead of deleting
        await localDatabaseService.updateJobMatch(matchToDelete.id, { status: 'cancelled' });
        console.log(`🗑️ Cancelled job match for ${applicantName}`);
      }
      
      // Remove from local accepted applicants storage
      const user = req.user.id;
      const organization = await storage.getOrganizationByUser(user);
      if (organization) {
        try {
          await storage.removeAcceptedApplicant(userId, req.params.id, organization.id);
          console.log(`💾 Removed applicant ${applicantName} from local accepted applicants storage`);
        } catch (error) {
          console.warn(`⚠️ Could not remove from local storage: ${error}`);
        }
      }
      
      console.log(`✅ Successfully undid accept for applicant ${applicantName}`);
      res.json({ 
        message: "Accept action undone - applicant restored to applications",
        applicantName: applicantName
      });
      
    } catch (error) {
      console.error("❌ Error undoing accept:", error);
      res.status(500).json({ 
        message: "Failed to undo accept action",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // AI-powered applicant profile analysis
  app.post('/api/ai/analyze-applicant-profile', requireAuth, async (req: any, res) => {
    try {
      const { applicantData, jobTitle, jobDescription, requiredSkills } = req.body;
      const { analyzeApplicantProfile } = await import('./openai');
      const analysis = await analyzeApplicantProfile(applicantData, jobTitle, jobDescription, requiredSkills);
      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing applicant profile:", error);
      res.status(500).json({ message: "Failed to analyze applicant profile" });
    }
  });

  // Airtable discovery and testing routes
  app.get('/api/airtable/discover', requireAuth, async (req: any, res) => {
    try {
      const structure = { message: "Airtable discovery disabled - using local database" };
      res.json(structure);
    } catch (error) {
      console.error("Error discovering Airtable structure:", error);
      res.status(500).json({ message: "Failed to discover Airtable structure" });
    }
  });

  // Show local database information (public endpoint for exploration)
  app.get('/api/airtable/info', async (req: any, res) => {
    try {
      const userProfiles = await localDatabaseService.getAllUserProfiles();
      const jobPostings = await localDatabaseService.getAllJobPostings();
      const info = {
        database: "Local PostgreSQL ✓",
        userProfilesFound: userProfiles.length,
        jobPostingsFound: jobPostings.length,
        tables: [
          { id: "airtable_user_profiles", name: "User Profiles", records: userProfiles.length },
          { id: "airtable_job_postings", name: "Job Postings", records: jobPostings.length }
        ]
      };
      res.json(info);
    } catch (error: any) {
      console.error("Error fetching database info:", error);
      res.status(500).json({
        message: "Error connecting to database",
        error: error?.message || "Unknown error",
        database: "Local PostgreSQL"
      });
    }
  });

  // Get all Airtable candidates (for general viewing)
  app.get('/api/candidates', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);
      
      if (!organization) {
        return res.json([]);
      }

      const candidates = await localDatabaseService.getAllUserProfiles();
      res.json(candidates);
    } catch (error) {
      console.error("Error fetching candidates:", error);
      res.status(500).json({ message: "Failed to fetch candidates" });
    }
  });

  // Local database-based candidate matching for specific job
  app.get('/api/job-postings/:id/candidates', requireAuth, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.id);
      
      // Fetch job matches from local database
      const jobMatches = await localDatabaseService.getJobMatchesByJob(jobId);
      const matchedCandidates = jobMatches.map(match => ({
        ...match,
        id: match.userId,
        name: match.name,
        email: '', // Will need to be fetched from user profile
        score: match.matchScore || 0
      }));
      
      // Filter out declined candidates
      const applications = await storage.getApplicationsByJob(jobId);
      const declinedCandidateIds = applications
        .filter(app => app.status === 'declined')
        .map(app => app.candidateId);
      
      const filteredCandidates = matchedCandidates.filter(
        candidate => !declinedCandidateIds.includes(candidate.id)
      );
      
      // Add application status to candidates
      const candidatesWithStatus = filteredCandidates.map(candidate => {
        const application = applications.find(app => app.candidateId === candidate.id);
        return {
          ...candidate,
          applicationStatus: application?.status || 'pending',
          reviewedAt: application?.reviewedAt,
        };
      });
      
      res.json(candidatesWithStatus);
    } catch (error) {
      console.error("Error fetching Airtable candidates for job:", error);
      res.status(500).json({ message: "Failed to fetch candidates from Airtable" });
    }
  });

  // Accept a candidate (create or update application)
  app.post('/api/job-postings/:jobId/candidates/:candidateId/accept', requireAuth, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const candidateId = req.params.candidateId;
      const userId = req.user.id;
      
      // Get candidate info from request body
      const { candidateName, matchScore, matchReasoning } = req.body;
      
      // Get job details to update Airtable
      const job = await storage.getJobById(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Get organization details for company name
      const organization = await storage.getOrganizationByUser(userId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      // Check if application already exists
      let application = await storage.getApplication(jobId, candidateId);
      
      if (application) {
        // Update existing application
        application = await storage.updateApplicationStatus(jobId, candidateId, 'accepted', userId);
      } else {
        // Create new application
        application = await storage.createApplication({
          jobId,
          candidateId,
          candidateName,
          status: 'accepted',
          matchScore,
          matchReasoning,
          reviewedBy: userId,
          reviewedAt: new Date(),
        });
      }
      
      // Create job match record in local database when candidate is accepted
      try {
        console.log(`Creating job match record for candidate ${candidateId} with job: ${job.title}`);

        // Get user profile for candidate details
        const userProfile = await localDatabaseService.getUserProfile(candidateId);

        if (userProfile) {
          await localDatabaseService.createJobMatch({
            name: userProfile.name || candidateName,
            userId: userProfile.userId,
            jobTitle: job.title,
            jobDescription: job.description || '',
            companyName: organization.companyName,
            jobId: job.id.toString(),
            status: 'accepted'
          });
          console.log(`✅ Successfully created job match record for ${userProfile.name} (User ID: ${userProfile.userId})`);
        } else {
          console.warn(`⚠️ Could not find user profile for candidate ${candidateId}, skipping job match creation`);
        }
      } catch (localDbError) {
        console.error('❌ Failed to create local job match, but candidate was accepted:', localDbError);
        // Don't fail the entire operation if local database update fails
      }
      
      res.json({ success: true, application });
    } catch (error) {
      console.error("Error accepting candidate:", error);
      res.status(500).json({ message: "Failed to accept candidate" });
    }
  });

  // Decline a candidate
  app.post('/api/job-postings/:jobId/candidates/:candidateId/decline', requireAuth, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const candidateId = req.params.candidateId;
      const userId = req.user.id;
      
      // Get candidate info from request body
      const { candidateName, matchScore, matchReasoning } = req.body;
      
      // Check if application already exists
      let application = await storage.getApplication(jobId, candidateId);
      
      if (application) {
        // Update existing application
        application = await storage.updateApplicationStatus(jobId, candidateId, 'declined', userId);
      } else {
        // Create new application with declined status
        application = await storage.createApplication({
          jobId,
          candidateId,
          candidateName,
          status: 'declined',
          matchScore,
          matchReasoning,
          reviewedBy: userId,
          reviewedAt: new Date(),
        });
      }
      
      res.json({ success: true, application });
    } catch (error) {
      console.error("Error declining candidate:", error);
      res.status(500).json({ message: "Failed to decline candidate" });
    }
  });

  // Schedule interview for accepted candidate
  app.post('/api/job-postings/:jobId/candidates/:candidateId/schedule-interview', requireAuth, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const candidateId = req.params.candidateId;
      const userId = req.user.id;
      
      const { candidateName, scheduledDate, scheduledTime, interviewType, meetingLink, notes } = req.body;
      
      // Get the application
      const application = await storage.getApplication(jobId, candidateId);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      
      // Create interview
      const interview = await storage.createInterview({
        applicationId: application.id,
        jobId,
        candidateId,
        candidateName,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
        scheduledTime,
        interviewType: interviewType || 'video',
        meetingLink,
        notes,
        createdBy: userId,
      });
      
      res.json({ success: true, interview });
    } catch (error) {
      console.error("Error scheduling interview:", error);
      res.status(500).json({ message: "Failed to schedule interview" });
    }
  });

  // Get interviews for a job
  app.get('/api/job-postings/:id/interviews', requireAuth, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const interviews = await storage.getInterviewsByJob(jobId);
      res.json(interviews);
    } catch (error) {
      console.error("Error fetching interviews:", error);
      res.status(500).json({ message: "Failed to fetch interviews" });
    }
  });

  // Enhanced Candidates route - from platouserprofiles with score > 85
  app.get('/api/enhanced-candidates', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);
      
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Get all organization jobs for scoring candidates against
      const organizationJobs = await storage.getJobsByOrganization(organization.id);
      if (organizationJobs.length === 0) {
        return res.json([]);
      }

      const { localDatabaseService } = await import('./localDatabaseService');
      const { applicantScoringService } = await import('./applicantScoringService');

      console.log('Fetching enhanced candidates from platouserprofiles...');
      
      // Get all candidates from local database
      const allCandidates = await localDatabaseService.getAllUserProfiles();
      
      if (allCandidates.length === 0) {
        return res.json([]);
      }

      console.log(`Found ${allCandidates.length} candidates, evaluating against ${organizationJobs.length} jobs...`);

      // Score each candidate against all active jobs to find their best match
      const candidatesWithScores = [];
      
      for (const candidate of allCandidates) {
        if (!candidate.aiProfile) {
          continue;
        }
        
        let bestScore = 0;
        let bestJobMatch = null;
        let bestSummary = '';
        
        // Score against each job to find the best match
        for (const job of organizationJobs) {
          if (!job.description) continue;
          
          const result = await applicantScoringService.scoreApplicant(
            candidate.aiProfile, 
            job.description
          );
          
          if (result.score > bestScore) {
            bestScore = result.score;
            bestJobMatch = job;
            bestSummary = result.summary;
          }
        }
        
        // Only include candidates with score > 85
        if (bestScore > 85 && bestJobMatch) {
          candidatesWithScores.push({
            ...candidate,
            matchScore: bestScore,
            matchSummary: bestSummary,
            bestMatchJob: {
              id: bestJobMatch.id,
              title: bestJobMatch.title,
              description: bestJobMatch.description
            }
          });
        }
        
        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Sort by match score (highest first)
      candidatesWithScores.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

      console.log(`Found ${candidatesWithScores.length} high-scoring candidates (>85) out of ${allCandidates.length} total`);
      
      res.json(candidatesWithScores);
    } catch (error) {
      console.error("Error fetching enhanced candidates:", error);
      res.status(500).json({ message: "Failed to fetch enhanced candidates" });
    }
  });

  app.get('/api/companies/matches', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);
      
      if (!organization) {
        return res.json([]);
      }
      
      const matches = await storage.getMatchesByOrganization(organization.id);
      res.json(matches);
    } catch (error) {
      console.error("Error fetching matches:", error);
      res.status(500).json({ message: "Failed to fetch matches" });
    }
  });

  // Interview Questions Management
  app.get('/api/interview-questions/jobs', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);
      
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const jobs = await interviewQuestionsService.getAllJobs();
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching jobs for interview questions:", error);
      res.status(500).json({ message: "Failed to fetch jobs" });
    }
  });

  app.get('/api/interview-questions/:jobId', requireAuth, async (req: any, res) => {
    try {
      const jobId = req.params.jobId;
      const questions = await interviewQuestionsService.getInterviewQuestions(jobId);
      res.json({ questions });
    } catch (error) {
      console.error("Error fetching interview questions:", error);
      res.status(500).json({ message: "Failed to fetch interview questions" });
    }
  });

  app.put('/api/interview-questions/:jobId', requireAuth, async (req: any, res) => {
    try {
      const jobId = req.params.jobId;
      const { questions } = req.body;
      
      if (!Array.isArray(questions)) {
        return res.status(400).json({ message: "Questions must be an array" });
      }

      await interviewQuestionsService.updateInterviewQuestions(jobId, questions);
      res.json({ message: "Interview questions updated successfully" });
    } catch (error) {
      console.error("Error updating interview questions:", error);
      res.status(500).json({ message: "Failed to update interview questions" });
    }
  });

  // Accept/Decline Real Applicants from platojobapplications
  app.post('/api/real-applicants/:id/accept', requireAuth, async (req: any, res) => {
    try {
      const applicantId = req.params.id;
      const userId = req.user.id;
      // Note: Airtable services removed - now using local database
      
      console.log(`🔄 Accepting applicant ${applicantId}...`);
      
      // Get application details first from local database
      const allApplications = await localDatabaseService.getAllJobApplications();
      const application = allApplications.find(app => app.id === applicantId);
      
      if (!application) {
        console.log(`❌ Application ${applicantId} not found`);
        return res.status(404).json({ message: "Application not found" });
      }

      // Get organization for company name
      const organization = await storage.getOrganizationByUser(userId);
      if (!organization) {
        console.log(`❌ Organization not found for user ${userId}`);
        return res.status(404).json({ message: "Organization not found" });
      }

      console.log(`🔄 Updating status to 'Accepted' for applicant ${application.applicantName}...`);

      // First, update the status to "Accepted"
      await localDatabaseService.updateJobApplication(applicantId, { status: 'Accepted' });

      console.log(`✅ Status updated to 'Accepted' for ${application.applicantName}`);

      // // Then create job match record
      // console.log(`🔄 Creating job match record for ${application.applicantName}...`);
      // await localDatabaseService.createJobMatch({
      //   name: application.applicantName,
      //   userId: application.applicantUserId,
      //   jobTitle: application.jobTitle,
      //   jobDescription: application.jobDescription || '',
      //   companyName: organization.companyName,
      //   jobId: application.jobId,
      //   status: 'accepted'
      // });

      // console.log(`✅ Successfully accepted applicant ${application.applicantName}: Status updated + Job match created`);

      // Send acceptance email
      try {
        console.log(`📧 Sending acceptance email to ${application.applicantName}...`);
        const emailSent = await emailService.sendApplicantAcceptanceEmail({
          applicantName: application.applicantName,
          applicantEmail: application.applicantEmail || '',
          jobTitle: application.jobTitle,
          companyName: organization.companyName,
          appliedDate: application.createdAt ? new Date(application.createdAt).toLocaleDateString() : undefined,
          skills: application.skills || [],
          experience: application.experience || undefined,
          matchScore: application.matchScore || undefined
        });

        if (emailSent) {
          console.log(`✅ Acceptance email sent successfully to ${application.applicantName}`);
        } else {
          console.warn(`⚠️ Failed to send acceptance email to ${application.applicantName}`);
        }
      } catch (emailError) {
        console.error(`❌ Error sending acceptance email:`, emailError);
        // Continue with the response even if email fails
      }

      res.json({
        success: true,
        message: "Candidate successfully accepted and status updated",
        applicant: {
          ...application,
          status: 'Accepted'
        }
      });
    } catch (error) {
      console.error("❌ Error accepting real applicant:", error);
      res.status(500).json({ message: "Error: Failed to update candidate status. Please try again." });
    }
  });

  app.post('/api/real-applicants/:id/decline', requireAuthOrService, async (req: any, res) => {
    try {
      const applicantId = req.params.id;
      const userId = req.user?.id;
      // Use local database service instead of Airtable

      console.log(`Declining and deleting applicant ${applicantId}...`);

      // Get applicant details for email
      let application;
      let organization;
      try {
        application = await localDatabaseService.getJobApplication(applicantId);
        // Get organization from user if available, otherwise from the job
        organization = userId ? await storage.getOrganizationByUser(userId) : null;

        // If no user (service call), get organization from the applicant's job
        if (!organization && application?.jobId) {
          const job = await storage.getJob(parseInt(application.jobId));
          if (job?.organizationId) {
            const [org] = await db
              .select()
              .from(organizations)
              .where(eq(organizations.id, job.organizationId.toString()))
              .limit(1);
            organization = org;
          }
        }
      } catch (error) {
        console.warn('⚠️ Could not fetch applicant or organization details:', error);
      }

      // Update the applicant record status in local database instead of deleting
      try {
        await localDatabaseService.updateJobApplication(applicantId, { status: 'declined' } as any);
      } catch (error) {
        console.warn('⚠️ Could not update application status to declined:', error);
      }

      console.log(`✅ Successfully declined and deleted applicant ${applicantId}`);

      // Send rejection email
      if (application && organization) {
        try {
          console.log(`📧 Sending rejection email to ${application.applicantName}...`);
          const emailSent = await emailService.sendApplicantRejectionEmail({
            applicantName: application.applicantName,
            applicantEmail: application.applicantEmail || '',
            jobTitle: application.jobTitle,
            companyName: organization.companyName,
            appliedDate: application.createdAt ? new Date(application.createdAt).toLocaleDateString() : undefined,
            skills: application.skills || [],
            experience: application.experience || undefined,
            matchScore: application.matchScore || undefined
          });

          if (emailSent) {
            console.log(`✅ Rejection email sent successfully to ${application.applicantName}`);
          } else {
            console.warn(`⚠️ Failed to send rejection email to ${application.applicantName}`);
          }
        } catch (emailError) {
          console.error(`❌ Error sending rejection email:`, emailError);
          // Continue with the response even if email fails
        }
      }

      res.json({
        success: true,
        message: "Applicant declined and removed"
      });
    } catch (error) {
      console.error("Error declining real applicant:", error);
      res.status(500).json({ message: "Failed to decline applicant" });
    }
  });

  // Shortlist applicant
  app.post('/api/real-applicants/:id/shortlist', requireAuthOrService, async (req: any, res) => {
    try {
      const applicantId = req.params.id;
      const userId = req.user?.id;

      // Get applicant details from local database first (needed for organization lookup)
      const applicant = await localDatabaseService.getJobApplication(applicantId);

      if (!applicant) {
        return res.status(404).json({ message: "Applicant not found" });
      }

      // Get organization from user if available, otherwise from the job
      let organization = userId ? await storage.getOrganizationByUser(userId) : null;

      // If no user (service call), get organization from the applicant's job
      if (!organization && applicant?.jobId) {
        const job = await storage.getJob(parseInt(applicant.jobId));
        if (job?.organizationId) {
          const [org] = await db
            .select()
            .from(organizations)
            .where(eq(organizations.id, job.organizationId.toString()))
            .limit(1);
          organization = org;
        }
      }

      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      console.log(`🌟 DATABASE SHORTLIST: ${userId ? `User ${userId}` : 'Service'} adding applicant ${applicantId} to shortlist...`);

      // Check if already shortlisted (skip if no userId - service call)
      if (userId) {
        const isAlreadyShortlisted = await storage.isApplicantShortlisted(userId, applicantId, applicant.jobId);
        if (isAlreadyShortlisted) {
          return res.status(400).json({ message: "Applicant already shortlisted for this job" });
        }
      }

      // Add to database shortlist
      const shortlistedData = {
        id: `shortlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        employerId: userId || `auto_${organization.id}`,
        applicantId: applicantId,
        applicantName: applicant.name,
        jobTitle: applicant.jobTitle,
        jobId: applicant.jobId,
        note: userId ? null : 'Auto-shortlisted based on interview score',
        dateShortlisted: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await storage.addToShortlist(shortlistedData);
      
      console.log(`✅ DATABASE SHORTLIST SUCCESS: Applicant ${applicantId} added to database shortlist`);

      // Send shortlist email
      try {
        console.log(`📧 Sending shortlist email to ${applicant.applicantName}...`);
        const emailSent = await emailService.sendApplicantShortlistEmail({
          applicantName: applicant.applicantName,
          applicantEmail: applicant.applicantEmail || '',
          jobTitle: applicant.jobTitle,
          companyName: organization.companyName,
          appliedDate: applicant.createdAt ? new Date(applicant.createdAt).toLocaleDateString() : undefined,
          skills: applicant.skills || [],
          experience: applicant.experience || undefined,
          matchScore: applicant.matchScore || undefined
        });

        if (emailSent) {
          console.log(`✅ Shortlist email sent successfully to ${applicant.applicantName}`);
        } else {
          console.warn(`⚠️ Failed to send shortlist email to ${applicant.applicantName}`);
        }
      } catch (emailError) {
        console.error(`❌ Error sending shortlist email:`, emailError);
        // Continue with the response even if email fails
      }

      res.json({
        success: true,
        message: "Candidate added to shortlist successfully",
        applicantId: applicantId
      });
    } catch (error) {
      console.error("❌ DATABASE SHORTLIST ERROR:", error);
      console.error("❌ Error details:", error.message);
      res.status(500).json({ message: "Failed to add candidate to shortlist", error: error.message });
    }
  });

  // Accept shortlisted applicant (move to interviews)
  app.post('/api/shortlisted-applicants/:id/accept', requireAuth, async (req: any, res) => {
    try {
      const shortlistId = req.params.id;
      const userId = req.user?.id;
      const organization = await storage.getOrganizationByUser(userId);
      
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      console.log(`✅ ACCEPT SHORTLISTED: User ${userId} accepting shortlisted applicant ${shortlistId}...`);
      
      // Get shortlisted applicant details
      const shortlistedApplicants = await storage.getShortlistedApplicants(userId);
      const shortlistedApplicant = shortlistedApplicants.find(app => app.id === shortlistId);
      
      if (!shortlistedApplicant) {
        return res.status(404).json({ message: "Shortlisted applicant not found" });
      }

      // Get full applicant details from local database
      // Use local database service instead of Airtable
      const applicantDetails = await localDatabaseService.getJobApplication(shortlistedApplicant.applicantId);
      
      if (!applicantDetails) {
        return res.status(404).json({ message: "Applicant details not found" });
      }

      // Create interview record
      const interviewData = {
        id: `interview_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        candidateName: shortlistedApplicant.applicantName,
        candidateEmail: applicantDetails.name, // Using name as email placeholder
        candidateId: applicantDetails.applicantUserId,
        jobId: shortlistedApplicant.jobId,
        jobTitle: shortlistedApplicant.jobTitle,
        scheduledDate: new Date().toISOString().split('T')[0], // Today's date as placeholder
        scheduledTime: '10:00', // Default time placeholder
        timeZone: 'UTC',
        interviewType: 'video' as const,
        meetingLink: null,
        interviewer: userId,
        status: 'scheduled' as const,
        notes: `Moved from shortlist to interview`,
        organizationId: organization.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await storage.createRealInterview(interviewData);
      
      // Remove from shortlist
      await storage.removeFromShortlist(shortlistId);
      
      console.log(`✅ ACCEPT SUCCESS: Applicant ${shortlistedApplicant.applicantId} moved to interviews`);
      
      res.json({ 
        success: true, 
        message: "Candidate accepted and moved to interviews",
        interviewId: interviewData.id
      });
    } catch (error) {
      console.error("❌ ACCEPT ERROR:", error);
      res.status(500).json({ message: "Failed to accept candidate", error: error.message });
    }
  });

  // Schedule interview for shortlisted applicant (accept + schedule in one step)
  app.post('/api/shortlisted-applicants/:id/schedule-interview', requireAuth, async (req: any, res) => {
    try {
      const shortlistId = req.params.id;
      const userId = req.user?.id;
      const organization = await storage.getOrganizationByUser(userId);

      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      console.log(`✅ SCHEDULE SHORTLISTED: User ${userId} scheduling interview for shortlisted applicant ${shortlistId}...`);

      const { scheduledDate, scheduledTime, timeZone, interviewType, meetingLink, notes } = req.body;

      // Get shortlisted applicant details
      const shortlistedApplicants = await storage.getShortlistedApplicants(userId);
      const shortlistedApplicant = shortlistedApplicants.find(app => app.id === shortlistId);

      if (!shortlistedApplicant) {
        return res.status(404).json({ message: "Shortlisted applicant not found" });
      }

      console.log('🔍 Shortlisted applicant data:', shortlistedApplicant);

      // Get full applicant details from local database
      const applicantDetails = await localDatabaseService.getJobApplication(shortlistedApplicant.applicantId);

      if (!applicantDetails) {
        return res.status(404).json({ message: "Applicant details not found" });
      }

      console.log('🔍 Applicant details:', applicantDetails);

      // Create interview record
      const { realInterviews } = await import('@shared/schema');
      const { nanoid } = await import('nanoid');
      const { db } = await import('./db');

      const interviewId = nanoid();
      const interviewer = user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email || 'Unknown';

      // Get candidate name - use applicantName or fallback to name
      const candidateName = shortlistedApplicant.applicantName || shortlistedApplicant.name || 'Unknown Applicant';
      console.log('🔍 Using candidateName:', candidateName, '(applicantName:', shortlistedApplicant.applicantName, ', name:', shortlistedApplicant.name, ')');

      const [interview] = await db.insert(realInterviews).values({
        id: interviewId,
        candidateName: candidateName,
        candidateEmail: applicantDetails.applicantEmail || '',
        candidateId: applicantDetails.applicantUserId,
        jobId: shortlistedApplicant.jobId,
        jobTitle: shortlistedApplicant.jobTitle,
        scheduledDate,
        scheduledTime,
        timeZone: timeZone || 'UTC',
        interviewType: interviewType || 'video',
        meetingLink: meetingLink || '',
        interviewer,
        status: 'scheduled',
        notes: notes || `Interview scheduled for shortlisted candidate`,
        organizationId: organization.id.toString(),
      }).returning();

      console.log(`✅ SCHEDULE SUCCESS: Interview created for ${candidateName}`);

      // Send email notification to the candidate
      const finalEmail = (applicantDetails.applicantEmail || '').trim();
      if (finalEmail && finalEmail.includes('@')) {
        try {
          const { emailService } = await import('./emailService');
          const { format } = await import('date-fns');

          const formattedDate = format(new Date(scheduledDate), 'EEEE, MMMM do, yyyy');

          const emailData = {
            applicantName: shortlistedApplicant.applicantName,
            applicantEmail: finalEmail,
            interviewDate: formattedDate,
            interviewTime: scheduledTime,
            jobTitle: shortlistedApplicant.jobTitle,
            companyName: organization.name || 'Company',
            interviewType: interviewType || 'video',
            meetingLink: meetingLink,
            timeZone: timeZone || 'UTC',
            notes: notes
          };

          const emailSent = await emailService.sendInterviewScheduledEmail(emailData);
          if (emailSent) {
            console.log(`✅ Interview notification email sent successfully`);
          }
        } catch (emailError) {
          console.error("❌ EMAIL ERROR:", emailError);
          // Don't fail the whole request if email fails
        }
      }

      res.json({
        success: true,
        message: "Interview scheduled successfully",
        interviewId: interviewId
      });
    } catch (error) {
      console.error("❌ SCHEDULE ERROR:", error);
      res.status(500).json({ message: "Failed to schedule interview", error: error.message });
    }
  });

  // Deny shortlisted applicant (remove from shortlist)
  app.post('/api/shortlisted-applicants/:id/deny', requireAuth, async (req: any, res) => {
    try {
      const shortlistId = req.params.id;
      const userId = req.user?.id;
      
      console.log(`❌ DENY SHORTLISTED: User ${userId} denying shortlisted applicant ${shortlistId}...`);
      
      // Simply remove from shortlist
      await storage.removeFromShortlist(shortlistId);
      
      console.log(`✅ DENY SUCCESS: Applicant removed from shortlist`);
      
      res.json({ 
        success: true, 
        message: "Candidate removed from shortlist"
      });
    } catch (error) {
      console.error("❌ DENY ERROR:", error);
      res.status(500).json({ message: "Failed to deny candidate", error: error.message });
    }
  });

  // Remove from shortlist (unshortlist)
  app.post('/api/real-applicants/:id/unshortlist', requireAuth, async (req: any, res) => {
    try {
      const applicantId = req.params.id;
      // Use local database service instead of Airtable

      console.log(`🗑️ Removing applicant ${applicantId} from shortlist...`);

      // Update the status in local database back to "pending" or empty
      try {
        await localDatabaseService.updateJobApplication(applicantId, { status: 'pending' } as any);
      } catch (error) {
        console.warn('⚠️ Could not update application status to pending:', error);
      }
      
      console.log(`✅ Successfully removed applicant ${applicantId} from shortlist`);
      res.json({ 
        success: true, 
        message: "Candidate removed from shortlist successfully",
        status: 'pending'
      });
    } catch (error) {
      console.error("❌ Error removing applicant from shortlist:", error);
      res.status(500).json({ message: "Failed to remove candidate from shortlist" });
    }
  });

  // Interview Management Endpoints
  app.get('/api/interviews/count', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);
      
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const { realInterviews } = await import('@shared/schema');
      const { eq, count } = await import('drizzle-orm');
      const { db } = await import('./db');
      
      const [{ count: interviewCount }] = await db
        .select({ count: count() })
        .from(realInterviews)
        .where(eq(realInterviews.organizationId, organization.id.toString()));
      
      res.json({ count: interviewCount || 0 });
    } catch (error) {
      console.error("Error counting interviews:", error);
      res.status(500).json({ message: "Failed to count interviews", count: 0 });
    }
  });

  app.get('/api/interviews', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);
      const { candidateId } = req.query; // Optional filter by candidate/applicant user ID

      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const { realInterviews, users } = await import('@shared/schema');
      const { eq, and } = await import('drizzle-orm');
      const { db } = await import('./db');

      // Build query conditions
      const conditions = [eq(realInterviews.organizationId, organization.id.toString())];

      // Add candidateId filter if provided
      if (candidateId) {
        conditions.push(eq(realInterviews.candidateId, candidateId as string));
      }

      // Join with users table to get candidate information
      const userInterviews = await db
        .select({
          id: realInterviews.id,
          candidateName: realInterviews.candidateName,
          candidateEmail: realInterviews.candidateEmail,
          candidateId: realInterviews.candidateId,
          jobId: realInterviews.jobId,
          jobTitle: realInterviews.jobTitle,
          scheduledDate: realInterviews.scheduledDate,
          scheduledTime: realInterviews.scheduledTime,
          timeZone: realInterviews.timeZone,
          interviewType: realInterviews.interviewType,
          meetingLink: realInterviews.meetingLink,
          interviewer: realInterviews.interviewer,
          status: realInterviews.status,
          notes: realInterviews.notes,
          organizationId: realInterviews.organizationId,
          createdAt: realInterviews.createdAt,
          updatedAt: realInterviews.updatedAt,
          // User information from joined table
          candidate: {
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
            displayName: users.displayName,
            profileImageUrl: users.profileImageUrl,
          },
        })
        .from(realInterviews)
        .leftJoin(users, eq(realInterviews.candidateId, users.id))
        .where(conditions.length > 1 ? and(...conditions) : conditions[0]);

      res.json(userInterviews);
    } catch (error) {
      console.error("Error fetching interviews:", error);
      res.status(500).json({ message: "Failed to fetch interviews" });
    }
  });

  app.post('/api/interviews', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);
      
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { candidateName, candidateEmail, candidateId, jobId, jobTitle, scheduledDate, scheduledTime, timeZone, interviewType, meetingLink, notes } = req.body;

      const { realInterviews } = await import('@shared/schema');
      const { nanoid } = await import('nanoid');
      const { db } = await import('./db');

      const interviewId = nanoid();
      const interviewer = user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email || 'Unknown';

      const [interview] = await db.insert(realInterviews).values({
        id: interviewId,
        candidateName,
        candidateEmail: candidateEmail || '',
        candidateId, // candidateId should be the applicant's user ID from the client
        jobId,
        jobTitle,
        scheduledDate,
        scheduledTime,
        timeZone: timeZone || 'UTC',
        interviewType: interviewType || 'video',
        meetingLink: meetingLink || '',
        interviewer,
        status: 'scheduled',
        notes: notes || '',
        organizationId: organization.id.toString(),
      }).returning();

      console.log(`✅ Created interview for ${candidateName} on ${scheduledDate} at ${scheduledTime}`);

      // Send email notification to the candidate
      console.log(`📧 EMAIL DEBUG: candidateEmail='${candidateEmail}', candidateName='${candidateName}'`);
      
      // Use provided email or fallback to a default for testing (if email is missing from Airtable)
      const finalEmail = candidateEmail && candidateEmail.trim() ? candidateEmail.trim() : 'faroukyasser705@gmail.com';
      
      if (finalEmail) {
        try {
          console.log(`📧 SENDING EMAIL: Attempting to send interview notification to ${finalEmail}`);
          const { emailService } = await import('./emailService');
          const { formatDistanceToNow, format } = await import('date-fns');
          
          // Format the date for display
          const formattedDate = format(new Date(scheduledDate), 'EEEE, MMMM do, yyyy');
          
          const emailData = {
            applicantName: candidateName,
            applicantEmail: finalEmail,
            interviewDate: formattedDate,
            interviewTime: scheduledTime,
            jobTitle: jobTitle || 'Position',
            companyName: organization.name || 'Company',
            interviewType: interviewType || 'video',
            meetingLink: meetingLink,
            timeZone: timeZone || 'UTC',
            notes: notes
          };
          
          console.log(`📧 EMAIL DATA:`, emailData);
          
          const emailSent = await emailService.sendInterviewScheduledEmail(emailData);
          if (emailSent) {
            console.log(`✅ Interview notification email sent successfully to ${finalEmail}`);
          } else {
            console.log(`⚠️ Failed to send interview notification email to ${finalEmail}`);
          }
        } catch (emailError) {
          console.error('❌ Error sending interview notification email:', emailError);
          console.error('❌ Email error details:', emailError.message);
          // Don't fail the entire operation if email fails
        }
      } else {
        console.log(`⚠️ No email address could be determined for candidate, skipping email notification`);
      }

      // Update the Airtable platojobmatches record with interview details
      try {
        const AIRTABLE_API_KEY = 'pat770a3TZsbDther.a2b72657b27da4390a5215e27f053a3f0a643d66b43168adb6817301ad5051c0';
        const MATCHES_BASE_ID = 'app1u4N2W46jD43mP';
        const matchesUrl = `https://api.airtable.com/v0/${MATCHES_BASE_ID}/Table%201`;
        
        // Find the platojobmatches record to update
        const filterFormula = `AND({User ID}='${candidateId}', {Job ID}='${jobId}')`;
        const searchUrl = `${matchesUrl}?filterByFormula=${encodeURIComponent(filterFormula)}`;
        
        console.log(`🔍 Searching for platojobmatches record: User ID=${candidateId}, Job ID=${jobId}`);
        
        const searchResponse = await fetch(searchUrl, {
          headers: {
            'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json'
          }
        });

        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          if (searchData.records && searchData.records.length > 0) {
            const recordId = searchData.records[0].id;
            console.log(`📝 Found record ID: ${recordId}, updating with interview details...`);
            
            // Create combined date & time string for Airtable with timezone
            const interviewDateTime = timeZone ? `${scheduledDate} at ${scheduledTime} (${timeZone})` : `${scheduledDate} at ${scheduledTime}`;
            
            // Update the record with interview details using correct field names
            const updateData = {
              fields: {
                'Interview date&time': interviewDateTime,
                'Interview Link': meetingLink || ''
              }
            };

            console.log(`📋 Updating Airtable with:`, JSON.stringify(updateData, null, 2));

            const updateResponse = await fetch(`${matchesUrl}/${recordId}`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(updateData)
            });

            if (updateResponse.ok) {
              console.log(`✅ Successfully updated Airtable platojobmatches record with interview details`);
            } else {
              const errorText = await updateResponse.text();
              console.error(`❌ Failed to update Airtable record: ${updateResponse.status} ${updateResponse.statusText} - ${errorText}`);
            }
          } else {
            console.log(`⚠️ No platojobmatches record found for User ID ${candidateId} and Job ID ${jobId}`);
          }
        } else {
          console.error(`❌ Failed to search Airtable records: ${searchResponse.status} ${searchResponse.statusText}`);
        }
      } catch (airtableError) {
        console.error('❌ Failed to update platojobmatches with interview details:', airtableError);
        // Don't fail the entire operation if Airtable update fails
      }

      res.json(interview);
    } catch (error) {
      console.error("Error creating interview:", error);
      res.status(500).json({ message: "Failed to create interview" });
    }
  });

  app.patch('/api/interviews/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);
      const interviewId = req.params.id;
      
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const { scheduledDate, scheduledTime, timeZone, interviewType, meetingLink, notes, status } = req.body;
      
      const { realInterviews } = await import('@shared/schema');
      const { eq, and } = await import('drizzle-orm');
      const { db } = await import('./db');
      
      const updateData: any = {
        updatedAt: new Date(),
      };
      
      if (scheduledDate !== undefined) updateData.scheduledDate = scheduledDate;
      if (scheduledTime !== undefined) updateData.scheduledTime = scheduledTime;
      if (timeZone !== undefined) updateData.timeZone = timeZone;
      if (interviewType !== undefined) updateData.interviewType = interviewType;
      if (meetingLink !== undefined) updateData.meetingLink = meetingLink;
      if (notes !== undefined) updateData.notes = notes;
      if (status !== undefined) updateData.status = status;

      // Ensure timezone has a default value if not provided
      if (timeZone === undefined && !updatedInterview?.timeZone) {
        updateData.timeZone = 'UTC';
      }

      console.log(`🔄 Updating interview ${interviewId} with data:`, updateData);
      
      const [updatedInterview] = await db.update(realInterviews)
        .set(updateData)
        .where(and(
          eq(realInterviews.id, interviewId),
          eq(realInterviews.organizationId, organization.id.toString())
        ))
        .returning();
      
      console.log(`✅ Interview updated successfully:`, updatedInterview);

      if (!updatedInterview) {
        return res.status(404).json({ message: "Interview not found" });
      }

      // Auto-update Airtable whenever any interview field is updated
      try {
        console.log('🔄 Auto-updating Airtable platojobmatches for interview changes...');
        
        const AIRTABLE_API_KEY = 'pat770a3TZsbDther.a2b72657b27da4390a5215e27f053a3f0a643d66b43168adb6817301ad5051c0';
        const MATCHES_BASE_ID = 'app1u4N2W46jD43mP';
        const matchesUrl = `https://api.airtable.com/v0/${MATCHES_BASE_ID}/Table%201`;
        
        // Search for the record using User ID and Job title
        const filterFormula = `AND({User ID}='${updatedInterview.candidateId}',{Job title}='${updatedInterview.jobTitle}')`;
        const searchUrl = `${matchesUrl}?filterByFormula=${encodeURIComponent(filterFormula)}`;
        
        console.log('🔍 Searching for Airtable record to update:', {
          userId: updatedInterview.candidateId,
          jobTitle: updatedInterview.jobTitle,
          filterFormula: filterFormula
        });
        
        const searchResponse = await fetch(searchUrl, {
          headers: {
            'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json'
          }
        });

        if (!searchResponse.ok) {
          const errorText = await searchResponse.text();
          console.error('❌ Failed to search Airtable for interview update:', searchResponse.status, searchResponse.statusText, errorText);
          throw new Error(`Failed to search Airtable: ${searchResponse.status} ${searchResponse.statusText}`);
        }

        const searchData = await searchResponse.json();
        console.log('🔍 Airtable search results:', JSON.stringify(searchData, null, 2));
        
        if (!searchData.records || searchData.records.length === 0) {
          console.error(`❌ No matching record found in Airtable for User ID "${updatedInterview.candidateId}" and Job title "${updatedInterview.jobTitle}"`);
          return; // Exit gracefully without failing the interview update
        }

        const recordId = searchData.records[0].id;
        console.log(`✅ Found matching Airtable record: ${recordId}`);
        
        // Format datetime with timezone for Airtable
        const interviewDateTime = updatedInterview.timeZone ? 
          `${updatedInterview.scheduledDate} at ${updatedInterview.scheduledTime} (${updatedInterview.timeZone})` : 
          `${updatedInterview.scheduledDate} at ${updatedInterview.scheduledTime}`;
        
        const airtableUpdateData = {
          fields: {
            'Interview date&time': interviewDateTime,
            'Interview Link': updatedInterview.meetingLink || ''
          }
        };

        console.log('📤 Updating Airtable record with:', JSON.stringify(airtableUpdateData, null, 2));

        const updateResponse = await fetch(`${matchesUrl}/${recordId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(airtableUpdateData)
        });

        if (!updateResponse.ok) {
          const errorText = await updateResponse.text();
          console.error('❌ Failed to update Airtable record:', updateResponse.status, updateResponse.statusText, errorText);
          throw new Error(`Failed to update Airtable record: ${updateResponse.status} ${updateResponse.statusText}`);
        }

        const updatedRecord = await updateResponse.json();
        console.log(`✅ Successfully updated Airtable platojobmatches record:`, JSON.stringify(updatedRecord, null, 2));
        
      } catch (airtableError) {
        console.error('❌ Failed to auto-update Airtable platojobmatches:', airtableError);
        // Don't fail the whole request if Airtable update fails, but log the error
      }

      res.json(updatedInterview);
    } catch (error) {
      console.error("❌ Error updating interview:", error);
      console.error("❌ Error stack:", error.stack);
      res.status(500).json({ message: "Failed to update interview" });
    }
  });

  app.delete('/api/interviews/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);
      const interviewId = req.params.id;
      
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const { realInterviews } = await import('@shared/schema');
      const { eq, and } = await import('drizzle-orm');
      const { db } = await import('./db');
      
      const [deletedInterview] = await db.delete(realInterviews)
        .where(and(
          eq(realInterviews.id, interviewId),
          eq(realInterviews.organizationId, organization.id.toString())
        ))
        .returning();

      if (!deletedInterview) {
        return res.status(404).json({ message: "Interview not found" });
      }

      // Auto-clear interview details from Airtable platojobmatches when interview is deleted
      try {
        console.log('🔄 Auto-clearing interview details from Airtable platojobmatches...');
        
        const AIRTABLE_API_KEY = 'pat770a3TZsbDther.a2b72657b27da4390a5215e27f053a3f0a643d66b43168adb6817301ad5051c0';
        const MATCHES_BASE_ID = 'app1u4N2W46jD43mP';
        const matchesUrl = `https://api.airtable.com/v0/${MATCHES_BASE_ID}/Table%201`;
        
        // Search for the record using candidateId and jobTitle
        const filterFormula = `AND({User ID}='${deletedInterview.candidateId}',{Job title}='${deletedInterview.jobTitle}')`;
        const searchUrl = `${matchesUrl}?filterByFormula=${encodeURIComponent(filterFormula)}`;
        
        console.log('🔍 Searching for Airtable record to clear interview details:', {
          userId: deletedInterview.candidateId,
          jobTitle: deletedInterview.jobTitle,
          filterFormula: filterFormula
        });
        
        const searchResponse = await fetch(searchUrl, {
          headers: {
            'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json'
          }
        });

        if (!searchResponse.ok) {
          const errorText = await searchResponse.text();
          console.error('❌ Failed to search Airtable for interview deletion:', searchResponse.status, searchResponse.statusText, errorText);
          throw new Error(`Failed to search Airtable: ${searchResponse.status} ${searchResponse.statusText}`);
        }

        const searchData = await searchResponse.json();
        console.log('🔍 Airtable search results for deletion:', JSON.stringify(searchData, null, 2));
        
        if (!searchData.records || searchData.records.length === 0) {
          console.log(`⚠️ No matching record found in platojobmatches for User ID "${deletedInterview.candidateId}" and Job title "${deletedInterview.jobTitle}"`);
          return; // Exit gracefully without failing the interview deletion
        }

        const recordId = searchData.records[0].id;
        console.log(`✅ Found matching Airtable record for deletion: ${recordId}`);
        
        // Clear interview fields in Airtable
        const clearData = {
          fields: {
            'Interview date&time': '',
            'Interview Link': ''
          }
        };

        console.log('📤 Clearing Airtable interview fields with:', JSON.stringify(clearData, null, 2));

        const updateResponse = await fetch(`${matchesUrl}/${recordId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(clearData)
        });

        if (!updateResponse.ok) {
          const errorText = await updateResponse.text();
          console.error(`❌ Failed to clear Airtable interview details: ${updateResponse.status} ${updateResponse.statusText} - ${errorText}`);
          throw new Error(`Failed to clear Airtable interview details: ${updateResponse.status} ${updateResponse.statusText}`);
        }

        const clearedRecord = await updateResponse.json();
        console.log(`✅ Successfully cleared interview details from Airtable platojobmatches:`, JSON.stringify(clearedRecord, null, 2));
        
      } catch (airtableError) {
        console.error('❌ Failed to auto-clear Airtable platojobmatches during interview deletion:', airtableError);
        // Don't fail the whole request if Airtable update fails, but log the error
      }

      res.json({ message: "Interview deleted successfully" });
    } catch (error) {
      console.error("Error deleting interview:", error);
      res.status(500).json({ message: "Failed to delete interview" });
    }
  });

  // Get accepted applicants - now queries by status from airtableJobApplications
  app.get('/api/accepted-applicants', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);

      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      console.log(`🔍 Fetching accepted applicants by status for Organization: ${organization.companyName}`);

      // Get all job applications and filter by status = 'accepted'
      const allApplicants = await localDatabaseService.getAllJobApplications();

      // Get organization's jobs to filter by
      const organizationJobs = await storage.getJobsByOrganization(organization.id);
      const organizationJobIds = new Set(organizationJobs.map(job => job.id.toString()));

      // Filter by organization's jobs and status = 'accepted'
      const acceptedApplicants = allApplicants.filter((app: any) =>
        organizationJobIds.has(app.jobId?.toString()) && app.status === 'accepted'
      );

      console.log(`✅ Found ${acceptedApplicants.length} accepted applicants by status`);

      // Transform to expected format
      const formattedApplicants = acceptedApplicants.map((app: any) => ({
        id: app.id,
        applicantName: app.applicantName || 'Unknown',
        name: app.applicantName || 'Unknown',
        jobTitle: app.jobTitle || 'Unknown Position',
        jobId: app.jobId || '',
        status: 'Accepted',
        acceptedDate: app.updatedAt || app.createdAt || new Date().toISOString(),
        userId: app.applicantUserId || app.id,
        email: app.applicantEmail || app.email || '',
      }));

      res.json(formattedApplicants);
    } catch (error) {
      console.error("Error fetching accepted applicants:", error);
      res.status(500).json({ message: "Failed to fetch accepted applicants" });
    }
  });

  app.get('/api/accepted-applicants/:jobId', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);
      const jobId = req.params.jobId;

      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      console.log(`🔍 Fetching accepted applicants by status for Job ID: ${jobId}`);

      // Get all job applications and filter by status = 'accepted' and jobId
      const allApplicants = await localDatabaseService.getAllJobApplications();

      // Filter by jobId and status = 'accepted'
      const acceptedApplicants = allApplicants.filter((app: any) =>
        app.jobId?.toString() === jobId && app.status === 'accepted'
      );

      console.log(`✅ Found ${acceptedApplicants.length} accepted applicants for Job ID ${jobId}`);

      // Transform to expected format for the interview modal
      const formattedApplicants = acceptedApplicants.map((app: any) => ({
        id: app.id,
        name: app.applicantName || 'Unknown',
        jobTitle: app.jobTitle || 'Unknown Position',
        userId: app.applicantUserId || app.id,
        jobId: app.jobId || '',
        email: app.applicantEmail || app.email || '',
      }));

      res.json(formattedApplicants);
    } catch (error) {
      console.error("Error fetching accepted applicants:", error);
      res.status(500).json({ message: "Failed to fetch accepted applicants" });
    }
  });

  // Get interviewable applicants (shortlisted OR accepted) for interview scheduling
  app.get('/api/interviewable-applicants', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);
      const { jobId } = req.query;

      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      console.log(`🔍 Fetching interviewable applicants (shortlisted OR accepted) for Organization: ${organization.companyName}`);

      // Get all job applications
      const allApplicants = await localDatabaseService.getAllJobApplications();

      // Get organization's jobs to filter by
      const organizationJobs = await storage.getJobsByOrganization(organization.id);
      const organizationJobIds = new Set(organizationJobs.map(job => job.id.toString()));

      // Filter by organization's jobs and status = 'shortlisted' OR 'accepted'
      let interviewableApplicants = allApplicants.filter((app: any) =>
        organizationJobIds.has(app.jobId?.toString()) &&
        (app.status === 'shortlisted' || app.status === 'accepted')
      );

      // Optionally filter by specific job
      if (jobId) {
        interviewableApplicants = interviewableApplicants.filter((app: any) =>
          app.jobId?.toString() === jobId
        );
      }

      console.log(`✅ Found ${interviewableApplicants.length} interviewable applicants`);

      // Transform to expected format
      const formattedApplicants = interviewableApplicants.map((app: any) => ({
        id: app.id,
        name: app.applicantName || 'Unknown',
        applicantName: app.applicantName || 'Unknown',
        jobTitle: app.jobTitle || 'Unknown Position',
        userId: app.applicantUserId || app.id,
        jobId: app.jobId || '',
        email: app.applicantEmail || app.email || '',
        status: app.status,
      }));

      res.json(formattedApplicants);
    } catch (error) {
      console.error("Error fetching interviewable applicants:", error);
      res.status(500).json({ message: "Failed to fetch interviewable applicants" });
    }
  });

  // Token-based invitation endpoints
  app.get('/api/invitations/public/:token', async (req: any, res) => {
    try {
      const { token } = req.params;
      const invitation = await storage.getInvitationByToken(token);
      
      if (!invitation || invitation.status !== 'pending' || invitation.expiresAt < new Date()) {
        return res.status(404).json({ message: "Invalid or expired invitation link" });
      }

      const organization = await storage.getOrganizationById(invitation.organizationId);
      
      res.json({
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          token: invitation.token,
          inviteCode: invitation.inviteCode,
          organization: organization ? {
            id: organization.id,
            companyName: organization.companyName,
            industry: organization.industry,
          } : null,
          expiresAt: invitation.expiresAt,
        }
      });

    } catch (error) {
      console.error("Error fetching invitation by token:", error);
      res.status(500).json({ message: "Failed to fetch invitation" });
    }
  });

  // Accept invitation using token (for URL-based invites)
  app.post('/api/invitations/accept', requireAuth, async (req: any, res) => {
    try {
      const { token, orgId, inviteCode } = req.body;
      const userId = req.user.id;
      
      let invitation;
      
      // Support multiple invitation types
      if (token) {
        invitation = await storage.getInvitationByToken(token);
      } else if (inviteCode) {
        invitation = await storage.getInvitationByCode(inviteCode);
        // If orgId is provided, validate it matches
        if (orgId && invitation && invitation.organizationId !== orgId) {
          return res.status(400).json({ message: "Organization ID does not match invite code" });
        }
      } else {
        return res.status(400).json({ message: "Either token or inviteCode is required" });
      }
      
      if (!invitation || invitation.status !== 'pending' || invitation.expiresAt < new Date()) {
        return res.status(404).json({ message: "Invalid or expired invitation" });
      }

      // Check if user is already a member of this organization
      const existingMember = await storage.getTeamMemberByUserAndOrg(userId, invitation.organizationId);
      if (existingMember) {
        return res.status(400).json({ message: "You are already a member of this organization" });
      }

      // Add user to organization
      await storage.addTeamMember({
        organizationId: invitation.organizationId,
        userId,
        role: invitation.role,
        joinedAt: new Date(),
      });

      // Mark invitation as accepted
      await storage.updateInvitationStatus(invitation.id, 'accepted');

      const organization = await storage.getOrganizationById(invitation.organizationId);
      
      console.log(`✅ User ${userId} joined organization ${invitation.organizationId} as ${invitation.role}`);

      res.json({
        message: `Successfully joined ${organization?.companyName}'s hiring team!`,
        organization: {
          id: organization?.id,
          companyName: organization?.companyName
        },
        role: invitation.role,
        newMember: true
      });

    } catch (error) {
      console.error("Error accepting invitation:", error);
      res.status(500).json({ message: "Failed to accept invitation" });
    }
  });

  // Accept invitation using invite code (specific endpoint as requested)
  app.post('/api/invitations/accept-code', requireAuth, async (req: any, res) => {
    try {
      const { orgId, inviteCode } = req.body;
      const userId = req.user.id;
      
      console.log(`🔄 Processing invite code acceptance: ${inviteCode} for user: ${userId} with org ID: ${orgId}`);
      
      // Validate required parameters
      if (!orgId || !inviteCode) {
        return res.status(400).json({ message: "Both orgId and inviteCode are required" });
      }
      
      // Find invitation by invite code
      const invitation = await storage.getInvitationByCode(inviteCode);
      
      if (!invitation) {
        console.log(`❌ Invalid invite code: ${inviteCode}`);
        return res.status(400).json({ message: "Invalid invite code" });
      }
      
      // Verify organization ID matches
      if (invitation.organizationId !== orgId) {
        console.log(`❌ Organization ID mismatch: expected ${invitation.organizationId}, got ${orgId}`);
        return res.status(400).json({ message: "Organization ID does not match invite code" });
      }
      
      // Check invitation status and expiry
      if (invitation.status !== 'pending') {
        console.log(`❌ Invite code already used: ${inviteCode}`);
        return res.status(400).json({ message: "Invite code has already been used" });
      }
      
      if (invitation.expiresAt < new Date()) {
        console.log(`❌ Invite code expired: ${inviteCode}`);
        return res.status(400).json({ message: "Invite code has expired" });
      }
      
      // Check if user is already a member
      const existingMember = await storage.getTeamMemberByUserAndOrg(userId, invitation.organizationId);
      if (existingMember) {
        console.log(`❌ User ${userId} already member of organization: ${orgId}`);
        return res.status(400).json({ message: "You are already a member of this organization" });
      }
      
      // Add user to organization
      await storage.addTeamMember({
        organizationId: invitation.organizationId,
        userId,
        role: invitation.role,
        joinedAt: new Date(),
      });
      
      // Mark invitation as accepted
      await storage.updateInvitationStatus(invitation.id, 'accepted');
      
      // Get organization details
      const organization = await storage.getOrganizationById(invitation.organizationId);
      
      console.log(`✅ Successfully accepted invite code: ${inviteCode} for user: ${userId}`);
      
      res.json({ 
        success: true,
        message: `Welcome to ${organization?.companyName}!`,
        organization: {
          id: organization?.id,
          companyName: organization?.companyName
        },
        role: invitation.role
      });
      
    } catch (error) {
      console.error("Error accepting invite code:", error);
      res.status(500).json({ message: "Failed to accept invitation" });
    }
  });

  // Magic link invitation acceptance endpoint
  app.post('/api/invitations/accept', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { token } = req.body;
      
      console.log(`🔗 Processing magic link invitation acceptance for user: ${userId}, token: ${token}`);
      
      if (!token) {
        console.log(`❌ No token provided in request body`);
        return res.status(400).json({ message: "Invitation token is required" });
      }
      
      // Find invitation by token
      console.log(`🔍 Looking up invitation by token: ${token}`);
      const invitation = await storage.getInvitationByToken(token);
      console.log(`📋 Database lookup result:`, invitation ? {
        id: invitation.id,
        email: invitation.email,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        organizationId: invitation.organizationId
      } : 'null');
      
      if (!invitation) {
        console.log(`❌ Invalid token: ${token}`);
        return res.status(404).json({ message: "Invalid or expired invitation token" });
      }
      
      // Check invitation status and expiry
      if (invitation.status !== 'pending') {
        console.log(`❌ Token already used: ${token}`);
        return res.status(400).json({ message: "Invitation has already been used" });
      }
      
      if (invitation.expiresAt < new Date()) {
        console.log(`❌ Token expired: ${token}`);
        return res.status(400).json({ message: "Invitation has expired" });
      }
      
      // Check if user is already a member
      const existingMember = await storage.getTeamMemberByUserAndOrg(userId, invitation.organizationId);
      if (existingMember) {
        console.log(`❌ User ${userId} already member of organization: ${invitation.organizationId}`);
        return res.status(400).json({ message: "You are already a member of this organization" });
      }
      
      // Add user to organization
      await storage.addTeamMember({
        organizationId: invitation.organizationId,
        userId,
        role: invitation.role,
        joinedAt: new Date(),
      });
      
      // Mark invitation as accepted
      await storage.updateInvitationStatus(invitation.id, 'accepted');
      
      // Get organization details
      const organization = await storage.getOrganizationById(invitation.organizationId);
      
      console.log(`✅ Successfully accepted magic link invitation: ${token} for user: ${userId}`);
      
      res.json({ 
        success: true,
        message: `Welcome to ${organization?.companyName}!`,
        organization: {
          id: organization?.id,
          companyName: organization?.companyName
        },
        role: invitation.role
      });
      
    } catch (error) {
      console.error("Error accepting magic link invitation:", error);
      res.status(500).json({ message: "Failed to accept invitation" });
    }
  });

  // Send team invitation endpoint
  app.post('/api/invitations/send', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { emails, role, message } = req.body;

      console.log(`📧 Sending team invitations from user: ${userId} for emails:`, emails);

      // Validate required parameters
      if (!emails || !Array.isArray(emails) || emails.length === 0) {
        return res.status(400).json({ message: "At least one email address is required" });
      }

      if (!role || !['admin', 'member', 'viewer'].includes(role)) {
        return res.status(400).json({ message: "Valid role is required (admin, member, or viewer)" });
      }

      // Validate email formats
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const invalidEmails = emails.filter(email => !emailRegex.test(email));
      if (invalidEmails.length > 0) {
        return res.status(400).json({
          message: "Invalid email addresses detected",
          invalidEmails
        });
      }

      // Get user's organization to verify permissions
      const organization = await storage.getOrganizationByUser(userId);
      if (!organization) {
        return res.status(403).json({ message: "You must be a member of an organization to send invitations" });
      }

      // Check if user has permission to invite (owner or admin)
      const userMember = await storage.getTeamMemberByUserAndOrg(userId, organization.id);
      if (!userMember || !['owner', 'admin'].includes(userMember.role)) {
        return res.status(403).json({ message: "You don't have permission to invite team members" });
      }

      // Import email service
      const { emailService } = await import('./emailService');

      const invitations = [];
      const errors = [];

      // Process each email
      for (const email of emails) {
        try {
          // Generate unique token and invite code
          const token = crypto.randomUUID();
          const inviteCode = generateInviteCode();

          // Set expiration to 7 days from now
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 7);

          // Check if invitation already exists for this email and org
          const existingInvitation = await storage.getPendingInvitationByEmailAndOrg(email, organization.id);
          if (existingInvitation) {
            errors.push({ email, error: "Invitation already sent to this email" });
            continue;
          }

          // Create invitation in database
          const invitation = await storage.createInvitation({
            organizationId: organization.id,
            email: email.toLowerCase().trim(),
            role: role,
            token: token,
            inviteCode: inviteCode,
            invitedBy: userId,
            status: 'pending',
            expiresAt: expiresAt,
          });

          // Send invitation email
          const registrationLink = `${process.env.APP_URL || 'http://localhost:5000'}/organization-setup?inviteCode=${inviteCode}&organizationId=${organization.id}`;

          const emailSent = await emailService.sendTeamInvitationEmail({
            email: email,
            organizationName: organization.companyName,
            invitedByName: userMember.name || req.user.displayName || req.user.firstName || 'Team Member',
            role: role,
            message: message || '',
            registrationLink: registrationLink,
            inviteCode: inviteCode,
          });

          if (emailSent) {
            invitations.push({
              id: invitation.id,
              email: email,
              inviteCode: inviteCode,
              role: role,
              expiresAt: expiresAt,
            });
          } else {
            errors.push({ email, error: "Failed to send invitation email" });
          }

        } catch (error) {
          console.error(`Error sending invitation to ${email}:`, error);
          errors.push({ email, error: "Failed to create invitation" });
        }
      }

      console.log(`✅ Sent ${invitations.length} invitations, ${errors.length} errors`);

      res.json({
        success: true,
        message: `Successfully sent ${invitations.length} invitation${invitations.length !== 1 ? 's' : ''}`,
        invitations: invitations,
        errors: errors,
      });

    } catch (error) {
      console.error("Error sending team invitations:", error);
      res.status(500).json({ message: "Failed to send invitations" });
    }
  });

  // Helper function to generate 6-character invite code
  function generateInviteCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Get active resume processing jobs
  app.get('/api/resume-processing/active-jobs', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);

      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Get active and waiting jobs from the queue
      const [allActiveJobs, allWaitingJobs] = await Promise.all([
        resumeProcessingQueue.getActive(),
        resumeProcessingQueue.getWaiting()
      ]);

      // Filter jobs by organization ID
      const activeJobs = allActiveJobs.filter((job: any) => {
        const jobData = job.data || {};
        return jobData.organizationId === organization.id;
      });

      const waitingJobs = allWaitingJobs.filter((job: any) => {
        const jobData = job.data || {};
        return jobData.organizationId === organization.id;
      });

      // Calculate total files and progress
      let totalFiles = 0;
      let totalProgress = 0;
      let completedFiles = 0;

      const allJobs = [...activeJobs, ...waitingJobs];

      allJobs.forEach((job: any) => {
        const jobData = job.data || {};
        const progress = job.progress || 0;

        // Count files
        if (job.name === 'process-single-resume') {
          totalFiles += 1;
          completedFiles += progress / 100;
        } else if (job.name === 'process-bulk-resumes') {
          const fileCount = jobData.files?.length || 0;
          totalFiles += fileCount;
          // For bulk jobs, progress represents overall completion of all files
          completedFiles += (fileCount * progress) / 100;
        }

        totalProgress += progress;
      });

      // Calculate overall progress percentage
      const overallProgress = allJobs.length > 0
        ? Math.round(totalProgress / allJobs.length)
        : 0;

      // Get details of currently processing jobs for display
      const activeJobDetails = activeJobs.map((job: any) => {
        const jobData = job.data || {};
        let fileName = 'Unknown';
        let fileCount = 0;

        if (job.name === 'process-single-resume') {
          fileName = jobData.fileName || 'Resume';
          fileCount = 1;
        } else if (job.name === 'process-bulk-resumes') {
          fileCount = jobData.files?.length || 0;
          fileName = `${fileCount} files`;
        }

        return {
          fileName,
          fileCount,
          progress: job.progress || 0,
        };
      });

      res.json({
        totalFiles,
        completedFiles: Math.round(completedFiles),
        overallProgress,
        activeJobsCount: activeJobs.length,
        waitingJobsCount: waitingJobs.length,
        activeJobDetails,
        hasActiveJobs: allJobs.length > 0
      });
    } catch (error) {
      console.error("Error fetching active jobs:", error);
      res.status(500).json({ message: "Failed to fetch active jobs" });
    }
  });

  // Get all resume profiles for organization (optimized - slim response with DB-level filtering)
  app.get('/api/resume-profiles', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { jobId, page = 1, limit = 10, sortBy = 'score', search, status } = req.query;
      const organization = await storage.getOrganizationByUser(userId);

      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Parse pagination parameters
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const validPage = pageNum > 0 ? pageNum : 1;
      // Allow large limit for "All" option (10000), otherwise cap at 100
      const validLimit = limitNum > 0 ? (limitNum >= 10000 ? 10000 : Math.min(limitNum, 100)) : 10;

      // Import localDatabaseService for job matches lookup
      const { localDatabaseService } = await import('./localDatabaseService');

      // Get filtered count and slim profiles using database-level filtering
      // This avoids loading ALL profiles into memory
      const filteredTotalCount = await storage.getResumeProfilesCountFiltered(
        organization.id,
        search,
        status,
        jobId
      );

      // Get only the paginated slim profiles (excludes resumeText, experience, skills, etc.)
      const slimProfiles = await storage.getResumeProfilesSlimWithFilters(
        organization.id,
        validPage,
        validLimit,
        sortBy,
        search,
        status,
        jobId
      );

      // Get all organization jobs for title lookup
      const jobs = await storage.getJobsByOrganization(organization.id);
      const jobsMap = new Map(jobs.map(job => [job.id, job]));

      // Get slim job scores for only the paginated profiles (excludes fullResponse)
      const profileIds = slimProfiles.map(profile => profile.id);
      const allJobScores = await storage.getJobScoresSlimByProfileIds(profileIds);

      // Group job scores by profile ID for quick lookup
      const jobScoresByProfile = new Map<string, typeof allJobScores>();
      for (const score of allJobScores) {
        if (!score.profileId) continue;
        const existing = jobScoresByProfile.get(score.profileId) || [];
        existing.push(score);
        jobScoresByProfile.set(score.profileId, existing);
      }

      // Batch fetch job matches for invitation status
      const uniqueJobIds = [...new Set(allJobScores.map(score => String(score.jobId)))];
      const allJobMatches = await localDatabaseService.getJobMatchesByJobIds(uniqueJobIds);

      // Index job matches by jobId + profileId for quick lookup
      const jobMatchesIndex = new Map<string, typeof allJobMatches[0]>();
      for (const match of allJobMatches) {
        const key = `${match.jobId}:${match.userId}`;
        jobMatchesIndex.set(key, match);
      }

      // Build profiles with scores
      let profilesWithScores = slimProfiles.map(profile => {
        const profileJobScores = jobScoresByProfile.get(profile.id) || [];

        // Filter job scores by specific jobId if provided
        const filteredJobScores = jobId
          ? profileJobScores.filter(score => String(score.jobId) === String(jobId))
          : profileJobScores;

        // Add invitation status from pre-fetched job matches
        const jobScoresWithInvitationStatus = filteredJobScores.map(score => {
          const matchKey = `${score.jobId}:${profile.id}`;
          const existingMatch = jobMatchesIndex.get(matchKey);

          return {
            ...score,
            jobTitle: jobsMap.get(score.jobId!)?.title || 'Unknown Job',
            invitationStatus: existingMatch ? existingMatch.status : null,
            interviewDate: existingMatch?.interviewDate || null,
            interviewTime: existingMatch?.interviewTime || null,
            interviewLink: existingMatch?.interviewLink || null,
          };
        });

        return {
          ...profile,
          jobScores: jobScoresWithInvitationStatus
        };
      });

      // Apply invited/not-invited status filter in-memory (requires job matches data)
      // Note: qualified/disqualified and search filters are handled at DB level
      if (status === 'invited') {
        profilesWithScores = profilesWithScores.filter(profile =>
          profile.jobScores.some(score => score.invitationStatus === 'invited')
        );
      } else if (status === 'not-invited') {
        profilesWithScores = profilesWithScores.filter(profile =>
          profile.jobScores.some(score =>
            !score.disqualified && score.invitationStatus !== 'invited'
          )
        );
      }

      // Calculate stats for response
      let qualifiedCount = 0;
      let disqualifiedCount = 0;

      profilesWithScores.forEach(profile => {
        profile.jobScores.forEach(jobScore => {
          if (jobScore.disqualified) {
            disqualifiedCount++;
          } else {
            qualifiedCount++;
          }
        });
      });

      // Calculate pagination
      const filteredTotalPages = Math.ceil(filteredTotalCount / validLimit);

      res.json({
        data: profilesWithScores,
        pagination: {
          currentPage: validPage,
          totalPages: filteredTotalPages,
          totalItems: filteredTotalCount,
          itemsPerPage: validLimit,
          hasNextPage: validPage < filteredTotalPages,
          hasPrevPage: validPage > 1
        },
        stats: {
          totalProfiles: filteredTotalCount,
          qualifiedCount,
          disqualifiedCount
        }
      });
    } catch (error) {
      console.error("Error fetching resume profiles:", error);
      res.status(500).json({ message: "Failed to fetch resume profiles" });
    }
  });

  // Get single resume profile with full details (for modal view)
  app.get('/api/resume-profiles/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { jobId } = req.query;

      const organization = await storage.getOrganizationByUser(userId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Get full profile with all fields
      const profile = await storage.getResumeProfileById(id);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      // Verify profile belongs to organization
      if (profile.organizationId !== organization.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get full job scores (including fullResponse)
      const jobScores = await storage.getJobScoresByProfile(id);

      // Filter by jobId if provided
      const filteredScores = jobId
        ? jobScores.filter(s => String(s.jobId) === String(jobId))
        : jobScores;

      // Get job matches for invitation status
      const { localDatabaseService } = await import('./localDatabaseService');
      const jobs = await storage.getJobsByOrganization(organization.id);
      const jobsMap = new Map(jobs.map(j => [j.id, j]));

      const uniqueJobIds = [...new Set(filteredScores.map(s => String(s.jobId)))];
      const allJobMatches = await localDatabaseService.getJobMatchesByJobIds(uniqueJobIds);
      const jobMatchesIndex = new Map<string, typeof allJobMatches[0]>();
      for (const match of allJobMatches) {
        const key = `${match.jobId}:${match.userId}`;
        jobMatchesIndex.set(key, match);
      }

      // Build response with full data
      const jobScoresWithDetails = filteredScores.map(score => {
        const matchKey = `${score.jobId}:${profile.id}`;
        const existingMatch = jobMatchesIndex.get(matchKey);
        return {
          ...score,
          jobTitle: jobsMap.get(score.jobId!)?.title || 'Unknown Job',
          invitationStatus: existingMatch?.status || null,
          interviewDate: existingMatch?.interviewDate || null,
          interviewTime: existingMatch?.interviewTime || null,
          interviewLink: existingMatch?.interviewLink || null,
        };
      });

      res.json({
        ...profile,
        jobScores: jobScoresWithDetails
      });
    } catch (error) {
      console.error("Error fetching resume profile:", error);
      res.status(500).json({ message: "Failed to fetch resume profile" });
    }
  });

  // Get count of resume profiles for organization
  app.get('/api/resume-profiles/count', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);

      if (!organization) {
        return res.json({ count: 0 });
      }

      const count = await storage.getResumeProfilesCountByOrganization(organization.id);
      res.json({ count });
    } catch (error) {
      console.error("Error counting resume profiles:", error);
      res.json({ count: 0 });
    }
  });

  // Search resumes using RAG based on job requirements
  app.get('/api/resume-profiles/search', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { jobId } = req.query;

      if (!jobId) {
        return res.status(400).json({ message: "Job ID is required" });
      }

      const organization = await storage.getOrganizationByUser(userId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Get job details
      const job = await storage.getJobById(parseInt(jobId, 10));
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      if (job.organizationId !== organization.id) {
        return res.status(403).json({ message: "You don't have permission to access this job" });
      }

      // Construct search query from job requirements
      // Similar to how jobs are indexed, we create a natural language query
      const queryParts: string[] = [];

      queryParts.push(`Looking for candidates for a ${job.title} position`);

      if (job.seniorityLevel) {
        queryParts.push(`at ${job.seniorityLevel} level`);
      }

      if (job.description) {
        queryParts.push(`\n\n${job.description}`);
      }

      if (job.requirements) {
        queryParts.push(`\n\nRequirements: ${job.requirements}`);
      }

      if (job.technicalSkills && job.technicalSkills.length > 0) {
        queryParts.push(`\n\nRequired technical skills: ${job.technicalSkills.join(", ")}`);
      }

      if (job.softSkills && job.softSkills.length > 0) {
        queryParts.push(`\n\nDesired soft skills: ${job.softSkills.join(", ")}`);
      }

      if (job.experienceLevel) {
        queryParts.push(`\n\nExperience level: ${job.experienceLevel}`);
      }

      const searchQuery = queryParts.join("");

      console.log(`🔍 Searching for resumes matching job: ${job.title}`);

      // Search RAG for matching resumes
      const ragResults = await resumeRagService.searchResumes(searchQuery, 20); // Get top 20 matches

      // Transform results
      const matches = resumeRagService.transformToResumeMatches(ragResults);

      // // Filter to only include resumes from this organization
      // const orgMatches = matches.filter(match => {
      //   // Find the RAG result by UUID (stored in payload)
      //   const ragResult = ragResults.find(r => {
      //     const uuid = r.payload.id || (r.payload as any).uuid;
      //     return uuid === match.id;
      //   });
      //   return ragResult?.payload?.organizationId === organization.id;
      // });

      // Enrich with existing job scores if available
      const enrichedMatches = await Promise.all(matches.map(async (match) => {
        const jobScores = await storage.getJobScoresByProfile(match.resume.id);
        const scoreForThisJob = jobScores.find(score => score.jobId === job.id);

        return {
          ...match,
          existingScore: scoreForThisJob ? {
            overallScore: scoreForThisJob.overallScore,
            technicalSkillsScore: scoreForThisJob.technicalSkillsScore,
            experienceScore: scoreForThisJob.experienceScore,
            culturalFitScore: scoreForThisJob.culturalFitScore,
            matchSummary: scoreForThisJob.matchSummary,
          } : null
        };
      }));

      console.log(`✅ Found ${enrichedMatches.length} matching resumes for job ${job.title}`);

      res.json({
        success: true,
        job: {
          id: job.id,
          title: job.title
        },
        matches: enrichedMatches,
        totalMatches: enrichedMatches.length
      });
    } catch (error) {
      console.error("Error searching resumes:", error);
      res.status(500).json({
        message: "Failed to search resumes",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Bulk index all existing resumes into RAG
  app.get('/api/resume-profiles/bulk-index', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;

      const organization = await storage.getOrganizationByUser(userId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      console.log(`📚 Starting bulk RAG indexing for organization ${organization.id}`);

      // Get all resume profiles for this organization
      const profiles = await storage.getResumeProfilesByOrganization(organization.id);

      if (profiles.length === 0) {
        return res.json({
          success: true,
          message: "No resumes to index",
          indexed: 0,
          failed: 0
        });
      }

      let indexed = 0;
      let failed = 0;
      const errors: string[] = [];

      // Index each resume
      for (const profile of profiles) {
        try {
          console.log(`📚 Indexing resume ${profile.id} (${profile.name})...`);
          const result = await ragIndexingService.indexResume({
            id: profile.id,
            name: profile.name,
            email: profile.email,
            phone: profile.phone,
            summary: profile.summary,
            experience: profile.experience,
            skills: profile.skills,
            education: profile.education,
            certifications: profile.certifications,
            languages: profile.languages,
            resumeText: profile.resumeText,
            organizationId: profile.organizationId
          });

          if (result.success) {
            indexed++;
          } else {
            failed++;
            errors.push(`${profile.name}: ${result.message}`);
          }
        } catch (error) {
          console.error(`❌ Error indexing resume ${profile.id}:`, error);
          failed++;
          errors.push(`${profile.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      console.log(`✅ Bulk indexing complete: ${indexed} indexed, ${failed} failed`);

      res.json({
        success: true,
        message: `Indexed ${indexed} out of ${profiles.length} resumes`,
        indexed,
        failed,
        total: profiles.length,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error("Error bulk indexing resumes:", error);
      res.status(500).json({
        message: "Failed to bulk index resumes",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get recent custom rules for resume processing
  app.get('/api/custom-rules', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);

      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const jobId = req.query.jobId ? parseInt(req.query.jobId as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 5;

      const rules = await storage.getRecentCustomRules(organization.id, jobId, limit);

      res.json(rules);
    } catch (error) {
      console.error("Error fetching custom rules:", error);
      res.status(500).json({
        message: "Failed to fetch custom rules",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Process single resume (background job)
  // Note: We handle credit deduction manually here instead of using requireResumeProcessingCredits middleware
  // because we need to calculate credits based on number of jobs when processing against all jobs
  app.post('/api/resume-profiles/process', requireAuthOrService, async (req: any, res) => {
    try {
      // Determine if this is a service call (requireAuthOrService doesn't set this)
      const serviceApiKey = process.env.SERVICE_API_KEY;
      const authHeader = req.headers.authorization;
      const isServiceCall = !!(serviceApiKey && authHeader && authHeader.replace('Bearer ', '').trim() === serviceApiKey);

      // Get user ID based on call type
      const userId = isServiceCall ? req.body.userId : req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User ID is required" });
      }

      // Get organization based on call type
      let organization;
      if (isServiceCall) {
        // For service calls, organizationId should be in the request body
        const organizationId = req.body.organizationId;
        if (!organizationId) {
          return res.status(400).json({ message: "Organization ID is required for service calls" });
        }
        organization = { id: organizationId };
      } else {
        // For user calls, get organization from user
        organization = await storage.getOrganizationByUser(userId);
        if (!organization) {
          return res.status(404).json({ message: "Organization not found" });
        }
      }

      const organizationId = organization.id;

      console.log(`📋 Resume processing request: ${isServiceCall ? 'Service call' : 'User call'} for org ${organizationId}`);

      const { resumeText, fileType, fileName, jobId, customRules } = req.body;

      if (!resumeText || resumeText.trim().length < 50) {
        return res.status(400).json({ message: "Resume text is required and must be substantial" });
      }

      if (!fileName) {
        return res.status(400).json({ message: "File name is required" });
      }

      // Create background job for processing
      const { addSingleResumeProcessingJob } = await import('./jobProducers');

      // Determine how many jobs to process against
      let targetJobs: any[] = [];
      if (jobId) {
        // Single job - just need 1 credit
        const job = await storage.getJob(parseInt(jobId, 10));
        if (!job || job.organizationId !== organization.id) {
          return res.status(404).json({ message: "Job not found or doesn't belong to your organization" });
        }
        targetJobs = [job];
      } else {
        // All jobs - need 1 credit per job
        targetJobs = await storage.getJobsByOrganization(organization.id);
        if (targetJobs.length === 0) {
          return res.status(400).json({ message: "No active jobs found. Please create at least one job posting first." });
        }
      }

      // Calculate and check credits (only for non-service calls)
      const resumeProcessingCost = await creditService.getActionCost('resume_processing');
      const totalCreditsRequired = targetJobs.length * resumeProcessingCost;

      if (!isServiceCall) {
        const hasCredits = await creditService.checkCredits(
          organizationId,
          totalCreditsRequired,
          'cv_processing'
        );

        if (!hasCredits) {
          const currentBalance = await creditService.getCreditBalance(organizationId);
          return res.status(402).json({
            message: `Insufficient credits. Processing resume against ${targetJobs.length} job${targetJobs.length !== 1 ? 's' : ''} requires ${totalCreditsRequired} credit${totalCreditsRequired !== 1 ? 's' : ''}, but you only have ${currentBalance?.cvProcessingCredits || 0} CV processing credits available.`,
            requiredCredits: totalCreditsRequired,
            availableCredits: currentBalance?.cvProcessingCredits || 0,
            creditBalance: currentBalance
          });
        }
      }

      // Save file to disk first (optimizes Redis memory usage)
      const savedFile = await fileStorageService.saveFileFromBase64(
        resumeText,
        fileName || 'resume.txt',
        fileType || 'text/plain',
        userId
      );
      console.log(`💾 Saved resume to disk: ${savedFile.filePath}`);

      // Create separate queue jobs for each target job (passing file path instead of content)
      const queueJobs = await Promise.all(
        targetJobs.map(targetJob => addSingleResumeProcessingJob({
          filePath: savedFile.filePath,
          fileName: fileName || 'resume.txt',
          fileType: fileType || 'text/plain',
          userId,
          organizationId,
          jobId: targetJob.id.toString(), // Always pass the specific jobId
          customRules
        }))
      );

      console.log(`📋 Created ${queueJobs.length} background resume processing job(s) for user ${userId}, file: ${fileName}`);

      // Save custom rules if provided (for future suggestions)
      if (customRules && customRules.trim()) {
        try {
          await storage.createCustomRule({
            organizationId,
            jobId: jobId ? parseInt(jobId, 10) : null,
            rulesText: customRules.trim()
          });
        } catch (ruleError) {
          // Log but don't fail the request if saving rules fails
          console.error("Error saving custom rules:", ruleError);
        }
      }

      // Deduct credits after successful job creation (only for non-service calls)
      if (!isServiceCall) {
        await creditService.deductCredits(
          organizationId,
          totalCreditsRequired,
          'cv_processing',
          'cv_processing',
          `Resume processing: ${fileName} against ${targetJobs.length} job${targetJobs.length !== 1 ? 's' : ''}`,
          jobId || undefined,
          'resume_processing'
        );
      }

      // Get updated credit balance for response
      const creditBalance = isServiceCall ? null : await creditService.getCreditBalance(organizationId);

      res.json({
        success: true,
        jobIds: queueJobs.map(j => j.id),
        jobCount: targetJobs.length,
        fileCount: 1,
        message: `Resume processing started against ${targetJobs.length} job${targetJobs.length !== 1 ? 's' : ''}`,
        status: "processing",
        ...(creditBalance && { creditBalance })
      });
    } catch (error) {
      console.error("Error creating resume processing job:", error);
      console.error("Request body:", { resumeTextLength: req.body?.resumeText?.length, fileType: req.body?.fileType });
      res.status(500).json({
        message: "Failed to start resume processing",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Process multiple resumes (bulk background job)
  app.post('/api/resume-profiles/process-bulk', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);

      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const { files, jobId, customRules } = req.body;

      if (!files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ message: "Files array is required" });
      }

      // Validate files
      for (const file of files) {
        if (!file.content || file.content.trim().length < 50) {
          return res.status(400).json({
            message: `File ${file.name || 'unknown'} has insufficient content`
          });
        }
        if (!file.name) {
          return res.status(400).json({
            message: `File name is required for all files`
          });
        }
      }

      // Determine how many jobs to process against
      let targetJobs: any[] = [];
      if (jobId) {
        // Single job - just need 1 credit per file
        const job = await storage.getJob(parseInt(jobId, 10));
        if (!job || job.organizationId !== organization.id) {
          return res.status(404).json({ message: "Job not found or doesn't belong to your organization" });
        }
        targetJobs = [job];
      } else {
        // All jobs - need 1 credit per file per job
        targetJobs = await storage.getJobsByOrganization(organization.id);
        if (targetJobs.length === 0) {
          return res.status(400).json({ message: "No active jobs found. Please create at least one job posting first." });
        }
      }

      // Check and validate credits for bulk processing
      // Credits = files.length * targetJobs.length * cost per processing
      const resumeProcessingCost = await creditService.getActionCost('resume_processing');
      const totalCreditsRequired = files.length * targetJobs.length * resumeProcessingCost;

      const hasCredits = await creditService.checkCredits(
        organization.id,
        totalCreditsRequired,
        'cv_processing'
      );

      if (!hasCredits) {
        const currentBalance = await creditService.getCreditBalance(organization.id);
        return res.status(402).json({
          message: `Insufficient credits. Processing ${files.length} resume${files.length !== 1 ? 's' : ''} against ${targetJobs.length} job${targetJobs.length !== 1 ? 's' : ''} requires ${totalCreditsRequired} credit${totalCreditsRequired !== 1 ? 's' : ''}, but you only have ${currentBalance?.cvProcessingCredits || 0} CV processing credits available.`,
          requiredCredits: totalCreditsRequired,
          availableCredits: currentBalance?.cvProcessingCredits || 0,
          creditBalance: currentBalance
        });
      }

      // Create background jobs for each file + job combination
      const { addSingleResumeProcessingJob } = await import('./jobProducers');

      // Save all files to disk first (optimizes Redis memory usage)
      const savedFiles = await Promise.all(
        files.map(file => fileStorageService.saveFileFromBase64(
          file.content,
          file.name,
          file.type || 'text/plain',
          userId
        ))
      );
      console.log(`💾 Saved ${savedFiles.length} resume files to disk`);

      const allQueueJobs = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const savedFile = savedFiles[i];
        for (const targetJob of targetJobs) {
          const queueJob = await addSingleResumeProcessingJob({
            filePath: savedFile.filePath,
            fileName: file.name,
            fileType: file.type || 'text/plain',
            userId,
            organizationId: organization.id,
            jobId: targetJob.id.toString(), // Always pass the specific jobId
            customRules
          });
          allQueueJobs.push(queueJob);
        }
      }

      console.log(`📋 Created ${allQueueJobs.length} background resume processing jobs for user ${userId}: ${files.length} files x ${targetJobs.length} jobs`);

      // Save custom rules if provided (for future suggestions)
      if (customRules && customRules.trim()) {
        try {
          await storage.createCustomRule({
            organizationId: organization.id,
            jobId: jobId ? parseInt(jobId, 10) : null,
            rulesText: customRules.trim()
          });
        } catch (ruleError) {
          // Log but don't fail the request if saving rules fails
          console.error("Error saving custom rules:", ruleError);
        }
      }

      // Deduct credits for bulk processing
      await creditService.deductCredits(
        organization.id,
        totalCreditsRequired,
        'cv_processing',
        'cv_processing',
        `Bulk resume processing: ${files.length} file${files.length !== 1 ? 's' : ''} against ${targetJobs.length} job${targetJobs.length !== 1 ? 's' : ''}`,
        jobId || undefined,
        'resume_processing'
      );

      // Get updated credit balance
      const updatedBalance = await creditService.getCreditBalance(organization.id);

      res.json({
        success: true,
        jobIds: allQueueJobs.map(j => j.id),
        fileCount: files.length,
        jobCount: targetJobs.length,
        totalQueueJobs: allQueueJobs.length,
        message: `Bulk processing started: ${files.length} resume${files.length !== 1 ? 's' : ''} against ${targetJobs.length} job${targetJobs.length !== 1 ? 's' : ''}`,
        status: "processing",
        creditBalance: updatedBalance
      });
    } catch (error) {
      console.error("Error creating bulk resume processing job:", error);
      res.status(500).json({
        message: "Failed to start bulk resume processing",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  
  // Delete resume profile
  app.delete('/api/resume-profiles/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ message: "Profile ID is required" });
      }

      const organization = await storage.getOrganizationByUser(userId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // First check if the profile exists and belongs to the user's organization
      const profile = await storage.getResumeProfileById(id);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      if (profile.organizationId !== organization.id) {
        return res.status(403).json({ message: "You don't have permission to delete this profile" });
      }

      // Delete related job scores first
      const jobScores = await storage.getJobScoresByProfile(id);
      for (const score of jobScores) {
        await storage.deleteJobScore(score.id);
      }

      // Delete the profile
      await storage.deleteResumeProfile(id);

      // Remove from RAG index
      try {
        await ragIndexingService.removeResume(id);
        console.log(`📚 Removed resume ${id} from RAG index`);
      } catch (ragError) {
        console.error(`⚠️ Failed to remove resume from RAG index (non-blocking):`, ragError);
      }

      console.log(`✅ Resume profile deleted: ${id} with ${jobScores.length} job scores by user ${userId}`);

      res.status(200).json({ message: "Profile deleted successfully" });
    } catch (error) {
      console.error("Error deleting resume profile:", error);
      res.status(500).json({
        message: "Failed to delete profile",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Bulk delete all resume profiles for an organization
  app.delete('/api/resume-profiles', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;

      const organization = await storage.getOrganizationByUser(userId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Get all profiles for the organization
      const profiles = await storage.getResumeProfilesByOrganization(organization.id);

      if (profiles.length === 0) {
        return res.status(200).json({
          message: "No profiles found to delete",
          deletedCount: 0
        });
      }

      let deletedCount = 0;
      let deletedJobScores = 0;

      // Delete each profile and its related job scores
      for (const profile of profiles) {
        try {
          // Delete related job scores first
          const jobScores = await storage.getJobScoresByProfile(profile.id);
          for (const score of jobScores) {
            await storage.deleteJobScore(score.id);
            deletedJobScores++;
          }

          // Delete the profile
          await storage.deleteResumeProfile(profile.id);

          // Remove from RAG index
          try {
            await ragIndexingService.removeResume(profile.id);
          } catch (ragError) {
            console.error(`⚠️ Failed to remove resume ${profile.id} from RAG index:`, ragError);
          }

          deletedCount++;
        } catch (error) {
          console.error(`Error deleting profile ${profile.id}:`, error);
          // Continue with other profiles even if one fails
        }
      }

      console.log(`✅ Bulk delete completed by user ${userId}: ${deletedCount} profiles and ${deletedJobScores} job scores deleted`);

      res.status(200).json({
        message: `Successfully deleted ${deletedCount} resume profiles`,
        deletedCount,
        deletedJobScores
      });
    } catch (error) {
      console.error("Error bulk deleting resume profiles:", error);
      res.status(500).json({
        message: "Failed to delete profiles",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Invite applicant endpoint
  app.post('/api/invite-applicant', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { profileId, jobId } = req.body;

      if (!profileId || !jobId) {
        return res.status(400).json({ message: "Profile ID and Job ID are required" });
      }

      const organization = await storage.getOrganizationByUser(userId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Get the profile and job details
      const profile = await storage.getResumeProfileById(profileId);
      const job = await storage.getJobById(parseInt(jobId));

      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      // Check if already invited
      const { localDatabaseService } = await import('./localDatabaseService');
      const jobIdString = String(jobId);
      const existingMatches = await localDatabaseService.getJobMatchesByJob(jobIdString);
      const existingMatch = existingMatches.find(match => match.userId === profileId);

      console.log(`🔍 Checking existing invitation: profileId=${profileId}, jobId=${jobIdString}`);
      console.log(`   Found ${existingMatches.length} existing matches for this job`);
      console.log(`   Already invited: ${existingMatch && existingMatch.status === 'invited'}`);

      if (existingMatch && existingMatch.status === 'invited') {
        return res.status(400).json({ message: "Applicant already invited" });
      }

      // Extract resume data for invitation
      const processedResume = {
        name: profile.name,
        email: profile.email,
        summary: profile.summary,
        fileId: profile.fileId
      };

      // Generate unique token and username for invitation
      const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
      const names = (processedResume.name || '').trim().split(/\s+/);
      const firstName = names[0] || '';
      const lastName = names.slice(1).join(' ') || '';
      const username = (firstName + (lastName ? lastName[0].toUpperCase() + lastName.slice(1) : ''))
        .replace(/\s+/g, '')
        .replace(/[^a-zA-Z0-9]/g, '');

      const companyName = organization.companyName || 'Our Company';

      // Create user profile in local database if not exists
      try {
        console.log(`👤 Creating user profile for ${processedResume.email} in local database`);
        await localDatabaseService.createUserProfile({
          userId: profileId,
          name: processedResume.name || `${firstName} ${lastName}`.trim(),
          email: processedResume.email,
          phone: '', // Could be extracted from resume
          professionalSummary: processedResume.summary || '',
          experienceLevel: '', // Could be determined from resume
          location: '', // Could be extracted from resume
          fileId: processedResume.fileId,
        } as any);
        console.log(`✅ Successfully created user profile in local database`);
      } catch (userErr) {
        console.error('Error creating user profile in local database:', userErr);
      }

      // Create job match record to track the interview invitation
      try {
        // Ensure jobId is stored as string for consistency with varchar column
        const jobIdString = String(jobId);
        console.log(`📝 Creating job match and interview invitation for ${processedResume.email} using local database`);
        console.log(`   Profile ID: ${profileId}, Job ID: ${jobIdString}`);
        await localDatabaseService.createJobMatch({
          userId: profileId,
          jobId: jobIdString,
          name: processedResume.name || processedResume.email,
          jobTitle: job.title,
          jobDescription: job.description,
          companyName: companyName,
          matchScore: 0, // Manual invitation, not based on score
          status: 'invited',
          interviewDate: new Date(),
          token: token,
        } as any);
        console.log(`✅ Successfully created interview invitation in local database`);
      } catch (aiErr) {
        console.error('Error creating AI interview invitation:', aiErr);
        return res.status(500).json({ message: "Failed to create invitation", error: aiErr.message });
      }

      // Build invitation link to Applicants app with token
      const baseUrl = process.env.APPLICANTS_APP_URL || 'https://applicants.platohiring.com';
      const invitationLink = `${baseUrl.replace(/\/$/, '')}/ai-interview-initation?token=${encodeURIComponent(token)}`;

      // Send invitation email via SendGrid (non-blocking)
      try {
        const { emailService } = await import('./emailService');
        await emailService.sendInterviewInvitationEmail({
          applicantName: processedResume.name || processedResume.email,
          applicantEmail: processedResume.email,
          jobTitle: job.title,
          companyName,
          invitationLink,
          matchScore: 0, // Manual invitation
          matchSummary: "Manual invitation by employer",
        });
        console.log(`📧 Invitation email sent to ${processedResume.email}`);
      } catch (emailErr) {
        console.warn('📧 Invitation email failed (non-blocking):', emailErr);
      }

      // Schedule reminder emails (1h and 24h after invitation)
      try {
        const { scheduleInterviewReminderJob } = await import('./jobProducers');

        // Get the newly created job match to get its ID
        const newMatch = await localDatabaseService.getJobMatchByUserAndJob(profileId, jobIdString);

        if (newMatch) {
          const ONE_HOUR_MS = 60 * 60 * 1000;
          const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

          // Schedule 1-hour reminder
          const reminder1hJob = await scheduleInterviewReminderJob({
            applicantName: processedResume.name || processedResume.email,
            applicantEmail: processedResume.email,
            jobTitle: job.title,
            companyName,
            invitationLink,
            matchId: newMatch.id,
            reminderType: '1h',
          }, ONE_HOUR_MS);

          // Schedule 24-hour reminder
          const reminder24hJob = await scheduleInterviewReminderJob({
            applicantName: processedResume.name || processedResume.email,
            applicantEmail: processedResume.email,
            jobTitle: job.title,
            companyName,
            invitationLink,
            matchId: newMatch.id,
            reminderType: '24h',
          }, TWENTY_FOUR_HOURS_MS);

          // Store job IDs for potential cancellation
          await localDatabaseService.updateJobMatch(newMatch.id, {
            reminder1hJobId: `reminder-1h-${newMatch.id}`,
            reminder24hJobId: `reminder-24h-${newMatch.id}`,
          });

          console.log(`⏰ Scheduled reminder emails for match ${newMatch.id}`);
        }
      } catch (reminderErr) {
        console.warn('⏰ Failed to schedule reminder emails (non-blocking):', reminderErr);
      }

      res.json({
        success: true,
        message: "Applicant invited successfully",
        invitationLink,
        token
      });

    } catch (error) {
      console.error("Error inviting applicant:", error);
      res.status(500).json({
        message: "Failed to invite applicant",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Resend invitation endpoint
  app.post('/api/resend-invitation', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { profileId, jobId } = req.body;

      if (!profileId || !jobId) {
        return res.status(400).json({ message: "Profile ID and Job ID are required" });
      }

      const organization = await storage.getOrganizationByUser(userId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Get the profile and job details
      const profile = await storage.getResumeProfileById(profileId);
      const job = await storage.getJobById(parseInt(jobId));

      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      // Get existing job match to retrieve the token
      const { localDatabaseService } = await import('./localDatabaseService');
      const jobIdString = String(jobId);
      const existingMatch = await localDatabaseService.getJobMatchByUserAndJob(profileId, jobIdString);

      if (!existingMatch) {
        return res.status(404).json({ message: "No existing invitation found for this profile and job" });
      }

      if (existingMatch.status !== 'invited') {
        return res.status(400).json({
          message: `Cannot resend invitation - current status is '${existingMatch.status}'`
        });
      }

      // Build invitation link using existing token
      const baseUrl = process.env.APPLICANTS_APP_URL || 'https://applicants.platohiring.com';
      const invitationLink = `${baseUrl.replace(/\/$/, '')}/ai-interview-initation?token=${encodeURIComponent(existingMatch.token)}`;

      const companyName = organization.companyName || 'Our Company';

      // Resend invitation email
      try {
        const { emailService } = await import('./emailService');
        await emailService.sendInterviewInvitationEmail({
          applicantName: profile.name || profile.email,
          applicantEmail: profile.email,
          jobTitle: job.title,
          companyName,
          invitationLink,
          matchScore: existingMatch.matchScore || 0,
          matchSummary: "Invitation resent by employer",
        });
        console.log(`📧 Invitation email resent to ${profile.email}`);
      } catch (emailErr) {
        console.error('📧 Resend invitation email failed:', emailErr);
        return res.status(500).json({ message: "Failed to send invitation email" });
      }

      // Cancel old reminders and reschedule new ones
      try {
        const { scheduleInterviewReminderJob, cancelScheduledReminderJob } = await import('./jobProducers');

        // Cancel existing reminders if they exist
        if (existingMatch.reminder1hJobId) {
          await cancelScheduledReminderJob(existingMatch.reminder1hJobId);
        }
        if (existingMatch.reminder24hJobId) {
          await cancelScheduledReminderJob(existingMatch.reminder24hJobId);
        }

        const ONE_HOUR_MS = 60 * 60 * 1000;
        const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

        // Reschedule reminders
        await scheduleInterviewReminderJob({
          applicantName: profile.name || profile.email,
          applicantEmail: profile.email,
          jobTitle: job.title,
          companyName,
          invitationLink,
          matchId: existingMatch.id,
          reminderType: '1h',
        }, ONE_HOUR_MS);

        await scheduleInterviewReminderJob({
          applicantName: profile.name || profile.email,
          applicantEmail: profile.email,
          jobTitle: job.title,
          companyName,
          invitationLink,
          matchId: existingMatch.id,
          reminderType: '24h',
        }, TWENTY_FOUR_HOURS_MS);

        // Update reminder job IDs and reset sent flags
        await localDatabaseService.updateJobMatch(existingMatch.id, {
          reminder1hJobId: `reminder-1h-${existingMatch.id}`,
          reminder24hJobId: `reminder-24h-${existingMatch.id}`,
          reminder1hSent: false,
          reminder24hSent: false,
        });

        console.log(`⏰ Rescheduled reminder emails for match ${existingMatch.id}`);
      } catch (reminderErr) {
        console.warn('⏰ Failed to reschedule reminder emails (non-blocking):', reminderErr);
      }

      res.json({
        success: true,
        message: "Invitation resent successfully",
        invitationLink
      });

    } catch (error) {
      console.error("Error resending invitation:", error);
      res.status(500).json({
        message: "Failed to resend invitation",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Bulk index all jobs in RAG system
  app.get('/api/jobs/bulk-index-rag', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organization = await storage.getOrganizationByUser(userId);

      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      console.log(`📚 Starting bulk index of all jobs for organization ${organization.id}...`);

      // Get all jobs for the organization
      const jobs = await storage.getJobsByOrganization(organization.id);

      if (jobs.length === 0) {
        return res.status(200).json({
          success: true,
          message: "No jobs found to index",
          indexedCount: 0,
          failedCount: 0
        });
      }

      console.log(`📊 Found ${jobs.length} jobs to index`);

      // Use the RAG indexing service to index each job
      let indexedCount = 0;
      let failedCount = 0;
      const results = [];

      for (const job of jobs) {
        try {
          const jobData = {
            id: job.id,
            title: job.title,
            description: job.description || '',
            requirements: job.requirements || '',
            technicalSkills: job.technicalSkills || [],
            softSkills: job.softSkills || [],
            experience: job.experienceLevel || '',
            employmentType: job.employmentType || '',
            workplaceType: job.workplaceType || '',
            seniorityLevel: job.seniorityLevel || '',
            industry: job.industry || '',
            location: job.location || '',
            organizationId: organization.id
          };

          const result = await ragIndexingService.indexJob(jobData);

          if (result.success) {
            indexedCount++;
          } else {
            failedCount++;
          }

          results.push({
            jobId: job.id,
            jobTitle: job.title,
            success: result.success,
            message: result.message
          });
        } catch (jobError) {
          console.error(`❌ Error indexing job ${job.id}:`, jobError);
          failedCount++;
          results.push({
            jobId: job.id,
            jobTitle: job.title,
            success: false,
            message: jobError instanceof Error ? jobError.message : "Unknown error"
          });
        }
      }

      console.log(`✅ Bulk indexing completed: ${indexedCount} successful, ${failedCount} failed`);

      res.json({
        success: true,
        message: `Successfully indexed ${indexedCount} jobs in RAG system. ${failedCount} failed.`,
        indexedCount,
        failedCount,
        results
      });

    } catch (error) {
      console.error("❌ Error bulk indexing jobs in RAG:", error);
      res.status(500).json({
        message: "Failed to bulk index jobs in RAG system",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // === Stripe Payment Endpoints ===

  // Get available credit packages
  app.get('/api/credit-packages', requireVerifiedAuth, async (req: any, res) => {
    try {
      const packages = await stripeService.getCreditPackages();
      res.json(packages);
    } catch (error) {
      console.error("Error fetching credit packages:", error);
      res.status(500).json({ message: "Failed to fetch credit packages" });
    }
  });

  // Create checkout session for credit purchase
  app.post('/api/payments/create-checkout', requireVerifiedAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { creditPackageId } = req.body;

      if (!creditPackageId) {
        return res.status(400).json({ message: "Credit package ID is required" });
      }

      // Get user's organization
      const organization = await storage.getOrganizationByUser(userId);
      if (!organization) {
        return res.status(404).json({ message: "No organization found" });
      }

      const successUrl = `${process.env.APP_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${process.env.APP_URL}/payment/canceled`;

      const checkoutSession = await stripeService.createCheckoutSession({
        organizationId: organization.id,
        creditPackageId,
        successUrl,
        cancelUrl,
        customerEmail: req.user.email,
      });

      res.json(checkoutSession);
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({
        message: "Failed to create checkout session",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get payment history for organization
  app.get('/api/payments/history', requireVerifiedAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit as string) || 50;

      // Get user's organization
      const organization = await storage.getOrganizationByUser(userId);
      if (!organization) {
        return res.status(404).json({ message: "No organization found" });
      }

      const paymentHistory = await stripeService.getPaymentHistory(organization.id, limit);
      res.json(paymentHistory);
    } catch (error) {
      console.error("Error fetching payment history:", error);
      res.status(500).json({ message: "Failed to fetch payment history" });
    }
  });

  // Stripe webhook endpoint - needs raw body for signature verification
  app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
      const sig = req.headers['stripe-signature'] as string;
      const event = req.body; // Raw body as string

      console.log('🔔 Received Stripe webhook');

      // Verify webhook signature
      if (!sig || !event) {
        console.warn('Missing signature or event');
        // return res.status(400).json({ message: 'Missing signature or event' });
      }

      if (!stripeService.verifyWebhookSignature(event, sig)) {
        console.warn('Invalid webhook signature');
        // return res.status(400).json({ message: 'Invalid webhook signature' });
      }
      
      console.log(`📨 Processing webhook event: ${event.type}`);

      switch (event.type) {
        case 'checkout.session.completed':
          console.log('✅ Payment completed, processing credit addition...');
          const session = event.data.object as Stripe.Checkout.Session;
          // Check if this is for subscription or one-time payment
          if (session.mode === 'subscription') {
            console.log('📦 Subscription checkout completed, will be handled by subscription.created');
          } else {
            await stripeService.processSuccessfulPayment(session);
          }
          break;

        case 'checkout.session.expired':
          console.log('⏰ Payment session expired');
          const expiredSession = event.data.object as Stripe.Checkout.Session;
          await stripeService.processFailedPayment(expiredSession);
          break;

        case 'checkout.session.async_payment_failed':
          console.log('❌ Async payment failed');
          const failedSession = event.data.object as Stripe.Checkout.Session;
          await stripeService.processFailedPayment(failedSession);
          break;

        case 'checkout.session.async_payment_succeeded':
          console.log('✅ Async payment succeeded');
          const successSession = event.data.object as Stripe.Checkout.Session;
          await stripeService.processSuccessfulPayment(successSession);
          break;

        // Subscription webhook events
        case 'customer.subscription.created':
          console.log('🔔 Subscription created');
          const createdSubscription = event.data.object as Stripe.Subscription;
          await stripeService.handleSubscriptionCreated(createdSubscription);
          break;

        case 'customer.subscription.updated':
          console.log('🔔 Subscription updated');
          const updatedSubscription = event.data.object as Stripe.Subscription;
          await stripeService.handleSubscriptionUpdated(updatedSubscription);
          break;

        case 'customer.subscription.deleted':
          console.log('🔔 Subscription deleted');
          const deletedSubscription = event.data.object as Stripe.Subscription;
          await stripeService.handleSubscriptionDeleted(deletedSubscription);
          break;

        case 'invoice.paid':
          console.log('💰 Invoice paid');
          const paidInvoice = event.data.object as Stripe.Invoice;
          await stripeService.handleInvoicePaid(paidInvoice);
          break;

        case 'invoice.payment_failed':
          console.log('❌ Invoice payment failed');
          const failedInvoice = event.data.object as Stripe.Invoice;
          await stripeService.handleInvoicePaymentFailed(failedInvoice);
          break;

        default:
          console.log(`ℹ️ Unhandled webhook event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error("❌ Error processing webhook:", error);
      res.status(500).json({ message: "Failed to process webhook" });
    }
  });

  // Admin endpoint to create refund (should be protected by admin checks)
  app.post('/api/payments/:transactionId/refund', requireAuth, async (req: any, res) => {
    try {
      const { transactionId } = req.params;
      const { reason } = req.body;

      if (!transactionId) {
        return res.status(400).json({ message: "Transaction ID is required" });
      }

      // For now, we'll allow the organization owner to refund
      const userId = req.user.id;
      const userOrganization = await storage.getOrganizationByUser(userId);

      if (!userOrganization) {
        return res.status(403).json({ message: "No organization found" });
      }

      // Get the payment transaction to verify ownership
      const paymentHistory = await stripeService.getPaymentHistory(userOrganization.id, 100);
      const transaction = paymentHistory.find(t => t.id === transactionId);

      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      await stripeService.createRefund(transactionId, reason);

      res.json({
        message: "Refund processed successfully",
        transactionId,
        refundReason: reason || "Customer requested refund"
      });
    } catch (error) {
      console.error("Error creating refund:", error);
      res.status(500).json({
        message: "Failed to create refund",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Initialize default credit packages (admin endpoint)
  app.post('/api/credit-packages/initialize', requireAuth, async (req: any, res) => {
    try {
      await stripeService.initializeDefaultCreditPackages();
      res.json({ message: "Default credit packages initialized successfully" });
    } catch (error) {
      console.error("Error initializing credit packages:", error);
      res.status(500).json({
        message: "Failed to initialize credit packages",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Payment success/cancel pages (for redirect handling)
  app.get('/payment/success', requireVerifiedAuth, async (req: any, res) => {
    try {
      const { session_id } = req.query;

      if (!session_id) {
        return res.redirect('/dashboard?payment=error');
      }

      // You could fetch session details here for additional confirmation
      // but the webhook handles the actual credit addition

      res.redirect('/dashboard?payment=success');
    } catch (error) {
      console.error("Error handling payment success:", error);
      res.redirect('/dashboard?payment=error');
    }
  });

  app.get('/payment/canceled', requireVerifiedAuth, async (req: any, res) => {
    res.redirect('/dashboard?payment=canceled');
  });

  // Test endpoint for webhook processing (for development)
  app.post('/api/payments/test-webhook', async (req, res) => {
    try {
      const { organizationId, creditPackageId } = req.body;

      if (!organizationId || !creditPackageId) {
        return res.status(400).json({ message: 'organizationId and creditPackageId required' });
      }

      console.log('🧪 Testing webhook processing manually...');

      // Get credit package details
      const creditPackages = await db.select().from(creditPackages).where(eq(creditPackages.id, creditPackageId));
      if (!creditPackages.length) {
        return res.status(404).json({ message: 'Credit package not found' });
      }

      const creditPackage = creditPackages[0];

      // Create mock session
      const mockSession = {
        id: 'cs_test_' + Math.random().toString(36).substring(7),
        payment_status: 'paid',
        payment_intent: 'pi_test_' + Math.random().toString(36).substring(7),
        amount_total: creditPackage.price,
        currency: creditPackage.currency.toLowerCase(),
        metadata: {
          organizationId,
          creditPackageId,
          paymentAttemptId: 'test-attempt-' + Math.random().toString(36).substring(7),
          creditAmount: creditPackage.creditAmount.toString()
        }
      };

      // Process the mock webhook
      await stripeService.processSuccessfulPayment(mockSession as any);

      res.json({
        message: 'Test webhook processed successfully',
        sessionId: mockSession.id,
        creditsAdded: creditPackage.creditAmount
      });
    } catch (error) {
      console.error('❌ Test webhook processing failed:', error);
      res.status(500).json({
        message: 'Test webhook processing failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  const httpServer = createServer(app);

  // Setup voice stream WebSocket server
  console.log('🔊 Setting up voice stream WebSocket server...');
  const voiceStreamServer = createVoiceStreamServer(httpServer, process.env.VOICE_WS_PATH || "/voice-stream");
  console.log(`✅ Voice stream server ready at: ${process.env.VOICE_WS_PATH || "/voice-stream"}`);

  return httpServer;
}
