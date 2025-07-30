import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import type { Request, Response, NextFunction } from 'express';

// Initialize Firebase Admin (only if not already initialized)
let adminAuth: any = null;
let adminDb: any = null;

try {
  if (!getApps().length) {
    // Initialize with environment variables if available
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) : null;
    
    if (serviceAccount) {
      initializeApp({
        credential: cert(serviceAccount),
        projectId: "plato-244d4"
      });
      adminAuth = getAuth();
      adminDb = getFirestore();
      console.log('✅ Firebase Admin initialized successfully');
    } else {
      // For development without service account, we'll skip Firebase Admin
      console.log('⚠️  Firebase Admin not configured. Please provide FIREBASE_SERVICE_ACCOUNT environment variable.');
      console.log('Authentication will be bypassed for development.');
    }
  } else {
    adminAuth = getAuth();
    adminDb = getFirestore();
  }
} catch (error) {
  console.error('Firebase Admin initialization error:', error);
  console.log('⚠️  Running without Firebase Admin authentication.');
}

export { adminAuth, adminDb };

// Middleware to verify Firebase ID tokens
export const verifyFirebaseToken = async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
  try {
    // If Firebase Admin is not configured, bypass authentication for development
    if (!adminAuth) {
      console.log('⚠️  Bypassing authentication - Firebase Admin not configured');
      req.user = {
        uid: 'dev-user-123',
        email: 'dev@example.com',
        name: 'Development User',
        picture: null
      };
      return next();
    }

    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }
    
    const idToken = authHeader.split('Bearer ')[1];
    
    // Verify the ID token
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    req.user = decodedToken;
    
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Helper function to get user from Firestore
export const getFirebaseUser = async (uid: string) => {
  try {
    if (!adminDb) {
      console.log('⚠️  Firebase Admin not configured, skipping Firestore query');
      return null;
    }
    
    const userDoc = await adminDb.collection('users').doc(uid).get();
    if (userDoc.exists) {
      return userDoc.data();
    }
    return null;
  } catch (error) {
    console.error('Error fetching user from Firestore:', error);
    return null;
  }
};