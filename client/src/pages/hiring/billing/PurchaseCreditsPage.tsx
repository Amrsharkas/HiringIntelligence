import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  FileText,
  Video,
  Check,
  Loader2,
  ShoppingCart,
  Zap,
  TrendingUp,
  Gift,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getQueryOptions } from "@/lib/queryConfig";
import { CreditPurchaseModal } from "@/components/CreditPurchaseModal";

interface CreditPackage {
  id: string;
  name: string;
  description: string | null;
  creditType: "cv_processing" | "interview";
  creditAmount: number;
  price: number;
  currency: string;
  isActive: boolean;
  sortOrder: number;
}

export default function PurchaseCreditsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("cv");
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);

  const { data: packages, isLoading } = useQuery<CreditPackage[]>({
    queryKey: ["/api/credit-packages"],
    ...getQueryOptions(300000),
  });

  const { data: organization } = useQuery<any>({
    queryKey: ["/api/organizations/current"],
    staleTime: 30000,
  });

  const cvPackages = packages?.filter((p) => p.creditType === "cv_processing").sort((a, b) => a.sortOrder - b.sortOrder) || [];
  const interviewPackages = packages?.filter((p) => p.creditType === "interview").sort((a, b) => a.sortOrder - b.sortOrder) || [];

  const currentCvCredits = organization?.cvProcessingCredits || 0;
  const currentInterviewCredits = organization?.interviewCredits || 0;

  const handlePurchase = (packageId: string) => {
    setSelectedPackageId(packageId);
    setIsPurchaseModalOpen(true);
  };

  const getPackageTier = (creditAmount: number) => {
    if (creditAmount >= 1000) return { label: "Best Value", color: "bg-amber-500" };
    if (creditAmount >= 300) return { label: "Popular", color: "bg-purple-500" };
    if (creditAmount >= 100) return { label: "Starter", color: "bg-blue-500" };
    return null;
  };

  const calculateSavings = (price: number, credits: number, baseRate: number = 90) => {
    const pricePerCredit = price / 100 / credits;
    const savings = Math.round((1 - pricePerCredit / baseRate) * 100);
    return savings > 0 ? savings : 0;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const renderPackageCard = (pkg: CreditPackage, index: number, type: "cv" | "interview") => {
    const tier = getPackageTier(pkg.creditAmount);
    const savings = calculateSavings(pkg.price, pkg.creditAmount);
    const pricePerCredit = (pkg.price / 100 / pkg.creditAmount).toFixed(0);
    const isHighlighted = pkg.creditAmount >= 300 && pkg.creditAmount < 1000;

    return (
      <motion.div
        key={pkg.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className="relative"
      >
        {tier && (
          <div className="absolute -top-3 left-4 z-10">
            <Badge className={`${tier.color} text-white shadow-lg`}>
              {tier.label}
            </Badge>
          </div>
        )}

        <Card
          className={`h-full transition-all duration-300 hover:shadow-lg ${
            isHighlighted
              ? "ring-2 ring-purple-500 shadow-xl shadow-purple-500/10"
              : ""
          }`}
        >
          <CardContent className="p-6 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {pkg.name}
                </h3>
                {pkg.description && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {pkg.description}
                  </p>
                )}
              </div>
              <div
                className={`p-2 rounded-lg ${
                  type === "cv"
                    ? "bg-emerald-100 dark:bg-emerald-900/30"
                    : "bg-blue-100 dark:bg-blue-900/30"
                }`}
              >
                {type === "cv" ? (
                  <FileText
                    className={`w-5 h-5 ${
                      type === "cv"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-blue-600 dark:text-blue-400"
                    }`}
                  />
                ) : (
                  <Video className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                )}
              </div>
            </div>

            {/* Credits Amount */}
            <div
              className={`p-4 rounded-xl ${
                type === "cv"
                  ? "bg-gradient-to-br from-emerald-50 to-cyan-50 dark:from-emerald-950/30 dark:to-cyan-950/30"
                  : "bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30"
              }`}
            >
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-4xl font-bold ${
                    type === "cv"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-blue-600 dark:text-blue-400"
                  }`}
                >
                  {pkg.creditAmount.toLocaleString()}
                </span>
                <span className="text-slate-500 dark:text-slate-400">credits</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {pricePerCredit} EGP per credit
              </p>
            </div>

            {/* Price */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  {(pkg.price / 100).toLocaleString()}
                </span>
                <span className="text-slate-500 ml-1">EGP</span>
              </div>
              {savings > 0 && (
                <Badge variant="outline" className="text-green-600 border-green-300">
                  <Gift className="w-3 h-3 mr-1" />
                  Save {savings}%
                </Badge>
              )}
            </div>

            {/* Purchase Button */}
            <Button
              className={`w-full ${
                isHighlighted
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  : type === "cv"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
              onClick={() => handlePurchase(pkg.id)}
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Purchase
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
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
            Purchase Credits
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Buy additional credits to process more CVs and interviews
          </p>
        </div>
      </motion.div>

      {/* Current Balance */}
      <Card className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 border-0">
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Current CV Credits</p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  {currentCvCredits.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="w-px h-10 bg-slate-300 dark:bg-slate-600 hidden sm:block" />
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Video className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Current Interview Credits</p>
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  {currentInterviewCredits.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Credit Types */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
          <TabsTrigger value="cv" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            CV Credits
          </TabsTrigger>
          <TabsTrigger value="interview" className="flex items-center gap-2">
            <Video className="w-4 h-4" />
            Interview Credits
          </TabsTrigger>
        </TabsList>

        {/* CV Credits Tab */}
        <TabsContent value="cv" className="mt-6">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
              CV Processing Credits
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Each credit provides full AI-powered CV analysis with match scoring
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {cvPackages.map((pkg, index) => renderPackageCard(pkg, index, "cv"))}
          </div>
        </TabsContent>

        {/* Interview Credits Tab */}
        <TabsContent value="interview" className="mt-6">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-blue-700 dark:text-blue-300">
              Interview Credits
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Each credit includes AI interview generation and detailed reports
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {interviewPackages.map((pkg, index) =>
              renderPackageCard(pkg, index, "interview")
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Info Footer */}
      <Card className="bg-slate-50 dark:bg-slate-800/50 border-0">
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              <span>Credits added instantly</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              <span>Secure Stripe payments</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              <span>No expiration on purchased credits</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Purchase Modal */}
      <CreditPurchaseModal
        isOpen={isPurchaseModalOpen}
        onClose={() => {
          setIsPurchaseModalOpen(false);
          setSelectedPackageId(null);
        }}
        selectedPackageId={selectedPackageId}
      />
    </div>
  );
}
