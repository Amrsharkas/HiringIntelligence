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
import { Package } from "lucide-react";

interface CreditPackage {
  id: string;
  name: string;
  description: string | null;
  creditType: "cv_processing" | "interview";
  creditAmount: number;
  price: number;
  currency: string;
  stripePriceId: string | null;
  sortOrder: number;
  isActive: boolean;
}

interface CreditPackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  creditPackage: CreditPackage | null;
  onSuccess: () => void;
}

const creditTypes = [
  { value: "cv_processing", label: "CV Processing" },
  { value: "interview", label: "Interview" },
];

const currencies = [
  { value: "EGP", label: "Egyptian Pound (EGP)" },
  { value: "USD", label: "US Dollar (USD)" },
];

export function CreditPackageModal({ isOpen, onClose, creditPackage, onSuccess }: CreditPackageModalProps) {
  const { toast } = useToast();
  const isEditing = creditPackage !== null;

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    creditType: "cv_processing" as "cv_processing" | "interview",
    creditAmount: 0,
    price: 0,
    currency: "EGP",
    stripePriceId: "",
    sortOrder: 0,
    isActive: true,
  });

  // Initialize form data when creditPackage changes
  useEffect(() => {
    if (creditPackage) {
      setFormData({
        name: creditPackage.name || "",
        description: creditPackage.description || "",
        creditType: creditPackage.creditType,
        creditAmount: creditPackage.creditAmount,
        price: creditPackage.price / 100, // Convert from cents for display
        currency: creditPackage.currency || "EGP",
        stripePriceId: creditPackage.stripePriceId || "",
        sortOrder: creditPackage.sortOrder || 0,
        isActive: creditPackage.isActive,
      });
    } else {
      // Reset form for creation
      setFormData({
        name: "",
        description: "",
        creditType: "cv_processing",
        creditAmount: 0,
        price: 0,
        currency: "EGP",
        stripePriceId: "",
        sortOrder: 0,
        isActive: true,
      });
    }
  }, [creditPackage, isOpen]);

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        name: data.name,
        description: data.description || null,
        creditType: data.creditType,
        creditAmount: data.creditAmount,
        price: Math.round(data.price * 100), // Convert to cents
        currency: data.currency,
        stripePriceId: data.stripePriceId || null,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
      };

      const url = isEditing
        ? `/api/super-admin/credit-packages/${creditPackage.id}`
        : "/api/super-admin/credit-packages";
      const method = isEditing ? "PUT" : "POST";

      const res = await apiRequest(method, url, payload);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || `Failed to ${isEditing ? "update" : "create"} package`);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: isEditing ? "Package updated" : "Package created",
        description: `The credit package has been ${isEditing ? "updated" : "created"} successfully.`,
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            {isEditing ? "Edit Credit Package" : "Create Credit Package"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? `Update the details for ${creditPackage?.name}`
              : "Create a new credit package for purchase"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Package Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., 500 CV Credits, 25 Interview Credits"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the package"
              rows={2}
            />
          </div>

          {/* Credit Type & Amount */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="creditType">Credit Type *</Label>
              <Select
                value={formData.creditType}
                onValueChange={(value: "cv_processing" | "interview") => setFormData({ ...formData, creditType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {creditTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="creditAmount">Credit Amount *</Label>
              <Input
                id="creditAmount"
                type="number"
                value={formData.creditAmount}
                onChange={(e) => setFormData({ ...formData, creditAmount: parseInt(e.target.value) || 0 })}
                placeholder="500"
                required
                min={1}
              />
            </div>
          </div>

          {/* Price & Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                placeholder="125.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => setFormData({ ...formData, currency: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((currency) => (
                    <SelectItem key={currency.value} value={currency.value}>
                      {currency.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stripe & Sort Order */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stripePriceId">Stripe Price ID</Label>
              <Input
                id="stripePriceId"
                value={formData.stripePriceId}
                onChange={(e) => setFormData({ ...formData, stripePriceId: e.target.value })}
                placeholder="price_..."
              />
              <p className="text-xs text-slate-500">Optional - for Stripe integration</p>
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

          {/* Active Toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <div>
              <Label htmlFor="isActive" className="text-sm font-medium">Active</Label>
              <p className="text-xs text-slate-500">Inactive packages won't be available for purchase</p>
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
              {mutation.isPending ? "Saving..." : (isEditing ? "Save Changes" : "Create Package")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
