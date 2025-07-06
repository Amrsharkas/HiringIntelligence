import React, { useState, useMemo } from 'react';
import { X, Eye, MapPin, Calendar, Users, ChevronLeft, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';

interface CandidateData {
  id: string;
  name?: string;
  userId?: string;
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

  const queryClient = useQueryClient();

  // Fetch job postings
  const { data: jobs = [] } = useQuery<any[]>({
    queryKey: ["/api/job-postings"],
    enabled: isOpen && view === 'jobs',
    retry: false,
    refetchInterval: 60000,
    refetchIntervalInBackground: true,
  });

  // Fetch candidates for selected job
  const { data: candidates = [] } = useQuery<CandidateData[]>({
    queryKey: [`/api/job-postings/${selectedJobId}/candidates`],
    enabled: isOpen && selectedJobId !== null,
    retry: false,
    refetchInterval: 60000,
    refetchIntervalInBackground: true,
  });

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
      setPendingActions(prev => ({ ...prev, [candidate.id]: 'accepting' }));
    },
    onSuccess: (data, candidate) => {
      setPendingActions(prev => ({ ...prev, [candidate.id]: null }));
      queryClient.invalidateQueries({ queryKey: [`/api/job-postings/${selectedJobId}/candidates`] });
      toast({
        title: "Candidate Accepted ✓",
        description: "The candidate has been accepted and their job match has been recorded in your database.",
      });
    },
    onError: (error, candidate) => {
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
      setPendingActions(prev => ({ ...prev, [candidate.id]: 'declining' }));
    },
    onSuccess: (data, candidate) => {
      setRemovingCandidates(prev => {
        const newSet = new Set(prev);
        newSet.add(candidate.id);
        return newSet;
      });
      
      setTimeout(() => {
        setPendingActions(prev => ({ ...prev, [candidate.id]: null }));
        setRemovingCandidates(prev => {
          const newSet = new Set(prev);
          newSet.delete(candidate.id);
          return newSet;
        });
        queryClient.invalidateQueries({ queryKey: [`/api/job-postings/${selectedJobId}/candidates`] });
      }, 300);
      
      toast({
        title: "Candidate Declined ✗",
        description: "The candidate has been declined.",
      });
    },
    onError: (error, candidate) => {
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

  const handleAcceptCandidate = (candidate: CandidateData) => {
    acceptCandidateMutation.mutate(candidate);
  };

  const handleDeclineCandidate = (candidate: CandidateData) => {
    declineCandidateMutation.mutate(candidate);
  };

  const handleScheduleInterview = (candidate: CandidateData) => {
    setScheduleInterviewCandidate(candidate);
  };

  const handleViewCandidates = (jobId: number) => {
    setSelectedJobId(jobId);
    setView('candidates');
  };

  const handleBackToJobs = () => {
    setView('jobs');
    setSelectedJobId(null);
  };

  const getMatchScoreBg = (score: number) => {
    if (score >= 80) return 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20';
    if (score >= 60) return 'from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20';
    if (score >= 40) return 'from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20';
    return 'from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20';
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-blue-600 dark:text-blue-400';
    if (score >= 40) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const filteredCandidates = useMemo(() => {
    return candidates.filter(candidate =>
      candidate.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.background?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.skills?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [candidates, searchTerm]);

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
          >
            {view === 'jobs' ? (
              /* Job Selection View */
              <div>
                <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6 rounded-t-2xl">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                      Select Job Posting
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
                  <div className="space-y-4">
                    {jobs.map((job) => (
                      <motion.div
                        key={job.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-6 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                        onClick={() => handleViewCandidates(job.id)}
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
                        <ChevronLeft className="w-5 h-5" />
                      </Button>
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                        Matched Candidates
                      </h2>
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

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input
                      type="text"
                      placeholder="Search candidates by name, title, or skills..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-full"
                    />
                  </div>
                </div>

                <div className="p-6">
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

                        {/* Center - Profile summary */}
                        <div className="flex-1 min-w-0 space-y-3">
                          <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2">
                            {candidate.userProfile?.substring(0, 120) + '...' || "Professional candidate profile available."}
                          </p>
                          
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
                        </div>

                        {/* Right side - Score and actions */}
                        <div className="flex items-center gap-6 flex-shrink-0">
                          <div className="text-center">
                            <div className={`text-3xl font-bold ${getMatchScoreColor(candidate.matchScore || 75)}`}>
                              {candidate.matchScore || 75}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                              MATCH SCORE
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-2">
                            <Button
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
                            {!pendingActions[candidate.id] && !candidate.applicationStatus && (
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => handleAcceptCandidate(candidate)}
                                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-xs"
                                >
                                  Accept
                                </Button>
                                <Button
                                  onClick={() => handleDeclineCandidate(candidate)}
                                  variant="destructive"
                                  className="px-3 py-1 rounded-lg text-xs"
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
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </AnimatePresence>

      {/* Interview Scheduling Modal - Outside main modal for proper z-index */}
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
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Match Score: {scheduleInterviewCandidate.matchScore}%
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Date
                  </label>
                  <Input
                    type="date"
                    className="w-full"
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
    </>
  );
}