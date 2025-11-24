/**
 * Setup Script for Subscription System
 * 
 * This script initializes the subscription system by:
 * 1. Creating subscription plans with EGP pricing
 * 2. Deactivating old credit packages
 * 3. Creating new credit packages (100, 300, 1000)
 * 4. Optionally creating Stripe products/prices
 * 
 * Run this script once after deploying the subscription system
 */

import { subscriptionService } from './subscriptionService';
import { stripeService } from './stripeService';
import { db } from './db';
import { creditPackages } from '@shared/schema';
import { eq } from 'drizzle-orm';

export async function setupSubscriptionSystem() {
  console.log('🚀 Starting subscription system setup...\n');

  try {
    // Step 1: Create subscription plans
    console.log('📋 Step 1: Creating subscription plans...');
    const plans = await subscriptionService.createDefaultSubscriptionPlans();
    console.log(`✅ Created ${plans.length} subscription plans:`);
    plans.forEach(plan => {
      console.log(`   - ${plan.name}: ${plan.monthlyCredits} credits/month`);
    });
    console.log('');

    // Step 2: Deactivate old credit packages
    console.log('📦 Step 2: Deactivating old credit packages...');
    const oldPackageNames = [
      'Starter Pack',
      'Professional Pack',
      'Business Pack',
      'Enterprise Pack',
      'Corporate Pack',
      '50 CV Credits',
      '100 CV Credits',
      '100 Credits Pack',
      '300 CV Credits',
      '300 Credits Pack',
      '1000 CV Credits',
      '1,000 Credits Pack',
      '25 Interview Credits',
      '100 Interview Credits',
      '500 Interview Credits'
    ];

    let deactivatedCount = 0;
    for (const name of oldPackageNames) {
      const result = await db
        .update(creditPackages)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(creditPackages.name, name));
      
      if (result.rowCount && result.rowCount > 0) {
        deactivatedCount++;
        console.log(`   ✓ Deactivated: ${name}`);
      }
    }
    console.log(`✅ Deactivated ${deactivatedCount} old packages\n`);

    // Step 3: Create new credit packages
    console.log('💳 Step 3: Creating new credit packages...');
    await stripeService.initializeDefaultCreditPackages();
    console.log('✅ Created new credit packages (Scanning: 500, 1000, 2500 | Interview: 10, 25, 50)\n');

    // Step 4: Create Stripe products (optional - requires Stripe API)
    console.log('🔵 Step 4: Creating Stripe subscription products...');
    try {
      await stripeService.createSubscriptionProducts();
      console.log('✅ Stripe products created successfully\n');
    } catch (error) {
      console.log('⚠️  Stripe product creation skipped (requires valid Stripe credentials)');
      console.log('   You can run this later via: POST /api/subscriptions/stripe/create-products\n');
    }

    // Summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ Subscription system setup completed successfully!\n');
    console.log('📝 Next steps:');
    console.log('   1. Configure Stripe webhook: stripe listen --forward-to localhost:3005/api/payments/webhook');
    console.log('   2. Add webhook secret to .env: STRIPE_WEBHOOK_SECRET=whsec_...');
    console.log('   3. Test subscription flow by creating a new organization');
    console.log('   4. Subscribe to a plan via the dashboard');
    console.log('   5. Verify credits are allocated after payment\n');
    console.log('💡 Subscription Plans Available:');
    console.log('   - Starter: 29,000 EGP/month (1,250 Scanning + 25 Interview credits, 5 job posts)');
    console.log('   - Growth: 39,000 EGP/month (2,500 Scanning + 50 Interview credits, 10 job posts)');
    console.log('   - Pro: 49,000 EGP/month (5,000 Scanning + 80 Interview credits, unlimited job posts)');
    console.log('   - Enterprise: Contact us for custom pricing and solutions\n');
    console.log('💡 Additional Credit Packs:');
    console.log('   CV Scanning Add-ons:');
    console.log('   - 500 Scanning Credits: 12,500 EGP');
    console.log('   - 1,000 Scanning Credits: 15,000 EGP');
    console.log('   - 2,500 Scanning Credits: 26,700 EGP');
    console.log('   Interview Add-ons:');
    console.log('   - 10 Interview Credits: 4,000 EGP');
    console.log('   - 25 Interview Credits: 9,000 EGP');
    console.log('   - 50 Interview Credits: 15,000 EGP');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error during setup:', error);
    throw error;
  }
}

// Run setup if executed directly (ES module version)
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  setupSubscriptionSystem()
    .then(() => {
      console.log('Setup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Setup failed:', error);
      process.exit(1);
    });
}
