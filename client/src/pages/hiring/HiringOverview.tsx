import { memo, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import {
  Briefcase,
  Users,
  FileText,
  Calendar,
  Plus,
  Search,
  BarChart3,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { TutorialSlideshow, useTutorial } from "@/components/TutorialSlideshow";

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

export default function HiringOverview() {
  const navigate = useNavigate();
  const { shouldShow: shouldShowTutorial } = useTutorial('hiring');
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  // Show tutorial on first visit if not completed
  useEffect(() => {
    if (shouldShowTutorial) {
      setIsTutorialOpen(true);
    }
  }, [shouldShowTutorial]);

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
        className="mb-8 flex justify-between items-start"
      >
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">
            Welcome back{organization?.companyName ? `, ${organization.companyName}` : ""}!
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Here's an overview of your hiring activities
          </p>
        </div>
        <button
          onClick={() => setIsTutorialOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
        >
          <BookOpen className="w-4 h-4" />
          Show Tutorial
        </button>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Jobs"
          value={jobCounts.active || 0}
          icon={Briefcase}
          color="bg-primary"
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
            gradient="bg-primary"
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

      {/* Tutorial Slideshow */}
      <TutorialSlideshow
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        audience="hiring"
      />

    </div>
  );
}
