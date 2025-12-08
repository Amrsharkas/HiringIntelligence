import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Building2 } from "lucide-react";

interface Organization {
  id: string;
  companyName: string;
  url: string;
  industry: string | null;
  companySize: string | null;
  description: string | null;
}

interface CompanyEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  organization: Organization;
  onSuccess: () => void;
}

const companySizes = [
  { value: "1-10", label: "1-10 employees" },
  { value: "11-50", label: "11-50 employees" },
  { value: "51-200", label: "51-200 employees" },
  { value: "201-500", label: "201-500 employees" },
  { value: "501-1000", label: "501-1000 employees" },
  { value: "1000+", label: "1000+ employees" },
];

export function CompanyEditModal({ isOpen, onClose, organization, onSuccess }: CompanyEditModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    companyName: "",
    industry: "",
    companySize: "",
    description: "",
  });

  // Initialize form data when organization changes
  useEffect(() => {
    if (organization) {
      setFormData({
        companyName: organization.companyName || "",
        industry: organization.industry || "",
        companySize: organization.companySize || "",
        description: organization.description || "",
      });
    }
  }, [organization]);

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest("PUT", `/api/super-admin/organizations/${organization.id}`, data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update organization");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Company updated",
        description: "The company details have been updated successfully.",
      });
      onSuccess();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Edit Company
          </DialogTitle>
          <DialogDescription>
            Update the company details for {organization.companyName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              placeholder="Enter company name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="industry">Industry</Label>
            <Input
              id="industry"
              value={formData.industry}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
              placeholder="e.g., Technology, Healthcare, Finance"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="companySize">Company Size</Label>
            <Select
              value={formData.companySize}
              onValueChange={(value) => setFormData({ ...formData, companySize: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select company size" />
              </SelectTrigger>
              <SelectContent>
                {companySizes.map((size) => (
                  <SelectItem key={size.value} value={size.value}>
                    {size.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the company"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
