import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
  updateProfile
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  serverTimestamp,
  Timestamp 
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAQxw4NLTDlKzmR2SGRIPZ1qWniXnXYumY",
  authDomain: "plato-244d4.firebaseapp.com",
  projectId: "plato-244d4",
  storageBucket: "plato-244d4.firebasestorage.app",
  messagingSenderId: "324792740330",
  appId: "1:324792740330:web:a689e8cd84d64e6b88aa93",
  measurementId: "G-QY3LZMQBS0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

// Auth functions
export const signInWithEmail = async (email: string, password: string) => {
  return await signInWithEmailAndPassword(auth, email, password);
};

export const signUpWithEmail = async (email: string, password: string, displayName?: string) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  
  // Update profile with display name if provided
  if (displayName && userCredential.user) {
    await updateProfile(userCredential.user, { displayName });
  }
  
  return userCredential;
};

export const signInWithGoogle = async () => {
  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (error: any) {
    // Handle specific Google Sign-In errors
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('Sign-in was cancelled');
    } else if (error.code === 'auth/popup-blocked') {
      throw new Error('Pop-up was blocked by browser. Please allow pop-ups and try again');
    } else {
      console.error('Google Sign-In error:', error);
      throw new Error('Google Sign-In failed. Please try again or contact support if the issue persists');
    }
  }
};

export const logout = async () => {
  return await signOut(auth);
};

// Auth state observer
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// User data management in Firestore
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export const createUserProfile = async (user: User): Promise<UserProfile> => {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    const userProfile: UserProfile = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName,
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
    };
    
    await setDoc(userRef, userProfile);
    return userProfile;
  }
  
  return userSnap.data() as UserProfile;
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    return userSnap.data() as UserProfile;
  }
  
  return null;
};

// Get Firebase ID token for API calls
export const getIdToken = async (): Promise<string | null> => {
  const user = auth.currentUser;
  if (user) {
    return await user.getIdToken();
  }
  return null;
};