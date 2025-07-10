import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import EmployerDashboard from "@/pages/employer-dashboard";
import OrganizationSetup from "@/pages/organization-setup";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Check if user has an organization
  const { data: organization, isLoading: orgLoading } = useQuery({
    queryKey: ["/api/organizations/current"],
    enabled: isAuthenticated && !!user,
    retry: false,
  });

  if (isLoading || (isAuthenticated && orgLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/login" component={Login} />
          <Route path="/signup" component={Signup} />
          <Route path="/employer-dashboard" component={Landing} />
          <Route path="/organization-setup" component={Landing} />
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
