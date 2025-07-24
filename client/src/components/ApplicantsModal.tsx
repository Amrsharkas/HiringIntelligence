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
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Job Applicants ({pendingApplicants.length})
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Clock className="w-8 h-8 animate-spin mx-auto mb-2" />
                <p>Loading applicants...</p>
              </div>
            </div>
          ) : pendingApplicants.length === 0 ? (
            <div className="text-center py-12">
              <User className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">No New Applicants</h3>
              <p className="text-muted-foreground">
                When candidates apply to your jobs, they'll appear here for review.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {pendingApplicants.map((applicant) => (
                <Card key={applicant.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${applicant.name}`} />
                          <AvatarFallback>
                            {applicant.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-lg">{applicant.name}</h3>
                          <p className="text-sm text-muted-foreground">{applicant.jobTitle}</p>
                        </div>
                      </div>
                      <Badge className={`${getStatusColor(applicant.status || 'pending')} border-0`}>
                        {applicant.status || 'Pending'}
                      </Badge>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="w-4 h-4" />
                        <span>{applicant.email}</span>
                      </div>
                      {applicant.location && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          <span>{applicant.location}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>Applied {new Date(applicant.appliedDate).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {applicant.experience && (
                      <div className="mb-4">
                        <p className="text-sm font-medium mb-1">Experience</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {applicant.experience}
                        </p>
                      </div>
                    )}

                    {applicant.skills && applicant.skills.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm font-medium mb-2">Skills</p>
                        <div className="flex flex-wrap gap-1">
                          {applicant.skills.slice(0, 3).map((skill, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {applicant.skills.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{applicant.skills.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedApplicant(applicant)}
                        className="flex-1"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View Profile
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleAccept(applicant)}
                        disabled={acceptMutation.isPending}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Accept
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDecline(applicant.id)}
                        disabled={declineMutation.isPending}
                        className="border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Decline
                      </Button>
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