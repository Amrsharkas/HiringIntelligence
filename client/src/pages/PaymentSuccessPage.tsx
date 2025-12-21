import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowRight, Home, Coins } from 'lucide-react';

const PaymentSuccessPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const [redirectCountdown, setRedirectCountdown] = useState(10);

  useEffect(() => {
    const timer = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setLocation('/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [setLocation]);

  const handleGoToDashboard = () => {
    setLocation('/dashboard');
  };

  
  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-green-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
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
              className="w-20 h-20 bg-linear-to-r from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <CheckCircle className="w-10 h-10 text-white" />
            </motion.div>

            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Payment Successful!
            </CardTitle>

            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Your credits have been added to your account
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Success Message */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800"
            >
              <div className="flex items-center gap-2 mb-2">
                <Coins className="w-5 h-5 text-green-600 dark:text-green-400" />
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  Credits Added Successfully
                </h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Your payment was successful and the credits have been added to your account.
              </p>
            </motion.div>

            {/* What's Next */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="space-y-3"
            >
              <h4 className="font-semibold text-slate-900 dark:text-slate-100">What's next?</h4>

              <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <span>Your payment was processed successfully</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <span>Credits are now available in your account</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <span>Start using AI-powered hiring features</span>
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
                onClick={handleGoToDashboard}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                size="lg"
              >
                Go to Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>

              <div className="text-center text-sm text-slate-500 dark:text-slate-400">
                Auto-redirecting in {redirectCountdown} seconds...
              </div>
            </motion.div>

            {/* Need Help */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-center pt-4 border-t border-slate-200 dark:border-slate-700"
            >
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Need help? <a href="mailto:support@plato.com" className="text-green-600 hover:text-green-700">Contact Support</a>
              </p>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default PaymentSuccessPage;