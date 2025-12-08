import { Request, Response } from 'express';
import { db } from '../../db';
import { users, organizations } from '@shared/schema';
import { eq, desc, sql, ilike, or } from 'drizzle-orm';

/**
 * Super Admin Users Controller
 * Handles all user management operations for super admins
 */
export class UsersController {
  /**
   * Get all users with pagination and search
   */
  async getAllUsers(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;
      const search = req.query.search as string;

      // Build search clause
      let whereClause = undefined;
      if (search && search.trim()) {
        const searchTerm = `%${search.trim()}%`;
        whereClause = or(
          ilike(users.email, searchTerm),
          ilike(users.firstName, searchTerm),
          ilike(users.lastName, searchTerm)
        );
      }

      // Get users with pagination
      const usersList = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          isVerified: users.isVerified,
          isSuperAdmin: users.isSuperAdmin,
          authProvider: users.authProvider,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .where(whereClause)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset);

      // Get total count for pagination
      const countQuery = db
        .select({ count: sql<number>`count(*)::int` })
        .from(users);

      if (whereClause) {
        countQuery.where(whereClause);
      }

      const [countResult] = await countQuery;
      const total = countResult?.count || 0;

      res.json({
        users: usersList,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  }

  /**
   * Get single user by ID with organization details
   */
  async getUserById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          isVerified: users.isVerified,
          isSuperAdmin: users.isSuperAdmin,
          authProvider: users.authProvider,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .where(eq(users.id, id));

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get organizations owned by this user
      const ownedOrgs = await db
        .select({
          id: organizations.id,
          companyName: organizations.companyName,
          url: organizations.url,
        })
        .from(organizations)
        .where(eq(organizations.ownerId, id));

      res.json({ ...user, organizations: ownedOrgs });
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  }

  /**
   * Update user details
   */
  async updateUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { firstName, lastName, role, isVerified, isSuperAdmin } = req.body;

      // Check if user exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, id));

      if (!existingUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Prevent removing super admin status from yourself
      const adminUser = req.user as any;
      if (adminUser.id === id && isSuperAdmin === false) {
        return res.status(400).json({
          error: 'Cannot remove super admin status from yourself'
        });
      }

      // Build update object with only provided fields
      const updateData: Record<string, any> = {
        updatedAt: new Date()
      };

      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (role !== undefined) updateData.role = role;
      if (isVerified !== undefined) updateData.isVerified = isVerified;
      if (isSuperAdmin !== undefined) updateData.isSuperAdmin = isSuperAdmin;

      const [updated] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, id))
        .returning({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          isVerified: users.isVerified,
          isSuperAdmin: users.isSuperAdmin,
          authProvider: users.authProvider,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        });

      res.json(updated);
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  }

  /**
   * Toggle user's super admin status
   */
  async toggleSuperAdmin(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Check if user exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, id));

      if (!existingUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Prevent removing super admin status from yourself
      const adminUser = req.user as any;
      if (adminUser.id === id && existingUser.isSuperAdmin) {
        return res.status(400).json({
          error: 'Cannot remove super admin status from yourself'
        });
      }

      const [updated] = await db
        .update(users)
        .set({
          isSuperAdmin: !existingUser.isSuperAdmin,
          updatedAt: new Date()
        })
        .where(eq(users.id, id))
        .returning({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          isVerified: users.isVerified,
          isSuperAdmin: users.isSuperAdmin,
          authProvider: users.authProvider,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        });

      res.json({
        message: `User ${updated.isSuperAdmin ? 'promoted to' : 'demoted from'} super admin`,
        user: updated
      });
    } catch (error) {
      console.error('Error toggling super admin status:', error);
      res.status(500).json({ error: 'Failed to toggle super admin status' });
    }
  }

  /**
   * Toggle user's verified status
   */
  async toggleVerified(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Check if user exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, id));

      if (!existingUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      const [updated] = await db
        .update(users)
        .set({
          isVerified: !existingUser.isVerified,
          updatedAt: new Date()
        })
        .where(eq(users.id, id))
        .returning({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          isVerified: users.isVerified,
          isSuperAdmin: users.isSuperAdmin,
          authProvider: users.authProvider,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        });

      res.json({
        message: `User email ${updated.isVerified ? 'verified' : 'unverified'}`,
        user: updated
      });
    } catch (error) {
      console.error('Error toggling verified status:', error);
      res.status(500).json({ error: 'Failed to toggle verified status' });
    }
  }
}

// Export singleton instance
export const usersController = new UsersController();
