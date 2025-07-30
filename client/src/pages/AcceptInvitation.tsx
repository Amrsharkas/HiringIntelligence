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
  const [processingInvite, setProcessingInvite] = useState(false);

  // Parse URL parameters with better handling
  const urlParts = location.split('?');
  const searchParams = new URLSearchParams(urlParts[1] || '');
  const token = searchParams.get('token');
  const org = searchParams.get('org');
  const role = searchParams.get('role');

  // Store invite parameters for after authentication
  useEffect(() => {
    if (token && org && role) {
      localStorage.setItem('pendingInvite', JSON.stringify({
        token,
        org,
        role,
        timestamp: Date.now()
      }));
    }
  }, [token, org, role]);

  // Check authentication status and handle invite flow
  useEffect(() => {
    const checkAuthAndProcessInvite = async () => {
      try {
        const response = await fetch('/api/auth/user');
        if (response.ok) {
          const user = await response.json();
          setAuthState({ isAuthenticated: true, isLoading: false, user });
          
          // If user is authenticated and we have invite params, process automatically
          if (token && org && role) {
            await processInviteAcceptance();
          }
        } else {
          setAuthState({ isAuthenticated: false, isLoading: false, user: null });
          
          // If not authenticated but has invite params, redirect to login
          if (token && org && role) {
            setTimeout(() => {
              window.location.href = '/api/login';
            }, 1000);
          } else {
            setInvitationError('No invitation parameters found');
            setInvitationLoading(false);
          }
        }
      } catch (error) {
        setAuthState({ isAuthenticated: false, isLoading: false, user: null });
        setInvitationError('Failed to check authentication status');
        setInvitationLoading(false);
      }
    };
    
    checkAuthAndProcessInvite();
  }, []);

  const processInviteAcceptance = async () => {
    if (!token) return;
    
    setProcessingInvite(true);
    try {
      // First validate the invitation
      const inviteResponse = await fetch(`/api/invitations/public/${token}`);
      if (!inviteResponse.ok) {
        throw new Error('Invalid or expired invitation');
      }
      
      const inviteData = await inviteResponse.json();
      setInvitation(inviteData);
      
      // Auto-accept the invitation
      const acceptResponse = await apiRequest("POST", "/api/invitations/accept", { token });
      const result = await acceptResponse.json();
      
      // Clear stored invite
      localStorage.removeItem('pendingInvite');
      
      toast({
        title: "Welcome to the team!",
        description: `You've successfully joined ${inviteData.invitation.organization.companyName}!`,
      });
      
      // Invalidate queries and redirect
      queryClient.invalidateQueries({ queryKey: ["/api/organizations/current"] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies/team"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      setTimeout(() => {
        setLocation("/");
      }, 2500);
      
    } catch (error: any) {
      console.error('Error processing invitation:', error);
      setInvitationError(error.message || 'Failed to process invitation');
      
      toast({
        title: "Error",
        description: error.message || 'Failed to accept invitation',
        variant: "destructive",
      });
    }
    
    setProcessingInvite(false);
    setInvitationLoading(false);
  };

  // Handle pending invites from localStorage after authentication
  useEffect(() => {
    const handlePendingInvite = async () => {
      if (authState.isAuthenticated && !authState.isLoading) {
        const pendingInvite = localStorage.getItem('pendingInvite');
        if (pendingInvite) {
          try {
            const inviteData = JSON.parse(pendingInvite);
            // Check if invite is recent (within 1 hour)
            if (Date.now() - inviteData.timestamp < 3600000) {
              // Process the stored invitation
              await processStoredInvite(inviteData);
            } else {
              localStorage.removeItem('pendingInvite');
            }
          } catch (error) {
            localStorage.removeItem('pendingInvite');
          }
        }
      }
    };
    
    handlePendingInvite();
  }, [authState.isAuthenticated, authState.isLoading]);

  const processStoredInvite = async (inviteData: any) => {
    setProcessingInvite(true);
    try {
      const acceptResponse = await apiRequest("POST", "/api/invitations/accept", { 
        token: inviteData.token 
      });
      const result = await acceptResponse.json();
      
      localStorage.removeItem('pendingInvite');
      
      toast({
        title: "Welcome to the team!",
        description: result.message || "You've successfully joined the organization!",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/organizations/current"] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies/team"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      setTimeout(() => {
        setLocation("/");
      }, 2500);
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || 'Failed to accept invitation',
        variant: "destructive",
      });
    }
    setProcessingInvite(false);
  };

  // Manual accept invitation (for when user needs to manually trigger)
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
      localStorage.removeItem('pendingInvite');
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

  // No token provided
  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-semibold mb-2">Invalid Invitation</h2>
            <p className="text-gray-600 mb-6">
              The invitation link appears to be invalid or incomplete.
            </p>
            <Button onClick={() => setLocation("/")} className="w-full">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show different states based on authentication and processing
  if (authState.isLoading || (invitationLoading && !invitationError)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <h2 className="text-xl font-semibold mb-2">
              {processingInvite ? 'Joining Team' : 'Processing Invitation'}
            </h2>
            <p className="text-gray-600">
              {processingInvite 
                ? 'Adding you to the team...' 
                : !authState.isAuthenticated 
                  ? 'Redirecting to sign in...'
                  : 'Please wait while we verify your invitation...'
              }
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show redirect message for unauthenticated users
  if (!authState.isAuthenticated && token && org && role) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-blue-600" />
            <h2 className="text-xl font-semibold mb-2">Team Invitation</h2>
            <p className="text-gray-600 mb-6">
              You need to sign in to accept this team invitation. Redirecting you now...
            </p>
            <div className="space-y-3">
              <Button 
                onClick={() => window.location.href = '/api/login'}
                className="w-full"
              >
                Sign In to Join Team
              </Button>
              <p className="text-sm text-gray-500">
                Don't have an account? You'll be able to create one after clicking above.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state
  if (invitationError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-semibold mb-2">Invalid Invitation</h2>
            <p className="text-gray-600 mb-6">
              {invitationError === 'No invitation parameters found' 
                ? 'The invitation link appears to be invalid or incomplete.'
                : invitationError
              }
            </p>
            <div className="space-y-3">
              <Button 
                onClick={() => setLocation("/")}
                className="w-full"
              >
                Go to Dashboard
              </Button>
              <p className="text-sm text-gray-500">
                Please contact the team admin for a new invitation.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state (invitation accepted)
  if (invitation && !processingInvite) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
            <h2 className="text-xl font-semibold mb-2">Welcome to the team!</h2>
            <p className="text-gray-600 mb-6">
              You've successfully joined {invitation.invitation?.organization?.companyName}. 
              Redirecting you to the dashboard...
            </p>
            <Button 
              onClick={() => setLocation("/")}
              className="w-full"
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fallback - should not reach here
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold mb-2">Invitation Not Found</h2>
          <p className="text-gray-600 mb-6">
            This invitation has expired, been used already, or is invalid.
          </p>
          <Button onClick={() => setLocation("/")} className="w-full">
            Go to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}