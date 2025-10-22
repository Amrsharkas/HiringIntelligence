import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Mail,
  Plus,
  Trash2,
  CheckCircle,
  Loader2,
  AlertCircle,
  Copy,
  Eye,
  EyeOff,
  UserPlus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

const inviteTeamSchema = z.object({
  emails: z.array(z.string().email("Please enter a valid email address")).min(1, "At least one email is required"),
  role: z.enum(["admin", "member", "viewer"], {
    required_error: "Please select a role"
  }),
  message: z.string().optional(),
});

type InviteTeamFormData = z.infer<typeof inviteTeamSchema>;

interface InviteTeamMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface InvitationResult {
  id: number;
  email: string;
  inviteCode: string;
  role: string;
  expiresAt: Date;
}

export function InviteTeamMembersModal({ isOpen, onClose }: InviteTeamMembersModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSuccess, setIsSuccess] = useState(false);
  const [invitationResults, setInvitationResults] = useState<InvitationResult[]>([]);
  const [showInviteCodes, setShowInviteCodes] = useState<Record<string, boolean>>({});

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<InviteTeamFormData>({
    resolver: zodResolver(inviteTeamSchema),
    defaultValues: {
      emails: [""],
      role: "member",
      message: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "emails"
  });

  // Send invitations mutation
  const sendInvitationsMutation = useMutation({
    mutationFn: async (data: InviteTeamFormData) => {
      console.log('📤 Sending team invitations:', data);

      // Filter out empty emails and validate
      const validEmails = data.emails.filter(email => email.trim() !== "");

      if (validEmails.length === 0) {
        throw new Error("At least one valid email address is required");
      }

      const response = await apiRequest("POST", "/api/invitations/send", {
        emails: validEmails,
        role: data.role,
        message: data.message || "",
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      console.log('✅ Invitations sent successfully:', data);

      setIsSuccess(true);
      setInvitationResults(data.invitations || []);

      toast({
        title: "Invitations sent!",
        description: `Successfully sent ${data.invitations?.length || 0} invitation${(data.invitations?.length || 0) !== 1 ? 's' : ''}`,
        variant: "default",
      });

      // Refresh organization data
      queryClient.invalidateQueries({ queryKey: ["/api/organizations/current"] });
      queryClient.invalidateQueries({ queryKey: ["/api/organizations/team"] });
    },
    onError: (error) => {
      console.error('❌ Error sending invitations:', error);

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
        title: "Failed to send invitations",
        description: error.message || "Unable to send invitations. Please try again.",
        variant: "destructive",
      });
    },
  });

  const watchedEmails = watch("emails");
  const watchedRole = watch("role");

  const addEmailField = () => {
    append("");
  };

  const removeEmailField = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Invite code copied to clipboard",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const toggleShowInviteCode = (email: string) => {
    setShowInviteCodes(prev => ({
      ...prev,
      [email]: !prev[email]
    }));
  };

  const onSubmit = (data: InviteTeamFormData) => {
    sendInvitationsMutation.mutate(data);
  };

  const handleClose = () => {
    if (!sendInvitationsMutation.isPending) {
      reset();
      setIsSuccess(false);
      setInvitationResults([]);
      setShowInviteCodes({});
      onClose();
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case "admin":
        return "Full administrative access including managing team members, jobs, and settings";
      case "member":
        return "Can create and manage jobs, view candidates, and participate in hiring";
      case "viewer":
        return "Read-only access to view jobs, candidates, and hiring analytics";
      default:
        return "";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <UserPlus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <DialogTitle>Invite Team Members</DialogTitle>
              <DialogDescription>
                Add colleagues to your hiring team
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

            {isSuccess ? (
              <div className="space-y-6">
                <div className="text-center py-8">
                  <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                    Invitations Sent Successfully!
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    {invitationResults.length} team member{invitationResults.length !== 1 ? 's' : ''} invited
                  </p>
                </div>

                {invitationResults.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-medium text-slate-900 dark:text-white mb-3">
                      Invitation Details
                    </h4>
                    {invitationResults.map((invitation) => (
                      <Card key={invitation.id} className="dark:bg-slate-700">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                                <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div>
                                <p className="font-medium text-slate-900 dark:text-white">
                                  {invitation.email}
                                </p>
                                <p className="text-sm text-slate-600 dark:text-slate-400 capitalize">
                                  Role: {invitation.role}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                                  Invite Code:
                                </p>
                                <div className="flex items-center gap-2">
                                  <code className="bg-slate-100 dark:bg-slate-600 px-2 py-1 rounded text-sm font-mono">
                                    {showInviteCodes[invitation.email] ? invitation.inviteCode : "••••••"}
                                  </code>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleShowInviteCode(invitation.email)}
                                    className="h-6 w-6 p-0"
                                  >
                                    {showInviteCodes[invitation.email] ? (
                                      <EyeOff className="h-3 w-3" />
                                    ) : (
                                      <Eye className="h-3 w-3" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(invitation.inviteCode)}
                                    className="h-6 w-6 p-0"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="role" className="text-slate-700 dark:text-slate-300 font-medium">
                      Select Role
                    </Label>
                    <Controller
                      name="role"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.role && (
                      <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm mt-1">
                        <AlertCircle className="h-4 w-4" />
                        {errors.role.message}
                      </div>
                    )}
                    {watchedRole && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                        {getRoleDescription(watchedRole)}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-slate-700 dark:text-slate-300 font-medium">
                        Email Addresses
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addEmailField}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Email
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {fields.map((field, index) => (
                        <div key={field.id} className="flex gap-2">
                          <div className="flex-1 relative">
                            <Input
                              {...register(`emails.${index}`)}
                              type="email"
                              placeholder="colleague@example.com"
                              className="pr-10"
                              disabled={sendInvitationsMutation.isPending}
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                              <Mail className="h-4 w-4 text-slate-400" />
                            </div>
                          </div>
                          {fields.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeEmailField(index)}
                              disabled={sendInvitationsMutation.isPending}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>

                    {errors.emails && (
                      <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm mt-1">
                        <AlertCircle className="h-4 w-4" />
                        {errors.emails.message}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="message" className="text-slate-700 dark:text-slate-300 font-medium">
                      Personal Message (Optional)
                    </Label>
                    <Textarea
                      {...register("message")}
                      id="message"
                      placeholder="Add a personal message to your invitation..."
                      rows={3}
                      className="mt-2 resize-none"
                      disabled={sendInvitationsMutation.isPending}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    disabled={sendInvitationsMutation.isPending}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={sendInvitationsMutation.isPending || watchedEmails.filter(e => e.trim()).length === 0}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {sendInvitationsMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Send Invitations
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            )}

            {isSuccess && (
              <DialogFooter>
                <Button
                  onClick={handleClose}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Done
                </Button>
              </DialogFooter>
            )}
      </DialogContent>
    </Dialog>
  );
}