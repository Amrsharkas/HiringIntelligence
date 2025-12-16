import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { pdf } from "@react-pdf/renderer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Search,
  FileText,
  Loader2,
  Eye,
  Target,
  Upload,
  MoreHorizontal,
  Trash2,
  Star,
  Mail,
  MailCheck,
  AlertTriangle,
  CheckCircle,
  Download,
  Phone,
  CalendarClock,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ProfilesSummaryPDF } from "@/components/ProfilesSummaryPDF";
import { ProfilePDF } from "@/components/ProfilePDF";

interface ResumeProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  summary: string;
  experience: string[];
  skills: string[];
  education: string[];
  certifications: string[];
  languages: string[];
  resumeText: string;
  createdAt: string;
  jobScores?: Array<{
    jobId: string;
    jobTitle: string;
    overallScore: number;
    disqualified?: boolean;
    invitationStatus?: string | null;
  }>;
}

export default function ResumesPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedJobFilter, setSelectedJobFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [exportingAll, setExportingAll] = useState(false);
  const [exportingProfileId, setExportingProfileId] = useState<string | null>(null);
  const [callDialogOpen, setCallDialogOpen] = useState(false);
  const [callTarget, setCallTarget] = useState<{
    profileId: string;
    jobId: string;
    name: string;
    phone: string;
    jobTitle: string;
  } | null>(null);
  const [callPhoneNumber, setCallPhoneNumber] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const debounceRef = useRef<NodeJS.Timeout>();

  // Phone validation helper (E.164 format)
  const isValidE164 = (phone: string) => /^\+[1-9]\d{1,14}$/.test(phone);

  // Debounce search input
  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setCurrentPage(1);
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  // Fetch jobs for filter
  const { data: jobs = [] } = useQuery<any[]>({
    queryKey: ["/api/job-postings"],
  });

  // Fetch active resume processing jobs
  const { data: activeJobsData } = useQuery<{
    totalFiles: number;
    completedFiles: number;
    overallProgress: number;
    activeJobsCount: number;
    waitingJobsCount: number;
    activeJobDetails: Array<{
      fileName: string;
      fileCount: number;
      progress: number;
    }>;
    hasActiveJobs: boolean;
  }>({
    queryKey: ["/api/resume-processing/active-jobs"],
    queryFn: async () => {
      const response = await fetch("/api/resume-processing/active-jobs", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch active jobs");
      }
      return response.json();
    },
    refetchInterval: 2000, // Poll every 2 seconds
    refetchIntervalInBackground: true,
  });

  // Refresh profiles when active jobs complete
  useEffect(() => {
    if (activeJobsData && !activeJobsData.hasActiveJobs) {
      queryClient.invalidateQueries({ queryKey: ["/api/resume-profiles"] });
    }
  }, [activeJobsData]);

  // Fetch resume profiles with pagination
  const { data: profilesResponse, isLoading } = useQuery<{
    data: ResumeProfile[];
    pagination: any;
  }>({
    queryKey: ["/api/resume-profiles", currentPage, itemsPerPage, debouncedSearch, selectedJobFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      });

      if (debouncedSearch) {
        params.append("search", debouncedSearch);
      }

      if (selectedJobFilter !== "all") {
        params.append("jobId", selectedJobFilter);
      }

      const response = await fetch(`/api/resume-profiles?${params}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch resume profiles");
      }
      return response.json();
    },
  });

  const profiles = profilesResponse?.data || [];
  const serverPagination = profilesResponse?.pagination;
  const totalPages = serverPagination?.totalPages || 1;
  const totalItems = serverPagination?.totalItems || 0;

  // Delete profile mutation
  const deleteProfileMutation = useMutation({
    mutationFn: async (profileId: string) => {
      const response = await apiRequest("DELETE", `/api/resume-profiles/${profileId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile Deleted",
        description: "Resume profile has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/resume-profiles"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Deletion Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete all profiles mutation
  const deleteAllProfilesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/resume-profiles");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "All Profiles Deleted",
        description: data.message || "All resume profiles have been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/resume-profiles"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Deletion Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Invite applicant mutation
  const inviteApplicantMutation = useMutation({
    mutationFn: async ({ profileId, jobId }: { profileId: string; jobId: string }) => {
      const response = await apiRequest("POST", "/api/invite-applicant", {
        profileId,
        jobId,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Invitation Sent",
        description: "Applicant has been invited successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/resume-profiles"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Invitation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Resend invitation mutation
  const resendInvitationMutation = useMutation({
    mutationFn: async ({ profileId, jobId }: { profileId: string; jobId: string }) => {
      const response = await apiRequest("POST", "/api/resend-invitation", {
        profileId,
        jobId,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Invitation Resent",
        description: "Invitation email has been resent successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Resend Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Schedule call mutation
  const callCandidateMutation = useMutation({
    mutationFn: async ({ toPhoneNumber, profileId, jobId, scheduledAt }: { toPhoneNumber: string; profileId: string; jobId: string; scheduledAt: string }) => {
      const response = await apiRequest("POST", "/api/voice/call-candidate", {
        toPhoneNumber,
        profileId,
        jobId,
        scheduledAt,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Call Scheduled",
        description: `Call scheduled for ${data.data?.scheduledAt ? format(new Date(data.data.scheduledAt), "PPp") : 'the selected time'}`,
      });
      setCallDialogOpen(false);
      setCallTarget(null);
      setCallPhoneNumber("");
      setScheduledDate("");
      setScheduledTime("");
    },
    onError: (error: Error) => {
      toast({
        title: "Scheduling Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Open call dialog
  const openCallDialog = (row: any) => {
    const phoneFromProfile = row.phone || row.profile?.phone || "";
    setCallTarget({
      profileId: row.profileId,
      jobId: row.jobId.toString(),
      name: row.name || "Candidate",
      phone: phoneFromProfile,
      jobTitle: row.jobTitle || "the position",
    });
    setCallPhoneNumber(phoneFromProfile);
    setCallDialogOpen(true);
  };

  // Handle call scheduling
  const handleCall = () => {
    if (!callTarget || !callPhoneNumber || !scheduledDate || !scheduledTime) return;

    if (!isValidE164(callPhoneNumber)) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid phone number with country code (e.g., +1234567890)",
        variant: "destructive",
      });
      return;
    }

    // Combine date and time into ISO 8601 string
    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString();

    // Validate scheduled time is in the future
    if (new Date(scheduledAt) <= new Date()) {
      toast({
        title: "Invalid Schedule Time",
        description: "Please select a future date and time",
        variant: "destructive",
      });
      return;
    }

    callCandidateMutation.mutate({
      toPhoneNumber: callPhoneNumber,
      profileId: callTarget.profileId,
      jobId: callTarget.jobId,
      scheduledAt,
    });
  };

  // Export all profiles as PDF
  const exportAllProfiles = async () => {
    if (profiles.length === 0) {
      toast({
        title: "No Profiles",
        description: "There are no profiles to export",
        variant: "destructive",
      });
      return;
    }

    setExportingAll(true);

    try {
      const fileName = `resume_profiles_summary_${new Date().toISOString().split('T')[0]}.pdf`;

      // Map profiles to ensure jobScores is always defined
      const profilesWithScores = profiles.map(p => ({
        ...p,
        jobScores: p.jobScores || [],
      }));

      const blob = await pdf(
        <ProfilesSummaryPDF
          profiles={profilesWithScores as any}
          jobs={jobs}
          selectedJobId={selectedJobFilter !== 'all' ? selectedJobFilter : undefined}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "PDF Exported",
        description: `Summary of ${profiles.length} profiles has been exported successfully`,
      });
    } catch (error) {
      console.error('PDF export error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Export Failed",
        description: `Failed to generate PDF: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setExportingAll(false);
    }
  };

  // Export single profile as PDF
  const exportSingleProfile = async (profile: ResumeProfile, jobId?: string) => {
    setExportingProfileId(profile.id);

    const fileName = `${(profile.name || 'profile').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;

    try {
      // Fetch full profile details
      const detailUrl = jobId
        ? `/api/resume-profiles/${profile.id}?jobId=${jobId}`
        : `/api/resume-profiles/${profile.id}`;

      const response = await fetch(detailUrl, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch profile details');
      }

      const fullProfileData = await response.json();

      const blob = await pdf(
        <ProfilePDF
          profile={fullProfileData}
          jobs={jobs}
          includeJobScores={true}
          selectedJobId={jobId}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "PDF Exported",
        description: `${profile.name || 'Profile'} has been exported successfully`,
      });
    } catch (error) {
      console.error('PDF export error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Export Failed",
        description: `Failed to generate PDF: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setExportingProfileId(null);
    }
  };

  // Build display rows with job scores
  const displayRows = useMemo(() => {
    const rows: any[] = [];

    profiles.forEach((profile) => {
      if (profile.jobScores && profile.jobScores.length > 0) {
        profile.jobScores.forEach((jobScore) => {
          rows.push({
            profileId: profile.id,
            name: profile.name,
            email: profile.email,
            phone: profile.phone,
            skills: profile.skills,
            jobId: jobScore.jobId,
            jobTitle: jobScore.jobTitle,
            overallScore: jobScore.overallScore,
            disqualified: jobScore.disqualified || false,
            invitationStatus: jobScore.invitationStatus || null,
            profile,
            jobScore,
          });
        });
      } else {
        rows.push({
          profileId: profile.id,
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
          skills: profile.skills,
          jobId: null,
          jobTitle: null,
          overallScore: null,
          disqualified: false,
          invitationStatus: null,
          profile,
          jobScore: null,
        });
      }
    });

    return rows;
  }, [profiles]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-100 dark:bg-green-900/30";
    if (score >= 60) return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30";
    return "text-red-600 bg-red-100 dark:bg-red-900/30";
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "sent":
        return (
          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            <Mail className="w-3 h-3 mr-1" />
            Invited
          </Badge>
        );
      case "accepted":
        return (
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle className="w-3 h-3 mr-1" />
            Accepted
          </Badge>
        );
      default:
        return null;
    }
  };

  // Generate pagination items
  const generatePaginationItems = () => {
    const items = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        items.push(i);
      }
    } else {
      items.push(1);

      if (currentPage > 3) {
        items.push("ellipsis");
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        items.push(i);
      }

      if (currentPage < totalPages - 2) {
        items.push("ellipsis");
      }

      items.push(totalPages);
    }

    return items;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
            Resumes
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage your resume database ({totalItems} profiles)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {profiles.length > 0 && (
            <Button
              variant="outline"
              onClick={exportAllProfiles}
              disabled={exportingAll}
            >
              {exportingAll ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Export All
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => navigate("/hiring/resumes/search")}
          >
            <Target className="w-4 h-4 mr-2" />
            AI Search
          </Button>
          <Button
            className=""
            onClick={() => navigate("/hiring/resumes/upload")}
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Resumes
          </Button>
        </div>
      </div>

      {/* Active Jobs Progress Indicator */}
      <AnimatePresence>
        {activeJobsData && activeJobsData.hasActiveJobs && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Progress value={activeJobsData.overallProgress} className="h-1.5 flex-1" />
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400 tabular-nums w-8">
                    {activeJobsData.overallProgress}%
                  </span>
                </div>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Processing {activeJobsData.completedFiles}/{activeJobsData.totalFiles} resumes
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Schedule Call Dialog */}
      <Dialog open={callDialogOpen} onOpenChange={(open) => {
        setCallDialogOpen(open);
        if (!open) {
          setCallTarget(null);
          setCallPhoneNumber("");
          setScheduledDate("");
          setScheduledTime("");
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-green-600" />
              Schedule Call
            </DialogTitle>
            <DialogDescription>
              {callTarget && (
                <>
                  Schedule a call with <span className="font-medium">{callTarget.name}</span> about the{" "}
                  <span className="font-medium">{callTarget.jobTitle}</span> position.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                placeholder="+1234567890"
                value={callPhoneNumber}
                onChange={(e) => setCallPhoneNumber(e.target.value)}
                className={!callPhoneNumber || isValidE164(callPhoneNumber) ? "" : "border-red-500"}
              />
              {callPhoneNumber && !isValidE164(callPhoneNumber) && (
                <p className="text-sm text-red-500">
                  Enter a valid phone number with country code (e.g., +1234567890)
                </p>
              )}
              {!callTarget?.phone && (
                <p className="text-sm text-amber-600">
                  No phone number found in profile. Please enter one.
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="callDate">Date</Label>
              <Input
                id="callDate"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="callTime">Time</Label>
              <Input
                id="callTime"
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCallDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCall}
              disabled={!callPhoneNumber || !isValidE164(callPhoneNumber) || !scheduledDate || !scheduledTime || callCandidateMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {callCandidateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <CalendarClock className="w-4 h-4 mr-2" />
                  Schedule Call
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200/60 dark:border-slate-700/60">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by name, email, or skills..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Job Filter */}
            <Select
              value={selectedJobFilter}
              onValueChange={(value) => {
                setSelectedJobFilter(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by job" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Jobs</SelectItem>
                {jobs.map((job) => (
                  <SelectItem key={job.id} value={job.id.toString()}>
                    {job.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Items per page */}
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => {
                setItemsPerPage(parseInt(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 / page</SelectItem>
                <SelectItem value="25">25 / page</SelectItem>
                <SelectItem value="50">50 / page</SelectItem>
                <SelectItem value="100">100 / page</SelectItem>
                <SelectItem value="10000">All / page</SelectItem>
              </SelectContent>
            </Select>

            {/* Delete All */}
            {profiles.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete All
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete All Profiles?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all resume profiles. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteAllProfilesMutation.mutate()}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Delete All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200/60 dark:border-slate-700/60">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : displayRows.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                {debouncedSearch ? "No profiles found" : "No resume profiles yet"}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                {debouncedSearch
                  ? "Try adjusting your search"
                  : "Upload resumes to build your candidate database"}
              </p>
              {!debouncedSearch && (
                <Button onClick={() => navigate("/hiring/resumes/upload")}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Resumes
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Skills</TableHead>
                  <TableHead>Job Match</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayRows.map((row, index) => (
                  <motion.tr
                    key={`${row.profileId}-${row.jobId || "none"}-${index}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                          {row.name?.[0]?.toUpperCase() || row.email?.[0]?.toUpperCase() || "R"}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {row.name || "Unnamed Profile"}
                          </p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {row.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {row.skills?.slice(0, 3).map((skill: string, idx: number) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {row.skills?.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{row.skills.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {row.jobTitle ? (
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                          {row.jobTitle}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-400 italic">No job analysis</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.overallScore !== null ? (
                        <div className="flex items-center gap-2">
                          {row.disqualified ? (
                            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Disqualified
                            </Badge>
                          ) : (
                            <Badge className={getScoreColor(row.overallScore)}>
                              <Star className="w-3 h-3 mr-1" />
                              {row.overallScore}%
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(row.invitationStatus)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => navigate(`/hiring/resumes/${row.profileId}${row.jobId ? `?jobId=${row.jobId}` : ''}`)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Profile
                          </DropdownMenuItem>
                          {/* Invite/Resend buttons - only show when there's a job match and not disqualified */}
                          {row.jobId && !row.disqualified && (
                            <>
                              {row.invitationStatus === "sent" || row.invitationStatus === "accepted" ? (
                                <DropdownMenuItem
                                  onClick={() => resendInvitationMutation.mutate({
                                    profileId: row.profileId,
                                    jobId: row.jobId.toString(),
                                  })}
                                  disabled={resendInvitationMutation.isPending}
                                >
                                  {resendInvitationMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  ) : (
                                    <MailCheck className="w-4 h-4 mr-2" />
                                  )}
                                  Resend Invitation
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => inviteApplicantMutation.mutate({
                                    profileId: row.profileId,
                                    jobId: row.jobId.toString(),
                                  })}
                                  disabled={inviteApplicantMutation.isPending}
                                >
                                  {inviteApplicantMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  ) : (
                                    <Mail className="w-4 h-4 mr-2" />
                                  )}
                                  Invite to Apply
                                </DropdownMenuItem>
                              )}
                            </>
                          )}
                          {/* Call button - only show for invited candidates */}
                          {row.jobId  && (
                            <DropdownMenuItem
                              onClick={() => openCallDialog(row)}
                              className="text-green-600 dark:text-green-400"
                            >
                              <Phone className="w-4 h-4 mr-2" />
                              Call Candidate
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => exportSingleProfile(row.profile, row.jobId)}
                            disabled={exportingProfileId === row.profileId}
                          >
                            {exportingProfileId === row.profileId ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Download className="w-4 h-4 mr-2" />
                            )}
                            Export PDF
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              if (window.confirm(`Delete ${row.name || row.email}?`)) {
                                deleteProfileMutation.mutate(row.profileId);
                              }
                            }}
                            className="text-red-600 dark:text-red-400"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
            {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} profiles
          </p>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              {generatePaginationItems().map((item, idx) =>
                item === "ellipsis" ? (
                  <PaginationItem key={`ellipsis-${idx}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={item}>
                    <PaginationLink
                      onClick={() => setCurrentPage(item as number)}
                      isActive={currentPage === item}
                      className="cursor-pointer"
                    >
                      {item}
                    </PaginationLink>
                  </PaginationItem>
                )
              )}
              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
