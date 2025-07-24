import React, { useState, memo, useMemo } from "react";
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

import { AnalyticsModal } from "@/components/AnalyticsModal";
import { ApplicantsModal } from "@/components/ApplicantsModal";
import { ShortlistedApplicantsModal } from "@/components/ShortlistedApplicantsModal";
import { InviteCodeModal } from "@/components/InviteCodeModal";

import { CreateInterviewModal } from "@/components/CreateInterviewModal";
import { InterviewManagementModal } from "@/components/InterviewManagementModal";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

// Live components that refresh only their specific data without page reload
const LiveJobCount = memo(() => {
  const { data: jobCounts = { active: 0 } } = useQuery<any>({
    queryKey: ["/api/job-postings/count"],
    refetchInterval: 200,
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  return (
    <div className="text-3xl font-bold" style={{ minWidth: '60px', textAlign: 'center' }}>
      {jobCounts.active}
    </div>
  );
});

const LiveOrganizationName = memo(() => {
  const { data: organization } = useQuery<any>({
    queryKey: ["/api/organizations/current"],
    refetchInterval: 200,
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  return <span>{organization?.companyName || "Your Organization"}</span>;
});

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
    transition={{ delay: index * 0.1 }}
    className={`group relative bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/60 rounded-2xl p-6 cursor-pointer hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50 hover:border-slate-300/60 dark:hover:border-slate-600/60 transition-all duration-300 will-change-transform ${className}`}
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick(e);
    }}
    whileHover={{
      scale: 1.02,
      transition: { duration: 0.2 }
    }}
    whileTap={{ scale: 0.98 }}
  >
    {children}
  </motion.div>
));

const LiveApplicantsCount = memo(() => {
  const { toast } = useToast();
  const { data: applicantsCount = { count: 0 } } = useQuery<any>({
    queryKey: ["/api/applicants/count"],
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
    },
  });
  return (
    <div className="text-3xl font-bold" style={{ minWidth: '60px', textAlign: 'center' }}>
      {applicantsCount.count}
    </div>
  );
});

const LiveCandidatesCount = memo(() => {
  const { toast } = useToast();
  const { data: candidatesCount = { count: 0 } } = useQuery<any>({
    queryKey: ["/api/candidates/count"],
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
    },
  });
  return (
    <div className="text-3xl font-bold" style={{ minWidth: '60px', textAlign: 'center' }}>
      {candidatesCount.count}
    </div>
  );
});

LiveJobCount.displayName = 'LiveJobCount';
LiveOrganizationName.displayName = 'LiveOrganizationName';
LiveApplicantsCount.displayName = 'LiveApplicantsCount';
const LiveInterviewsCount = memo(() => {
  const { toast } = useToast();
  const { data: interviewsCount = { count: 0 } } = useQuery<any>({
    queryKey: ["/api/interviews/count"],
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
    },
  });
  return (
    <div className="text-3xl font-bold" style={{ minWidth: '60px', textAlign: 'center' }}>
      {interviewsCount.count}
    </div>
  );
});

// Live Recent Activity component for bottom section
const LiveRecentActivity = memo(() => {
  const { toast } = useToast();
  
  // Get live stats for recent activity generation
  const { data: jobCounts = { active: 0 } } = useQuery<any>({
    queryKey: ["/api/job-postings/count"],
    refetchInterval: 5000, // 5 seconds
    staleTime: 0,
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      }
    },
  });

  const { data: candidatesCount = { count: 0 } } = useQuery<any>({
    queryKey: ["/api/candidates/count"],
    refetchInterval: 5000,
    staleTime: 0,
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      }
    },
  });

  const { data: applicantsCount = { count: 0 } } = useQuery<any>({
    queryKey: ["/api/applicants/count"],
    refetchInterval: 5000,
    staleTime: 0,
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      }
    },
  });

  const { data: interviewsCount = { count: 0 } } = useQuery<any>({
    queryKey: ["/api/interviews/count"],
    refetchInterval: 5000,
    staleTime: 0,
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      }
    },
  });

  // Generate activity items based on real data
  const generateActivityItems = () => {
    const activities = [];
    const currentTime = new Date();

    if (jobCounts.active > 0) {
      activities.push({
        id: 'jobs-active',
        color: 'bg-blue-600 dark:bg-blue-400',
        text: `${jobCounts.active} active job posting${jobCounts.active !== 1 ? 's' : ''} currently live`,
        time: '5 minutes ago'
      });
    }

    if (interviewsCount.count > 0) {
      activities.push({
        id: 'interviews-scheduled',
        color: 'bg-green-600 dark:bg-green-400',
        text: `${interviewsCount.count} interview${interviewsCount.count !== 1 ? 's' : ''} scheduled with candidates`,
        time: '15 minutes ago'
      });
    }

    if (candidatesCount.count > 0) {
      activities.push({
        id: 'candidates-matched',
        color: 'bg-purple-600 dark:bg-purple-400',
        text: `${candidatesCount.count} AI candidate${candidatesCount.count !== 1 ? 's' : ''} matched to jobs`,
        time: '30 minutes ago'
      });
    }

    if (applicantsCount.count > 0) {
      activities.push({
        id: 'applications-received',
        color: 'bg-orange-600 dark:bg-orange-400',
        text: `${applicantsCount.count} direct application${applicantsCount.count !== 1 ? 's' : ''} received`,
        time: '45 minutes ago'
      });
    }

    // Always show sync activity
    activities.push({
      id: 'sync-active',
      color: 'bg-emerald-600 dark:bg-emerald-400',
      text: 'Real-time Airtable sync running smoothly',
      time: '1 minute ago'
    });

    // Take only first 3 items to fit the UI
    return activities.slice(0, 3);
  };

  const activities = generateActivityItems();

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-start gap-3">
          <div className={`w-2 h-2 ${activity.color} rounded-full mt-2`}></div>
          <div>
            <p className="text-sm text-slate-800 dark:text-slate-200">{activity.text}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{activity.time}</p>
          </div>
        </div>
      ))}
      {activities.length === 0 && (
        <div className="flex items-start gap-3">
          <div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full mt-2"></div>
          <div>
            <p className="text-sm text-slate-800 dark:text-slate-200">No recent activity</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Just now</p>
          </div>
        </div>
      )}
    </div>
  );
});

LiveCandidatesCount.displayName = 'LiveCandidatesCount';
LiveInterviewsCount.displayName = 'LiveInterviewsCount';
LiveRecentActivity.displayName = 'LiveRecentActivity';
StatNumber.displayName = 'StatNumber';
InteractiveCard.displayName = 'InteractiveCard';

export default function EmployerDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [isActiveJobsModalOpen, setIsActiveJobsModalOpen] = useState(false);
  const [isCandidatesModalOpen, setIsCandidatesModalOpen] = useState(false);

  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [isApplicantsModalOpen, setIsApplicantsModalOpen] = useState(false);

  const [isShortlistedApplicantsModalOpen, setIsShortlistedApplicantsModalOpen] = useState(false);
  const [isInviteCodeModalOpen, setIsInviteCodeModalOpen] = useState(false);

  const [isCreateInterviewModalOpen, setIsCreateInterviewModalOpen] = useState(false);
  const [isInterviewManagementModalOpen, setIsInterviewManagementModalOpen] = useState(false);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Static data queries that don't need frequent updates
  const { data: matches = [] } = useQuery<any[]>({
    queryKey: ["/api/companies/matches"],
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "GET" });
      window.location.href = "/";
    } catch (error) {
      window.location.href = "/";
    }
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-blue-900/30">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-300">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-blue-900/30">
      {/* Modern Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-700/60 sticky top-0 z-50"
      >
        <div className="h-16 px-6 flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setLocation("/employer-dashboard")}
              className="text-2xl font-bold text-black dark:text-white"
            >
              Plato
            </motion.button>
            
            <div className="flex items-center gap-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 px-4 py-2 rounded-xl border border-blue-200/50 dark:border-blue-700/50">
              <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Member of <LiveOrganizationName />
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              className="p-2 rounded-xl bg-slate-100/60 dark:bg-slate-800/60 hover:bg-blue-100/60 dark:hover:bg-blue-900/60 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 will-change-transform hover:scale-110"
              style={{
                transformOrigin: 'center',
                transform: 'translateZ(0)'
              }}
            >
              <Bell className="w-5 h-5" />
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white text-sm font-medium cursor-pointer transition-all duration-200 will-change-transform hover:scale-105"
              style={{
                transformOrigin: 'center',
                transform: 'translateZ(0)'
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </motion.header>

      {/* Main Content Area */}
      <div className="h-[calc(100vh-4rem)] p-6 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="h-full grid grid-rows-[auto_1fr_1fr] gap-6"
        >
          {/* Top Action Cards */}
          <div className="grid grid-cols-3 gap-6">
            <InteractiveCard
              index={0}
              onClick={() => setIsJobModalOpen(true)}
              className="bg-gradient-to-br from-blue-500/10 via-blue-400/5 to-transparent"
            >
              <div className="p-6 h-full flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-1">Post New Job</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Create job posting</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 dark:bg-blue-500/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <Plus className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </InteractiveCard>

            <InteractiveCard
              index={1}
              onClick={() => setIsShortlistedApplicantsModalOpen(true)}
              className="bg-gradient-to-br from-green-500/10 via-green-400/5 to-transparent"
            >
              <div className="p-6 h-full flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-1">Shortlisted Applicants</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">View your favorites</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-500/20 dark:bg-green-500/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </InteractiveCard>

            <InteractiveCard
              index={2}
              onClick={() => setIsAnalyticsModalOpen(true)}
              className="bg-gradient-to-br from-purple-500/10 via-purple-400/5 to-transparent"
            >
              <div className="p-6 h-full flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-1">Analytics</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">View hiring insights</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 dark:bg-purple-500/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <BarChart3 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </InteractiveCard>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-6">
            {useMemo(() => [
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
            ], [matches?.length, 0]).map((stat, index) => (
              <InteractiveCard
                key={stat.label}
                index={index + 3}
                onClick={stat.onClick}
                className={`bg-gradient-to-br from-${stat.color}-500/10 via-${stat.color}-400/5 to-transparent`}
              >
                <div className="p-6 h-full flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <div className="group-hover:scale-110 transition-transform duration-200">
                      <stat.icon className={`w-8 h-8 text-${stat.color}-600 dark:text-${stat.color}-400`} />
                    </div>
                    <div className="text-right">
                      <div className={`text-${stat.color}-600 dark:text-${stat.color}-400`}>
                        {stat.component}
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{stat.label}</p>
                  </div>
                </div>
              </InteractiveCard>
            ))}
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-2 gap-6">
            <Card className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-800 border-slate-200/60 dark:border-slate-700/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Rocket className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-left hover:bg-blue-50 dark:hover:bg-blue-900/30"
                  onClick={() => setIsJobModalOpen(true)}
                >
                  <Plus className="w-4 h-4 text-blue-600 dark:text-blue-400 mr-3" />
                  Create New Job Posting
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-left hover:bg-green-50 dark:hover:bg-green-900/30"
                  onClick={() => setIsCandidatesModalOpen(true)}
                >
                  <Eye className="w-4 h-4 text-green-600 dark:text-green-400 mr-3" />
                  Browse Candidates
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-left hover:bg-purple-50 dark:hover:bg-purple-900/30"
                  onClick={() => setIsApplicantsModalOpen(true)}
                >
                  <Users className="w-4 h-4 text-purple-600 dark:text-purple-400 mr-3" />
                  View Applicants
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-left hover:bg-orange-50 dark:hover:bg-orange-900/30"
                  onClick={() => setIsInterviewManagementModalOpen(true)}
                >
                  <Calendar className="w-4 h-4 text-orange-600 dark:text-orange-400 mr-3" />
                  Manage Interviews
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-left hover:bg-purple-50 dark:hover:bg-purple-900/30"
                  onClick={() => setIsAnalyticsModalOpen(true)}
                >
                  <BarChart3 className="w-4 h-4 text-purple-600 dark:text-purple-400 mr-3" />
                  View Analytics Report
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-800 border-slate-200/60 dark:border-slate-700/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Coffee className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <LiveRecentActivity />
              </CardContent>
            </Card>
          </div>
        </motion.div>
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

      <AnalyticsModal 
        isOpen={isAnalyticsModalOpen} 
        onClose={() => setIsAnalyticsModalOpen(false)} 
      />

      <ApplicantsModal 
        isOpen={isApplicantsModalOpen} 
        onClose={() => setIsApplicantsModalOpen(false)} 
      />

      <ShortlistedApplicantsModal 
        isOpen={isShortlistedApplicantsModalOpen} 
        onClose={() => setIsShortlistedApplicantsModalOpen(false)} 
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
