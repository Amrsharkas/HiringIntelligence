import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  History,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Loader2,
  Clock,
  User,
  FileText,
} from "lucide-react";

interface Prompt {
  id: string;
  name: string;
  version: number;
}

interface PromptVersion {
  id: string;
  promptId: string;
  version: number;
  systemPrompt: string;
  userPrompt: string;
  variables: any;
  modelId: string | null;
  changedBy: string | null;
  changeNote: string | null;
  createdAt: string;
}

interface PromptVersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: Prompt;
  onRollback: () => void;
}

interface PaginatedVersionsResponse {
  versions: PromptVersion[];
  currentVersion: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function PromptVersionHistoryModal({
  isOpen,
  onClose,
  prompt,
  onRollback,
}: PromptVersionHistoryModalProps) {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery<PaginatedVersionsResponse>({
    queryKey: ["/api/super-admin/prompts", prompt.id, "versions", page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "10" });
      const res = await apiRequest(
        "GET",
        `/api/super-admin/prompts/${prompt.id}/versions?${params}`
      );
      if (!res.ok) throw new Error("Failed to fetch version history");
      return res.json();
    },
    enabled: isOpen,
  });

  const rollbackMutation = useMutation({
    mutationFn: async (versionId: string) => {
      const res = await apiRequest(
        "POST",
        `/api/super-admin/prompts/${prompt.id}/rollback/${versionId}`
      );
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to rollback");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Rollback successful",
        description: data.message,
      });
      refetch();
      onRollback();
    },
    onError: (error: Error) => {
      toast({
        title: "Rollback failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleExpanded = (versionId: string) => {
    setExpandedVersion(expandedVersion === versionId ? null : versionId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Version History: {prompt.name}
          </DialogTitle>
          <DialogDescription>
            Current version: <Badge variant="outline">v{data?.currentVersion || prompt.version}</Badge>
            {" | "}
            {data?.pagination?.total || 0} previous versions
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : data?.versions?.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <History className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No version history yet</p>
              <p className="text-sm mt-2">
                Version history will be recorded when you make changes to the prompt
              </p>
            </div>
          ) : (
            <div className="space-y-3 pr-4">
              {data?.versions?.map((version) => (
                <Collapsible
                  key={version.id}
                  open={expandedVersion === version.id}
                  onOpenChange={() => toggleExpanded(version.id)}
                >
                  <div className="border rounded-lg bg-white dark:bg-slate-900">
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
                        <div className="flex items-center gap-4">
                          <Badge variant="secondary">v{version.version}</Badge>
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Clock className="w-4 h-4" />
                            {formatDate(version.createdAt)}
                          </div>
                          {version.changedBy && (
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                              <User className="w-4 h-4" />
                              {version.changedBy}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {expandedVersion === version.id ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="px-4 pb-4 space-y-4 border-t">
                        {version.changeNote && (
                          <div className="pt-4">
                            <div className="flex items-center gap-2 text-sm font-medium mb-1">
                              <FileText className="w-4 h-4" />
                              Change Note
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-2 rounded">
                              {version.changeNote}
                            </p>
                          </div>
                        )}

                        <div>
                          <div className="text-sm font-medium mb-1">System Prompt</div>
                          <div className="bg-slate-50 dark:bg-slate-800 rounded p-3 max-h-40 overflow-auto">
                            <pre className="text-xs font-mono whitespace-pre-wrap">
                              {version.systemPrompt.length > 500
                                ? `${version.systemPrompt.substring(0, 500)}...`
                                : version.systemPrompt}
                            </pre>
                          </div>
                        </div>

                        <div>
                          <div className="text-sm font-medium mb-1">User Prompt</div>
                          <div className="bg-slate-50 dark:bg-slate-800 rounded p-3 max-h-40 overflow-auto">
                            <pre className="text-xs font-mono whitespace-pre-wrap">
                              {version.userPrompt.length > 500
                                ? `${version.userPrompt.substring(0, 500)}...`
                                : version.userPrompt}
                            </pre>
                          </div>
                        </div>

                        {version.modelId && (
                          <div className="text-sm">
                            <span className="font-medium">Model:</span>{" "}
                            <code className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                              {version.modelId}
                            </code>
                          </div>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => rollbackMutation.mutate(version.id)}
                          disabled={rollbackMutation.isPending}
                          className="w-full"
                        >
                          {rollbackMutation.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <RotateCcw className="w-4 h-4 mr-2" />
                          )}
                          Rollback to this version
                        </Button>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          )}

          {/* Pagination */}
          {data?.pagination && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t mt-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Page {page} of {data.pagination.totalPages}
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
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
