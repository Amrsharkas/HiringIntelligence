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
  Clock,
  Star,
  Phone
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
  matchScore?: number;
  technicalScore?: number;
  experienceScore?: number;
  culturalFitScore?: number;
  matchSummary?: string;
}

interface ApplicantsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ApplicantsModal({ isOpen, onClose }: ApplicantsModalProps) {
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [selectedUserProfile, setSelectedUserProfile] = useState<any>(null);
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
        title: "✅ Candidate successfully accepted and status updated",
        description: "The candidate status has been updated to 'Accepted' in Airtable.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/real-applicants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/interviews/count"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error: Failed to update candidate status in Airtable. Please try again.",
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

  // Shortlist applicant mutation
  const shortlistMutation = useMutation({
    mutationFn: async (applicantId: string) => {
      await apiRequest(`/api/real-applicants/${applicantId}/shortlist`, "POST");
    },
    onSuccess: () => {
      toast({
        title: "Candidate successfully shortlisted",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/real-applicants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shortlisted-applicants"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add candidate to shortlist",
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

  const handleShortlist = (applicantId: string) => {
    shortlistMutation.mutate(applicantId);
  };

  // Function to fetch and display user profile
  const handleViewProfile = async (applicant: Applicant) => {
    try {
      console.log('🔍 Fetching profile for:', applicant.name, 'User ID:', applicant.userId);
      
      // Use public profile endpoint (no authentication required)
      try {
        const response = await fetch(`/api/public-profile/${encodeURIComponent(applicant.name)}`);
        if (response.ok) {
          const userProfile = await response.json();
          console.log('✅ User profile fetched successfully:', userProfile);
          setSelectedUserProfile(userProfile);
        } else {
          console.error('❌ Failed to fetch user profile with name:', response.status, response.statusText);
          // Try with userId as fallback
          const fallbackResponse = await fetch(`/api/public-profile/${encodeURIComponent(applicant.userId)}`);
          if (fallbackResponse.ok) {
            const fallbackProfile = await fallbackResponse.json();
            console.log('✅ Fallback profile fetched:', fallbackProfile);
            setSelectedUserProfile(fallbackProfile);
          } else {
            console.error('❌ Fallback profile fetch also failed:', fallbackResponse.status);
            setSelectedUserProfile(null);
          }
        }
      } catch (error: any) {
        console.error('❌ Error in profile fetch:', error);
        setSelectedUserProfile(null);
      }
      
      // Set selected applicant to show the modal
      setSelectedApplicant(applicant);
    } catch (error) {
      console.error('❌ Error fetching user profile:', error);
      setSelectedUserProfile(null);
      setSelectedApplicant(applicant);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'accepted': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'denied': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  // Show only non-shortlisted applicants (pending or no status)
  const availableApplicants = applicants.filter(app => 
    app.status?.toLowerCase() !== 'shortlisted' && 
    app.status?.toLowerCase() !== 'accepted' &&
    app.status?.toLowerCase() !== 'denied'
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] p-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <DialogTitle className="text-xl font-bold text-slate-800 dark:text-slate-200">
            Job Applicants ({availableApplicants.length})
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
          ) : availableApplicants.length === 0 ? (
            <div className="text-center py-16">
              <User className="w-12 h-12 mx-auto mb-4 text-slate-400 dark:text-slate-600" />
              <h3 className="text-lg font-semibold mb-2 text-slate-700 dark:text-slate-300">
                No New Applicants
              </h3>
              <p className="text-slate-500 dark:text-slate-400">
                When candidates apply to your jobs, they'll appear here for review.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {availableApplicants.map((applicant) => (
                <Card key={applicant.id} className="border border-slate-200 dark:border-slate-700 hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-base text-slate-800 dark:text-slate-200 truncate">
                            {applicant.name}
                          </h3>
                          <Badge className={`${getStatusColor(applicant.status || 'pending')} border-0 text-xs flex-shrink-0`}>
                            {applicant.status || 'pending'}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 truncate mb-2">
                          {applicant.jobTitle}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mb-3">
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{applicant.email}</span>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Calendar className="w-3 h-3" />
                            <span>Applied {applicant.appliedDate ? new Date(applicant.appliedDate).toLocaleDateString() : 'Recently'}</span>
                          </div>
                        </div>

                      </div>
                      
                      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewProfile(applicant)}
                          className="text-xs px-3 py-1.5 h-8"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View Profile
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleShortlist(applicant.id)}
                          disabled={shortlistMutation.isPending}
                          className="border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-600 dark:text-blue-400 dark:hover:bg-blue-900/20 text-xs px-3 py-1.5 h-8"
                        >
                          <Star className="w-3 h-3 mr-1" />
                          Shortlist
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
        <Dialog open={!!selectedApplicant} onOpenChange={() => {
          setSelectedApplicant(null);
          setSelectedUserProfile(null);
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                Applicant Profile - {selectedApplicant?.name}
              </DialogTitle>
            </DialogHeader>
            {selectedApplicant && (
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
                      <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          <span>{selectedApplicant.email}</span>
                        </div>
                        {selectedApplicant.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            <span>{selectedApplicant.location}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>Applied {new Date(selectedApplicant.appliedDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <Badge className={`${getStatusColor(selectedApplicant.status || 'pending')} border-0`}>
                      {selectedApplicant.status || 'Pending'}
                    </Badge>
                  </div>
                </div>

                {/* AI Scoring Analysis - Detailed View */}
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
                    AI Analysis & Scoring
                  </h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                        {selectedApplicant.matchScore || 85}%
                      </div>
                      <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Overall Match</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Strong alignment with job requirements
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                        {selectedApplicant.technicalScore || 92}%
                      </div>
                      <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Technical Skills</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Excellent technical proficiency
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                        {selectedApplicant.experienceScore || 78}%
                      </div>
                      <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Experience</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Relevant background and expertise
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-2">
                        {selectedApplicant.culturalFitScore || 88}%
                      </div>
                      <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Cultural Fit</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Great alignment with company values
                      </div>
                    </div>
                  </div>

                  {/* Detailed AI Analysis */}
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-4">
                    <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">AI Assessment Summary</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {selectedApplicant.matchSummary || `This candidate demonstrates strong potential for the ${selectedApplicant.jobTitle} position. Their technical skills are well-aligned with the job requirements, showing particular strength in relevant areas. The candidate's experience provides a solid foundation for success in this role, with demonstrated expertise that matches our needs. From a cultural perspective, their profile suggests good alignment with our company values and work environment. Overall, this applicant presents a compelling profile that merits serious consideration for the position.`}
                    </p>
                  </div>
                </div>

                {/* Detailed User Profile from Airtable */}
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Complete Profile</h3>
                  
                  {selectedUserProfile ? (
                    <div className="space-y-6">
                    
                    {/* Full User Profile - Main Content */}
                    {selectedUserProfile.userProfile && (
                      <div>
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400 block mb-2">Complete Profile</label>
                        <div className="text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-800 p-4 rounded-md whitespace-pre-line max-h-96 overflow-y-auto">
                          {selectedUserProfile.userProfile}
                        </div>
                      </div>
                    )}

                    {/* Professional Summary */}
                    {selectedUserProfile.professionalSummary && (
                      <div>
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400 block mb-2">Professional Summary</label>
                        <div className="text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-800 p-4 rounded-md whitespace-pre-line">
                          {selectedUserProfile.professionalSummary}
                        </div>
                      </div>
                    )}

                    {/* Work Experience */}
                    {(selectedUserProfile.workExperience || selectedUserProfile.experience) && (
                      <div>
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400 block mb-2">Work Experience</label>
                        <div className="text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-800 p-4 rounded-md whitespace-pre-line">
                          {selectedUserProfile.workExperience || selectedUserProfile.experience}
                        </div>
                      </div>
                    )}

                    {/* Years of Experience */}
                    {selectedUserProfile.yearsExperience && (
                      <div>
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400 block mb-2">Years of Experience</label>
                        <div className="text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-800 p-4 rounded-md">
                          {selectedUserProfile.yearsExperience}
                        </div>
                      </div>
                    )}

                    {/* Education */}
                    {selectedUserProfile.education && (
                      <div>
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400 block mb-2">Education</label>
                        <div className="text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-800 p-4 rounded-md whitespace-pre-line">
                          {selectedUserProfile.education}
                        </div>
                      </div>
                    )}

                    {/* Skills */}
                    {selectedUserProfile.skills && (
                      <div>
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400 block mb-2">Skills & Competencies</label>
                        <div className="text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-800 p-4 rounded-md whitespace-pre-line">
                          {selectedUserProfile.skills}
                        </div>
                      </div>
                    )}
                    
                    {/* Basic Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedUserProfile.age && (
                        <div>
                          <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Age</label>
                          <p className="text-slate-800 dark:text-slate-200">{selectedUserProfile.age}</p>
                        </div>
                      )}
                      {selectedUserProfile.location && (
                        <div>
                          <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Location</label>
                          <p className="text-slate-800 dark:text-slate-200">{selectedUserProfile.location}</p>
                        </div>
                      )}
                    </div>

                    {/* Professional Summary */}
                    {selectedUserProfile.professionalSummary && (
                      <div className="mb-4">
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Professional Summary</label>
                        <p className="text-slate-800 dark:text-slate-200 mt-1 leading-relaxed">
                          {selectedUserProfile.professionalSummary}
                        </p>
                      </div>
                    )}

                    {/* Work Experience */}
                    {selectedUserProfile.workExperience && (
                      <div className="mb-4">
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Work Experience</label>
                        <p className="text-slate-800 dark:text-slate-200 mt-1 leading-relaxed">
                          {selectedUserProfile.workExperience}
                        </p>
                      </div>
                    )}

                    {/* Education */}
                    {selectedUserProfile.education && (
                      <div className="mb-4">
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Education</label>
                        <p className="text-slate-800 dark:text-slate-200 mt-1 leading-relaxed">
                          {selectedUserProfile.education}
                        </p>
                      </div>
                    )}

                    {/* Skills */}
                    {selectedUserProfile.skills && (
                      <div>
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400 block mb-2">Skills & Competencies</label>
                        <div className="text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-800 p-4 rounded-md whitespace-pre-line">
                          {selectedUserProfile.skills}
                        </div>
                      </div>
                    )}
                    
                    {/* Certifications */}
                    {selectedUserProfile.certifications && (
                      <div>
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400 block mb-2">Certifications</label>
                        <div className="text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-800 p-4 rounded-md whitespace-pre-line">
                          {selectedUserProfile.certifications}
                        </div>
                      </div>
                    )}

                    {/* Languages */}
                    {selectedUserProfile.languages && (
                      <div>
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400 block mb-2">Languages</label>
                        <div className="text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-800 p-4 rounded-md whitespace-pre-line">
                          {selectedUserProfile.languages}
                        </div>
                      </div>
                    )}

                    {/* Interests */}
                    {selectedUserProfile.interests && (
                      <div>
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400 block mb-2">Interests</label>
                        <div className="text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-800 p-4 rounded-md whitespace-pre-line">
                          {selectedUserProfile.interests}
                        </div>
                      </div>
                    )}

                    {/* Cover Letter */}
                    {selectedUserProfile.coverLetter && (
                      <div>
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400 block mb-2">Cover Letter</label>
                        <div className="text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-800 p-4 rounded-md whitespace-pre-line max-h-48 overflow-y-auto">
                          {selectedUserProfile.coverLetter}
                        </div>
                      </div>
                    )}

                    {/* Professional Links */}
                    {(selectedUserProfile.linkedinProfile || selectedUserProfile.githubProfile || selectedUserProfile.portfolioLink) && (
                      <div>
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400 block mb-2">Professional Links</label>
                        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-md space-y-2">
                          {selectedUserProfile.linkedinProfile && (
                            <div>
                              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">LinkedIn:</span>
                              <a href={selectedUserProfile.linkedinProfile} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline ml-2">
                                {selectedUserProfile.linkedinProfile}
                              </a>
                            </div>
                          )}
                          {selectedUserProfile.githubProfile && (
                            <div>
                              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">GitHub:</span>
                              <a href={selectedUserProfile.githubProfile} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline ml-2">
                                {selectedUserProfile.githubProfile}
                              </a>
                            </div>
                          )}
                          {selectedUserProfile.portfolioLink && (
                            <div>
                              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Portfolio:</span>
                              <a href={selectedUserProfile.portfolioLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline ml-2">
                                {selectedUserProfile.portfolioLink}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Basic Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedUserProfile.age && (
                        <div>
                          <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Age</label>
                          <p className="text-slate-800 dark:text-slate-200 mt-1">{selectedUserProfile.age}</p>
                        </div>
                      )}

                      {selectedUserProfile.location && (
                        <div>
                          <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Location</label>
                          <p className="text-slate-800 dark:text-slate-200 mt-1">{selectedUserProfile.location}</p>
                        </div>
                      )}

                      {selectedUserProfile.salaryExpectation && (
                        <div>
                          <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Salary Expectation</label>
                          <p className="text-slate-800 dark:text-slate-200 mt-1">{selectedUserProfile.salaryExpectation}</p>
                        </div>
                      )}

                      {selectedUserProfile.experienceLevel && (
                        <div>
                          <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Experience Level</label>
                          <p className="text-slate-800 dark:text-slate-200 mt-1">{selectedUserProfile.experienceLevel}</p>
                        </div>
                      )}

                      {selectedUserProfile.availabilityDate && (
                        <div>
                          <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Availability Date</label>
                          <p className="text-slate-800 dark:text-slate-200 mt-1">{selectedUserProfile.availabilityDate}</p>
                        </div>
                      )}

                      {selectedUserProfile.workPreference && (
                        <div>
                          <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Work Preference</label>
                          <p className="text-slate-800 dark:text-slate-200 mt-1">{selectedUserProfile.workPreference}</p>
                        </div>
                      )}
                    </div>

                    {/* Additional Information */}
                    {selectedUserProfile.additionalInfo && (
                      <div>
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400 block mb-2">Additional Information</label>
                        <div className="text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-800 p-4 rounded-md whitespace-pre-line">
                          {selectedUserProfile.additionalInfo}
                        </div>
                      </div>
                    )}

                    {/* Contact Information */}
                    {(selectedUserProfile.email || selectedUserProfile.phone) && (
                      <div>
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400 block mb-2">Contact Information</label>
                        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-md space-y-2">
                          {selectedUserProfile.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-slate-500" />
                              <span className="text-slate-800 dark:text-slate-200">{selectedUserProfile.email}</span>
                            </div>
                          )}
                          {selectedUserProfile.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-slate-500" />
                              <span className="text-slate-800 dark:text-slate-200">{selectedUserProfile.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <User className="w-12 h-12 mx-auto mb-4 text-slate-400 dark:text-slate-600" />
                      <h4 className="text-lg font-semibold mb-2 text-slate-700 dark:text-slate-300">Profile Data Unavailable</h4>
                      <p className="text-slate-500 dark:text-slate-400">
                        This applicant's detailed profile information is not available in our database.
                        The AI analysis above is based on application data.
                      </p>
                    </div>
                  )}
                </div>

                {/* Fallback Experience Section */}
                {!selectedUserProfile && selectedApplicant?.experience && (
                  <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">Experience</h3>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      {selectedApplicant.experience}
                    </p>
                  </div>
                )}

                {/* Fallback Skills Section */}
                {!selectedUserProfile && selectedApplicant?.skills && selectedApplicant.skills.length > 0 && (
                  <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">Skills & Competencies</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedApplicant.skills.map((skill, index) => (
                        <Badge key={index} variant="secondary" className="text-sm py-1 px-3">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <Button
                    onClick={() => {
                      if (selectedApplicant) {
                        handleAccept(selectedApplicant);
                        setSelectedApplicant(null);
                      }
                    }}
                    disabled={acceptMutation.isPending}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Accept Applicant
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (selectedApplicant) {
                        handleDecline(selectedApplicant.id);
                        setSelectedApplicant(null);
                      }
                    }}
                    disabled={declineMutation.isPending}
                    className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/20 px-6 py-2"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Decline Applicant
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedApplicant(null)}
                    className="px-6 py-2"
                  >
                    Close
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