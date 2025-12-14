import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { History, TrendingUp, TrendingDown } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

interface Organization {
  id: string;
  companyName: string;
}

interface CreditTransaction {
  id: string;
  organizationId: string;
  amount: number;
  type: string;
  actionType: string | null;
  description: string | null;
  relatedId: string | null;
  createdAt: string;
}

interface CreditHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  organization: Organization;
}

export function CreditHistoryModal({ isOpen, onClose, organization }: CreditHistoryModalProps) {
  const { data, isLoading } = useQuery<CreditTransaction[]>({
    queryKey: ["/api/super-admin/organizations", organization.id, "credits/history"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/super-admin/organizations/${organization.id}/credits/history?limit=50`);
      if (!res.ok) throw new Error("Failed to fetch credit history");
      return res.json();
    },
    enabled: isOpen,
  });

  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      cv_processing: "CV Processing",
      interview: "Interview",
      manual_adjustment: "Manual",
      subscription: "Subscription",
      purchase: "Purchase",
    };
    return labels[type] || type;
  };

  const getTypeBadgeVariant = (type: string): "default" | "secondary" | "outline" => {
    switch (type) {
      case "subscription":
        return "default";
      case "purchase":
        return "outline";
      default:
        return "secondary";
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      return format(new Date(dateString), "MMM d, yyyy HH:mm");
    } catch {
      return dateString;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Credit History
          </DialogTitle>
          <DialogDescription>
            Transaction history for {organization.companyName}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[500px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : data && data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="text-sm text-slate-600 dark:text-slate-400">
                      {formatDate(transaction.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getTypeBadgeVariant(transaction.type)}>
                        {getTypeLabel(transaction.type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {transaction.amount > 0 ? (
                          <TrendingUp className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        )}
                        <span
                          className={`font-medium ${
                            transaction.amount > 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {transaction.amount > 0 ? "+" : ""}
                          {transaction.amount}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600 dark:text-slate-400 max-w-[200px] truncate">
                      {transaction.description || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No credit transactions found</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
