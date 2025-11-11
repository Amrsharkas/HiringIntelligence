import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Eye, Trash2, Calendar, User, Briefcase, StickyNote, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
// Temporarily removing DetailedProfileModal import as it needs to be created separately

interface ShortlistedApplicant {
  id: string;
  employerId: string;
  applicantId: string;
  applicantName: string;
  name: string;
  email: string;
  jobTitle: string;
  jobId: string;
  note?: string;
  appliedDate: string;
  dateShortlisted: string;
  createdAt: string;
  updatedAt: string;
  applicantUserId?: string;
  userProfile?: string;
  companyName?: string;
  jobDescription?: string;
  matchScore?: number;
  matchSummary?: string;
  technicalSkillsScore?: number;
  experienceScore?: number;
  culturalFitScore?: number;
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

  // Fetch shortlisted applicants from dedicated shortlisted endpoint
  const { data: shortlistedApplicants = [], isLoading } = useQuery<ShortlistedApplicant[]>({
    queryKey: ["/api/shortlisted-applicants"],
    enabled: isOpen,
    refetchOnWindowFocus: false,
  });

  const acceptApplicantMutation = useMutation({
    mutationFn: async (shortlistId: string) => {
      return await apiRequest("POST", `/api/shortlisted-applicants/${shortlistId}/accept`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shortlisted-applicants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/interviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/interviews/count"] });
      toast({
        description: "Candidate accepted and moved to interviews",
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
        description: "Failed to accept candidate",
        variant: "destructive",
      });
    },
  });

  const denyApplicantMutation = useMutation({
    mutationFn: async (shortlistId: string) => {
      return await apiRequest("POST", `/api/shortlisted-applicants/${shortlistId}/deny`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shortlisted-applicants"] });
      toast({
        description: "Candidate removed from shortlist",
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
      console.log('🔍 SHORTLISTED: Fetching profile for:', applicant.name, 'User ID:', applicant.applicantUserId);

      // Show modal immediately with applicant data
      setSelectedApplicant(applicant);
      setIsProfileModalOpen(true);

      // Fetch profile in background
      let profileResponse;
      if (applicant.applicantUserId) {
        profileResponse = await fetch(`/api/public-profile/${encodeURIComponent(applicant.applicantUserId)}`);
      } else {
        // Fallback to using name if applicantUserId is not available
        profileResponse = await fetch(`/api/public-profile/${encodeURIComponent(applicant.name)}`);
      }

      if (profileResponse.ok) {
        const userProfile = await profileResponse.json();
        console.log('✅ SHORTLISTED: Profile fetched successfully:', userProfile);
        setSelectedApplicant(prev => ({
          ...prev,
          userProfile: userProfile.userProfile,
          profileData: userProfile
        }));
      } else {
        console.error('❌ SHORTLISTED: Failed to fetch profile:', profileResponse.status);
        // Try with name as fallback if we used userId first
        if (applicant.applicantUserId) {
          try {
            const fallbackResponse = await fetch(`/api/public-profile/${encodeURIComponent(applicant.name)}`);
            if (fallbackResponse.ok) {
              const fallbackProfile = await fallbackResponse.json();
              console.log('✅ SHORTLISTED: Fallback profile fetched successfully:', fallbackProfile);
              setSelectedApplicant(prev => ({
                ...prev,
                userProfile: fallbackProfile.userProfile,
                profileData: fallbackProfile
              }));
            } else {
              setSelectedApplicant(prev => ({
                ...prev,
                userProfile: null,
                profileData: null
              }));
            }
          } catch (fallbackError) {
            console.error('❌ SHORTLISTED: Fallback profile fetch failed:', fallbackError);
            setSelectedApplicant(prev => ({
              ...prev,
              userProfile: null,
              profileData: null
            }));
          }
        } else {
          setSelectedApplicant(prev => ({
            ...prev,
            userProfile: null,
            profileData: null
          }));
        }
      }
    } catch (error) {
      console.error('❌ SHORTLISTED: Error fetching profile:', error);
      setSelectedApplicant(applicant);
      setIsProfileModalOpen(true);
    }
  };

  const handleAccept = (applicant: ShortlistedApplicant) => {
    if (window.confirm("Accept this candidate and move them to interviews?")) {
      acceptApplicantMutation.mutate(applicant.id);
    }
  };

  const handleDeny = (applicant: ShortlistedApplicant) => {
    if (window.confirm("Remove this candidate from your shortlist?")) {
      denyApplicantMutation.mutate(applicant.id);
    }
  };

  const handleDecline = (applicantId: string) => {
    if (window.confirm("Remove this candidate from your shortlist?")) {
      denyApplicantMutation.mutate(applicantId);
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
                            {applicant.name || applicant.applicantName || 'Unknown Applicant'}
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
                            className="flex items-center gap-1 text-xs px-3 py-1.5 h-8"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View Profile
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleAccept(applicant)}
                            disabled={acceptApplicantMutation.isPending}
                            className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 h-8"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeny(applicant)}
                            disabled={denyApplicantMutation.isPending}
                            className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/20 text-xs px-3 py-1.5 h-8"
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Deny
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span>Applied {applicant.appliedDate ? new Date(applicant.appliedDate).toLocaleDateString() : 'Recently'}</span>
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
                Profile Details - {selectedApplicant.name || selectedApplicant.applicantName || 'Unknown Applicant'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Header Section */}
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">
                      {selectedApplicant.name || selectedApplicant.applicantName || 'Unknown Applicant'}
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
                
                {selectedApplicant.userProfile && typeof selectedApplicant.userProfile === 'string' ? (
                  <div className="prose prose-slate dark:prose-invert max-w-none text-sm leading-relaxed">
                    <ReactMarkdown
                      components={{
                        h1: ({children}) => <h1 className="text-xl font-bold mt-6 mb-3">{children}</h1>,
                        h2: ({children}) => <h2 className="text-lg font-semibold mt-4 mb-2">{children}</h2>,
                        h3: ({children}) => <h3 className="text-md font-medium mt-3 mb-2">{children}</h3>,
                        p: ({children}) => <p className="mb-4">{children}</p>,
                        ul: ({children}) => <ul className="list-disc list-inside mb-4">{children}</ul>,
                        ol: ({children}) => <ol className="list-decimal list-inside mb-4">{children}</ol>,
                        li: ({children}) => <li className="mb-1">{children}</li>,
                        strong: ({children}) => <strong className="font-semibold">{children}</strong>,
                        em: ({children}) => <em className="italic">{children}</em>,
                        blockquote: ({children}) => <blockquote className="border-l-4 border-gray-300 pl-4 italic my-4">{children}</blockquote>,
                        code: ({inline, children}) =>
                          inline ? (
                            <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm">{children}</code>
                          ) : (
                            <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-x-auto mb-4">
                              <code>{children}</code>
                            </pre>
                          )
                      }}
                    >
                      {selectedApplicant.userProfile}
                    </ReactMarkdown>
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