import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Eye, Trash2, Calendar, User, Briefcase, StickyNote } from "lucide-react";
import { format } from "date-fns";
// Temporarily removing DetailedProfileModal import as it needs to be created separately

interface ShortlistedApplicant {
  id: string;
  employerId: string;
  applicantId: string;
  applicantName: string;
  jobTitle: string;
  jobId: string;
  note?: string;
  dateShortlisted: string;
  createdAt: string;
  updatedAt: string;
}

interface ShortlistedApplicantsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortlistedApplicantsModal({ 
  isOpen, 
  onClose 
}: ShortlistedApplicantsModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedApplicant, setSelectedApplicant] = useState<any>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const { data: shortlistedApplicants = [], isLoading } = useQuery<ShortlistedApplicant[]>({
    queryKey: ["/api/shortlisted-applicants"],
    enabled: isOpen,
    refetchOnWindowFocus: false,
  });

  const removeFromShortlistMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/shortlisted-applicants/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shortlisted-applicants"] });
      toast({
        title: "Success",
        description: "Applicant removed from shortlist",
      });
    },
    onError: (error: any) => {
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
        description: "Failed to remove applicant from shortlist",
        variant: "destructive",
      });
    },
  });

  const handleViewProfile = (applicant: ShortlistedApplicant) => {
    // Create a profile object compatible with DetailedProfileModal
    const profileData = {
      applicantId: applicant.applicantId,
      name: applicant.applicantName,
      jobTitle: applicant.jobTitle,
      // Add other fields as needed for the profile modal
    };
    setSelectedApplicant(profileData);
    setIsProfileModalOpen(true);
  };

  const handleRemoveFromShortlist = (id: string) => {
    if (window.confirm("Are you sure you want to remove this applicant from your shortlist?")) {
      removeFromShortlistMutation.mutate(id);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Shortlisted Applicants
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : shortlistedApplicants.length === 0 ? (
              <div className="text-center py-12">
                <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No applicants have been shortlisted yet
                </h3>
                <p className="text-gray-500 mb-4">
                  Start building your shortlist by adding promising candidates from the Interviews, Applicants, or Candidates sections.
                </p>
                <Button onClick={onClose} variant="outline">
                  Close
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {shortlistedApplicants.map((applicant) => (
                  <Card key={applicant.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {applicant.applicantName}
                          </CardTitle>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Briefcase className="h-4 w-4" />
                            {applicant.jobTitle}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewProfile(applicant)}
                            className="flex items-center gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            View Profile
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRemoveFromShortlist(applicant.id)}
                            disabled={removeFromShortlistMutation.isPending}
                            className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span>Shortlisted on {format(new Date(applicant.dateShortlisted), "MMM d, yyyy")}</span>
                        </div>
                        
                        {applicant.note && (
                          <div className="flex items-start gap-2 text-sm text-gray-600">
                            <StickyNote className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <span className="italic">"{applicant.note}"</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <Badge variant="secondary" className="text-xs">
                          Job ID: {applicant.jobId}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* DetailedProfileModal temporarily disabled until component is created */}
      {selectedApplicant && isProfileModalOpen && (
        <div className="hidden">
          Profile modal would open here for {selectedApplicant.name}
        </div>
      )}
    </>
  );
}