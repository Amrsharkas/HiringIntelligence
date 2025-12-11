import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Plus,
  Search,
  MoreHorizontal,
  Calendar,
  Clock,
  Video,
  User,
  Loader2,
  Play,
  ExternalLink,
} from "lucide-react";

export default function InterviewsPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("upcoming");

  const { data: interviews = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/interviews"],
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Scheduled</Badge>;
      case "completed":
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Completed</Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const now = new Date();
  const upcomingInterviews = interviews.filter(
    (i) => new Date(i.scheduledAt) > now && i.status !== "cancelled"
  );
  const pastInterviews = interviews.filter(
    (i) => new Date(i.scheduledAt) <= now || i.status === "completed"
  );

  const filteredInterviews =
    activeTab === "upcoming" ? upcomingInterviews : pastInterviews;

  const searchFiltered = filteredInterviews.filter((interview) =>
    interview.candidateName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    interview.jobTitle?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
            Interviews
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Schedule and manage candidate interviews
          </p>
        </div>
        <Button
          onClick={() => navigate("/hiring/interviews/new")}
          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Schedule Interview
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="upcoming" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Upcoming ({upcomingInterviews.length})
          </TabsTrigger>
          <TabsTrigger value="past" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Past ({pastInterviews.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4 space-y-4">
          {/* Search */}
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200/60 dark:border-slate-700/60">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search interviews..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Interviews Table */}
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200/60 dark:border-slate-700/60">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : searchFiltered.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                    No {activeTab} interviews
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-4">
                    {activeTab === "upcoming"
                      ? "Schedule interviews with shortlisted candidates"
                      : "Past interviews will appear here"}
                  </p>
                  {activeTab === "upcoming" && (
                    <Button onClick={() => navigate("/hiring/interviews/new")}>
                      <Plus className="w-4 h-4 mr-2" />
                      Schedule Interview
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Candidate</TableHead>
                      <TableHead>Job</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchFiltered.map((interview, index) => (
                      <motion.tr
                        key={interview.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                              {interview.candidateName?.[0] || "C"}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900 dark:text-white">
                                {interview.candidateName || "Unknown"}
                              </p>
                              <p className="text-sm text-slate-500 dark:text-slate-400">
                                {interview.candidateEmail}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-slate-600 dark:text-slate-300">
                            {interview.jobTitle || "Unknown Job"}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-slate-900 dark:text-white">
                              {formatDate(interview.scheduledAt)}
                            </span>
                            <span className="text-sm text-slate-500 dark:text-slate-400">
                              {formatTime(interview.scheduledAt)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                            <Video className="w-4 h-4" />
                            {interview.type || "Video"}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(interview.status)}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {interview.meetingLink && (
                                <DropdownMenuItem
                                  onClick={() => window.open(interview.meetingLink, "_blank")}
                                >
                                  <ExternalLink className="w-4 h-4 mr-2" />
                                  Join Meeting
                                </DropdownMenuItem>
                              )}
                              {interview.recordingUrl && (
                                <DropdownMenuItem
                                  onClick={() => window.open(interview.recordingUrl, "_blank")}
                                >
                                  <Play className="w-4 h-4 mr-2" />
                                  Watch Recording
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => navigate(`/hiring/applicants/${interview.applicantId}`)}
                              >
                                <User className="w-4 h-4 mr-2" />
                                View Candidate
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
