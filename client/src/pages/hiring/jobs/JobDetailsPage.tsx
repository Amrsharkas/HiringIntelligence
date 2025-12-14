import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Edit,
  Users,
  Share2,
  Target,
  MapPin,
  DollarSign,
  Calendar,
  Eye,
  Briefcase,
  Clock,
  Building2,
  GraduationCap,
  Languages,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function JobDetailsPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: job, isLoading } = useQuery<any>({
    queryKey: [`/api/job-postings/${jobId}`],
    queryFn: async () => {
      const response = await fetch(`/api/job-postings/${jobId}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to fetch job: ${response.status} ${text}`);
      }
      return response.json();
    },
    enabled: !!jobId,
  });


  const handleShareJob = async () => {
    const applicantsAppUrl = import.meta.env.VITE_APPLICANTS_APP_URL || "";
    const shareLink = `${applicantsAppUrl}/jobs/${jobId}`;

    try {
      await navigator.clipboard.writeText(shareLink);
      toast({
        title: "Link Copied!",
        description: "Share link has been copied to clipboard.",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to copy link to clipboard.",
        variant: "destructive",
      });
    }
  };

  const formatSalary = (job: any) => {
    if (job.salaryRange) return job.salaryRange;
    if (job.salaryMin && job.salaryMax) {
      return `$${job.salaryMin.toLocaleString()} - $${job.salaryMax.toLocaleString()}`;
    }
    if (job.salaryMin) return `From $${job.salaryMin.toLocaleString()}`;
    if (job.salaryMax) return `Up to $${job.salaryMax.toLocaleString()}`;
    return "Not specified";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-12">
        <Briefcase className="w-16 h-16 mx-auto mb-4 text-slate-400" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
          Job not found
        </h3>
        <p className="text-sm text-slate-500 mb-4">
          The job posting could not be found or you don't have access to it.
        </p>
        <Button onClick={() => navigate("/hiring/jobs")}>
          Back to Jobs
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between"
      >
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/hiring/jobs")}
            className="mt-1"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
              {job.title}
            </h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {job.location || "Remote"}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Posted {formatDate(job.createdAt)}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {job.views || 0} views
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleShareJob}>
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(`/hiring/resumes/search?jobId=${jobId}`)}
          >
            <Target className="w-4 h-4 mr-2" />
            Search Resumes
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(`/hiring/jobs/${jobId}/applicants`)}
          >
            <Users className="w-4 h-4 mr-2" />
            View Applicants
          </Button>
          <Button onClick={() => navigate(`/hiring/jobs/${jobId}/edit`)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit Job
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Job Description</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:text-slate-800 dark:prose-headings:text-slate-200 prose-p:text-slate-600 dark:prose-p:text-slate-300 prose-li:text-slate-600 dark:prose-li:text-slate-300 prose-strong:text-slate-700 dark:prose-strong:text-slate-200">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {job.description}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>

          {/* Requirements */}
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Requirements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:text-slate-800 dark:prose-headings:text-slate-200 prose-p:text-slate-600 dark:prose-p:text-slate-300 prose-li:text-slate-600 dark:prose-li:text-slate-300 prose-strong:text-slate-700 dark:prose-strong:text-slate-200">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {job.requirements}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>

          {/* Skills */}
          {(job.technicalSkills?.length > 0 || job.softSkills?.length > 0) && (
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Required Skills</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {job.technicalSkills?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                      Technical Skills
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {job.technicalSkills.map((skill: string) => (
                        <Badge
                          key={skill}
                          variant="secondary"
                          className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                        >
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {job.softSkills?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                      Soft Skills
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {job.softSkills.map((skill: string) => (
                        <Badge
                          key={skill}
                          variant="secondary"
                          className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                        >
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Job Details */}
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Job Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <DollarSign className="w-4 h-4 text-primary dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Salary</p>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {formatSalary(job)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Employment Type</p>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {job.employmentType || "Full-time"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <Building2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Workplace</p>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {job.workplaceType || "On-site"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <GraduationCap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Seniority</p>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {job.seniorityLevel || "Mid-level"}
                  </p>
                </div>
              </div>

              {job.interviewLanguage && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-pink-100 dark:bg-pink-900/30">
                    <Languages className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Interview Language</p>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {job.interviewLanguage}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Settings */}
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>AI Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Score Matching Threshold
                </span>
                <Badge variant="outline">{job.scoreMatchingThreshold || 30}%</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Email Invite Threshold
                </span>
                <Badge variant="outline">{job.emailInviteThreshold || 30}%</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Auto Shortlist Threshold
                </span>
                <Badge variant="outline">{job.autoShortlistThreshold || 70}%</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  );
}
