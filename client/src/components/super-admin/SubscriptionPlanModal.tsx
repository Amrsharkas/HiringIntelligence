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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CreditCard } from "lucide-react";

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  monthlyPrice: number;
  yearlyPrice: number;
  monthlyCvCredits: number;
  monthlyInterviewCredits: number;
  jobPostsLimit: number | null;
  supportLevel: string;
  features: Record<string, any> | null;
  stripePriceIdMonthly: string | null;
  stripePriceIdYearly: string | null;
  isActive: boolean;
  sortOrder: number;
}

interface SubscriptionPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: SubscriptionPlan | null;
  onSuccess: () => void;
}

const supportLevels = [
  { value: "standard", label: "Standard" },
  { value: "priority", label: "Priority" },
  { value: "dedicated", label: "Dedicated" },
];

export function SubscriptionPlanModal({ isOpen, onClose, plan, onSuccess }: SubscriptionPlanModalProps) {
  const { toast } = useToast();
  const isEditing = plan !== null;

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    monthlyPrice: 0,
    yearlyPrice: 0,
    monthlyCvCredits: 0,
    monthlyInterviewCredits: 0,
    jobPostsLimit: "",
    supportLevel: "standard",
    stripePriceIdMonthly: "",
    stripePriceIdYearly: "",
    sortOrder: 0,
    isActive: true,
  });

  // Initialize form data when plan changes
  useEffect(() => {
    if (plan) {
      setFormData({
        name: plan.name || "",
        description: plan.description || "",
        monthlyPrice: plan.monthlyPrice / 100, // Convert from cents for display
        yearlyPrice: plan.yearlyPrice / 100,
        monthlyCvCredits: plan.monthlyCvCredits,
        monthlyInterviewCredits: plan.monthlyInterviewCredits,
        jobPostsLimit: plan.jobPostsLimit !== null ? String(plan.jobPostsLimit) : "",
        supportLevel: plan.supportLevel || "standard",
        stripePriceIdMonthly: plan.stripePriceIdMonthly || "",
        stripePriceIdYearly: plan.stripePriceIdYearly || "",
        sortOrder: plan.sortOrder || 0,
        isActive: plan.isActive,
      });
    } else {
      // Reset form for creation
      setFormData({
        name: "",
        description: "",
        monthlyPrice: 0,
        yearlyPrice: 0,
        monthlyCvCredits: 0,
        monthlyInterviewCredits: 0,
        jobPostsLimit: "",
        supportLevel: "standard",
        stripePriceIdMonthly: "",
        stripePriceIdYearly: "",
        sortOrder: 0,
        isActive: true,
      });
    }
  }, [plan, isOpen]);

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        name: data.name,
        description: data.description || null,
        monthlyPrice: Math.round(data.monthlyPrice * 100), // Convert to cents
        yearlyPrice: Math.round(data.yearlyPrice * 100),
        monthlyCvCredits: data.monthlyCvCredits,
        monthlyInterviewCredits: data.monthlyInterviewCredits,
        jobPostsLimit: data.jobPostsLimit ? parseInt(data.jobPostsLimit) : null,
        supportLevel: data.supportLevel,
        stripePriceIdMonthly: data.stripePriceIdMonthly || null,
        stripePriceIdYearly: data.stripePriceIdYearly || null,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
      };

      const url = isEditing
        ? `/api/super-admin/subscription-plans/${plan.id}`
        : "/api/super-admin/subscription-plans";
      const method = isEditing ? "PUT" : "POST";

      const res = await apiRequest(method, url, payload);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || `Failed to ${isEditing ? "update" : "create"} plan`);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: isEditing ? "Plan updated" : "Plan created",
        description: `The subscription plan has been ${isEditing ? "updated" : "created"} successfully.`,
      });
      onSuccess();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: isEditing ? "Update failed" : "Creation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  const calculateYearlyWithDiscount = () => {
    const yearlyWithDiscount = formData.monthlyPrice * 12 * 0.82; // 18% discount
    setFormData({ ...formData, yearlyPrice: Math.round(yearlyWithDiscount) });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            {isEditing ? "Edit Subscription Plan" : "Create Subscription Plan"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? `Update the details for ${plan?.name}`
              : "Create a new subscription plan"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Plan Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Starter, Growth, Pro"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input
                id="sortOrder"
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the plan"
              rows={2}
            />
          </div>

          {/* Credits */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cvCredits">Monthly CV Credits *</Label>
              <Input
                id="cvCredits"
                type="number"
                value={formData.monthlyCvCredits}
                onChange={(e) => setFormData({ ...formData, monthlyCvCredits: parseInt(e.target.value) || 0 })}
                placeholder="1000"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="interviewCredits">Monthly Interview Credits *</Label>
              <Input
                id="interviewCredits"
                type="number"
                value={formData.monthlyInterviewCredits}
                onChange={(e) => setFormData({ ...formData, monthlyInterviewCredits: parseInt(e.target.value) || 0 })}
                placeholder="50"
                required
              />
            </div>
          </div>

          {/* Limits & Support */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="jobPostsLimit">Job Posts Limit</Label>
              <Input
                id="jobPostsLimit"
                type="number"
                value={formData.jobPostsLimit}
                onChange={(e) => setFormData({ ...formData, jobPostsLimit: e.target.value })}
                placeholder="Leave empty for unlimited"
              />
              <p className="text-xs text-slate-500">Leave empty for unlimited</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="supportLevel">Support Level *</Label>
              <Select
                value={formData.supportLevel}
                onValueChange={(value) => setFormData({ ...formData, supportLevel: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select support level" />
                </SelectTrigger>
                <SelectContent>
                  {supportLevels.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Pricing (EGP - Base Currency)</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="monthlyPrice" className="text-xs text-slate-500">Monthly Price *</Label>
                <Input
                  id="monthlyPrice"
                  type="number"
                  step="0.01"
                  value={formData.monthlyPrice}
                  onChange={(e) => setFormData({ ...formData, monthlyPrice: parseFloat(e.target.value) || 0 })}
                  placeholder="290.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="yearlyPrice" className="text-xs text-slate-500">Yearly Price *</Label>
                <div className="flex gap-2">
                  <Input
                    id="yearlyPrice"
                    type="number"
                    step="0.01"
                    value={formData.yearlyPrice}
                    onChange={(e) => setFormData({ ...formData, yearlyPrice: parseFloat(e.target.value) || 0 })}
                    placeholder="2863.44"
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={calculateYearlyWithDiscount}
                    title="Calculate with 18% discount"
                  >
                    -18%
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Stripe IDs */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Stripe Integration (Optional)</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stripePriceIdMonthly" className="text-xs text-slate-500">Monthly Stripe Price ID</Label>
                <Input
                  id="stripePriceIdMonthly"
                  value={formData.stripePriceIdMonthly}
                  onChange={(e) => setFormData({ ...formData, stripePriceIdMonthly: e.target.value })}
                  placeholder="price_..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stripePriceIdYearly" className="text-xs text-slate-500">Yearly Stripe Price ID</Label>
                <Input
                  id="stripePriceIdYearly"
                  value={formData.stripePriceIdYearly}
                  onChange={(e) => setFormData({ ...formData, stripePriceIdYearly: e.target.value })}
                  placeholder="price_..."
                />
              </div>
            </div>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <div>
              <Label htmlFor="isActive" className="text-sm font-medium">Active</Label>
              <p className="text-xs text-slate-500">Inactive plans won't be available for subscription</p>
            </div>
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : (isEditing ? "Save Changes" : "Create Plan")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
