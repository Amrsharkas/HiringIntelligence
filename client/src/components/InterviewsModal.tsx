import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { X, Calendar as CalendarIcon, Clock, Users, Video, Plus, Search, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

interface InterviewsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InterviewsModal({ isOpen, onClose }: InterviewsModalProps) {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: matches = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/companies/matches"],
    enabled: isOpen,
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
    },
  });

  // Mock interview data - in real app this would come from API
  const mockInterviews = [
    {
      id: 1,
      candidateName: "Alex Johnson",
      candidateTitle: "Frontend Developer",
      jobTitle: "Senior Frontend Developer",
      date: new Date(2024, 5, 15, 14, 0),
      duration: 60,
      status: "scheduled",
      type: "video",
      interviewers: ["John Smith", "Sarah Wilson"]
    },
    {
      id: 2,
      candidateName: "Sarah Chen",
      candidateTitle: "Full Stack Developer",
      jobTitle: "Full Stack Engineer",
      date: new Date(2024, 5, 16, 10, 30),
      duration: 45,
      status: "completed",
      type: "video",
      interviewers: ["Mike Johnson"]
    },
    {
      id: 3,
      candidateName: "Marcus Rodriguez",
      candidateTitle: "Senior Developer",
      jobTitle: "Tech Lead",
      date: new Date(2024, 5, 17, 15, 0),
      duration: 90,
      status: "scheduled",
      type: "video",
      interviewers: ["Emily Davis", "Robert Chen"]
    }
  ];

  const filteredInterviews = mockInterviews.filter(interview => {
    const matchesSearch = interview.candidateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         interview.jobTitle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || interview.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300";
      case "completed":
        return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300";
      case "cancelled":
        return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300";
      default:
        return "bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-300";
    }
  };

  const handleScheduleInterview = () => {
    toast({
      title: "Coming Soon",
      description: "Interview scheduling will be implemented soon.",
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden"
        >
          <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <CalendarIcon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                Interview Management
              </h2>
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

          <div className="flex h-[70vh]">
            {/* Calendar Sidebar */}
            <div className="w-1/3 border-r border-slate-200 dark:border-slate-700 p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Schedule Interview</h3>
                  <Button
                    onClick={handleScheduleInterview}
                    className="w-full mb-4 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Interview
                  </Button>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-3">Select Date</h4>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="rounded-lg border border-slate-200 dark:border-slate-700"
                  />
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg p-4 border border-orange-200/50 dark:border-orange-700/50">
                  <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-2">Today's Schedule</h4>
                  <div className="space-y-2">
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      2:00 PM - Alex Johnson
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      3:30 PM - Sarah Chen
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Interviews List */}
            <div className="flex-1 flex flex-col">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                <div className="flex gap-4 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search interviews..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="all">All Status</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    Scheduled ({mockInterviews.filter(i => i.status === 'scheduled').length})
                  </span>
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    Completed ({mockInterviews.filter(i => i.status === 'completed').length})
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="ml-3 text-slate-600 dark:text-slate-400">Loading interviews...</span>
                  </div>
                ) : filteredInterviews.length === 0 ? (
                  <div className="text-center py-12">
                    <CalendarIcon className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No interviews found</h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      {searchTerm || filterStatus !== "all" 
                        ? "Try adjusting your search or filter criteria."
                        : "Schedule your first interview to get started."
                      }
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredInterviews.map((interview, index) => (
                      <motion.div
                        key={interview.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-6 border border-slate-200/50 dark:border-slate-600/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                {interview.candidateName}
                              </h3>
                              <Badge className={getStatusColor(interview.status)}>
                                {interview.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                              {interview.candidateTitle} • Applied for {interview.jobTitle}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                              <span className="flex items-center gap-1">
                                <CalendarIcon className="w-4 h-4" />
                                {interview.date.toLocaleDateString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {interview.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({interview.duration}min)
                              </span>
                              <span className="flex items-center gap-1">
                                <Video className="w-4 h-4" />
                                {interview.type}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-slate-600 dark:text-slate-400"
                            >
                              Reschedule
                            </Button>
                            <Button
                              size="sm"
                              className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white"
                            >
                              {interview.status === 'scheduled' ? 'Join' : 'View'}
                            </Button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-slate-200/50 dark:border-slate-600/50">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                            <span className="text-sm text-slate-600 dark:text-slate-400">
                              Interviewers: {interview.interviewers.join(", ")}
                            </span>
                          </div>
                          
                          {interview.status === 'scheduled' && (
                            <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                              <Clock className="w-4 h-4" />
                              <span className="text-sm font-medium">
                                {Math.ceil((interview.date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days remaining
                              </span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
