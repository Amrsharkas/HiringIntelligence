import React, { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User, LoginData, RegisterData } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<{ message: string; user: User }, Error, RegisterData>;
  resendVerificationMutation: UseMutationResult<{ message: string }, Error, { email: string }>;
  requestPasswordResetMutation: UseMutationResult<{ message: string }, Error, { email: string }>;
  resetPasswordMutation: UseMutationResult<{ message: string }, Error, { token: string; password: string }>;
  verifyResetTokenMutation: UseMutationResult<{ message: string; email: string; firstName: string }, Error, string>;
  signInWithGoogle: () => void;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | undefined, Error>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 30000,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      const data = await res.json();

      // Check if verification is required
      if (res.status === 403 && data.requiresVerification) {
        // Store email for resend verification form
        if (data.email && typeof window !== 'undefined') {
          localStorage.setItem('pending_verification_email', data.email);
        }

        // Show custom error and redirect to verification page
        toast({
          title: "Email Verification Required",
          description: data.message,
          variant: "destructive",
        });

        // Redirect to verification pending page after a short delay
        setTimeout(() => {
          window.location.href = '/verification-pending';
        }, 1000);

        throw new Error(data.message);
      }

      return data;
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/auth/user"], user);
      toast({
        title: "Login successful!",
        description: "Welcome back to Plato Hiring.",
      });

      // Redirect to hiring dashboard after successful login
      setTimeout(() => {
        window.location.href = '/hiring/overview';
      }, 500);
    },
    onError: (error: Error) => {
      // Don't show duplicate toast for verification errors (handled above)
      if (!error.message.includes("Email verification required")) {
        toast({
          title: "Login failed",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: RegisterData) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      return await res.json();
    },
    onSuccess: (response: { message: string; user: User }) => {
      // Don't automatically log in user - they need to verify email first
      toast({
        title: "Registration successful!",
        description: response.message,
      });

      // Redirect to verification pending page
      setTimeout(() => {
        window.location.href = '/verification-pending';
      }, 1000);
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resendVerificationMutation = useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      const res = await apiRequest("POST", "/api/resend-verification", { email });
      return await res.json();
    },
    onSuccess: (response: { message: string }) => {
      toast({
        title: "Verification email sent!",
        description: response.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to resend verification",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const requestPasswordResetMutation = useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      const res = await apiRequest("POST", "/api/request-password-reset", { email });
      return await res.json();
    },
    onSuccess: (response: { message: string }) => {
      toast({
        title: "Reset Email Sent",
        description: response.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Send Reset Email",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ token, password }: { token: string; password: string }) => {
      const res = await apiRequest("POST", "/api/reset-password", { token, password });
      return await res.json();
    },
    onSuccess: (response: { message: string }) => {
      toast({
        title: "Password Reset Successful",
        description: response.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Password Reset Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const verifyResetTokenMutation = useMutation({
    mutationFn: async (token: string) => {
      const res = await apiRequest("GET", `/api/verify-reset-token/${token}`);
      return await res.json();
    },
    onError: (error: Error) => {
      toast({
        title: "Invalid Reset Link",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      // Clear all React Query cache
      queryClient.clear();

      // Clear any local storage items if they exist
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }

      console.log("✅ Logout successful, redirecting to homepage");

      // Force immediate navigation to homepage
      window.location.href = '/';
    },
    onError: (error: Error) => {
      console.error("Logout failed:", error);
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const signInWithGoogle = () => {
    // Redirect to Google OAuth endpoint
    window.location.href = '/auth/google';
  };

  const contextValue: AuthContextType = {
    user: user ?? null,
    isLoading,
    error,
    isAuthenticated: !!user,
    isEmailVerified: user?.isVerified ?? false,
    loginMutation,
    logoutMutation,
    registerMutation,
    resendVerificationMutation,
    requestPasswordResetMutation,
    resetPasswordMutation,
    verifyResetTokenMutation,
    signInWithGoogle,
  };

  return React.createElement(
    AuthContext.Provider,
    { value: contextValue },
    children
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}