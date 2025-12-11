import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Mail,
  Plus,
  Trash2,
  CheckCircle,
  Loader2,
  AlertCircle,
  Copy,
  Eye,
  EyeOff,
  UserPlus,
  Shield,
  Users,
  EyeIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

const inviteTeamSchema = z.object({
  emails: z
    .array(z.string().email("Please enter a valid email address"))
    .min(1, "At least one email is required"),
  role: z.enum(["admin", "member", "viewer"], {
    required_error: "Please select a role",
  }),
  message: z.string().optional(),
});

type InviteTeamFormData = z.infer<typeof inviteTeamSchema>;

interface InvitationResult {
  id: number;
  email: string;
  inviteCode: string;
  role: string;
  expiresAt: Date;
}

export default function InviteMemberPage() {
  const navigate = useNavigate();
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
    watch,
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
    name: "emails",
  });

  const sendInvitationsMutation = useMutation({
    mutationFn: async (data: InviteTeamFormData) => {
      const validEmails = data.emails.filter((email) => email.trim() !== "");

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
      setIsSuccess(true);
      setInvitationResults(data.invitations || []);

      toast({
        title: "Invitations sent!",
        description: `Successfully sent ${data.invitations?.length || 0} invitation${
          (data.invitations?.length || 0) !== 1 ? "s" : ""
        }`,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/organizations/current"] });
      queryClient.invalidateQueries({ queryKey: ["/api/organizations/team"] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies/team"] });
    },
    onError: (error) => {
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
    setShowInviteCodes((prev) => ({
      ...prev,
      [email]: !prev[email],
    }));
  };

  const onSubmit = (data: InviteTeamFormData) => {
    sendInvitationsMutation.mutate(data);
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

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Shield className="w-5 h-5 text-purple-500" />;
      case "member":
        return <Users className="w-5 h-5 text-blue-500" />;
      case "viewer":
        return <EyeIcon className="w-5 h-5 text-slate-500" />;
      default:
        return null;
    }
  };

  if (isSuccess) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/hiring/team")}
            className="text-slate-600 dark:text-slate-400"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                Invitations Sent!
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                {invitationResults.length} team member
                {invitationResults.length !== 1 ? "s" : ""} invited
              </p>
            </div>
          </div>
        </motion.div>

        {/* Success Content */}
        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200/60 dark:border-slate-700/60">
          <CardHeader>
            <CardTitle>Invitation Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {invitationResults.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg"
              >
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
                        {showInviteCodes[invitation.email]
                          ? invitation.inviteCode
                          : "\u2022\u2022\u2022\u2022\u2022\u2022"}
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
            ))}

            <div className="pt-4 flex gap-3">
              <Button variant="outline" onClick={() => navigate("/hiring/team")}>
                Back to Team
              </Button>
              <Button
                onClick={() => {
                  setIsSuccess(false);
                  setInvitationResults([]);
                  setShowInviteCodes({});
                }}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Invite More
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/hiring/team")}
          className="text-slate-600 dark:text-slate-400"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <UserPlus className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
              Invite Team Members
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Add colleagues to your hiring team
            </p>
          </div>
        </div>
      </motion.div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Role Selection */}
        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200/60 dark:border-slate-700/60">
          <CardHeader>
            <CardTitle>Select Role</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    {
                      value: "admin",
                      label: "Admin",
                      icon: <Shield className="w-5 h-5" />,
                      color: "purple",
                    },
                    {
                      value: "member",
                      label: "Member",
                      icon: <Users className="w-5 h-5" />,
                      color: "blue",
                    },
                    {
                      value: "viewer",
                      label: "Viewer",
                      icon: <EyeIcon className="w-5 h-5" />,
                      color: "slate",
                    },
                  ].map((role) => (
                    <div
                      key={role.value}
                      onClick={() => field.onChange(role.value)}
                      className={`cursor-pointer p-4 rounded-lg border-2 transition-all ${
                        field.value === role.value
                          ? `border-${role.color}-500 bg-${role.color}-50 dark:bg-${role.color}-900/20`
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className={`p-2 rounded-lg ${
                            field.value === role.value
                              ? `bg-${role.color}-100 dark:bg-${role.color}-900/30 text-${role.color}-600 dark:text-${role.color}-400`
                              : "bg-slate-100 dark:bg-slate-700 text-slate-500"
                          }`}
                        >
                          {role.icon}
                        </div>
                        <span className="font-medium text-slate-900 dark:text-white">
                          {role.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {getRoleDescription(role.value)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            />
            {errors.role && (
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                <AlertCircle className="h-4 w-4" />
                {errors.role.message}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Email Addresses */}
        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200/60 dark:border-slate-700/60">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Email Addresses</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addEmailField}
                disabled={sendInvitationsMutation.isPending}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Email
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
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
                    size="icon"
                    onClick={() => removeEmailField(index)}
                    disabled={sendInvitationsMutation.isPending}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {errors.emails && (
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                <AlertCircle className="h-4 w-4" />
                {errors.emails.message}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Personal Message */}
        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200/60 dark:border-slate-700/60">
          <CardHeader>
            <CardTitle>Personal Message (Optional)</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              {...register("message")}
              placeholder="Add a personal message to your invitation..."
              rows={4}
              className="resize-none"
              disabled={sendInvitationsMutation.isPending}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/hiring/team")}
            disabled={sendInvitationsMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={
              sendInvitationsMutation.isPending ||
              watchedEmails.filter((e) => e.trim()).length === 0
            }
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
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
        </div>
      </form>
    </div>
  );
}
