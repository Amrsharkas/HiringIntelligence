import { Router } from 'express';
import { requireSuperAdmin } from '../../middleware/superAdmin.middleware';
import { usersController } from '../../controllers/superAdmin/users.controller';

const router = Router();

// All routes require super admin authentication
router.use(requireSuperAdmin);

/**
 * GET /api/super-admin/users
 * List all users with pagination and search
 * Query params: page, limit, search
 */
router.get('/users', (req, res) =>
  usersController.getAllUsers(req, res)
);

/**
 * GET /api/super-admin/users/:id
 * Get single user details with organizations info
 */
router.get('/users/:id', (req, res) =>
  usersController.getUserById(req, res)
);

/**
 * PUT /api/super-admin/users/:id
 * Update user details
 * Body: { firstName?, lastName?, role?, isVerified?, isSuperAdmin? }
 */
router.put('/users/:id', (req, res) =>
  usersController.updateUser(req, res)
);

/**
 * POST /api/super-admin/users/:id/toggle-super-admin
 * Toggle user's super admin status
 */
router.post('/users/:id/toggle-super-admin', (req, res) =>
  usersController.toggleSuperAdmin(req, res)
);

/**
 * POST /api/super-admin/users/:id/toggle-verified
 * Toggle user's email verified status
 */
router.post('/users/:id/toggle-verified', (req, res) =>
  usersController.toggleVerified(req, res)
);

export default router;
