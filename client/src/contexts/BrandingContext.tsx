import React, { createContext, useContext, useEffect, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface Organization {
  id: string;
  brandLogoPath?: string | null;
  brandPrimaryColor?: string | null;
  companyName: string;
}

interface BrandingContextType {
  logoUrl: string | null;
  primaryColor: string | null;
  isLoading: boolean;
  updateLogo: (file: File) => Promise<void>;
  updatePrimaryColor: (color: string) => Promise<void>;
  deleteLogo: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export function BrandingProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch organization data
  const { data: organization, isLoading } = useQuery<Organization>({
    queryKey: ["/api/organizations/current"],
  });

  // Apply CSS variables when branding changes
  useEffect(() => {
    if (organization?.brandPrimaryColor) {
      const primaryColor = organization.brandPrimaryColor;

      // Apply primary color to all relevant CSS variables
      document.documentElement.style.setProperty('--primary', `hsl(${primaryColor})`);
      document.documentElement.style.setProperty('--sidebar-primary', `hsl(${primaryColor})`);
      document.documentElement.style.setProperty('--chart-1', `hsl(${primaryColor})`);
      document.documentElement.style.setProperty('--sidebar-ring', `hsl(${primaryColor})`);

      // Calculate a darker version for ring color (for focus states)
      const [h, s, l] = primaryColor.match(/(\d+),\s*(\d+)%,\s*(\d+)%/)?.slice(1).map(Number) || [207, 90, 54];
      const darkerL = Math.max(l - 10, 20); // Darken by 10%, min 20%
      document.documentElement.style.setProperty('--ring', `hsl(${h}, ${s}%, ${darkerL}%)`);

      console.log("✅ Applied custom primary color:", primaryColor);
    } else {
      // Reset to defaults (remove custom properties to use values from CSS)
      document.documentElement.style.removeProperty('--primary');
      document.documentElement.style.removeProperty('--sidebar-primary');
      document.documentElement.style.removeProperty('--chart-1');
      document.documentElement.style.removeProperty('--sidebar-ring');
      document.documentElement.style.removeProperty('--ring');
    }
  }, [organization?.brandPrimaryColor]);

  // Upload logo mutation
  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      // Convert file to base64
      const fileContent = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          // Remove data:image/xxx;base64, prefix
          const base64Content = base64.split(',')[1];
          resolve(base64Content);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const response = await fetch('/api/organizations/current/branding/logo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileContent
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload logo');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations/current"] });
      toast({
        title: "Logo updated",
        description: "Your organization logo has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Update primary color mutation
  const updateColorMutation = useMutation({
    mutationFn: async (color: string) => {
      const response = await fetch('/api/organizations/current/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ primaryColor: color })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update color');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations/current"] });
      toast({
        title: "Color updated",
        description: "Your brand color has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Delete logo mutation
  const deleteLogoMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/organizations/current/branding/logo', {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete logo');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations/current"] });
      toast({
        title: "Logo removed",
        description: "Your organization logo has been reset to default.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const logoUrl = organization?.brandLogoPath
    ? `/api/organizations/logos/${organization.id}/${organization.brandLogoPath}`
    : null;

  const value: BrandingContextType = {
    logoUrl,
    primaryColor: organization?.brandPrimaryColor || null,
    isLoading,
    updateLogo: (file: File) => uploadLogoMutation.mutateAsync(file),
    updatePrimaryColor: (color: string) => updateColorMutation.mutateAsync(color),
    deleteLogo: () => deleteLogoMutation.mutateAsync(),
  };

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (context === undefined) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
}
