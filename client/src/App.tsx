import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { usePendingInvitation } from "@/hooks/usePendingInvitation";
import Landing from "@/pages/landing";
import OrganizationSetup from "@/pages/organization-setup";
import ResumeProfiles from "@/pages/resume-profiles";
import { AcceptInvitation } from "@/pages/AcceptInvitation";
import InviteAccept from "@/pages/InviteAccept";
import NotFound from "@/pages/not-found";
import EmailVerificationPendingPage from "@/pages/EmailVerificationPendingPage";
import VerifyEmailPage from "@/pages/VerifyEmailPage";
import VerificationSentPage from "@/pages/VerificationSentPage";
import ResendVerificationPage from "@/pages/ResendVerificationPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import SubscriptionSuccessPage from "@/pages/SubscriptionSuccessPage";
import SubscriptionCanceledPage from "@/pages/SubscriptionCanceledPage";
import PaymentSuccessPage from "@/pages/PaymentSuccessPage";
import PaymentCanceledPage from "@/pages/PaymentCanceledPage";
import SuperAdminDashboard from "@/pages/super-admin/SuperAdminDashboard";
import HiringDashboard from "@/pages/hiring/HiringDashboard";
import { useEffect } from "react";

// Keep legacy employer dashboard component - no longer redirects
import EmployerDashboard from "@/pages/employer-dashboard";

// Wrapper for wouter components to work with react-router-dom
function WouterLanding() {
  return <Landing />;
}

function WouterOrganizationSetup() {
  return <OrganizationSetup />;
}

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { processPendingInvitation } = usePendingInvitation();

  // Check if user has an organization
  const { data: organization, isLoading: orgLoading } = useQuery({
    queryKey: ["/api/organizations/current"],
    enabled: isAuthenticated && !!user,
    retry: false,
  });

  // Automatically process pending invitations when user becomes authenticated
  useEffect(() => {
    if (isAuthenticated && user && !orgLoading) {
      console.log('🔄 Checking for pending team invitations...');
      processPendingInvitation();
    }
  }, [isAuthenticated, user, orgLoading, processPendingInvitation]);

  if (isLoading || (isAuthenticated && orgLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Email verification routes - accessible without authentication */}
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
      <Route path="/verification-pending" element={<EmailVerificationPendingPage />} />
      <Route path="/verification-sent" element={<VerificationSentPage />} />
      <Route path="/resend-verification" element={<ResendVerificationPage />} />

      {/* Password reset routes - accessible without authentication */}
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

      {/* Subscription payment routes - accessible without authentication for Stripe redirects */}
      <Route path="/subscription/success" element={<SubscriptionSuccessPage />} />
      <Route path="/subscription/canceled" element={<SubscriptionCanceledPage />} />

      {/* Credit purchase payment routes - accessible without authentication for Stripe redirects */}
      <Route path="/payment/success" element={<PaymentSuccessPage />} />
      <Route path="/payment/canceled" element={<PaymentCanceledPage />} />

      {/* Enhanced invitation routes - accessible without full auth checks */}
      <Route path="/invite/accept" element={<InviteAccept />} />
      <Route path="/accept-invitation" element={<AcceptInvitation />} />

      {!isAuthenticated ? (
        <>
          <Route path="/" element={<WouterLanding />} />
          <Route path="*" element={<WouterLanding />} />
        </>
      ) : !organization ? (
        <>
          <Route path="/" element={<WouterOrganizationSetup />} />
          <Route path="/organization-setup" element={<WouterOrganizationSetup />} />
          <Route path="*" element={<WouterOrganizationSetup />} />
        </>
      ) : (
        <>
          {/* New Hiring Dashboard Routes - handles all /hiring/* routes */}
          <Route path="/hiring/*" element={<HiringDashboard />} />

          {/* Legacy Routes - kept for backward compatibility */}
          <Route path="/dashboard" element={<EmployerDashboard />} />
          <Route path="/employer-dashboard" element={<EmployerDashboard />} />
          <Route path="/resume-profiles" element={<ResumeProfiles />} />
          <Route path="/super-admin/*" element={<SuperAdminDashboard />} />
          <Route path="/organization-setup" element={<Navigate to="/hiring/overview" replace />} />
          <Route path="/" element={<Navigate to="/hiring/overview" replace />} />
          <Route path="*" element={<NotFound />} />
        </>
      )}
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}

export default App;
