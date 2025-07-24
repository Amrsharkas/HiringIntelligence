import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Users, Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

const createOrgSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  industry: z.string().min(1, "Industry is required"),
  companySize: z.string().min(1, "Company size is required"),
  description: z.string().optional(),
});

const joinOrgSchema = z.object({
  organizationId: z.string().optional(),
  inviteCode: z.string().min(1, "Invite code is required"),
}).refine((data) => {
  // If invite code is provided, organization ID is not required
  return data.inviteCode || data.organizationId;
}, {
  message: "Either invite code or organization ID is required",
  path: ["organizationId"],
});

type CreateOrgData = z.infer<typeof createOrgSchema>;
type JoinOrgData = z.infer<typeof joinOrgSchema>;

const INDUSTRIES = [
  "Technology",
  "Healthcare", 
  "Finance",
  "Education",
  "Retail",
  "Manufacturing",
  "Consulting",
  "Media & Entertainment",
  "Non-profit",
  "Government",
  "Other"
];

const COMPANY_SIZES = [
  "1-10 employees",
  "11-50 employees", 
  "51-200 employees",
  "201-500 employees",
  "501-1000 employees",
  "1000+ employees"
];

export default function OrganizationSetup() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("create");

  const createForm = useForm<CreateOrgData>({
    resolver: zodResolver(createOrgSchema),
    defaultValues: {
      companyName: "",
      industry: "",
      companySize: "",
      description: "",
    },
  });

  const joinForm = useForm<JoinOrgData>({
    resolver: zodResolver(joinOrgSchema),
    defaultValues: {
      organizationId: "",
      inviteCode: "",
    },
  });

  // Check URL parameters for invite code
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const inviteCode = urlParams.get('inviteCode');
    if (inviteCode) {
      joinForm.setValue('inviteCode', inviteCode);
      setActiveTab('join');
    }
  }, [joinForm]);

  const createOrgMutation = useMutation({
    mutationFn: async (data: CreateOrgData) => {
      const response = await apiRequest("POST", "/api/organizations", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Organization created successfully! Welcome to your new workspace.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/organizations/current"] });
      // This will trigger a redirect to the dashboard
      window.location.href = "/";
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
        title: "Error",
        description: "Failed to create organization. Please try again.",
        variant: "destructive",
      });
    },
  });

  const joinOrgMutation = useMutation({
    mutationFn: async (data: JoinOrgData) => {
      // If invite code is provided, use the invite code endpoint
      if (data.inviteCode) {
        return await apiRequest("/api/invitations/accept-code", {
          method: "POST",
          body: JSON.stringify({ inviteCode: data.inviteCode }),
        });
      }
      // Otherwise try to join by organization ID (if available)
      if (data.organizationId) {
        return await apiRequest("/api/organizations/join", {
          method: "POST",
          body: JSON.stringify(data),
        });
      }
      throw new Error("Either invite code or organization ID is required");
    },
    onSuccess: (response) => {
      toast({
        title: "Welcome to the team!",
        description: response.message || "Successfully joined the organization!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/organizations/current"] });
      // This will trigger a redirect to the dashboard
      window.location.href = "/";
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
        title: "Error",
        description: error.message || "Failed to join organization. Please check your invite code and try again.",
        variant: "destructive",
      });
    },
  });

  const onCreateSubmit = (data: CreateOrgData) => {
    createOrgMutation.mutate(data);
  };

  const onJoinSubmit = (data: JoinOrgData) => {
    joinOrgMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        <div className="text-center mb-8">
          <Building2 className="w-16 h-16 mx-auto text-blue-600 dark:text-blue-400 mb-4" />
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Set Up Your Organization
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Create a new organization or join an existing one to get started with hiring
          </p>
        </div>

        <Card className="bg-white dark:bg-slate-800 shadow-xl border-0">
          <CardHeader>
            <CardTitle className="text-xl text-center">Choose Your Path</CardTitle>
            <CardDescription className="text-center">
              You can always invite team members or change settings later
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="create" className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Create New
                </TabsTrigger>
                <TabsTrigger value="join" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Join Existing
                </TabsTrigger>
              </TabsList>

              <TabsContent value="create" className="space-y-6">
                <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                  <div>
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      {...createForm.register("companyName")}
                      placeholder="e.g., Acme Corporation"
                      className="mt-2"
                    />
                    {createForm.formState.errors.companyName && (
                      <p className="text-red-500 text-sm mt-1">
                        {createForm.formState.errors.companyName.message}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Industry</Label>
                      <Controller
                        name="industry"
                        control={createForm.control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger className="mt-2">
                              <SelectValue placeholder="Select industry" />
                            </SelectTrigger>
                            <SelectContent>
                              {INDUSTRIES.map((industry) => (
                                <SelectItem key={industry} value={industry}>
                                  {industry}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {createForm.formState.errors.industry && (
                        <p className="text-red-500 text-sm mt-1">
                          {createForm.formState.errors.industry.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label>Company Size</Label>
                      <Controller
                        name="companySize"
                        control={createForm.control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger className="mt-2">
                              <SelectValue placeholder="Select size" />
                            </SelectTrigger>
                            <SelectContent>
                              {COMPANY_SIZES.map((size) => (
                                <SelectItem key={size} value={size}>
                                  {size}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {createForm.formState.errors.companySize && (
                        <p className="text-red-500 text-sm mt-1">
                          {createForm.formState.errors.companySize.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Company Description (Optional)</Label>
                    <Textarea
                      id="description"
                      {...createForm.register("description")}
                      placeholder="Tell us about your company..."
                      rows={3}
                      className="mt-2"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={createOrgMutation.isPending}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                  >
                    {createOrgMutation.isPending && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Create Organization
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="join" className="space-y-6">
                <form onSubmit={joinForm.handleSubmit(onJoinSubmit)} className="space-y-4">
                  <div>
                    <Label htmlFor="inviteCode">Invite Code</Label>
                    <Input
                      id="inviteCode"
                      {...joinForm.register("inviteCode")}
                      placeholder="Enter your 6-character invite code"
                      className="mt-2"
                      maxLength={6}
                      style={{ textTransform: 'uppercase' }}
                    />
                    {joinForm.formState.errors.inviteCode && (
                      <p className="text-red-500 text-sm mt-1">
                        {joinForm.formState.errors.inviteCode.message}
                      </p>
                    )}
                  </div>

                  <div className="text-center text-sm text-gray-500">
                    <p>Don't have an invite code? Contact your team administrator.</p>
                  </div>

                  <Button
                    type="submit"
                    disabled={joinOrgMutation.isPending}
                    className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white"
                  >
                    {joinOrgMutation.isPending && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Join Organization
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Need help? Contact support or check our documentation
          </p>
        </div>
      </motion.div>
    </div>
  );
}