import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getQueryOptions } from "@/lib/queryConfig";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { SubscriptionPlanSelector } from "./SubscriptionPlanSelector";
import { CreditPackageSelector } from "./CreditPackageSelector";
import { CreditPurchaseModal } from "./CreditPurchaseModal";

interface SubscriptionManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SubscriptionManagementModal: React.FC<SubscriptionManagementModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedCreditPackage, setSelectedCreditPackage] = useState<string | null>(null);
  const [isCreditPurchaseOpen, setIsCreditPurchaseOpen] = useState(false);

  const { data: subscription, isLoading: isLoadingSubscription } = useQuery<any>({
    queryKey: ["/api/subscriptions/current"],
    ...getQueryOptions(60000),
    enabled: isOpen,
  });

  const { data: organization } = useQuery<any>({
    queryKey: ["/api/organizations/current"],
    ...getQueryOptions(30000),
    enabled: isOpen,
  });

  const cancelMutation = useMutation({
    mutationFn: async (immediate: boolean) => {
      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ immediate }),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to cancel subscription');
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

  const handlePurchaseCredits = (packageId: string) => {
    setSelectedCreditPackage(packageId);
    setIsCreditPurchaseOpen(true);
  };

  if (isLoadingSubscription) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const hasSubscription = subscription && subscription.status !== 'canceled';

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Crown className="w-6 h-6 text-blue-600" />
              Subscription Management
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="upgrade" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                {hasSubscription ? 'Change Plan' : 'Subscribe'}
              </TabsTrigger>
              <TabsTrigger value="credits" className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Buy Credits
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6 mt-6">
              {hasSubscription ? (
                <>
                  {/* Current Subscription */}
                  <div className="rounded-lg border bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <Crown className="w-5 h-5 text-blue-600" />
                          {subscription.plan.name} Plan
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                          {subscription.plan.description}
                        </p>
                      </div>
                      <Badge className={
                        subscription.status === 'active' ? 'bg-green-500' :
                        subscription.status === 'trialing' ? 'bg-blue-500' :
                        'bg-amber-500'
                      }>
                        {subscription.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-6">
                      <div className="bg-white/50 dark:bg-slate-900/50 rounded-lg p-4">
                        <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Billing Cycle</div>
                        <div className="text-lg font-semibold capitalize">{subscription.billingCycle}</div>
                      </div>
                      <div className="bg-white/50 dark:bg-slate-900/50 rounded-lg p-4">
                        <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">CV Credits/Month</div>
                        <div className="text-lg font-semibold">{subscription.plan.monthlyCvCredits || subscription.plan.monthlyCredits}</div>
                      </div>
                      <div className="bg-white/50 dark:bg-slate-900/50 rounded-lg p-4">
                        <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Interview Credits/Month</div>
                        <div className="text-lg font-semibold">{subscription.plan.monthlyInterviewCredits || 0}</div>
                      </div>
                      <div className="bg-white/50 dark:bg-slate-900/50 rounded-lg p-4">
                        <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Job Posts</div>
                        <div className="text-lg font-semibold">
                          {subscription.plan.jobPostsLimit === null ? 'Unlimited' :
                            `${organization?.jobPostsUsed || 0} / ${subscription.plan.jobPostsLimit}`}
                        </div>
                      </div>
                      <div className="bg-white/50 dark:bg-slate-900/50 rounded-lg p-4 col-span-2">
                        <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Next Billing</div>
                        <div className="text-lg font-semibold">
                          {format(new Date(subscription.currentPeriodEnd), 'MMM dd, yyyy')}
                        </div>
                      </div>
                    </div>

                    {subscription.cancelAtPeriodEnd && (
                      <Alert className="mt-4 border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-amber-800 dark:text-amber-200">
                          Your subscription will be canceled on {format(new Date(subscription.currentPeriodEnd), 'MMMM dd, yyyy')}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setActiveTab('upgrade')}
                      className="flex-1"
                    >
                      Change Plan
                    </Button>
                    {!subscription.cancelAtPeriodEnd && (
                      <Button
                        variant="destructive"
                        onClick={() => cancelMutation.mutate(false)}
                        disabled={cancelMutation.isLoading}
                      >
                        {cancelMutation.isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Canceling...
                          </>
                        ) : (
                          <>
                            <X className="w-4 h-4 mr-2" />
                            Cancel Subscription
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800 dark:text-amber-200">
                    You don't have an active subscription. Subscribe to a plan to access platform features.
                  </AlertDescription>
                </Alert>
              )}

              {/* Current Credits */}
              <div className="rounded-lg border bg-gradient-to-br from-emerald-50 to-cyan-50 dark:from-emerald-950 dark:to-cyan-950 p-6">
                <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                  Current Balance
                </h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-white/50 dark:bg-slate-900/50 rounded-lg p-4">
                    <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">CV Processing</div>
                    <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">
                      {(organization?.cvProcessingCredits || 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">credits</div>
                  </div>
                  <div className="bg-white/50 dark:bg-slate-900/50 rounded-lg p-4">
                    <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Interviews</div>
                    <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                      {(organization?.interviewCredits || 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">credits</div>
                  </div>
                </div>
                <Button
                  onClick={() => setActiveTab('credits')}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Purchase Additional Credits
                </Button>
              </div>
            </TabsContent>

            {/* Upgrade/Subscribe Tab */}
            <TabsContent value="upgrade" className="mt-6">
              <SubscriptionPlanSelector onSuccess={onClose} />
            </TabsContent>

            {/* Buy Credits Tab */}
            <TabsContent value="credits" className="mt-6">
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-xl font-bold mb-2">Additional Credit Packs</h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Purchase credits anytime to supplement your subscription
                  </p>
                </div>
                <CreditPackageSelector
                  selectedPackageId={selectedCreditPackage}
                  onPackageSelect={setSelectedCreditPackage}
                  onPurchase={handlePurchaseCredits}
                />
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Credit Purchase Modal */}
      <CreditPurchaseModal
        isOpen={isCreditPurchaseOpen}
        onClose={() => {
          setIsCreditPurchaseOpen(false);
          setSelectedCreditPackage(null);
        }}
        selectedPackageId={selectedCreditPackage}
      />
    </>
  );
};
