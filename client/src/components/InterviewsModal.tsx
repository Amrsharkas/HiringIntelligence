import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { X, Calendar as CalendarIcon, Clock, Users, Video, Plus, Search, Filter, MessageSquare, Settings, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";

interface InterviewsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InterviewsModal({ isOpen, onClose }: InterviewsModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<'schedule' | 'questions'>('schedule');
  const [selectedJobForQuestions, setSelectedJobForQuestions] = useState<string>('');
  const [newQuestion, setNewQuestion] = useState('');
  const [questionsList, setQuestionsList] = useState<string[]>([]);

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

  // Fetch all jobs for question management
  const { data: jobsData = [] } = useQuery({
    queryKey: ['/api/interview-questions/jobs'],
    enabled: activeTab === 'questions' && isOpen
  });

  // Fetch questions for selected job
  const { data: questionsData, refetch: refetchQuestions } = useQuery({
    queryKey: ['/api/interview-questions', selectedJobForQuestions],
    enabled: !!selectedJobForQuestions,
  });

  // Update questions mutation
  const updateQuestionsMutation = useMutation({
    mutationFn: async (questions: string[]) => {
      return apiRequest(`/api/interview-questions/${selectedJobForQuestions}`, {
        method: 'PUT',
        body: { questions }
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Interview questions updated successfully" });
      refetchQuestions();
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: "Failed to update interview questions",
        variant: "destructive" 
      });
    }
  });

  // Update local questions list when data changes
  React.useEffect(() => {
    if (questionsData?.questions) {
      setQuestionsList(questionsData.questions);
    }
  }, [questionsData]);

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
    }
  ];

  const filteredInterviews = mockInterviews.filter(interview => {
    const matchesSearch = interview.candidateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         interview.jobTitle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || interview.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const addQuestion = () => {
    if (newQuestion.trim() && !questionsList.includes(newQuestion.trim())) {
      const updatedQuestions = [...questionsList, newQuestion.trim()];
      setQuestionsList(updatedQuestions);
      updateQuestionsMutation.mutate(updatedQuestions);
      setNewQuestion('');
    }
  };

  const deleteQuestion = (index: number) => {
    const updatedQuestions = questionsList.filter((_, i) => i !== index);
    setQuestionsList(updatedQuestions);
    updateQuestionsMutation.mutate(updatedQuestions);
  };

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
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col"
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

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('schedule')}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'schedule'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <CalendarIcon className="w-4 h-4 inline mr-2" />
                Scheduled Interviews
              </button>
              <button
                onClick={() => setActiveTab('questions')}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'questions'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <MessageSquare className="w-4 h-4 inline mr-2" />
                Manage Questions
              </button>
            </nav>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'schedule' && (
              <div className="flex h-full">
                {/* Calendar Sidebar */}
                <div className="w-1/3 border-r border-slate-200 dark:border-slate-700 pr-6">
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
                <div className="flex-1 flex flex-col pl-6">
                  <div className="border-b border-slate-200 dark:border-slate-700 pb-6 mb-6">
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
                        className="border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800"
                      >
                        <option value="all">All Status</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>

                  {/* Interview Cards */}
                  <div className="space-y-4">
                    {filteredInterviews.map((interview) => (
                      <div
                        key={interview.id}
                        className="bg-gradient-to-r from-slate-50 to-blue-50/30 dark:from-slate-800/50 dark:to-blue-900/20 rounded-xl p-4 border border-slate-200/60 dark:border-slate-700/60 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-semibold text-slate-900 dark:text-white">{interview.candidateName}</h4>
                              <Badge className={getStatusColor(interview.status)}>
                                {interview.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{interview.candidateTitle}</p>
                            <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-3">Applied for: {interview.jobTitle}</p>
                            
                            <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                              <div className="flex items-center gap-1">
                                <CalendarIcon className="w-4 h-4" />
                                {interview.date.toLocaleDateString()}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {interview.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({interview.duration}min)
                              </div>
                              <div className="flex items-center gap-1">
                                <Video className="w-4 h-4" />
                                {interview.type}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 mt-2">
                              <Users className="w-4 h-4 text-slate-400" />
                              <span className="text-sm text-slate-600 dark:text-slate-400">
                                Interviewers: {interview.interviewers.join(', ')}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">Reschedule</Button>
                            <Button size="sm" className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white">
                              {interview.status === 'completed' ? 'View' : 'Join'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Custom Questions Tab */}
            {activeTab === 'questions' && (
              <div className="max-w-4xl mx-auto">
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-6 mb-6 border border-blue-200/50 dark:border-blue-700/50">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Custom Interview Questions</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Create and manage custom interview questions for each job posting. Questions are automatically saved to your Airtable database.
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Job Selection */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Select Job Posting
                    </label>
                    <select
                      value={selectedJobForQuestions}
                      onChange={(e) => setSelectedJobForQuestions(e.target.value)}
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      <option value="">-- Select a job posting --</option>
                      {jobsData?.map((job: any) => (
                        <option key={job.id} value={job.id}>
                          {job.title} - {job.location}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedJobForQuestions && (
                    <>
                      {/* Add Question Input */}
                      <div className="flex gap-2">
                        <Input
                          value={newQuestion}
                          onChange={(e) => setNewQuestion(e.target.value)}
                          placeholder="Enter interview question..."
                          className="flex-1"
                          onKeyPress={(e) => e.key === 'Enter' && addQuestion()}
                        />
                        <Button 
                          onClick={addQuestion}
                          disabled={!newQuestion.trim() || updateQuestionsMutation.isPending}
                          className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add
                        </Button>
                      </div>

                      {/* Questions List */}
                      <div className="space-y-3">
                        <h4 className="font-medium text-slate-900 dark:text-white">
                          Current Questions ({questionsList.length})
                        </h4>
                        {questionsList.length === 0 ? (
                          <p className="text-slate-500 dark:text-slate-400 text-sm italic py-4 text-center border rounded-lg border-dashed">
                            No questions added yet. Add your first interview question above.
                          </p>
                        ) : (
                          questionsList.map((question, index) => (
                            <div key={index} className="flex items-start gap-3 p-4 bg-white dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                              <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                                {index + 1}
                              </span>
                              <p className="flex-1 text-slate-700 dark:text-slate-300">{question}</p>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteQuestion(index)}
                                disabled={updateQuestionsMutation.isPending}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))
                        )}
                      </div>

                      {updateQuestionsMutation.isPending && (
                        <div className="text-center py-4">
                          <div className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400">
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                            Saving changes...
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}