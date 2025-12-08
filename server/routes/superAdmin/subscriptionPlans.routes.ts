import { Router } from 'express';
import { requireSuperAdmin } from '../../middleware/superAdmin.middleware';
import { subscriptionPlansController } from '../../controllers/superAdmin/subscriptionPlans.controller';

const router = Router();

// All routes require super admin authentication
router.use(requireSuperAdmin);

// ===== Subscription Plans =====

/**
 * GET /api/super-admin/subscription-plans
 * List all subscription plans with pagination and search
 * Query params: page, limit, search
 */
router.get('/subscription-plans', (req, res) =>
  subscriptionPlansController.getAllPlans(req, res)
);

/**
 * GET /api/super-admin/subscription-plans/:id
 * Get single subscription plan with regional pricing
 */
router.get('/subscription-plans/:id', (req, res) =>
  subscriptionPlansController.getPlanById(req, res)
);

/**
 * POST /api/super-admin/subscription-plans
 * Create a new subscription plan
 */
router.post('/subscription-plans', (req, res) =>
  subscriptionPlansController.createPlan(req, res)
);

/**
 * PUT /api/super-admin/subscription-plans/:id
 * Update subscription plan
 */
router.put('/subscription-plans/:id', (req, res) =>
  subscriptionPlansController.updatePlan(req, res)
);

/**
 * DELETE /api/super-admin/subscription-plans/:id
 * Soft delete subscription plan (set isActive=false)
 */
router.delete('/subscription-plans/:id', (req, res) =>
  subscriptionPlansController.deletePlan(req, res)
);

/**
 * POST /api/super-admin/subscription-plans/:id/duplicate
 * Duplicate a subscription plan
 */
router.post('/subscription-plans/:id/duplicate', (req, res) =>
  subscriptionPlansController.duplicatePlan(req, res)
);

// ===== Regional Pricing =====

/**
 * GET /api/super-admin/subscription-plans/:planId/pricing
 * Get all regional pricing for a plan
 */
router.get('/subscription-plans/:planId/pricing', (req, res) =>
  subscriptionPlansController.getPlanPricing(req, res)
);

/**
 * POST /api/super-admin/subscription-plans/:planId/pricing
 * Add regional pricing for a plan
 */
router.post('/subscription-plans/:planId/pricing', (req, res) =>
  subscriptionPlansController.createPricing(req, res)
);

/**
 * PUT /api/super-admin/pricing/:id
 * Update regional pricing
 */
router.put('/pricing/:id', (req, res) =>
  subscriptionPlansController.updatePricing(req, res)
);

/**
 * DELETE /api/super-admin/pricing/:id
 * Delete regional pricing
 */
router.delete('/pricing/:id', (req, res) =>
  subscriptionPlansController.deletePricing(req, res)
);

// ===== Supported Countries =====

/**
 * GET /api/super-admin/supported-countries
 * Get all supported countries
 */
router.get('/supported-countries', (req, res) =>
  subscriptionPlansController.getSupportedCountries(req, res)
);

/**
 * POST /api/super-admin/supported-countries
 * Create a new supported country
 */
router.post('/supported-countries', (req, res) =>
  subscriptionPlansController.createCountry(req, res)
);

/**
 * PUT /api/super-admin/supported-countries/:id
 * Update a supported country
 */
router.put('/supported-countries/:id', (req, res) =>
  subscriptionPlansController.updateCountry(req, res)
);

/**
 * DELETE /api/super-admin/supported-countries/:id
 * Delete a supported country
 */
router.delete('/supported-countries/:id', (req, res) =>
  subscriptionPlansController.deleteCountry(req, res)
);

export default router;
