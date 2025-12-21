import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Users, Plus, Loader2, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

const createOrgSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  url: z
    .string()
    .trim()
    .min(1, "Organization URL is required")
    .url("Please enter a valid URL (e.g., https://example.com)")
    .max(255, "URL must be 255 characters or less"),
  industry: z.string().min(1, "Industry is required"),
  companySize: z.string().min(1, "Company size is required"),
  description: z.string().optional(),
});

const joinOrgSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
  inviteCode: z.string().min(1, "Invite code is required"),
});

type CreateOrgData = z.infer<typeof createOrgSchema>;
type JoinOrgData = z.infer<typeof joinOrgSchema>;

const INDUSTRIES = [
  "Technology",
  "Marketing",
  "Education",
  "Finance",
  "Legal",
  "Healthcare",
  "Retail",
  "Manufacturing",
  "Consulting",
  "Real Estate",
  "Media",
  "Government",
  "Non-profit",
  "Construction",
  "Transportation",
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
  const { logoutMutation } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("create");
  const [urlStatus, setUrlStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'error'>('idle');
  const [urlFeedback, setUrlFeedback] = useState<string>("");

  const createForm = useForm<CreateOrgData>({
    resolver: zodResolver(createOrgSchema),
    defaultValues: {
      companyName: "",
      url: "",
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

  // Check URL parameters for invite code and organization ID
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const inviteCode = urlParams.get('inviteCode');
    const organizationId = urlParams.get('organizationId');
    
    if (inviteCode) {
      joinForm.setValue('inviteCode', inviteCode);
      setActiveTab('join');
    }
    if (organizationId) {
      joinForm.setValue('organizationId', organizationId);
      setActiveTab('join');
    }
  }, [joinForm]);

  const createOrgMutation = useMutation({
    mutationFn: async (data: CreateOrgData) => {
      const response = await apiRequest("POST", "/api/organizations", {
        ...data,
        url: data.url.trim(),
      });
      return response.json();
    },
    onSuccess: async () => {
      toast({
        title: "Success",
        description: "Organization created successfully! Welcome to your new workspace.",
      });
      // Invalidate and refetch the organization query
      await queryClient.invalidateQueries({ queryKey: ["/api/organizations/current"] });
      // Wait a moment to ensure the query has refetched
      await queryClient.refetchQueries({ queryKey: ["/api/organizations/current"] });
      // Use React Router navigation instead of hard redirect
      setLocation("/dashboard");
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
      const message =
        error instanceof Error && error.message.includes("Organization URL already in use")
          ? "Organization URL already in use"
          : error.message || "Failed to create organization. Please try again.";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  const joinOrgMutation = useMutation({
    mutationFn: async (data: JoinOrgData) => {
      // Both organizationId and inviteCode are now required
      const response = await apiRequest("POST", "/api/invitations/accept-code", {
        orgId: data.organizationId,
        inviteCode: data.inviteCode
      });
      return response.json();
    },
    onSuccess: async (response) => {
      toast({
        title: "Welcome to the team!",
        description: response.message || "Successfully joined the organization!",
      });
      // Invalidate and refetch the organization query
      await queryClient.invalidateQueries({ queryKey: ["/api/organizations/current"] });
      // Wait a moment to ensure the query has refetched
      await queryClient.refetchQueries({ queryKey: ["/api/organizations/current"] });
      // Use React Router navigation instead of hard redirect
      setLocation("/dashboard");
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

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const urlValue = createForm.watch("url");

  useEffect(() => {
    const trimmed = (urlValue || "").trim();

    if (!trimmed) {
      setUrlStatus('idle');
      setUrlFeedback('');
      return;
    }

    let cancelled = false;
    setUrlStatus('checking');
    setUrlFeedback('');

    const timeoutId = setTimeout(async () => {
      try {
        const response = await apiRequest(
          "GET",
          `/api/organizations/check-url?url=${encodeURIComponent(trimmed)}`
        );
        const data = await response.json();

        if (cancelled) return;

        if (data.available) {
          setUrlStatus('available');
          setUrlFeedback('URL is available');
        } else {
          setUrlStatus('taken');
          setUrlFeedback('URL is already in use');
        }
      } catch (error) {
        if (cancelled) return;
        setUrlStatus('error');
        setUrlFeedback(error instanceof Error ? error.message : 'Unable to check URL');
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [urlValue]);

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-6">
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
            <div className="flex justify-between items-start">
              <div className="text-center flex-1">
                <CardTitle className="text-xl">Choose Your Path</CardTitle>
                <CardDescription>
                  You can always invite team members or change settings later
                </CardDescription>
              </div>
              <button
                onClick={handleLogout}
                className="ml-4 p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors duration-200"
                title="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
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

                  <div>
                    <Label htmlFor="url">Organization URL</Label>
                    <Input
                      id="url"
                      {...createForm.register("url")}
                      placeholder="Choose a unique URL"
                      className="mt-2"
                    />
                    {createForm.formState.errors.url && (
                      <p className="text-red-500 text-sm mt-1">
                        {createForm.formState.errors.url.message}
                      </p>
                    )}
                    {urlStatus !== 'idle' && urlFeedback && (
                      <p
                        className={`text-sm mt-1 ${
                          urlStatus === 'available'
                            ? 'text-green-600'
                            : urlStatus === 'checking'
                            ? 'text-slate-500'
                            : 'text-red-500'
                        }`}
                      >
                        {urlStatus === 'checking' ? 'Checking availability…' : urlFeedback}
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
                          <Combobox
                            options={INDUSTRIES}
                            value={field.value}
                            onValueChange={field.onChange}
                            placeholder="Select or create industry..."
                            allowCustomValue={true}
                            className="mt-2"
                          />
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
                          <Combobox
                            options={COMPANY_SIZES}
                            value={field.value}
                            onValueChange={field.onChange}
                            placeholder="Select or create size..."
                            allowCustomValue={true}
                            className="mt-2"
                          />
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
                    disabled={
                      createOrgMutation.isPending ||
                      urlStatus === 'checking' ||
                      urlStatus === 'taken'
                    }
                    className="w-full bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
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
                    <Label htmlFor="organizationId" className="text-slate-700 dark:text-slate-300 font-medium">
                      Organization ID <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="organizationId"
                      {...joinForm.register("organizationId")}
                      placeholder="Enter the organization ID from your invitation email"
                      className="mt-2"
                    />
                    {joinForm.formState.errors.organizationId && (
                      <p className="text-red-500 text-sm mt-1">
                        {joinForm.formState.errors.organizationId.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="inviteCode" className="text-slate-700 dark:text-slate-300 font-medium">
                      Invite Code <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="inviteCode"
                      {...joinForm.register("inviteCode")}
                      placeholder="Enter your invite code"
                      className="mt-2"
                      style={{ textTransform: 'uppercase' }}
                    />
                    {joinForm.formState.errors.inviteCode && (
                      <p className="text-red-500 text-sm mt-1">
                        {joinForm.formState.errors.inviteCode.message}
                      </p>
                    )}
                  </div>

                  <div className="text-center text-sm text-gray-500">
                    <p>Both Organization ID and Invite Code are required from your invitation email.</p>
                  </div>

                  <Button
                    type="submit"
                    disabled={joinOrgMutation.isPending}
                    className="w-full bg-linear-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white"
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