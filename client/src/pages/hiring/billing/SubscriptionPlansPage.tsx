import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  Check,
  Crown,
  Sparkles,
  Star,
  Zap,
  Loader2,
  ArrowRight,
  Building2,
  Globe,
  FileText,
  Users,
  Headphones,
  Video,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getQueryOptions } from "@/lib/queryConfig";

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  countryCode: string;
  monthlyCvCredits: number;
  monthlyInterviewCredits: number;
  monthlyCredits: number;
  jobPostsLimit: number | null;
  supportLevel: string;
  features: Record<string, any>;
  sortOrder: number;
}

const getPlanIcon = (name: string) => {
  const icons: Record<string, JSX.Element> = {
    Starter: <Sparkles className="w-6 h-6" />,
    Growth: <Star className="w-6 h-6" />,
    Pro: <Zap className="w-6 h-6" />,
    Enterprise: <Crown className="w-6 h-6" />,
  };
  return icons[name] || <Building2 className="w-6 h-6" />;
};

const getPlanGradient = (name: string) => {
  const gradients: Record<string, string> = {
    Starter: "bg-primary",
    Growth: "from-purple-500 to-pink-500",
    Pro: "from-amber-500 to-orange-500",
    Enterprise: "from-rose-500 to-red-600",
  };
  return gradients[name] || "from-slate-500 to-slate-600";
};

const formatPrice = (cents: number, currency: string = "EGP") => {
  const amount = cents / 100;
  if (currency === "USD") {
    return `$${amount.toLocaleString("en-US")}`;
  }
  return `${amount.toLocaleString("en-US")} EGP`;
};

export default function SubscriptionPlansPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isYearly, setIsYearly] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [countryCode, setCountryCode] = useState<string | null>(null);

  const { data: plans, isLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/subscriptions/plans", countryCode],
    queryFn: async () => {
      const url = countryCode
        ? `/api/subscriptions/plans?country=${countryCode}`
        : "/api/subscriptions/plans";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch plans");
      return response.json();
    },
    ...getQueryOptions(300000),
  });

  const { data: currentSubscription } = useQuery<any>({
    queryKey: ["/api/subscriptions/current"],
    ...getQueryOptions(60000),
  });

  useEffect(() => {
    if (plans && plans.length > 0 && !countryCode) {
      setCountryCode(plans[0].countryCode || "EG");
    }
  }, [plans, countryCode]);

  const subscribeMutation = useMutation({
    mutationFn: async ({
      planId,
      billingCycle,
      countryCode: selectedCountry,
    }: {
      planId: string;
      billingCycle: "monthly" | "yearly";
      countryCode: string;
    }) => {
      const response = await fetch("/api/subscriptions/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, billingCycle, countryCode: selectedCountry }),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to subscribe");
      }

      return response.json();
    },
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
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
    if (plan.name === "Enterprise") {
      window.location.href = "mailto:sales@hiringintelligence.com?subject=Enterprise Plan Inquiry";
      return;
    }
    setSelectedPlanId(plan.id);
    subscribeMutation.mutate({
      planId: plan.id,
      billingCycle: isYearly ? "yearly" : "monthly",
      countryCode: countryCode || "EG",
    });
  };

  const currency = plans?.[0]?.currency || "EGP";
  const sortedPlans = plans ? [...plans].sort((a, b) => a.sortOrder - b.sortOrder) : [];
  const yearlyDiscount = 18;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/hiring/billing")}
          className="text-slate-600 dark:text-slate-400"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
            Choose Your Plan
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Select the perfect plan for your hiring needs
          </p>
        </div>
      </motion.div>

      {/* Billing Toggle & Country */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border-0">
        <CardContent className="py-6">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            {/* Billing Cycle Toggle */}
            <div className="flex items-center gap-4 bg-white dark:bg-slate-800 rounded-full px-6 py-3 shadow-sm">
              <span
                className={`text-sm font-medium transition-colors ${
                  !isYearly ? "text-primary" : "text-slate-500"
                }`}
              >
                Monthly
              </span>
              <Switch checked={isYearly} onCheckedChange={setIsYearly} />
              <span
                className={`text-sm font-medium transition-colors ${
                  isYearly ? "text-primary" : "text-slate-500"
                }`}
              >
                Yearly
              </span>
              {isYearly && (
                <Badge className="bg-green-500 hover:bg-green-600 ml-2">
                  Save {yearlyDiscount}%
                </Badge>
              )}
            </div>

            {/* Country Selector */}
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-full px-4 py-2 shadow-sm">
              <Globe className="w-4 h-4 text-slate-500" />
              <select
                value={countryCode || "EG"}
                onChange={(e) => setCountryCode(e.target.value)}
                className="bg-transparent border-0 text-sm font-medium focus:outline-none cursor-pointer"
              >
                <option value="EG">Egypt (EGP)</option>
                <option value="US">United States (USD)</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {sortedPlans.map((plan, index) => {
          const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
          const pricePerMonth = isYearly ? plan.yearlyPrice / 12 : plan.monthlyPrice;
          const isPopular = plan.name === "Growth";
          const isEnterprise = plan.name === "Enterprise";
          const isCurrent = currentSubscription?.plan?.id === plan.id;
          const isMutating = subscribeMutation.isPending && selectedPlanId === plan.id;

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative"
            >
              {isPopular && (
                <div className="absolute -top-4 left-0 right-0 flex justify-center z-10">
                  <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1 shadow-lg">
                    Most Popular
                  </Badge>
                </div>
              )}

              <Card
                className={`relative h-full overflow-hidden transition-all duration-300 ${
                  isPopular
                    ? "ring-2 ring-purple-500 shadow-xl shadow-purple-500/20"
                    : isCurrent
                    ? "ring-2 ring-green-500"
                    : "hover:shadow-lg"
                }`}
              >
                {/* Gradient Header */}
                <div
                  className={`bg-gradient-to-r ${getPlanGradient(plan.name)} p-6 text-white`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      {getPlanIcon(plan.name)}
                    </div>
                    {isCurrent && (
                      <Badge className="bg-white/20 text-white border-0">
                        Current Plan
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-2xl font-bold">{plan.name}</h3>
                  <p className="text-white/80 text-sm mt-1">{plan.description}</p>
                </div>

                <CardContent className="p-6 space-y-6">
                  {/* Pricing */}
                  <div className="text-center pb-4 border-b dark:border-slate-700">
                    {isEnterprise ? (
                      <div className="text-2xl font-bold text-slate-900 dark:text-white">
                        Custom Pricing
                      </div>
                    ) : (
                      <>
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-4xl font-bold text-slate-900 dark:text-white">
                            {formatPrice(pricePerMonth, plan.currency || currency)}
                          </span>
                          <span className="text-slate-500">/mo</span>
                        </div>
                        {isYearly && (
                          <p className="text-sm text-slate-500 mt-1">
                            Billed {formatPrice(price, plan.currency || currency)} yearly
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  {/* Features */}
                  <div className="space-y-3">
                    {!isEnterprise ? (
                      <>
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                            <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <span className="text-sm">
                            <strong>{plan.monthlyCvCredits || plan.monthlyCredits}</strong> CV Credits/month
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30">
                            <Video className="w-4 h-4 text-primary dark:text-blue-400" />
                          </div>
                          <span className="text-sm">
                            <strong>{plan.monthlyInterviewCredits || 0}</strong> Interview Credits/month
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 rounded-full bg-purple-100 dark:bg-purple-900/30">
                            <Building2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          </div>
                          <span className="text-sm">
                            <strong>{plan.jobPostsLimit === null ? "Unlimited" : plan.jobPostsLimit}</strong> Job Posts
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30">
                            <Users className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          </div>
                          <span className="text-sm">
                            ~<strong>{Math.floor((plan.monthlyCvCredits || plan.monthlyCredits) / 5)}</strong> Engaged Candidates
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-700">
                            <Headphones className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                          </div>
                          <span className="text-sm capitalize">
                            <strong>{plan.supportLevel}</strong> Support
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                          <span className="text-sm">Custom credit allocation</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                          <span className="text-sm">Unlimited job posts</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                          <span className="text-sm">Dedicated account manager</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                          <span className="text-sm">Priority 24/7 support</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                          <span className="text-sm">Custom integrations & API</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* CTA Button */}
                  <Button
                    className={`w-full ${
                      isPopular
                        ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                        : isEnterprise
                        ? "bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700"
                        : "bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600"
                    }`}
                    onClick={() => handleSubscribe(plan)}
                    disabled={isMutating || isCurrent}
                  >
                    {isMutating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : isCurrent ? (
                      "Current Plan"
                    ) : isEnterprise ? (
                      "Contact Sales"
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

      {/* Info Footer */}
      <Card className="bg-slate-50 dark:bg-slate-800/50 border-0">
        <CardContent className="py-6">
          <div className="text-center space-y-3">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              How Credits Work
            </h3>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>1 CV Credit = Full AI Analysis + Match Score</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span>1 Interview Credit = AI Interview Package</span>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Need more credits? You can purchase additional credit packs anytime.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
