import { useEffect, useMemo } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { HiringLayout } from "@/components/hiring/HiringLayout";

// Page imports
import HiringOverview from "./HiringOverview";
import JobsPage from "./jobs/JobsPage";
import JobCreatePage from "./jobs/JobCreatePage";
import JobDetailsPage from "./jobs/JobDetailsPage";
import JobEditPage from "./jobs/JobEditPage";
import JobApplicantsPage from "./jobs/JobApplicantsPage";
import ApplicantsPage from "./applicants/ApplicantsPage";
import ShortlistedPage from "./applicants/ShortlistedPage";
import AcceptedPage from "./applicants/AcceptedPage";
import DeniedPage from "./applicants/DeniedPage";
import ApplicantDetailsPage from "./applicants/ApplicantDetailsPage";
import ResumesPage from "./resumes/ResumesPage";
import ResumeSearchPage from "./resumes/ResumeSearchPage";
import ResumeDetailsPage from "./resumes/ResumeDetailsPage";
import ResumeUploadPage from "./resumes/ResumeUploadPage";
import InterviewsPage from "./interviews/InterviewsPage";
import CreateInterviewPage from "./interviews/CreateInterviewPage";
import AnalyticsPage from "./AnalyticsPage";
import BillingPage from "./BillingPage";
import SubscriptionPlansPage from "./billing/SubscriptionPlansPage";
import PurchaseCreditsPage from "./billing/PurchaseCreditsPage";
import TeamPage from "./TeamPage";
import InviteMemberPage from "./team/InviteMemberPage";
import SettingsPage from "./SettingsPage";

export default function HiringDashboard() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const location = useLocation();

  // Check if user has an organization
  const { data: organization, isLoading: orgLoading } = useQuery({
    queryKey: ["/api/organizations/current"],
    enabled: isAuthenticated,
    retry: false,
  });

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "Please sign in to access the dashboard.",
        variant: "destructive",
      });
      window.location.href = "/";
    }
  }, [isAuthenticated, isLoading, toast]);

  // Determine active page for sidebar highlighting
  const activePage = useMemo(() => {
    const path = location.pathname;
    if (path.includes("/hiring/overview") || path === "/hiring") return "overview";
    if (path.includes("/hiring/jobs")) return "jobs";
    if (path.includes("/hiring/applicants")) return "applicants";
    if (path.includes("/hiring/resumes")) return "resumes";
    if (path.includes("/hiring/interviews")) return "interviews";
    if (path.includes("/hiring/analytics")) return "analytics";
    if (path.includes("/hiring/billing")) return "billing";
    if (path.includes("/hiring/team")) return "team";
    if (path.includes("/hiring/settings")) return "settings";
    return "overview";
  }, [location.pathname]);

  // Loading state
  if (isLoading || orgLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-linear-to-br from-slate-50 via-white to-blue-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-blue-900/30">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-300">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <HiringLayout activePage={activePage}>
      <Routes>
        {/* Default redirect - use relative path for nested routes */}
        <Route index element={<Navigate to="overview" replace />} />

        {/* Overview */}
        <Route path="overview" element={<HiringOverview />} />

        {/* Jobs routes */}
        <Route path="jobs" element={<JobsPage />} />
        <Route path="jobs/new" element={<JobCreatePage />} />
        <Route path="jobs/:jobId" element={<JobDetailsPage />} />
        <Route path="jobs/:jobId/edit" element={<JobEditPage />} />
        <Route path="jobs/:jobId/applicants" element={<JobApplicantsPage />} />

        {/* Applicants routes - specific routes before dynamic */}
        <Route path="applicants" element={<ApplicantsPage />} />
        <Route path="applicants/shortlisted" element={<ShortlistedPage />} />
        <Route path="applicants/accepted" element={<AcceptedPage />} />
        <Route path="applicants/denied" element={<DeniedPage />} />
        <Route path="applicants/:applicantId" element={<ApplicantDetailsPage />} />

        {/* Resumes routes */}
        <Route path="resumes" element={<ResumesPage />} />
        <Route path="resumes/upload" element={<ResumeUploadPage />} />
        <Route path="resumes/search" element={<ResumeSearchPage />} />
        <Route path="resumes/:resumeId" element={<ResumeDetailsPage />} />

        {/* Interviews routes */}
        <Route path="interviews" element={<InterviewsPage />} />
        <Route path="interviews/new" element={<CreateInterviewPage />} />

        {/* Other routes */}
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="billing" element={<BillingPage />} />
        <Route path="billing/plans" element={<SubscriptionPlansPage />} />
        <Route path="billing/credits" element={<PurchaseCreditsPage />} />
        <Route path="team" element={<TeamPage />} />
        <Route path="team/invite" element={<InviteMemberPage />} />
        <Route path="settings" element={<SettingsPage />} />

        {/* Catch all - redirect to overview */}
        <Route path="*" element={<Navigate to="overview" replace />} />
      </Routes>
    </HiringLayout>
  );
}
