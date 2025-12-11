import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Briefcase,
  Users,
  FileText,
  Calendar,
  Plus,
  Search,
  BarChart3,
  TrendingUp,
  ArrowRight,
} from "lucide-react";

// Stat Card Component
const StatCard = memo(({
  title,
  value,
  icon: Icon,
  color,
  onClick
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  onClick?: () => void;
}) => (
  <motion.div
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={`cursor-pointer`}
  >
    <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200/60 dark:border-slate-700/60 hover:shadow-lg transition-all duration-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
            <p className="text-3xl font-bold text-slate-800 dark:text-slate-200 mt-1">
              {value.toLocaleString()}
            </p>
          </div>
          <div className={`p-3 rounded-xl ${color}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
));

StatCard.displayName = "StatCard";

// Quick Action Card Component
const QuickActionCard = memo(({
  title,
  description,
  icon: Icon,
  gradient,
  onClick
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  onClick: () => void;
}) => (
  <motion.div
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="cursor-pointer"
  >
    <Card className={`${gradient} border-0 hover:shadow-xl transition-all duration-200`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">{title}</h3>
              <p className="text-sm text-white/80">{description}</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-white/60" />
        </div>
      </CardContent>
    </Card>
  </motion.div>
));

QuickActionCard.displayName = "QuickActionCard";

// Live Stats Components
const LiveJobCount = memo(() => {
  const { data: jobCounts = { active: 0 } } = useQuery<any>({
    queryKey: ["/api/job-postings/count"],
    staleTime: 30000,
  });
  return jobCounts.active;
});

const LiveApplicantsCount = memo(() => {
  const { data: applicantsCount = { count: 0 } } = useQuery<any>({
    queryKey: ["/api/applicants/count"],
    staleTime: 30000,
  });
  return applicantsCount.count;
});

const LiveResumesCount = memo(() => {
  const { data: resumesCount = { count: 0 } } = useQuery<any>({
    queryKey: ["/api/resume-profiles/count"],
    staleTime: 30000,
  });
  return resumesCount.count;
});

const LiveInterviewsCount = memo(() => {
  const { data: interviewsCount = { count: 0 } } = useQuery<any>({
    queryKey: ["/api/interviews/count"],
    staleTime: 30000,
  });
  return interviewsCount.count;
});

LiveJobCount.displayName = "LiveJobCount";
LiveApplicantsCount.displayName = "LiveApplicantsCount";
LiveResumesCount.displayName = "LiveResumesCount";
LiveInterviewsCount.displayName = "LiveInterviewsCount";

export default function HiringOverview() {
  const navigate = useNavigate();

  const { data: organization } = useQuery<any>({
    queryKey: ["/api/organizations/current"],
    staleTime: 30000,
  });

  // Get live counts
  const { data: jobCounts = { active: 0 } } = useQuery<any>({
    queryKey: ["/api/job-postings/count"],
    staleTime: 30000,
  });

  const { data: applicantsCount = { count: 0 } } = useQuery<any>({
    queryKey: ["/api/applicants/count"],
    staleTime: 30000,
  });

  const { data: resumesCount = { count: 0 } } = useQuery<any>({
    queryKey: ["/api/resume-profiles/count"],
    staleTime: 30000,
  });

  const { data: interviewsCount = { count: 0 } } = useQuery<any>({
    queryKey: ["/api/interviews/count"],
    staleTime: 30000,
  });

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">
          Welcome back{organization?.companyName ? `, ${organization.companyName}` : ""}!
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          Here's an overview of your hiring activities
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Jobs"
          value={jobCounts.active || 0}
          icon={Briefcase}
          color="bg-gradient-to-br from-blue-500 to-blue-600"
          onClick={() => navigate("/hiring/jobs")}
        />
        <StatCard
          title="Total Applicants"
          value={applicantsCount.count || 0}
          icon={Users}
          color="bg-gradient-to-br from-emerald-500 to-emerald-600"
          onClick={() => navigate("/hiring/applicants")}
        />
        <StatCard
          title="Resume Profiles"
          value={resumesCount.count || 0}
          icon={FileText}
          color="bg-gradient-to-br from-purple-500 to-purple-600"
          onClick={() => navigate("/hiring/resumes")}
        />
        <StatCard
          title="Scheduled Interviews"
          value={interviewsCount.count || 0}
          icon={Calendar}
          color="bg-gradient-to-br from-amber-500 to-amber-600"
          onClick={() => navigate("/hiring/interviews")}
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <QuickActionCard
            title="Post a New Job"
            description="Create and publish a new job posting"
            icon={Plus}
            gradient="bg-gradient-to-r from-blue-500 to-blue-600"
            onClick={() => navigate("/hiring/jobs/new")}
          />
          <QuickActionCard
            title="Search Resumes"
            description="Find candidates with AI-powered search"
            icon={Search}
            gradient="bg-gradient-to-r from-purple-500 to-purple-600"
            onClick={() => navigate("/hiring/resumes/search")}
          />
          <QuickActionCard
            title="View Applicants"
            description="Review and manage your applicants"
            icon={Users}
            gradient="bg-gradient-to-r from-emerald-500 to-emerald-600"
            onClick={() => navigate("/hiring/applicants")}
          />
          <QuickActionCard
            title="View Analytics"
            description="See your hiring performance metrics"
            icon={BarChart3}
            gradient="bg-gradient-to-r from-amber-500 to-amber-600"
            onClick={() => navigate("/hiring/analytics")}
          />
        </div>
      </div>

      {/* Recent Activity Section */}
      <div>
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4">
          Recent Activity
        </h2>
        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200/60 dark:border-slate-700/60">
          <CardContent className="p-6">
            <RecentActivityList />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Recent Activity List Component
const RecentActivityList = memo(() => {
  const { data: jobCounts = { active: 0 } } = useQuery<any>({
    queryKey: ["/api/job-postings/count"],
    staleTime: 30000,
  });

  const { data: applicantsCount = { count: 0 } } = useQuery<any>({
    queryKey: ["/api/applicants/count"],
    staleTime: 30000,
  });

  const { data: resumesCount = { count: 0 } } = useQuery<any>({
    queryKey: ["/api/resume-profiles/count"],
    staleTime: 30000,
  });

  const { data: interviewsCount = { count: 0 } } = useQuery<any>({
    queryKey: ["/api/interviews/count"],
    staleTime: 30000,
  });

  const activities = [];

  if (jobCounts.active > 0) {
    activities.push({
      id: "jobs",
      color: "bg-blue-500",
      text: `${jobCounts.active} active job posting${jobCounts.active !== 1 ? "s" : ""} currently live`,
      time: "Active",
    });
  }

  if (applicantsCount.count > 0) {
    activities.push({
      id: "applicants",
      color: "bg-emerald-500",
      text: `${applicantsCount.count} applicant${applicantsCount.count !== 1 ? "s" : ""} in pipeline`,
      time: "Total",
    });
  }

  if (resumesCount.count > 0) {
    activities.push({
      id: "resumes",
      color: "bg-purple-500",
      text: `${resumesCount.count} resume profile${resumesCount.count !== 1 ? "s" : ""} processed`,
      time: "Total",
    });
  }

  if (interviewsCount.count > 0) {
    activities.push({
      id: "interviews",
      color: "bg-amber-500",
      text: `${interviewsCount.count} interview${interviewsCount.count !== 1 ? "s" : ""} scheduled`,
      time: "Upcoming",
    });
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 dark:text-slate-400">
        <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No activity yet. Start by posting a job!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-start gap-3">
          <div className={`w-2 h-2 ${activity.color} rounded-full mt-2`}></div>
          <div className="flex-1">
            <p className="text-sm text-slate-800 dark:text-slate-200">{activity.text}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{activity.time}</p>
          </div>
        </div>
      ))}
    </div>
  );
});

RecentActivityList.displayName = "RecentActivityList";
