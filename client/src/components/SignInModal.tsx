import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { X, Lock, User } from "lucide-react";

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToSignUp?: () => void;
}

export default function SignInModal({ isOpen, onClose, onSwitchToSignUp }: SignInModalProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { loginMutation } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await loginMutation.mutateAsync({ username, password });
      onClose();
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          <Card className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/60 dark:border-slate-700/60 shadow-2xl">
            <CardHeader className="space-y-1 pb-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Welcome Back
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Sign in to your account to access your employer dashboard
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Username
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-10 h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your username"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your password"
                      required
                    />
                  </div>
                </div>
                
                <Button
                  type="submit"
                  disabled={loginMutation.isPending}
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                >
                  {loginMutation.isPending ? "Signing In..." : "Sign In"}
                </Button>
              </form>
              
              <div className="mt-6 text-center">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Don't have an account?{" "}
                  <button
                    onClick={onSwitchToSignUp}
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium hover:underline"
                  >
                    Sign up here
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}