import Stripe from 'stripe';
import { stripeService } from './stripeService';

/**
 * Test webhook processing manually
 */
async function testWebhookProcessing() {
  console.log('🧪 Testing webhook processing...');

  try {
    // Create a mock checkout session that mimics a successful payment
    const mockSession = {
      id: 'cs_test_' + Math.random().toString(36).substring(7),
      payment_status: 'paid' as const,
      payment_intent: 'pi_test_' + Math.random().toString(36).substring(7),
      amount_total: 1000, // $10.00
      currency: 'usd',
      metadata: {
        organizationId: 'test-org-id',
        creditPackageId: 'test-package-id',
        paymentAttemptId: 'test-attempt-id',
        creditAmount: '100'
      },
      created: Math.floor(Date.now() / 1000),
    };

    console.log('📝 Mock session created:', mockSession);

    // Test the webhook processing
    await stripeService.processSuccessfulPayment(mockSession as any);

    console.log('✅ Webhook processing test completed successfully');
  } catch (error) {
    console.error('❌ Webhook processing test failed:', error);
  }
}

// Run test if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testWebhookProcessing();
}

export { testWebhookProcessing };