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

  // Fetch shortlisted applicants from real-applicants endpoint
  const { data: applicants = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/real-applicants"],
    enabled: isOpen,
    refetchOnWindowFocus: false,
  });

  // Filter to show only shortlisted applicants
  const shortlistedApplicants = applicants.filter(app => app.status?.toLowerCase() === 'shortlisted');

  const removeFromShortlistMutation = useMutation({
    mutationFn: async (applicantId: string) => {
      return await apiRequest(`/api/real-applicants/${applicantId}/unshortlist`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/real-applicants"] });
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

  const handleViewProfile = async (applicant: any) => {
    try {
      console.log('🔍 SHORTLISTED: Fetching profile for:', applicant.name);
      
      // Use public profile endpoint
      const response = await fetch(`/api/public-profile/${encodeURIComponent(applicant.name)}`);
      if (response.ok) {
        const userProfile = await response.json();
        console.log('✅ SHORTLISTED: Profile fetched successfully:', userProfile);
        setSelectedApplicant({
          ...applicant,
          userProfile: userProfile.userProfile,
          profileData: userProfile
        });
      } else {
        console.error('❌ SHORTLISTED: Failed to fetch profile:', response.status);
        setSelectedApplicant({
          ...applicant,
          userProfile: null,
          profileData: null
        });
      }
      setIsProfileModalOpen(true);
    } catch (error) {
      console.error('❌ SHORTLISTED: Error fetching profile:', error);
      setSelectedApplicant({
        ...applicant,
        userProfile: null,
        profileData: null
      });
      setIsProfileModalOpen(true);
    }
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
                            {applicant.name}
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
                          <span>Applied {applicant.appliedDate ? new Date(applicant.appliedDate).toLocalDateString() : 'Recently'}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <User className="h-4 w-4" />
                          <span>{applicant.email}</span>
                        </div>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                          Shortlisted
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

      {/* Profile Modal */}
      {selectedApplicant && isProfileModalOpen && (
        <Dialog open={isProfileModalOpen} onOpenChange={() => {
          setIsProfileModalOpen(false);
          setSelectedApplicant(null);
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                Profile Details - {selectedApplicant.name}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Header Section */}
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">
                      {selectedApplicant.name}
                    </h2>
                    <p className="text-lg text-slate-600 dark:text-slate-400 mb-1">
                      {selectedApplicant.jobTitle}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {selectedApplicant.email}
                    </p>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800 border-0">
                    Shortlisted
                  </Badge>
                </div>
              </div>

              {/* Profile Content */}
              <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">
                  Comprehensive Profile
                </h3>
                
                {selectedApplicant.userProfile ? (
                  <div className="prose prose-slate dark:prose-invert max-w-none">
                    <div 
                      className="whitespace-pre-wrap text-sm leading-relaxed"
                      dangerouslySetInnerHTML={{ 
                        __html: selectedApplicant.userProfile
                          .replace(/^# /gm, '<h1 class="text-xl font-bold mt-6 mb-3">')
                          .replace(/^## /gm, '<h2 class="text-lg font-semibold mt-4 mb-2">')
                          .replace(/^### /gm, '<h3 class="text-md font-medium mt-3 mb-2">')
                          .replace(/^\*\*(.*?)\*\*/gm, '<strong>$1</strong>')
                          .replace(/^\* (.*?)$/gm, '<li>$1</li>')
                          .replace(/^• (.*?)$/gm, '<li>$1</li>')
                          .replace(/\n\n/g, '</p><p>')
                          .replace(/^(?!<[h|l])/gm, '<p>')
                          .replace(/$(?![>])/gm, '</p>')
                      }}
                    />
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <User className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                    <p className="text-slate-500 dark:text-slate-400">
                      Profile information is not available for this candidate.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}