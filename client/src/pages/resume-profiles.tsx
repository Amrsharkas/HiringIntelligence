import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { ResumeProfilesList } from '@/components/ResumeProfilesList';

export default function ResumeProfiles() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-blue-900/30">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Button
                variant="outline"
                onClick={() => window.history.back()}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-slate-100 mb-2">Resume Profiles</h1>
            <p className="text-gray-600 dark:text-slate-400">View and manage all candidate profiles with job match scores</p>
          </div>

          {/* Use the ResumeProfilesList component which has proper pagination handling */}
          <ResumeProfilesList />
        </motion.div>
      </div>
    </div>
  );
}
