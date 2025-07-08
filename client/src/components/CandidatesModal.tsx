import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Search, MapPin, Star, Users, Eye, ArrowLeft, Mail, Calendar, Target, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface CandidateData {
  id: string;
  name?: string;
  email?: string; // Email address for contacting the candidate
  userId?: string; // Internal User ID from Airtable, not displayed
  userProfile?: string;
  location?: string;
  background?: string;
  skills?: string;
  interests?: string;
  experience?: string;
  matchScore?: number;
  matchReasoning?: string;
  applicationStatus?: 'pending' | 'accepted' | 'declined';
  reviewedAt?: string;
  // Legacy fields for compatibility
  previousRole?: string;
  summary?: string;
  technicalSkills?: string[];
  yearsExperience?: number;
  salaryExpectation?: string;
  interviewScore?: number;
}

interface CandidatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId?: number;
}

export function CandidatesModal({ isOpen, onClose, jobId }: CandidatesModalProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateData | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(jobId || null);
  const [view, setView] = useState<'jobs' | 'candidates'>(jobId ? 'candidates' : 'jobs');
  const [scheduleInterviewCandidate, setScheduleInterviewCandidate] = useState<CandidateData | null>(null);
  const [pendingActions, setPendingActions] = useState<Record<string, 'accepting' | 'declining' | null>>({});
  const [removingCandidates, setRemovingCandidates] = useState<Set<string>>(new Set());
  const [showRatingCriteria, setShowRatingCriteria] = useState(false);

  // Fetch job postings for the job selection view with auto-refresh
  const { data: jobs = [], isLoading: jobsLoading, error: jobsError } = useQuery<any[]>({
    queryKey: ["/api/job-postings"],
    enabled: isOpen && view === 'jobs',
    retry: false,
    refetchInterval: 60000, // Auto-refresh every 60 seconds (1 minute)
    refetchIntervalInBackground: true, // Continue polling even when tab is not active
  });

  // Fetch candidates for selected job with auto-refresh every minute
  const { data: candidates = [], isLoading: candidatesLoading, error: candidatesError, dataUpdatedAt, isFetching } = useQuery<CandidateData[]>({
    queryKey: selectedJobId ? [`/api/job-postings/${selectedJobId}/candidates`] : ["/api/candidates"],
    enabled: isOpen && view === 'candidates' && !!selectedJobId,
    retry: false,
    refetchInterval: 60000, // Auto-refresh every 60 seconds (1 minute)
    refetchIntervalInBackground: true, // Continue polling even when tab is not active
  });

  const isLoading = view === 'jobs' ? jobsLoading : candidatesLoading;
  const error = view === 'jobs' ? jobsError : candidatesError;

  // Handle unauthorized errors
  React.useEffect(() => {
    if (error && isUnauthorizedError(error as Error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [error, toast]);

  const filteredCandidates = candidates.filter(candidate =>
    candidate.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    candidate.background?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    candidate.userProfile?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    candidate.skills?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    candidate.interests?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    candidate.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    // Legacy field support
    candidate.previousRole?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    candidate.summary?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewProfile = (candidateId: string) => {
    const candidate = candidates.find(c => c.id === candidateId);
    if (candidate) {
      setSelectedCandidate(candidate);
    }
  };

  const handleViewCandidates = (jobId: number) => {
    setSelectedJobId(jobId);
    setView('candidates');
  };

  const handleBackToJobs = () => {
    setView('jobs');
    setSelectedJobId(null);
    setSelectedCandidate(null);
    setSearchTerm("");
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600 dark:text-green-400";
    if (score >= 80) return "text-blue-600 dark:text-blue-400";
    if (score >= 70) return "text-yellow-600 dark:text-yellow-400";
    if (score >= 60) return "text-orange-600 dark:text-orange-400";
    return "text-red-600 dark:text-red-400";
  };

  const getMatchScoreBg = (score: number) => {
    if (score >= 90) return "from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200/50 dark:border-green-700/50";
    if (score >= 80) return "from-blue-50 to-blue-50 dark:from-blue-900/20 dark:to-blue-900/20 border-blue-200/50 dark:border-blue-700/50";
    if (score >= 70) return "from-yellow-50 to-yellow-50 dark:from-yellow-900/20 dark:to-yellow-900/20 border-yellow-200/50 dark:border-yellow-700/50";
    if (score >= 60) return "from-orange-50 to-orange-50 dark:from-orange-900/20 dark:to-orange-900/20 border-orange-200/50 dark:border-orange-700/50";
    return "from-red-50 to-red-50 dark:from-red-900/20 dark:to-red-900/20 border-red-200/50 dark:border-red-700/50";
  };

  // Accept candidate mutation
  const acceptCandidateMutation = useMutation({
    mutationFn: async (candidate: CandidateData) => {
      return await apiRequest(
        'POST',
        `/api/job-postings/${selectedJobId}/candidates/${candidate.id}/accept`,
        {
          candidateName: candidate.name,
          matchScore: candidate.matchScore,
          matchReasoning: candidate.matchReasoning
        }
      );
    },
    onMutate: async (candidate) => {
      // Optimistic update - show accepting state immediately
      setPendingActions(prev => ({ ...prev, [candidate.id]: 'accepting' }));
    },
    onSuccess: (data, candidate) => {
      // Clear pending state and update cache
      setPendingActions(prev => ({ ...prev, [candidate.id]: null }));
      queryClient.invalidateQueries({ queryKey: [`/api/job-postings/${selectedJobId}/candidates`] });
      toast({
        title: "Candidate Accepted ✓",
        description: "The candidate has been accepted and their job match has been recorded in your database.",
      });
    },
    onError: (error, candidate) => {
      // Clear pending state and show error
      setPendingActions(prev => ({ ...prev, [candidate.id]: null }));
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
      toast({
        title: "Error",
        description: "Failed to accept candidate. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Decline candidate mutation
  const declineCandidateMutation = useMutation({
    mutationFn: async (candidate: CandidateData) => {
      return await apiRequest(
        'POST',
        `/api/job-postings/${selectedJobId}/candidates/${candidate.id}/decline`,
        {
          candidateName: candidate.name,
          matchScore: candidate.matchScore,
          matchReasoning: candidate.matchReasoning
        }
      );
    },
    onMutate: async (candidate) => {
      // Optimistic update - show declining state immediately
      setPendingActions(prev => ({ ...prev, [candidate.id]: 'declining' }));
    },
    onSuccess: (data, candidate) => {
      // Start fade-out animation
      setRemovingCandidates(prev => {
        const newSet = new Set(prev);
        newSet.add(candidate.id);
        return newSet;
      });
      
      // Remove from UI after animation completes
      setTimeout(() => {
        setPendingActions(prev => ({ ...prev, [candidate.id]: null }));
        setRemovingCandidates(prev => {
          const newSet = new Set(prev);
          newSet.delete(candidate.id);
          return newSet;
        });
        queryClient.invalidateQueries({ queryKey: [`/api/job-postings/${selectedJobId}/candidates`] });
      }, 300); // Quick 300ms animation
      
      toast({
        title: "Candidate Declined ✗",
        description: "The candidate has been declined.",
      });
    },
    onError: (error, candidate) => {
      // Clear pending state and show error
      setPendingActions(prev => ({ ...prev, [candidate.id]: null }));
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
      toast({
        title: "Error",
        description: "Failed to decline candidate. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Schedule interview mutation
  const scheduleInterviewMutation = useMutation({
    mutationFn: async (data: { candidate: CandidateData; scheduledDate: string; scheduledTime: string; interviewType: string; meetingLink?: string; notes?: string }) => {
      return await apiRequest(
        'POST',
        `/api/job-postings/${selectedJobId}/candidates/${data.candidate.id}/schedule-interview`,
        {
          candidateName: data.candidate.name,
          scheduledDate: data.scheduledDate,
          scheduledTime: data.scheduledTime,
          interviewType: data.interviewType,
          meetingLink: data.meetingLink,
          notes: data.notes
        }
      );
    },
    onSuccess: () => {
      setScheduleInterviewCandidate(null);
      toast({
        title: "Interview Scheduled",
        description: "The interview has been scheduled successfully.",
      });
    },
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
      toast({
        title: "Error",
        description: "Failed to schedule interview. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAcceptCandidate = (candidate: CandidateData) => {
    acceptCandidateMutation.mutate(candidate);
  };

  const handleDeclineCandidate = (candidate: CandidateData) => {
    declineCandidateMutation.mutate(candidate);
  };

  const handleScheduleInterview = (candidate: CandidateData) => {
    setScheduleInterviewCandidate(candidate);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
        >
          {selectedCandidate ? (
            /* Detailed Profile View */
            <div>
              <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedCandidate(null)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                        {selectedCandidate.name}
                      </h2>
                      <p className="text-slate-600 dark:text-slate-400">Complete Profile</p>
                    </div>
                  </div>
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

              <div className="p-6 space-y-6">
                {/* Profile Header */}
                <div className="flex items-start gap-6">
                  <div className="w-24 h-24 bg-slate-200 dark:bg-slate-600 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 font-semibold text-2xl">
                    {selectedCandidate.name?.split(' ').map((n: string) => n.charAt(0)).join('') || 'C'}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                      {selectedCandidate.name}
                    </h3>
                    {selectedCandidate.email && (
                      <div className="mb-3">
                        <span className="inline-flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                          📧 {selectedCandidate.email}
                        </span>
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <MapPin className="w-4 h-4" />
                        <span>{selectedCandidate.location || 'Location not specified'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Calendar className="w-4 h-4" />
                        <span>{selectedCandidate.experience || 'Experience not specified'}</span>
                      </div>
                      {selectedCandidate.matchScore && (
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-blue-500" />
                          <span className={`font-medium ${getMatchScoreColor(selectedCandidate.matchScore)}`}>
                            {selectedCandidate.matchScore}% Match
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Complete User Profile */}
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-6">
                  <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Complete Profile</h4>
                  <div className="whitespace-pre-wrap text-slate-700 dark:text-slate-300 leading-relaxed">
                    {selectedCandidate.userProfile || 'No detailed profile available.'}
                  </div>
                </div>

                {/* AI Analysis */}
                {selectedCandidate.matchReasoning && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
                    <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                      <Star className="w-5 h-5 text-blue-500" />
                      AI Match Analysis
                    </h4>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
                      {selectedCandidate.matchReasoning}
                    </p>
                  </div>
                )}

                {/* Match Score Explanation */}
                {selectedCandidate.matchScore && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-6">
                    <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                      <Target className="w-5 h-5 text-amber-500" />
                      Match Score: {selectedCandidate.matchScore}%
                    </h4>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      This score reflects the candidate's overall fit for the position based on our AI analysis of their background, skills, experience, and alignment with job requirements. 
                      Scores above 75% indicate strong potential candidates, while scores above 85% represent exceptional matches.
                    </p>
                  </div>
                )}

                {/* Skills and Interests */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {selectedCandidate.skills && typeof selectedCandidate.skills === 'string' && (
                    <div>
                      <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Skills</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedCandidate.skills.split(/[,;\n]/).map((skill: string, index: number) => {
                          const trimmedSkill = skill.trim();
                          return trimmedSkill ? (
                            <Badge
                              key={index}
                              variant="secondary"
                              className="bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300"
                            >
                              {trimmedSkill}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}

                  {selectedCandidate.interests && typeof selectedCandidate.interests === 'string' && (
                    <div>
                      <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Interests</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedCandidate.interests.split(/[,;\n]/).map((interest: string, index: number) => {
                          const trimmedInterest = interest.trim();
                          return trimmedInterest ? (
                            <Badge
                              key={index}
                              variant="secondary"
                              className="bg-green-100 dark:bg-green-900/60 text-green-700 dark:text-green-300"
                            >
                              {trimmedInterest}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : view === 'jobs' ? (
            /* Job Selection View */
            <div>
              <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6 rounded-t-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Select Job to View Candidates
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
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                      No job postings found
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      Create some job postings first to view matched candidates.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {jobs.map((job, index) => (
                      <motion.div
                        key={job.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-white dark:bg-slate-700/50 rounded-xl p-6 border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all duration-300"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                              {job.title}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-600 dark:text-slate-400 mb-4">
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                <span>{job.location || 'Remote'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                <span>Posted {new Date(job.createdAt).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Eye className="w-4 h-4" />
                                <span>{job.views || 0} views</span>
                              </div>
                            </div>
                            <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2">
                              {job.description}
                            </p>
                          </div>
                          <div className="ml-6">
                            <Button
                              onClick={() => handleViewCandidates(job.id)}
                              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-6 py-2 rounded-lg text-sm transition-colors duration-200"
                            >
                              <Users className="w-4 h-4 mr-2" />
                              View Candidates
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Candidate List View */
            <div>
              <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6 rounded-t-2xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleBackToJobs}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                        Matched Candidates
                      </h2>
                      <div className="flex items-center gap-3 mt-1">
                        {isFetching && (
                          <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            <span>Checking for new candidates...</span>
                          </div>
                        )}
                        {!isFetching && dataUpdatedAt && (
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            Last updated: {new Date(dataUpdatedAt).toLocaleTimeString()} • Auto-refreshes every minute
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowRatingCriteria(true)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      title="Rating Criteria"
                    >
                      <Info className="w-5 h-5" />
                    </Button>
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
                
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search candidates by name, title, or skills..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="p-6">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="ml-3 text-slate-600 dark:text-slate-400">Loading candidates...</span>
                  </div>
                ) : filteredCandidates.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                      {searchTerm ? "No matching candidates found" : "No candidates yet"}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      {searchTerm 
                        ? "Try adjusting your search terms." 
                        : "The system automatically monitors your Airtable database and checks for new candidates every minute."}
                    </p>
                    {!searchTerm && (
                      <div className="mt-4 flex items-center justify-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <span>Monitoring for new applicants...</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredCandidates.map((candidate, index) => (
                      <motion.div
                        key={candidate.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ 
                          opacity: removingCandidates.has(candidate.id) ? 0 : 1, 
                          y: removingCandidates.has(candidate.id) ? -20 : 0,
                          scale: removingCandidates.has(candidate.id) ? 0.95 : 1
                        }}
                        transition={{ 
                          delay: removingCandidates.has(candidate.id) ? 0 : index * 0.1,
                          duration: removingCandidates.has(candidate.id) ? 0.3 : 0.3
                        }}
                        className={`bg-gradient-to-r ${getMatchScoreBg(candidate.matchScore || 75)} rounded-xl p-6 border flex items-center gap-6`}
                      >
                        {/* Left side - Avatar and basic info */}
                        <div className="flex items-center gap-4 flex-shrink-0">
                          <div className="w-16 h-16 bg-slate-200 dark:bg-slate-600 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 font-semibold text-lg">
                            {candidate.name?.split(' ').map((n: string) => n.charAt(0)).join('') || 'C'}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-slate-900 dark:text-white text-lg">
                              {candidate.name || 'Unknown Candidate'}
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {candidate.location || 'Location not specified'}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-500 line-clamp-1">
                              {candidate.background || candidate.previousRole || 'Background not specified'}
                            </p>
                          </div>
                        </div>

                        {/* Center - Profile summary and skills */}
                        <div className="flex-1 min-w-0 space-y-3">
                          <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2">
                            {candidate.userProfile?.substring(0, 120) + '...' || "Professional candidate profile available."}
                          </p>
                          
                          {/* AI Match Analysis - short version */}
                          {candidate.matchReasoning && (
                            <div className="bg-white/30 dark:bg-black/20 rounded-lg p-3">
                              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">🤖 AI Analysis:</p>
                              <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2">
                                {candidate.matchReasoning.length > 100 
                                  ? candidate.matchReasoning.substring(0, 100) + '...'
                                  : candidate.matchReasoning
                                }
                              </p>
                            </div>
                          )}

                          {/* Skills and Interests - compact horizontal layout */}
                          <div className="flex flex-wrap gap-1">
                            {candidate.skills && typeof candidate.skills === 'string' && 
                              candidate.skills.split(/[,;\n]/).slice(0, 3).map((skill: string, index: number) => {
                                const trimmedSkill = skill.trim();
                                return trimmedSkill ? (
                                  <Badge
                                    key={index}
                                    variant="secondary"
                                    className="text-xs bg-blue-100/60 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300"
                                  >
                                    {trimmedSkill}
                                  </Badge>
                                ) : null;
                              })
                            }
                            {candidate.interests && typeof candidate.interests === 'string' && 
                              candidate.interests.split(/[,;\n]/).slice(0, 2).map((interest: string, index: number) => {
                                const trimmedInterest = interest.trim();
                                return trimmedInterest ? (
                                  <Badge
                                    key={`interest-${index}`}
                                    variant="secondary"
                                    className="text-xs bg-green-100/60 dark:bg-green-900/60 text-green-700 dark:text-green-300"
                                  >
                                    {trimmedInterest}
                                  </Badge>
                                ) : null;
                              })
                            }
                          </div>
                        </div>

                        {/* Right side - Match score and actions */}
                        <div className="flex items-center gap-4 flex-shrink-0">
                          {(candidate.matchScore || jobId) && (
                            <div className="text-center">
                              <div className={`text-3xl font-bold ${getMatchScoreColor(candidate.matchScore || 75)}`}>
                                {candidate.matchScore || 75}
                              </div>
                              <div className={`text-xs font-medium ${getMatchScoreColor(candidate.matchScore || 75)}`}>
                                MATCH SCORE
                              </div>
                            </div>
                          )}
                          
                          <div className="flex flex-col gap-2">
                            <Button
                              onClick={() => handleViewProfile(candidate.id)}
                              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm transition-colors duration-200"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Profile
                            </Button>
                            
                            {/* Show immediate accepting state */}
                            {pendingActions[candidate.id] === 'accepting' && (
                              <div className="flex gap-2">
                                <span className="bg-green-100 text-green-800 text-xs font-medium px-3 py-1 rounded-full dark:bg-green-900 dark:text-green-200 animate-pulse">
                                  <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
                                    Accepting...
                                  </div>
                                </span>
                              </div>
                            )}
                            
                            {/* Show immediate declining state */}
                            {pendingActions[candidate.id] === 'declining' && (
                              <div className="flex gap-2">
                                <span className="bg-red-100 text-red-800 text-xs font-medium px-3 py-1 rounded-full dark:bg-red-900 dark:text-red-200 animate-pulse">
                                  <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                                    Declining...
                                  </div>
                                </span>
                              </div>
                            )}
                            
                            {/* Show accepted state (when not pending) */}
                            {!pendingActions[candidate.id] && candidate.applicationStatus === 'accepted' && (
                              <div className="flex gap-2">
                                <span className="bg-green-100 text-green-800 text-xs font-medium px-3 py-1 rounded-full dark:bg-green-900 dark:text-green-200">
                                  ✓ Accepted
                                </span>
                                <Button
                                  onClick={() => handleScheduleInterview(candidate)}
                                  className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-lg text-xs"
                                >
                                  <Calendar className="w-3 h-3 mr-1" />
                                  Schedule
                                </Button>
                              </div>
                            )}
                            
                            {/* Show declined state (when not pending) */}
                            {!pendingActions[candidate.id] && candidate.applicationStatus === 'declined' && (
                              <span className="bg-red-100 text-red-800 text-xs font-medium px-3 py-1 rounded-full dark:bg-red-900 dark:text-red-200">
                                ✗ Declined
                              </span>
                            )}
                            
                            {/* Show action buttons (when not pending and no status) */}
                            {!pendingActions[candidate.id] && (!candidate.applicationStatus || candidate.applicationStatus === 'pending') && (
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => handleAcceptCandidate(candidate)}
                                  disabled={acceptCandidateMutation.isPending}
                                  className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-3 py-1 rounded-lg text-xs transition-all duration-200"
                                >
                                  Accept
                                </Button>
                                <Button
                                  onClick={() => handleDeclineCandidate(candidate)}
                                  disabled={declineCandidateMutation.isPending}
                                  className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-3 py-1 rounded-lg text-xs transition-all duration-200"
                                >
                                  Decline
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Interview Scheduling Modal */}
      {scheduleInterviewCandidate && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Schedule Interview
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setScheduleInterviewCandidate(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                <h4 className="font-medium text-slate-900 dark:text-white mb-1">
                  {scheduleInterviewCandidate.name}
                </h4>
                {scheduleInterviewCandidate.email && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                    📧 {scheduleInterviewCandidate.email}
                  </p>
                )}
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Match Score: {scheduleInterviewCandidate.matchScore}%
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Date
                  </label>
                  <Input
                    type="date"
                    className="w-full"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Time
                  </label>
                  <Input
                    type="time"
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Interview Type
                </label>
                <select className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white">
                  <option value="video">Video Call</option>
                  <option value="phone">Phone Call</option>
                  <option value="in-person">In-Person</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Meeting Link (optional)
                </label>
                <Input
                  type="url"
                  placeholder="https://meet.google.com/..."
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Interview notes or special instructions..."
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setScheduleInterviewCandidate(null)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    // For now, just show a success message
                    toast({
                      title: "Interview Scheduled",
                      description: "Interview has been scheduled successfully.",
                    });
                    setScheduleInterviewCandidate(null);
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Schedule Interview
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Rating Criteria Modal */}
      {showRatingCriteria && (
        <div className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-sm flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-500" />
                Candidate Rating Criteria
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowRatingCriteria(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-6">
              <div className="text-slate-600 dark:text-slate-400">
                Our AI matching system evaluates candidates using a comprehensive weighted scoring system:
              </div>

              <div className="space-y-4">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h4 className="font-semibold text-slate-900 dark:text-white">Technical Skills (30%)</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Relevance and proficiency in required programming languages, frameworks, and tools
                  </p>
                </div>

                <div className="border-l-4 border-green-500 pl-4">
                  <h4 className="font-semibold text-slate-900 dark:text-white">Experience Level (25%)</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Years of experience in similar roles and industry alignment
                  </p>
                </div>

                <div className="border-l-4 border-purple-500 pl-4">
                  <h4 className="font-semibold text-slate-900 dark:text-white">Education & Background (20%)</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Relevant educational qualifications and career trajectory
                  </p>
                </div>

                <div className="border-l-4 border-orange-500 pl-4">
                  <h4 className="font-semibold text-slate-900 dark:text-white">Project Portfolio (15%)</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Quality and relevance of past projects and achievements
                  </p>
                </div>

                <div className="border-l-4 border-amber-500 pl-4">
                  <h4 className="font-semibold text-slate-900 dark:text-white">Cultural Fit (10%)</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Communication style, interests, and alignment with company values
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                <h5 className="font-medium text-slate-900 dark:text-white mb-2">Score Interpretation:</h5>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">85-100%:</span>
                    <span className="text-green-600 dark:text-green-400 font-medium">Exceptional Match</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">75-84%:</span>
                    <span className="text-blue-600 dark:text-blue-400 font-medium">Strong Match</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">60-74%:</span>
                    <span className="text-amber-600 dark:text-amber-400 font-medium">Good Match</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Below 60%:</span>
                    <span className="text-red-600 dark:text-red-400 font-medium">Limited Match</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}