import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Users,
  Loader2,
  User,
  Mail,
  Calendar,
  Star,
} from "lucide-react";

export default function JobApplicantsPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();

  const { data: job, isLoading: jobLoading } = useQuery<any>({
    queryKey: [`/api/job-postings/${jobId}`],
    queryFn: async () => {
      const response = await fetch(`/api/job-postings/${jobId}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to fetch job");
      return response.json();
    },
    enabled: !!jobId,
  });

  const { data: applicants = [], isLoading: applicantsLoading } = useQuery<any[]>({
    queryKey: [`/api/real-applicants/${jobId}`],
    queryFn: async () => {
      const response = await fetch(`/api/real-applicants/${jobId}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to fetch applicants");
      return response.json();
    },
    enabled: !!jobId,
  });

  const isLoading = jobLoading || applicantsLoading;

  const getScoreColor = (score: number) => {
    if (score >= 70) return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    if (score >= 50) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-4"
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/hiring/jobs/${jobId}`)}
          className="mt-1"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
            Applicants for {job?.title || "Job"}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {applicants.length} applicant{applicants.length !== 1 ? "s" : ""} for this position
          </p>
        </div>
      </motion.div>

      {/* Applicants List */}
      {applicants.length === 0 ? (
        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <CardContent className="py-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                No applicants yet
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Share your job posting to start receiving applications
              </p>
              <Button onClick={() => navigate(`/hiring/jobs/${jobId}`)}>
                View Job Details
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {applicants.map((applicant: any, index: number) => (
            <motion.div
              key={applicant.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card
                className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm hover:shadow-lg transition-all duration-200 cursor-pointer"
                onClick={() => navigate(`/hiring/applicants/${applicant.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {applicant.firstName?.[0] || applicant.email?.[0]?.toUpperCase() || "A"}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          {applicant.firstName && applicant.lastName
                            ? `${applicant.firstName} ${applicant.lastName}`
                            : applicant.email}
                        </h3>
                        <div className="flex items-center gap-4 mt-1 text-sm text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            {applicant.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Applied {formatDate(applicant.appliedAt || applicant.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {applicant.matchScore && (
                        <Badge className={getScoreColor(applicant.matchScore)}>
                          <Star className="w-3 h-3 mr-1" />
                          {applicant.matchScore}% Match
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className={
                          applicant.status === "shortlisted"
                            ? "border-green-500 text-green-600"
                            : applicant.status === "denied"
                            ? "border-red-500 text-red-600"
                            : ""
                        }
                      >
                        {applicant.status || "New"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
