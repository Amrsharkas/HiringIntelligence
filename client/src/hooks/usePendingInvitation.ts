import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export function usePendingInvitation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Automatically process pending invitations when user is authenticated
  const processPendingInvitation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/process-pending-invitation", {});
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success && data.organizationId) {
        toast({
          title: "Welcome to the team!",
          description: `You've been automatically added as a ${data.role}.`,
        });
        
        // Refresh organization and team data
        queryClient.invalidateQueries({ queryKey: ["/api/organizations/current"] });
        queryClient.invalidateQueries({ queryKey: ["/api/companies/team"] });
      }
    },
    onError: (error: any) => {
      // Only show error if it's a real error, not just "no pending invitation"
      if (error.message && !error.message.includes("No pending invitation")) {
        toast({
          title: "Team joining failed",
          description: error.message || "Failed to join team automatically",
          variant: "destructive",
        });
      }
    },
  });

  return {
    processPendingInvitation: processPendingInvitation.mutate,
    isProcessing: processPendingInvitation.isPending,
  };
}