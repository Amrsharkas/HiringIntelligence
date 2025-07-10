import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Eye, EyeOff, Building2, Users, TrendingUp } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      return await apiRequest("POST", "/api/auth/login", credentials);
    },
    onSuccess: () => {
      toast({
        title: "Login successful",
        description: "Welcome back to your hiring dashboard",
      });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: "Login failed",
        description: error.message || "Please check your credentials",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: "Missing information",
        description: "Please enter both email and password",
        variant: "destructive",
      });
      return;
    }
    loginMutation.mutate({ email, password });
  };

  const handleSignupRedirect = () => {
    setLocation("/signup");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo and branding */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="p-3 bg-blue-600 rounded-xl">
              <Building2 className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome back
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Sign in to your hiring platform
          </p>
        </div>

        {/* Login form */}
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm dark:bg-slate-800/80">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Sign in</CardTitle>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loginMutation.isPending}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loginMutation.isPending}
                    className="h-11 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loginMutation.isPending}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full h-11"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Signing in..." : "Sign in"}
              </Button>
            </form>

            <div className="mt-6">
              <Separator className="my-4" />
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Don't have an account?{" "}
                  <Button
                    variant="link"
                    className="p-0 text-blue-600 hover:text-blue-500"
                    onClick={handleSignupRedirect}
                  >
                    Sign up
                  </Button>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features showcase */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-2">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg inline-block">
              <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">AI Matching</p>
          </div>
          <div className="space-y-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg inline-block">
              <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Analytics</p>
          </div>
          <div className="space-y-2">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg inline-block">
              <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Team Tools</p>
          </div>
        </div>
      </div>
    </div>
  );
}