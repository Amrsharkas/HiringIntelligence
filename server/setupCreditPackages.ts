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

    // CV Scanning credit packages (add-ons)
    const cvPackages = [
      {
        name: '500 Scanning Credits',
        description: 'Process 500 resumes',
        creditType: 'cv_processing',
        creditAmount: 500,
        price: 1250000, // 12,500 EGP
        sortOrder: 1,
      },
      {
        name: '1000 Scanning Credits',
        description: 'Process 1000 resumes',
        creditType: 'cv_processing',
        creditAmount: 1000,
        price: 1500000, // 15,000 EGP
        sortOrder: 2,
      },
      {
        name: '2500 Scanning Credits',
        description: 'Process 2500 resumes',
        creditType: 'cv_processing',
        creditAmount: 2500,
        price: 2670000, // 26,700 EGP
        sortOrder: 3,
      },
    ];

    // Interview credit packages (add-ons)
    const interviewPackages = [
      {
        name: '10 Interview Credits',
        description: 'Schedule 10 interviews',
        creditType: 'interview',
        creditAmount: 10,
        price: 400000, // 4,000 EGP
        sortOrder: 4,
      },
      {
        name: '25 Interview Credits',
        description: 'Schedule 25 interviews',
        creditType: 'interview',
        creditAmount: 25,
        price: 900000, // 9,000 EGP
        sortOrder: 5,
      },
      {
        name: '50 Interview Credits',
        description: 'Schedule 50 interviews',
        creditType: 'interview',
        creditAmount: 50,
        price: 1500000, // 15,000 EGP
        sortOrder: 6,
      },
    ];

    const defaultPackages = [...cvPackages, ...interviewPackages];

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
          currency: 'EGP',
          isActive: true,
          stripePriceId: null, // Will be set when Stripe is configured
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log(`✅ Created package: ${packageData.name} - ${packageData.creditAmount} ${packageData.creditType} credits for ${(packageData.price / 100).toFixed(0)} EGP`);
      } else {
        console.log(`ℹ️  Package already exists: ${packageData.name}`);
      }
    }

    console.log('✅ Credit packages setup completed!');

    // Display created packages
    console.log('\n📦 Available credit packages:');
    const packages = await db.select().from(creditPackages).where(eq(creditPackages.isActive, true)).orderBy(creditPackages.sortOrder);
    packages.forEach((pkg: any) => {
      console.log(`  - ${pkg.name}: ${pkg.creditAmount} ${pkg.creditType} credits for ${(pkg.price / 100).toFixed(0)} EGP`);
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