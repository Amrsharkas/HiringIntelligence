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

    // CV Processing credit packages
    const cvPackages = [
      {
        name: '50 CV Credits',
        description: 'Process 50 resumes',
        creditType: 'cv_processing',
        creditAmount: 50,
        price: 450000, // 4,500 EGP (90 EGP per credit)
        sortOrder: 1,
      },
      {
        name: '100 CV Credits',
        description: 'Process 100 resumes',
        creditType: 'cv_processing',
        creditAmount: 100,
        price: 900000, // 9,000 EGP (90 EGP per credit)
        sortOrder: 2,
      },
      {
        name: '300 CV Credits',
        description: 'Process 300 resumes',
        creditType: 'cv_processing',
        creditAmount: 300,
        price: 2400000, // 24,000 EGP (80 EGP per credit - bulk discount)
        sortOrder: 3,
      },
      {
        name: '1000 CV Credits',
        description: 'Process 1000 resumes',
        creditType: 'cv_processing',
        creditAmount: 1000,
        price: 7000000, // 70,000 EGP (70 EGP per credit - bulk discount)
        sortOrder: 4,
      },
    ];

    // Interview credit packages
    const interviewPackages = [
      {
        name: '25 Interview Credits',
        description: 'Schedule 25 interviews',
        creditType: 'interview',
        creditAmount: 25,
        price: 225000, // 2,250 EGP (90 EGP per credit)
        sortOrder: 5,
      },
      {
        name: '50 Interview Credits',
        description: 'Schedule 50 interviews',
        creditType: 'interview',
        creditAmount: 50,
        price: 450000, // 4,500 EGP (90 EGP per credit)
        sortOrder: 6,
      },
      {
        name: '100 Interview Credits',
        description: 'Schedule 100 interviews',
        creditType: 'interview',
        creditAmount: 100,
        price: 800000, // 8,000 EGP (80 EGP per credit - bulk discount)
        sortOrder: 7,
      },
      {
        name: '500 Interview Credits',
        description: 'Schedule 500 interviews',
        creditType: 'interview',
        creditAmount: 500,
        price: 3500000, // 35,000 EGP (70 EGP per credit - bulk discount)
        sortOrder: 8,
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