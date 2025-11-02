import { Request, Response, NextFunction } from 'express';
import { creditService } from './creditService';
import { storage } from './storage';

export interface CreditValidationOptions {
  requiredCredits: number;
  operationType: 'resume_processing' | 'manual_adjustment';
  description: string;
  relatedId?: string;
}

/**
 * Middleware to validate organization credits before processing expensive operations
 */
export const requireCredits = (options: CreditValidationOptions) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get user from request (set by auth middleware)
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({
          message: "Authentication required"
        });
      }

      // Get organization for the user
      const organization = await storage.getOrganizationByUser(user.id);
      if (!organization) {
        return res.status(404).json({
          message: "Organization not found"
        });
      }

      // Check if organization has sufficient credits
      const hasCredits = await creditService.checkCredits(
        organization.id,
        options.requiredCredits
      );

      if (!hasCredits) {
        const currentBalance = await creditService.getCreditBalance(organization.id);
        return res.status(402).json({
          message: `Insufficient credits. Required: ${options.requiredCredits}, Available: ${currentBalance?.remainingCredits || 0}. Please contact admin to add more credits.`,
          requiredCredits: options.requiredCredits,
          availableCredits: currentBalance?.remainingCredits || 0,
          creditBalance: currentBalance
        });
      }

      // Attach organization and credit info to request for use in route handlers
      (req as any).organization = organization;
      (req as any).creditInfo = {
        requiredCredits: options.requiredCredits,
        operationType: options.operationType,
        description: options.description,
        relatedId: options.relatedId
      };

      next();
    } catch (error) {
      console.error('Credit validation error:', error);
      res.status(500).json({
        message: 'Failed to validate credits'
      });
    }
  };
};

/**
 * Middleware to deduct credits after successful operation
 * This should be used after the operation completes successfully
 */
export const deductCredits = async (req: Request, res: Response, next: NextFunction) => {
  const creditInfo = (req as any).creditInfo;
  const organization = (req as any).organization;

  if (!creditInfo || !organization) {
    return next();
  }

  try {
    await creditService.deductCredits(
      organization.id,
      creditInfo.requiredCredits,
      creditInfo.operationType,
      creditInfo.description,
      creditInfo.relatedId
    );

    // Update response with new credit balance
    const updatedBalance = await creditService.getCreditBalance(organization.id);
    if (res.locals.data) {
      res.locals.data.creditBalance = updatedBalance;
    }

    next();
  } catch (error) {
    console.error('Error deducting credits:', error);
    // Don't fail the request if credit deduction fails, but log it
    // This could be handled with a retry mechanism or audit log
    next();
  }
};

/**
 * Helper middleware to attach credit balance to response
 */
export const attachCreditBalance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return next();
    }

    const organization = await storage.getOrganizationByUser(user.id);
    if (!organization) {
      return next();
    }

    const creditBalance = await creditService.getCreditBalance(organization.id);
    (req as any).creditBalance = creditBalance;

    // Add to response data if it exists
    if (res.locals.data) {
      res.locals.data.creditBalance = creditBalance;
    }

    next();
  } catch (error) {
    console.error('Error attaching credit balance:', error);
    next();
  }
};