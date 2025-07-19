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
    interviewType: 'video',
    meetingLink: '',
    notes: ''
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch job postings
  const { data: jobs = [] } = useQuery({
    queryKey: ['/api/job-postings'],
    enabled: isOpen,
  });

  // Fetch accepted applicants for selected job
  const { data: acceptedApplicants = [] } = useQuery({
    queryKey: ['/api/real-applicants', selectedJob],
    enabled: isOpen && !!selectedJob,
  });

  const createInterviewMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/interviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
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
      interviewType: 'video',
      meetingLink: '',
      notes: ''
    });
  };

  const handleSubmit = () => {
    if (!selectedJob || !selectedApplicant || !interviewData.scheduledDate || !interviewData.scheduledTime) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
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
      candidateId: applicant.id,
      jobId: selectedJob,
      jobTitle: applicant.jobTitle,
      ...interviewData
    });
  };

  const filteredAcceptedApplicants = acceptedApplicants.filter(
    applicant => applicant.status === 'accepted'
  );

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
                onChange={(e) => {
                  setSelectedJob(e.target.value);
                  setSelectedApplicant(''); // Reset applicant selection
                }}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">Choose a job posting...</option>
                {jobs.map((job: any) => (
                  <option key={job.id} value={job.id}>
                    {job.title} - {job.location}
                  </option>
                ))}
              </select>
            </div>

            {/* Applicant Selection */}
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
                  {filteredAcceptedApplicants.map((applicant: any) => (
                    <option key={applicant.id} value={applicant.id}>
                      {applicant.name} - {applicant.email}
                    </option>
                  ))}
                </select>
                {filteredAcceptedApplicants.length === 0 && selectedJob && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    No accepted applicants for this job yet.
                  </p>
                )}
              </div>
            )}

            {/* Interview Details */}
            {selectedApplicant && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              disabled={createInterviewMutation.isPending || !selectedJob || !selectedApplicant || !interviewData.scheduledDate || !interviewData.scheduledTime}
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