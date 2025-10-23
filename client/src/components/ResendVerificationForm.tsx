import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState } from "react";
import { Loader2, Mail, ArrowLeft } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ResendVerificationFormProps {
  onBack?: () => void;
}

export default function ResendVerificationForm({ onBack }: ResendVerificationFormProps) {
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

  const handleSubmit = async (e: React.FormEvent) => {
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
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
          <Mail className="h-6 w-6 text-blue-600" />
        </div>
        <CardTitle className="text-xl text-gray-900">Resend Verification Email</CardTitle>
        <p className="text-sm text-gray-600">
          Enter your email address to receive a new verification link
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={resendVerificationMutation.isPending}
          >
            {resendVerificationMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Resend Verification Email
              </>
            )}
          </Button>
        </form>

        <Alert>
          <Mail className="h-4 w-4" />
          <AlertDescription className="text-xs">
            We'll send a new verification email to your registered email address.
            Please check your inbox and spam folder.
          </AlertDescription>
        </Alert>

        {onBack && (
          <Button
            variant="ghost"
            onClick={onBack}
            className="w-full"
            size="sm"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        )}
      </CardContent>
    </Card>
  );
}