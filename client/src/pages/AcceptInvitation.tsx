import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Building2, Check, AlertCircle, Loader2, Users } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export function AcceptInvitation() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(null);

  // Extract token and other parameters from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const inviteToken = urlParams.get('token');
    const orgId = urlParams.get('org');
    const role = urlParams.get('role');
    
    setToken(inviteToken);
    
    // Store additional parameters if available for enhanced processing
    if (orgId && role) {
      console.log(`🔗 Invitation includes team identifiers: org=${orgId}, role=${role}`);
    }
  }, []);

  // Fetch invitation details
  const { data: invitation, isLoading: loadingInvitation, error } = useQuery({
    queryKey: ['/api/invitations', token],
    queryFn: async () => {
      if (!token) throw new Error('No token provided');
      const response = await fetch(`/api/invitations/${token}`);
      if (!response.ok) {
        throw new Error('Invalid or expired invitation');
      }
      return response.json();
    },
    enabled: !!token,
    retry: false,
  });

  // Accept invitation mutation
  const acceptInvitationMutation = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error('No token provided');
      const response = await apiRequest("POST", "/api/invitations/accept", { token });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success!",
        description: "You've successfully joined the organization!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/organizations/current"] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies/team"] });
      // Redirect to dashboard
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to accept invitation",
        variant: "destructive",
      });
    },
  });

  const handleAcceptInvitation = () => {
    acceptInvitationMutation.mutate();
  };

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
            <Button onClick={() => navigate("/dashboard")} variant="outline">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadingInvitation) {
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

  if (error || !invitation) {
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
            <Button onClick={() => navigate("/dashboard")} variant="outline">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (acceptInvitationMutation.isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950 flex items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                <Check className="w-16 h-16 text-green-500 mx-auto mb-4" />
              </motion.div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Welcome to the Team!
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                You've successfully joined <strong>{invitation.invitation.organization?.companyName}</strong>.
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-500">
                Redirecting to dashboard...
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Join Team Invitation
            </h2>
          </div>

          <div className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-4 mb-6">
            <div className="text-center">
              <h3 className="font-semibold text-slate-900 dark:text-white text-lg">
                {invitation.invitation.organization?.companyName}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
                {invitation.invitation.organization?.industry}
              </p>
            </div>
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <Users className="w-4 h-4" />
              <span>Role: <strong className="capitalize">{invitation.invitation.role}</strong></span>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleAcceptInvitation}
              disabled={acceptInvitationMutation.isPending}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
            >
              {acceptInvitationMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Accepting...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Accept Invitation
                </>
              )}
            </Button>
            
            <Button
              onClick={() => navigate("/dashboard")}
              variant="outline"
              className="w-full"
            >
              Decline
            </Button>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-500 mt-4 text-center">
            This invitation expires on {new Date(invitation.invitation.expiresAt).toLocaleDateString()}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}