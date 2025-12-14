import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Home, Building2, CreditCard, Package, Users, X, ArrowLeft, Shield, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import logo from "@assets/logo.png";

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface SuperAdminSidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const navItems: NavItem[] = [
  { id: "welcome", label: "Overview", icon: Home },
  { id: "companies", label: "Companies", icon: Building2 },
  { id: "users", label: "Users", icon: Users },
  { id: "subscription-plans", label: "Plans", icon: CreditCard },
  { id: "credit-packages", label: "Packages", icon: Package },
  { id: "tutorial-slides", label: "Tutorial Slides", icon: BookOpen },
];

export function SuperAdminSidebar({ activePage, onNavigate, isOpen, onClose }: SuperAdminSidebarProps) {
  const navigate = useNavigate();

  const handleBackToDashboard = () => {
    navigate("/hiring/overview");
    onClose();
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-full w-64 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-r border-slate-200/60 dark:border-slate-700/60 z-40 flex flex-col transform transition-transform duration-300 ease-in-out",
        "lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      {/* Logo & Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700/60 flex-shrink-0">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Plato Logo" className="h-8 w-auto" />
          <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 border border-purple-200/50 dark:border-purple-700/50">
            <Shield className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
              Super Admin
            </span>
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
      <nav className="flex-1 overflow-y-auto p-4 space-y-2">
        {navItems.map((item) => (
          <motion.button
            key={item.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200",
              activePage === item.id
                ? "bg-primary text-primary-foreground shadow-lg"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </motion.button>
        ))}
      </nav>

      {/* Footer - Back to Dashboard */}
      <div className="p-4 border-t border-slate-200/60 dark:border-slate-700/60 flex-shrink-0">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleBackToDashboard}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to Dashboard</span>
        </motion.button>
      </div>
    </aside>
  );
}
