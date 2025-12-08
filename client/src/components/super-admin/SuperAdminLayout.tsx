import { ReactNode } from "react";
import { motion } from "framer-motion";
import { SuperAdminHeader } from "./SuperAdminHeader";
import { SuperAdminSidebar } from "./SuperAdminSidebar";

interface SuperAdminLayoutProps {
  children: ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
}

export function SuperAdminLayout({ children, activePage, onNavigate }: SuperAdminLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-blue-900/30">
      {/* Header */}
      <SuperAdminHeader />

      <div className="flex">
        {/* Sidebar */}
        <SuperAdminSidebar activePage={activePage} onNavigate={onNavigate} />

        {/* Main Content */}
        <main className="flex-1 p-6 ml-64">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
