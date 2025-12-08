import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Globe, Plus, Edit, Trash2, X, Check } from "lucide-react";

interface SubscriptionPlan {
  id: string;
  name: string;
}

interface PlanPricing {
  id: string;
  subscriptionPlanId: string;
  countryCode: string;
  currency: string;
  monthlyPrice: number;
  yearlyPrice: number;
  stripePriceIdMonthly: string | null;
  stripePriceIdYearly: string | null;
  isActive: boolean;
  isDefault: boolean;
}

interface SupportedCountry {
  id: string;
  countryCode: string;
  countryName: string;
  currency: string;
  currencySymbol: string;
  isDefault: boolean;
  isActive: boolean;
}

interface RegionalPricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: SubscriptionPlan;
}

export function RegionalPricingModal({ isOpen, onClose, plan }: RegionalPricingModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [newPricing, setNewPricing] = useState({
    countryCode: "",
    currency: "",
    monthlyPrice: 0,
    yearlyPrice: 0,
    stripePriceIdMonthly: "",
    stripePriceIdYearly: "",
    isDefault: false,
  });

  const [editPricing, setEditPricing] = useState({
    monthlyPrice: 0,
    yearlyPrice: 0,
    stripePriceIdMonthly: "",
    stripePriceIdYearly: "",
    isDefault: false,
  });

  // Fetch pricing for this plan
  const { data: pricing, isLoading: pricingLoading, refetch: refetchPricing } = useQuery<PlanPricing[]>({
    queryKey: [`/api/super-admin/subscription-plans/${plan.id}/pricing`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/super-admin/subscription-plans/${plan.id}/pricing`);
      if (!res.ok) throw new Error("Failed to fetch pricing");
      return res.json();
    },
    enabled: isOpen,
  });

  // Fetch supported countries
  const { data: countries } = useQuery<SupportedCountry[]>({
    queryKey: ["/api/super-admin/supported-countries"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/super-admin/supported-countries");
      if (!res.ok) throw new Error("Failed to fetch countries");
      return res.json();
    },
    enabled: isOpen,
  });

  // Add pricing mutation
  const addMutation = useMutation({
    mutationFn: async (data: typeof newPricing) => {
      const payload = {
        countryCode: data.countryCode,
        currency: data.currency,
        monthlyPrice: Math.round(data.monthlyPrice * 100),
        yearlyPrice: Math.round(data.yearlyPrice * 100),
        stripePriceIdMonthly: data.stripePriceIdMonthly || null,
        stripePriceIdYearly: data.stripePriceIdYearly || null,
        isDefault: data.isDefault,
      };
      const res = await apiRequest("POST", `/api/super-admin/subscription-plans/${plan.id}/pricing`, payload);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to add pricing");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Pricing added", description: "Regional pricing has been added successfully." });
      setIsAddingNew(false);
      resetNewPricing();
      refetchPricing();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add pricing", description: error.message, variant: "destructive" });
    },
  });

  // Update pricing mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof editPricing }) => {
      const payload = {
        monthlyPrice: Math.round(data.monthlyPrice * 100),
        yearlyPrice: Math.round(data.yearlyPrice * 100),
        stripePriceIdMonthly: data.stripePriceIdMonthly || null,
        stripePriceIdYearly: data.stripePriceIdYearly || null,
        isDefault: data.isDefault,
      };
      const res = await apiRequest("PUT", `/api/super-admin/pricing/${id}`, payload);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update pricing");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Pricing updated", description: "Regional pricing has been updated successfully." });
      setEditingId(null);
      refetchPricing();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update pricing", description: error.message, variant: "destructive" });
    },
  });

  // Delete pricing mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/super-admin/pricing/${id}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete pricing");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Pricing deleted", description: "Regional pricing has been deleted successfully." });
      refetchPricing();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete pricing", description: error.message, variant: "destructive" });
    },
  });

  const resetNewPricing = () => {
    setNewPricing({
      countryCode: "",
      currency: "",
      monthlyPrice: 0,
      yearlyPrice: 0,
      stripePriceIdMonthly: "",
      stripePriceIdYearly: "",
      isDefault: false,
    });
  };

  const handleCountryChange = (countryCode: string) => {
    const country = countries?.find(c => c.countryCode === countryCode);
    if (country) {
      setNewPricing({
        ...newPricing,
        countryCode,
        currency: country.currency,
      });
    }
  };

  const startEdit = (p: PlanPricing) => {
    setEditingId(p.id);
    setEditPricing({
      monthlyPrice: p.monthlyPrice / 100,
      yearlyPrice: p.yearlyPrice / 100,
      stripePriceIdMonthly: p.stripePriceIdMonthly || "",
      stripePriceIdYearly: p.stripePriceIdYearly || "",
      isDefault: p.isDefault,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const formatPrice = (priceInCents: number): string => {
    return (priceInCents / 100).toLocaleString();
  };

  const getCountryName = (countryCode: string): string => {
    const country = countries?.find(c => c.countryCode === countryCode);
    return country?.countryName || countryCode;
  };

  // Filter out countries that already have pricing
  const availableCountries = countries?.filter(
    c => !pricing?.some(p => p.countryCode === c.countryCode)
  ) || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Regional Pricing - {plan.name}
          </DialogTitle>
          <DialogDescription>
            Manage country-specific pricing for this subscription plan
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Existing Pricing Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Country</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Monthly</TableHead>
                  <TableHead>Yearly</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pricingLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : pricing?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                      No regional pricing configured. Add pricing for different countries.
                    </TableCell>
                  </TableRow>
                ) : (
                  pricing?.map((p) => (
                    <TableRow key={p.id}>
                      {editingId === p.id ? (
                        // Edit mode
                        <>
                          <TableCell>
                            <span className="font-medium">{getCountryName(p.countryCode)}</span>
                            <span className="text-slate-500 ml-1">({p.countryCode})</span>
                          </TableCell>
                          <TableCell>{p.currency}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={editPricing.monthlyPrice}
                              onChange={(e) => setEditPricing({ ...editPricing, monthlyPrice: parseFloat(e.target.value) || 0 })}
                              className="w-28"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={editPricing.yearlyPrice}
                              onChange={(e) => setEditPricing({ ...editPricing, yearlyPrice: parseFloat(e.target.value) || 0 })}
                              className="w-28"
                            />
                          </TableCell>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={editPricing.isDefault}
                              onChange={(e) => setEditPricing({ ...editPricing, isDefault: e.target.checked })}
                              className="w-4 h-4"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => updateMutation.mutate({ id: p.id, data: editPricing })}
                                disabled={updateMutation.isPending}
                              >
                                <Check className="w-4 h-4 text-green-600" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={cancelEdit}>
                                <X className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      ) : (
                        // View mode
                        <>
                          <TableCell>
                            <span className="font-medium">{getCountryName(p.countryCode)}</span>
                            <span className="text-slate-500 ml-1">({p.countryCode})</span>
                          </TableCell>
                          <TableCell>{p.currency}</TableCell>
                          <TableCell>{formatPrice(p.monthlyPrice)}</TableCell>
                          <TableCell>{formatPrice(p.yearlyPrice)}</TableCell>
                          <TableCell>
                            {p.isDefault && <Badge variant="default">Default</Badge>}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button size="sm" variant="ghost" onClick={() => startEdit(p)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteMutation.mutate(p.id)}
                                disabled={deleteMutation.isPending}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Add New Pricing */}
          {isAddingNew ? (
            <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-800/50 space-y-4">
              <h4 className="font-medium">Add Regional Pricing</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Select value={newPricing.countryCode} onValueChange={handleCountryChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCountries.map((country) => (
                        <SelectItem key={country.countryCode} value={country.countryCode}>
                          {country.countryName} ({country.currency})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Input value={newPricing.currency} disabled placeholder="Auto-filled" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Monthly Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newPricing.monthlyPrice}
                    onChange={(e) => setNewPricing({ ...newPricing, monthlyPrice: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Yearly Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newPricing.yearlyPrice}
                    onChange={(e) => setNewPricing({ ...newPricing, yearlyPrice: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Stripe Monthly Price ID (Optional)</Label>
                  <Input
                    value={newPricing.stripePriceIdMonthly}
                    onChange={(e) => setNewPricing({ ...newPricing, stripePriceIdMonthly: e.target.value })}
                    placeholder="price_..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Stripe Yearly Price ID (Optional)</Label>
                  <Input
                    value={newPricing.stripePriceIdYearly}
                    onChange={(e) => setNewPricing({ ...newPricing, stripePriceIdYearly: e.target.value })}
                    placeholder="price_..."
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={newPricing.isDefault}
                  onChange={(e) => setNewPricing({ ...newPricing, isDefault: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="isDefault">Set as default pricing for this plan</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setIsAddingNew(false); resetNewPricing(); }}>
                  Cancel
                </Button>
                <Button
                  onClick={() => addMutation.mutate(newPricing)}
                  disabled={!newPricing.countryCode || addMutation.isPending}
                >
                  {addMutation.isPending ? "Adding..." : "Add Pricing"}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => setIsAddingNew(true)}
              disabled={availableCountries.length === 0}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Regional Pricing
            </Button>
          )}

          {availableCountries.length === 0 && !isAddingNew && (
            <p className="text-sm text-slate-500 text-center">
              All supported countries have pricing configured.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
