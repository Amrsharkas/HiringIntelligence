import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Settings,
  Phone,
  CheckCircle,
  XCircle,
  RefreshCw,
  Eye,
  EyeOff,
  Save,
  AlertCircle,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TwilioSettingsResponse {
  settings: {
    accountSid: string;
    authToken: string;
    phoneNumber: string;
    isConfigured: boolean;
  };
  connectionStatus: {
    connected: boolean;
    source: "database" | "environment" | "none";
    phoneNumber: string | null;
    accountSid: string | null;
    error?: string;
  };
}

export function SuperAdminSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAuthToken, setShowAuthToken] = useState(false);
  const [formData, setFormData] = useState({
    accountSid: "",
    authToken: "",
    phoneNumber: "",
  });
  const [hasChanges, setHasChanges] = useState(false);

  const { data, isLoading, refetch } = useQuery<TwilioSettingsResponse>({
    queryKey: ["/api/super-admin/settings/twilio"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/super-admin/settings/twilio");
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
  });

  // Update form when data loads
  useEffect(() => {
    if (data?.settings) {
      setFormData({
        accountSid: data.settings.accountSid || "",
        authToken: "", // Don't populate masked token
        phoneNumber: data.settings.phoneNumber || "",
      });
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: async (settings: typeof formData) => {
      const res = await apiRequest("PUT", "/api/super-admin/settings/twilio", settings);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update settings");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings updated",
        description: "Twilio settings have been saved successfully.",
      });
      setHasChanges(false);
      setFormData((prev) => ({ ...prev, authToken: "" }));
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/settings/twilio"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async (credentials: typeof formData) => {
      const res = await apiRequest("POST", "/api/super-admin/settings/twilio/test", credentials);
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Connection test failed");
      }
      return result;
    },
    onSuccess: (result) => {
      toast({
        title: result.success ? "Connection successful" : "Connection failed",
        description: result.success
          ? "Twilio credentials are valid and connected."
          : result.error || "Unable to connect to Twilio.",
        variant: result.success ? "default" : "destructive",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Test failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate auth token is provided (since we don't show the existing one)
    if (!formData.authToken) {
      toast({
        title: "Auth token required",
        description: "Please enter the Auth Token to save settings.",
        variant: "destructive",
      });
      return;
    }

    updateMutation.mutate(formData);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Settings className="w-7 h-7" />
            System Settings
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Configure global system settings and integrations
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="twilio" className="space-y-4">
        <TabsList className="bg-white/50 dark:bg-slate-800/50">
          <TabsTrigger value="twilio" className="flex items-center gap-2">
            <Phone className="w-4 h-4" />
            Twilio Voice
          </TabsTrigger>
        </TabsList>

        <TabsContent value="twilio">
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200/60 dark:border-slate-700/60">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="w-5 h-5" />
                    Twilio Voice Configuration
                  </CardTitle>
                  <CardDescription>
                    Configure Twilio credentials for voice calling features
                  </CardDescription>
                </div>
                {data && (
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={data.connectionStatus.connected ? "default" : "destructive"}
                      className="flex items-center gap-1"
                    >
                      {data.connectionStatus.connected ? (
                        <>
                          <CheckCircle className="w-3 h-3" />
                          Connected
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3" />
                          Disconnected
                        </>
                      )}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      Source: {data.connectionStatus.source}
                    </Badge>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Connection Error Alert */}
                  {data?.connectionStatus.error && (
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                      <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-800 dark:text-red-200">
                          Connection Error
                        </p>
                        <p className="text-sm text-red-600 dark:text-red-300">
                          {data.connectionStatus.error}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Account SID */}
                  <div className="space-y-2">
                    <Label htmlFor="accountSid">Account SID</Label>
                    <Input
                      id="accountSid"
                      value={formData.accountSid}
                      onChange={(e) => handleInputChange("accountSid", e.target.value)}
                      placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="font-mono"
                    />
                    <p className="text-xs text-slate-500">
                      Your Twilio Account SID from the Twilio Console
                    </p>
                  </div>

                  {/* Auth Token */}
                  <div className="space-y-2">
                    <Label htmlFor="authToken">Auth Token</Label>
                    <div className="relative">
                      <Input
                        id="authToken"
                        type={showAuthToken ? "text" : "password"}
                        value={formData.authToken}
                        onChange={(e) => handleInputChange("authToken", e.target.value)}
                        placeholder={
                          data?.settings.isConfigured
                            ? "Enter new token to update"
                            : "Enter Auth Token"
                        }
                        className="font-mono pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                        onClick={() => setShowAuthToken(!showAuthToken)}
                      >
                        {showAuthToken ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    {data?.settings.isConfigured && data.settings.authToken && (
                      <p className="text-xs text-slate-500">
                        Current token: <span className="font-mono">{data.settings.authToken}</span>
                      </p>
                    )}
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <Input
                      id="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                      placeholder="+12025551234"
                      className="font-mono"
                    />
                    <p className="text-xs text-slate-500">
                      Your Twilio phone number in E.164 format (e.g., +12025551234)
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (!formData.accountSid || !formData.authToken || !formData.phoneNumber) {
                          toast({
                            title: "Missing fields",
                            description: "Please fill in all fields before testing.",
                            variant: "destructive",
                          });
                          return;
                        }
                        testConnectionMutation.mutate(formData);
                      }}
                      disabled={testConnectionMutation.isPending}
                    >
                      {testConnectionMutation.isPending ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Test Connection
                        </>
                      )}
                    </Button>
                    <Button
                      type="submit"
                      disabled={updateMutation.isPending || !hasChanges}
                    >
                      {updateMutation.isPending ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
