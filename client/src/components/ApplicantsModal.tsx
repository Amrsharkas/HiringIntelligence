import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  User, 
  Mail, 
  MapPin, 
  Calendar,
  CheckCircle,
  XCircle,
  Eye,
  Clock
} from "lucide-react";

interface Applicant {
  id: string;
  name: string;
  email: string;
  location: string;
  appliedDate: string;
  status: string;
  jobId: string;
  jobTitle: string;
  experience: string;
  skills: string[];
  userId: string;
}

interface ApplicantsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ApplicantsModal({ isOpen, onClose }: ApplicantsModalProps) {
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all applicants for this organization
  const { data: applicants = [], isLoading } = useQuery<Applicant[]>({
    queryKey: ["/api/real-applicants"],
    enabled: isOpen,
  });

  // Accept applicant mutation
  const acceptMutation = useMutation({
    mutationFn: async (applicant: Applicant) => {
      await apiRequest(`/api/real-applicants/${applicant.id}/accept`, "POST", {
        jobId: applicant.jobId,
        userId: applicant.userId,
        name: applicant.name
      });
    },
    onSuccess: () => {
      toast({
        title: "Applicant Accepted",
        description: "The applicant has been moved to interviews.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/real-applicants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/interviews/count"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to accept applicant",
        variant: "destructive",
      });
    },
  });

  // Decline applicant mutation
  const declineMutation = useMutation({
    mutationFn: async (applicantId: string) => {
      await apiRequest(`/api/real-applicants/${applicantId}/decline`, "POST");
    },
    onSuccess: () => {
      toast({
        title: "Applicant Declined",
        description: "The applicant has been declined.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/real-applicants"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to decline applicant",
        variant: "destructive",
      });
    },
  });

  const handleAccept = (applicant: Applicant) => {
    acceptMutation.mutate(applicant);
  };

  const handleDecline = (applicantId: string) => {
    declineMutation.mutate(applicantId);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'accepted': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'denied': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const pendingApplicants = applicants.filter(app => app.status?.toLowerCase() === 'pending' || !app.status);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] p-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <DialogTitle className="text-xl font-bold text-slate-800 dark:text-slate-200">
            Job Applicants ({pendingApplicants.length})
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <Clock className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-600" />
                <p className="text-slate-600 dark:text-slate-400">Loading applicants...</p>
              </div>
            </div>
          ) : pendingApplicants.length === 0 ? (
            <div className="text-center py-16">
              <User className="w-12 h-12 mx-auto mb-4 text-slate-400 dark:text-slate-600" />
              <h3 className="text-lg font-semibold mb-2 text-slate-700 dark:text-slate-300">No New Applicants</h3>
              <p className="text-slate-500 dark:text-slate-400">
                When candidates apply to your jobs, they'll appear here for review.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingApplicants.map((applicant) => (
                <Card key={applicant.id} className="border border-slate-200 dark:border-slate-700 hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="w-10 h-10 flex-shrink-0">
                          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${applicant.name}`} />
                          <AvatarFallback className="bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300 text-sm">
                            {applicant.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-semibold text-base text-slate-800 dark:text-slate-200 truncate">
                              {applicant.name}
                            </h3>
                            <Badge className={`${getStatusColor(applicant.status || 'pending')} border-0 text-xs flex-shrink-0`}>
                              {applicant.status || 'pending'}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-400 truncate mb-1">
                            {applicant.jobTitle}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                            <div className="flex items-center gap-1">
                              <Mail className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{applicant.email}</span>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Calendar className="w-3 h-3" />
                              <span>Applied {new Date(applicant.appliedDate).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedApplicant(applicant)}
                          className="text-xs px-3 py-1.5 h-8"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleAccept(applicant)}
                          disabled={acceptMutation.isPending}
                          className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 h-8"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Accept
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDecline(applicant.id)}
                          disabled={declineMutation.isPending}
                          className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/20 text-xs px-3 py-1.5 h-8"
                        >
                          <XCircle className="w-3 h-3 mr-1" />
                          Decline
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Detailed Profile Modal */}
        <Dialog open={!!selectedApplicant} onOpenChange={() => setSelectedApplicant(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Applicant Profile</DialogTitle>
            </DialogHeader>
            {selectedApplicant && (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedApplicant.name}`} />
                    <AvatarFallback>
                      {selectedApplicant.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-xl font-bold">{selectedApplicant.name}</h2>
                    <p className="text-muted-foreground">{selectedApplicant.jobTitle}</p>
                    <p className="text-sm text-muted-foreground">{selectedApplicant.email}</p>
                  </div>
                </div>

                {selectedApplicant.experience && (
                  <div>
                    <h3 className="font-semibold mb-2">Experience</h3>
                    <p className="text-sm text-muted-foreground">{selectedApplicant.experience}</p>
                  </div>
                )}

                {selectedApplicant.skills && selectedApplicant.skills.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedApplicant.skills.map((skill, index) => (
                        <Badge key={index} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={() => {
                      handleAccept(selectedApplicant);
                      setSelectedApplicant(null);
                    }}
                    disabled={acceptMutation.isPending}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Accept Applicant
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleDecline(selectedApplicant.id);
                      setSelectedApplicant(null);
                    }}
                    disabled={declineMutation.isPending}
                    className="border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Decline Applicant
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}