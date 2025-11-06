import { Request, Response, NextFunction } from 'express';
import { subscriptionService } from './subscriptionService';
import { storage } from './storage';

/**
 * Middleware to require active subscription before accessing platform
 * Organizations must have an active or trialing subscription to use the system
 */
export const requireActiveSubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get user from request (set by auth middleware)
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({
        message: "Authentication required",
        code: "AUTH_REQUIRED"
      });
    }

    // Get organization for the user
    const organization = await storage.getOrganizationByUser(user.id);
    if (!organization) {
      return res.status(404).json({
        message: "Organization not found",
        code: "ORG_NOT_FOUND"
      });
    }

    // Check subscription status
    const subscription = await subscriptionService.getActiveSubscription(organization.id);

    if (!subscription) {
      return res.status(402).json({
        message: "Active subscription required to access this feature",
        code: "SUBSCRIPTION_REQUIRED",
        subscriptionRequired: true,
      });
    }

    // Check if subscription is in valid status
    const validStatuses = ['active', 'trialing'];
    if (!validStatuses.includes(subscription.status)) {
      // Allow grace period for past_due (7 days)
      if (subscription.status === 'past_due') {
        const daysPastDue = Math.floor(
          (Date.now() - subscription.currentPeriodEnd.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysPastDue > 7) {
          return res.status(402).json({
            message: "Your subscription payment is overdue. Please update your payment method.",
            code: "SUBSCRIPTION_PAST_DUE",
            status: subscription.status,
            daysPastDue,
            gracePeriodExpired: true,
          });
        }

        // Still in grace period, allow access but warn
        (req as any).subscriptionWarning = {
          message: "Your subscription payment is overdue",
          daysPastDue,
        };
      } else {
        return res.status(402).json({
          message: `Your subscription is ${subscription.status}. Please renew to continue using the platform.`,
          code: "SUBSCRIPTION_INACTIVE",
          status: subscription.status,
        });
      }
    }

    // Attach subscription info to request
    (req as any).subscription = subscription;
    (req as any).organization = organization;

    next();
  } catch (error) {
    console.error('Subscription validation error:', error);
    res.status(500).json({
      message: 'Failed to validate subscription',
      code: "SUBSCRIPTION_CHECK_ERROR"
    });
  }
};

/**
 * Middleware to check job posts limit for current subscription plan
 */
export const checkJobPostsLimit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organization = (req as any).organization;
    const subscription = (req as any).subscription;

    if (!organization || !subscription) {
      return next();
    }

    // Check if organization has reached limit
    const canCreateJobPost = await subscriptionService.checkJobPostsLimit(organization.id);

    if (!canCreateJobPost) {
      return res.status(403).json({
        message: `You've reached the job posting limit for your ${subscription.plan.name} plan`,
        code: "JOB_POSTS_LIMIT_REACHED",
        currentPlan: subscription.plan.name,
        limit: subscription.plan.jobPostsLimit,
        upgradeRequired: true,
      });
    }

    next();
  } catch (error) {
    console.error('Job posts limit check error:', error);
    next(); // Don't block on error
  }
};

/**
 * Middleware to increment job posts counter after successful job creation
 */
export const incrementJobPostsCounter = async (req: Request, res: Response, next: NextFunction) => {
  const organization = (req as any).organization;

  if (!organization) {
    return next();
  }

  try {
    await subscriptionService.incrementJobPostsUsed(organization.id);
    next();
  } catch (error) {
    console.error('Error incrementing job posts counter:', error);
    next(); // Don't block on error
  }
};

/**
 * Middleware to attach subscription info to response for client
 */
export const attachSubscriptionInfo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return next();
    }

    const organization = await storage.getOrganizationByUser(user.id);
    if (!organization) {
      return next();
    }

    const subscription = await subscriptionService.getActiveSubscription(organization.id);
    (req as any).subscriptionInfo = subscription;

    // Add to response data if it exists
    if (res.locals.data && subscription) {
      res.locals.data.subscription = {
        status: subscription.status,
        planName: subscription.plan.name,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      };
    }

    next();
  } catch (error) {
    console.error('Error attaching subscription info:', error);
    next();
  }
};
