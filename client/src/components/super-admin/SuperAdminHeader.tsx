import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/components/ThemeProvider";
import { Menu, Sun, Moon, LogOut, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface SuperAdminHeaderProps {
  onMenuClick?: () => void;
}

export function SuperAdminHeader({ onMenuClick }: SuperAdminHeaderProps) {
  const { user, logoutMutation } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const userInitials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : "U";

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-700/60 sticky top-0 z-30"
    >
      <div className="h-16 px-4 sm:px-6 flex items-center justify-between">
        {/* Left Side - Mobile Menu Button */}
        <div className="flex items-center gap-4">
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right Side - User Menu */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-slate-100/60 dark:bg-slate-800/60 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-300 transition-all duration-200"
            title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          >
            {theme === "light" ? (
              <Moon className="w-5 h-5" />
            ) : (
              <Sun className="w-5 h-5" />
            )}
          </button>

          {/* User Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 px-2 sm:px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-linear-to-br from-purple-500 to-pink-600 text-white text-sm">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:block text-sm text-slate-600 dark:text-slate-400 max-w-[150px] truncate">
                  {user?.email}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3 py-2">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {user?.email}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 dark:text-red-400">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.header>
  );
}
