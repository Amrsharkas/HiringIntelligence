import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Settings, Users, Building2, UserPlus, Crown, Shield, Briefcase, Target, UserCheck, Mail, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

const organizationFormSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
});

type OrganizationFormData = z.infer<typeof organizationFormSchema>;

// Live team stats component
const LiveTeamStats = ({ teamMembers }: { teamMembers: any[] }) => {
  const { toast } = useToast();

  // Get live job count
  const { data: jobCounts = { active: 0 } } = useQuery<any>({
    queryKey: ["/api/job-postings/count"],
    refetchInterval: 30000, // 30 seconds
    staleTime: 0,
  });

  // Get live candidate count
  const { data: candidatesCount = { count: 0 } } = useQuery<any>({
    queryKey: ["/api/candidates/count"],
    refetchInterval: 30000,
    staleTime: 0,
  });

  // Get live interview count
  const { data: interviewsCount = { count: 0 } } = useQuery<any>({
    queryKey: ["/api/interviews/count"],
    refetchInterval: 30000,
    staleTime: 0,
  });

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
      <div className="bg-white/50 dark:bg-slate-700/50 rounded-lg p-3">
        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{teamMembers?.length || 0}</div>
        <div className="text-sm text-slate-600 dark:text-slate-400">Members</div>
      </div>
      <div className="bg-white/50 dark:bg-slate-700/50 rounded-lg p-3">
        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{jobCounts.active}</div>
        <div className="text-sm text-slate-600 dark:text-slate-400">Active Jobs</div>
      </div>
      <div className="bg-white/50 dark:bg-slate-700/50 rounded-lg p-3">
        <div className="text-2xl font-bold text-green-600 dark:text-green-400">{candidatesCount.count}</div>
        <div className="text-sm text-slate-600 dark:text-slate-400">Candidates</div>
      </div>
      <div className="bg-white/50 dark:bg-slate-700/50 rounded-lg p-3">
        <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{interviewsCount.count}</div>
        <div className="text-sm text-slate-600 dark:text-slate-400">Interviews</div>
      </div>
    </div>
  );
};

interface TeamManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TeamManagementModal({ isOpen, onClose }: TeamManagementModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);

  const form = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: {
      name: "",
    },
  });

  const { data: organization, isLoading: orgLoading } = useQuery<any>({
    queryKey: ["/api/organizations/current"],
    enabled: isOpen,
  });

  const { data: teamMembers = [], isLoading: membersLoading } = useQuery<any[]>({
    queryKey: ["/api/companies/team"],
    enabled: isOpen && !!organization,
  });

  const createOrganizationMutation = useMutation({
    mutationFn: async (data: OrganizationFormData) => {
      const response = await apiRequest("POST", "/api/organizations", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Organization created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/organizations/current"] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies/team"] });
      setIsCreatingOrg(false);
      form.reset();
    },
    onError: (error: any) => {
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
        title: "Error",
        description: "Failed to create organization. Please try again.",
        variant: "destructive",
      });
    },
  });

  const sendInvitationMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      console.log('🚀 Frontend: Sending invitation to', email, 'with role', role);
      const response = await apiRequest("POST", "/api/organizations/invite", { email, role });
      console.log('📨 Frontend: Invitation response status', response.status);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Invitation sent successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/companies/team"] });
      queryClient.invalidateQueries({ queryKey: ["/api/organizations/invitations"] });
      setShowInviteForm(false);
      setInviteEmail('');
      setInviteRole('member');
    },
    onError: (error: any) => {
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
        title: "Error",
        description: "Failed to send invitation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: OrganizationFormData) => {
    createOrganizationMutation.mutate(data);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <Crown className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />;
      case "admin":
        return <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      default:
        return <Users className="w-4 h-4 text-slate-600 dark:text-slate-400" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300";
      case "admin":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300";
      default:
        return "bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-300";
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        >
          <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <Settings className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                Team Management
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="p-6">
            {orgLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-3 text-slate-600 dark:text-slate-400">Loading organization...</span>
              </div>
            ) : !organization ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Building2 className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Create Your Organization</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
                  To start posting jobs and managing candidates, you need to create an organization first.
                </p>

                <AnimatePresence>
                  {isCreatingOrg ? (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="max-w-md mx-auto"
                    >
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="text-left">
                          <Label htmlFor="orgName">Organization Name</Label>
                          <Input
                            id="orgName"
                            {...form.register("name")}
                            placeholder="e.g., TechCorp Solutions"
                            className="mt-2"
                          />
                          {form.formState.errors.name && (
                            <p className="text-red-500 text-sm mt-1">{form.formState.errors.name.message}</p>
                          )}
                        </div>
                        <div className="flex gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsCreatingOrg(false)}
                            disabled={createOrganizationMutation.isPending}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            disabled={createOrganizationMutation.isPending}
                            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                          >
                            {createOrganizationMutation.isPending ? "Creating..." : "Create Organization"}
                          </Button>
                        </div>
                      </form>
                    </motion.div>
                  ) : (
                    <Button
                      onClick={() => setIsCreatingOrg(true)}
                      className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-semibold"
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Create Organization
                    </Button>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Organization Info */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-6 border border-purple-200/50 dark:border-purple-700/50">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 bg-purple-600 dark:bg-purple-500 rounded-2xl flex items-center justify-center">
                      <Building2 className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">{organization.name}</h3>
                      <p className="text-slate-600 dark:text-slate-400">Organization ID: {organization.id}</p>
                    </div>
                  </div>
                  <LiveTeamStats teamMembers={teamMembers} />
                </div>

                {/* Team Members */}
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Team Members
                    </h3>
                    <Button
                      onClick={() => setShowInviteForm(true)}
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Invite Member
                    </Button>
                  </div>

                  {membersLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-6 h-6 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="ml-3 text-slate-600 dark:text-slate-400">Loading team members...</span>
                    </div>
                  ) : teamMembers.length === 0 ? (
                    <div className="text-center py-8 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
                      <Users className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                      <p className="text-slate-600 dark:text-slate-400">No team members yet</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {teamMembers.map((member, index) => (
                        <motion.div
                          key={member.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 border border-slate-200/50 dark:border-slate-600/50"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {member.picture ? (
                                <img 
                                  src={member.picture} 
                                  alt={member.name || 'User'} 
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold">
                                  {member.name?.split(' ').map((n: string) => n.charAt(0)).join('') || member.email?.charAt(0).toUpperCase() || "U"}
                                </div>
                              )}
                              <div>
                                <h4 className="font-medium text-slate-900 dark:text-white">
                                  {member.name || "Team Member"}
                                </h4>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                  {member.email || "No email provided"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {getRoleIcon(member.role)}
                              <Badge className={getRoleBadgeColor(member.role)}>
                                {member.role}
                              </Badge>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Invitation Form Modal */}
                <AnimatePresence>
                  {showInviteForm && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="mt-6 p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border border-blue-200/50 dark:border-blue-700/50"
                    >
                      <div className="flex items-center justify-between mb-6">
                        <h4 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                          <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          Send Team Invitation
                        </h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowInviteForm(false)}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="inviteEmail">Email Address</Label>
                          <Input
                            id="inviteEmail"
                            type="email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="colleague@company.com"
                            className="mt-2"
                          />
                        </div>

                        <div>
                          <Label htmlFor="inviteRole">Role</Label>
                          <select
                            id="inviteRole"
                            value={inviteRole}
                            onChange={(e) => setInviteRole(e.target.value)}
                            className="mt-2 w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                          >
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>

                        <div className="flex gap-3 pt-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowInviteForm(false)}
                            disabled={sendInvitationMutation.isPending}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={() => sendInvitationMutation.mutate({ email: inviteEmail, role: inviteRole })}
                            disabled={sendInvitationMutation.isPending || !inviteEmail.trim()}
                            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                          >
                            {sendInvitationMutation.isPending ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2"></div>
                                Sending...
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4 mr-2" />
                                Send Invitation
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
