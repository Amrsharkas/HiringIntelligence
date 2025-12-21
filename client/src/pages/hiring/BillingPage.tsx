import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Crown,
  CreditCard,
  Calendar,
  AlertCircle,
  CheckCircle,
  Loader2,
  X,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  FileText,
  Video,
  ArrowRight,
  Zap,
  Clock,
  Building2,
  Users,
  Headphones,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { getQueryOptions } from "@/lib/queryConfig";

export default function BillingPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: subscription, isLoading: isLoadingSubscription } = useQuery<any>({
    queryKey: ["/api/subscriptions/current"],
    ...getQueryOptions(60000),
  });

  const { data: organization } = useQuery<any>({
    queryKey: ["/api/organizations/current"],
    ...getQueryOptions(30000),
  });

  const cancelMutation = useMutation({
    mutationFn: async (immediate: boolean) => {
      const response = await fetch("/api/subscriptions/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ immediate }),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to cancel subscription");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Subscription Canceled",
        description: "Your subscription will be canceled at the end of the billing period.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions/current"] });
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const hasSubscription = subscription && subscription.status !== "canceled";
  const cvCredits = organization?.cvProcessingCredits || 0;
  const interviewCredits = organization?.interviewCredits || 0;
  const monthlyCvCredits = subscription?.plan?.monthlyCvCredits || subscription?.plan?.monthlyCredits || 100;
  const monthlyInterviewCredits = subscription?.plan?.monthlyInterviewCredits || 10;

  const cvUsagePercent = Math.min((cvCredits / monthlyCvCredits) * 100, 100);
  const interviewUsagePercent = Math.min((interviewCredits / monthlyInterviewCredits) * 100, 100);

  if (isLoadingSubscription) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <CreditCard className="w-6 h-6 text-primary dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
              Billing & Credits
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Manage your subscription and credit balance
            </p>
          </div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card
            className="bg-primary text-white border-0 cursor-pointer hover:shadow-xl transition-all hover:scale-[1.02]"
            onClick={() => navigate("/hiring/billing/plans")}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Subscription Plans</h3>
                  <p className="text-white/80 text-sm">
                    {hasSubscription ? "Manage or upgrade your plan" : "Choose a plan to get started"}
                  </p>
                </div>
                <div className="p-3 bg-white/20 rounded-xl">
                  <Crown className="w-6 h-6" />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4 text-white/90">
                <span className="text-sm font-medium">View Plans</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card
            className="bg-linear-to-br from-emerald-500 to-cyan-600 text-white border-0 cursor-pointer hover:shadow-xl transition-all hover:scale-[1.02]"
            onClick={() => navigate("/hiring/billing/credits")}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Purchase Credits</h3>
                  <p className="text-white/80 text-sm">Buy additional CV or interview credits</p>
                </div>
                <div className="p-3 bg-white/20 rounded-xl">
                  <ShoppingCart className="w-6 h-6" />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4 text-white/90">
                <span className="text-sm font-medium">Buy Credits</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Credit Balance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Credit Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* CV Credits */}
              <div className="p-4 rounded-xl bg-linear-to-br from-emerald-50 to-cyan-50 dark:from-emerald-950/30 dark:to-cyan-950/30">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
                      <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      CV Processing
                    </span>
                  </div>
                  <Badge variant="outline" className="text-emerald-600 border-emerald-300">
                    {cvCredits.toLocaleString()} available
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Monthly allocation</span>
                    <span className="font-medium">{monthlyCvCredits.toLocaleString()}</span>
                  </div>
                  <Progress value={cvUsagePercent} className="h-2 bg-emerald-200 dark:bg-emerald-900" />
                  <p className="text-xs text-slate-500">
                    {cvCredits > monthlyCvCredits
                      ? "You have bonus credits from purchases"
                      : `${Math.round(cvUsagePercent)}% of monthly credits remaining`}
                  </p>
                </div>
              </div>

              {/* Interview Credits */}
              <div className="p-4 rounded-xl bg-linear-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
                      <Video className="w-4 h-4 text-primary dark:text-blue-400" />
                    </div>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      Interviews
                    </span>
                  </div>
                  <Badge variant="outline" className="text-primary border-blue-300">
                    {interviewCredits.toLocaleString()} available
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Monthly allocation</span>
                    <span className="font-medium">{monthlyInterviewCredits.toLocaleString()}</span>
                  </div>
                  <Progress value={interviewUsagePercent} className="h-2 bg-blue-200 dark:bg-blue-900" />
                  <p className="text-xs text-slate-500">
                    {interviewCredits > monthlyInterviewCredits
                      ? "You have bonus credits from purchases"
                      : `${Math.round(interviewUsagePercent)}% of monthly credits remaining`}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Current Subscription */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-500" />
              Current Subscription
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasSubscription ? (
              <div className="space-y-6">
                {/* Plan Info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary text-white">
                      <Crown className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        {subscription.plan.name} Plan
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {subscription.plan.description}
                      </p>
                    </div>
                  </div>
                  <Badge
                    className={
                      subscription.status === "active"
                        ? "bg-green-500"
                        : subscription.status === "trialing"
                        ? "bg-primary"
                        : "bg-amber-500"
                    }
                  >
                    {subscription.status}
                  </Badge>
                </div>

                {/* Plan Features */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-center">
                    <FileText className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                    <p className="text-lg font-bold text-slate-900 dark:text-white">
                      {subscription.plan.monthlyCvCredits || subscription.plan.monthlyCredits}
                    </p>
                    <p className="text-xs text-slate-500">CV Credits/mo</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-center">
                    <Video className="w-5 h-5 text-primary mx-auto mb-1" />
                    <p className="text-lg font-bold text-slate-900 dark:text-white">
                      {subscription.plan.monthlyInterviewCredits || 0}
                    </p>
                    <p className="text-xs text-slate-500">Interview/mo</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-center">
                    <Building2 className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                    <p className="text-lg font-bold text-slate-900 dark:text-white">
                      {subscription.plan.jobPostsLimit === null
                        ? "\u221E"
                        : subscription.plan.jobPostsLimit}
                    </p>
                    <p className="text-xs text-slate-500">Job Posts</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-center">
                    <Headphones className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                    <p className="text-lg font-bold text-slate-900 dark:text-white capitalize">
                      {subscription.plan.supportLevel || "Standard"}
                    </p>
                    <p className="text-xs text-slate-500">Support</p>
                  </div>
                </div>

                {/* Billing Info */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t dark:border-slate-700">
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-sm text-slate-500">Billing Cycle</p>
                      <p className="font-medium capitalize">{subscription.billingCycle}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Next Billing</p>
                      <p className="font-medium">
                        {format(new Date(subscription.currentPeriodEnd), "MMM dd, yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => navigate("/hiring/billing/plans")}>
                      Change Plan
                    </Button>
                    {!subscription.cancelAtPeriodEnd && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                        onClick={() => {
                          if (window.confirm("Are you sure you want to cancel your subscription?")) {
                            cancelMutation.mutate(false);
                          }
                        }}
                        disabled={cancelMutation.isPending}
                      >
                        {cancelMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Cancellation Notice */}
                {subscription.cancelAtPeriodEnd && (
                  <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800 dark:text-amber-200">
                        Subscription Canceling
                      </p>
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        Your subscription will end on{" "}
                        {format(new Date(subscription.currentPeriodEnd), "MMMM dd, yyyy")}. You can
                        continue using all features until then.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Crown className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  No Active Subscription
                </h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
                  Choose a plan to unlock AI-powered CV analysis, interview scheduling, and more.
                </p>
                <Button
                  onClick={() => navigate("/hiring/billing/plans")}
                >
                  <Crown className="w-4 h-4 mr-2" />
                  View Plans
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
