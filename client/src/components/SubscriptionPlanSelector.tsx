import React, { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getQueryOptions } from "@/lib/queryConfig";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Check,
  Crown,
  Sparkles,
  Star,
  Zap,
  Loader2,
  ArrowRight,
  Building2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  monthlyCvCredits: number;
  monthlyInterviewCredits: number;
  monthlyCredits: number; // Total for backward compatibility
  jobPostsLimit: number | null;
  supportLevel: string;
  features: Record<string, any>;
  sortOrder: number;
}

interface SubscriptionPlanSelectorProps {
  onSuccess?: () => void;
}

const getPlanIcon = (name: string) => {
  if (name === 'Starter') return <Sparkles className="w-6 h-6" />;
  if (name === 'Growth') return <Star className="w-6 h-6" />;
  if (name === 'Pro') return <Zap className="w-6 h-6" />;
  if (name === 'Enterprise') return <Crown className="w-6 h-6" />;
  return <Building2 className="w-6 h-6" />;
};

const getPlanColor = (name: string) => {
  if (name === 'Starter') return 'from-blue-500 to-blue-600';
  if (name === 'Growth') return 'from-purple-500 to-purple-600';
  if (name === 'Pro') return 'from-amber-500 to-amber-600';
  if (name === 'Enterprise') return 'from-rose-500 to-rose-600';
  return 'from-slate-500 to-slate-600';
};

const formatPrice = (cents: number) => {
  return (cents / 100).toLocaleString('en-US');
};

export const SubscriptionPlanSelector: React.FC<SubscriptionPlanSelectorProps> = ({ onSuccess }) => {
  const { toast } = useToast();
  const [isYearly, setIsYearly] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const { data: plans, isLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/subscriptions/plans"],
    ...getQueryOptions(300000), // Cache for 5 minutes
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "Please log in to view subscription plans",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to load subscription plans",
          variant: "destructive",
        });
      }
    },
  });

  const subscribeMutation = useMutation({
    mutationFn: async ({
      planId,
      billingCycle,
      priceCents,
    }: {
      planId: string;
      billingCycle: 'monthly' | 'yearly';
      priceCents: number;
    }) => {
      const response = await fetch('/api/subscriptions/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, billingCycle, priceCents }),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to subscribe');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Redirect to Stripe checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Subscription Error",
        description: error.message || "Failed to create subscription",
        variant: "destructive",
      });
    },
  });

  const handleSubscribe = (plan: SubscriptionPlan) => {
    setSelectedPlanId(plan.id);
    const billingCycle = isYearly ? 'yearly' : 'monthly';
    const priceCents = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
    subscribeMutation.mutate({
      planId: plan.id,
      billingCycle,
      priceCents,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!plans || plans.length === 0) {
    return (
      <div className="text-center py-12">
        <Building2 className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <p className="text-slate-600 dark:text-slate-400">
          No subscription plans available
        </p>
      </div>
    );
  }

  const sortedPlans = [...plans].sort((a, b) => a.sortOrder - b.sortOrder);
  const yearlyDiscount = 18; // 18% discount

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
          Choose Your Plan
        </h2>
        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          AI-Powered Hiring Plans & Pricing. Each plan includes AI-powered CV analysis 
          and interview packages to streamline your recruitment process.
        </p>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-3 mt-6">
          <Label className={`text-sm ${!isYearly ? 'font-semibold' : 'text-slate-500'}`}>
            Monthly
          </Label>
          <Switch
            checked={isYearly}
            onCheckedChange={setIsYearly}
          />
          <Label className={`text-sm ${isYearly ? 'font-semibold' : 'text-slate-500'}`}>
            Yearly
            <Badge className="ml-2 bg-green-500">Save {yearlyDiscount}%</Badge>
          </Label>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {sortedPlans.map((plan, index) => {
          const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
          const pricePerMonth = isYearly ? plan.yearlyPrice / 12 : plan.monthlyPrice;
          const isPopular = plan.name === 'Growth';
          const isLoading = subscribeMutation.isLoading && selectedPlanId === plan.id;

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative"
            >
              {isPopular && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500 hover:bg-blue-600 z-10">
                  Most Popular
                </Badge>
              )}

              <Card className={`relative h-full ${isPopular ? 'ring-2 ring-blue-500 shadow-xl scale-105' : ''}`}>
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${getPlanColor(plan.name)} text-white flex items-center justify-center mb-4`}>
                    {getPlanIcon(plan.name)}
                  </div>
                  
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  
                  <div className="mt-4">
                    {price === 0 ? (
                      <div className="flex items-baseline">
                        <span className="text-3xl font-bold text-rose-600 dark:text-rose-400">
                          Contact Us
                        </span>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-baseline">
                          <span className="text-3xl font-bold">
                            {formatPrice(pricePerMonth)}
                          </span>
                          <span className="text-slate-500 ml-2">EGP/month</span>
                        </div>
                        {isYearly && (
                          <p className="text-sm text-slate-500 mt-1">
                            Billed {formatPrice(price)} EGP yearly
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400 min-h-[40px]">
                    {plan.description}
                  </p>

                  {plan.name === 'Enterprise' ? (
                    // Enterprise plan - show custom features only
                    <div className="space-y-3 py-4">
                      <div className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">Custom credit allocation</span>
                      </div>

                      <div className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">Unlimited job posts</span>
                      </div>

                      <div className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">Dedicated account manager</span>
                      </div>

                      <div className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">Priority support</span>
                      </div>

                      <div className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">Custom integrations</span>
                      </div>
                    </div>
                  ) : (
                    // Standard plans - show detailed credits
                    <div className="space-y-3 py-4">
                      <div className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">
                          {plan.monthlyCvCredits || plan.monthlyCredits} CV Processing Credits/month
                        </span>
                      </div>

                      <div className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">
                          {plan.monthlyInterviewCredits || 0} Interview Credits/month
                        </span>
                      </div>

                      <div className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">
                          ~{Math.floor((plan.monthlyCvCredits || plan.monthlyCredits) / 5)} engaged candidates/month
                        </span>
                      </div>

                      <div className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">
                          {plan.jobPostsLimit === null ? 'Unlimited' : plan.jobPostsLimit} Job Posts
                        </span>
                      </div>

                      <div className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm capitalize">
                          {plan.supportLevel} Support
                        </span>
                      </div>

                      {plan.features?.dedicatedManager && (
                        <div className="flex items-start gap-2">
                          <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-sm">Dedicated Manager</span>
                        </div>
                      )}
                    </div>
                  )}

                  <Button
                    className={`w-full ${
                      isPopular
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600'
                    }`}
                    onClick={() => handleSubscribe(plan)}
                    disabled={isLoading || subscribeMutation.isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : price === 0 ? (
                      'Contact Us'
                    ) : (
                      <>
                        Get Started
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Additional Info */}
      <div className="text-center space-y-2 pt-8 border-t">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          AI Credit Usage Per Candidate
        </h3>
        <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
          <p>• AI CV Analysis (Scan + AI Report + Match Score): <span className="font-semibold">1 CV Analysis credit</span></p>
          <p>• AI Interview Package (Persona + Technical + AI Report): <span className="font-semibold">1 Interview credit</span></p>
          <p className="font-bold text-slate-900 dark:text-white">Total per engaged candidate: 5 credits</p>
        </div>
        <p className="text-xs text-slate-500 mt-4">
          Credits expire after 30 days to ensure optimal usage.
        </p>
      </div>
    </div>
  );
};
