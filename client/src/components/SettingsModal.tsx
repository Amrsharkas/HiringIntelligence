import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getQueryOptions } from "@/lib/queryConfig";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Combobox } from "@/components/ui/combobox";
import { useToast } from "@/hooks/use-toast";
import { Building2, Users, Key, Mail, Shield, Crown, User } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface OrganizationData {
  companyName: string;
  url: string;
  industry: string;
  description: string;
  companySize: string;
}

interface TeamMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
  isActive: boolean;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Industry and size options (same as registration)
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

  // Form states
  const [orgData, setOrgData] = useState<OrganizationData>({
    companyName: '',
    url: '',
    industry: '',
    description: '',
    companySize: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Queries
  const { data: organization, isLoading: orgLoading } = useQuery<any>({
    queryKey: ["/api/organizations/current"],
    ...getQueryOptions(30000),
    enabled: isOpen
  });

  const { data: teamMembers = [], isLoading: teamLoading } = useQuery<TeamMember[]>({
    queryKey: ["/api/companies/team"],
    ...getQueryOptions(30000),
    enabled: isOpen
  });

  // Mutations
  const updateOrganizationMutation = useMutation({
    mutationFn: async (data: OrganizationData) => {
      const response = await fetch('/api/organizations/current', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update organization');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Organization details updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/organizations/current"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update organization details",
        variant: "destructive",
      });
    }
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await fetch('/api/auth/update-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update password');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Password updated successfully",
      });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update password. Please check your current password.",
        variant: "destructive",
      });
    }
  });

  // Set organization data when loaded
  useEffect(() => {
    if (organization) {
      setOrgData({
        companyName: organization.companyName || '',
        url: organization.url || '',
        industry: organization.industry || '',
        description: organization.description || '',
        companySize: organization.companySize || ''
      });
    }
  }, [organization]);

  const handleOrgUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    updateOrganizationMutation.mutate(orgData);
  };

  const handlePasswordUpdate = (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
      });
      return;
    }

    updatePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword
    });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-yellow-600" />;
      case 'admin':
        return <Shield className="w-4 h-4 text-blue-600" />;
      default:
        return <User className="w-4 h-4 text-gray-600" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'default';
      case 'admin':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Settings
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="organization" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="organization" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Organization
            </TabsTrigger>
            <TabsTrigger value="password" className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              Password
            </TabsTrigger>
            <TabsTrigger value="team" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Team Members
            </TabsTrigger>
          </TabsList>

          <TabsContent value="organization" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Organization Details</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleOrgUpdate} className="space-y-4">
                  <div>
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      value={orgData.companyName}
                      onChange={(e) => setOrgData(prev => ({ ...prev, companyName: e.target.value }))}
                      placeholder="e.g., Acme Corporation"
                      disabled={orgLoading || updateOrganizationMutation.isPending}
                    />
                  </div>

                  <div>
                    <Label htmlFor="url">Organization URL</Label>
                    <Input
                      id="url"
                      value={orgData.url}
                      onChange={(e) => setOrgData(prev => ({ ...prev, url: e.target.value }))}
                      placeholder="Choose a unique URL"
                      disabled={orgLoading || updateOrganizationMutation.isPending}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Industry</Label>
                      <Combobox
                        options={INDUSTRIES}
                        value={orgData.industry}
                        onValueChange={(value) => setOrgData(prev => ({ ...prev, industry: value }))}
                        placeholder="Select or create industry..."
                        allowCustomValue={true}
                        disabled={orgLoading || updateOrganizationMutation.isPending}
                      />
                    </div>

                    <div>
                      <Label>Company Size</Label>
                      <Combobox
                        options={COMPANY_SIZES}
                        value={orgData.companySize}
                        onValueChange={(value) => setOrgData(prev => ({ ...prev, companySize: value }))}
                        placeholder="Select or create size..."
                        allowCustomValue={true}
                        disabled={orgLoading || updateOrganizationMutation.isPending}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Company Description (Optional)</Label>
                    <Textarea
                      id="description"
                      value={orgData.description}
                      onChange={(e) => setOrgData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Tell us about your company..."
                      rows={3}
                      disabled={orgLoading || updateOrganizationMutation.isPending}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={orgLoading || updateOrganizationMutation.isPending}
                    >
                      {updateOrganizationMutation.isPending ? 'Updating...' : 'Update Organization'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="password" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Update Password</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                  <div>
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      placeholder="Enter current password"
                      disabled={updatePasswordMutation.isPending}
                    />
                  </div>

                  <div>
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                      placeholder="Enter new password (min. 8 characters)"
                      disabled={updatePasswordMutation.isPending}
                    />
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="Confirm new password"
                      disabled={updatePasswordMutation.isPending}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={updatePasswordMutation.isPending || !passwordData.currentPassword || !passwordData.newPassword}
                    >
                      {updatePasswordMutation.isPending ? 'Updating...' : 'Update Password'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Team Members
                </CardTitle>
              </CardHeader>
              <CardContent>
                {teamLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : teamMembers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No team members found
                  </div>
                ) : (
                  <div className="space-y-4">
                    {teamMembers.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600">
                              {member.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium">{member.name}</div>
                            <div className="text-sm text-gray-500 flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {member.email}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge variant={getRoleBadgeVariant(member.role)} className="flex items-center gap-1">
                            {getRoleIcon(member.role)}
                            {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                          </Badge>

                          {member.isActive ? (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-gray-500">
                              Inactive
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}