import { Router } from 'express';
import { requireSuperAdmin } from '../../middleware/superAdmin.middleware';
import { promptsController } from '../../controllers/superAdmin/prompts.controller';

const router = Router();

// All routes require super admin authentication
router.use(requireSuperAdmin);

/**
 * GET /api/super-admin/prompts
 * List all prompts with pagination and search
 * Query params: page, limit, search, type
 */
router.get('/prompts', (req, res) =>
  promptsController.getAllPrompts(req, res)
);

/**
 * GET /api/super-admin/prompts/types
 * Get list of available prompt types
 */
router.get('/prompts/types', (req, res) =>
  promptsController.getPromptTypes(req, res)
);

/**
 * GET /api/super-admin/prompts/type/:type
 * Get active default prompt by type (for system use)
 */
router.get('/prompts/type/:type', (req, res) =>
  promptsController.getActivePromptByType(req, res)
);

/**
 * POST /api/super-admin/prompts/preview
 * Preview a prompt with sample data
 * Body: { systemPrompt, userPrompt, type, customSampleData? }
 */
router.post('/prompts/preview', (req, res) =>
  promptsController.previewPrompt(req, res)
);

/**
 * GET /api/super-admin/prompts/:id
 * Get single prompt by ID
 */
router.get('/prompts/:id', (req, res) =>
  promptsController.getPromptById(req, res)
);

/**
 * POST /api/super-admin/prompts
 * Create a new prompt
 * Body: { name, description?, type, systemPrompt, userPrompt, variables?, modelId?, isActive?, isDefault?, sortOrder? }
 */
router.post('/prompts', (req, res) =>
  promptsController.createPrompt(req, res)
);

/**
 * PUT /api/super-admin/prompts/:id
 * Update an existing prompt (saves version to history)
 * Body: { name?, description?, type?, systemPrompt?, userPrompt?, variables?, modelId?, isActive?, isDefault?, sortOrder?, changeNote? }
 */
router.put('/prompts/:id', (req, res) =>
  promptsController.updatePrompt(req, res)
);

/**
 * DELETE /api/super-admin/prompts/:id
 * Delete a prompt (soft delete if active, hard delete if inactive)
 */
router.delete('/prompts/:id', (req, res) =>
  promptsController.deletePrompt(req, res)
);

/**
 * POST /api/super-admin/prompts/:id/duplicate
 * Duplicate an existing prompt
 */
router.post('/prompts/:id/duplicate', (req, res) =>
  promptsController.duplicatePrompt(req, res)
);

/**
 * POST /api/super-admin/prompts/:id/set-default
 * Set a prompt as default for its type
 */
router.post('/prompts/:id/set-default', (req, res) =>
  promptsController.setDefaultPrompt(req, res)
);

/**
 * GET /api/super-admin/prompts/:id/versions
 * Get version history for a prompt
 * Query params: page, limit
 */
router.get('/prompts/:id/versions', (req, res) =>
  promptsController.getPromptVersions(req, res)
);

/**
 * POST /api/super-admin/prompts/:id/rollback/:versionId
 * Rollback to a previous version
 */
router.post('/prompts/:id/rollback/:versionId', (req, res) =>
  promptsController.rollbackToVersion(req, res)
);

export default router;
