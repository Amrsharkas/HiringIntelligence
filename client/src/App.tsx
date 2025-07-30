import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { usePendingInvitation } from "@/hooks/usePendingInvitation";
import Landing from "@/pages/landing";
import EmployerDashboard from "@/pages/employer-dashboard";
import OrganizationSetup from "@/pages/organization-setup";
import { AcceptInvitation } from "@/pages/AcceptInvitation";
import InviteAccept from "@/pages/InviteAccept";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";

function Router() {
  const { isAuthenticated, isLoading, user } = useFirebaseAuth();
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
    <Switch>
      {/* Enhanced invitation routes - accessible without full auth checks */}
      <Route path="/invite/accept" component={InviteAccept} />
      <Route path="/accept-invitation" component={AcceptInvitation} />
      
      {!isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route component={Landing} />
        </>
      ) : !organization ? (
        <>
          <Route path="/" component={OrganizationSetup} />
          <Route path="/organization-setup" component={OrganizationSetup} />
          <Route component={OrganizationSetup} />
        </>
      ) : (
        <>
          <Route path="/" component={EmployerDashboard} />
          <Route path="/employer-dashboard" component={EmployerDashboard} />
          <Route path="/dashboard" component={EmployerDashboard} />
          <Route path="/organization-setup" component={EmployerDashboard} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
