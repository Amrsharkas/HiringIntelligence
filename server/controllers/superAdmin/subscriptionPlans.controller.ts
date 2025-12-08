import { Request, Response } from 'express';
import { db } from '../../db';
import { subscriptionPlans, subscriptionPlanPricing, supportedCountries } from '@shared/schema';
import { eq, desc, sql, ilike, and } from 'drizzle-orm';

/**
 * Super Admin Subscription Plans Controller
 * Handles all subscription plan management operations for super admins
 */
export class SubscriptionPlansController {
  /**
   * Get all subscription plans with pagination and search
   */
  async getAllPlans(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;
      const search = req.query.search as string;

      // Build where clause
      let whereClause = undefined;
      if (search && search.trim()) {
        whereClause = ilike(subscriptionPlans.name, `%${search.trim()}%`);
      }

      // Get plans with pagination
      const plans = await db
        .select()
        .from(subscriptionPlans)
        .where(whereClause)
        .orderBy(subscriptionPlans.sortOrder, desc(subscriptionPlans.createdAt))
        .limit(limit)
        .offset(offset);

      // Get total count for pagination
      const countQuery = db
        .select({ count: sql<number>`count(*)::int` })
        .from(subscriptionPlans);

      if (whereClause) {
        countQuery.where(whereClause);
      }

      const [countResult] = await countQuery;
      const total = countResult?.count || 0;

      res.json({
        plans,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error fetching subscription plans:', error);
      res.status(500).json({ error: 'Failed to fetch subscription plans' });
    }
  }

  /**
   * Get single subscription plan by ID with regional pricing
   */
  async getPlanById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const [plan] = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.id, id));

      if (!plan) {
        return res.status(404).json({ error: 'Subscription plan not found' });
      }

      // Get regional pricing for this plan
      const pricing = await db
        .select()
        .from(subscriptionPlanPricing)
        .where(eq(subscriptionPlanPricing.subscriptionPlanId, id))
        .orderBy(desc(subscriptionPlanPricing.isDefault));

      res.json({ ...plan, pricing });
    } catch (error) {
      console.error('Error fetching subscription plan:', error);
      res.status(500).json({ error: 'Failed to fetch subscription plan' });
    }
  }

  /**
   * Create a new subscription plan
   */
  async createPlan(req: Request, res: Response) {
    try {
      const {
        name,
        description,
        monthlyPrice,
        yearlyPrice,
        monthlyCvCredits,
        monthlyInterviewCredits,
        jobPostsLimit,
        supportLevel,
        features,
        stripePriceIdMonthly,
        stripePriceIdYearly,
        sortOrder,
        isActive
      } = req.body;

      // Validation
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Plan name is required' });
      }

      if (typeof monthlyPrice !== 'number' || monthlyPrice < 0) {
        return res.status(400).json({ error: 'Monthly price must be a non-negative number' });
      }

      if (typeof yearlyPrice !== 'number' || yearlyPrice < 0) {
        return res.status(400).json({ error: 'Yearly price must be a non-negative number' });
      }

      if (typeof monthlyCvCredits !== 'number' || monthlyCvCredits < 0) {
        return res.status(400).json({ error: 'Monthly CV credits must be a non-negative number' });
      }

      if (typeof monthlyInterviewCredits !== 'number' || monthlyInterviewCredits < 0) {
        return res.status(400).json({ error: 'Monthly interview credits must be a non-negative number' });
      }

      const validSupportLevels = ['standard', 'priority', 'dedicated'];
      if (!supportLevel || !validSupportLevels.includes(supportLevel)) {
        return res.status(400).json({ error: 'Support level must be standard, priority, or dedicated' });
      }

      const [newPlan] = await db
        .insert(subscriptionPlans)
        .values({
          name: name.trim(),
          description: description || null,
          monthlyPrice,
          yearlyPrice,
          monthlyCvCredits,
          monthlyInterviewCredits,
          monthlyCredits: 0, // Legacy field
          jobPostsLimit: jobPostsLimit || null,
          supportLevel,
          features: features || null,
          stripePriceIdMonthly: stripePriceIdMonthly || null,
          stripePriceIdYearly: stripePriceIdYearly || null,
          sortOrder: sortOrder || 0,
          isActive: isActive !== false
        })
        .returning();

      res.status(201).json(newPlan);
    } catch (error) {
      console.error('Error creating subscription plan:', error);
      res.status(500).json({ error: 'Failed to create subscription plan' });
    }
  }

  /**
   * Update subscription plan
   */
  async updatePlan(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const {
        name,
        description,
        monthlyPrice,
        yearlyPrice,
        monthlyCvCredits,
        monthlyInterviewCredits,
        jobPostsLimit,
        supportLevel,
        features,
        stripePriceIdMonthly,
        stripePriceIdYearly,
        sortOrder,
        isActive
      } = req.body;

      // Check if plan exists
      const [existingPlan] = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.id, id));

      if (!existingPlan) {
        return res.status(404).json({ error: 'Subscription plan not found' });
      }

      // Validate support level if provided
      if (supportLevel !== undefined) {
        const validSupportLevels = ['standard', 'priority', 'dedicated'];
        if (!validSupportLevels.includes(supportLevel)) {
          return res.status(400).json({ error: 'Support level must be standard, priority, or dedicated' });
        }
      }

      // Build update object with only provided fields
      const updateData: Record<string, any> = {
        updatedAt: new Date()
      };

      if (name !== undefined) updateData.name = name.trim();
      if (description !== undefined) updateData.description = description;
      if (monthlyPrice !== undefined) updateData.monthlyPrice = monthlyPrice;
      if (yearlyPrice !== undefined) updateData.yearlyPrice = yearlyPrice;
      if (monthlyCvCredits !== undefined) updateData.monthlyCvCredits = monthlyCvCredits;
      if (monthlyInterviewCredits !== undefined) updateData.monthlyInterviewCredits = monthlyInterviewCredits;
      if (jobPostsLimit !== undefined) updateData.jobPostsLimit = jobPostsLimit;
      if (supportLevel !== undefined) updateData.supportLevel = supportLevel;
      if (features !== undefined) updateData.features = features;
      if (stripePriceIdMonthly !== undefined) updateData.stripePriceIdMonthly = stripePriceIdMonthly;
      if (stripePriceIdYearly !== undefined) updateData.stripePriceIdYearly = stripePriceIdYearly;
      if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
      if (isActive !== undefined) updateData.isActive = isActive;

      const [updated] = await db
        .update(subscriptionPlans)
        .set(updateData)
        .where(eq(subscriptionPlans.id, id))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error('Error updating subscription plan:', error);
      res.status(500).json({ error: 'Failed to update subscription plan' });
    }
  }

  /**
   * Delete subscription plan
   * - If plan is active: soft delete (set isActive = false)
   * - If plan is already inactive: hard delete (remove from database)
   */
  async deletePlan(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Check if plan exists
      const [existingPlan] = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.id, id));

      if (!existingPlan) {
        return res.status(404).json({ error: 'Subscription plan not found' });
      }

      if (existingPlan.isActive) {
        // Soft delete by setting isActive to false
        await db
          .update(subscriptionPlans)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(subscriptionPlans.id, id));

        res.json({ message: 'Subscription plan deactivated successfully' });
      } else {
        // Hard delete - plan is already inactive
        // First delete associated regional pricing
        await db
          .delete(subscriptionPlanPricing)
          .where(eq(subscriptionPlanPricing.subscriptionPlanId, id));

        // Then delete the plan
        await db
          .delete(subscriptionPlans)
          .where(eq(subscriptionPlans.id, id));

        res.json({ message: 'Subscription plan permanently deleted' });
      }
    } catch (error) {
      console.error('Error deleting subscription plan:', error);
      res.status(500).json({ error: 'Failed to delete subscription plan' });
    }
  }

  /**
   * Duplicate a subscription plan
   */
  async duplicatePlan(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Get original plan
      const [originalPlan] = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.id, id));

      if (!originalPlan) {
        return res.status(404).json({ error: 'Subscription plan not found' });
      }

      // Create duplicate with "(Copy)" suffix
      const [duplicatedPlan] = await db
        .insert(subscriptionPlans)
        .values({
          name: `${originalPlan.name} (Copy)`,
          description: originalPlan.description,
          monthlyPrice: originalPlan.monthlyPrice,
          yearlyPrice: originalPlan.yearlyPrice,
          monthlyCvCredits: originalPlan.monthlyCvCredits,
          monthlyInterviewCredits: originalPlan.monthlyInterviewCredits,
          monthlyCredits: originalPlan.monthlyCredits,
          jobPostsLimit: originalPlan.jobPostsLimit,
          supportLevel: originalPlan.supportLevel,
          features: originalPlan.features,
          stripePriceIdMonthly: null, // Don't copy Stripe IDs
          stripePriceIdYearly: null,
          sortOrder: originalPlan.sortOrder + 1,
          isActive: false // Start as inactive
        })
        .returning();

      res.status(201).json(duplicatedPlan);
    } catch (error) {
      console.error('Error duplicating subscription plan:', error);
      res.status(500).json({ error: 'Failed to duplicate subscription plan' });
    }
  }

  // ===== Regional Pricing Methods =====

  /**
   * Get all pricing for a plan
   */
  async getPlanPricing(req: Request, res: Response) {
    try {
      const { planId } = req.params;

      // Verify plan exists
      const [plan] = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.id, planId));

      if (!plan) {
        return res.status(404).json({ error: 'Subscription plan not found' });
      }

      const pricing = await db
        .select()
        .from(subscriptionPlanPricing)
        .where(eq(subscriptionPlanPricing.subscriptionPlanId, planId))
        .orderBy(desc(subscriptionPlanPricing.isDefault), subscriptionPlanPricing.countryCode);

      res.json(pricing);
    } catch (error) {
      console.error('Error fetching plan pricing:', error);
      res.status(500).json({ error: 'Failed to fetch plan pricing' });
    }
  }

  /**
   * Add regional pricing for a plan
   */
  async createPricing(req: Request, res: Response) {
    try {
      const { planId } = req.params;
      const {
        countryCode,
        currency,
        monthlyPrice,
        yearlyPrice,
        stripePriceIdMonthly,
        stripePriceIdYearly,
        isDefault
      } = req.body;

      // Verify plan exists
      const [plan] = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.id, planId));

      if (!plan) {
        return res.status(404).json({ error: 'Subscription plan not found' });
      }

      // Validate country code format (ISO 3166-1 alpha-2)
      if (!countryCode || !/^[A-Z]{2}$/.test(countryCode)) {
        return res.status(400).json({ error: 'Invalid country code format (must be 2 uppercase letters)' });
      }

      // Validate currency format (ISO 4217)
      if (!currency || !/^[A-Z]{3}$/.test(currency)) {
        return res.status(400).json({ error: 'Invalid currency code format (must be 3 uppercase letters)' });
      }

      if (typeof monthlyPrice !== 'number' || monthlyPrice < 0) {
        return res.status(400).json({ error: 'Monthly price must be a non-negative number' });
      }

      if (typeof yearlyPrice !== 'number' || yearlyPrice < 0) {
        return res.status(400).json({ error: 'Yearly price must be a non-negative number' });
      }

      // Check for existing pricing for this plan/country combo
      const [existingPricing] = await db
        .select()
        .from(subscriptionPlanPricing)
        .where(and(
          eq(subscriptionPlanPricing.subscriptionPlanId, planId),
          eq(subscriptionPlanPricing.countryCode, countryCode)
        ));

      if (existingPricing) {
        return res.status(400).json({ error: 'Pricing already exists for this plan and country' });
      }

      // If setting as default, unset other defaults for this plan
      if (isDefault) {
        await db
          .update(subscriptionPlanPricing)
          .set({ isDefault: false })
          .where(eq(subscriptionPlanPricing.subscriptionPlanId, planId));
      }

      const [newPricing] = await db
        .insert(subscriptionPlanPricing)
        .values({
          subscriptionPlanId: planId,
          countryCode,
          currency,
          monthlyPrice,
          yearlyPrice,
          stripePriceIdMonthly: stripePriceIdMonthly || null,
          stripePriceIdYearly: stripePriceIdYearly || null,
          isDefault: isDefault || false,
          isActive: true
        })
        .returning();

      res.status(201).json(newPricing);
    } catch (error) {
      console.error('Error creating plan pricing:', error);
      res.status(500).json({ error: 'Failed to create plan pricing' });
    }
  }

  /**
   * Update regional pricing
   */
  async updatePricing(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const {
        monthlyPrice,
        yearlyPrice,
        stripePriceIdMonthly,
        stripePriceIdYearly,
        isDefault,
        isActive
      } = req.body;

      // Check if pricing exists
      const [existingPricing] = await db
        .select()
        .from(subscriptionPlanPricing)
        .where(eq(subscriptionPlanPricing.id, id));

      if (!existingPricing) {
        return res.status(404).json({ error: 'Pricing not found' });
      }

      // If setting as default, unset other defaults for this plan
      if (isDefault) {
        await db
          .update(subscriptionPlanPricing)
          .set({ isDefault: false })
          .where(eq(subscriptionPlanPricing.subscriptionPlanId, existingPricing.subscriptionPlanId));
      }

      const updateData: Record<string, any> = {
        updatedAt: new Date()
      };

      if (monthlyPrice !== undefined) updateData.monthlyPrice = monthlyPrice;
      if (yearlyPrice !== undefined) updateData.yearlyPrice = yearlyPrice;
      if (stripePriceIdMonthly !== undefined) updateData.stripePriceIdMonthly = stripePriceIdMonthly;
      if (stripePriceIdYearly !== undefined) updateData.stripePriceIdYearly = stripePriceIdYearly;
      if (isDefault !== undefined) updateData.isDefault = isDefault;
      if (isActive !== undefined) updateData.isActive = isActive;

      const [updated] = await db
        .update(subscriptionPlanPricing)
        .set(updateData)
        .where(eq(subscriptionPlanPricing.id, id))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error('Error updating pricing:', error);
      res.status(500).json({ error: 'Failed to update pricing' });
    }
  }

  /**
   * Delete regional pricing
   */
  async deletePricing(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const [existingPricing] = await db
        .select()
        .from(subscriptionPlanPricing)
        .where(eq(subscriptionPlanPricing.id, id));

      if (!existingPricing) {
        return res.status(404).json({ error: 'Pricing not found' });
      }

      await db
        .delete(subscriptionPlanPricing)
        .where(eq(subscriptionPlanPricing.id, id));

      res.json({ message: 'Pricing deleted successfully' });
    } catch (error) {
      console.error('Error deleting pricing:', error);
      res.status(500).json({ error: 'Failed to delete pricing' });
    }
  }

  // ===== Supported Countries Methods =====

  /**
   * Get all supported countries
   */
  async getSupportedCountries(req: Request, res: Response) {
    try {
      const countries = await db
        .select()
        .from(supportedCountries)
        .orderBy(desc(supportedCountries.isDefault), supportedCountries.countryName);

      res.json(countries);
    } catch (error) {
      console.error('Error fetching supported countries:', error);
      res.status(500).json({ error: 'Failed to fetch supported countries' });
    }
  }

  /**
   * Create a new supported country
   */
  async createCountry(req: Request, res: Response) {
    try {
      const { countryCode, countryName, currency, currencySymbol, isDefault, isActive } = req.body;

      // Validate country code
      if (!countryCode || !/^[A-Z]{2}$/.test(countryCode)) {
        return res.status(400).json({ error: 'Invalid country code format (must be 2 uppercase letters)' });
      }

      // Validate currency
      if (!currency || !/^[A-Z]{3}$/.test(currency)) {
        return res.status(400).json({ error: 'Invalid currency code format (must be 3 uppercase letters)' });
      }

      if (!countryName || typeof countryName !== 'string') {
        return res.status(400).json({ error: 'Country name is required' });
      }

      if (!currencySymbol || typeof currencySymbol !== 'string') {
        return res.status(400).json({ error: 'Currency symbol is required' });
      }

      // Check for existing country
      const [existingCountry] = await db
        .select()
        .from(supportedCountries)
        .where(eq(supportedCountries.countryCode, countryCode));

      if (existingCountry) {
        return res.status(400).json({ error: 'Country already exists' });
      }

      // If setting as default, unset other defaults
      if (isDefault) {
        await db
          .update(supportedCountries)
          .set({ isDefault: false });
      }

      const [newCountry] = await db
        .insert(supportedCountries)
        .values({
          countryCode,
          countryName,
          currency,
          currencySymbol,
          isDefault: isDefault || false,
          isActive: isActive !== false
        })
        .returning();

      res.status(201).json(newCountry);
    } catch (error) {
      console.error('Error creating country:', error);
      res.status(500).json({ error: 'Failed to create country' });
    }
  }

  /**
   * Update a supported country
   */
  async updateCountry(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { countryName, currency, currencySymbol, isDefault, isActive } = req.body;

      const [existingCountry] = await db
        .select()
        .from(supportedCountries)
        .where(eq(supportedCountries.id, id));

      if (!existingCountry) {
        return res.status(404).json({ error: 'Country not found' });
      }

      // If setting as default, unset other defaults
      if (isDefault) {
        await db
          .update(supportedCountries)
          .set({ isDefault: false });
      }

      const updateData: Record<string, any> = {};

      if (countryName !== undefined) updateData.countryName = countryName;
      if (currency !== undefined) updateData.currency = currency;
      if (currencySymbol !== undefined) updateData.currencySymbol = currencySymbol;
      if (isDefault !== undefined) updateData.isDefault = isDefault;
      if (isActive !== undefined) updateData.isActive = isActive;

      const [updated] = await db
        .update(supportedCountries)
        .set(updateData)
        .where(eq(supportedCountries.id, id))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error('Error updating country:', error);
      res.status(500).json({ error: 'Failed to update country' });
    }
  }

  /**
   * Delete a supported country
   */
  async deleteCountry(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const [existingCountry] = await db
        .select()
        .from(supportedCountries)
        .where(eq(supportedCountries.id, id));

      if (!existingCountry) {
        return res.status(404).json({ error: 'Country not found' });
      }

      // Check if any pricing uses this country
      const [pricingUsingCountry] = await db
        .select()
        .from(subscriptionPlanPricing)
        .where(eq(subscriptionPlanPricing.countryCode, existingCountry.countryCode))
        .limit(1);

      if (pricingUsingCountry) {
        return res.status(400).json({
          error: 'Cannot delete country with existing pricing. Remove all pricing for this country first.'
        });
      }

      await db
        .delete(supportedCountries)
        .where(eq(supportedCountries.id, id));

      res.json({ message: 'Country deleted successfully' });
    } catch (error) {
      console.error('Error deleting country:', error);
      res.status(500).json({ error: 'Failed to delete country' });
    }
  }
}

// Export singleton instance
export const subscriptionPlansController = new SubscriptionPlansController();
