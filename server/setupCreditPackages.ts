import { db } from './db';
import { creditPackages } from '@shared/schema';
import { creditService } from './creditService';
import { eq } from 'drizzle-orm';

/**
 * Setup script to initialize credit packages in database
 * This creates the database records without requiring actual Stripe keys
 */
async function setupCreditPackages() {
  console.log('🚀 Setting up credit packages...');

  try {
    // Initialize default credit pricing (if not already set)
    console.log('📊 Initializing default credit pricing...');
    await creditService.initializeDefaultPricing();

    // Create default credit packages in database (without Stripe integration)
    console.log('💳 Initializing credit packages in database...');

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
        await db.insert(creditPackages).values({
          id: crypto.randomUUID(),
          ...packageData,
          currency: 'USD',
          isActive: true,
          stripePriceId: null, // Will be set when Stripe is configured
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log(`✅ Created package: ${packageData.name} - ${packageData.creditAmount} credits for $${(packageData.price / 100).toFixed(2)}`);
      } else {
        console.log(`ℹ️  Package already exists: ${packageData.name}`);
      }
    }

    console.log('✅ Credit packages setup completed!');

    // Display created packages
    console.log('\n📦 Available credit packages:');
    const packages = await db.select().from(creditPackages).where(eq(creditPackages.isActive, true)).orderBy(creditPackages.sortOrder);
    packages.forEach(pkg => {
      console.log(`  - ${pkg.name}: ${pkg.creditAmount} credits for $${(pkg.price / 100).toFixed(2)}`);
    });

  } catch (error) {
    console.error('❌ Error setting up credit packages:', error);
    process.exit(1);
  }
}

// Run setup if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupCreditPackages();
}

export { setupCreditPackages };