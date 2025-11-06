import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryOptions } from "@/lib/queryConfig";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Crown,
  Calendar,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Loader2,
  Sparkles,
  Star,
  Zap,
  Building2,
} from "lucide-react";
import { format } from "date-fns";

interface SubscriptionStatusCardProps {
  onManageClick?: () => void;
  onUpgradeClick?: () => void;
}

const getPlanIcon = (name: string) => {
  if (name === 'Starter') return <Sparkles className="w-5 h-5" />;
  if (name === 'Growth') return <Star className="w-5 h-5" />;
  if (name === 'Pro') return <Zap className="w-5 h-5" />;
  if (name === 'Enterprise') return <Crown className="w-5 h-5" />;
  return <Building2 className="w-5 h-5" />;
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'active':
      return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
    case 'trialing':
      return <Badge className="bg-blue-500"><Sparkles className="w-3 h-3 mr-1" />Trial</Badge>;
    case 'past_due':
      return <Badge className="bg-amber-500"><AlertCircle className="w-3 h-3 mr-1" />Past Due</Badge>;
    case 'canceled':
      return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Canceled</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

export const SubscriptionStatusCard: React.FC<SubscriptionStatusCardProps> = ({
  onManageClick,
  onUpgradeClick,
}) => {
  const { data: subscription, isLoading, error } = useQuery({
    queryKey: ["/api/subscriptions/current"],
    ...getQueryOptions(60000), // Cache for 1 minute
  });

  const { data: organization } = useQuery({
    queryKey: ["/api/organizations/current"],
    ...getQueryOptions(60000),
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  if (error || !subscription) {
    return (
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-100">
            <AlertCircle className="w-5 h-5" />
            No Active Subscription
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            You need an active subscription to access the platform features.
          </p>
          <Button 
            onClick={onUpgradeClick}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            Choose a Plan
          </Button>
        </CardContent>
      </Card>
    );
  }

  const plan = subscription.plan;
  const daysUntilRenewal = Math.ceil(
    (new Date(subscription.currentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  
  const jobPostsPercentage = plan.jobPostsLimit 
    ? ((organization?.jobPostsUsed || 0) / plan.jobPostsLimit) * 100 
    : 0;

  const formatPrice = (cents: number) => {
    return (cents / 100).toLocaleString('en-US');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {getPlanIcon(plan.name)}
            {plan.name} Plan
          </CardTitle>
          {getStatusBadge(subscription.status)}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Subscription Info */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Billing Cycle
            </span>
            <span className="font-medium capitalize">{subscription.billingCycle}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Next Billing
            </span>
            <span className="font-medium">
              {format(new Date(subscription.currentPeriodEnd), 'MMM dd, yyyy')}
            </span>
          </div>

          {daysUntilRenewal <= 7 && subscription.status === 'active' && (
            <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 p-2 rounded">
              <AlertCircle className="w-3 h-3 inline mr-1" />
              Renews in {daysUntilRenewal} day{daysUntilRenewal !== 1 ? 's' : ''}
            </div>
          )}

          {subscription.cancelAtPeriodEnd && (
            <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 p-2 rounded">
              <AlertCircle className="w-3 h-3 inline mr-1" />
              Subscription will be canceled on {format(new Date(subscription.currentPeriodEnd), 'MMM dd, yyyy')}
            </div>
          )}
        </div>

        {/* Plan Features */}
        <div className="space-y-3 pt-3 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">Monthly Credits</span>
            <span className="font-semibold text-blue-600">{plan.monthlyCredits}</span>
          </div>

          {/* Job Posts Usage */}
          {plan.jobPostsLimit !== null && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Job Posts</span>
                <span className="font-medium">
                  {organization?.jobPostsUsed || 0} / {plan.jobPostsLimit}
                </span>
              </div>
              <Progress value={jobPostsPercentage} className="h-2" />
              {jobPostsPercentage >= 80 && (
                <p className="text-xs text-amber-600">
                  {jobPostsPercentage >= 100 
                    ? 'Job post limit reached. Upgrade to post more jobs.' 
                    : 'Approaching job post limit'}
                </p>
              )}
            </div>
          )}

          {plan.jobPostsLimit === null && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Job Posts</span>
              <Badge variant="secondary">Unlimited</Badge>
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">Support Level</span>
            <span className="font-medium capitalize">{plan.supportLevel}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-3 border-t">
          {onManageClick && (
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={onManageClick}
            >
              Manage
            </Button>
          )}
          {onUpgradeClick && plan.name !== 'Enterprise' && (
            <Button 
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              onClick={onUpgradeClick}
            >
              Upgrade
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
