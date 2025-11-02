import Stripe from 'stripe';
import { db } from './db';
import { creditPackages, paymentTransactions, paymentAttempts, organizations } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { creditService } from './creditService';
import type {
  InsertCreditPackage,
  InsertPaymentTransaction,
  InsertPaymentAttempt,
  CreditPackage,
  PaymentTransaction
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
          name: 'Starter Pack',
          description: 'Perfect for getting started',
          creditAmount: 50,
          price: 500, // $5.00
          sortOrder: 1,
        },
        {
          name: 'Professional Pack',
          description: 'Great for regular users',
          creditAmount: 100,
          price: 1000, // $10.00
          sortOrder: 2,
        },
        {
          name: 'Business Pack',
          description: 'Ideal for growing businesses',
          creditAmount: 250,
          price: 2500, // $25.00
          sortOrder: 3,
        },
        {
          name: 'Enterprise Pack',
          description: 'Best value for large organizations',
          creditAmount: 500,
          price: 5000, // $50.00
          sortOrder: 4,
        },
        {
          name: 'Corporate Pack',
          description: 'Maximum value for enterprises',
          creditAmount: 1000,
          price: 10000, // $100.00
          sortOrder: 5,
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
}

export const stripeService = new StripeService();