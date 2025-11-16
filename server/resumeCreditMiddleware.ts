import { Request, Response, NextFunction } from 'express';
import { creditService } from './creditService';
import { storage } from './storage';

/**
 * Middleware to validate credits for resume processing
 * This handles both user requests and service-to-service calls
 */
export const requireResumeProcessingCredits = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if this is a service-to-service call
    const serviceApiKey = process.env.SERVICE_API_KEY;
    const authHeader = req.headers.authorization;
    const isServiceCall = serviceApiKey && authHeader && authHeader.replace('Bearer ', '').trim() === serviceApiKey;

    // Get dynamic pricing for resume processing
    const resumeProcessingCost = await creditService.getActionCost('resume_processing');

    if (isServiceCall) {
      // Service-to-service calls bypass credit validation
      // The organizationId should be provided in the request body
      const organizationId = req.body.organizationId || process.env.DEFAULT_ORGANIZATION_ID;
      if (!organizationId) {
        return res.status(400).json({
          message: "Organization ID is required for service calls"
        });
      }

      // Attach minimal info for service calls
      (req as any).organization = { id: organizationId };
      (req as any).creditInfo = {
        requiredCredits: resumeProcessingCost,
        operationType: 'resume_processing' as const,
        description: 'Resume processing (service call)',
        relatedId: req.body.jobId
      };
      (req as any).isServiceCall = true;

      return next();
    }

    // For regular user requests, validate credits
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

    // Check if organization has sufficient CV processing credits
    const hasCredits = await creditService.checkCredits(
      organization.id,
      resumeProcessingCost,
      'cv_processing'
    );

    if (!hasCredits) {
      const currentBalance = await creditService.getCreditBalance(organization.id);
      return res.status(402).json({
        message: `Insufficient CV processing credits. Resume processing requires ${resumeProcessingCost} credit${resumeProcessingCost !== 1 ? 's' : ''}, but you only have ${currentBalance?.cvProcessingCredits || 0} CV processing credits available. Please purchase more credits.`,
        requiredCredits: resumeProcessingCost,
        availableCredits: currentBalance?.cvProcessingCredits || 0,
        creditBalance: currentBalance
      });
    }

    // Attach organization and credit info to request for use in route handlers
    (req as any).organization = organization;
    (req as any).creditInfo = {
      requiredCredits: resumeProcessingCost,
      operationType: 'resume_processing' as const,
      description: `Resume processing: ${req.body.fileName || 'resume file'}`,
      relatedId: req.body.jobId
    };
    (req as any).isServiceCall = false;

    next();
  } catch (error) {
    console.error('Resume credit validation error:', error);
    res.status(500).json({
      message: 'Failed to validate credits for resume processing'
    });
  }
};

/**
 * Middleware to deduct credits after successful resume processing
 * This should be used after the background job is created successfully
 */
export const deductResumeProcessingCredits = async (req: Request, res: Response, next: NextFunction) => {
  const creditInfo = (req as any).creditInfo;
  const organization = (req as any).organization;
  const isServiceCall = (req as any).isServiceCall;

  // Skip credit deduction for service calls
  if (!creditInfo || !organization || isServiceCall) {
    return next();
  }

  try {
    await creditService.deductCredits(
      organization.id,
      creditInfo.requiredCredits,
      'cv_processing',
      'cv_processing',
      creditInfo.description,
      creditInfo.relatedId,
      'resume_processing'
    );

    // Update response with new credit balance
    const updatedBalance = await creditService.getCreditBalance(organization.id);

    // If response already sent, we can't modify it
    if (!res.headersSent) {
      if (res.locals.data) {
        res.locals.data.creditBalance = updatedBalance;
      } else {
        // Add credit info to the response if possible
        const originalSend = res.json;
        res.json = function(data: any) {
          data.creditBalance = updatedBalance;
          return originalSend.call(this, data);
        };
      }
    }

    next();
  } catch (error) {
    console.error('Error deducting resume processing credits:', error);
    // Don't fail the request if credit deduction fails, but log it
    next();
  }
};