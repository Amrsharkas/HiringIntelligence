import { Request, Response, NextFunction } from 'express';
import { User } from '@shared/schema';

/**
 * Middleware to check if the current user is a Super Admin.
 * Requires the user to be:
 * 1. Authenticated
 * 2. Email verified
 * 3. Have isSuperAdmin flag set to true
 */
export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  // Check if user is authenticated
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({
      error: "Authentication required",
      message: "Please log in to access this resource."
    });
  }

  const user = req.user as User;

  // Check if user is verified
  if (!user.isVerified) {
    return res.status(403).json({
      error: "Email verification required",
      message: "Please verify your email address to access this feature."
    });
  }

  // Check if user is a super admin
  if (!user.isSuperAdmin) {
    return res.status(403).json({
      error: "Access denied",
      message: "Super admin privileges required to access this resource."
    });
  }

  next();
};
