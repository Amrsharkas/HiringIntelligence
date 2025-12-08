import { Request, Response } from 'express';
import { db } from '../../db';
import { organizations, users } from '@shared/schema';
import { eq, desc, sql, ilike } from 'drizzle-orm';
import { creditService, CreditType } from '../../creditService';

/**
 * Super Admin Organizations Controller
 * Handles all organization management operations for super admins
 */
export class OrganizationsController {
  /**
   * Get all organizations with pagination and search
   */
  async getAllOrganizations(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;
      const search = req.query.search as string;

      // Build base query
      let whereClause = undefined;
      if (search && search.trim()) {
        whereClause = ilike(organizations.companyName, `%${search.trim()}%`);
      }

      // Get organizations with pagination
      const orgs = await db
        .select()
        .from(organizations)
        .where(whereClause)
        .orderBy(desc(organizations.createdAt))
        .limit(limit)
        .offset(offset);

      // Get total count for pagination
      const countQuery = db
        .select({ count: sql<number>`count(*)::int` })
        .from(organizations);

      if (whereClause) {
        countQuery.where(whereClause);
      }

      const [countResult] = await countQuery;
      const total = countResult?.count || 0;

      res.json({
        organizations: orgs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error fetching organizations:', error);
      res.status(500).json({ error: 'Failed to fetch organizations' });
    }
  }

  /**
   * Get single organization by ID with owner details
   */
  async getOrganizationById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, id));

      if (!org) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      // Get owner details if ownerId exists
      let owner = null;
      if (org.ownerId) {
        const [ownerData] = await db
          .select({
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName
          })
          .from(users)
          .where(eq(users.id, org.ownerId));
        owner = ownerData || null;
      }

      res.json({ ...org, owner });
    } catch (error) {
      console.error('Error fetching organization:', error);
      res.status(500).json({ error: 'Failed to fetch organization' });
    }
  }

  /**
   * Update organization details
   */
  async updateOrganization(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { companyName, industry, companySize, description } = req.body;

      // Check if organization exists
      const [existingOrg] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, id));

      if (!existingOrg) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      // Build update object with only provided fields
      const updateData: Record<string, any> = {
        updatedAt: new Date()
      };

      if (companyName !== undefined) updateData.companyName = companyName;
      if (industry !== undefined) updateData.industry = industry;
      if (companySize !== undefined) updateData.companySize = companySize;
      if (description !== undefined) updateData.description = description;

      const [updated] = await db
        .update(organizations)
        .set(updateData)
        .where(eq(organizations.id, id))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error('Error updating organization:', error);
      res.status(500).json({ error: 'Failed to update organization' });
    }
  }

  /**
   * Add credits to organization (CV Processing or Interview)
   */
  async addCredits(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { amount, creditType, description } = req.body;

      // Validate credit type
      if (!['cv_processing', 'interview'].includes(creditType)) {
        return res.status(400).json({
          error: 'Invalid credit type',
          message: 'Credit type must be "cv_processing" or "interview"'
        });
      }

      // Validate amount
      if (!amount || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({
          error: 'Invalid amount',
          message: 'Amount must be a positive number'
        });
      }

      // Check organization exists
      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, id));

      if (!org) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      // Get admin user info for description
      const adminUser = req.user as any;
      const creditDescription = description ||
        `Manual credit addition by super admin (${adminUser.email})`;

      // Add credits using creditService
      await creditService.addCredits(
        id,
        amount,
        creditType as CreditType,
        creditDescription,
        'manual_adjustment'
      );

      // Get updated balance
      const balance = await creditService.getCreditBalance(id);

      res.json({
        message: `Successfully added ${amount} ${creditType === 'cv_processing' ? 'CV Processing' : 'Interview'} credits`,
        balance
      });
    } catch (error) {
      console.error('Error adding credits:', error);
      res.status(500).json({ error: 'Failed to add credits' });
    }
  }

  /**
   * Get credit history for an organization
   */
  async getCreditHistory(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;

      // Check organization exists
      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, id));

      if (!org) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      const history = await creditService.getCreditHistory(id, limit);

      res.json(history);
    } catch (error) {
      console.error('Error fetching credit history:', error);
      res.status(500).json({ error: 'Failed to fetch credit history' });
    }
  }
}

// Export singleton instance
export const organizationsController = new OrganizationsController();
