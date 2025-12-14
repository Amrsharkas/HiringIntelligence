import React, { memo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryOptions } from "@/lib/queryConfig";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  TrendingDown,
  AlertTriangle,
  Plus,
  Info
} from "lucide-react";
import { motion } from "framer-motion";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";
import { CreditHistoryModal } from "./CreditHistoryModal";
import { CreditPurchaseModal } from "./CreditPurchaseModal";

interface CreditBalance {
  cvProcessingCredits: number;
  interviewCredits: number;
  // Legacy fields for backward compatibility
  currentCredits: number;
  creditLimit: number;
  remainingCredits: number;
}

const CreditBalanceDisplay = memo(({
  onViewHistory,
  onTopUp
}: {
  onViewHistory?: () => void;
  onTopUp?: () => void;
}) => {
  const { toast } = useToast();

  const { data: creditBalance, isLoading, error } = useQuery<CreditBalance>({
    queryKey: ["/api/organizations/current/credits"],
    ...getQueryOptions(60000), // Refresh every minute
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  // Handle unauthorized errors
  React.useEffect(() => {
    if (error && isUnauthorizedError(error as any)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [error, toast]);

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 h-full flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !creditBalance) {
    return (
      <div className="p-4 sm:p-6 h-full flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-slate-600 dark:text-slate-400">Unable to load credits</p>
        </div>
      </div>
    );
  }

  const cvCredits = creditBalance.cvProcessingCredits || 0;
  const interviewCredits = creditBalance.interviewCredits || 0;
  const isLowCvCredits = cvCredits <= 100;
  const isVeryLowCvCredits = cvCredits <= 5;
  const isLowInterviewCredits = interviewCredits <= 50;
  const isVeryLowInterviewCredits = interviewCredits <= 5;
  const isLowCredits = isLowCvCredits || isLowInterviewCredits;

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div className="group-hover:scale-110 transition-transform duration-200">
          <CreditCard className="w-6 h-6 sm:w-8 sm:h-8 text-primary dark:text-blue-400" />
        </div>
        <div className="text-right">
          {isLowCredits && (
            <Badge
              variant={(isVeryLowCvCredits || isVeryLowInterviewCredits) ? "destructive" : "secondary"}
              className="text-xs mb-1"
            >
              {(isVeryLowCvCredits || isVeryLowInterviewCredits) ? "Very Low" : "Low"} Credits
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {/* CV Processing Credits */}
        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
              CV Processing
            </p>
            <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
              {cvCredits.toLocaleString()}
            </div>
          </div>
          <div className="w-full bg-emerald-200 dark:bg-emerald-700 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${
                isVeryLowCvCredits
                  ? 'bg-red-500'
                  : isLowCvCredits
                    ? 'bg-yellow-500'
                    : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.max(Math.min((cvCredits / 1000) * 100, 100), 5)}%` }}
            />
          </div>
        </div>

        {/* Interview Credits */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
              Interviews
            </p>
            <div className="text-xl font-bold text-blue-700 dark:text-blue-300">
              {interviewCredits.toLocaleString()}
            </div>
          </div>
          <div className="w-full bg-blue-200 dark:bg-blue-700 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${
                isVeryLowInterviewCredits
                  ? 'bg-red-500'
                  : isLowInterviewCredits
                    ? 'bg-yellow-500'
                    : 'bg-primary'
              }`}
              style={{ width: `${Math.max(Math.min((interviewCredits / 500) * 100, 100), 5)}%` }}
            />
          </div>
        </div>

        {isLowCredits && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded"
          >
            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
            <span>
              {isVeryLowCvCredits || isVeryLowInterviewCredits
                ? "Very low credits! Consider purchasing more."
                : "Low credits. Top up to continue using all features."
              }
            </span>
          </motion.div>
        )}

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1">
            {isLowCredits && onTopUp && (
              <Button
                size="sm"
                variant="default"
                className="h-6 px-2 text-xs bg-primary hover:bg-blue-700 text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  onTopUp();
                }}
              >
                <Plus className="w-3 h-3 mr-1" />
                Top Up
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-xs text-primary hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30"
              onClick={(e) => {
                e.stopPropagation();
                if (onViewHistory) {
                  onViewHistory();
                }
              }}
            >
              <Info className="w-3 h-3 mr-1" />
              Details
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});

CreditBalanceDisplay.displayName = "CreditBalanceDisplay";

export const CreditBalanceCard = memo(() => {
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="group relative bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/60 rounded-2xl cursor-pointer hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50 hover:border-slate-300/60 dark:hover:border-slate-600/60 transition-all duration-300 will-change-transform"
        whileHover={{
          scale: 1.02,
          transition: { duration: 0.2 }
        }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsHistoryModalOpen(true)}
      >
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Info className="w-4 h-4 text-slate-400" />
        </div>
        <CreditBalanceDisplay
          onViewHistory={() => setIsHistoryModalOpen(true)}
          onTopUp={() => setIsPurchaseModalOpen(true)}
        />
      </motion.div>

      <CreditHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
      />

      <CreditPurchaseModal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        onSuccess={() => {
          // Refresh credit data after successful purchase
          window.location.reload();
        }}
      />
    </>
  );
});

CreditBalanceCard.displayName = "CreditBalanceCard";