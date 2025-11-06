/**
 * Setup script to initialize subscription plans and credit packages
 * Run this once after deploying the subscription system
 */

import { subscriptionService } from './subscriptionService';
import { stripeService } from './stripeService';
import { creditService } from './creditService';

async function setup() {
  console.log('🚀 Starting subscription system setup...\n');

  try {
    // Step 1: Initialize subscription plans
    console.log('📋 Step 1: Creating subscription plans...');
    const plans = await subscriptionService.createDefaultSubscriptionPlans();
    console.log(`✅ Created ${plans.length} subscription plans\n`);

    // Step 2: Initialize credit packages
    console.log('💳 Step 2: Creating credit packages...');
    await stripeService.initializeDefaultCreditPackages();
    console.log('✅ Credit packages created\n');

    // Step 3: Initialize credit pricing
    console.log('💰 Step 3: Setting up credit pricing...');
    await creditService.initializeDefaultPricing();
    console.log('✅ Credit pricing configured\n');

    // Step 4: Create Stripe products (optional - only if using Stripe price IDs)
    console.log('🎯 Step 4: Creating Stripe subscription products...');
    console.log('⚠️  This will create products in Stripe. Make sure your Stripe API key is configured.');
    try {
      await stripeService.createSubscriptionProducts();
      console.log('✅ Stripe products created successfully\n');
    } catch (error) {
      console.log('⚠️  Stripe product creation skipped or failed:', error instanceof Error ? error.message : error);
      console.log('   You can create them later via: POST /api/subscriptions/stripe/create-products\n');
    }

    console.log('🎉 Setup completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Configure Stripe webhook: stripe listen --forward-to localhost:3005/api/payments/webhook');
    console.log('2. Add STRIPE_WEBHOOK_SECRET to your .env file');
    console.log('3. Test the subscription flow by visiting the dashboard');
    console.log('4. Organizations can now subscribe to plans!\n');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

export { setup };

// Run setup if this file is executed directly
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  setup()
    .then(() => {
      console.log('✅ Setup script finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Setup script failed:', error);
      process.exit(1);
    });
}
