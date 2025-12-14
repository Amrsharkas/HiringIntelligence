import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Users,
  Share2,
  Target,
  MapPin,
  DollarSign,
  Calendar,
  Eye,
  Briefcase,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function JobsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: jobs = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/job-postings"],
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
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete job posting. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteJob = (jobId: number, jobTitle: string) => {
    if (window.confirm(`Are you sure you want to delete "${jobTitle}"?`)) {
      deleteJobMutation.mutate(jobId);
    }
  };

  const handleShareJob = async (jobId: number, jobTitle: string) => {
    const applicantsAppUrl = import.meta.env.VITE_APPLICANTS_APP_URL || "";
    const shareLink = `${applicantsAppUrl}/jobs/${jobId}`;

    try {
      await navigator.clipboard.writeText(shareLink);
      toast({
        title: "Link Copied!",
        description: `Share link for "${jobTitle}" has been copied to clipboard.`,
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
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const filteredJobs = jobs.filter((job) =>
    job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
            Job Postings
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage your active job listings
          </p>
        </div>
        <Button
          onClick={() => navigate("/hiring/jobs/new")}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Job
        </Button>
      </div>

      {/* Search */}
      <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200/60 dark:border-slate-700/60">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search jobs by title or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Jobs Table */}
      <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200/60 dark:border-slate-700/60">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Briefcase className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                {searchQuery ? "No jobs found" : "No job postings yet"}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                {searchQuery
                  ? "Try adjusting your search"
                  : "Create your first job posting to start finding candidates"}
              </p>
              {!searchQuery && (
                <Button onClick={() => navigate("/hiring/jobs/new")}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Job
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Salary</TableHead>
                  <TableHead>Posted</TableHead>
                  <TableHead>Views</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJobs.map((job, index) => (
                  <motion.tr
                    key={job.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
                    onClick={() => navigate(`/hiring/jobs/${job.id}`)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {job.title}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1">
                          {job.description?.substring(0, 60)}...
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                        <MapPin className="w-4 h-4" />
                        {job.location || "Remote"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                        <DollarSign className="w-4 h-4" />
                        {formatSalary(job)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                        <Calendar className="w-4 h-4" />
                        {formatDate(job.createdAt)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                        <Eye className="w-4 h-4" />
                        {job.views || 0}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={job.status === "active" ? "default" : "secondary"}
                        className={
                          job.status === "active"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : ""
                        }
                      >
                        {job.status || "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/hiring/jobs/${job.id}`);
                            }}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Job
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/hiring/jobs/${job.id}/applicants`);
                            }}
                          >
                            <Users className="w-4 h-4 mr-2" />
                            View Applicants
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/hiring/resumes/search?jobId=${job.id}`);
                            }}
                          >
                            <Target className="w-4 h-4 mr-2" />
                            Search Resumes
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShareJob(job.id, job.title);
                            }}
                          >
                            <Share2 className="w-4 h-4 mr-2" />
                            Copy Share Link
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteJob(job.id, job.title);
                            }}
                            className="text-red-600 dark:text-red-400"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Job
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
