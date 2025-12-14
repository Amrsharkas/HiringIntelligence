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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Search,
  MoreHorizontal,
  Eye,
  Star,
  XCircle,
  Calendar,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function DeniedPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch denied applicants using status filter
  const { data: deniedData, isLoading } = useQuery<any>({
    queryKey: ["/api/applicants", { status: "denied" }],
    queryFn: async () => {
      const res = await fetch("/api/applicants?status=denied", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch denied applicants");
      return res.json();
    },
  });

  // Handle response format
  const applicants = Array.isArray(deniedData)
    ? deniedData
    : (deniedData?.applicants || deniedData?.data || []);

  const shortlistMutation = useMutation({
    mutationFn: async (applicantId: number) => {
      await apiRequest("POST", `/api/applicants/${applicantId}/shortlist`);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Applicant moved back to shortlisted!" });
      // Invalidate all applicant queries
      queryClient.invalidateQueries({ queryKey: ["/api/applicants"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to move applicant back to shortlisted",
        variant: "destructive",
      });
    },
  });

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

  const filteredApplicants = applicants.filter((applicant: any) =>
    applicant.applicantEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    applicant.applicantName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    applicant.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/hiring/applicants")}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
            Denied Applicants
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Candidates who were not selected for positions
          </p>
        </div>
      </div>

      {/* Search */}
      <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200/60 dark:border-slate-700/60">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search denied applicants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Applicants Table */}
      <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200/60 dark:border-slate-700/60">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : filteredApplicants.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                No denied applicants
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Denied applicants will appear here after you make rejection decisions
              </p>
              <Button onClick={() => navigate("/hiring/applicants/shortlisted")}>
                View Shortlisted
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Job</TableHead>
                  <TableHead>Match Score</TableHead>
                  <TableHead>Denied</TableHead>
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
                        <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                          {applicant.applicantName?.[0] || applicant.applicantEmail?.[0]?.toUpperCase() || "A"}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {applicant.applicantName || "Unnamed"}
                          </p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {applicant.applicantEmail || applicant.email}
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
                        {formatDate(applicant.deniedAt || applicant.createdAt)}
                      </div>
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
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              shortlistMutation.mutate(applicant.id);
                            }}
                            className="text-blue-600 dark:text-blue-400"
                          >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Move to Shortlisted
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
