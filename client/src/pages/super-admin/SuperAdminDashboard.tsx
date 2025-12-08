import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { SuperAdminLayout } from "@/components/super-admin/SuperAdminLayout";
import { SuperAdminWelcome } from "./SuperAdminWelcome";
import { SuperAdminCompanies } from "./SuperAdminCompanies";
import { SuperAdminSubscriptionPlans } from "./SuperAdminSubscriptionPlans";
import { SuperAdminCreditPackages } from "./SuperAdminCreditPackages";

export default function SuperAdminDashboard() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { isSuperAdmin, isLoading: superAdminLoading } = useSuperAdmin();
  const [, setLocation] = useLocation();
  const [activePage, setActivePage] = useState("welcome");

  // Redirect if not authenticated or not super admin
  useEffect(() => {
    if (!authLoading && !superAdminLoading) {
      if (!isAuthenticated) {
        setLocation("/");
        return;
      }
      if (!isSuperAdmin) {
        setLocation("/employer-dashboard");
        return;
      }
    }
  }, [isAuthenticated, isSuperAdmin, authLoading, superAdminLoading, setLocation]);

  // Loading state
  if (authLoading || superAdminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-blue-900/30">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-300">Loading...</p>
        </div>
      </div>
    );
  }

  // Access denied - will redirect
  if (!isSuperAdmin) {
    return null;
  }

  // Render active page content
  const renderContent = () => {
    switch (activePage) {
      case "companies":
        return <SuperAdminCompanies />;
      case "subscription-plans":
        return <SuperAdminSubscriptionPlans />;
      case "credit-packages":
        return <SuperAdminCreditPackages />;
      case "welcome":
      default:
        return <SuperAdminWelcome onNavigate={setActivePage} />;
    }
  };

  return (
    <SuperAdminLayout activePage={activePage} onNavigate={setActivePage}>
      {renderContent()}
    </SuperAdminLayout>
  );
}
