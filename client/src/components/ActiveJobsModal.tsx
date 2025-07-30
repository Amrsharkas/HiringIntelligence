import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { X, Edit, Trash2, Users, Eye, DollarSign, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { JobPostingModal } from "./JobPostingModal";


interface ActiveJobsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ActiveJobsModal({ isOpen, onClose }: ActiveJobsModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingJob, setEditingJob] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);



  const { data: jobs = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/job-postings"],
    enabled: isOpen,
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/";
        }, 500);
        return;
      }
    },
  });

  const deleteJobMutation = useMutation({
    mutationFn: async (jobId: number) => {
      await apiRequest("DELETE", `/api/job-postings/${jobId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Job posting deleted successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/job-postings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/job-postings/count"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to delete job posting. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleEditJob = (job: any) => {
    setEditingJob(job);
    setIsEditModalOpen(true);
  };

  const handleDeleteJob = (jobId: number, jobTitle: string) => {
    if (window.confirm(`Are you sure you want to delete "${jobTitle}"?`)) {
      deleteJobMutation.mutate(jobId);
    }
  };



  const formatSalary = (job: any) => {
    if (job.salaryRange) {
      return job.salaryRange;
    }
    if (job.salaryMin && job.salaryMax) {
      return `$${job.salaryMin.toLocaleString()} - $${job.salaryMax.toLocaleString()}`;
    }
    if (job.salaryMin) {
      return `From $${job.salaryMin.toLocaleString()}`;
    }
    if (job.salaryMax) {
      return `Up to $${job.salaryMax.toLocaleString()}`;
    }
    return "Salary not specified";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 60) {
      if (diffMinutes === 0) return "Posted just now";
      if (diffMinutes === 1) return "Posted 1 minute ago";
      return `Posted ${diffMinutes} minutes ago`;
    }
    
    if (diffHours < 24) {
      if (diffHours === 1) return "Posted 1 hour ago";
      return `Posted ${diffHours} hours ago`;
    }
    
    if (diffDays === 1) return "Posted 1 day ago";
    if (diffDays < 7) return `Posted ${diffDays} days ago`;
    if (diffDays < 30) return `Posted ${Math.floor(diffDays / 7)} weeks ago`;
    return `Posted ${Math.floor(diffDays / 30)} months ago`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        >
          <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Active Job Postings</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-3 text-slate-600 dark:text-slate-400">Loading jobs...</span>
              </div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No active job postings</h3>
                <p className="text-slate-600 dark:text-slate-400">Create your first job posting to start finding great candidates.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {jobs.map((job, index) => (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-6 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200 border border-slate-200/50 dark:border-slate-600/50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                          {job.title}
                        </h3>
                        <p className="text-slate-600 dark:text-slate-300 mb-3 line-clamp-2">
                          {job.description}
                        </p>
                        
                        <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400 mb-4">
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            {formatSalary(job)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(job.createdAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            {job.views || 0} views
                          </span>
                        </div>

                        {/* Skills Display */}
                        <div className="space-y-2">
                          {job.technicalSkills && job.technicalSkills.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Technical:</span>
                              {job.technicalSkills.slice(0, 5).map((skill: string) => (
                                <span
                                  key={skill}
                                  className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full"
                                >
                                  {skill}
                                </span>
                              ))}
                              {job.technicalSkills.length > 5 && (
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  +{job.technicalSkills.length - 5} more
                                </span>
                              )}
                            </div>
                          )}
                          
                          {job.softSkills && job.softSkills.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Soft:</span>
                              {job.softSkills.slice(0, 3).map((skill: string) => (
                                <span
                                  key={skill}
                                  className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full"
                                >
                                  {skill}
                                </span>
                              ))}
                              {job.softSkills.length > 3 && (
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  +{job.softSkills.length - 3} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditJob(job)}
                          className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteJob(job.id, job.title)}
                          disabled={deleteJobMutation.isPending}
                          className="text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Edit Job Modal */}
      <JobPostingModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingJob(null);
        }}
        editJob={editingJob}
      />
      

    </AnimatePresence>
  );
}
