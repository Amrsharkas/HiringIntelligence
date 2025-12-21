import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import GoogleSignInButton from "./GoogleSignInButton";
import { isGoogleAuthError, getGoogleAuthError, clearGoogleAuthError, getGoogleAuthErrorMessage } from "@/lib/authUtils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TERMS_OF_SERVICE_TEXT } from "@shared/terms";
import { X, Lock, User, Mail, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SignUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToSignIn?: () => void;
}

const createInitialFormData = () => ({
  username: "",
  email: "",
  firstName: "",
  lastName: "",
  password: "",
  confirmPassword: "",
  acceptedTerms: false,
  acceptedTermsText: TERMS_OF_SERVICE_TEXT,
});

export default function SignUpModal({ isOpen, onClose, onSwitchToSignIn }: SignUpModalProps) {
  const [formData, setFormData] = useState(createInitialFormData);
  const [passwordMatch, setPasswordMatch] = useState(true);
  const [termsError, setTermsError] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const { registerMutation, signInWithGoogle } = useAuth();
  const { toast } = useToast();

  const resetForm = () => {
    setFormData(createInitialFormData());
    setPasswordMatch(true);
    setTermsError(null);
    setStepError(null);
    setCurrentStep(1);
  };

  const handleModalClose = () => {
    resetForm();
    onClose();
  };

  // Check for inviteCode in URL when modal opens
  React.useEffect(() => {
    if (isOpen) {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('inviteCode');
      setInviteCode(code);
    }
  }, [isOpen]);

  // Check for Google auth errors on mount
  React.useEffect(() => {
    if (isGoogleAuthError()) {
      const error = getGoogleAuthError();
      if (error) {
        toast({
          title: "Google Authentication Error",
          description: getGoogleAuthErrorMessage(error),
          variant: "destructive",
        });
        clearGoogleAuthError();
      }
    }
  }, [toast]);

  const handleInputChange = (field: string, value: string) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    setStepError(null);
    
    // Check password match in real-time
    if (field === "password" || field === "confirmPassword") {
      if (field === "confirmPassword") {
        setPasswordMatch(newFormData.password === value);
      } else {
        setPasswordMatch(value === newFormData.confirmPassword || newFormData.confirmPassword === "");
      }
    }
  };

  const handleCheckboxChange = (field: string, value: boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (value) {
      setTermsError(null);
    }
  };

  const isStepOneValid =
    formData.firstName.trim().length > 0 &&
    formData.lastName.trim().length > 0 &&
    formData.username.trim().length >= 3 &&
    formData.email.trim().length > 0;

  const handleNextStep = () => {
    if (!isStepOneValid) {
      setStepError("Please complete all required fields before continuing.");
      return;
    }
    setStepError(null);
    setCurrentStep(2);
  };

  const handleBackStep = () => {
    setCurrentStep(1);
    setStepError(null);
    setTermsError(null);
  };

  const handleSwitchToSignIn = () => {
    resetForm();
    onSwitchToSignIn?.();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (currentStep === 1) {
      handleNextStep();
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setPasswordMatch(false);
      return;
    }

    if (!formData.acceptedTerms) {
      setTermsError("You must accept the terms to create an account.");
      return;
    }

    try {
      setTermsError(null);
      setStepError(null);
      await registerMutation.mutateAsync({
        username: formData.username,
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        password: formData.password,
        acceptedTerms: formData.acceptedTerms,
        acceptedTermsText: formData.acceptedTermsText
      });
      resetForm();
      onClose();
    } catch (error) {
      console.error("Registration failed:", error);
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
        onClick={handleModalClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="w-full max-w-lg max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <Card className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/60 dark:border-slate-700/60 shadow-2xl">
            <CardHeader className="space-y-1 pb-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Create Account
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleModalClose}
                  className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Sign up to start using AI-powered hiring tools
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Invite Code Tip */}
              {inviteCode && (
                <Alert className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                  <Info className="h-4 w-4 text-primary dark:text-blue-400" />
                  <AlertDescription className="text-sm text-blue-800 dark:text-blue-300">
                    <strong>You've been invited!</strong> Complete your registration to join the team.
                    After signing up, you'll be automatically added to the organization.
                  </AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {currentStep === 1 && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          First Name
                        </Label>
                        <Input
                          id="firstName"
                          type="text"
                          value={formData.firstName}
                          onChange={(e) => handleInputChange("firstName", e.target.value)}
                          className="h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="John"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="lastName" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Last Name
                        </Label>
                        <Input
                          id="lastName"
                          type="text"
                          value={formData.lastName}
                          onChange={(e) => handleInputChange("lastName", e.target.value)}
                          className="h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Doe"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="username" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Username
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="username"
                          type="text"
                          value={formData.username}
                          onChange={(e) => handleInputChange("username", e.target.value)}
                          className="pl-10 h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Choose a username"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Email
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange("email", e.target.value)}
                          className="pl-10 h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="your@email.com"
                          required
                        />
                      </div>
                    </div>

                    {stepError && (
                      <p className="text-sm text-red-500">{stepError}</p>
                    )}
                  </>
                )}

                {currentStep === 2 && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="password"
                          type="password"
                          value={formData.password}
                          onChange={(e) => handleInputChange("password", e.target.value)}
                          className="pl-10 h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Create a secure password"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Confirm Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={formData.confirmPassword}
                          onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                          className={`pl-10 h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            !passwordMatch ? "border-red-500 focus:ring-red-500" : ""
                          }`}
                          placeholder="Confirm your password"
                          required
                        />
                      </div>
                      {!passwordMatch && (
                        <p className="text-sm text-red-500">Passwords do not match</p>
                      )}
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Terms of Service
                      </Label>
                      <ScrollArea className="h-64 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/60 p-4">
                        <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                          {TERMS_OF_SERVICE_TEXT}
                        </p>
                      </ScrollArea>
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id="acceptedTerms"
                          checked={formData.acceptedTerms}
                          onCheckedChange={(checked) => handleCheckboxChange("acceptedTerms", checked === true)}
                        />
                        <Label htmlFor="acceptedTerms" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          I have read and agree to the Terms of Service above (printable version{" "}
                          <a href="/terms" className="text-primary hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline">
                            available here
                          </a>) and the{" "}
                          <a href="/privacy" className="text-primary hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline">
                            Privacy Policy
                          </a>
                        </Label>
                      </div>
                      {termsError && (
                        <p className="text-sm text-red-500">{termsError}</p>
                      )}
                    </div>
                  </>
                )}

                <div className={`flex flex-col gap-3 ${currentStep === 2 ? "sm:flex-row" : ""}`}>
                  {currentStep === 2 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBackStep}
                      disabled={registerMutation.isPending}
                      className="w-full h-12"
                    >
                      Back
                    </Button>
                  )}
                  <Button
                    type={currentStep === 2 ? "submit" : "button"}
                    onClick={currentStep === 1 ? handleNextStep : undefined}
                    disabled={
                      registerMutation.isPending ||
                      (currentStep === 1 ? !isStepOneValid : !passwordMatch || !formData.acceptedTerms)
                    }
                    className="w-full h-12 bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                  >
                    {currentStep === 1
                      ? "Continue"
                      : registerMutation.isPending
                        ? "Creating Account..."
                        : "Create Account"}
                  </Button>
                </div>
              </form>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200 dark:border-slate-700" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-slate-900 px-2 text-slate-500">
                    Or continue with
                  </span>
                </div>
              </div>

              {/* Google Sign-In Button */}
              <GoogleSignInButton onClick={signInWithGoogle} />

              <div className="mt-6 text-center">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Already have an account?{" "}
                  <button
                    onClick={handleSwitchToSignIn}
                    className="text-primary hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium hover:underline"
                  >
                    Sign in here  
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