import { db } from './db';
import {
  supportedCountries,
  subscriptionPlanPricing,
  subscriptionPlans
} from '@shared/schema';
import { eq } from 'drizzle-orm';

// Pricing configuration for each plan by country
const PRICING_CONFIG: Record<string, Record<string, { monthly: number; yearly: number }>> = {
  'Starter': {
    'EG': { monthly: 2900000, yearly: Math.round(2900000 * 0.82 * 12) }, // 29,000 EGP/month
    'US': { monthly: 58000, yearly: Math.round(58000 * 0.82 * 12) }, // $580/month
  },
  'Growth': {
    'EG': { monthly: 3900000, yearly: Math.round(3900000 * 0.82 * 12) }, // 39,000 EGP/month
    'US': { monthly: 78000, yearly: Math.round(78000 * 0.82 * 12) }, // $780/month
  },
  'Pro': {
    'EG': { monthly: 4900000, yearly: Math.round(4900000 * 0.82 * 12) }, // 49,000 EGP/month
    'US': { monthly: 98000, yearly: Math.round(98000 * 0.82 * 12) }, // $980/month
  },
  'Enterprise': {
    'EG': { monthly: 0, yearly: 0 }, // Custom pricing
    'US': { monthly: 0, yearly: 0 }, // Custom pricing
  },
};

const COUNTRY_CONFIG = [
  {
    countryCode: 'EG',
    countryName: 'Egypt',
    currency: 'EGP',
    currencySymbol: 'EGP',
    isDefault: true,
  },
  {
    countryCode: 'US',
    countryName: 'United States',
    currency: 'USD',
    currencySymbol: '$',
    isDefault: false,
  },
];

export async function setupRegionalPricing(): Promise<void> {
  console.log('Setting up regional pricing...');

  try {
    // 1. Insert supported countries
    console.log('Inserting supported countries...');
    for (const country of COUNTRY_CONFIG) {
      // Check if country already exists
      const [existing] = await db
        .select()
        .from(supportedCountries)
        .where(eq(supportedCountries.countryCode, country.countryCode));

      if (!existing) {
        await db.insert(supportedCountries).values({
          id: crypto.randomUUID(),
          ...country,
          isActive: true,
        });
        console.log(`  Added country: ${country.countryName} (${country.countryCode})`);
      } else {
        console.log(`  Country already exists: ${country.countryName} (${country.countryCode})`);
      }
    }

    // 2. Get existing subscription plans
    console.log('Fetching subscription plans...');
    const plans = await db.select().from(subscriptionPlans);
    console.log(`  Found ${plans.length} plans`);

    // 3. Insert pricing for each plan/country combination
    console.log('Inserting plan pricing...');
    for (const plan of plans) {
      const planPricing = PRICING_CONFIG[plan.name];
      if (!planPricing) {
        console.log(`  Skipping plan "${plan.name}" - no pricing config found`);
        continue;
      }

      for (const [countryCode, prices] of Object.entries(planPricing)) {
        const countryConfig = COUNTRY_CONFIG.find(c => c.countryCode === countryCode);
        if (!countryConfig) continue;

        // Check if pricing already exists
        const [existing] = await db
          .select()
          .from(subscriptionPlanPricing)
          .where(
            eq(subscriptionPlanPricing.subscriptionPlanId, plan.id)
          );

        // Check if this specific plan+country combo exists
        const existingForCountry = await db
          .select()
          .from(subscriptionPlanPricing)
          .where(eq(subscriptionPlanPricing.subscriptionPlanId, plan.id));

        const hasCountryPricing = existingForCountry.some(p => p.countryCode === countryCode);

        if (!hasCountryPricing) {
          await db.insert(subscriptionPlanPricing).values({
            id: crypto.randomUUID(),
            subscriptionPlanId: plan.id,
            countryCode,
            currency: countryConfig.currency,
            monthlyPrice: prices.monthly,
            yearlyPrice: prices.yearly,
            isActive: true,
            isDefault: countryConfig.isDefault,
          });
          console.log(`  Added ${countryCode} pricing for ${plan.name}: ${prices.monthly} ${countryConfig.currency}/month`);
        } else {
          console.log(`  Pricing already exists for ${plan.name} (${countryCode})`);
        }
      }
    }

    console.log('Regional pricing setup complete!');
  } catch (error) {
    console.error('Error setting up regional pricing:', error);
    throw error;
  }
}

// Run if called directly (ES module compatible)
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  setupRegionalPricing()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed:', error);
      process.exit(1);
    });
}
