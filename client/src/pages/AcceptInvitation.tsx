import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Loader2, CheckCircle, Users, Building } from "lucide-react";
import { motion } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";

export function AcceptInvitation() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [authState, setAuthState] = useState({ isAuthenticated: false, isLoading: true, user: null });
  const [invitation, setInvitation] = useState<any>(null);
  const [invitationLoading, setInvitationLoading] = useState(true);
  const [invitationError, setInvitationError] = useState<string | null>(null);

  // Parse URL parameters - handle both query params and potential URL encoding issues
  const urlParts = location.split('?');
  const searchParams = new URLSearchParams(urlParts[1] || '');
  let token = searchParams.get('token');
  const org = searchParams.get('org');
  const role = searchParams.get('role');

  // Clean up token if it has extra parameters appended
  if (token && token.includes('&')) {
    token = token.split('&')[0];
  }

  // Check authentication status once
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/user');
        if (response.ok) {
          const user = await response.json();
          setAuthState({ isAuthenticated: true, isLoading: false, user });
        } else {
          setAuthState({ isAuthenticated: false, isLoading: false, user: null });
        }
      } catch (error) {
        setAuthState({ isAuthenticated: false, isLoading: false, user: null });
      }
    };
    
    checkAuth();
  }, []);

  // Fetch invitation details
  useEffect(() => {
    const fetchInvitation = async () => {
      if (!token) {
        setInvitationError('No invitation token provided');
        setInvitationLoading(false);
        return;
      }

      try {
        console.log(`🔍 Fetching invitation for token: ${token}`);
        const response = await fetch(`/api/invitations/public/${token}`);
        console.log(`📡 Response status: ${response.status}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Error response: ${errorText}`);
          throw new Error('Invalid or expired invitation');
        }
        
        const data = await response.json();
        console.log(`✅ Invitation data:`, data);
        setInvitation(data);
        setInvitationLoading(false);
      } catch (error: any) {
        console.error('Error fetching invitation:', error);
        setInvitationError(error.message);
        setInvitationLoading(false);
      }
    };

    fetchInvitation();
  }, [token]);

  // Accept invitation mutation
  const acceptInvitationMutation = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error('No token provided');
      const response = await apiRequest("POST", "/api/invitations/accept", { token });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Welcome to the team!",
        description: data.message || "You've successfully joined the organization!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/organizations/current"] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies/team"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      // Clear stored invitation data
      localStorage.removeItem('pendingInvitation');
      // Redirect to dashboard
      setTimeout(() => {
        setLocation("/");
      }, 2500);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to accept invitation",
        variant: "destructive",
      });
    },
  });

  // Handle redirect to login
  const redirectToLogin = () => {
    // Store invitation details for post-authentication processing
    localStorage.setItem('pendingInvitation', JSON.stringify({
      token,
      organizationId: org,
      role
    }));
    
    // Redirect to login with invitation parameters
    window.location.href = `/api/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
  };

  // No token provided
  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              Invalid Invitation
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              The invitation link appears to be invalid or incomplete.
            </p>
            <Button onClick={() => setLocation("/dashboard")} variant="outline">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading invitation
  if (invitationLoading || authState.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Loader2 className="w-12 h-12 text-purple-600 mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              Loading Invitation...
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              Please wait while we verify your invitation.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invitation error or not found
  if (invitationError || !invitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              Invitation Not Found
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              This invitation has expired, been used already, or is invalid.
            </p>
            <Button onClick={() => setLocation("/dashboard")} variant="outline">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User is not authenticated - show login options
  if (!authState.isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card className="border-0 shadow-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <div className="mb-6">
                <Building className="w-16 h-16 text-purple-600 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  You're Invited!
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                  Join {invitation.organization?.companyName || 'the organization'} as a {role}
                </p>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <div className="flex items-center justify-center mb-2">
                    <Users className="w-5 h-5 text-slate-600 dark:text-slate-400 mr-2" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Organization Details
                    </span>
                  </div>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">
                    {invitation.organization?.companyName || 'Organization'}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Role: {role}
                  </p>
                </div>

                <div className="space-y-3">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Sign in to accept this invitation
                  </p>
                  <Button 
                    onClick={redirectToLogin}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    size="lg"
                  >
                    Sign In to Join Organization
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // User is authenticated and invitation is valid - show accept button
  if (acceptInvitationMutation.isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950 flex items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card className="border-0 shadow-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Welcome to the Team!
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                You've successfully joined {invitation?.organization?.companyName || 'the team'}
              </p>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Redirecting to dashboard...
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Show accept invitation interface for authenticated users
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-0 shadow-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            <div className="mb-6">
              <Building className="w-16 h-16 text-purple-600 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Accept Invitation
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                You've been invited to join {invitation.organization?.companyName || 'the organization'}
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <div className="flex items-center justify-center mb-2">
                  <Users className="w-5 h-5 text-slate-600 dark:text-slate-400 mr-2" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Organization Details
                  </span>
                </div>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">
                  {invitation.organization?.companyName || 'Organization'}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Role: {role}
                </p>
              </div>

              <div className="space-y-3">
                <Button 
                  onClick={() => acceptInvitationMutation.mutate()}
                  disabled={acceptInvitationMutation.isPending}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  size="lg"
                >
                  {acceptInvitationMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Joining Organization...
                    </>
                  ) : (
                    'Accept Invitation'
                  )}
                </Button>
                
                <Button 
                  onClick={() => setLocation("/dashboard")}
                  variant="outline"
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}