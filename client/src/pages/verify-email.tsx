import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function VerifyEmailPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        
        if (!token) {
          setStatus('error');
          setMessage('Verification token not found in URL');
          return;
        }

        const response = await apiRequest("GET", `/api/auth/verify-email?token=${token}`);
        const data = await response.json();
        
        if (response.ok) {
          setStatus('success');
          setMessage(data.message || 'Email verified successfully!');
          toast({
            title: "Email verified!",
            description: "You can now log in to your account.",
          });
          
          // Redirect to login after 3 seconds
          setTimeout(() => {
            setLocation('/auth');
          }, 3000);
        } else {
          setStatus('error');
          setMessage(data.message || 'Email verification failed');
        }
      } catch (error: any) {
        setStatus('error');
        setMessage(error.message || 'An error occurred during verification');
        console.error('Email verification error:', error);
      }
    };

    verifyEmail();
  }, [toast, setLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-slate-200/60 dark:border-slate-700/60 shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">
              Email Verification
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400">
              {status === 'loading' && 'Verifying your email address...'}
              {status === 'success' && 'Your email has been verified!'}
              {status === 'error' && 'Verification failed'}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center space-y-4">
              {status === 'loading' && (
                <Loader2 className="h-16 w-16 animate-spin text-blue-600" />
              )}
              
              {status === 'success' && (
                <CheckCircle className="h-16 w-16 text-green-600" />
              )}
              
              {status === 'error' && (
                <XCircle className="h-16 w-16 text-red-600" />
              )}
              
              <p className="text-center text-slate-700 dark:text-slate-300">
                {message}
              </p>
            </div>
            
            {status === 'success' && (
              <div className="space-y-4">
                <p className="text-sm text-center text-slate-600 dark:text-slate-400">
                  You will be redirected to the login page in a few seconds.
                </p>
                <Button
                  onClick={() => setLocation('/auth')}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  Go to Login
                </Button>
              </div>
            )}
            
            {status === 'error' && (
              <div className="space-y-4">
                <Button
                  onClick={() => setLocation('/auth')}
                  variant="outline"
                  className="w-full"
                >
                  Back to Login
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}