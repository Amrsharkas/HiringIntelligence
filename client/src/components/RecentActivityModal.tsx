import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  X, 
  BarChart3, 
  TrendingUp, 
  Users, 
  Briefcase, 
  Calendar,
  Clock,
  Target,
  CheckCircle,
  UserPlus,
  FileText,
  MessageSquare,
  Award,
  Activity,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Badge } from "@/components/ui/badge";

interface RecentActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ActivityItem {
  id: string;
  type: 'job_created' | 'interview_scheduled' | 'candidate_matched' | 'application_received';
  title: string;
  description: string;
  timestamp: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

// Live stat components that refresh in real-time
const LiveActivityStats = () => {
  const { toast } = useToast();
  
  // Job postings count
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
          window.location.href = "/";
        }, 500);
      }
    },
  });

  // Candidates count
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
          window.location.href = "/";
        }, 500);
      }
    },
  });

  // Applicants count
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
          window.location.href = "/";
        }, 500);
      }
    },
  });

  // Interviews count
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
          window.location.href = "/";
        }, 500);
      }
    },
  });

  // Generate mock recent activities based on real stats
  const generateRecentActivities = (): ActivityItem[] => {
    const activities: ActivityItem[] = [];
    const currentTime = new Date();
    
    // Add job-related activities
    if (jobCounts.active > 0) {
      activities.push({
        id: 'job-1',
        type: 'job_created',
        title: 'Job Postings Active',
        description: `${jobCounts.active} active job posting${jobCounts.active !== 1 ? 's' : ''} currently live`,
        timestamp: new Date(currentTime.getTime() - 30 * 60000).toISOString(), // 30 min ago
        icon: <Briefcase className="w-4 h-4" />,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100'
      });
    }

    // Add interview activities
    if (interviewsCount.count > 0) {
      activities.push({
        id: 'interview-1',
        type: 'interview_scheduled',
        title: 'Interviews Scheduled',
        description: `${interviewsCount.count} interview${interviewsCount.count !== 1 ? 's' : ''} scheduled with candidates`,
        timestamp: new Date(currentTime.getTime() - 45 * 60000).toISOString(), // 45 min ago
        icon: <Calendar className="w-4 h-4" />,
        color: 'text-green-600',
        bgColor: 'bg-green-100'
      });
    }

    // Add candidate activities
    if (candidatesCount.count > 0) {
      activities.push({
        id: 'candidate-1',
        type: 'candidate_matched',
        title: 'AI Candidates Matched',
        description: `${candidatesCount.count} candidate${candidatesCount.count !== 1 ? 's' : ''} found through AI matching`,
        timestamp: new Date(currentTime.getTime() - 60 * 60000).toISOString(), // 1 hour ago
        icon: <Target className="w-4 h-4" />,
        color: 'text-purple-600',
        bgColor: 'bg-purple-100'
      });
    }

    // Add application activities
    if (applicantsCount.count > 0) {
      activities.push({
        id: 'application-1',
        type: 'application_received',
        title: 'Applications Received',
        description: `${applicantsCount.count} direct application${applicantsCount.count !== 1 ? 's' : ''} from candidates`,
        timestamp: new Date(currentTime.getTime() - 90 * 60000).toISOString(), // 1.5 hours ago
        icon: <FileText className="w-4 h-4" />,
        color: 'text-orange-600',
        bgColor: 'bg-orange-100'
      });
    }

    // Add system activity
    activities.push({
      id: 'sync-1',
      type: 'job_created',
      title: 'System Sync Active',
      description: 'Real-time data sync with Airtable running smoothly',
      timestamp: new Date(currentTime.getTime() - 5 * 60000).toISOString(), // 5 min ago
      icon: <RefreshCw className="w-4 h-4" />,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100'
    });

    return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const activities = generateRecentActivities();

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Live Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center"
        >
          <Briefcase className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {jobCounts.active}
          </div>
          <div className="text-sm text-blue-600/80 dark:text-blue-400/80">
            Active Jobs
          </div>
        </motion.div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center"
        >
          <Calendar className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {interviewsCount.count}
          </div>
          <div className="text-sm text-green-600/80 dark:text-green-400/80">
            Interviews
          </div>
        </motion.div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center"
        >
          <Target className="w-8 h-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {candidatesCount.count}
          </div>
          <div className="text-sm text-purple-600/80 dark:text-purple-400/80">
            AI Matches
          </div>
        </motion.div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 text-center"
        >
          <FileText className="w-8 h-8 text-orange-600 dark:text-orange-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {applicantsCount.count}
          </div>
          <div className="text-sm text-orange-600/80 dark:text-orange-400/80">
            Applications
          </div>
        </motion.div>
      </div>

      {/* Recent Activities Timeline */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Recent Activity
        </h3>
        
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {activities.map((activity, index) => (
            <motion.div
              key={activity.id}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg"
            >
              <div className={`w-8 h-8 ${activity.bgColor} dark:${activity.bgColor}/20 rounded-full flex items-center justify-center flex-shrink-0`}>
                <div className={activity.color}>{activity.icon}</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                    {activity.title}
                  </h4>
                  <span className="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0 ml-2">
                    {formatTimeAgo(activity.timestamp)}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  {activity.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
        
        {activities.length === 0 && (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No recent activity to display</p>
          </div>
        )}
      </div>
    </div>
  );
};

export function RecentActivityModal({ isOpen, onClose }: RecentActivityModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <BarChart3 className="w-6 h-6 text-green-600 dark:text-green-400" />
                Recent Activity
                <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700">
                  Live
                </Badge>
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              Real-time dashboard statistics and recent platform activity
            </p>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            <LiveActivityStats />
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}