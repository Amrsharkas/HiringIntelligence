import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  // Check if we're on an invitation page to avoid aggressive retrying
  const isInvitationPage = window.location.pathname.includes('/invite/') || 
                          window.location.pathname.includes('/accept-invitation');

  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: isInvitationPage ? 0 : false, // No retries on invitation pages
    refetchOnWindowFocus: false, // Prevent aggressive refetching
    staleTime: 30000, // Cache for 30 seconds
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error
  };
}
