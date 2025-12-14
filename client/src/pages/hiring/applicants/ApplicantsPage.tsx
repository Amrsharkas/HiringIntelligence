import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Search,
  MoreHorizontal,
  Eye,
  Star,
  CheckCircle,
  XCircle,
  Calendar,
  Users,
  Mail,
  Loader2,
  Filter,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function ApplicantsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [jobFilter, setJobFilter] = useState<string>("all");

  // Fetch all jobs for filter dropdown
  const { data: jobsData } = useQuery<any>({
    queryKey: ["/api/job-postings"],
  });

  const jobs = Array.isArray(jobsData) ? jobsData : (jobsData?.jobs || jobsData?.data || []);

  // Fetch all applicants
  const { data: applicantsData, isLoading } = useQuery<any>({
    queryKey: ["/api/applicants"],
  });

  const applicants = Array.isArray(applicantsData)
    ? applicantsData
    : (applicantsData?.applicants || applicantsData?.data || []);

  const shortlistMutation = useMutation({
    mutationFn: async (applicantId: number) => {
      await apiRequest("POST", `/api/applicants/${applicantId}/shortlist`);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Applicant shortlisted!" });
      queryClient.invalidateQueries({ queryKey: ["/api/applicants"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to shortlist applicant",
        variant: "destructive",
      });
    },
  });

  const denyMutation = useMutation({
    mutationFn: async (applicantId: number) => {
      await apiRequest("POST", `/api/applicants/${applicantId}/deny`);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Applicant denied" });
      queryClient.invalidateQueries({ queryKey: ["/api/applicants"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to deny applicant",
        variant: "destructive",
      });
    },
  });

  const getScoreColor = (score: number) => {
    if (score >= 70) return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    if (score >= 50) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "shortlisted":
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Shortlisted</Badge>;
      case "denied":
        return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Denied</Badge>;
      case "accepted":
        return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Accepted</Badge>;
      default:
        return <Badge variant="secondary">New</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Filter applicants
  const filteredApplicants = applicants.filter((applicant: any) => {
    const matchesSearch =
      applicant.applicantEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      applicant.applicantName?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" ||
      (statusFilter === "new" && applicant.status === "applied") ||
      applicant.status === statusFilter;
    const matchesJob = jobFilter === "all" || applicant.jobId?.toString() === jobFilter;

    return matchesSearch && matchesStatus && matchesJob;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
            All Applicants
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Review and manage all job applicants
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/hiring/applicants/shortlisted")}
          >
            <Star className="w-4 h-4 mr-2" />
            Shortlisted
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/hiring/applicants/accepted")}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Accepted
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/hiring/applicants/denied")}
          >
            <XCircle className="w-4 h-4 mr-2" />
            Denied
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200/60 dark:border-slate-700/60">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="shortlisted">Shortlisted</SelectItem>
                <SelectItem value="denied">Denied</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
              </SelectContent>
            </Select>
            <Select value={jobFilter} onValueChange={setJobFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Jobs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Jobs</SelectItem>
                {jobs.map((job: any) => (
                  <SelectItem key={job.id} value={job.id.toString()}>
                    {job.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Applicants Table */}
      <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200/60 dark:border-slate-700/60">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredApplicants.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                No applicants found
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                {searchQuery || statusFilter !== "all" || jobFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Applicants will appear here when they apply to your jobs"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Job</TableHead>
                  <TableHead>Match Score</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApplicants.map((applicant: any, index: number) => (
                  <motion.tr
                    key={applicant.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
                    onClick={() => navigate(`/hiring/applicants/${applicant.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-semibold text-sm">
                          {applicant.applicantName?.[0]?.toUpperCase() || applicant.applicantEmail?.[0]?.toUpperCase() || "A"}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {applicant.applicantName || "Unnamed"}
                          </p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {applicant.applicantEmail}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-slate-600 dark:text-slate-300">
                        {applicant.jobTitle || "Unknown Job"}
                      </p>
                    </TableCell>
                    <TableCell>
                      {applicant.matchScore ? (
                        <Badge className={getScoreColor(applicant.matchScore)}>
                          <Star className="w-3 h-3 mr-1" />
                          {applicant.matchScore}%
                        </Badge>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                        <Calendar className="w-4 h-4" />
                        {formatDate(applicant.applicationDate || applicant.createdAt)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(applicant.status)}
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
                              navigate(`/hiring/applicants/${applicant.id}`);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Profile
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              shortlistMutation.mutate(applicant.id);
                            }}
                            disabled={applicant.status === "shortlisted"}
                          >
                            <Star className="w-4 h-4 mr-2" />
                            Shortlist
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/hiring/interviews/new?applicantId=${applicant.id}`);
                            }}
                          >
                            <Calendar className="w-4 h-4 mr-2" />
                            Schedule Interview
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              denyMutation.mutate(applicant.id);
                            }}
                            disabled={applicant.status === "denied"}
                            className="text-red-600 dark:text-red-400"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Deny
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
