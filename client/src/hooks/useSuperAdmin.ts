import { useAuth } from './useAuth';

/**
 * Hook to check if the current user is a Super Admin
 * Returns the super admin status along with loading state
 */
export function useSuperAdmin() {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Check if user has super admin privileges
  const isSuperAdmin = isAuthenticated && user?.isSuperAdmin === true;

  return {
    isSuperAdmin,
    isLoading,
    user
  };
}
