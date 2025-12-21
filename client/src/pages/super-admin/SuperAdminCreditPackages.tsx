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
import { Package, Search, Edit, Trash2, Plus, ToggleLeft, ToggleRight } from "lucide-react";
import { CreditPackageModal } from "@/components/super-admin/CreditPackageModal";
import { DeleteConfirmationModal } from "@/components/super-admin/DeleteConfirmationModal";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  createdAt: string;
}

export function SuperAdminCreditPackages() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);
  const [packageModalOpen, setPackageModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const { data: packages, isLoading, refetch } = useQuery<CreditPackage[]>({
    queryKey: ["/api/super-admin/credit-packages", search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);

      const res = await apiRequest("GET", `/api/super-admin/credit-packages${params.toString() ? `?${params}` : ""}`);
      if (!res.ok) throw new Error("Failed to fetch credit packages");
      return res.json();
    }
  });

  const toggleMutation = useMutation({
    mutationFn: async (packageId: string) => {
      const res = await apiRequest("POST", `/api/super-admin/credit-packages/${packageId}/toggle`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to toggle package status");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Status updated",
        description: `Package is now ${data.isActive ? "active" : "inactive"}.`,
      });
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (packageId: string) => {
      const res = await apiRequest("DELETE", `/api/super-admin/credit-packages/${packageId}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete package");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Package deleted",
        description: "The credit package has been deactivated successfully.",
      });
      setDeleteModalOpen(false);
      setSelectedPackage(null);
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
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const openCreateModal = () => {
    setSelectedPackage(null);
    setIsCreating(true);
    setPackageModalOpen(true);
  };

  const openEditModal = (pkg: CreditPackage) => {
    setSelectedPackage(pkg);
    setIsCreating(false);
    setPackageModalOpen(true);
  };

  const openDeleteModal = (pkg: CreditPackage) => {
    setSelectedPackage(pkg);
    setDeleteModalOpen(true);
  };

  const formatPrice = (priceInCents: number, currency: string): string => {
    return `${(priceInCents / 100).toLocaleString()} ${currency}`;
  };

  const getCreditTypeBadge = (type: string) => {
    if (type === "cv_processing") {
      return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">CV Processing</Badge>;
    }
    return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Interview</Badge>;
  };

  // Group packages by type for better display
  const cvPackages = packages?.filter(p => p.creditType === "cv_processing") || [];
  const interviewPackages = packages?.filter(p => p.creditType === "interview") || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Package className="w-7 h-7" />
            Credit Packages
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Manage credit bundles for purchase
          </p>
        </div>
        <Button onClick={openCreateModal} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Package
        </Button>
      </div>

      {/* Search */}
      <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by package name..."
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
                  <TableHead>Package</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packages?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                      No credit packages found
                    </TableCell>
                  </TableRow>
                ) : (
                  packages?.map((pkg: CreditPackage) => (
                    <TableRow key={pkg.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{pkg.name}</div>
                          {pkg.description && (
                            <div className="text-sm text-slate-500 truncate max-w-[250px]">
                              {pkg.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getCreditTypeBadge(pkg.creditType)}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{pkg.creditAmount.toLocaleString()}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{formatPrice(pkg.price, pkg.currency)}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={pkg.isActive ? "default" : "secondary"}>
                          {pkg.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditModal(pkg)}
                            title="Edit Package"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleMutation.mutate(pkg.id)}
                            title={pkg.isActive ? "Deactivate" : "Activate"}
                            disabled={toggleMutation.isPending}
                          >
                            {pkg.isActive ? (
                              <ToggleRight className="w-4 h-4 text-green-600" />
                            ) : (
                              <ToggleLeft className="w-4 h-4 text-slate-400" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openDeleteModal(pkg)}
                            title="Delete Package"
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
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {packages && packages.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-linear-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/10 border-emerald-200 dark:border-emerald-800">
            <CardContent className="p-4">
              <h3 className="font-semibold text-emerald-800 dark:text-emerald-300">CV Processing Packages</h3>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{cvPackages.length}</p>
              <p className="text-sm text-emerald-600/70 dark:text-emerald-400/70">
                {cvPackages.filter(p => p.isActive).length} active
              </p>
            </CardContent>
          </Card>
          <Card className="bg-linear-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <h3 className="font-semibold text-blue-800 dark:text-blue-300">Interview Packages</h3>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{interviewPackages.length}</p>
              <p className="text-sm text-blue-600/70 dark:text-blue-400/70">
                {interviewPackages.filter(p => p.isActive).length} active
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modals */}
      <CreditPackageModal
        isOpen={packageModalOpen}
        onClose={() => setPackageModalOpen(false)}
        creditPackage={isCreating ? null : selectedPackage}
        onSuccess={() => refetch()}
      />

      {selectedPackage && (
        <DeleteConfirmationModal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title="Delete Credit Package"
          description={`Are you sure you want to delete "${selectedPackage.name}"? This will deactivate the package.`}
          onConfirm={() => deleteMutation.mutate(selectedPackage.id)}
          isLoading={deleteMutation.isPending}
        />
      )}
    </div>
  );
}
