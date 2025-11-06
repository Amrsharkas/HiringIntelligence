import React, { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { getQueryOptions } from "@/lib/queryConfig";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  Crown,
  Sparkles,
  Star,
  Zap,
  CreditCard,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

interface CreditPackage {
  id: string;
  name: string;
  description: string | null;
  creditAmount: number;
  price: number;
  currency: string;
  isActive: boolean;
  sortOrder: number;
  stripePriceId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CreditPackageSelectorProps {
  selectedPackageId: string | null;
  onPackageSelect: (packageId: string) => void;
  onPurchase: (packageId: string) => void;
  isLoading?: boolean;
}

const getPackageIcon = (creditAmount: number) => {
  if (creditAmount === 100) return <Sparkles className="w-5 h-5" />;
  if (creditAmount === 300) return <Star className="w-5 h-5" />;
  if (creditAmount === 1000) return <Crown className="w-5 h-5" />;
  return <CreditCard className="w-5 h-5" />;
};

const getPackageColor = (creditAmount: number) => {
  if (creditAmount === 100) return 'from-blue-500 to-blue-600';
  if (creditAmount === 300) return 'from-purple-500 to-purple-600';
  if (creditAmount === 1000) return 'from-amber-500 to-amber-600';
  return 'from-slate-500 to-slate-600';
};

export const CreditPackageSelector = React.memo<CreditPackageSelectorProps>(({
  selectedPackageId,
  onPackageSelect,
  onPurchase,
  isLoading = false,
}) => {
  const { toast } = useToast();

  const { data: packages, isLoading: isLoadingPackages, error } = useQuery<CreditPackage[]>({
    queryKey: ["/api/credit-packages"],
    ...getQueryOptions(300000), // Cache for 5 minutes
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
      } else {
        toast({
          title: "Error",
          description: "Failed to load credit packages",
          variant: "destructive",
        });
      }
    },
  });

  if (isLoadingPackages) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !packages || packages.length === 0) {
    return (
      <div className="text-center py-12">
        <CreditCard className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <p className="text-slate-600 dark:text-slate-400">
          Unable to load credit packages
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          Try Again
        </Button>
      </div>
    );
  }

  const sortedPackages = packages.sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          Additional Credit Packs
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Purchase additional credits as needed to scale your hiring efforts beyond your subscription
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
        {sortedPackages.map((pkg, index) => {
          const isSelected = selectedPackageId === pkg.id;
          const pricePerCredit = pkg.price / pkg.creditAmount; // in cents
          const baseRate = 9000; // 90 EGP per credit in cents
          const savings = baseRate > 0 ? Math.round((1 - pricePerCredit / baseRate) * 100) : 0;

          return (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative"
            >
              {savings > 0 && (
                <Badge className="absolute -top-2 -right-2 bg-green-500 hover:bg-green-600 z-10">
                  {savings}% OFF
                </Badge>
              )}

              <Card
                className={`relative cursor-pointer transition-all duration-200 hover:shadow-lg ${
                  isSelected
                    ? 'ring-2 ring-blue-500 shadow-lg scale-105'
                    : 'hover:scale-[1.02]'
                }`}
                onClick={() => onPackageSelect(pkg.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-2 rounded-lg bg-gradient-to-r ${getPackageColor(pkg.creditAmount)} text-white`}>
                      {getPackageIcon(pkg.creditAmount)}
                    </div>
                    {isSelected && (
                      <div className="bg-blue-500 text-white rounded-full p-1">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                    {pkg.name}
                  </h3>

                  {pkg.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                      {pkg.description}
                    </p>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                          {(pkg.price / 100).toLocaleString('en-US')}
                        </span>
                        <span className="text-sm text-slate-500 ml-1">EGP</span>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                          {pkg.creditAmount}
                        </span>
                        <span className="text-sm text-slate-500 block">credits</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">
                        {(pricePerCredit / 100).toFixed(0)} EGP per credit
                      </span>
                      {pkg.creditAmount >= 1000 && (
                        <Badge variant="secondary" className="text-xs">
                          Best Value
                        </Badge>
                      )}
                    </div>

                    <Button
                      className={`w-full mt-4 ${
                        isSelected
                          ? 'bg-blue-600 hover:bg-blue-700'
                          : 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onPurchase(pkg.id);
                      }}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4 mr-2" />
                          {isSelected ? 'Purchase Selected' : 'Select Package'}
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="text-center mt-8 text-sm text-slate-600 dark:text-slate-400">
        <p>Secure payments powered by Stripe</p>
        <p className="mt-1">Credits are added immediately after successful payment</p>
      </div>
    </div>
  );
});

CreditPackageSelector.displayName = "CreditPackageSelector";