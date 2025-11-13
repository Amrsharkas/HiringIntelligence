import React from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle, ArrowLeft, Home, CreditCard } from 'lucide-react';

const SubscriptionCanceledPage: React.FC = () => {
  const [, setLocation] = useLocation();

  const handleGoToDashboard = () => {
    setLocation('/dashboard');
  };

  const handleTryAgain = () => {
    setLocation('/dashboard?tab=billing');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-20 h-20 bg-gradient-to-r from-red-400 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <XCircle className="w-10 h-10 text-white" />
            </motion.div>

            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Payment Canceled
            </CardTitle>

            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Your subscription payment was canceled
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Cancellation Message */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800"
            >
              <p className="text-sm text-amber-800 dark:text-amber-200">
                No worries! Your payment was canceled and no charges were made to your account.
                You can try subscribing again whenever you're ready.
              </p>
            </motion.div>

            {/* What You Can Do */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="space-y-3"
            >
              <h4 className="font-semibold text-slate-900 dark:text-slate-100">What would you like to do?</h4>

              <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <div className="flex items-start gap-2">
                  <ArrowLeft className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <span>Try the subscription again</span>
                </div>
                <div className="flex items-start gap-2">
                  <Home className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <span>Return to your dashboard</span>
                </div>
                <div className="flex items-start gap-2">
                  <CreditCard className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <span>Choose a different plan</span>
                </div>
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="space-y-3"
            >
              <Button
                onClick={handleTryAgain}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                size="lg"
              >
                Try Again
                <CreditCard className="w-4 h-4 ml-2" />
              </Button>

              <Button
                onClick={handleGoToDashboard}
                variant="outline"
                className="w-full"
                size="lg"
              >
                <Home className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </motion.div>

            {/* Need Help */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-center pt-4 border-t border-slate-200 dark:border-slate-700"
            >
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Having trouble? <a href="mailto:support@plato.com" className="text-blue-600 hover:text-blue-700">Contact Support</a>
              </p>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default SubscriptionCanceledPage;