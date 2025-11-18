import { db } from './db';
import { 
  subscriptionPlans, 
  organizationSubscriptions, 
  subscriptionInvoices, 
  creditExpirations,
  organizations,
  creditTransactions
} from '@shared/schema';
import { eq, and, desc, lt, asc } from 'drizzle-orm';
import type { 
  SubscriptionPlan,
  InsertSubscriptionPlan,
  OrganizationSubscription,
  InsertOrganizationSubscription,
  InsertSubscriptionInvoice,
  InsertCreditExpiration
} from '@shared/schema';

export interface SubscribeParams {
  organizationId: string;
  planId: string;
  billingCycle: 'monthly' | 'yearly';
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  trialDays?: number;
}

export interface SubscriptionWithPlan extends OrganizationSubscription {
  plan: SubscriptionPlan;
}

export class SubscriptionService {
  /**
   * Create default subscription plans in the database
   */
  async createDefaultSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    try {
      const plans = [
        {
          name: 'Starter',
          description: '200 CV + 100 Interview Credits/month',
          monthlyPrice: 2900000,
          yearlyPrice: Math.round(2900000 * (1-0.18) * 12),
          monthlyCvCredits: 200,
          monthlyInterviewCredits: 100,
          monthlyCredits: 300, // Total for backward compatibility
          jobPostsLimit: 5,
          supportLevel: 'standard',
          features: {
            aiCvAnalysis: true,
            aiInterviewPackage: true,
            cvCreditsPerMonth: 200,
            interviewCreditsPerMonth: 100,
            jobPosts: 5,
          },
          sortOrder: 1,
        },
        {
          name: 'Growth',
          description: '500 CV + 200 Interview Credits/month',
          monthlyPrice: 3900000,
          yearlyPrice: Math.round(3900000 * (1-0.18) * 12),
          monthlyCvCredits: 500,
          monthlyInterviewCredits: 200,
          monthlyCredits: 700, // Total for backward compatibility
          jobPostsLimit: 15,
          supportLevel: 'priority',
          features: {
            aiCvAnalysis: true,
            aiInterviewPackage: true,
            cvCreditsPerMonth: 500,
            interviewCreditsPerMonth: 200,
            jobPosts: 15,
            prioritySupport: true,
          },
          sortOrder: 2,
        },
        {
          name: 'Pro',
          description: '700 CV + 300 Interview Credits/month',
          monthlyPrice: 4900000,
          yearlyPrice: Math.round(4900000 * (1-0.18) * 12),
          monthlyCvCredits: 700,
          monthlyInterviewCredits: 300,
          monthlyCredits: 1000, // Total for backward compatibility
          jobPostsLimit: null, // Unlimited
          supportLevel: 'priority',
          features: {
            aiCvAnalysis: true,
            aiInterviewPackage: true,
            cvCreditsPerMonth: 700,
            interviewCreditsPerMonth: 300,
            jobPosts: 'unlimited',
            prioritySupport: true,
          },
          sortOrder: 3,
        },
        {
          name: 'Enterprise',
          description: '2500 CV + 1000 Interview Credits/month (Custom)',
          monthlyPrice: 0,
          yearlyPrice: 0,
          monthlyCvCredits: 2500,
          monthlyInterviewCredits: 1000,
          monthlyCredits: 3500, // Total for backward compatibility
          jobPostsLimit: null,
          supportLevel: 'dedicated',
          features: {
            aiCvAnalysis: true,
            aiInterviewPackage: true,
            cvCreditsPerMonth: 2500,
            interviewCreditsPerMonth: 1000,
            jobPosts: 'unlimited',
            dedicatedManager: true,
          },
          sortOrder: 4,
        },
      ];

      const createdPlans: SubscriptionPlan[] = [];

      for (const planData of plans) {
        // Check if plan already exists
        const [existing] = await db
          .select()
          .from(subscriptionPlans)
          .where(eq(subscriptionPlans.name, planData.name));

        if (existing) {
          console.log(`Plan "${planData.name}" already exists, skipping...`);
          createdPlans.push(existing);
          continue;
        }

        const [plan] = await db.insert(subscriptionPlans).values({
          id: crypto.randomUUID(),
          ...planData,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }).returning();

        console.log(`Created subscription plan: ${planData.name}`);
        createdPlans.push(plan);
      }

      return createdPlans;
    } catch (error) {
      console.error('Error creating subscription plans:', error);
      throw new Error('Failed to create subscription plans');
    }
  }

  /**
   * Get all available subscription plans
   */
  async getAvailablePlans(): Promise<SubscriptionPlan[]> {
    try {
      const plans = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.isActive, true))
        .orderBy(subscriptionPlans.sortOrder);

      return plans;
    } catch (error) {
      console.error('Error fetching subscription plans:', error);
      throw new Error('Failed to fetch subscription plans');
    }
  }

  /**
   * Get a specific plan by ID
   */
  async getPlanById(planId: string): Promise<SubscriptionPlan | null> {
    try {
      const [plan] = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.id, planId));

      return plan || null;
    } catch (error) {
      console.error('Error fetching plan:', error);
      return null;
    }
  }

  /**
   * Subscribe an organization to a plan
   */
  async subscribeOrganization(params: SubscribeParams): Promise<OrganizationSubscription> {
    try {
      const plan = await this.getPlanById(params.planId);
      if (!plan) {
        throw new Error('Subscription plan not found');
      }

      const now = new Date();
      const periodStart = new Date();
      const periodEnd = new Date();

      // Set period end based on billing cycle
      if (params.billingCycle === 'monthly') {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      } else {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      }

      // Handle trial period if specified
      let trialStart: Date | null = null;
      let trialEnd: Date | null = null;
      let status = 'active';

      if (params.trialDays && params.trialDays > 0) {
        trialStart = new Date();
        trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + params.trialDays);
        status = 'trialing';
      }

      // Create subscription
      const [subscription] = await db.insert(organizationSubscriptions).values({
        id: crypto.randomUUID(),
        organizationId: params.organizationId,
        subscriptionPlanId: params.planId,
        stripeSubscriptionId: params.stripeSubscriptionId,
        stripeCustomerId: params.stripeCustomerId,
        status,
        billingCycle: params.billingCycle,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        trialStart,
        trialEnd,
        createdAt: now,
        updatedAt: now,
      }).returning();

      // Update organization with subscription info
      await db
        .update(organizations)
        .set({
          subscriptionStatus: status,
          currentSubscriptionId: subscription.id,
          updatedAt: now,
        })
        .where(eq(organizations.id, params.organizationId));

      // Don't allocate credits here - they will be allocated when invoice.paid webhook is received
      // This prevents duplicate credit allocation from both subscription.created and invoice.paid webhooks

      console.log(`Subscribed organization ${params.organizationId} to ${plan.name} (${params.billingCycle})`);
      return subscription;
    } catch (error) {
      console.error('Error subscribing organization:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to subscribe organization');
    }
  }

  /**
   * Get active subscription for an organization
   */
  async getActiveSubscription(organizationId: string): Promise<SubscriptionWithPlan | null> {
    try {
      const [subscription] = await db
        .select()
        .from(organizationSubscriptions)
        .where(
          and(
            eq(organizationSubscriptions.organizationId, organizationId),
            eq(organizationSubscriptions.status, 'active')
          )
        )
        .orderBy(desc(organizationSubscriptions.createdAt))
        .limit(1);

      if (!subscription) {
        // Check for trialing status
        const [trialingSubscription] = await db
          .select()
          .from(organizationSubscriptions)
          .where(
            and(
              eq(organizationSubscriptions.organizationId, organizationId),
              eq(organizationSubscriptions.status, 'trialing')
            )
          )
          .orderBy(desc(organizationSubscriptions.createdAt))
          .limit(1);

        if (!trialingSubscription) {
          return null;
        }

        const plan = await this.getPlanById(trialingSubscription.subscriptionPlanId);
        if (!plan) return null;

        return { ...trialingSubscription, plan };
      }

      const plan = await this.getPlanById(subscription.subscriptionPlanId);
      if (!plan) return null;

      return { ...subscription, plan };
    } catch (error) {
      console.error('Error fetching active subscription:', error);
      return null;
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId: string, immediate: boolean = false): Promise<void> {
    try {
      const [subscription] = await db
        .select()
        .from(organizationSubscriptions)
        .where(eq(organizationSubscriptions.id, subscriptionId));

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      const now = new Date();

      if (immediate) {
        // Cancel immediately
        await db
          .update(organizationSubscriptions)
          .set({
            status: 'canceled',
            canceledAt: now,
            cancelAtPeriodEnd: false,
            updatedAt: now,
          })
          .where(eq(organizationSubscriptions.id, subscriptionId));

        // Update organization status
        await db
          .update(organizations)
          .set({
            subscriptionStatus: 'canceled',
            updatedAt: now,
          })
          .where(eq(organizations.id, subscription.organizationId));

        console.log(`Immediately canceled subscription ${subscriptionId}`);
      } else {
        // Cancel at period end
        await db
          .update(organizationSubscriptions)
          .set({
            cancelAtPeriodEnd: true,
            updatedAt: now,
          })
          .where(eq(organizationSubscriptions.id, subscriptionId));

        console.log(`Subscription ${subscriptionId} will cancel at period end`);
      }
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw new Error('Failed to cancel subscription');
    }
  }

  /**
   * Allocate monthly credits to organization
   */
  async allocateMonthlyCredits(subscriptionId: string): Promise<void> {
    try {
      const [subscription] = await db
        .select()
        .from(organizationSubscriptions)
        .where(eq(organizationSubscriptions.id, subscriptionId));

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      const plan = await this.getPlanById(subscription.subscriptionPlanId);
      if (!plan) {
        throw new Error('Subscription plan not found');
      }

      // Calculate expiry date (45 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 45);

      const now = new Date();

      // Add credits to organization using transaction
      await db.transaction(async (tx: any) => {
        // Get current organization
        const [org] = await tx
          .select()
          .from(organizations)
          .where(eq(organizations.id, subscription.organizationId));

        if (!org) {
          throw new Error('Organization not found');
        }

        // Update organization credits for both types
        await tx
          .update(organizations)
          .set({
            cvProcessingCredits: (org.cvProcessingCredits || 0) + plan.monthlyCvCredits,
            interviewCredits: (org.interviewCredits || 0) + plan.monthlyInterviewCredits,
            // Legacy field for backward compatibility
            currentCredits: (org.currentCredits || 0) + plan.monthlyCredits,
            updatedAt: now,
          })
          .where(eq(organizations.id, subscription.organizationId));

        // Create credit transaction records for CV processing credits
        await tx.insert(creditTransactions).values({
          id: crypto.randomUUID(),
          organizationId: subscription.organizationId,
          amount: plan.monthlyCvCredits,
          type: 'subscription',
          actionType: 'resume_processing',
          description: `Monthly CV processing credits - ${plan.name} plan`,
          relatedId: subscriptionId,
          createdAt: now,
        });

        // Create credit transaction records for interview credits
        await tx.insert(creditTransactions).values({
          id: crypto.randomUUID(),
          organizationId: subscription.organizationId,
          amount: plan.monthlyInterviewCredits,
          type: 'subscription',
          actionType: 'interview_scheduling',
          description: `Monthly interview credits - ${plan.name} plan`,
          relatedId: subscriptionId,
          createdAt: now,
        });

        // Create credit expiration record for CV processing credits
        await tx.insert(creditExpirations).values({
          id: crypto.randomUUID(),
          organizationId: subscription.organizationId,
          creditType: 'cv_processing',
          creditAmount: plan.monthlyCvCredits,
          source: 'subscription',
          sourceId: subscriptionId,
          expiresAt,
          remainingCredits: plan.monthlyCvCredits,
          isExpired: false,
          createdAt: now,
          updatedAt: now,
        });

        // Create credit expiration record for interview credits
        await tx.insert(creditExpirations).values({
          id: crypto.randomUUID(),
          organizationId: subscription.organizationId,
          creditType: 'interview',
          creditAmount: plan.monthlyInterviewCredits,
          source: 'subscription',
          sourceId: subscriptionId,
          expiresAt,
          remainingCredits: plan.monthlyInterviewCredits,
          isExpired: false,
          createdAt: now,
          updatedAt: now,
        });
      });

      console.log(`Allocated ${plan.monthlyCredits} credits to organization ${subscription.organizationId}`);
    } catch (error) {
      console.error('Error allocating monthly credits:', error);
      throw new Error('Failed to allocate monthly credits');
    }
  }

  /**
   * Create subscription invoice record
   */
  async createSubscriptionInvoice(params: {
    subscriptionId: string;
    stripeInvoiceId: string;
    amount: number;
    currency: string;
    status: string;
    cvCreditsAllocated: number;
    interviewCreditsAllocated: number;
    invoiceDate?: Date;
    paidAt?: Date;
  }): Promise<void> {
    try {
      const [subscription] = await db
        .select()
        .from(organizationSubscriptions)
        .where(eq(organizationSubscriptions.id, params.subscriptionId));

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      await db.insert(subscriptionInvoices).values({
        id: crypto.randomUUID(),
        organizationSubscriptionId: params.subscriptionId,
        organizationId: subscription.organizationId,
        stripeInvoiceId: params.stripeInvoiceId,
        amount: params.amount,
        currency: params.currency,
        status: params.status,
        cvCreditsAllocated: params.cvCreditsAllocated,
        interviewCreditsAllocated: params.interviewCreditsAllocated,
        creditsAllocated: params.cvCreditsAllocated + params.interviewCreditsAllocated, // Total for backward compatibility
        invoiceDate: params.invoiceDate || new Date(),
        paidAt: params.paidAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log(`Created subscription invoice for ${params.stripeInvoiceId}: ${params.cvCreditsAllocated} CV + ${params.interviewCreditsAllocated} interview credits`);
    } catch (error) {
      console.error('Error creating subscription invoice:', error);
      throw new Error('Failed to create subscription invoice');
    }
  }

  /**
   * Expire old credits (45 days past allocation)
   */
  async expireOldCredits(): Promise<void> {
    try {
      const now = new Date();

      // Find all expired but not marked as expired
      const expiredCredits = await db
        .select()
        .from(creditExpirations)
        .where(
          and(
            lt(creditExpirations.expiresAt, now),
            eq(creditExpirations.isExpired, false)
          )
        );

      for (const expiredCredit of expiredCredits) {
        if (expiredCredit.remainingCredits > 0) {
          // Deduct remaining credits from organization
          await db.transaction(async (tx: any) => {
            const [org] = await tx
              .select()
              .from(organizations)
              .where(eq(organizations.id, expiredCredit.organizationId));

            if (org) {
              // Determine which credit balance to update based on credit type
              const isCvCredit = expiredCredit.creditType === 'cv_processing';
              const updateData = isCvCredit
                ? {
                    cvProcessingCredits: Math.max(0, (org.cvProcessingCredits || 0) - expiredCredit.remainingCredits),
                    updatedAt: now,
                  }
                : {
                    interviewCredits: Math.max(0, (org.interviewCredits || 0) - expiredCredit.remainingCredits),
                    updatedAt: now,
                  };

              await tx
                .update(organizations)
                .set({
                  ...updateData,
                  currentCredits: Math.max(0, (org.currentCredits || 0) - expiredCredit.remainingCredits), // Also update legacy field
                })
                .where(eq(organizations.id, expiredCredit.organizationId));

              // Create transaction record
              await tx.insert(creditTransactions).values({
                id: crypto.randomUUID(),
                organizationId: expiredCredit.organizationId,
                amount: -expiredCredit.remainingCredits,
                type: 'manual_adjustment',
                actionType: isCvCredit ? 'resume_processing' : 'interview_scheduling',
                description: `${expiredCredit.creditType} credits expired (45 days)`,
                relatedId: expiredCredit.id,
                createdAt: now,
              });
            }

            // Mark as expired
            await tx
              .update(creditExpirations)
              .set({
                isExpired: true,
                remainingCredits: 0,
                updatedAt: now,
              })
              .where(eq(creditExpirations.id, expiredCredit.id));
          });

          console.log(`Expired ${expiredCredit.remainingCredits} ${expiredCredit.creditType} credits for organization ${expiredCredit.organizationId}`);
        }
      }
    } catch (error) {
      console.error('Error expiring old credits:', error);
    }
  }

  /**
   * Check if organization has reached job posts limit
   */
  async checkJobPostsLimit(organizationId: string): Promise<boolean> {
    try {
      const subscription = await this.getActiveSubscription(organizationId);
      if (!subscription || !subscription.plan) {
        return false;
      }

      // No limit (unlimited)
      if (subscription.plan.jobPostsLimit === null) {
        return true;
      }

      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, organizationId));

      if (!org) {
        return false;
      }

      return (org.jobPostsUsed || 0) < subscription.plan.jobPostsLimit;
    } catch (error) {
      console.error('Error checking job posts limit:', error);
      return false;
    }
  }

  /**
   * Increment job posts used counter
   */
  async incrementJobPostsUsed(organizationId: string): Promise<void> {
    try {
      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, organizationId));

      if (org) {
        await db
          .update(organizations)
          .set({
            jobPostsUsed: (org.jobPostsUsed || 0) + 1,
            updatedAt: new Date(),
          })
          .where(eq(organizations.id, organizationId));
      }
    } catch (error) {
      console.error('Error incrementing job posts used:', error);
    }
  }

  /**
   * Get credits expiring soon (within 7 days)
   */
  async getExpiringCredits(organizationId: string): Promise<any[]> {
    try {
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      const expiringCredits = await db
        .select()
        .from(creditExpirations)
        .where(
          and(
            eq(creditExpirations.organizationId, organizationId),
            eq(creditExpirations.isExpired, false),
            lt(creditExpirations.expiresAt, sevenDaysFromNow)
          )
        )
        .orderBy(asc(creditExpirations.expiresAt));

      return expiringCredits;
    } catch (error) {
      console.error('Error fetching expiring credits:', error);
      return [];
    }
  }

  /**
   * Update subscription status (for webhooks)
   */
  async updateSubscriptionStatus(
    stripeSubscriptionId: string,
    status: string,
    metadata?: any
  ): Promise<void> {
    try {
      const [subscription] = await db
        .select()
        .from(organizationSubscriptions)
        .where(eq(organizationSubscriptions.stripeSubscriptionId, stripeSubscriptionId));

      if (!subscription) {
        console.warn(`Subscription not found for Stripe ID: ${stripeSubscriptionId}`);
        return;
      }

      const now = new Date();

      await db
        .update(organizationSubscriptions)
        .set({
          status,
          updatedAt: now,
          ...(metadata || {}),
        })
        .where(eq(organizationSubscriptions.stripeSubscriptionId, stripeSubscriptionId));

      // Update organization status
      await db
        .update(organizations)
        .set({
          subscriptionStatus: status,
          updatedAt: now,
        })
        .where(eq(organizations.id, subscription.organizationId));

      console.log(`Updated subscription ${stripeSubscriptionId} status to ${status}`);
    } catch (error) {
      console.error('Error updating subscription status:', error);
    }
  }
}

export const subscriptionService = new SubscriptionService();
