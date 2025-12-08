import { Router } from 'express';
import { requireSuperAdmin } from '../../middleware/superAdmin.middleware';
import { creditPackagesController } from '../../controllers/superAdmin/creditPackages.controller';

const router = Router();

// All routes require super admin authentication
router.use(requireSuperAdmin);

/**
 * GET /api/super-admin/credit-packages
 * List all credit packages
 * Query params: search
 */
router.get('/credit-packages', (req, res) =>
  creditPackagesController.getAllPackages(req, res)
);

/**
 * GET /api/super-admin/credit-packages/:id
 * Get single credit package
 */
router.get('/credit-packages/:id', (req, res) =>
  creditPackagesController.getPackageById(req, res)
);

/**
 * POST /api/super-admin/credit-packages
 * Create a new credit package
 */
router.post('/credit-packages', (req, res) =>
  creditPackagesController.createPackage(req, res)
);

/**
 * PUT /api/super-admin/credit-packages/:id
 * Update credit package
 */
router.put('/credit-packages/:id', (req, res) =>
  creditPackagesController.updatePackage(req, res)
);

/**
 * DELETE /api/super-admin/credit-packages/:id
 * Soft delete credit package (set isActive=false)
 */
router.delete('/credit-packages/:id', (req, res) =>
  creditPackagesController.deletePackage(req, res)
);

/**
 * POST /api/super-admin/credit-packages/:id/toggle
 * Toggle credit package active status
 */
router.post('/credit-packages/:id/toggle', (req, res) =>
  creditPackagesController.togglePackageStatus(req, res)
);

export default router;
