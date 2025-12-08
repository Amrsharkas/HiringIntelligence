import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MessageSquareCode,
  Search,
  Plus,
  Edit,
  Copy,
  Trash2,
  History,
  Star,
  MoreHorizontal,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { PromptModal } from "@/components/super-admin/PromptModal";
import { PromptVersionHistoryModal } from "@/components/super-admin/PromptVersionHistoryModal";
import { DeleteConfirmationModal } from "@/components/super-admin/DeleteConfirmationModal";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Prompt {
  id: string;
  name: string;
  description: string | null;
  type: string;
  systemPrompt: string;
  userPrompt: string;
  variables: any;
  modelId: string | null;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

interface PromptType {
  value: string;
  label: string;
  description: string;
}

interface PaginatedResponse {
  prompts: Prompt[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function SuperAdminPrompts() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  // Fetch prompts
  const { data, isLoading, refetch } = useQuery<PaginatedResponse>({
    queryKey: ["/api/super-admin/prompts", page, search, typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.append("search", search);
      if (typeFilter && typeFilter !== "all") params.append("type", typeFilter);

      const res = await apiRequest("GET", `/api/super-admin/prompts?${params}`);
      if (!res.ok) throw new Error("Failed to fetch prompts");
      return res.json();
    },
  });

  // Fetch prompt types
  const { data: typesData } = useQuery<{ types: PromptType[] }>({
    queryKey: ["/api/super-admin/prompts/types"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/super-admin/prompts/types`);
      if (!res.ok) throw new Error("Failed to fetch prompt types");
      return res.json();
    },
  });

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: async (promptId: string) => {
      const res = await apiRequest("POST", `/api/super-admin/prompts/${promptId}/duplicate`);
      if (!res.ok) throw new Error("Failed to duplicate prompt");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Prompt duplicated",
        description: "A copy of the prompt has been created.",
      });
      refetch();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to duplicate prompt",
        variant: "destructive",
      });
    },
  });

  // Set default mutation
  const setDefaultMutation = useMutation({
    mutationFn: async (promptId: string) => {
      const res = await apiRequest("POST", `/api/super-admin/prompts/${promptId}/set-default`);
      if (!res.ok) throw new Error("Failed to set default prompt");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Default prompt updated",
        description: "This prompt is now the default for its type.",
      });
      refetch();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to set default prompt",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (promptId: string) => {
      const res = await apiRequest("DELETE", `/api/super-admin/prompts/${promptId}`);
      if (!res.ok) throw new Error("Failed to delete prompt");
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.message.includes("deactivated") ? "Prompt deactivated" : "Prompt deleted",
        description: data.message,
      });
      setDeleteModalOpen(false);
      setSelectedPrompt(null);
      refetch();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete prompt",
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

  const openEditModal = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    setIsCreating(false);
    setEditModalOpen(true);
  };

  const openCreateModal = () => {
    setSelectedPrompt(null);
    setIsCreating(true);
    setEditModalOpen(true);
  };

  const openHistoryModal = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    setHistoryModalOpen(true);
  };

  const openDeleteModal = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    setDeleteModalOpen(true);
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "job_scoring":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "resume_parsing":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };

  const getTypeLabel = (type: string) => {
    const typeObj = typesData?.types?.find((t) => t.value === type);
    return typeObj?.label || type;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <MessageSquareCode className="w-7 h-7" />
            Prompts Management
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Manage AI prompts used for resume scoring and parsing
          </p>
        </div>
        <Button onClick={openCreateModal} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Prompt
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by prompt name..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={(value) => { setTypeFilter(value); setPage(1); }}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {typesData?.types?.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.prompts?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                      No prompts found
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.prompts?.map((prompt: Prompt) => (
                    <TableRow key={prompt.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {prompt.name}
                            {prompt.isDefault && (
                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            )}
                          </div>
                          {prompt.description && (
                            <div className="text-sm text-slate-500 truncate max-w-xs">
                              {prompt.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getTypeBadgeColor(prompt.type)} variant="secondary">
                          {getTypeLabel(prompt.type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {prompt.isActive ? (
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <XCircle className="w-3 h-3 mr-1" />
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">v{prompt.version}</Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(prompt.updatedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditModal(prompt)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => duplicateMutation.mutate(prompt.id)}>
                              <Copy className="w-4 h-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openHistoryModal(prompt)}>
                              <History className="w-4 h-4 mr-2" />
                              View History
                            </DropdownMenuItem>
                            {!prompt.isDefault && prompt.isActive && (
                              <DropdownMenuItem onClick={() => setDefaultMutation.mutate(prompt.id)}>
                                <Star className="w-4 h-4 mr-2" />
                                Set as Default
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => openDeleteModal(prompt)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              {prompt.isActive ? "Deactivate" : "Delete"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
                Showing {(page - 1) * 20 + 1} to{" "}
                {Math.min(page * 20, data.pagination.total)} of{" "}
                {data.pagination.total} prompts
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => p + 1)}
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
      <PromptModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedPrompt(null);
          setIsCreating(false);
        }}
        prompt={selectedPrompt}
        isCreating={isCreating}
        promptTypes={typesData?.types || []}
        onSuccess={() => refetch()}
      />

      {selectedPrompt && (
        <>
          <PromptVersionHistoryModal
            isOpen={historyModalOpen}
            onClose={() => setHistoryModalOpen(false)}
            prompt={selectedPrompt}
            onRollback={() => refetch()}
          />
          <DeleteConfirmationModal
            isOpen={deleteModalOpen}
            onClose={() => setDeleteModalOpen(false)}
            onConfirm={() => deleteMutation.mutate(selectedPrompt.id)}
            title={selectedPrompt.isActive ? "Deactivate Prompt" : "Delete Prompt"}
            description={
              selectedPrompt.isActive
                ? "This will deactivate the prompt. It can be reactivated later."
                : "This will permanently delete the prompt and all its version history. This action cannot be undone."
            }
            confirmText={selectedPrompt.isActive ? "Deactivate" : "Delete"}
            isDestructive
          />
        </>
      )}
    </div>
  );
}
