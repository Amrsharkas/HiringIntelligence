import React, { useState, memo, useMemo, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { 
  Briefcase, 
  Users, 
  Target,
  TrendingUp,
  Plus,
  Eye,
  Coffee,
  MessageSquare,
  Rocket,
  BarChart3,
  Settings,
  Bell,
  Building2,
  Calendar
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { JobPostingModal } from "@/components/JobPostingModal";
import { ActiveJobsModal } from "@/components/ActiveJobsModal";
import { CandidatesModal } from "@/components/SimpleCandidatesModal";
import { ApplicantsModal } from "@/components/ApplicantsModal";
import { AnalyticsModal } from "@/components/AnalyticsModal";
import { RecentActivityModal } from "@/components/RecentActivityModal";
import { InviteCodeModal } from "@/components/InviteCodeModal";
import { CreateInterviewModal } from "@/components/CreateInterviewModal";
import { InterviewManagementModal } from "@/components/InterviewManagementModal";
import { useToast } from "@/hooks/use-toast";

// Live components
const StatNumber = memo(({ value }: { value: number }) => (
  <div className="text-3xl font-bold" style={{ minWidth: '60px', textAlign: 'center' }}>
    {value}
  </div>
));

const InteractiveCard = memo(({ children, onClick, className, index }: {
  children: React.ReactNode;
  onClick: (e?: any) => void;
  className?: string;
  index: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay: index * 0.1 }}
    className={`group cursor-pointer h-full transform transition-all duration-200 hover:scale-[1.02] ${className}`}
    onClick={onClick}
  >
    <Card className="h-full border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-200">
      {children}
    </Card>
  </motion.div>
));

const LiveJobCount = memo(() => {
  const { data } = useQuery({
    queryKey: ["/api/job-postings/count"],
    refetchInterval: 200,
  });
  return <StatNumber value={data?.active || 0} />;
});

const LiveApplicantsCount = memo(() => {
  const { data } = useQuery({
    queryKey: ["/api/applicants/count"],
    refetchInterval: 200,
  });
  return <StatNumber value={data?.count || 0} />;
});

const LiveCandidatesCount = memo(() => {
  const { data } = useQuery({
    queryKey: ["/api/candidates/count"],
    refetchInterval: 200,
  });
  return <StatNumber value={data?.count || 0} />;
});

const LiveInterviewsCount = memo(() => {
  const { data } = useQuery({
    queryKey: ["/api/interviews/count"],
    refetchInterval: 30000,
  });
  return <StatNumber value={data?.count || 0} />;
});

const LiveOrganizationName = memo(() => {
  const { data } = useQuery({
    queryKey: ["/api/organizations/current"],
    refetchInterval: 30000,
  });
  return <span>{data?.companyName || "Your Organization"}</span>;
});

// Display names
StatNumber.displayName = 'StatNumber';
InteractiveCard.displayName = 'InteractiveCard';
LiveJobCount.displayName = 'LiveJobCount';
LiveApplicantsCount.displayName = 'LiveApplicantsCount';
LiveCandidatesCount.displayName = 'LiveCandidatesCount';
LiveInterviewsCount.displayName = 'LiveInterviewsCount';
LiveOrganizationName.displayName = 'LiveOrganizationName';

export default function EmployerDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Modal states
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [isActiveJobsModalOpen, setIsActiveJobsModalOpen] = useState(false);
  const [isCandidatesModalOpen, setIsCandidatesModalOpen] = useState(false);
  const [isApplicantsModalOpen, setIsApplicantsModalOpen] = useState(false);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [isRecentActivityModalOpen, setIsRecentActivityModalOpen] = useState(false);
  const [isInviteCodeModalOpen, setIsInviteCodeModalOpen] = useState(false);
  const [isCreateInterviewModalOpen, setIsCreateInterviewModalOpen] = useState(false);
  const [isInterviewManagementModalOpen, setIsInterviewManagementModalOpen] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: matches = [] } = useQuery({
    queryKey: ["/api/companies/matches"],
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
              Welcome back!
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              Manage your hiring process with <LiveOrganizationName />
            </p>
          </div>
          <Button
            onClick={() => setLocation("/")}
            variant="outline"
            className="hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            Sign Out
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <InteractiveCard
            index={0}
            onClick={() => setIsJobModalOpen(true)}
            className="bg-gradient-to-br from-blue-500/10 via-blue-400/5 to-transparent"
          >
            <div className="p-6 h-full flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-1">Post New Job</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Create and publish job openings</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 dark:bg-blue-500/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <Plus className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </InteractiveCard>

          <InteractiveCard
            index={1}
            onClick={() => setIsActiveJobsModalOpen(true)}
            className="bg-gradient-to-br from-green-500/10 via-green-400/5 to-transparent"
          >
            <div className="p-6 h-full flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-1">View Active Jobs</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Manage your job listings</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-500/20 dark:bg-green-500/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <Eye className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </InteractiveCard>

          <InteractiveCard
            index={2}
            onClick={() => setIsRecentActivityModalOpen(true)}
            className="bg-gradient-to-br from-purple-500/10 via-purple-400/5 to-transparent"
          >
            <div className="p-6 h-full flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-1">Recent Activity</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">View latest updates</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 dark:bg-purple-500/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <BarChart3 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </InteractiveCard>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          {[
            { 
              label: "Active Jobs", 
              component: <LiveJobCount />,
              icon: Briefcase, 
              color: "blue",
              onClick: () => setIsActiveJobsModalOpen(true)
            },
            { 
              label: "Applicants", 
              component: <LiveApplicantsCount />,
              icon: Users, 
              color: "green",
              onClick: () => setIsApplicantsModalOpen(true)
            },
            { 
              label: "Candidates", 
              component: <LiveCandidatesCount />,
              icon: Target, 
              color: "purple",
              onClick: () => setIsCandidatesModalOpen(true)
            },
            { 
              label: "Interviews", 
              component: <LiveInterviewsCount />,
              icon: Calendar, 
              color: "orange",
              onClick: () => setIsInterviewManagementModalOpen(true)
            }
          ].map((stat, index) => (
            <InteractiveCard
              key={stat.label}
              index={index + 3}
              onClick={stat.onClick}
              className={`bg-gradient-to-br from-${stat.color}-500/10 via-${stat.color}-400/5 to-transparent`}
            >
              <div className="p-6 h-full flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <stat.icon className={`w-8 h-8 text-${stat.color}-600 dark:text-${stat.color}-400`} />
                </div>
                <div>
                  {stat.component}
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mt-1">
                    {stat.label}
                  </p>
                </div>
              </div>
            </InteractiveCard>
          ))}
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-2 gap-6">
          <Card className="border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={() => setIsCreateInterviewModalOpen(true)}
                variant="outline"
                className="w-full justify-start"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Interview
              </Button>
              <Button
                onClick={() => setIsAnalyticsModalOpen(true)}
                variant="outline"
                className="w-full justify-start"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                View Analytics
              </Button>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm text-slate-800 dark:text-slate-200">System is running smoothly</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Just now</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <JobPostingModal 
        isOpen={isJobModalOpen} 
        onClose={() => setIsJobModalOpen(false)} 
      />
      <ActiveJobsModal 
        isOpen={isActiveJobsModalOpen} 
        onClose={() => setIsActiveJobsModalOpen(false)} 
      />
      <CandidatesModal 
        isOpen={isCandidatesModalOpen} 
        onClose={() => setIsCandidatesModalOpen(false)} 
      />
      <ApplicantsModal 
        isOpen={isApplicantsModalOpen} 
        onClose={() => setIsApplicantsModalOpen(false)} 
      />
      <AnalyticsModal 
        isOpen={isAnalyticsModalOpen} 
        onClose={() => setIsAnalyticsModalOpen(false)} 
      />
      <RecentActivityModal 
        isOpen={isRecentActivityModalOpen} 
        onClose={() => setIsRecentActivityModalOpen(false)} 
      />
      <InviteCodeModal 
        isOpen={isInviteCodeModalOpen} 
        onClose={() => setIsInviteCodeModalOpen(false)} 
      />
      <CreateInterviewModal 
        isOpen={isCreateInterviewModalOpen} 
        onClose={() => setIsCreateInterviewModalOpen(false)} 
      />
      <InterviewManagementModal 
        isOpen={isInterviewManagementModalOpen} 
        onClose={() => setIsInterviewManagementModalOpen(false)} 
      />
    </div>
  );
}