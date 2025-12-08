import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreditCard, Search, Edit, Globe, Copy, Trash2, Plus } from "lucide-react";
import { SubscriptionPlanModal } from "@/components/super-admin/SubscriptionPlanModal";
import { RegionalPricingModal } from "@/components/super-admin/RegionalPricingModal";
import { DeleteConfirmationModal } from "@/components/super-admin/DeleteConfirmationModal";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  createdAt: string;
}

interface PaginatedResponse {
  plans: SubscriptionPlan[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function SuperAdminSubscriptionPlans() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const { data, isLoading, refetch } = useQuery<PaginatedResponse>({
    queryKey: ["/api/super-admin/subscription-plans", page, search],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.append("search", search);

      const res = await apiRequest("GET", `/api/super-admin/subscription-plans?${params}`);
      if (!res.ok) throw new Error("Failed to fetch subscription plans");
      return res.json();
    }
  });

  const duplicateMutation = useMutation({
    mutationFn: async (planId: string) => {
      const res = await apiRequest("POST", `/api/super-admin/subscription-plans/${planId}/duplicate`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to duplicate plan");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Plan duplicated",
        description: "The plan has been duplicated successfully. It's set as inactive by default.",
      });
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Duplication failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (planId: string) => {
      const res = await apiRequest("DELETE", `/api/super-admin/subscription-plans/${planId}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete plan");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Plan deleted",
        description: data.message,
      });
      setDeleteModalOpen(false);
      setSelectedPlan(null);
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Deletion failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const openCreateModal = () => {
    setSelectedPlan(null);
    setIsCreating(true);
    setPlanModalOpen(true);
  };

  const openEditModal = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setIsCreating(false);
    setPlanModalOpen(true);
  };

  const openPricingModal = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setPricingModalOpen(true);
  };

  const openDeleteModal = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setDeleteModalOpen(true);
  };

  const handleDuplicate = (plan: SubscriptionPlan) => {
    duplicateMutation.mutate(plan.id);
  };

  const formatPrice = (priceInCents: number): string => {
    return (priceInCents / 100).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <CreditCard className="w-7 h-7" />
            Subscription Plans
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Manage subscription tiers and pricing
          </p>
        </div>
        <Button onClick={openCreateModal} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Plan
        </Button>
      </div>

      {/* Search */}
      <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by plan name..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch}>Search</Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>CV Credits</TableHead>
                  <TableHead>Interview Credits</TableHead>
                  <TableHead>Job Posts</TableHead>
                  <TableHead>Monthly Price</TableHead>
                  <TableHead>Support</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.plans?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                      No subscription plans found
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.plans?.map((plan: SubscriptionPlan) => (
                    <TableRow key={plan.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{plan.name}</div>
                          {plan.description && (
                            <div className="text-sm text-slate-500 truncate max-w-[200px]">
                              {plan.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-emerald-600">
                          {plan.monthlyCvCredits.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-blue-600">
                          {plan.monthlyInterviewCredits.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        {plan.jobPostsLimit === null ? (
                          <Badge variant="outline">Unlimited</Badge>
                        ) : (
                          plan.jobPostsLimit
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{formatPrice(plan.monthlyPrice)} EGP</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {plan.supportLevel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={plan.isActive ? "default" : "secondary"}>
                          {plan.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditModal(plan)}
                            title="Edit Plan"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openPricingModal(plan)}
                            title="Manage Regional Pricing"
                          >
                            <Globe className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDuplicate(plan)}
                            title="Duplicate Plan"
                            disabled={duplicateMutation.isPending}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openDeleteModal(plan)}
                            title="Delete Plan"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {data?.pagination && data.pagination.total > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, data.pagination.total)} of {data.pagination.total} plans
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= data.pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <SubscriptionPlanModal
        isOpen={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        plan={isCreating ? null : selectedPlan}
        onSuccess={() => refetch()}
      />

      {selectedPlan && (
        <>
          <RegionalPricingModal
            isOpen={pricingModalOpen}
            onClose={() => setPricingModalOpen(false)}
            plan={selectedPlan}
          />
          <DeleteConfirmationModal
            isOpen={deleteModalOpen}
            onClose={() => setDeleteModalOpen(false)}
            title={selectedPlan.isActive ? "Deactivate Subscription Plan" : "Permanently Delete Plan"}
            description={
              selectedPlan.isActive
                ? `Are you sure you want to deactivate "${selectedPlan.name}"? The plan will no longer be available for new subscriptions.`
                : `Are you sure you want to permanently delete "${selectedPlan.name}"? This action cannot be undone and will also remove all regional pricing for this plan.`
            }
            onConfirm={() => deleteMutation.mutate(selectedPlan.id)}
            isLoading={deleteMutation.isPending}
            confirmText={selectedPlan.isActive ? "Deactivate" : "Delete Permanently"}
          />
        </>
      )}
    </div>
  );
}
