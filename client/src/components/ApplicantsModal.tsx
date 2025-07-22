import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, User, Mail, Phone, FileText, Calendar, CheckCircle, XCircle, Clock, Eye, MessageCircle, Video, Brain, Star, TrendingUp, AlertTriangle, RefreshCw, ChevronRight, Settings, Plus, Trash2, MessageSquare, RotateCcw, Lightbulb, MapPin, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';

interface ApplicantData {
  id: string;
  name: string;
  userId: string;
  email?: string;
  phone?: string;
  resume?: string;
  coverLetter?: string;
  applicationDate: string;
  jobId: string;
  jobTitle: string;
  jobDescription: string;
  companyName: string;
  userProfile?: string;
  notes?: string;
  matchScore?: number;
  matchSummary?: string;
  // Legacy fields for compatibility
  experience?: string;
  skills?: string;
  location?: string;
  salaryExpectation?: string;
  status?: 'pending' | 'accepted' | 'declined';
}

interface ApplicantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId?: number;
}

// Interview Modal Content Component
function InterviewModalContent({ 
  selectedApplicant, 
  interviewData, 
  setInterviewData, 
  onSubmit, 
  isScheduling 
}: {
  selectedApplicant: ApplicantData;
  interviewData: any;
  setInterviewData: (data: any) => void;
  onSubmit: () => void;
  isScheduling: boolean;
}) {
  const { data: interviews = [], isLoading: loadingInterviews } = useQuery({
    queryKey: ['/api/interviews'],
    refetchInterval: 30000,
  });

  // Get interviews for this specific applicant
  const applicantInterviews = interviews.filter(
    (interview: any) => interview.candidateId === selectedApplicant.id
  );

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">
          Schedule Interview with {selectedApplicant.name}
        </h4>
        <p className="text-blue-700 dark:text-blue-300 text-sm">
          Position: {selectedApplicant.jobTitle}
        </p>
        {selectedApplicant.email && (
          <p className="text-blue-700 dark:text-blue-300 text-sm">
            Email: {selectedApplicant.email}
          </p>
        )}
      </div>

      {/* Show existing interviews if any */}
      {applicantInterviews.length > 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <h5 className="font-medium text-green-900 dark:text-green-200 mb-2">
            Scheduled Interviews ({applicantInterviews.length})
          </h5>
          {applicantInterviews.map((interview: any) => (
            <div key={interview.id} className="text-sm text-green-700 dark:text-green-300 mb-1">
              • {interview.scheduledDate} at {interview.scheduledTime} ({interview.interviewType})
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Date
          </label>
          <input
            type="date"
            value={interviewData.scheduledDate}
            onChange={(e) => setInterviewData({...interviewData, scheduledDate: e.target.value})}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Time
          </label>
          <input
            type="time"
            value={interviewData.scheduledTime}
            onChange={(e) => setInterviewData({...interviewData, scheduledTime: e.target.value})}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Interview Type
        </label>
        <select
          value={interviewData.interviewType}
          onChange={(e) => setInterviewData({...interviewData, interviewType: e.target.value})}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
          <option value="video">Video Call</option>
          <option value="phone">Phone Call</option>
          <option value="in-person">In-Person</option>
        </select>
      </div>
      
      {interviewData.interviewType === 'video' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Meeting Link
          </label>
          <input
            type="url"
            value={interviewData.meetingLink}
            onChange={(e) => setInterviewData({...interviewData, meetingLink: e.target.value})}
            placeholder="https://zoom.us/j/..."
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
      )}
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Notes
        </label>
        <textarea
          value={interviewData.notes}
          onChange={(e) => setInterviewData({...interviewData, notes: e.target.value})}
          rows={4}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          placeholder="Additional notes for the interview..."
        />
      </div>

      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onSubmit}
          disabled={isScheduling || !interviewData.scheduledDate || !interviewData.scheduledTime}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {isScheduling && <RefreshCw className="w-4 h-4 animate-spin" />}
          <span>{isScheduling ? 'Scheduling...' : 'Schedule Interview'}</span>
        </button>
      </div>
    </div>
  );
}

export function ApplicantsModal({ isOpen, onClose, jobId }: ApplicantsModalProps) {
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [selectedApplicant, setSelectedApplicant] = useState<ApplicantData | null>(null);
  const [showInterviewScheduler, setShowInterviewScheduler] = useState(false);
  const [showProfileAnalysis, setShowProfileAnalysis] = useState(false);
  const [profileAnalysis, setProfileAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [acceptedApplicants, setAcceptedApplicants] = useState<Set<string>>(new Set());
  const [processingActions, setProcessingActions] = useState<Set<string>>(new Set());
  const [recentActions, setRecentActions] = useState<Map<string, any>>(new Map());
  const [showingUndo, setShowingUndo] = useState<Set<string>>(new Set());
  const [interviewData, setInterviewData] = useState({
    scheduledDate: '',
    scheduledTime: '',
    interviewType: 'video',
    meetingLink: '',
    notes: ''
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch available jobs
  const { data: jobs = [] } = useQuery({
    queryKey: ['/api/job-postings'],
    enabled: isOpen,
  });

  const { data: applicants = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: selectedJob ? ['/api/real-applicants', selectedJob.id] : null,
    enabled: isOpen && !!selectedJob,
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchIntervalInBackground: true,
  });

  // Manual refresh function
  const handleManualRefresh = () => {
    refetch();
  };

  // Auto-refresh every 30 seconds when modal is open and job is selected
  useEffect(() => {
    if (!isOpen || !selectedJob) return;
    
    const interval = setInterval(() => {
      refetch();
    }, 30000);

    return () => clearInterval(interval);
  }, [isOpen, selectedJob, refetch]);

  // Auto-select job if jobId is provided from "View Applicants" button
  useEffect(() => {
    if (jobId && jobs.length > 0 && !selectedJob) {
      const job = jobs.find(j => j.id === jobId);
      if (job) {
        setSelectedJob(job);
      }
    }
  }, [jobId, jobs, selectedJob]);

  // Reset selected job when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedJob(null);
      setSelectedApplicant(null);
      setShowInterviewScheduler(false);
      setShowProfileAnalysis(false);
    }
  }, [isOpen]);

  const acceptApplicantMutation = useMutation({
    mutationFn: async (applicantId: string) => {
      return await apiRequest('POST', `/api/real-applicants/${applicantId}/accept`);
    },
    onMutate: (applicantId: string) => {
      setProcessingActions(prev => new Set([...prev, applicantId]));
    },
    onSuccess: (data, applicantId: string) => {
      setAcceptedApplicants(prev => new Set([...prev, applicantId]));
      setProcessingActions(prev => {
        const newSet = new Set(prev);
        newSet.delete(applicantId);
        return newSet;
      });
      
      // Store undo data if provided
      if (data.undoData) {
        setRecentActions(prev => new Map(prev.set(applicantId, data.undoData)));
        setShowingUndo(prev => new Set([...prev, applicantId]));
        
        // Hide undo button after 10 seconds
        setTimeout(() => {
          setShowingUndo(prev => {
            const newSet = new Set(prev);
            newSet.delete(applicantId);
            return newSet;
          });
          setRecentActions(prev => {
            const newMap = new Map(prev);
            newMap.delete(applicantId);
            return newMap;
          });
        }, 10000);
      }
      
      toast({
        title: "Success",
        description: `${data.applicantName || 'Applicant'} accepted! Click "Schedule Interview" in the Quick Actions to proceed.`,
        duration: 8000,
      });
      refetch();
    },
    onError: (error, applicantId: string) => {
      setProcessingActions(prev => {
        const newSet = new Set(prev);
        newSet.delete(applicantId);
        return newSet;
      });
      if (isUnauthorizedError(error as Error)) {
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
        description: "Failed to accept applicant. Please try again.",
        variant: "destructive",
      });
    },
  });

  const declineApplicantMutation = useMutation({
    mutationFn: async (applicantId: string) => {
      return await apiRequest('POST', `/api/real-applicants/${applicantId}/decline`);
    },
    onMutate: (applicantId: string) => {
      setProcessingActions(prev => new Set([...prev, applicantId]));
    },
    onSuccess: (data, applicantId: string) => {
      setProcessingActions(prev => {
        const newSet = new Set(prev);
        newSet.delete(applicantId);
        return newSet;
      });
      
      // Store undo data if provided
      if (data.undoData) {
        setRecentActions(prev => new Map(prev.set(applicantId, data.undoData)));
        setShowingUndo(prev => new Set([...prev, applicantId]));
        
        // Hide undo button after 10 seconds
        setTimeout(() => {
          setShowingUndo(prev => {
            const newSet = new Set(prev);
            newSet.delete(applicantId);
            return newSet;
          });
          setRecentActions(prev => {
            const newMap = new Map(prev);
            newMap.delete(applicantId);
            return newMap;
          });
        }, 10000);
      }
      
      toast({
        title: "Success",
        description: "Applicant declined and removed",
      });
      refetch();
    },
    onError: (error, applicantId: string) => {
      setProcessingActions(prev => {
        const newSet = new Set(prev);
        newSet.delete(applicantId);
        return newSet;
      });
      if (isUnauthorizedError(error as Error)) {
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
        description: "Failed to decline applicant. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Undo accept mutation
  const undoAcceptMutation = useMutation({
    mutationFn: async (undoData: any) => {
      return await apiRequest('POST', `/api/real-applicants/${undoData.applicantId}/undo-accept`, undoData);
    },
    onSuccess: (data, undoData) => {
      setAcceptedApplicants(prev => {
        const newSet = new Set(prev);
        newSet.delete(undoData.applicantId);
        return newSet;
      });
      setShowingUndo(prev => {
        const newSet = new Set(prev);
        newSet.delete(undoData.applicantId);
        return newSet;
      });
      setRecentActions(prev => {
        const newMap = new Map(prev);
        newMap.delete(undoData.applicantId);
        return newMap;
      });
      toast({
        title: "Success",
        description: "Accept action undone - applicant restored to applications",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to undo accept action. Please try again.",
        variant: "destructive",
      });
    },
  });

  const scheduleInterviewMutation = useMutation({
    mutationFn: async (data: { applicant: ApplicantData; scheduledDate: string; scheduledTime: string; interviewType: string; meetingLink?: string; notes?: string }) => {
      const response = await apiRequest('POST', '/api/interviews', {
        candidateName: data.applicant.name,
        candidateEmail: data.applicant.email,
        candidateId: data.applicant.id,
        jobId: data.applicant.jobId,
        jobTitle: data.applicant.jobTitle,
        scheduledDate: data.scheduledDate,
        scheduledTime: data.scheduledTime,
        interviewType: data.interviewType,
        meetingLink: data.meetingLink || '',
        notes: data.notes || ''
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Interview scheduled successfully!",
      });
      setShowInterviewScheduler(false);
      setInterviewData({
        scheduledDate: '',
        scheduledTime: '',
        interviewType: 'video',
        meetingLink: '',
        notes: ''
      });
      refetch();
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

  const handleAcceptApplicant = (applicant: ApplicantData) => {
    acceptApplicantMutation.mutate(applicant.id);
  };

  const handleDeclineApplicant = (applicant: ApplicantData) => {
    declineApplicantMutation.mutate(applicant.id);
  };

  const handleScheduleInterview = (applicant: ApplicantData) => {
    setSelectedApplicant(applicant);
    setShowInterviewScheduler(true);
  };

  const [completeUserProfile, setCompleteUserProfile] = useState<any>(null);
  const [matchAnalysis, setMatchAnalysis] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'match' | 'profile'>('match');
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingMatchAnalysis, setIsLoadingMatchAnalysis] = useState(false);
  const [profileLoadAttempted, setProfileLoadAttempted] = useState(false);

  // Load profile when switching to Complete Profile tab (only once per applicant)
  useEffect(() => {
    if (activeTab === 'profile' && selectedApplicant && !completeUserProfile && !isLoadingProfile && !profileLoadAttempted) {
      console.log('🔄 Complete Profile tab selected, loading profile for:', selectedApplicant.name);
      setProfileLoadAttempted(true);
      loadCompleteUserProfile(selectedApplicant);
    }
  }, [activeTab, selectedApplicant?.name]);

  // Reset profile load attempt when applicant changes
  useEffect(() => {
    setProfileLoadAttempted(false);
    setCompleteUserProfile(null);
  }, [selectedApplicant?.name]);

  const handleViewProfile = async (applicant: ApplicantData) => {
    setSelectedApplicant(applicant);
    setShowProfileAnalysis(true);
    setActiveTab('match');
    setCompleteUserProfile(null);
    setMatchAnalysis(null);
    
    console.log('🔍 View Profile clicked for applicant:', applicant.name);
    console.log('📋 Available applicant fields:', Object.keys(applicant));
    
    // Only load AI Match Analysis immediately, profile loads when user clicks Complete Profile tab
    loadMatchAnalysis(applicant);
  };

  const loadCompleteUserProfile = async (applicant: ApplicantData) => {
    // Use applicant name for profile lookup since UserID field in job applications contains name
    const userIdentifier = applicant.name;
    
    console.log('🚀 loadCompleteUserProfile called with:', { 
      applicantName: userIdentifier,
      applicantKeys: Object.keys(applicant),
      hasName: !!userIdentifier
    });
    
    if (!userIdentifier) {
      console.error('❌ No name found in applicant data:', applicant);
      setCompleteUserProfile(null);
      return;
    }
    
    setIsLoadingProfile(true);
    try {
      console.log('🔍 Making API request to:', `/api/user-profile/${encodeURIComponent(userIdentifier)}`);
      console.log('📋 Full applicant data:', applicant);
      
      const response = await apiRequest("GET", `/api/user-profile/${encodeURIComponent(userIdentifier)}`);
      
      console.log('📡 API response status:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error Response:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }
      
      const profile = await response.json();
      console.log('✅ Profile data received:', {
        name: profile.name,
        userId: profile.userId,
        profileLength: profile.userProfile?.length || 0,
        keys: Object.keys(profile)
      });
      
      setCompleteUserProfile(profile);
      console.log('✅ Complete user profile loaded for:', profile.name);
    } catch (error) {
      console.error('❌ Error loading user profile:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack
      });
      setCompleteUserProfile(null);
      
      // Only show error toast if we're actively viewing the Complete Profile tab
      // and not if this is just background loading while AI Match Analysis is running
      if (activeTab === 'profile') {
        toast({
          title: "Profile Not Found",
          description: "The applicant has not completed their full profile yet. Please ask them to finish their AI interview.",
          variant: "destructive",
        });
      } else {
        console.log('🔇 Profile loading failed but AI Match Analysis is active, suppressing error toast');
      }
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const loadMatchAnalysis = async (applicant: ApplicantData) => {
    if (!selectedJob) return;
    
    setIsLoadingMatchAnalysis(true);
    try {
      console.log('🤖 Generating AI match analysis...');
      const response = await apiRequest("POST", "/api/ai/job-match-analysis", {
        jobTitle: selectedJob.title,
        jobDescription: selectedJob.description,
        jobRequirements: selectedJob.requirements,
        userProfile: {
          name: applicant.name,
          email: applicant.email,
          userId: applicant.userId,
          experience: applicant.experience,
          skills: applicant.skills,
          location: applicant.location,
          salaryExpectation: applicant.salaryExpectation,
          // Include any available profile data
          userProfile: applicant.userProfile || '',
          resume: applicant.resume,
          coverLetter: applicant.coverLetter,
        },
      });
      const analysis = await response.json();
      setMatchAnalysis(analysis);
      console.log('✅ Match analysis generated with score:', analysis.overallMatchScore);
    } catch (error) {
      console.error('Error generating match analysis:', error);
      toast({
        title: "Error",
        description: "Failed to generate match analysis",
        variant: "destructive",
      });
    } finally {
      setIsLoadingMatchAnalysis(false);
    }
  };

  const handleRefreshProfile = () => {
    if (selectedApplicant) {
      console.log('🔄 Refreshing profile for:', selectedApplicant.name);
      setCompleteUserProfile(null);
      setMatchAnalysis(null);
      setProfileLoadAttempted(false); // Reset to allow fresh loading
      
      // Reload both profile and match analysis
      loadCompleteUserProfile(selectedApplicant);
      loadMatchAnalysis(selectedApplicant);
    }
  };

  const handleSubmitInterview = () => {
    if (!selectedApplicant) return;
    
    scheduleInterviewMutation.mutate({
      applicant: selectedApplicant,
      ...interviewData
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'text-green-600 bg-green-50';
      case 'declined':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-yellow-600 bg-yellow-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="w-4 h-4" />;
      case 'declined':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-6xl w-full h-[90vh] mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {selectedJob ? `Applicants for ${selectedJob.title}` : 'Select Job Position'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {selectedJob ? 'Real applications with AI-powered matching scores' : 'Choose a job to view its applicants'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleManualRefresh}
              disabled={isFetching}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
              {isFetching ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {!selectedJob ? (
            // Job Selection Screen
            <div className="h-full overflow-y-auto p-6">
              <div className="max-w-4xl mx-auto">
                <div className="grid gap-4">
                  {jobs.map((job: any) => (
                    <motion.div
                      key={job.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      onClick={() => setSelectedJob(job)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-grow">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            {job.title}
                          </h3>
                          <div className="flex flex-wrap gap-2 mb-3">
                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full">
                              {job.location}
                            </span>
                            <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs rounded-full">
                              {job.salaryRange}
                            </span>
                            <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs rounded-full">
                              {job.jobType}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                            {job.description}
                          </p>
                        </div>
                        <div className="flex items-center text-blue-600 dark:text-blue-400 ml-4">
                          <ChevronRight className="w-5 h-5" />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : applicants.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <User className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No applicants found for this position</p>
                <button
                  onClick={() => setSelectedJob(null)}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Back to Job Selection
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-y-auto p-6">
              <div className="space-y-4 max-w-4xl mx-auto">
                {applicants.map((applicant: ApplicantData) => (
                  <motion.div
                    key={applicant.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 w-full"
                  >
                    {/* Applicant Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-grow min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                            {applicant.name || 'Unknown Applicant'}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            {applicant.email && (
                              <div className="flex items-center space-x-1">
                                <Mail className="w-3 h-3 text-gray-400" />
                                <span className="text-xs text-gray-500 dark:text-gray-400">{applicant.email}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-2 flex-shrink-0">
                        {applicant.matchScore && (
                          <div className="flex items-center space-x-2 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full">
                            <Brain className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">
                              {Math.round(applicant.matchScore)}%
                            </span>
                          </div>
                        )}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(applicant.status || 'pending')}`}>
                          {getStatusIcon(applicant.status || 'pending')}
                          <span className="capitalize">{applicant.status || 'pending'}</span>
                        </span>
                      </div>
                    </div>

                    {/* AI Match Summary */}
                    {applicant.matchSummary && (
                      <div className="mb-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-700/50">
                        <div className="flex items-start gap-2">
                          <Brain className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-xs font-medium text-blue-900 dark:text-blue-100">AI Analysis</p>
                              {applicant.matchScore && (
                                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                                  Score: {Math.round(applicant.matchScore)}/100
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">{applicant.matchSummary}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Quick Info Row */}
                    <div className="flex flex-wrap gap-4 mb-3 text-sm text-gray-600 dark:text-gray-300">
                      {applicant.phone && (
                        <div className="flex items-center space-x-1">
                          <Phone className="w-3 h-3 text-gray-400" />
                          <span>{applicant.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        <span>Applied: {new Date(applicant.applicationDate).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-600">
                      <button
                        onClick={() => handleViewProfile(applicant)}
                        className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-blue-700 flex items-center space-x-1 transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        <span>View Profile</span>
                      </button>
                      
                      <div className="flex space-x-2">
                        {showingUndo.has(applicant.id) ? (
                          // Show undo options
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                const undoData = recentActions.get(applicant.id);
                                if (undoData && undoData.action === 'accept') {
                                  undoAcceptMutation.mutate(undoData);
                                }
                              }}
                              className="bg-orange-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-orange-700 transition-colors flex items-center space-x-1"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Undo</span>
                            </button>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {recentActions.get(applicant.id)?.action === 'accept' ? 'Accepted' : 'Declined'}
                            </span>
                          </div>
                        ) : acceptedApplicants.has(applicant.id) || applicant.status === 'accepted' ? (
                          <button
                            onClick={() => handleScheduleInterview(applicant)}
                            className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-blue-700 transition-colors flex items-center space-x-1"
                          >
                            <Calendar className="w-3 h-3" />
                            <span>Schedule Interview</span>
                          </button>
                        ) : applicant.status === 'declined' ? (
                          <div className="flex items-center space-x-2 text-red-600">
                            <XCircle className="w-4 h-4" />
                            <span className="text-sm font-medium">Declined</span>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => handleAcceptApplicant(applicant)}
                              disabled={processingActions.has(applicant.id)}
                              className="bg-green-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-1"
                            >
                              <CheckCircle className="w-3 h-3" />
                              <span>{processingActions.has(applicant.id) ? 'Accepting...' : 'Accept'}</span>
                            </button>
                            <button
                              onClick={() => handleDeclineApplicant(applicant)}
                              disabled={processingActions.has(applicant.id)}
                              className="bg-red-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-1"
                            >
                              <XCircle className="w-3 h-3" />
                              <span>{processingActions.has(applicant.id) ? 'Declining...' : 'Decline'}</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Interview Scheduler Modal */}
        <AnimatePresence>
          {showInterviewScheduler && selectedApplicant && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full mx-4 h-[90vh] flex flex-col"
              >
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-6 h-6 text-blue-600" />
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Interview Management with {selectedApplicant.name}
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowInterviewScheduler(false)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="flex-1 overflow-hidden">
                  <InterviewModalContent 
                    selectedApplicant={selectedApplicant}
                    interviewData={interviewData}
                    setInterviewData={setInterviewData}
                    onSubmit={handleSubmitInterview}
                    isScheduling={scheduleInterviewMutation.isPending}
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Profile Analysis Modal */}
        <AnimatePresence>
          {showProfileAnalysis && selectedApplicant && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full h-[90vh] mx-4 flex flex-col"
              >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {selectedApplicant.name}
                      </h2>
                      <p className="text-gray-500 dark:text-gray-400">Complete Profile & Job Match Analysis</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRefreshProfile}
                      className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Refresh
                    </button>
                    <button
                      onClick={() => setShowProfileAnalysis(false)}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200 dark:border-gray-700">
                  <div className="flex p-6 pb-0">
                    <button
                      onClick={() => setActiveTab('match')}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'match'
                          ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Brain className="w-4 h-4" />
                        AI Match Analysis
                      </div>
                    </button>
                    <button
                      onClick={() => setActiveTab('profile')}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'profile'
                          ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Complete Profile
                      </div>
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                  {activeTab === 'match' ? (
                    /* AI Match Analysis Tab */
                    <div className="p-6">
                      {isLoadingMatchAnalysis ? (
                        <div className="flex items-center justify-center h-96">
                          <div className="text-center">
                            <Brain className="w-16 h-16 mx-auto text-blue-500 animate-pulse mb-4" />
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                              Generating AI Match Analysis
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400">
                              Our AI is analyzing how well this candidate matches the job requirements...
                            </p>
                          </div>
                        </div>
                      ) : matchAnalysis ? (
                        <div className="space-y-6">
                          {/* Overall Match Score */}
                          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700/50">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Overall Match Score</h3>
                              <div className="text-right">
                                <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                                  {matchAnalysis.overallMatchScore}/100
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">Match Quality</div>
                              </div>
                            </div>
                            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                              {matchAnalysis.matchSummary}
                            </p>
                          </div>

                          {/* Alignment Scores */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold text-gray-900 dark:text-white">Technical Skills</h4>
                                <span className="text-lg font-bold text-green-600 dark:text-green-400">
                                  {matchAnalysis.technicalAlignment?.score || 0}%
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {matchAnalysis.technicalAlignment?.analysis || 'No analysis available'}
                              </p>
                            </div>
                            
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold text-gray-900 dark:text-white">Experience</h4>
                                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                  {matchAnalysis.experienceAlignment?.score || 0}%
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {matchAnalysis.experienceAlignment?.analysis || 'No analysis available'}
                              </p>
                            </div>
                            
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold text-gray-900 dark:text-white">Cultural Fit</h4>
                                <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                                  {matchAnalysis.culturalFit?.score || 0}%
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {matchAnalysis.culturalFit?.analysis || 'No analysis available'}
                              </p>
                            </div>
                          </div>

                          {/* Strengths and Gaps */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-5 border border-green-200 dark:border-green-700/50">
                              <h4 className="font-semibold text-green-900 dark:text-green-100 mb-3 flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                                Key Strengths
                              </h4>
                              <ul className="space-y-2">
                                {(matchAnalysis.strengths || []).map((strength: string, index: number) => (
                                  <li key={index} className="flex items-start gap-2">
                                    <span className="text-green-500 mt-1.5 text-xs">●</span>
                                    <span className="text-green-700 dark:text-green-300 text-sm leading-relaxed">
                                      {strength}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-5 border border-orange-200 dark:border-orange-700/50">
                              <h4 className="font-semibold text-orange-900 dark:text-orange-100 mb-3 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-orange-600" />
                                Development Areas
                              </h4>
                              <ul className="space-y-2">
                                {(matchAnalysis.gaps || []).map((gap: string, index: number) => (
                                  <li key={index} className="flex items-start gap-2">
                                    <span className="text-orange-500 mt-1.5 text-xs">●</span>
                                    <span className="text-orange-700 dark:text-orange-300 text-sm leading-relaxed">
                                      {gap}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          {/* Recommendations and Interview Focus */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-5 border border-blue-200 dark:border-blue-700/50">
                              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                                <Lightbulb className="w-5 h-5 text-blue-600" />
                                Recommendations
                              </h4>
                              <ul className="space-y-2">
                                {(matchAnalysis.recommendations || []).map((rec: string, index: number) => (
                                  <li key={index} className="flex items-start gap-2">
                                    <span className="text-blue-500 mt-1.5 text-xs">●</span>
                                    <span className="text-blue-700 dark:text-blue-300 text-sm leading-relaxed">
                                      {rec}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-5 border border-purple-200 dark:border-purple-700/50">
                              <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-3 flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-purple-600" />
                                Interview Focus Areas
                              </h4>
                              <ul className="space-y-2">
                                {(matchAnalysis.interviewFocus || []).map((focus: string, index: number) => (
                                  <li key={index} className="flex items-start gap-2">
                                    <span className="text-purple-500 mt-1.5 text-xs">●</span>
                                    <span className="text-purple-700 dark:text-purple-300 text-sm leading-relaxed">
                                      {focus}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-96">
                          <div className="text-center">
                            <AlertTriangle className="w-16 h-16 mx-auto text-red-400 mb-4" />
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                              Match Analysis Failed
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400">
                              Unable to generate match analysis. Please try again.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Complete Profile Tab */
                    <div className="p-6">
                      {isLoadingProfile ? (
                        <div className="flex items-center justify-center h-96">
                          <div className="text-center">
                            <User className="w-16 h-16 mx-auto text-blue-500 animate-pulse mb-4" />
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                              Loading Complete Profile
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400">
                              Fetching comprehensive user profile from Airtable...
                            </p>
                          </div>
                        </div>
                      ) : completeUserProfile ? (
                        <div className="space-y-6">
                          {/* Profile Header */}
                          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700/50">
                            <div className="flex items-start gap-6">
                              <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-2xl">
                                {completeUserProfile.name?.split(' ').map((n: string) => n.charAt(0)).join('') || 'U'}
                              </div>
                              <div className="flex-1">
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                  {completeUserProfile.name}
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {completeUserProfile.email && (
                                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                      <Mail className="w-4 h-4" />
                                      <span>{completeUserProfile.email}</span>
                                    </div>
                                  )}
                                  {completeUserProfile.location && (
                                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                      <MapPin className="w-4 h-4" />
                                      <span>{completeUserProfile.location}</span>
                                    </div>
                                  )}
                                  {completeUserProfile.yearsExperience && (
                                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                      <Calendar className="w-4 h-4" />
                                      <span>{completeUserProfile.yearsExperience} years experience</span>
                                    </div>
                                  )}
                                  {completeUserProfile.salaryExpectation && (
                                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                      <DollarSign className="w-4 h-4" />
                                      <span>{completeUserProfile.salaryExpectation}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Interview Scores */}
                          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                              <Brain className="w-5 h-5 text-blue-600" />
                              Interview Assessment Scores
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700/50">
                                <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
                                  {completeUserProfile.technicalScore || 0}
                                </div>
                                <div className="text-sm font-medium text-green-900 dark:text-green-100">Technical</div>
                              </div>
                              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700/50">
                                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                                  {completeUserProfile.personalScore || 0}
                                </div>
                                <div className="text-sm font-medium text-blue-900 dark:text-blue-100">Personal</div>
                              </div>
                              <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700/50">
                                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                                  {completeUserProfile.professionalScore || 0}
                                </div>
                                <div className="text-sm font-medium text-purple-900 dark:text-purple-100">Professional</div>
                              </div>
                            </div>
                          </div>

                          {/* Detailed Analyses */}
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {completeUserProfile.technicalAnalysis && (
                              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-5 border border-green-200 dark:border-green-700/50">
                                <h4 className="font-semibold text-green-900 dark:text-green-100 mb-3">Technical Analysis</h4>
                                <p className="text-green-700 dark:text-green-300 text-sm leading-relaxed">
                                  {completeUserProfile.technicalAnalysis}
                                </p>
                              </div>
                            )}
                            
                            {completeUserProfile.personalAnalysis && (
                              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-5 border border-blue-200 dark:border-blue-700/50">
                                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">Personal Analysis</h4>
                                <p className="text-blue-700 dark:text-blue-300 text-sm leading-relaxed">
                                  {completeUserProfile.personalAnalysis}
                                </p>
                              </div>
                            )}
                            
                            {completeUserProfile.professionalAnalysis && (
                              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-5 border border-purple-200 dark:border-purple-700/50">
                                <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-3">Professional Analysis</h4>
                                <p className="text-purple-700 dark:text-purple-300 text-sm leading-relaxed">
                                  {completeUserProfile.professionalAnalysis}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Additional Information */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Personal Information</h4>
                              <div className="space-y-3">
                                {completeUserProfile.education && (
                                  <div>
                                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Education</label>
                                    <p className="text-gray-900 dark:text-white">{completeUserProfile.education}</p>
                                  </div>
                                )}
                                {completeUserProfile.certifications && (
                                  <div>
                                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Certifications</label>
                                    <p className="text-gray-900 dark:text-white">{completeUserProfile.certifications}</p>
                                  </div>
                                )}
                                {completeUserProfile.languages && (
                                  <div>
                                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Languages</label>
                                    <p className="text-gray-900 dark:text-white">{completeUserProfile.languages}</p>
                                  </div>
                                )}
                                {completeUserProfile.workPreference && (
                                  <div>
                                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Work Preference</label>
                                    <p className="text-gray-900 dark:text-white">{completeUserProfile.workPreference}</p>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Professional Links</h4>
                              <div className="space-y-3">
                                {completeUserProfile.portfolioLink && (
                                  <div>
                                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Portfolio</label>
                                    <a href={completeUserProfile.portfolioLink} target="_blank" rel="noopener noreferrer" className="block text-blue-600 dark:text-blue-400 hover:underline">
                                      {completeUserProfile.portfolioLink}
                                    </a>
                                  </div>
                                )}
                                {completeUserProfile.linkedinProfile && (
                                  <div>
                                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">LinkedIn</label>
                                    <a href={completeUserProfile.linkedinProfile} target="_blank" rel="noopener noreferrer" className="block text-blue-600 dark:text-blue-400 hover:underline">
                                      {completeUserProfile.linkedinProfile}
                                    </a>
                                  </div>
                                )}
                                {completeUserProfile.githubProfile && (
                                  <div>
                                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">GitHub</label>
                                    <a href={completeUserProfile.githubProfile} target="_blank" rel="noopener noreferrer" className="block text-blue-600 dark:text-blue-400 hover:underline">
                                      {completeUserProfile.githubProfile}
                                    </a>
                                  </div>
                                )}
                                {completeUserProfile.resume && (
                                  <div>
                                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Resume</label>
                                    <a href={completeUserProfile.resume} target="_blank" rel="noopener noreferrer" className="block text-blue-600 dark:text-blue-400 hover:underline">
                                      View Resume
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Complete Professional Profile */}
                          {completeUserProfile.userProfile && (
                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
                              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Complete Professional Profile</h4>
                              <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-gray-900 dark:prose-headings:text-white prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-strong:text-gray-900 dark:prose-strong:text-white prose-ul:text-gray-700 dark:prose-ul:text-gray-300">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {completeUserProfile.userProfile}
                                </ReactMarkdown>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-96">
                          <div className="text-center">
                            <AlertTriangle className="w-16 h-16 mx-auto text-red-400 mb-4" />
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                              Profile Not Found
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400">
                              The applicant has not completed their full profile yet. Please ask them to finish their AI interview.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}