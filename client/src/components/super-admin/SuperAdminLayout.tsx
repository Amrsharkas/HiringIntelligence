import { ReactNode, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SuperAdminHeader } from "./SuperAdminHeader";
import { SuperAdminSidebar } from "./SuperAdminSidebar";

interface SuperAdminLayoutProps {
  children: ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
}

export function SuperAdminLayout({ children, activePage, onNavigate }: SuperAdminLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-blue-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-blue-900/30">
      {/* Sidebar */}
      <SuperAdminSidebar
        activePage={activePage}
        onNavigate={onNavigate}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Mobile overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Main Content Wrapper */}
      <div className="lg:ml-64 min-h-screen flex flex-col">
        {/* Header */}
        <SuperAdminHeader onMenuClick={() => setIsSidebarOpen(true)} />

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6">
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
