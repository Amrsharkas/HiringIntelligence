import Stripe from 'stripe';

export interface CreateCheckoutSessionParams {
  organizationId: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  // Add other parameters for non-credit products
  productName?: string;
  amount?: number;
  currency?: string;
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
   * Create a basic checkout session for non-credit products
   */
  async createCheckoutSession(params: CreateCheckoutSessionParams) {
    const { organizationId, successUrl, cancelUrl, customerEmail, productName, amount, currency } = params;

    if (!amount || amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customerEmail,
      line_items: [
        {
          price_data: {
            currency: currency || 'usd',
            product_data: {
              name: productName || 'Service Purchase',
            },
            unit_amount: amount, // Amount in cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        organizationId,
      },
    };

    return await this.stripe.checkout.sessions.create(sessionParams);
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.warn('STRIPE_WEBHOOK_SECRET not configured, skipping webhook signature verification');
      return true; // Skip verification in development
    }

    try {
      this.stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET);
      return true;
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return false;
    }
  }

  /**
   * Process webhook events (basic implementation for non-credit events)
   */
  async processWebhook(event: Stripe.Event) {
    console.log(`Processing webhook event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`Payment completed for session: ${session.id}`);
        // Add logic here for handling successful payments of non-credit products
        break;

      case 'checkout.session.expired':
        console.log(`Payment session expired: ${event.data.object.id}`);
        break;

      case 'payment_intent.succeeded':
        console.log(`Payment intent succeeded: ${event.data.object.id}`);
        break;

      case 'payment_intent.payment_failed':
        console.log(`Payment failed: ${event.data.object.id}`);
        break;

      default:
        console.log(`Unhandled webhook event type: ${event.type}`);
    }
  }

  /**
   * Retrieve a checkout session
   */
  async getCheckoutSession(sessionId: string) {
    return await this.stripe.checkout.sessions.retrieve(sessionId);
  }

  /**
   * Create a payment intent for direct payment processing
   */
  async createPaymentIntent(params: {
    amount: number;
    currency?: string;
    metadata?: Record<string, string>;
  }) {
    const { amount, currency = 'usd', metadata } = params;

    return await this.stripe.paymentIntents.create({
      amount,
      currency,
      metadata,
    });
  }

  /**
   * Create a refund
   */
  async createRefund(paymentIntentId: string, reason?: string) {
    return await this.stripe.refunds.create({
      payment_intent: paymentIntentId,
      reason: reason as Stripe.RefundCreateParams.Reason || undefined,
    });
  }
}

export const stripeService = new StripeService();