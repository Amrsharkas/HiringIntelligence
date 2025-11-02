import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { getQueryOptions } from "@/lib/queryConfig";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  X,
  CreditCard,
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Download,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

interface PaymentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PaymentTransaction {
  id: string;
  organizationId: string;
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  stripeInvoiceId: string | null;
  creditPackageId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'canceled' | 'refunded';
  paymentMethod: string | null;
  creditsPurchased: number;
  creditsAdded: number;
  failureReason: string | null;
  refundedAmount: number;
  refundedCredits: number;
  metadata: any;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

interface PaymentStats {
  totalSpent: number;
  totalCredits: number;
  successfulTransactions: number;
  failedTransactions: number;
  refundedTransactions: number;
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'succeeded':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'failed':
    case 'canceled':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'refunded':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'succeeded':
      return <CheckCircle className="w-4 h-4" />;
    case 'failed':
    case 'canceled':
      return <XCircle className="w-4 h-4" />;
    case 'pending':
      return <Clock className="w-4 h-4" />;
    case 'refunded':
      return <RefreshCw className="w-4 h-4" />;
    default:
      return <AlertCircle className="w-4 h-4" />;
  }
};

export const PaymentHistoryModal = React.memo<PaymentHistoryModalProps>(({
  isOpen,
  onClose,
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('all');

  const { data: transactions, isLoading, error, refetch } = useQuery<PaymentTransaction[]>({
    queryKey: ["/api/payments/history", { limit: 100 }],
    ...getQueryOptions(60000), // Cache for 1 minute
    staleTime: 0,
    refetchOnWindowFocus: true,
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      } else {
        toast({
          title: "Error",
          description: "Failed to load payment history",
          variant: "destructive",
        });
      }
    },
  });

  // Calculate payment statistics
  const stats: PaymentStats = React.useMemo(() => {
    if (!transactions) {
      return {
        totalSpent: 0,
        totalCredits: 0,
        successfulTransactions: 0,
        failedTransactions: 0,
        refundedTransactions: 0,
      };
    }

    return transactions.reduce(
      (acc, transaction) => {
        if (transaction.status === 'succeeded' && !transaction.refundedAmount) {
          acc.totalSpent += transaction.amount;
          acc.totalCredits += transaction.creditsAdded;
          acc.successfulTransactions++;
        } else if (transaction.status === 'failed' || transaction.status === 'canceled') {
          acc.failedTransactions++;
        } else if (transaction.refundedAmount > 0) {
          acc.refundedTransactions++;
        }

        return acc;
      },
      {
        totalSpent: 0,
        totalCredits: 0,
        successfulTransactions: 0,
        failedTransactions: 0,
        refundedTransactions: 0,
      }
    );
  }, [transactions]);

  // Filter transactions based on active tab
  const filteredTransactions = React.useMemo(() => {
    if (!transactions) return [];

    switch (activeTab) {
      case 'successful':
        return transactions.filter(t => t.status === 'succeeded' && !t.refundedAmount);
      case 'failed':
        return transactions.filter(t => ['failed', 'canceled'].includes(t.status));
      case 'refunded':
        return transactions.filter(t => t.refundedAmount > 0);
      default:
        return transactions;
    }
  }, [transactions, activeTab]);

  const handleExportCSV = () => {
    if (!transactions || transactions.length === 0) return;

    const headers = ['Date', 'Amount', 'Currency', 'Credits', 'Status', 'Payment Method'];
    const csvContent = [
      headers.join(','),
      ...transactions.map(t => [
        formatDate(t.createdAt),
        `$${(t.amount / 100).toFixed(2)}`,
        t.currency.toUpperCase(),
        t.creditsPurchased,
        t.status,
        t.paymentMethod || 'N/A'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-history-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: "Payment history has been exported to CSV",
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <CreditCard className="w-6 h-6 text-blue-600" />
                  Payment History
                </DialogTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetch()}
                    disabled={isLoading}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportCSV}
                    disabled={!transactions || transactions.length === 0}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="h-8 w-8 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </DialogHeader>

            {/* Statistics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mb-1">
                  <DollarSign className="w-4 h-4" />
                  Total Spent
                </div>
                <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  ${(stats.totalSpent / 100).toFixed(2)}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mb-1">
                  <CreditCard className="w-4 h-4" />
                  Total Credits
                </div>
                <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {stats.totalCredits.toLocaleString()}
                </div>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 mb-1">
                  <CheckCircle className="w-4 h-4" />
                  Successful
                </div>
                <div className="text-xl font-bold text-green-700 dark:text-green-400">
                  {stats.successfulTransactions}
                </div>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 mb-1">
                  <XCircle className="w-4 h-4" />
                  Failed
                </div>
                <div className="text-xl font-bold text-red-700 dark:text-red-400">
                  {stats.failedTransactions}
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 mb-1">
                  <RefreshCw className="w-4 h-4" />
                  Refunded
                </div>
                <div className="text-xl font-bold text-blue-700 dark:text-blue-400">
                  {stats.refundedTransactions}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all" className="flex items-center gap-2">
                  All Transactions
                  {transactions && (
                    <Badge variant="secondary" className="ml-1">
                      {transactions.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="successful" className="flex items-center gap-2">
                  Successful
                  <Badge variant="secondary" className="ml-1">
                    {stats.successfulTransactions}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="failed" className="flex items-center gap-2">
                  Failed
                  <Badge variant="secondary" className="ml-1">
                    {stats.failedTransactions}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="refunded" className="flex items-center gap-2">
                  Refunded
                  <Badge variant="secondary" className="ml-1">
                    {stats.refundedTransactions}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                  </div>
                ) : error ? (
                  <div className="text-center py-12">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <p className="text-slate-600 dark:text-slate-400 mb-4">
                      Failed to load payment history
                    </p>
                    <Button onClick={() => refetch()}>
                      Try Again
                    </Button>
                  </div>
                ) : filteredTransactions.length === 0 ? (
                  <div className="text-center py-12">
                    <CreditCard className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600 dark:text-slate-400">
                      No {activeTab === 'all' ? '' : activeTab} transactions found
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredTransactions.map((transaction) => (
                      <motion.div
                        key={transaction.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:shadow-sm transition-shadow"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-full ${getStatusColor(transaction.status)}`}>
                            {getStatusIcon(transaction.status)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-900 dark:text-slate-100">
                                {transaction.creditsPurchased} credits
                              </span>
                              <Badge className={getStatusColor(transaction.status)}>
                                {transaction.status}
                              </Badge>
                              {transaction.refundedAmount > 0 && (
                                <Badge variant="outline" className="text-blue-600">
                                  Refunded
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                              <Calendar className="w-3 h-3" />
                              {formatDate(transaction.createdAt)}
                              {transaction.paymentMethod && (
                                <>
                                  <span>•</span>
                                  <span className="capitalize">{transaction.paymentMethod}</span>
                                </>
                              )}
                            </div>
                            {transaction.failureReason && (
                              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                                {transaction.failureReason}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                            ${(transaction.amount / 100).toFixed(2)}
                          </div>
                          <div className="text-sm text-slate-500">
                            {transaction.currency.toUpperCase()}
                          </div>
                          {transaction.refundedAmount > 0 && (
                            <div className="text-sm text-blue-600">
                              Refunded: ${(transaction.refundedAmount / 100).toFixed(2)}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
});

PaymentHistoryModal.displayName = "PaymentHistoryModal";