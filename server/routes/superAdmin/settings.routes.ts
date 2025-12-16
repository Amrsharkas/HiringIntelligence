import { Router } from 'express';
import { requireSuperAdmin } from '../../middleware/superAdmin.middleware';
import { settingsController } from '../../controllers/superAdmin/settings.controller';

const router = Router();

// All routes require super admin authentication
router.use(requireSuperAdmin);

/**
 * GET /api/super-admin/settings/twilio
 * Get Twilio settings (auth token masked)
 */
router.get('/settings/twilio', (req, res) =>
  settingsController.getTwilioSettings(req, res)
);

/**
 * PUT /api/super-admin/settings/twilio
 * Update Twilio settings
 * Body: { accountSid: string, authToken: string, phoneNumber: string }
 */
router.put('/settings/twilio', (req, res) =>
  settingsController.updateTwilioSettings(req, res)
);

/**
 * POST /api/super-admin/settings/twilio/test
 * Test Twilio connection with current settings
 */
router.post('/settings/twilio/test', (req, res) =>
  settingsController.testTwilioConnection(req, res)
);

export default router;
