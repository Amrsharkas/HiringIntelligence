import { Request, Response } from 'express';
import { db } from '../../db';
import { creditPackages } from '@shared/schema';
import { eq, desc, sql, ilike } from 'drizzle-orm';

/**
 * Super Admin Credit Packages Controller
 * Handles all credit package management operations for super admins
 */
export class CreditPackagesController {
  /**
   * Get all credit packages with optional search
   */
  async getAllPackages(req: Request, res: Response) {
    try {
      const search = req.query.search as string;

      // Build where clause
      let whereClause = undefined;
      if (search && search.trim()) {
        whereClause = ilike(creditPackages.name, `%${search.trim()}%`);
      }

      const packages = await db
        .select()
        .from(creditPackages)
        .where(whereClause)
        .orderBy(creditPackages.creditType, creditPackages.sortOrder, desc(creditPackages.createdAt));

      res.json(packages);
    } catch (error) {
      console.error('Error fetching credit packages:', error);
      res.status(500).json({ error: 'Failed to fetch credit packages' });
    }
  }

  /**
   * Get single credit package by ID
   */
  async getPackageById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const [pkg] = await db
        .select()
        .from(creditPackages)
        .where(eq(creditPackages.id, id));

      if (!pkg) {
        return res.status(404).json({ error: 'Credit package not found' });
      }

      res.json(pkg);
    } catch (error) {
      console.error('Error fetching credit package:', error);
      res.status(500).json({ error: 'Failed to fetch credit package' });
    }
  }

  /**
   * Create a new credit package
   */
  async createPackage(req: Request, res: Response) {
    try {
      const {
        name,
        description,
        creditType,
        creditAmount,
        price,
        currency,
        stripePriceId,
        sortOrder,
        isActive
      } = req.body;

      // Validation
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Package name is required' });
      }

      const validCreditTypes = ['cv_processing', 'interview'];
      if (!creditType || !validCreditTypes.includes(creditType)) {
        return res.status(400).json({ error: 'Credit type must be cv_processing or interview' });
      }

      if (!Number.isInteger(creditAmount) || creditAmount <= 0) {
        return res.status(400).json({ error: 'Credit amount must be a positive integer' });
      }

      if (!Number.isInteger(price) || price < 0) {
        return res.status(400).json({ error: 'Price must be a non-negative integer (in cents)' });
      }

      const [newPackage] = await db
        .insert(creditPackages)
        .values({
          name: name.trim(),
          description: description || null,
          creditType,
          creditAmount,
          price,
          currency: currency || 'EGP',
          stripePriceId: stripePriceId || null,
          sortOrder: sortOrder || 0,
          isActive: isActive !== false
        })
        .returning();

      res.status(201).json(newPackage);
    } catch (error) {
      console.error('Error creating credit package:', error);
      res.status(500).json({ error: 'Failed to create credit package' });
    }
  }

  /**
   * Update credit package
   */
  async updatePackage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const {
        name,
        description,
        creditType,
        creditAmount,
        price,
        currency,
        stripePriceId,
        sortOrder,
        isActive
      } = req.body;

      // Check if package exists
      const [existingPackage] = await db
        .select()
        .from(creditPackages)
        .where(eq(creditPackages.id, id));

      if (!existingPackage) {
        return res.status(404).json({ error: 'Credit package not found' });
      }

      // Validate credit type if provided
      if (creditType !== undefined) {
        const validCreditTypes = ['cv_processing', 'interview'];
        if (!validCreditTypes.includes(creditType)) {
          return res.status(400).json({ error: 'Credit type must be cv_processing or interview' });
        }
      }

      // Validate credit amount if provided
      if (creditAmount !== undefined) {
        if (!Number.isInteger(creditAmount) || creditAmount <= 0) {
          return res.status(400).json({ error: 'Credit amount must be a positive integer' });
        }
      }

      // Validate price if provided
      if (price !== undefined) {
        if (!Number.isInteger(price) || price < 0) {
          return res.status(400).json({ error: 'Price must be a non-negative integer (in cents)' });
        }
      }

      // Build update object with only provided fields
      const updateData: Record<string, any> = {
        updatedAt: new Date()
      };

      if (name !== undefined) updateData.name = name.trim();
      if (description !== undefined) updateData.description = description;
      if (creditType !== undefined) updateData.creditType = creditType;
      if (creditAmount !== undefined) updateData.creditAmount = creditAmount;
      if (price !== undefined) updateData.price = price;
      if (currency !== undefined) updateData.currency = currency;
      if (stripePriceId !== undefined) updateData.stripePriceId = stripePriceId;
      if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
      if (isActive !== undefined) updateData.isActive = isActive;

      const [updated] = await db
        .update(creditPackages)
        .set(updateData)
        .where(eq(creditPackages.id, id))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error('Error updating credit package:', error);
      res.status(500).json({ error: 'Failed to update credit package' });
    }
  }

  /**
   * Delete credit package (soft delete)
   */
  async deletePackage(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Check if package exists
      const [existingPackage] = await db
        .select()
        .from(creditPackages)
        .where(eq(creditPackages.id, id));

      if (!existingPackage) {
        return res.status(404).json({ error: 'Credit package not found' });
      }

      // Soft delete by setting isActive to false
      await db
        .update(creditPackages)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(creditPackages.id, id));

      res.json({ message: 'Credit package deleted successfully' });
    } catch (error) {
      console.error('Error deleting credit package:', error);
      res.status(500).json({ error: 'Failed to delete credit package' });
    }
  }

  /**
   * Toggle credit package active status
   */
  async togglePackageStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Check if package exists
      const [existingPackage] = await db
        .select()
        .from(creditPackages)
        .where(eq(creditPackages.id, id));

      if (!existingPackage) {
        return res.status(404).json({ error: 'Credit package not found' });
      }

      const [updated] = await db
        .update(creditPackages)
        .set({
          isActive: !existingPackage.isActive,
          updatedAt: new Date()
        })
        .where(eq(creditPackages.id, id))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error('Error toggling package status:', error);
      res.status(500).json({ error: 'Failed to toggle package status' });
    }
  }
}

// Export singleton instance
export const creditPackagesController = new CreditPackagesController();
