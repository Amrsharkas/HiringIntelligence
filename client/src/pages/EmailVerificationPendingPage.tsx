import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, CheckCircle } from "lucide-react";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function EmailVerificationPendingPage() {
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  const resendVerificationMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest("POST", "/api/resend-verification", { email });
      return await res.json();
    },
    onSuccess: (response: { message: string }) => {
      toast({
        title: "Verification email sent!",
        description: response.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to resend verification",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleResendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }
    resendVerificationMutation.mutate(email);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Mail className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl text-gray-900">Check Your Email</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <Alert>
            <Mail className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong className="text-blue-600">Registration successful!</strong> We've sent a verification email to your registered email address. Please check your inbox and click the verification link to activate your account.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span>Check your email inbox</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span>Click the verification link</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span>Start using Plato Hiring</span>
            </div>
          </div>

          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-xs text-blue-800">
              <strong>Important:</strong> The verification link will expire in 1 week for security reasons. If you don't receive the email within a few minutes, please check your spam folder.
            </p>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <div>
              <Label htmlFor="email" className="text-sm text-gray-700">
                Didn't receive the email?
              </Label>
              <p className="text-xs text-gray-500 mb-2">
                Enter your email address to resend the verification link
              </p>
              <form onSubmit={handleResendVerification} className="space-y-2">
                <div className="flex space-x-2">
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1"
                    required
                  />
                  <Button
                    type="submit"
                    disabled={resendVerificationMutation.isPending}
                    size="sm"
                  >
                    {resendVerificationMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Resend"
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>

          <div className="text-center">
            <Button
              variant="link"
              onClick={() => window.location.href = '/signin'}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Back to Sign In
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}