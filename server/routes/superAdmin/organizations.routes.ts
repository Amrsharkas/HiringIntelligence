import { Router } from 'express';
import { requireSuperAdmin } from '../../middleware/superAdmin.middleware';
import { organizationsController } from '../../controllers/superAdmin/organizations.controller';

const router = Router();

// All routes require super admin authentication
router.use(requireSuperAdmin);

/**
 * GET /api/super-admin/organizations
 * List all organizations with pagination and search
 * Query params: page, limit, search
 */
router.get('/organizations', (req, res) =>
  organizationsController.getAllOrganizations(req, res)
);

/**
 * GET /api/super-admin/organizations/:id
 * Get single organization details with owner info
 */
router.get('/organizations/:id', (req, res) =>
  organizationsController.getOrganizationById(req, res)
);

/**
 * PUT /api/super-admin/organizations/:id
 * Update organization details
 * Body: { companyName?, industry?, companySize?, description? }
 */
router.put('/organizations/:id', (req, res) =>
  organizationsController.updateOrganization(req, res)
);

/**
 * POST /api/super-admin/organizations/:id/credits
 * Add credits to organization
 * Body: { amount: number, creditType: 'cv_processing' | 'interview', description?: string }
 */
router.post('/organizations/:id/credits', (req, res) =>
  organizationsController.addCredits(req, res)
);

/**
 * GET /api/super-admin/organizations/:id/credits/history
 * Get credit transaction history for organization
 * Query params: limit
 */
router.get('/organizations/:id/credits/history', (req, res) =>
  organizationsController.getCreditHistory(req, res)
);

export default router;
