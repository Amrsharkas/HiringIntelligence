import Stripe from 'stripe';
import { db } from './db';
import { 
  creditPackages, 
  paymentTransactions, 
  paymentAttempts, 
  organizations,
  subscriptionPlans,
  organizationSubscriptions
} from '@shared/schema';
import { eq } from 'drizzle-orm';
import { creditService } from './creditService';
import { subscriptionService } from './subscriptionService';
import type {
  InsertCreditPackage,
  InsertPaymentTransaction,
  InsertPaymentAttempt,
  CreditPackage,
  PaymentTransaction,
  SubscriptionPlan
} from '@shared/schema';

export interface CreateCheckoutSessionParams {
  organizationId: string;
  creditPackageId: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
}

export interface PaymentAttemptData {
  organizationId: string;
  creditPackageId: string;
  amount: number;
  userAgent?: string;
  ipAddress?: string;
}

export class StripeService {
  private stripe: Stripe;

  constructor() {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }

    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-10-29.clover',
      typescript: true,
    });
  }

  /**
   * Create a credit package in our database (without Stripe products)
   */
  async createCreditPackage(packageData: {
    name: string;
    description?: string;
    creditAmount: number;
    price: number; // in cents
    currency?: string;
    sortOrder?: number;
  }): Promise<CreditPackage> {
    try {
      // Store in our database
      const [creditPackage] = await db.insert(creditPackages).values({
        id: crypto.randomUUID(),
        name: packageData.name,
        description: packageData.description,
        creditAmount: packageData.creditAmount,
        price: packageData.price,
        currency: packageData.currency || 'USD',
        isActive: true,
        sortOrder: packageData.sortOrder || 0,
        stripePriceId: null, // Not using Stripe products
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      console.log(`Created credit package: ${packageData.name} (${packageData.creditAmount} credits for $${packageData.price / 100})`);
      return creditPackage;
    } catch (error) {
      console.error('Error creating credit package:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to create credit package');
    }
  }

  /**
   * Get all active credit packages
   */
  async getCreditPackages(): Promise<CreditPackage[]> {
    try {
      const packages = await db
        .select()
        .from(creditPackages)
        .where(eq(creditPackages.isActive, true))
        .orderBy(creditPackages.sortOrder, creditPackages.price);

      return packages;
    } catch (error) {
      console.error('Error fetching credit packages:', error);
      throw new Error('Failed to fetch credit packages');
    }
  }

  /**
   * Create a Stripe checkout session for credit purchase
   */
  async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<{ sessionId: string; url: string }> {
    try {
      // Get credit package
      const [creditPackage] = await db
        .select()
        .from(creditPackages)
        .where(eq(creditPackages.id, params.creditPackageId));

      if (!creditPackage) {
        throw new Error('Credit package not found');
      }

      // Get organization
      const [organization] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, params.organizationId));

      if (!organization) {
        throw new Error('Organization not found');
      }

      // Record payment attempt
      const [paymentAttempt] = await db.insert(paymentAttempts).values({
        id: crypto.randomUUID(),
        organizationId: params.organizationId,
        creditPackageId: params.creditPackageId,
        amount: creditPackage.price,
        currency: creditPackage.currency,
        status: 'initiated',
        createdAt: new Date(),
      }).returning();

      // Create Stripe checkout session with direct pricing
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: creditPackage.currency.toLowerCase(),
              product_data: {
                name: creditPackage.name,
                description: creditPackage.description || `${creditPackage.creditAmount} credits`,
                metadata: {
                  credit_amount: creditPackage.creditAmount.toString(),
                },
              },
              unit_amount: creditPackage.price,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        customer_email: params.customerEmail || undefined,
        metadata: {
          organizationId: params.organizationId,
          creditPackageId: params.creditPackageId,
          paymentAttemptId: paymentAttempt.id,
          creditAmount: creditPackage.creditAmount.toString(),
        },
        client_reference_id: paymentAttempt.id,
      });

      // Update payment attempt with session ID
      await db
        .update(paymentAttempts)
        .set({
          metadata: { stripeSessionId: session.id }
        })
        .where(eq(paymentAttempts.id, paymentAttempt.id));

      console.log(`Created checkout session for organization ${params.organizationId}: ${session.id}`);
      return {
        sessionId: session.id,
        url: session.url!,
      };
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to create checkout session');
    }
  }

  /**
   * Process successful payment and add credits
   */
  async processSuccessfulPayment(session: Stripe.Checkout.Session): Promise<void> {
    try {
      console.log('🔍 Processing successful payment session:', session.id);
      console.log('📋 Session metadata:', session.metadata);
      console.log('💰 Payment status:', session.payment_status);
      console.log('💳 Payment intent:', session.payment_intent);

      const metadata = session.metadata;
      if (!metadata?.organizationId || !metadata?.creditPackageId || !metadata?.paymentAttemptId) {
        console.error('❌ Missing required metadata in checkout session');
        throw new Error('Missing required metadata in checkout session');
      }

      const organizationId = metadata.organizationId;
      const creditPackageId = metadata.creditPackageId;
      const paymentAttemptId = metadata.paymentAttemptId;
      const creditAmount = parseInt(metadata.creditAmount);

      console.log(`📦 Processing payment for org: ${organizationId}, package: ${creditPackageId}, credits: ${creditAmount}`);

      // Get credit package details
      const [creditPackage] = await db
        .select()
        .from(creditPackages)
        .where(eq(creditPackages.id, creditPackageId));

      if (!creditPackage) {
        console.error(`❌ Credit package not found: ${creditPackageId}`);
        throw new Error('Credit package not found');
      }

      console.log(`✅ Found credit package: ${creditPackage.name}`);

      // Check if this payment was already processed
      const [existingTransaction] = await db
        .select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.stripeCheckoutSessionId, session.id));

      if (existingTransaction) {
        console.log(`⚠️ Payment already processed: ${session.id}`);
        return;
      }

      // Record payment transaction
      const [transaction] = await db.insert(paymentTransactions).values({
        id: crypto.randomUUID(),
        organizationId,
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: session.payment_intent as string,
        creditPackageId,
        amount: session.amount_total!,
        currency: session.currency!,
        status: 'succeeded',
        paymentMethod: 'card',
        creditsPurchased: creditAmount,
        creditsAdded: creditAmount,
        metadata: {
          stripeSessionId: session.id,
          paymentIntentId: session.payment_intent,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: new Date(),
      }).returning();

      console.log(`💾 Created payment transaction: ${transaction.id}`);

      // Add credits to organization
      await creditService.addCredits(
        organizationId,
        creditAmount,
        `Purchased ${creditAmount} credits - ${creditPackage.name}`
      );

      console.log(`💰 Added ${creditAmount} credits to organization ${organizationId}`);

      // Update payment attempt
      await db
        .update(paymentAttempts)
        .set({
          transactionId: transaction.id,
          status: 'succeeded',
          completedAt: new Date(),
        })
        .where(eq(paymentAttempts.id, paymentAttemptId));

      console.log(`✅ Successfully processed payment for organization ${organizationId}: ${creditAmount} credits added`);
    } catch (error) {
      console.error('❌ Error processing successful payment:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to process successful payment');
    }
  }

  /**
   * Process failed payment
   */
  async processFailedPayment(session: Stripe.Checkout.Session): Promise<void> {
    try {
      const metadata = session.metadata;
      if (!metadata?.paymentAttemptId) {
        console.warn('No payment attempt ID in failed checkout session');
        return;
      }

      // Update payment attempt
      await db
        .update(paymentAttempts)
        .set({
          status: 'failed',
          failureReason: session.payment_status || 'Payment failed',
          completedAt: new Date(),
        })
        .where(eq(paymentAttempts.id, metadata.paymentAttemptId));

      console.log(`Processed failed payment for attempt ${metadata.paymentAttemptId}`);
    } catch (error) {
      console.error('Error processing failed payment:', error);
    }
  }

  /**
   * Get payment history for an organization
   */
  async getPaymentHistory(organizationId: string, limit: number = 50): Promise<PaymentTransaction[]> {
    try {
      const transactions = await db
        .select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.organizationId, organizationId))
        .orderBy(paymentTransactions.createdAt)
        .limit(limit);

      return transactions;
    } catch (error) {
      console.error('Error fetching payment history:', error);
      throw new Error('Failed to fetch payment history');
    }
  }

  /**
   * Create a refund for a payment
   */
  async createRefund(paymentTransactionId: string, reason?: string): Promise<void> {
    try {
      // Get payment transaction
      const [transaction] = await db
        .select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.id, paymentTransactionId));

      if (!transaction) {
        throw new Error('Payment transaction not found');
      }

      if (transaction.status !== 'succeeded') {
        throw new Error('Cannot refund non-successful payment');
      }

      if (transaction.refundedAmount && transaction.refundedAmount > 0) {
        throw new Error('Payment already refunded');
      }

      // Create refund in Stripe
      const refund = await this.stripe.refunds.create({
        payment_intent: transaction.stripePaymentIntentId!,
        reason: reason as Stripe.RefundCreateParams.Reason || 'requested_by_customer',
        metadata: {
          paymentTransactionId,
          organizationId: transaction.organizationId,
        },
      });

      // Update transaction record
      await db
        .update(paymentTransactions)
        .set({
          refundedAmount: refund.amount,
          refundedCredits: transaction.creditsPurchased,
          updatedAt: new Date(),
        })
        .where(eq(paymentTransactions.id, paymentTransactionId));

      // Remove credits from organization
      await creditService.deductCredits(
        transaction.organizationId,
        transaction.creditsPurchased,
        'manual_adjustment',
        `Refunded ${transaction.creditsPurchased} credits - ${reason || 'Customer requested refund'}`
      );

      console.log(`Successfully refunded payment ${paymentTransactionId}: ${refund.amount} cents, ${transaction.creditsPurchased} credits`);
    } catch (error) {
      console.error('Error creating refund:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to create refund');
    }
  }

  /**
   * Verify Stripe webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        throw new Error('STRIPE_WEBHOOK_SECRET environment variable is required');
      }

      this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      return true;
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return false;
    }
  }

  /**
   * Initialize default credit packages (database only)
   */
  async initializeDefaultCreditPackages(): Promise<void> {
    try {
      const defaultPackages = [
        {
          name: '100 Credits Pack',
          description: 'Additional credits for your hiring needs',
          creditAmount: 100,
          price: 900000, // 9,000 EGP in cents (90 EGP per credit)
          currency: 'EGP',
          sortOrder: 1,
        },
        {
          name: '300 Credits Pack',
          description: 'Best value for regular hiring',
          creditAmount: 300,
          price: 2400000, // 24,000 EGP in cents (80 EGP per credit)
          currency: 'EGP',
          sortOrder: 2,
        },
        {
          name: '1,000 Credits Pack',
          description: 'Maximum value for high-volume hiring',
          creditAmount: 1000,
          price: 7000000, // 70,000 EGP in cents (70 EGP per credit)
          currency: 'EGP',
          sortOrder: 3,
        },
      ];

      for (const packageData of defaultPackages) {
        // Check if package already exists
        const [existing] = await db
          .select()
          .from(creditPackages)
          .where(eq(creditPackages.name, packageData.name));

        if (!existing) {
          await this.createCreditPackage(packageData);
        }
      }

      console.log('Default credit packages initialized in database');
    } catch (error) {
      console.error('Error initializing default credit packages:', error);
    }
  }

  /**
   * Create subscription checkout session
   */
  async createSubscriptionCheckout(params: {
    organizationId: string;
    planId: string;
    billingCycle: 'monthly' | 'yearly';
    successUrl: string;
    cancelUrl: string;
    customerEmail?: string;
    trialDays?: number;
  }): Promise<{ sessionId: string; url: string }> {
    try {
      // Get subscription plan
      const plan = await subscriptionService.getPlanById(params.planId);
      if (!plan) {
        throw new Error('Subscription plan not found');
      }

      // Get or create Stripe customer
      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, params.organizationId));

      if (!org) {
        throw new Error('Organization not found');
      }

      // Check if organization already has a Stripe customer ID
      const [existingSubscription] = await db
        .select()
        .from(organizationSubscriptions)
        .where(eq(organizationSubscriptions.organizationId, params.organizationId))
        .limit(1);

      let customerId = existingSubscription?.stripeCustomerId;

      if (!customerId) {
        // Create new Stripe customer
        const customer = await this.stripe.customers.create({
          email: params.customerEmail,
          metadata: {
            organizationId: params.organizationId,
            companyName: org.companyName,
          },
        });
        customerId = customer.id;
      }

      // Determine price based on billing cycle
      const priceId = params.billingCycle === 'monthly' 
        ? plan.stripePriceIdMonthly 
        : plan.stripePriceIdYearly;

      // If no Stripe price ID, create session with price_data
      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = priceId
        ? [{ price: priceId, quantity: 1 }]
        : [{
            price_data: {
              currency: 'egp',
              product_data: {
                name: `${plan.name} Plan`,
                description: plan.description || undefined,
              },
              unit_amount: params.billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice,
              recurring: {
                interval: params.billingCycle === 'monthly' ? 'month' : 'year',
              },
            },
            quantity: 1,
          }];

      // Create checkout session
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        customer: customerId,
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'subscription',
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        metadata: {
          organizationId: params.organizationId,
          planId: params.planId,
          billingCycle: params.billingCycle,
        },
        subscription_data: {
          metadata: {
            organizationId: params.organizationId,
            planId: params.planId,
          },
        },
      };

      // Add trial period if specified
      if (params.trialDays && params.trialDays > 0) {
        sessionParams.subscription_data = {
          ...sessionParams.subscription_data,
          trial_period_days: params.trialDays,
        };
      }

      const session = await this.stripe.checkout.sessions.create(sessionParams);

      console.log(`Created subscription checkout session for organization ${params.organizationId}: ${session.id}`);
      return {
        sessionId: session.id,
        url: session.url!,
      };
    } catch (error) {
      console.error('Error creating subscription checkout:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to create subscription checkout');
    }
  }

  /**
   * Handle subscription created webhook
   */
  async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    try {
      console.log('🔔 Processing subscription.created:', subscription.id);

      // Try to get metadata from different locations
      const metadata = subscription.metadata 
        || (subscription as any).parent?.subscription_details?.metadata
        || (subscription.items?.data[0] as any)?.metadata;

      if (!metadata?.organizationId || !metadata?.planId) {
        console.error('❌ Missing metadata in subscription:', {
          subscriptionMetadata: subscription.metadata,
          itemsMetadata: subscription.items?.data[0],
        });
        console.error('Cannot create subscription record without organizationId and planId');
        return;
      }

      console.log('📋 Found metadata:', metadata);

      // Check if subscription already exists (avoid duplicates)
      const [existing] = await db
        .select()
        .from(organizationSubscriptions)
        .where(eq(organizationSubscriptions.stripeSubscriptionId, subscription.id));

      if (existing) {
        console.log('⚠️ Subscription already exists in database, skipping...');
        return;
      }

      // Create subscription in database
      await subscriptionService.subscribeOrganization({
        organizationId: metadata.organizationId,
        planId: metadata.planId,
        billingCycle: subscription.items.data[0].plan.interval === 'month' ? 'monthly' : 'yearly',
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: subscription.customer as string,
        trialDays: subscription.trial_end ? Math.ceil((subscription.trial_end * 1000 - Date.now()) / (1000 * 60 * 60 * 24)) : 0,
      });

      console.log(`✅ Created subscription record for ${subscription.id}`);
    } catch (error) {
      console.error('Error handling subscription created:', error);
    }
  }

  /**
   * Handle subscription updated webhook
   */
  async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    try {
      console.log('🔔 Processing subscription.updated:', subscription.id);

      await subscriptionService.updateSubscriptionStatus(
        subscription.id,
        subscription.status,
        {
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
        }
      );

      console.log(`✅ Updated subscription ${subscription.id} to status ${subscription.status}`);
    } catch (error) {
      console.error('Error handling subscription updated:', error);
    }
  }

  /**
   * Handle subscription deleted webhook
   */
  async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    try {
      console.log('🔔 Processing subscription.deleted:', subscription.id);

      await subscriptionService.updateSubscriptionStatus(subscription.id, 'canceled', {
        canceledAt: new Date(),
      });

      console.log(`✅ Marked subscription ${subscription.id} as canceled`);
    } catch (error) {
      console.error('Error handling subscription deleted:', error);
    }
  }

  /**
   * Handle invoice paid webhook
   */
  async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    try {
      console.log('🔔 Processing invoice.paid:', invoice.id);

      // Get subscription ID from invoice (could be in different locations depending on API version)
      const subscriptionId = (invoice as any).subscription 
        || (invoice as any).parent?.subscription_details?.subscription
        || (invoice.lines?.data[0] as any)?.subscription;

      if (!subscriptionId) {
        console.log('Invoice is not for a subscription, skipping...');
        return;
      }

      console.log('📋 Found subscription ID:', subscriptionId);

      // Get subscription from database
      let [subscription] = await db
        .select()
        .from(organizationSubscriptions)
        .where(eq(organizationSubscriptions.stripeSubscriptionId, subscriptionId as string));

      // If subscription doesn't exist, try to create it from invoice metadata
      if (!subscription) {
        console.warn(`⚠️ Subscription not found in database for ${subscriptionId}, attempting to create from invoice...`);
        
        // Get metadata from invoice
        const metadata = (invoice as any).parent?.subscription_details?.metadata
          || (invoice.lines?.data[0] as any)?.metadata
          || (invoice as any).metadata;

        if (!metadata?.organizationId || !metadata?.planId) {
          console.error('❌ Cannot create subscription: missing organizationId or planId in invoice metadata');
          return;
        }

        console.log('📋 Creating subscription from invoice metadata:', metadata);

        // Fetch the full subscription from Stripe to get billing details
        const stripeSubscription = await this.stripe.subscriptions.retrieve(subscriptionId as string);

        // Create subscription in database
        await subscriptionService.subscribeOrganization({
          organizationId: metadata.organizationId,
          planId: metadata.planId,
          billingCycle: stripeSubscription.items.data[0].plan.interval === 'month' ? 'monthly' : 'yearly',
          stripeSubscriptionId: subscriptionId as string,
          stripeCustomerId: stripeSubscription.customer as string,
          trialDays: 0,
        });

        console.log('✅ Created subscription record from invoice');

        // Fetch the newly created subscription
        [subscription] = await db
          .select()
          .from(organizationSubscriptions)
          .where(eq(organizationSubscriptions.stripeSubscriptionId, subscriptionId as string));

        if (!subscription) {
          console.error('❌ Failed to create subscription record');
          return;
        }
      }

      // Allocate monthly credits
      await subscriptionService.allocateMonthlyCredits(subscription.id);

      // Create invoice record
      const plan = await subscriptionService.getPlanById(subscription.subscriptionPlanId);
      await subscriptionService.createSubscriptionInvoice({
        subscriptionId: subscription.id,
        stripeInvoiceId: invoice.id,
        amount: invoice.amount_paid,
        currency: invoice.currency.toUpperCase(),
        status: 'paid',
        creditsAllocated: plan?.monthlyCredits || 0,
        invoiceDate: new Date(invoice.created * 1000),
        paidAt: new Date(),
      });

      console.log(`✅ Processed invoice ${invoice.id} and allocated credits`);
    } catch (error) {
      console.error('Error handling invoice paid:', error);
    }
  }

  /**
   * Handle invoice payment failed webhook
   */
  async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    try {
      console.log('🔔 Processing invoice.payment_failed:', invoice.id);

      // Get subscription ID from invoice
      const subscriptionId = (invoice as any).subscription 
        || (invoice as any).parent?.subscription_details?.subscription
        || (invoice.lines?.data[0] as any)?.subscription;

      if (!subscriptionId) {
        console.log('Invoice is not for a subscription, skipping...');
        return;
      }

      // Update subscription status to past_due
      await subscriptionService.updateSubscriptionStatus(
        subscriptionId as string,
        'past_due'
      );

      console.log(`✅ Marked subscription as past_due for failed invoice ${invoice.id}`);
    } catch (error) {
      console.error('Error handling invoice payment failed:', error);
    }
  }

  /**
   * Create Stripe subscription products and prices
   */
  async createSubscriptionProducts(): Promise<void> {
    try {
      const plans = await subscriptionService.getAvailablePlans();

      for (const plan of plans) {
        // Skip if already has Stripe price IDs
        if (plan.stripePriceIdMonthly && plan.stripePriceIdYearly) {
          console.log(`Plan ${plan.name} already has Stripe products, skipping...`);
          continue;
        }

        // Create product
        const product = await this.stripe.products.create({
          name: `${plan.name} Plan`,
          description: plan.description || undefined,
          metadata: {
            planId: plan.id,
            supportLevel: plan.supportLevel,
            monthlyCredits: plan.monthlyCredits.toString(),
          },
        });

        // Create monthly price
        const monthlyPrice = await this.stripe.prices.create({
          product: product.id,
          currency: 'egp',
          unit_amount: plan.monthlyPrice,
          recurring: {
            interval: 'month',
          },
          metadata: {
            planId: plan.id,
            billingCycle: 'monthly',
          },
        });

        // Create yearly price
        const yearlyPrice = await this.stripe.prices.create({
          product: product.id,
          currency: 'egp',
          unit_amount: plan.yearlyPrice,
          recurring: {
            interval: 'year',
          },
          metadata: {
            planId: plan.id,
            billingCycle: 'yearly',
          },
        });

        // Update plan with Stripe price IDs
        await db
          .update(subscriptionPlans)
          .set({
            stripePriceIdMonthly: monthlyPrice.id,
            stripePriceIdYearly: yearlyPrice.id,
            updatedAt: new Date(),
          })
          .where(eq(subscriptionPlans.id, plan.id));

        console.log(`Created Stripe products for ${plan.name}: ${product.id}`);
      }

      console.log('✅ Subscription products created in Stripe');
    } catch (error) {
      console.error('Error creating subscription products:', error);
      throw new Error('Failed to create subscription products');
    }
  }
}

export const stripeService = new StripeService();