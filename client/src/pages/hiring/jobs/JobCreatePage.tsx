import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Briefcase } from "lucide-react";
import { JobPostingForm } from "@/components/hiring/jobs/JobPostingForm";

export default function JobCreatePage() {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate("/hiring/jobs");
  };

  const handleCancel = () => {
    navigate("/hiring/jobs");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/hiring/jobs")}
          className="text-slate-600 dark:text-slate-400"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <Briefcase className="w-6 h-6 text-primary dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
              Create New Job
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Fill in the details to post a new job listing
            </p>
          </div>
        </div>
      </motion.div>

      {/* Job Form */}
      <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200/60 dark:border-slate-700/60">
        <CardContent className="p-6">
          <JobPostingForm
            editJob={null}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </CardContent>
      </Card>
    </div>
  );
}
