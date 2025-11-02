import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  X,
  CreditCard,
  Loader2,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Shield,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CreditPackageSelector } from "./CreditPackageSelector";

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
}

interface CreditPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
}

export const CreditPurchaseModal = React.memo<CreditPurchaseModalProps>(({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [purchaseStep, setPurchaseStep] = useState<'select' | 'processing' | 'redirecting'>('select');

  const createCheckoutMutation = useMutation<CheckoutSessionResponse, Error, string>({
    mutationFn: async (creditPackageId: string) => {
      const response = await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ creditPackageId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create checkout session');
      }

      return response.json();
    },
    onSuccess: (data) => {
      setPurchaseStep('redirecting');

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    },
    onError: (error) => {
      console.error('Checkout creation error:', error);
      toast({
        title: "Payment Error",
        description: error.message || "Failed to initiate payment. Please try again.",
        variant: "destructive",
      });
      setPurchaseStep('select');
    },
  });

  const handlePackageSelect = (packageId: string) => {
    setSelectedPackageId(packageId);
  };

  const handlePurchase = (packageId: string) => {
    setSelectedPackageId(packageId);
    setPurchaseStep('processing');
    createCheckoutMutation.mutate(packageId);
  };

  const handleClose = () => {
    if (createCheckoutMutation.isLoading) return;

    // Reset state
    setSelectedPackageId(null);
    setPurchaseStep('select');
    onClose();
  };

  const getProgressValue = () => {
    switch (purchaseStep) {
      case 'select': return 33;
      case 'processing': return 66;
      case 'redirecting': return 100;
      default: return 0;
    }
  };

  const getStepLabel = () => {
    switch (purchaseStep) {
      case 'select': return 'Select Package';
      case 'processing': return 'Processing Payment';
      case 'redirecting': return 'Redirecting to Stripe';
      default: return '';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={handleClose}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <CreditCard className="w-6 h-6 text-blue-600" />
                  Purchase Credits
                </DialogTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  disabled={createCheckoutMutation.isLoading}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </DialogHeader>

            {/* Progress Indicator */}
            <div className="space-y-2 mb-6">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {getStepLabel()}
                </span>
                <Badge variant="outline">
                  Step {purchaseStep === 'select' ? 1 : purchaseStep === 'processing' ? 2 : 3} of 3
                </Badge>
              </div>
              <Progress value={getProgressValue()} className="h-2" />
            </div>

            <div className="min-h-[400px]">
              {purchaseStep === 'select' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <CreditPackageSelector
                    selectedPackageId={selectedPackageId}
                    onPackageSelect={handlePackageSelect}
                    onPurchase={handlePurchase}
                    isLoading={createCheckoutMutation.isLoading}
                  />
                </motion.div>
              )}

              {purchaseStep === 'processing' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center py-16"
                >
                  <Loader2 className="w-16 h-16 animate-spin text-blue-600 mb-4" />
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                    Creating Your Payment Session
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-center max-w-md">
                    We're preparing your secure checkout session with Stripe. You'll be redirected in a moment...
                  </p>
                </motion.div>
              )}

              {purchaseStep === 'redirecting' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center py-16"
                >
                  <div className="relative mb-6">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                      <ExternalLink className="w-8 h-8 text-blue-600" />
                    </div>
                    <motion.div
                      className="absolute inset-0 border-2 border-blue-200 dark:border-blue-800 rounded-full"
                      animate={{ scale: [1, 1.5, 2], opacity: [1, 0.5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                    Redirecting to Stripe
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-center max-w-md">
                    Taking you to our secure payment provider to complete your purchase...
                  </p>
                  <p className="text-sm text-slate-500 mt-4">
                    If you're not redirected automatically,
                    <Button
                      variant="link"
                      className="p-0 h-auto ml-1"
                      onClick={() => window.location.reload()}
                    >
                      click here
                    </Button>
                  </p>
                </motion.div>
              )}
            </div>

            {/* Security Notice */}
            <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  <p className="font-medium text-slate-900 dark:text-slate-100 mb-1">
                    Secure Payment Processing
                  </p>
                  <p>
                    Your payment information is processed securely by Stripe. We never store your credit card details.
                    All transactions are encrypted and protected by industry-standard security measures.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="text-sm text-slate-500">
                Questions? Contact our support team.
              </div>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={createCheckoutMutation.isLoading}
              >
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
});

CreditPurchaseModal.displayName = "CreditPurchaseModal";