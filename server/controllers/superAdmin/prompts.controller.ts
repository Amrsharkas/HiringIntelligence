import { Request, Response } from 'express';
import { db } from '../../db';
import { prompts, promptVersions } from '@shared/schema';
import { eq, desc, sql, ilike, and } from 'drizzle-orm';
import {
  renderPrompt,
  getVariableSchema,
  getSampleData,
  extractVariables,
} from '../../promptTemplate';

/**
 * Super Admin Prompts Controller
 * Handles all prompt management operations for super admins
 */
export class PromptsController {
  /**
   * Get all prompts with pagination and search
   */
  async getAllPrompts(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;
      const search = req.query.search as string;
      const type = req.query.type as string;

      // Build where conditions
      const conditions = [];
      if (search && search.trim()) {
        conditions.push(ilike(prompts.name, `%${search.trim()}%`));
      }
      if (type && type.trim()) {
        conditions.push(eq(prompts.type, type.trim()));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get prompts with pagination
      const promptsList = await db
        .select()
        .from(prompts)
        .where(whereClause)
        .orderBy(desc(prompts.createdAt))
        .limit(limit)
        .offset(offset);

      // Get total count for pagination
      const countQuery = db
        .select({ count: sql<number>`count(*)::int` })
        .from(prompts);

      if (whereClause) {
        countQuery.where(whereClause);
      }

      const [countResult] = await countQuery;
      const total = countResult?.count || 0;

      res.json({
        prompts: promptsList,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Error fetching prompts:', error);
      res.status(500).json({ error: 'Failed to fetch prompts' });
    }
  }

  /**
   * Get single prompt by ID
   */
  async getPromptById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const [prompt] = await db
        .select()
        .from(prompts)
        .where(eq(prompts.id, id));

      if (!prompt) {
        return res.status(404).json({ error: 'Prompt not found' });
      }

      // Get variable schema for this prompt type
      const variableSchema = getVariableSchema(prompt.type);

      res.json({ ...prompt, variableSchema });
    } catch (error) {
      console.error('Error fetching prompt:', error);
      res.status(500).json({ error: 'Failed to fetch prompt' });
    }
  }

  /**
   * Get active default prompt by type (for use by the system)
   */
  async getActivePromptByType(req: Request, res: Response) {
    try {
      const { type } = req.params;

      // First try to get the default active prompt for this type
      let [prompt] = await db
        .select()
        .from(prompts)
        .where(and(eq(prompts.type, type), eq(prompts.isActive, true), eq(prompts.isDefault, true)))
        .limit(1);

      // If no default, get any active prompt of this type
      if (!prompt) {
        [prompt] = await db
          .select()
          .from(prompts)
          .where(and(eq(prompts.type, type), eq(prompts.isActive, true)))
          .orderBy(desc(prompts.updatedAt))
          .limit(1);
      }

      if (!prompt) {
        return res.status(404).json({ error: 'No active prompt found for this type' });
      }

      res.json(prompt);
    } catch (error) {
      console.error('Error fetching active prompt:', error);
      res.status(500).json({ error: 'Failed to fetch active prompt' });
    }
  }

  /**
   * Create a new prompt
   */
  async createPrompt(req: Request, res: Response) {
    try {
      const {
        name,
        description,
        type,
        systemPrompt,
        userPrompt,
        variables,
        modelId,
        isActive = true,
        isDefault = false,
        sortOrder = 0,
      } = req.body;

      // Validate required fields
      if (!name || !type || !systemPrompt || !userPrompt) {
        return res.status(400).json({
          error: 'Missing required fields: name, type, systemPrompt, userPrompt',
        });
      }

      // If this is set as default, unset any existing defaults for this type
      if (isDefault) {
        await db
          .update(prompts)
          .set({ isDefault: false, updatedAt: new Date() })
          .where(and(eq(prompts.type, type), eq(prompts.isDefault, true)));
      }

      const [newPrompt] = await db
        .insert(prompts)
        .values({
          name,
          description,
          type,
          systemPrompt,
          userPrompt,
          variables: variables || getVariableSchema(type),
          modelId,
          isActive,
          isDefault,
          sortOrder,
          version: 1,
        })
        .returning();

      res.status(201).json(newPrompt);
    } catch (error) {
      console.error('Error creating prompt:', error);
      res.status(500).json({ error: 'Failed to create prompt' });
    }
  }

  /**
   * Update an existing prompt (saves version history)
   */
  async updatePrompt(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const {
        name,
        description,
        type,
        systemPrompt,
        userPrompt,
        variables,
        modelId,
        isActive,
        isDefault,
        sortOrder,
        changeNote,
      } = req.body;

      // Get existing prompt
      const [existingPrompt] = await db
        .select()
        .from(prompts)
        .where(eq(prompts.id, id));

      if (!existingPrompt) {
        return res.status(404).json({ error: 'Prompt not found' });
      }

      // Save current version to history before updating
      await db.insert(promptVersions).values({
        promptId: existingPrompt.id,
        version: existingPrompt.version,
        systemPrompt: existingPrompt.systemPrompt,
        userPrompt: existingPrompt.userPrompt,
        variables: existingPrompt.variables,
        modelId: existingPrompt.modelId,
        changedBy: (req as any).user?.id || null,
        changeNote: changeNote || `Updated to version ${existingPrompt.version + 1}`,
      });

      // If this is set as default, unset any existing defaults for this type
      const promptType = type || existingPrompt.type;
      if (isDefault) {
        await db
          .update(prompts)
          .set({ isDefault: false, updatedAt: new Date() })
          .where(and(eq(prompts.type, promptType), eq(prompts.isDefault, true)));
      }

      // Build update object
      const updateData: Record<string, any> = {
        updatedAt: new Date(),
        version: existingPrompt.version + 1,
      };

      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (type !== undefined) updateData.type = type;
      if (systemPrompt !== undefined) updateData.systemPrompt = systemPrompt;
      if (userPrompt !== undefined) updateData.userPrompt = userPrompt;
      if (variables !== undefined) updateData.variables = variables;
      if (modelId !== undefined) updateData.modelId = modelId;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (isDefault !== undefined) updateData.isDefault = isDefault;
      if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

      const [updated] = await db
        .update(prompts)
        .set(updateData)
        .where(eq(prompts.id, id))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error('Error updating prompt:', error);
      res.status(500).json({ error: 'Failed to update prompt' });
    }
  }

  /**
   * Delete a prompt (soft delete if active, hard delete if inactive)
   */
  async deletePrompt(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const [existingPrompt] = await db
        .select()
        .from(prompts)
        .where(eq(prompts.id, id));

      if (!existingPrompt) {
        return res.status(404).json({ error: 'Prompt not found' });
      }

      if (existingPrompt.isActive) {
        // Soft delete - just deactivate
        await db
          .update(prompts)
          .set({ isActive: false, isDefault: false, updatedAt: new Date() })
          .where(eq(prompts.id, id));
        res.json({ message: 'Prompt deactivated', id });
      } else {
        // Hard delete - remove from database
        await db.delete(promptVersions).where(eq(promptVersions.promptId, id));
        await db.delete(prompts).where(eq(prompts.id, id));
        res.json({ message: 'Prompt deleted', id });
      }
    } catch (error) {
      console.error('Error deleting prompt:', error);
      res.status(500).json({ error: 'Failed to delete prompt' });
    }
  }

  /**
   * Duplicate an existing prompt
   */
  async duplicatePrompt(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const [existingPrompt] = await db
        .select()
        .from(prompts)
        .where(eq(prompts.id, id));

      if (!existingPrompt) {
        return res.status(404).json({ error: 'Prompt not found' });
      }

      const [duplicated] = await db
        .insert(prompts)
        .values({
          name: `${existingPrompt.name} (Copy)`,
          description: existingPrompt.description,
          type: existingPrompt.type,
          systemPrompt: existingPrompt.systemPrompt,
          userPrompt: existingPrompt.userPrompt,
          variables: existingPrompt.variables,
          modelId: existingPrompt.modelId,
          isActive: false,
          isDefault: false,
          sortOrder: existingPrompt.sortOrder,
          version: 1,
        })
        .returning();

      res.status(201).json(duplicated);
    } catch (error) {
      console.error('Error duplicating prompt:', error);
      res.status(500).json({ error: 'Failed to duplicate prompt' });
    }
  }

  /**
   * Set a prompt as the default for its type
   */
  async setDefaultPrompt(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const [existingPrompt] = await db
        .select()
        .from(prompts)
        .where(eq(prompts.id, id));

      if (!existingPrompt) {
        return res.status(404).json({ error: 'Prompt not found' });
      }

      // Unset any existing defaults for this type
      await db
        .update(prompts)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(eq(prompts.type, existingPrompt.type));

      // Set this prompt as default and ensure it's active
      const [updated] = await db
        .update(prompts)
        .set({ isDefault: true, isActive: true, updatedAt: new Date() })
        .where(eq(prompts.id, id))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error('Error setting default prompt:', error);
      res.status(500).json({ error: 'Failed to set default prompt' });
    }
  }

  /**
   * Get version history for a prompt
   */
  async getPromptVersions(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      // Verify prompt exists
      const [existingPrompt] = await db
        .select()
        .from(prompts)
        .where(eq(prompts.id, id));

      if (!existingPrompt) {
        return res.status(404).json({ error: 'Prompt not found' });
      }

      // Get versions
      const versions = await db
        .select()
        .from(promptVersions)
        .where(eq(promptVersions.promptId, id))
        .orderBy(desc(promptVersions.version))
        .limit(limit)
        .offset(offset);

      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(promptVersions)
        .where(eq(promptVersions.promptId, id));

      const total = countResult?.count || 0;

      res.json({
        versions,
        currentVersion: existingPrompt.version,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Error fetching prompt versions:', error);
      res.status(500).json({ error: 'Failed to fetch prompt versions' });
    }
  }

  /**
   * Rollback to a previous version
   */
  async rollbackToVersion(req: Request, res: Response) {
    try {
      const { id, versionId } = req.params;

      // Get current prompt
      const [existingPrompt] = await db
        .select()
        .from(prompts)
        .where(eq(prompts.id, id));

      if (!existingPrompt) {
        return res.status(404).json({ error: 'Prompt not found' });
      }

      // Get the version to rollback to
      const [targetVersion] = await db
        .select()
        .from(promptVersions)
        .where(eq(promptVersions.id, versionId));

      if (!targetVersion) {
        return res.status(404).json({ error: 'Version not found' });
      }

      // Verify the version belongs to this prompt
      if (targetVersion.promptId !== id) {
        return res.status(400).json({ error: 'Version does not belong to this prompt' });
      }

      // Save current version to history first
      await db.insert(promptVersions).values({
        promptId: existingPrompt.id,
        version: existingPrompt.version,
        systemPrompt: existingPrompt.systemPrompt,
        userPrompt: existingPrompt.userPrompt,
        variables: existingPrompt.variables,
        modelId: existingPrompt.modelId,
        changedBy: (req as any).user?.id || null,
        changeNote: `Rollback from version ${existingPrompt.version} to version ${targetVersion.version}`,
      });

      // Update prompt with the target version's content
      const [updated] = await db
        .update(prompts)
        .set({
          systemPrompt: targetVersion.systemPrompt,
          userPrompt: targetVersion.userPrompt,
          variables: targetVersion.variables,
          modelId: targetVersion.modelId,
          version: existingPrompt.version + 1,
          updatedAt: new Date(),
        })
        .where(eq(prompts.id, id))
        .returning();

      res.json({
        message: `Rolled back to version ${targetVersion.version}`,
        prompt: updated,
      });
    } catch (error) {
      console.error('Error rolling back prompt:', error);
      res.status(500).json({ error: 'Failed to rollback prompt' });
    }
  }

  /**
   * Preview a prompt with sample data
   */
  async previewPrompt(req: Request, res: Response) {
    try {
      const { systemPrompt, userPrompt, type, customSampleData } = req.body;

      if (!systemPrompt || !userPrompt || !type) {
        return res.status(400).json({
          error: 'Missing required fields: systemPrompt, userPrompt, type',
        });
      }

      // Get sample data for this type
      const sampleData = customSampleData || getSampleData(type);

      // Render both prompts
      const renderedSystemPrompt = renderPrompt(systemPrompt, sampleData);
      const renderedUserPrompt = renderPrompt(userPrompt, sampleData);

      // Extract variables used in templates
      const systemVariables = extractVariables(systemPrompt);
      const userVariables = extractVariables(userPrompt);

      res.json({
        renderedSystemPrompt,
        renderedUserPrompt,
        sampleDataUsed: sampleData,
        variablesInSystemPrompt: systemVariables,
        variablesInUserPrompt: userVariables,
        variableSchema: getVariableSchema(type),
      });
    } catch (error) {
      console.error('Error previewing prompt:', error);
      res.status(500).json({ error: 'Failed to preview prompt' });
    }
  }

  /**
   * Get available prompt types
   */
  async getPromptTypes(_req: Request, res: Response) {
    try {
      res.json({
        types: [
          {
            value: 'job_scoring',
            label: 'Job Scoring',
            description: 'Score candidates against job requirements',
          },
          {
            value: 'resume_parsing',
            label: 'Resume Parsing',
            description: 'Extract structured data from resumes',
          },
        ],
      });
    } catch (error) {
      console.error('Error fetching prompt types:', error);
      res.status(500).json({ error: 'Failed to fetch prompt types' });
    }
  }
}

// Export singleton instance
export const promptsController = new PromptsController();
