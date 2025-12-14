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
import { z } from "zod";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdminOrOwner?: boolean;
}

interface OrganizationData {
  companyName: string;
  url: string;
  industry: string;
  description: string;
  companySize: string;
}

interface UserProfileData {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  username: string | null;
  authProvider: string | null;
  isVerified: boolean;
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

export function SettingsModal({ isOpen, onClose, isAdminOrOwner = false }: SettingsModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Access control: Only admins and owners can access settings
  if (isOpen && !isAdminOrOwner) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Shield className="w-5 h-5" />
              Access Denied
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 text-center">
            <p className="text-gray-600 mb-4">
              You don't have permission to access organization settings.
            </p>
            <p className="text-sm text-gray-500">
              Only administrators and organization owners can manage settings.
            </p>
          </div>
          <div className="flex justify-end">
            <Button onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

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

  const [userProfileData, setUserProfileData] = useState({
    firstName: '',
    lastName: '',
    displayName: ''
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

  const { data: userProfile, isLoading: userProfileLoading } = useQuery<UserProfileData>({
    queryKey: ["/api/user/profile"],
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

  const updateUserProfileMutation = useMutation({
    mutationFn: async (data: { firstName: string; lastName: string; displayName?: string }) => {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update user profile');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update profile",
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

  // Set user profile data when loaded
  useEffect(() => {
    if (userProfile) {
      setUserProfileData({
        firstName: userProfile.firstName || '',
        lastName: userProfile.lastName || '',
        displayName: userProfile.displayName || ''
      });
    }
  }, [userProfile]);

  const handleOrgUpdate = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate URL format
    try {
      const urlSchema = z.string().url("Please enter a valid URL (e.g., https://example.com)");
      urlSchema.parse(orgData.url.trim());
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
        return;
      }
    }

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

  const handleUserProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();

    if (!userProfileData.firstName || !userProfileData.lastName) {
      toast({
        title: "Error",
        description: "First name and last name are required",
        variant: "destructive",
      });
      return;
    }

    updateUserProfileMutation.mutate({
      firstName: userProfileData.firstName,
      lastName: userProfileData.lastName,
      displayName: userProfileData.displayName || undefined
    });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-yellow-600" />;
      case 'admin':
        return <Shield className="w-4 h-4 text-primary" />;
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="organization" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Organization
            </TabsTrigger>
            <TabsTrigger value="account" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Account
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

          <TabsContent value="account" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Account Information</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUserProfileUpdate} className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={userProfile?.email || ''}
                      disabled
                      className="bg-gray-50"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Email cannot be changed. {userProfile?.authProvider === 'google' && 'This account uses Google authentication.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={userProfileData.firstName}
                        onChange={(e) => setUserProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                        placeholder="Enter your first name"
                        disabled={userProfileLoading || updateUserProfileMutation.isPending}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={userProfileData.lastName}
                        onChange={(e) => setUserProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                        placeholder="Enter your last name"
                        disabled={userProfileLoading || updateUserProfileMutation.isPending}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="displayName">Display Name (Optional)</Label>
                    <Input
                      id="displayName"
                      value={userProfileData.displayName}
                      onChange={(e) => setUserProfileData(prev => ({ ...prev, displayName: e.target.value }))}
                      placeholder="How you'd like to be called"
                      disabled={userProfileLoading || updateUserProfileMutation.isPending}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={userProfileLoading || updateUserProfileMutation.isPending}
                    >
                      {updateUserProfileMutation.isPending ? 'Updating...' : 'Update Profile'}
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
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
                            <span className="text-sm font-medium text-primary">
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