import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, Briefcase, Clock } from "lucide-react";

interface AcceptedApplicant {
  id: string;
  applicantName: string;
  jobTitle: string;
  jobId: string;
  acceptedDate?: string;
  status: string;
}

interface AcceptedApplicantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScheduleInterview?: (applicant: any) => void;
}

export default function AcceptedApplicantsModal({
  isOpen,
  onClose,
  onScheduleInterview,
}: AcceptedApplicantsModalProps) {
  // Fetch all accepted applicants across all jobs
  const { data: acceptedApplicants = [], isLoading, error } = useQuery<AcceptedApplicant[]>({
    queryKey: ["/api/accepted-applicants"],
    enabled: isOpen,
  });

  const handleScheduleInterview = (applicantId: string, jobId: string, applicantName: string, jobTitle: string) => {
    const applicantData = {
      id: applicantId,
      name: applicantName,
      jobTitle: jobTitle,
      jobId: jobId,
      userId: applicantId
    };
    
    if (onScheduleInterview) {
      onScheduleInterview(applicantData);
      onClose(); // Close accepted applicants modal
    } else {
      console.log(`Scheduling interview for ${applicantName} for ${jobTitle} position`);
    }
  };

  if (error) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-green-600" />
              Accepted Applicants
            </DialogTitle>
          </DialogHeader>
          <div className="p-8 text-center">
            <p className="text-slate-600 dark:text-slate-400">
              Failed to load accepted applicants. Please try again.
            </p>
            <Button 
              onClick={onClose} 
              className="mt-4"
              variant="outline"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-green-600" />
            Accepted Applicants
            {acceptedApplicants.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {acceptedApplicants.length}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-3 text-slate-600 dark:text-slate-400">Loading accepted applicants...</span>
            </div>
          ) : acceptedApplicants.length === 0 ? (
            <div className="text-center py-12">
              <User className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">
                No Accepted Applicants
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                You haven't accepted any applicants yet. Once you accept applicants, they'll appear here.
              </p>
              <Button onClick={onClose} variant="outline">
                Close
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {acceptedApplicants.map((applicant) => (
                <Card key={applicant.id} className="border border-slate-200 dark:border-slate-700">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                            {applicant.applicantName}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Briefcase className="w-4 h-4 text-slate-500" />
                            <span className="text-sm text-slate-600 dark:text-slate-400">
                              {applicant.jobTitle}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Badge 
                        variant="secondary" 
                        className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                      >
                        Accepted
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>Job ID: {applicant.jobId}</span>
                        </div>
                        {applicant.acceptedDate && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>Accepted: {new Date(applicant.acceptedDate).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                      <Button
                        onClick={() => handleScheduleInterview(applicant.id, applicant.jobId, applicant.applicantName, applicant.jobTitle)}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        Schedule Interview
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}