import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Users, UserPlus, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

const inviteCodeSchema = z.object({
  orgId: z.string().min(1, "Organization ID is required"),
  inviteCode: z.string().min(6, "Invite code must be at least 6 characters").max(8, "Invite code must be at most 8 characters"),
});

type InviteCodeFormData = z.infer<typeof inviteCodeSchema>;

interface InviteCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InviteCodeModal({ isOpen, onClose }: InviteCodeModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<InviteCodeFormData>({
    resolver: zodResolver(inviteCodeSchema),
  });

  // Accept invitation mutation
  const acceptInviteMutation = useMutation({
    mutationFn: async (data: InviteCodeFormData) => {
      console.log('🔄 Making API request to accept invite code:', data);
      const response = await apiRequest("POST", "/api/invitations/accept-code", {
        orgId: data.orgId,
        inviteCode: data.inviteCode
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      console.log('✅ Invite code accepted successfully:', data);
      setIsSuccess(true);
      
      toast({
        title: "Welcome to the team!",
        description: data?.message || "You've successfully joined the organization.",
        variant: "default",
      });

      // Refresh user data and organization info
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/organizations/current"] });
      queryClient.invalidateQueries({ queryKey: ["/api/organizations/team"] });
      
      // Close modal after a brief delay and redirect to dashboard
      setTimeout(() => {
        onClose();
        setIsSuccess(false);
        reset();
        // Redirect to dashboard as requested
        window.location.href = "/";
      }, 2000);
    },
    onError: (error) => {
      console.error('❌ Error accepting invite code:', error);
      
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      toast({
        title: "Invalid invite code",
        description: error.message || "The invite code you entered is invalid or expired.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InviteCodeFormData) => {
    acceptInviteMutation.mutate(data);
  };

  const handleClose = () => {
    if (!acceptInviteMutation.isPending) {
      reset();
      setIsSuccess(false);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md p-6 bg-white dark:bg-slate-800 rounded-xl shadow-2xl z-50"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <UserPlus className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                  Join a Team
                </h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                disabled={acceptInviteMutation.isPending}
                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {isSuccess ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-8"
              >
                <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  Welcome to the team!
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  You've successfully joined the organization. Redirecting...
                </p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="text-center mb-6">
                  <div className="mx-auto w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mb-4">
                    <Users className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  <p className="text-slate-600 dark:text-slate-400">
                    Enter the organization ID and invite code to join a team
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="orgId" className="text-slate-700 dark:text-slate-300">
                      Organization ID
                    </Label>
                    <Input
                      {...register("orgId")}
                      id="orgId"
                      type="text"
                      placeholder="2"
                      className="text-center text-lg font-mono"
                      disabled={acceptInviteMutation.isPending}
                    />
                    {errors.orgId && (
                      <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                        <AlertCircle className="h-4 w-4" />
                        {errors.orgId.message}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="inviteCode" className="text-slate-700 dark:text-slate-300">
                      Invite Code
                    </Label>
                    <Input
                      {...register("inviteCode")}
                      id="inviteCode"
                      type="text"
                      placeholder="SISUXD"
                      className="text-center text-lg font-mono tracking-wider uppercase"
                      style={{ textTransform: 'uppercase' }}
                      maxLength={8}
                      disabled={acceptInviteMutation.isPending}
                    />
                    {errors.inviteCode && (
                      <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                        <AlertCircle className="h-4 w-4" />
                        {errors.inviteCode.message}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    disabled={acceptInviteMutation.isPending}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={acceptInviteMutation.isPending}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {acceptInviteMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Joining...
                      </>
                    ) : (
                      "Join Team"
                    )}
                  </Button>
                </div>
              </form>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}