import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Users, Briefcase, X, Clock, Link as LinkIcon, FileText } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';

interface CreateInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateInterviewModal({ isOpen, onClose }: CreateInterviewModalProps) {
  const [selectedJob, setSelectedJob] = useState('');
  const [selectedApplicant, setSelectedApplicant] = useState('');
  const [interviewData, setInterviewData] = useState({
    scheduledDate: '',
    scheduledTime: '',
    timeZone: 'UTC',
    interviewType: 'video',
    meetingLink: '',
    notes: ''
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch active jobs first
  const { data: jobs = [] } = useQuery({
    queryKey: ['/api/job-postings'],
    enabled: isOpen,
  });

  // Fetch accepted applicants for the selected job from platojobmatches table
  const { data: acceptedApplicants = [], isLoading: isLoadingApplicants, error: applicantsError } = useQuery({
    queryKey: ['/api/accepted-applicants', selectedJob],
    queryFn: async () => {
      const res = await fetch(`/api/accepted-applicants/${selectedJob}`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: isOpen && !!selectedJob,
    retry: false,
  });

  const createInterviewMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/interviews', data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Interview scheduled successfully!",
      });
      onClose();
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['/api/interviews'] });
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

  const resetForm = () => {
    setSelectedJob('');
    setSelectedApplicant('');
    setInterviewData({
      scheduledDate: '',
      scheduledTime: '',
      timeZone: 'UTC',
      interviewType: 'video',
      meetingLink: '',
      notes: ''
    });
  };

  const handleSubmit = () => {
    if (!selectedJob || !selectedApplicant || !interviewData.scheduledDate || !interviewData.scheduledTime) {
      toast({
        title: "Error",
        description: "Please select a job and applicant, and fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const applicant = acceptedApplicants.find(app => app.id === selectedApplicant);
    if (!applicant) {
      toast({
        title: "Error",
        description: "Selected applicant not found",
        variant: "destructive",
      });
      return;
    }

    createInterviewMutation.mutate({
      candidateName: applicant.name,
      candidateEmail: applicant.email || '',
      candidateId: applicant.userId, // Use userId for tracking
      jobId: applicant.jobId, // Use jobId from applicant data
      jobTitle: applicant.jobTitle,
      ...interviewData
    });
  };

  // All applicants from platojobmatches are already accepted, no additional filtering needed

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <Calendar className="w-6 h-6 text-blue-600" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Create New Interview
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Job Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Briefcase className="w-4 h-4 inline mr-2" />
                Select Job Position *
              </label>
              <select
                value={selectedJob}
                onChange={(e) => setSelectedJob(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">Choose a job position...</option>
                {jobs.map((job: any) => (
                  <option key={job.id} value={job.id}>
                    {job.title} - {job.location}
                  </option>
                ))}
              </select>
            </div>

            {/* Applicant Selection - Only show when job is selected */}
            {selectedJob && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Users className="w-4 h-4 inline mr-2" />
                  Select Accepted Applicant *
                </label>
                <select
                  value={selectedApplicant}
                  onChange={(e) => setSelectedApplicant(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">Choose an accepted applicant...</option>
                  {acceptedApplicants.map((applicant: any) => (
                    <option key={applicant.id} value={applicant.id}>
                      {applicant.name} - {applicant.jobTitle} {applicant.email ? `(${applicant.email})` : ''}
                    </option>
                  ))}
                </select>
                {isLoadingApplicants && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Loading accepted applicants...
                  </p>
                )}
                {applicantsError && (
                  <p className="text-sm text-red-500 dark:text-red-400 mt-1">
                    Error loading applicants: {applicantsError.message}
                  </p>
                )}
                {!isLoadingApplicants && !applicantsError && acceptedApplicants.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    No accepted applicants found for this job position.
                  </p>
                )}
              </div>
            )}

            {/* Interview Details */}
            {selectedApplicant && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Date *
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
                      Time *
                    </label>
                    <input
                      type="time"
                      value={interviewData.scheduledTime}
                      onChange={(e) => setInterviewData({...interviewData, scheduledTime: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Time Zone *
                    </label>
                    <select
                      value={interviewData.timeZone}
                      onChange={(e) => setInterviewData({...interviewData, timeZone: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="UTC">UTC</option>
                      <option value="EST">Eastern (EST/EDT)</option>
                      <option value="CST">Central (CST/CDT)</option>
                      <option value="MST">Mountain (MST/MDT)</option>
                      <option value="PST">Pacific (PST/PDT)</option>
                      <option value="GMT">GMT</option>
                      <option value="CET">Central European (CET)</option>
                      <option value="JST">Japan (JST)</option>
                      <option value="AEST">Australian Eastern (AEST)</option>
                      <option value="IST">India (IST)</option>
                      <option value="CST-China">China (CST)</option>
                      <option value="BST">British Summer (BST)</option>
                      <option value="CEST">Central European Summer (CEST)</option>
                      <option value="MSK">Moscow (MSK)</option>
                      <option value="SGT">Singapore (SGT)</option>
                    </select>
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
                      <LinkIcon className="w-4 h-4 inline mr-2" />
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
                    <FileText className="w-4 h-4 inline mr-2" />
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
              </>
            )}
          </div>

          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={createInterviewMutation.isPending || !selectedApplicant || !interviewData.scheduledDate || !interviewData.scheduledTime}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {createInterviewMutation.isPending && <Clock className="w-4 h-4 animate-spin" />}
              <span>{createInterviewMutation.isPending ? 'Scheduling...' : 'Schedule Interview'}</span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}