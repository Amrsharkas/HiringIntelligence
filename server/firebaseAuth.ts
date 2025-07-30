import { Request, Response, NextFunction } from 'express';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email: string;
        name?: string;
      };
    }
  }
}

// Middleware to verify Firebase token
export const verifyFirebaseToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const token = authHeader.split('Bearer ')[1];
    
    // For development - accept any token that looks like a Firebase UID
    if (token && token.length > 10) {
      req.user = {
        uid: token,
        email: 'firebase-user@example.com',
        name: 'Firebase User'
      };
      next();
    } else {
      return res.status(401).json({ message: 'Invalid token' });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Authentication failed' });
  }
};

// Simple middleware that accepts any request (for testing)
export const mockAuth = (req: Request, res: Response, next: NextFunction) => {
  // For now, create a mock user for all requests
  req.user = {
    uid: 'firebase-user-' + Date.now(),
    email: 'user@example.com',
    name: 'Firebase User'
  };
  next();
};