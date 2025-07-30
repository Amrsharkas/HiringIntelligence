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

// Simple middleware that accepts any request and creates/finds user in database
export const mockAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // For Firebase auth, create a consistent user ID based on token
    const authToken = req.headers.authorization?.split('Bearer ')[1];
    // Use a consistent base ID for testing
    const userId = authToken ? `firebase-user-${authToken.slice(0, 8)}` : `firebase-user-default`;
    const email = `user-${authToken?.slice(0, 8) || 'default'}@firebase.com`;
    
    req.user = {
      uid: userId,
      email: email,
      name: 'Firebase User'
    };

    // Import storage dynamically to avoid circular dependency
    const { storage } = await import('./storage');
    
    console.log(`Auth: Checking user ${userId} with email ${email}`);
    
    // Check if user exists, if not create them
    let existingUser = await storage.getUserByEmail(email);
    if (!existingUser) {
      console.log(`Creating new user: ${userId}`);
      await storage.createUser({
        id: userId,
        email: email,
        firstName: 'Firebase',
        lastName: 'User',
        role: 'employer'
      });
      existingUser = await storage.getUserByEmail(email);
      console.log(`Created user:`, existingUser);
    } else {
      console.log(`Found existing user:`, existingUser);
    }
    
    next();
  } catch (error) {
    console.error('Mock auth error:', error);
    // Continue anyway for development
    req.user = {
      uid: 'firebase-user-fallback',
      email: 'fallback@example.com',
      name: 'Fallback User'
    };
    next();
  }
};