import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
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
import { Building2, Search, Edit, CreditCard, History, Sparkles } from "lucide-react";
import { CompanyEditModal } from "@/components/super-admin/CompanyEditModal";
import { AddCreditsModal } from "@/components/super-admin/AddCreditsModal";
import { CreditHistoryModal } from "@/components/super-admin/CreditHistoryModal";
import { apiRequest } from "@/lib/queryClient";

interface Organization {
  id: string;
  companyName: string;
  url: string;
  industry: string | null;
  companySize: string | null;
  description: string | null;
  cvProcessingCredits: number;
  interviewCredits: number;
  subscriptionStatus: string | null;
  createdAt: string;
}

interface PaginatedResponse {
  organizations: Organization[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function SuperAdminCompanies() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [creditsModalOpen, setCreditsModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  const { data, isLoading, refetch } = useQuery<PaginatedResponse>({
    queryKey: ["/api/super-admin/organizations", page, search],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.append("search", search);

      const res = await apiRequest("GET", `/api/super-admin/organizations?${params}`);
      if (!res.ok) throw new Error("Failed to fetch organizations");
      return res.json();
    }
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

  const openEditModal = (org: Organization) => {
    setSelectedOrg(org);
    setEditModalOpen(true);
  };

  const openCreditsModal = (org: Organization) => {
    setSelectedOrg(org);
    setCreditsModalOpen(true);
  };

  const openHistoryModal = (org: Organization) => {
    setSelectedOrg(org);
    setHistoryModalOpen(true);
  };

  const getStatusBadgeVariant = (status: string | null): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "active":
        return "default";
      case "trialing":
        return "outline";
      case "past_due":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Building2 className="w-7 h-7" />
            Companies Management
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            View and manage all organizations on the platform
          </p>
        </div>
      </div>

      {/* Search */}
      <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by company name..."
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
                  <TableHead>Company</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>CV Credits</TableHead>
                  <TableHead>Interview Credits</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.organizations?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                      No organizations found
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.organizations?.map((org: Organization) => (
                    <TableRow key={org.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{org.companyName}</div>
                          <div className="text-sm text-slate-500">{org.url}</div>
                        </div>
                      </TableCell>
                      <TableCell>{org.industry || "-"}</TableCell>
                      <TableCell>{org.companySize || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Sparkles className="w-4 h-4 text-emerald-500" />
                          <span className="font-medium">{org.cvProcessingCredits}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Sparkles className="w-4 h-4 text-blue-500" />
                          <span className="font-medium">{org.interviewCredits}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(org.subscriptionStatus)}>
                          {org.subscriptionStatus || "inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditModal(org)}
                            title="Edit Company"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openCreditsModal(org)}
                            title="Add Credits"
                          >
                            <CreditCard className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openHistoryModal(org)}
                            title="View History"
                          >
                            <History className="w-4 h-4" />
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
                Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, data.pagination.total)} of {data.pagination.total} companies
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
      {selectedOrg && (
        <>
          <CompanyEditModal
            isOpen={editModalOpen}
            onClose={() => setEditModalOpen(false)}
            organization={selectedOrg}
            onSuccess={() => refetch()}
          />
          <AddCreditsModal
            isOpen={creditsModalOpen}
            onClose={() => setCreditsModalOpen(false)}
            organization={selectedOrg}
            onSuccess={() => refetch()}
          />
          <CreditHistoryModal
            isOpen={historyModalOpen}
            onClose={() => setHistoryModalOpen(false)}
            organization={selectedOrg}
          />
        </>
      )}
    </div>
  );
}
