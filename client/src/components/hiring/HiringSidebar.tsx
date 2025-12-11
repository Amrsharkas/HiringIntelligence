import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Home,
  Briefcase,
  Users,
  FileText,
  Calendar,
  BarChart3,
  UserPlus,
  CreditCard,
  Settings,
  X,
  Crown,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import logo from "@assets/logo.png";

interface NavSection {
  title: string;
  items: NavItem[];
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

interface HiringSidebarProps {
  activePage: string;
  isOpen: boolean;
  onClose: () => void;
}

const navSections: NavSection[] = [
  {
    title: "Overview",
    items: [
      { id: "overview", label: "Dashboard", icon: Home, path: "/hiring/overview" },
    ],
  },
  {
    title: "Recruitment",
    items: [
      { id: "jobs", label: "Jobs", icon: Briefcase, path: "/hiring/jobs" },
      { id: "applicants", label: "Applicants", icon: Users, path: "/hiring/applicants" },
      { id: "resumes", label: "Resumes", icon: FileText, path: "/hiring/resumes" },
      { id: "interviews", label: "Interviews", icon: Calendar, path: "/hiring/interviews" },
    ],
  },
  {
    title: "Insights",
    items: [
      { id: "analytics", label: "Analytics", icon: BarChart3, path: "/hiring/analytics" },
    ],
  },
  {
    title: "Organization",
    items: [
      { id: "team", label: "Team", icon: UserPlus, path: "/hiring/team" },
      { id: "billing", label: "Billing", icon: CreditCard, path: "/hiring/billing" },
      { id: "settings", label: "Settings", icon: Settings, path: "/hiring/settings" },
    ],
  },
];

export function HiringSidebar({ activePage, isOpen, onClose }: HiringSidebarProps) {
  const navigate = useNavigate();

  const { data: organization } = useQuery<any>({
    queryKey: ["/api/organizations/current"],
    staleTime: 30000,
  });

  const { data: subscription } = useQuery<any>({
    queryKey: ["/api/subscriptions/current"],
    staleTime: 60000,
  });

  const planName = subscription?.plan?.name || "Free";
  const cvCredits = organization?.cvProcessingCredits || 0;
  const interviewCredits = organization?.interviewCredits || 0;

  const isActive = (itemId: string) => {
    return activePage === itemId || activePage.startsWith(itemId + "/");
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-full w-64 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-r border-slate-200/60 dark:border-slate-700/60 z-40 flex flex-col transition-transform duration-300 ease-in-out",
        "lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      {/* Logo & Org Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700/60 flex-shrink-0">
        <div
          className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
          onClick={() => handleNavigation("/hiring/overview")}
        >
          <img src={logo} alt="Logo" className="h-8 w-auto flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
              {organization?.companyName || "Hiring Dashboard"}
            </h1>
          </div>
        </div>
        {/* Mobile close button */}
        <button
          onClick={onClose}
          className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        {navSections.map((section) => (
          <div key={section.title}>
            <h3 className="px-4 mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {section.title}
            </h3>
            <div className="space-y-1">
              {section.items.map((item) => (
                <motion.button
                  key={item.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleNavigation(item.path)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200",
                    isActive(item.id)
                      ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </motion.button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Plan & Credits Footer */}
      <div className="p-4 border-t border-slate-200/60 dark:border-slate-700/60 flex-shrink-0 space-y-3">
        {/* Current Plan */}
        <div
          className="p-3 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleNavigation("/hiring/billing")}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {planName} Plan
              </span>
            </div>
            <ArrowUpRight className="w-3 h-3 text-slate-400" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-xs text-slate-600 dark:text-slate-400">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {cvCredits.toLocaleString()}
                </span>{" "}
                CV
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span className="text-xs text-slate-600 dark:text-slate-400">
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {interviewCredits.toLocaleString()}
                </span>{" "}
                Int
              </span>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
          Hiring Intelligence
        </p>
      </div>
    </aside>
  );
}
