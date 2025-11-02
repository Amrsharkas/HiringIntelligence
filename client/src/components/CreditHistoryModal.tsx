import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { getQueryOptions } from "@/lib/queryConfig";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  X,
  CreditCard,
  TrendingDown,
  TrendingUp,
  FileText,
  Clock,
  Activity,
  BarChart3,
  Plus,
  Minus,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

interface CreditHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CreditTransaction {
  id: string;
  organizationId: string;
  amount: number;
  type: string;
  description: string | null;
  relatedId: string | null;
  createdAt: string;
}

interface CreditUsage {
  totalDeducted: number;
  totalAdded: number;
  resumeProcessingCount: number;
  manualAdjustments: number;
}

interface CreditBalance {
  currentCredits: number;
  creditLimit: number;
  remainingCredits: number;
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const getTransactionIcon = (type: string) => {
  switch (type) {
    case 'resume_processing':
      return <FileText className="w-4 h-4" />;
    case 'manual_adjustment':
      return <Activity className="w-4 h-4" />;
    default:
      return <CreditCard className="w-4 h-4" />;
  }
};

const getTransactionLabel = (type: string) => {
  switch (type) {
    case 'resume_processing':
      return 'Resume Processing';
    case 'manual_adjustment':
      return 'Manual Adjustment';
    default:
      return type;
  }
};

const TransactionList = () => {
  const { toast } = useToast();

  const { data: transactions = [], isLoading, error } = useQuery<CreditTransaction[]>({
    queryKey: ["/api/organizations/current/credits/history"],
    ...getQueryOptions(30000),
    staleTime: 0,
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
      }
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Failed to load transaction history
        </p>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CreditCard className="w-12 h-12 text-slate-400 mb-3 opacity-50" />
        <p className="text-sm text-slate-600 dark:text-slate-400">
          No transactions yet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
      {transactions.map((transaction, index) => {
        const isDeduction = transaction.amount < 0;
        const absoluteAmount = Math.abs(transaction.amount);

        return (
          <motion.div
            key={transaction.id}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700/50 hover:border-slate-200 dark:hover:border-slate-600 transition-colors"
          >
            {/* Icon */}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                isDeduction
                  ? 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                  : 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
              }`}
            >
              {isDeduction ? (
                <Minus className="w-4 h-4" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      {getTransactionLabel(transaction.type)}
                    </h4>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        isDeduction
                          ? 'border-red-200 text-red-700 dark:border-red-800 dark:text-red-400'
                          : 'border-green-200 text-green-700 dark:border-green-800 dark:text-green-400'
                      }`}
                    >
                      {isDeduction ? '-' : '+'}
                      {absoluteAmount} credit{absoluteAmount !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  {transaction.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      {transaction.description}
                    </p>
                  )}
                  <div className="flex items-center gap-1 mt-1 text-xs text-slate-500 dark:text-slate-500">
                    <Clock className="w-3 h-3" />
                    <span>{formatDateTime(transaction.createdAt)}</span>
                  </div>
                </div>

                {/* Amount */}
                <div
                  className={`text-sm font-semibold ${
                    isDeduction
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-green-600 dark:text-green-400'
                  }`}
                >
                  {isDeduction ? '-' : '+'}
                  {absoluteAmount}
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

const UsageStats = () => {
  const { toast } = useToast();

  const { data: usage, isLoading, error } = useQuery<CreditUsage>({
    queryKey: ["/api/organizations/current/credits/usage"],
    ...getQueryOptions(30000),
    staleTime: 0,
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
      }
    },
  });

  const { data: balance } = useQuery<CreditBalance>({
    queryKey: ["/api/organizations/current/credits"],
    ...getQueryOptions(30000),
    staleTime: 0,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !usage) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Failed to load usage statistics
        </p>
      </div>
    );
  }

  const stats = [
    {
      label: 'Total Credits Added',
      value: usage.totalAdded,
      icon: <TrendingUp className="w-5 h-5" />,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      label: 'Total Credits Used',
      value: usage.totalDeducted,
      icon: <TrendingDown className="w-5 h-5" />,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
    },
    {
      label: 'Resume Processing',
      value: usage.resumeProcessingCount,
      icon: <FileText className="w-5 h-5" />,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      label: 'Manual Adjustments',
      value: usage.manualAdjustments,
      icon: <Activity className="w-5 h-5" />,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Current Balance */}
      {balance && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 rounded-lg p-6 border border-blue-200 dark:border-blue-800"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">
                Current Balance
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-blue-700 dark:text-blue-300">
                  {balance.remainingCredits}
                </span>
                <span className="text-sm text-blue-600/70 dark:text-blue-400/70">
                  / {balance.creditLimit} credits
                </span>
              </div>
            </div>
            <CreditCard className="w-12 h-12 text-blue-600/30 dark:text-blue-400/30" />
          </div>
          <div className="mt-4">
            <div className="w-full bg-blue-200 dark:bg-blue-900/30 rounded-full h-2">
              <div
                className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.max((balance.remainingCredits / balance.creditLimit) * 100, 5)}%`,
                }}
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.1 }}
            className={`${stat.bgColor} rounded-lg p-4 border border-slate-100 dark:border-slate-700/50`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className={stat.color}>{stat.icon}</div>
              <span className={`text-2xl font-bold ${stat.color}`}>
                {stat.value}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              {stat.label}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Net Usage */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Net Usage
            </span>
          </div>
          <span className="text-lg font-bold text-slate-800 dark:text-slate-200">
            {usage.totalAdded - usage.totalDeducted} credits
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
          Total credits added minus total credits used
        </p>
      </motion.div>
    </div>
  );
};

export function CreditHistoryModal({ isOpen, onClose }: CreditHistoryModalProps) {
  const [activeTab, setActiveTab] = useState("history");

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <CreditCard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                Credit Management
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              View your credit history and usage statistics
            </p>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="history" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Transaction History
                </TabsTrigger>
                <TabsTrigger value="usage" className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Usage Stats
                </TabsTrigger>
              </TabsList>

              <TabsContent value="history">
                <TransactionList />
              </TabsContent>

              <TabsContent value="usage">
                <UsageStats />
              </TabsContent>
            </Tabs>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
