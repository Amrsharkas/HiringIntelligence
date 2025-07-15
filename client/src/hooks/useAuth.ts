import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    throwOnError: false, // Don't throw on 401 errors
  });

  // Debug logging
  console.log("useAuth state:", {
    user: user?.email,
    isLoading,
    isAuthenticated: !!user,
    error: error?.message
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
  };
}
