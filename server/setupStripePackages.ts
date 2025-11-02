import { stripeService } from './stripeService';
import { creditService } from './creditService';

/**
 * Setup script to initialize Stripe credit packages and default pricing
 * This should be run once when setting up the application
 */
async function setupStripeIntegration() {
  console.log('🚀 Setting up Stripe integration...');

  try {
    // Initialize default credit pricing (if not already set)
    console.log('📊 Initializing default credit pricing...');
    await creditService.initializeDefaultPricing();

    // Initialize default credit packages in Stripe
    console.log('💳 Initializing default credit packages in Stripe...');
    await stripeService.initializeDefaultCreditPackages();

    console.log('✅ Stripe integration setup completed successfully!');

    // Display created packages
    console.log('\n📦 Available credit packages:');
    const packages = await stripeService.getCreditPackages();
    packages.forEach(pkg => {
      console.log(`  - ${pkg.name}: ${pkg.creditAmount} credits for $${(pkg.price / 100).toFixed(2)}`);
    });

  } catch (error) {
    console.error('❌ Error setting up Stripe integration:', error);
    process.exit(1);
  }
}

// Run setup if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupStripeIntegration();
}

export { setupStripeIntegration };