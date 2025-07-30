import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { onAuthStateChange, createUserProfile, getUserProfile, getIdToken } from '@/lib/firebase';
import type { UserProfile } from '@/lib/firebase';

interface AuthState {
  user: User | null;
  userProfile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useFirebaseAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    userProfile: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (user) => {
      if (user) {
        try {
          // Create or get user profile from Firestore
          const userProfile = await createUserProfile(user);
          
          setAuthState({
            user,
            userProfile,
            isLoading: false,
            isAuthenticated: true,
          });
        } catch (error) {
          console.error('Error creating/fetching user profile:', error);
          setAuthState({
            user,
            userProfile: null,
            isLoading: false,
            isAuthenticated: true,
          });
        }
      } else {
        setAuthState({
          user: null,
          userProfile: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    });

    return () => unsubscribe();
  }, []);

  // Function to get auth header for API calls
  const getAuthHeader = async (): Promise<{ Authorization: string } | {}> => {
    const token = await getIdToken();
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    return {};
  };

  return {
    ...authState,
    getAuthHeader,
  };
}