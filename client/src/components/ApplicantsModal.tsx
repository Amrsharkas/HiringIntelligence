import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, User, Mail, Phone, FileText, Calendar, CheckCircle, XCircle, Clock, Eye, MessageCircle, Video, Brain, Star, TrendingUp, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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

export function ApplicantsModal({ isOpen, onClose, jobId }: ApplicantsModalProps) {
  const [selectedApplicant, setSelectedApplicant] = useState<ApplicantData | null>(null);
  const [showInterviewScheduler, setShowInterviewScheduler] = useState(false);
  const [showProfileAnalysis, setShowProfileAnalysis] = useState(false);
  const [profileAnalysis, setProfileAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [interviewData, setInterviewData] = useState({
    scheduledDate: '',
    scheduledTime: '',
    interviewType: 'video',
    meetingLink: '',
    notes: ''
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: applicants = [], isLoading, refetch } = useQuery({
    queryKey: jobId ? ['/api/real-applicants', jobId] : ['/api/real-applicants'],
    enabled: isOpen,
    refetchInterval: 60000, // Refetch every minute
  });

  const acceptApplicantMutation = useMutation({
    mutationFn: async (applicant: ApplicantData) => {
      const response = await apiRequest("POST", `/api/applicants/${applicant.id}/accept`, {
        jobId: applicant.jobId
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Applicant accepted successfully!",
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
        description: "Failed to accept applicant. Please try again.",
        variant: "destructive",
      });
    },
  });

  const declineApplicantMutation = useMutation({
    mutationFn: async (applicant: ApplicantData) => {
      const response = await apiRequest("POST", `/api/applicants/${applicant.id}/decline`, {
        jobId: applicant.jobId
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Applicant declined successfully!",
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
        description: "Failed to decline applicant. Please try again.",
        variant: "destructive",
      });
    },
  });

  const scheduleInterviewMutation = useMutation({
    mutationFn: async (data: { applicant: ApplicantData; scheduledDate: string; scheduledTime: string; interviewType: string; meetingLink?: string; notes?: string }) => {
      const response = await apiRequest("POST", `/api/applicants/${data.applicant.id}/schedule-interview`, {
        jobId: data.applicant.jobId,
        scheduledDate: data.scheduledDate,
        scheduledTime: data.scheduledTime,
        interviewType: data.interviewType,
        meetingLink: data.meetingLink,
        notes: data.notes
      });
      return response.json();
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
    acceptApplicantMutation.mutate(applicant);
  };

  const handleDeclineApplicant = (applicant: ApplicantData) => {
    declineApplicantMutation.mutate(applicant);
  };

  const handleScheduleInterview = (applicant: ApplicantData) => {
    setSelectedApplicant(applicant);
    setShowInterviewScheduler(true);
  };

  const handleViewProfile = async (applicant: ApplicantData) => {
    setSelectedApplicant(applicant);
    setShowProfileAnalysis(true);
    setIsAnalyzing(true);
    
    try {
      const response = await apiRequest("POST", "/api/ai/analyze-applicant-profile", {
        applicantData: {
          name: applicant.name,
          email: applicant.email,
          experience: applicant.experience,
          skills: applicant.skills,
          resume: applicant.resume,
          coverLetter: applicant.coverLetter,
          location: applicant.location,
          salaryExpectation: applicant.salaryExpectation,
        },
        jobTitle: applicant.jobTitle,
        jobDescription: applicant.jobDescription,
        requiredSkills: applicant.skills,
      });
      const analysis = await response.json();
      setProfileAnalysis(analysis);
    } catch (error) {
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
        description: "Failed to analyze profile. Please try again.",
        variant: "destructive",
      });
      setProfileAnalysis({
        profileScore: 0,
        analysis: "Unable to analyze profile at this time",
        strengths: [],
        improvements: []
      });
    } finally {
      setIsAnalyzing(false);
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {jobId ? 'Job Applicants' : 'All Applicants'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : applicants.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <User className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No applicants found</p>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {applicants.map((applicant: ApplicantData) => (
                  <motion.div
                    key={applicant.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600"
                  >
                    {/* Applicant Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">{applicant.name}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{applicant.jobTitle}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        {applicant.matchScore && (
                          <div className="flex items-center space-x-1">
                            <Brain className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span className="font-bold text-blue-600 dark:text-blue-400">
                              {applicant.matchScore}%
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
                      <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-700/50">
                        <div className="flex items-start gap-2">
                          <Brain className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-1">AI Analysis</p>
                            <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">{applicant.matchSummary}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Applicant Details */}
                    <div className="space-y-2 mb-4">
                      {applicant.email && (
                        <div className="flex items-center space-x-2 text-sm">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600 dark:text-gray-300">{applicant.email}</span>
                        </div>
                      )}
                      {applicant.phone && (
                        <div className="flex items-center space-x-2 text-sm">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600 dark:text-gray-300">{applicant.phone}</span>
                        </div>
                      )}
                      {applicant.location && (
                        <div className="flex items-center space-x-2 text-sm">
                          <span className="text-gray-600 dark:text-gray-300">{applicant.location}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-2 text-sm">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-300">
                          Applied: {new Date(applicant.applicationDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Skills and Experience */}
                    {applicant.skills && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Skills:</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{applicant.skills}</p>
                      </div>
                    )}
                    
                    {applicant.experience && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Experience:</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{applicant.experience}</p>
                      </div>
                    )}

                    {/* Resume Link */}
                    {applicant.resume && (
                      <div className="mb-4">
                        <a
                          href={applicant.resume}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          <FileText className="w-4 h-4" />
                          <span>View Resume</span>
                        </a>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col space-y-2">
                      <button
                        onClick={() => handleViewProfile(applicant)}
                        className="w-full bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 flex items-center justify-center space-x-2"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View Profile</span>
                      </button>
                      
                      <div className="flex space-x-2">
                        {applicant.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleAcceptApplicant(applicant)}
                              disabled={acceptApplicantMutation.isPending}
                              className="flex-1 bg-green-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {acceptApplicantMutation.isPending ? 'Accepting...' : 'Accept'}
                            </button>
                            <button
                              onClick={() => handleDeclineApplicant(applicant)}
                              disabled={declineApplicantMutation.isPending}
                              className="flex-1 bg-red-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {declineApplicantMutation.isPending ? 'Declining...' : 'Decline'}
                            </button>
                          </>
                        )}
                        {applicant.status === 'accepted' && (
                          <button
                            onClick={() => handleScheduleInterview(applicant)}
                            className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
                          >
                            Schedule Interview
                          </button>
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
                className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full mx-4 p-6"
              >
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                  Schedule Interview with {selectedApplicant.name}
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={interviewData.scheduledDate}
                      onChange={(e) => setInterviewData({...interviewData, scheduledDate: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Time
                    </label>
                    <input
                      type="time"
                      value={interviewData.scheduledTime}
                      onChange={(e) => setInterviewData({...interviewData, scheduledTime: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Interview Type
                    </label>
                    <select
                      value={interviewData.interviewType}
                      onChange={(e) => setInterviewData({...interviewData, interviewType: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="video">Video Call</option>
                      <option value="phone">Phone Call</option>
                      <option value="in-person">In-Person</option>
                    </select>
                  </div>
                  
                  {interviewData.interviewType === 'video' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Meeting Link
                      </label>
                      <input
                        type="url"
                        value={interviewData.meetingLink}
                        onChange={(e) => setInterviewData({...interviewData, meetingLink: e.target.value})}
                        placeholder="https://zoom.us/j/..."
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={interviewData.notes}
                      onChange={(e) => setInterviewData({...interviewData, notes: e.target.value})}
                      rows={3}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="Additional notes for the interview..."
                    />
                  </div>
                </div>
                
                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={() => setShowInterviewScheduler(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitInterview}
                    disabled={scheduleInterviewMutation.isPending || !interviewData.scheduledDate || !interviewData.scheduledTime}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {scheduleInterviewMutation.isPending ? 'Scheduling...' : 'Schedule Interview'}
                  </button>
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
                      <p className="text-gray-500 dark:text-gray-400">{selectedApplicant.jobTitle}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowProfileAnalysis(false)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {isAnalyzing ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <Brain className="w-16 h-16 mx-auto text-blue-500 animate-pulse mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                          AI Analyzing Profile
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400">
                          Our AI is analyzing the candidate's profile for this position...
                        </p>
                      </div>
                    </div>
                  ) : profileAnalysis ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Left Column - Profile Details */}
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Profile Information
                          </h3>
                          <div className="space-y-4">
                            <div className="flex items-center space-x-3">
                              <Mail className="w-5 h-5 text-gray-400" />
                              <span className="text-gray-600 dark:text-gray-300">{selectedApplicant.email}</span>
                            </div>
                            
                            {selectedApplicant.location && (
                              <div className="flex items-center space-x-3">
                                <span className="text-gray-600 dark:text-gray-300">{selectedApplicant.location}</span>
                              </div>
                            )}

                            {selectedApplicant.salaryExpectation && (
                              <div>
                                <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-1">Salary Expectation</h4>
                                <p className="text-gray-600 dark:text-gray-400">{selectedApplicant.salaryExpectation}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {selectedApplicant.skills && (
                          <div>
                            <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3">Skills</h4>
                            <div className="flex flex-wrap gap-2">
                              {selectedApplicant.skills.split(/[,;\n]/).map((skill, index) => {
                                const trimmedSkill = skill.trim();
                                return trimmedSkill ? (
                                  <span
                                    key={index}
                                    className="px-2 py-1 bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-md text-sm"
                                  >
                                    {trimmedSkill}
                                  </span>
                                ) : null;
                              })}
                            </div>
                          </div>
                        )}

                        {selectedApplicant.experience && (
                          <div>
                            <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Experience</h4>
                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                              {selectedApplicant.experience}
                            </p>
                          </div>
                        )}

                        {selectedApplicant.coverLetter && (
                          <div>
                            <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Cover Letter</h4>
                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                              {selectedApplicant.coverLetter}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Right Column - AI Analysis */}
                      <div className="space-y-6">
                        {/* AI Score */}
                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-6">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                              <Brain className="w-5 h-5 text-blue-600" />
                              <span>AI Profile Score</span>
                            </h3>
                            <div className="flex items-center space-x-2">
                              <Star className="w-5 h-5 text-yellow-500" />
                              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                                {profileAnalysis.profileScore}/100
                              </span>
                            </div>
                          </div>
                          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                            {profileAnalysis.analysis}
                          </p>
                        </div>

                        {/* Strengths */}
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center space-x-2">
                            <TrendingUp className="w-5 h-5 text-green-600" />
                            <span>Key Strengths</span>
                          </h4>
                          <div className="space-y-2">
                            {profileAnalysis.strengths.map((strength, index) => (
                              <div
                                key={index}
                                className="flex items-start space-x-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg"
                              >
                                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                <span className="text-green-700 dark:text-green-300 text-sm">
                                  {strength}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Areas for Improvement */}
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center space-x-2">
                            <AlertTriangle className="w-5 h-5 text-orange-600" />
                            <span>Development Areas</span>
                          </h4>
                          <div className="space-y-2">
                            {profileAnalysis.improvements.map((improvement, index) => (
                              <div
                                key={index}
                                className="flex items-start space-x-2 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg"
                              >
                                <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                                <span className="text-orange-700 dark:text-orange-300 text-sm">
                                  {improvement}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <AlertTriangle className="w-16 h-16 mx-auto text-red-500 mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                          Analysis Failed
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400">
                          Unable to analyze the profile. Please try again.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setShowProfileAnalysis(false)}
                    className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}