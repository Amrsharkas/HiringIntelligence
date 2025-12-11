import { useState, useEffect } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  User,
  Mail,
  MapPin,
  Calendar,
  XCircle,
  Eye,
  Clock,
  Star,
  Phone,
  Download,
  Loader2,
  AlertTriangle,
  CheckCircle,
  X,
  Briefcase,
  TrendingUp,
  Shield
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BlobProvider } from '@react-pdf/renderer';
import ApplicantsPDF from './ApplicantsPDF';
import { HLSVideoPlayer } from './HLSVideoPlayer';

interface AssessmentResponse {
  questionId: string;
  questionText: string;
  type: string;
  answer: string | number | boolean | string[];
  fileUrl?: string;
}

interface AssessmentSubmission {
  completedAt: string;
  responses: AssessmentResponse[];
}

interface Applicant {
  id: string;
  name: string;
  email: string;
  location: string;
  appliedDate: string;
  applicationDate: string;
  status: string;
  jobId: string;
  jobTitle: string;
  experience: string;
  skills: string[];
  userId: string;
  applicantUserId?: string;
  applicantProfileId?: number; // Reference to applicant_profiles.id for precise profile lookup
  matchScore?: number;
  technicalScore?: number;
  experienceScore?: number;
  culturalFitScore?: number;
  matchSummary?: string;
  assessmentResponses?: AssessmentSubmission;
}

interface ApplicantsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Helper functions for structured profile rendering (following ResumeProfilesList pattern)
const getScoreColorClass = (score: number) => {
  if (score >= 80) return 'text-green-600 dark:text-green-400';
  if (score >= 60) return 'text-blue-600 dark:text-blue-400';
  if (score >= 40) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
};

const getScoreBgClass = (score: number) => {
  if (score >= 80) return 'bg-green-50 dark:bg-green-900/20';
  if (score >= 60) return 'bg-blue-50 dark:bg-blue-900/20';
  if (score >= 40) return 'bg-yellow-50 dark:bg-yellow-900/20';
  return 'bg-red-50 dark:bg-red-900/20';
};

const getVerdictColor = (decision: string) => {
  switch (decision?.toUpperCase()) {
    case 'INTERVIEW': return 'bg-green-500 text-white border-green-600';
    case 'CONSIDER': return 'bg-blue-500 text-white border-blue-600';
    case 'REVIEW': return 'bg-yellow-500 text-white border-yellow-600';
    case 'NOT PASS': return 'bg-red-500 text-white border-red-600';
    default: return 'bg-gray-500 text-white border-gray-600';
  }
};

const getFitScoreColor = (fit: string) => {
  switch (fit?.toUpperCase()) {
    case 'EXCELLENT': return 'bg-green-500';
    case 'GOOD': return 'bg-blue-500';
    case 'FAIR': return 'bg-yellow-500';
    case 'POOR': return 'bg-orange-500';
    case 'NOT_FIT': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
};

const getSeverityColor = (severity: string) => {
  switch (severity?.toUpperCase()) {
    case 'HIGH': return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300';
    case 'MEDIUM': return 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300';
    case 'LOW': return 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300';
    default: return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900/30 dark:text-gray-300';
  }
};

const getConfidenceColor = (confidence: string) => {
  switch (confidence?.toUpperCase()) {
    case 'HIGH': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
    case 'MEDIUM': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
    case 'LOW': return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300';
    default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300';
  }
};

const getRiskColor = (risk: string) => {
  switch (risk?.toUpperCase()) {
    case 'LOW': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
    case 'MEDIUM': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
    case 'HIGH': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
    case 'CRITICAL': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300';
  }
};

export function ApplicantsModal({ isOpen, onClose }: ApplicantsModalProps) {
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [selectedUserProfile, setSelectedUserProfile] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [statusFilter, setStatusFilter] = useState<'active' | 'denied' | 'all'>('active');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Reset page when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentPage(1);
    }
  }, [isOpen]);

  // Auto-refresh applicants data every 10 seconds when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/real-applicants", currentPage, limit, statusFilter] });
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, [isOpen, queryClient, currentPage, limit, statusFilter]);

  // Refetch when filter changes
  useEffect(() => {
    if (isOpen) {
      queryClient.refetchQueries({ queryKey: ["/api/real-applicants", currentPage, limit, statusFilter] });
    }
  }, [statusFilter, isOpen, queryClient, currentPage, limit]);

  // Fetch paginated applicants for this organization
  const { data: response, isLoading } = useQuery<{
    data: Applicant[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalCount: number;
      limit: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }>({
    queryKey: ["/api/real-applicants", currentPage, limit, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        status: statusFilter,
      });
      const response = await fetch(`/api/real-applicants?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch applicants');
      }
      return response.json();
    },
    enabled: isOpen,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const applicants = response?.data || [];
  const pagination = response?.pagination || {
    currentPage: 1,
    totalPages: 0,
    totalCount: 0,
    limit: 10,
    hasNextPage: false,
    hasPrevPage: false,
  };

  
  // Decline applicant mutation
  const declineMutation = useMutation({
    mutationFn: async (applicantId: string) => {
      await apiRequest("POST", `/api/real-applicants/${applicantId}/decline`);
    },
    onSuccess: () => {
      toast({
        title: "📧 Applicant Declined and Notified",
        description: "The applicant has been declined and will receive a notification email.",
      });
      // Invalidate all related queries immediately to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/real-applicants", currentPage, limit, statusFilter] });
      queryClient.invalidateQueries({ queryKey: ["/api/applicants/count"] });
      // Force refetch immediately to update UI
      queryClient.refetchQueries({ queryKey: ["/api/real-applicants", currentPage, limit, statusFilter] });
    },
    onError: () => {
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
      await apiRequest("POST", `/api/real-applicants/${applicantId}/shortlist`);
    },
    onSuccess: () => {
      toast({
        title: "📋 Candidate Shortlisted and Notified",
        description: "The candidate has been shortlisted and will receive a notification email.",
      });
      // Invalidate all related queries immediately to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/real-applicants", currentPage, limit, statusFilter] });
      queryClient.invalidateQueries({ queryKey: ["/api/shortlisted-applicants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/applicants/count"] });
      // Force refetch immediately for both endpoints
      queryClient.refetchQueries({ queryKey: ["/api/real-applicants", currentPage, limit, statusFilter] });
      queryClient.refetchQueries({ queryKey: ["/api/shortlisted-applicants"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add candidate to shortlist",
        variant: "destructive",
      });
    },
  });

  const handleDecline = (applicantId: string) => {
    declineMutation.mutate(applicantId);
  };

  const handleShortlist = (applicantId: string) => {
    shortlistMutation.mutate(applicantId);
  };

  // Export all applicants as PDF
  const exportAllApplicants = () => {
    const fileName = `all_applicants_export_${new Date().toISOString().split('T')[0]}.pdf`;

    return (
      <BlobProvider document={<ApplicantsPDF applicants={availableApplicants} includeScores={true} />}>
        {({ blob, loading, error }) => {
          if (loading) {
            return (
              <Button variant="outline" disabled>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating PDF...
              </Button>
            );
          }

          if (error) {
            return (
              <Button variant="outline" disabled>
                PDF Generation Error
              </Button>
            );
          }

          const handleDownload = () => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = fileName;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);

              toast({
                title: "PDF Exported",
                description: `All ${availableApplicants.length} applicants have been exported successfully`,
              });
            }
          };

          return (
            <Button variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Export All Applicants ({availableApplicants.length})
            </Button>
          );
        }}
      </BlobProvider>
    );
  };

  // Function to fetch and display user profile - OPTIMIZED FOR SPEED
  const handleViewProfile = async (applicant: Applicant) => {
    try {
      console.log({
        applicant
      });
      
      // Show modal immediately with applicant data
      setSelectedApplicant(applicant);
      
      console.log('🔍 Fetching profile for:', applicant.name, 'User ID:', applicant.userId);
      
      // Fetch profile in background without blocking modal display
      try {
        // Use application ID to get the specific application's profile data
        console.log('🔍 Fetching with applicant.id:', applicant.id);
        const response = await fetch(`/api/application-profile/${encodeURIComponent(applicant.id)}`);
        if (response.ok) {
          const userProfile = await response.json();

          console.log('📋 Full userProfile response:', userProfile);
          console.log('📋 Profile version:', userProfile.profileVersion);
          console.log('📋 Has structuredProfile:', !!userProfile.structuredProfile);
          console.log('📋 structuredProfile keys:', userProfile.structuredProfile ? Object.keys(userProfile.structuredProfile) : 'null');

          setSelectedUserProfile(userProfile);
        } else {
          console.error('❌ Failed to fetch application profile:', response.status, response.statusText);
          // Try fallback to old endpoint with applicantUserId, include profileId if available for precise lookup
          const jobIdParam = applicant.jobId ? `?jobId=${encodeURIComponent(applicant.jobId)}` : '';
          const profileIdParam = applicant.applicantProfileId ? `${jobIdParam ? '&' : '?'}profileId=${applicant.applicantProfileId}` : '';
          const fallbackResponse = await fetch(`/api/public-profile/${encodeURIComponent(applicant.applicantUserId || applicant.userId)}${jobIdParam}${profileIdParam}`);
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
    } catch (error) {
      console.error('❌ Error in handleViewProfile:', error);
      setSelectedUserProfile(null);
      setSelectedApplicant(applicant);
    }
  };

  const formatStatus = (status: string) => {
    // Remove underscores and replace with spaces
    const formatted = status.replace(/_/g, ' ');
    // Capitalize first character
    return formatted.charAt(0).toUpperCase() + formatted.slice(1).toLowerCase();
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'accepted': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'declined': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'denied': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'; // Support both for backwards compatibility
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getStatusReadableName = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'Pending Review';
      case 'accepted': return 'Application Accepted';
      case 'declined': return 'Application Declined';
      case 'denied': return 'Application Declined'; // Support both for backwards compatibility
      case 'interview_completed': return 'Interview Completed';
      default: return 'Unknown Status';
    }
  }

  // Pagination helpers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setCurrentPage(1);
  };

  // Backend now handles filtering, so use all returned applicants
  const availableApplicants = applicants;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] p-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <DialogTitle className="text-xl font-bold text-slate-800 dark:text-slate-200">
              Job Applicants ({pagination.totalCount})
            </DialogTitle>
            {availableApplicants.length > 0 && exportAllApplicants()}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600 dark:text-slate-400">Filter:</span>
            <Select value={statusFilter} onValueChange={(value: 'active' | 'denied' | 'all') => {
              setStatusFilter(value);
              setCurrentPage(1);
            }}>
              <SelectTrigger className="w-40 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active Applicants</SelectItem>
                <SelectItem value="denied">Denied Applicants</SelectItem>
                <SelectItem value="all">All Applicants</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
                            {formatStatus(applicant.status || 'pending')}
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

        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600 dark:text-slate-400">Show per page:</span>
                <Select value={limit.toString()} onValueChange={(value) => handleLimitChange(parseInt(value))}>
                  <SelectTrigger className="w-20 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="text-sm text-slate-600 dark:text-slate-400">
                Showing {((pagination.currentPage - 1) * pagination.limit) + 1} to {Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)} of {pagination.totalCount} applicants
              </div>

              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                      className={!pagination.hasPrevPage ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>

                  {/* Generate page numbers */}
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.currentPage >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = pagination.currentPage - 2 + i;
                    }

                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          onClick={() => handlePageChange(pageNum)}
                          isActive={pagination.currentPage === pageNum}
                          className="cursor-pointer"
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}

                  {pagination.totalPages > 5 && pagination.currentPage < pagination.totalPages - 2 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => handlePageChange(Math.min(pagination.totalPages, currentPage + 1))}
                      className={!pagination.hasNextPage ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        )}

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
                          <span>Applied {new Date(selectedApplicant.applicationDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <Badge className={`${getStatusColor(selectedApplicant.status || 'pending')} border-0`}>
                      {getStatusReadableName(selectedApplicant.status) || 'Pending'}
                    </Badge>
                  </div>
                </div>

                {/* Interview Video Section - At the top for quick access */}
                {selectedUserProfile?.interviewVideoUrl && (
                  <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
                      Interview Recording
                    </h3>
                    <div className="aspect-video bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                      <HLSVideoPlayer
                        src={selectedUserProfile.interviewVideoUrl}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                )}

                {/* AI Scoring Analysis - Detailed View */}
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
                    AI Analysis & Scoring
                  </h3>

                  {/* Check if we have v3 or v4 structured profile data */}
                  {(selectedUserProfile?.profileVersion >= 3 || selectedUserProfile?.structuredProfile?.profile_version === "4.0") && selectedUserProfile?.structuredProfile ? (
                    <>
                      {/* V4 Detection Helper */}
                      {(() => {
                        const isV4 = selectedUserProfile.structuredProfile?.profile_version === "4.0" || selectedUserProfile.profileVersion >= 4;
                        const profile = selectedUserProfile.structuredProfile;

                        // V4 uses different field names - normalize them
                        const execSummary = profile.executive_summary || profile.executiveSummary;
                        const oneLiner = execSummary?.one_sentence || execSummary?.one_liner || 'Candidate Analysis';
                        const fitScore = execSummary?.fit_verdict || execSummary?.fit_score;
                        const keyImpression = execSummary?.key_impression;
                        const standoutPositive = execSummary?.standout_positive;
                        const primaryConcern = execSummary?.primary_concern;
                        const confidenceInVerdict = execSummary?.confidence_in_verdict;

                        return null; // Just for variable declaration
                      })()}

                      {/* Executive Summary Banner - Supports V3 and V4 */}
                      {(selectedUserProfile.structuredProfile?.executive_summary || selectedUserProfile.structuredProfile?.executive_summary) && (
                        <div className="p-4 rounded-lg bg-gradient-to-r from-slate-900 to-slate-800 text-white mb-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <span className="text-lg font-bold">
                                {selectedUserProfile.structuredProfile?.executive_summary?.one_sentence ||
                                 selectedUserProfile.structuredProfile?.executive_summary?.one_liner ||
                                 'Candidate Analysis'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {(selectedUserProfile.structuredProfile?.executive_summary?.fit_verdict ||
                                selectedUserProfile.structuredProfile?.executive_summary?.fit_score) && (
                                <Badge className={`text-xs ${getFitScoreColor(
                                  selectedUserProfile.structuredProfile?.executive_summary?.fit_verdict ||
                                  selectedUserProfile.structuredProfile?.executive_summary?.fit_score
                                )}`}>
                                  {(selectedUserProfile.structuredProfile?.executive_summary?.fit_verdict ||
                                    selectedUserProfile.structuredProfile?.executive_summary?.fit_score)?.replace(/_/g, ' ')} FIT
                                </Badge>
                              )}
                              {/* V4: Confidence in verdict */}
                              {selectedUserProfile.structuredProfile?.executive_summary?.confidence_in_verdict && (
                                <Badge className={`text-xs ${getConfidenceColor(selectedUserProfile.structuredProfile?.executive_summary?.confidence_in_verdict)}`}>
                                  {selectedUserProfile.structuredProfile?.executive_summary?.confidence_in_verdict} Confidence
                                </Badge>
                              )}
                              {(selectedUserProfile.structuredProfile?.executive_summary?.hiring_urgency ||
                                selectedUserProfile.structuredProfile?.executive_summary?.hiring_urgency) && (
                                <Badge className={`text-xs ${
                                  (selectedUserProfile.structuredProfile?.executive_summary?.hiring_urgency ||
                                   selectedUserProfile.structuredProfile?.executive_summary?.hiring_urgency) === 'EXPEDITE' ? 'bg-green-600' :
                                  (selectedUserProfile.structuredProfile?.executive_summary?.hiring_urgency ||
                                   selectedUserProfile.structuredProfile?.executive_summary?.hiring_urgency) === 'STANDARD' ? 'bg-blue-600' :
                                  (selectedUserProfile.structuredProfile?.executive_summary?.hiring_urgency ||
                                   selectedUserProfile.structuredProfile?.executive_summary?.hiring_urgency) === 'LOW_PRIORITY' ? 'bg-gray-600' :
                                  'bg-red-600'
                                }`}>
                                  {(selectedUserProfile.structuredProfile?.executive_summary?.hiring_urgency ||
                                    selectedUserProfile.structuredProfile?.executive_summary?.hiring_urgency)?.replace(/_/g, ' ')}
                                </Badge>
                              )}
                            </div>
                          </div>
                          {/* V4: Key impression */}
                          {selectedUserProfile.structuredProfile?.executive_summary?.key_impression && (
                            <p className="text-sm text-slate-200 mt-2">
                              {selectedUserProfile.structuredProfile?.executive_summary?.key_impression}
                            </p>
                          )}
                          {/* V4: Standout positive and primary concern */}
                          {(selectedUserProfile.structuredProfile?.executive_summary?.standout_positive ||
                            selectedUserProfile.structuredProfile?.executive_summary?.primary_concern) && (
                            <div className="grid grid-cols-2 gap-3 mt-3">
                              {selectedUserProfile.structuredProfile?.executive_summary?.standout_positive && (
                                <div className="p-2 bg-green-900/30 rounded border border-green-700">
                                  <div className="text-xs text-green-400 font-medium">Standout Positive</div>
                                  <div className="text-sm text-green-200">{selectedUserProfile.structuredProfile?.executive_summary?.standout_positive}</div>
                                </div>
                              )}
                              {selectedUserProfile.structuredProfile?.executive_summary?.primary_concern &&
                               selectedUserProfile.structuredProfile?.executive_summary?.primary_concern !== 'None identified' && (
                                <div className="p-2 bg-orange-900/30 rounded border border-orange-700">
                                  <div className="text-xs text-orange-400 font-medium">Primary Concern</div>
                                  <div className="text-sm text-orange-200">{selectedUserProfile.structuredProfile?.executive_summary?.primary_concern}</div>
                                </div>
                              )}
                            </div>
                          )}
                          {(selectedUserProfile.structuredProfile?.executive_summary?.competitive_position ||
                            selectedUserProfile.structuredProfile?.executive_summary?.competitive_position) && (
                            <p className="text-xs text-slate-300 mt-2">
                              {selectedUserProfile.structuredProfile?.executive_summary?.competitive_position ||
                               selectedUserProfile.structuredProfile?.executive_summary?.competitive_position}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Verdict & Recommendation Section */}
                      {selectedUserProfile.structuredProfile?.verdict && (
                        <div className="p-4 rounded-lg border-2 border-gray-300 dark:border-slate-600 bg-gradient-to-r from-gray-50 to-white dark:from-slate-800 dark:to-slate-900 mb-4">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <Badge className={`text-lg px-4 py-2 font-bold ${getVerdictColor(selectedUserProfile.structuredProfile?.verdict?.decision)}`}>
                                {selectedUserProfile.structuredProfile?.verdict?.decision === 'INTERVIEW' ? '✓ INTERVIEW' :
                                 selectedUserProfile.structuredProfile?.verdict?.decision === 'CONSIDER' ? '? CONSIDER' :
                                 selectedUserProfile.structuredProfile?.verdict?.decision === 'REVIEW' ? '⚠ REVIEW' :
                                 '✗ NOT SUITABLE'}
                              </Badge>
                              {selectedUserProfile.structuredProfile?.verdict?.confidence && (
                                <span className={`text-xs font-medium px-2 py-1 rounded ${getConfidenceColor(selectedUserProfile.structuredProfile?.verdict?.confidence)}`}>
                                  {selectedUserProfile.structuredProfile?.verdict?.confidence} Confidence
                                </span>
                              )}
                              {selectedUserProfile.structuredProfile?.verdict?.risk_level && (
                                <span className={`text-xs font-medium px-2 py-1 rounded ${getRiskColor(selectedUserProfile.structuredProfile?.verdict?.risk_level)}`}>
                                  {selectedUserProfile.structuredProfile?.verdict?.risk_level} Risk
                                </span>
                              )}
                            </div>
                          </div>

                          {selectedUserProfile.structuredProfile?.verdict?.summary && (
                            <p className="text-base font-medium text-gray-800 dark:text-slate-200 mb-3">
                              {selectedUserProfile.structuredProfile?.verdict?.summary}
                            </p>
                          )}

                          <div className="grid grid-cols-2 gap-4">
                            {selectedUserProfile.structuredProfile?.verdict?.top_strength && (
                              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                                <div className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1 flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3" /> TOP STRENGTH
                                </div>
                                <div className="text-sm text-green-800 dark:text-green-200">
                                  {selectedUserProfile.structuredProfile?.verdict?.top_strength}
                                </div>
                              </div>
                            )}
                            {selectedUserProfile.structuredProfile?.verdict?.top_concern &&
                             selectedUserProfile.structuredProfile?.verdict?.top_concern !== 'None significant' &&
                             selectedUserProfile.structuredProfile?.verdict?.top_concern !== 'None' ? (
                              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-700">
                                <div className="text-xs font-semibold text-orange-600 dark:text-orange-400 mb-1 flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" /> TOP CONCERN
                                </div>
                                <div className="text-sm text-orange-800 dark:text-orange-200">
                                  {selectedUserProfile.structuredProfile?.verdict?.top_concern}
                                </div>
                              </div>
                            ) : (
                              <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600">
                                <div className="text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3" /> TOP CONCERN
                                </div>
                                <div className="text-sm text-gray-600 dark:text-slate-400 italic">No significant concerns</div>
                              </div>
                            )}
                          </div>

                          {/* Dealbreakers if any */}
                          {selectedUserProfile.structuredProfile?.verdict?.dealbreakers &&
                           selectedUserProfile.structuredProfile?.verdict?.dealbreakers.length > 0 && (
                            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700">
                              <div className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">DEALBREAKERS</div>
                              <ul className="text-sm text-red-800 dark:text-red-200">
                                {selectedUserProfile.structuredProfile?.verdict?.dealbreakers.map((item: string, i: number) => (
                                  <li key={i} className="flex items-start gap-1">
                                    <span className="text-red-500">✗</span> {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* V4: Hiring Guidance Section */}
                      {selectedUserProfile.structuredProfile?.hiring_guidance && (
                        <div className="p-4 rounded-lg border-2 border-indigo-300 dark:border-indigo-600 bg-gradient-to-r from-indigo-50 to-white dark:from-indigo-900/20 dark:to-slate-900 mb-4">
                          <h4 className="font-semibold text-indigo-700 dark:text-indigo-400 mb-3 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" /> Hiring Guidance
                          </h4>
                          <div className="flex items-center gap-3 mb-4">
                            <Badge className={`text-lg px-4 py-2 font-bold ${
                              selectedUserProfile.structuredProfile?.hiring_guidance?.proceed_to_next_round === 'YES' ? 'bg-green-500 text-white' :
                              selectedUserProfile.structuredProfile?.hiring_guidance?.proceed_to_next_round === 'LIKELY' ? 'bg-blue-500 text-white' :
                              selectedUserProfile.structuredProfile?.hiring_guidance?.proceed_to_next_round === 'MAYBE' ? 'bg-yellow-500 text-white' :
                              selectedUserProfile.structuredProfile?.hiring_guidance?.proceed_to_next_round === 'UNLIKELY' ? 'bg-orange-500 text-white' :
                              'bg-red-500 text-white'
                            }`}>
                              {selectedUserProfile.structuredProfile?.hiring_guidance?.proceed_to_next_round === 'YES' ? '✓ PROCEED' :
                               selectedUserProfile.structuredProfile?.hiring_guidance?.proceed_to_next_round === 'LIKELY' ? '↗ LIKELY PROCEED' :
                               selectedUserProfile.structuredProfile?.hiring_guidance?.proceed_to_next_round === 'MAYBE' ? '? MAYBE' :
                               selectedUserProfile.structuredProfile?.hiring_guidance?.proceed_to_next_round === 'UNLIKELY' ? '↘ UNLIKELY' :
                               '✗ DO NOT PROCEED'}
                            </Badge>
                          </div>
                          {selectedUserProfile.structuredProfile?.hiring_guidance?.reasoning && (
                            <p className="text-sm text-slate-700 dark:text-slate-300 mb-4 p-3 bg-white dark:bg-slate-800 rounded border">
                              {selectedUserProfile.structuredProfile?.hiring_guidance?.reasoning}
                            </p>
                          )}
                          {selectedUserProfile.structuredProfile?.hiring_guidance?.suggested_follow_up_questions?.length > 0 && (
                            <div className="mb-4">
                              <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-2">Suggested Follow-up Questions</div>
                              <ul className="space-y-1">
                                {selectedUserProfile.structuredProfile?.hiring_guidance?.suggested_follow_up_questions.map((q: string, i: number) => (
                                  <li key={i} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2">
                                    <span className="text-indigo-500">•</span> {q}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {selectedUserProfile.structuredProfile?.hiring_guidance?.potential_role_fits?.length > 0 && (
                              <div>
                                <div className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">Potential Role Fits</div>
                                <div className="flex flex-wrap gap-1">
                                  {selectedUserProfile.structuredProfile?.hiring_guidance?.potential_role_fits.map((role: string, i: number) => (
                                    <Badge key={i} className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                      {role}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            {selectedUserProfile.structuredProfile?.hiring_guidance?.risk_factors_to_investigate?.length > 0 && (
                              <div>
                                <div className="text-xs font-medium text-orange-600 dark:text-orange-400 mb-1">Risk Factors to Investigate</div>
                                <div className="flex flex-wrap gap-1">
                                  {selectedUserProfile.structuredProfile?.hiring_guidance?.risk_factors_to_investigate.map((risk: string, i: number) => (
                                    <Badge key={i} className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                                      <AlertTriangle className="h-3 w-3 mr-1" /> {risk}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Score Breakdown with Sub-scores - Supports V3 and V4 */}
                      {(selectedUserProfile.structuredProfile?.detailed_breakdown || selectedUserProfile.structuredProfile?.scores) && (
                        <div className="space-y-4 mb-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {/* Overall Match - V4: scores.overall_score.value or scores.overall_score.score */}
                            <div className={`text-center p-4 rounded-lg ${getScoreBgClass(selectedUserProfile.structuredProfile?.scores?.overall_score?.value)}`}>
                              <div className={`text-3xl font-bold mb-1 ${getScoreColorClass(selectedUserProfile.structuredProfile?.scores?.overall_score?.value)}`}>
                                {selectedUserProfile.structuredProfile?.scores?.overall_score?.value}%
                              </div>
                              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Overall Match</div>
                              <Progress value={selectedUserProfile.structuredProfile?.scores?.overall_score?.value} className="h-1.5 mt-2" />
                              {selectedUserProfile.structuredProfile?.scores?.overall_score?.confidence && (
                                <div className={`text-xs mt-1 ${getConfidenceColor(selectedUserProfile.structuredProfile?.scores?.overall_score?.confidence)}`}>
                                  {selectedUserProfile.structuredProfile?.scores?.overall_score?.confidence} confidence
                                </div>
                              )}
                            </div>
                            {/* Technical Skills - V4: scores.technical_competence.score */}
                            <div className={`text-center p-4 rounded-lg ${getScoreBgClass(selectedUserProfile.structuredProfile?.scores?.technical_competence?.score || selectedUserProfile.structuredProfile?.detailed_breakdown?.technical_skills?.score || 0)}`}>
                              <div className={`text-3xl font-bold mb-1 ${getScoreColorClass(selectedUserProfile.structuredProfile?.scores?.technical_competence?.score || selectedUserProfile.structuredProfile?.detailed_breakdown?.technical_skills?.score || 0)}`}>
                                {selectedUserProfile.structuredProfile?.scores?.technical_competence?.score || selectedUserProfile.structuredProfile?.detailed_breakdown?.technical_skills?.score || 0}%
                              </div>
                              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Technical Skills</div>
                              <Progress value={selectedUserProfile.structuredProfile?.scores?.technical_competence?.score || selectedUserProfile.structuredProfile?.detailed_breakdown?.technical_skills?.score || 0} className="h-1.5 mt-2" />
                              {selectedUserProfile.structuredProfile?.scores?.technical_competence?.confidence && (
                                <div className={`text-xs mt-1 ${getConfidenceColor(selectedUserProfile.structuredProfile?.scores?.technical_competence?.confidence)}`}>
                                  {selectedUserProfile.structuredProfile?.scores?.technical_competence?.confidence} confidence
                                </div>
                              )}
                            </div>
                            {/* Experience - V4: scores.experience_quality.score */}
                            <div className={`text-center p-4 rounded-lg ${getScoreBgClass(selectedUserProfile.structuredProfile?.scores?.experience_quality?.score || selectedUserProfile.structuredProfile?.detailed_breakdown?.experience?.score || 0)}`}>
                              <div className={`text-3xl font-bold mb-1 ${getScoreColorClass(selectedUserProfile.structuredProfile?.scores?.experience_quality?.score || selectedUserProfile.structuredProfile?.detailed_breakdown?.experience?.score || 0)}`}>
                                {selectedUserProfile.structuredProfile?.scores?.experience_quality?.score || selectedUserProfile.structuredProfile?.detailed_breakdown?.experience?.score || 0}%
                              </div>
                              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Experience</div>
                              <Progress value={selectedUserProfile.structuredProfile?.scores?.experience_quality?.score || selectedUserProfile.structuredProfile?.detailed_breakdown?.experience?.score || 0} className="h-1.5 mt-2" />
                              {selectedUserProfile.structuredProfile?.scores?.experience_quality?.confidence && (
                                <div className={`text-xs mt-1 ${getConfidenceColor(selectedUserProfile.structuredProfile?.scores?.experience_quality?.confidence)}`}>
                                  {selectedUserProfile.structuredProfile?.scores?.experience_quality?.confidence} confidence
                                </div>
                              )}
                            </div>
                            {/* Cultural Fit - V4: scores.cultural_collaboration_fit.score */}
                            <div className={`text-center p-4 rounded-lg ${getScoreBgClass(selectedUserProfile.structuredProfile?.scores?.cultural_collaboration_fit?.score || selectedUserProfile.structuredProfile?.detailed_breakdown?.cultural_fit?.score || 0)}`}>
                              <div className={`text-3xl font-bold mb-1 ${getScoreColorClass(selectedUserProfile.structuredProfile?.scores?.cultural_collaboration_fit?.score || selectedUserProfile.structuredProfile?.detailed_breakdown?.cultural_fit?.score || 0)}`}>
                                {selectedUserProfile.structuredProfile?.scores?.cultural_collaboration_fit?.score || selectedUserProfile.structuredProfile?.detailed_breakdown?.cultural_fit?.score || 0}%
                              </div>
                              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Cultural Fit</div>
                              <Progress value={selectedUserProfile.structuredProfile?.scores?.cultural_collaboration_fit?.score || selectedUserProfile.structuredProfile?.detailed_breakdown?.cultural_fit?.score || 0} className="h-1.5 mt-2" />
                              {selectedUserProfile.structuredProfile?.scores?.cultural_collaboration_fit?.confidence && (
                                <div className={`text-xs mt-1 ${getConfidenceColor(selectedUserProfile.structuredProfile?.scores?.cultural_collaboration_fit?.confidence)}`}>
                                  {selectedUserProfile.structuredProfile?.scores?.cultural_collaboration_fit?.confidence} confidence
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Additional V4 Scores */}
                          {selectedUserProfile.structuredProfile?.scores && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                              {/* Communication */}
                              {selectedUserProfile.structuredProfile?.scores?.communication_presence && (
                                <div className={`text-center p-4 rounded-lg ${getScoreBgClass(selectedUserProfile.structuredProfile?.scores?.communication_presence?.score || 0)}`}>
                                  <div className={`text-2xl font-bold mb-1 ${getScoreColorClass(selectedUserProfile.structuredProfile?.scores?.communication_presence?.score || 0)}`}>
                                    {selectedUserProfile.structuredProfile?.scores?.communication_presence?.score || 0}%
                                  </div>
                                  <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Communication</div>
                                  <Progress value={selectedUserProfile.structuredProfile?.scores?.communication_presence?.score || 0} className="h-1.5 mt-2" />
                                  {selectedUserProfile.structuredProfile?.scores?.communication_presence?.confidence && (
                                    <div className={`text-xs mt-1 ${getConfidenceColor(selectedUserProfile.structuredProfile?.scores?.communication_presence?.confidence)}`}>
                                      {selectedUserProfile.structuredProfile?.scores?.communication_presence?.confidence} confidence
                                    </div>
                                  )}
                                </div>
                              )}
                              {/* Self Awareness */}
                              {selectedUserProfile.structuredProfile?.scores?.self_awareness_growth && (
                                <div className={`text-center p-4 rounded-lg ${getScoreBgClass(selectedUserProfile.structuredProfile?.scores?.self_awareness_growth?.score || 0)}`}>
                                  <div className={`text-2xl font-bold mb-1 ${getScoreColorClass(selectedUserProfile.structuredProfile?.scores?.self_awareness_growth?.score || 0)}`}>
                                    {selectedUserProfile.structuredProfile?.scores?.self_awareness_growth?.score || 0}%
                                  </div>
                                  <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Self Awareness</div>
                                  <Progress value={selectedUserProfile.structuredProfile?.scores?.self_awareness_growth?.score || 0} className="h-1.5 mt-2" />
                                  {selectedUserProfile.structuredProfile?.scores?.self_awareness_growth?.confidence && (
                                    <div className={`text-xs mt-1 ${getConfidenceColor(selectedUserProfile.structuredProfile?.scores?.self_awareness_growth?.confidence)}`}>
                                      {selectedUserProfile.structuredProfile?.scores?.self_awareness_growth?.confidence} confidence
                                    </div>
                                  )}
                                </div>
                              )}
                              {/* Job Specific Fit */}
                              {(selectedUserProfile.structuredProfile?.scores?.job_specific_fit || selectedUserProfile.structuredProfile?.scores?.general_employability) && (
                                <div className={`text-center p-4 rounded-lg ${getScoreBgClass(selectedUserProfile.structuredProfile?.scores?.job_specific_fit?.score || selectedUserProfile.structuredProfile?.scores?.general_employability?.score || 0)}`}>
                                  <div className={`text-2xl font-bold mb-1 ${getScoreColorClass(selectedUserProfile.structuredProfile?.scores?.job_specific_fit?.score || selectedUserProfile.structuredProfile?.scores?.general_employability?.score || 0)}`}>
                                    {selectedUserProfile.structuredProfile?.scores?.job_specific_fit?.score || selectedUserProfile.structuredProfile?.scores?.general_employability?.score || 0}%
                                  </div>
                                  <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    {selectedUserProfile.structuredProfile?.scores?.job_specific_fit ? 'Job Fit' : 'Employability'}
                                  </div>
                                  <Progress value={selectedUserProfile.structuredProfile?.scores?.job_specific_fit?.score || selectedUserProfile.structuredProfile?.scores?.general_employability?.score || 0} className="h-1.5 mt-2" />
                                  {(selectedUserProfile.structuredProfile?.scores?.job_specific_fit?.confidence || selectedUserProfile.structuredProfile?.scores?.general_employability?.confidence) && (
                                    <div className={`text-xs mt-1 ${getConfidenceColor(selectedUserProfile.structuredProfile?.scores?.job_specific_fit?.confidence || selectedUserProfile.structuredProfile?.scores?.general_employability?.confidence)}`}>
                                      {selectedUserProfile.structuredProfile?.scores?.job_specific_fit?.confidence || selectedUserProfile.structuredProfile?.scores?.general_employability?.confidence} confidence
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Score Interpretation */}
                          {(selectedUserProfile.structuredProfile?.scores?.overall_score?.score_interpretation || selectedUserProfile.structuredProfile?.scores?.overall_score?.interpretation) && (
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 mt-4">
                              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Score Interpretation</h4>
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                {selectedUserProfile.structuredProfile?.scores?.overall_score?.score_interpretation || selectedUserProfile.structuredProfile?.scores?.overall_score?.interpretation}
                              </p>
                            </div>
                          )}

                          {/* Sub-scores - Expanded */}
                          <div className="space-y-4">
                            {/* Technical Sub-scores */}
                            {selectedUserProfile.structuredProfile?.detailed_breakdown?.technical_skills?.sub_scores && (
                              <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                                  Technical Skills Breakdown
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                  {Object.entries(selectedUserProfile.structuredProfile?.detailed_breakdown?.technical_skills?.sub_scores).map(([key, value]: [string, any]) => (
                                    <div key={key} className="p-2 bg-slate-50 dark:bg-slate-800 rounded">
                                      <div className="text-xs text-slate-500 dark:text-slate-400 capitalize">{key.replace('_', ' ')}</div>
                                      <div className={`text-lg font-bold ${getScoreColorClass(typeof value === 'number' ? value : 0)}`}>
                                        {typeof value === 'number' ? value : 0}%
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                {selectedUserProfile.structuredProfile?.detailed_breakdown?.technical_skills?.evidence && (
                                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-3 p-2 bg-slate-100 dark:bg-slate-900 rounded">
                                    {selectedUserProfile.structuredProfile?.detailed_breakdown?.technical_skills?.evidence}
                                  </p>
                                )}
                                {selectedUserProfile.structuredProfile?.detailed_breakdown?.technical_skills?.matched_skills?.length > 0 && (
                                  <div className="mt-3">
                                    <div className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">Matched Skills</div>
                                    <div className="flex flex-wrap gap-1">
                                      {selectedUserProfile.structuredProfile?.detailed_breakdown?.technical_skills?.matched_skills.map((skill: string, i: number) => (
                                        <Badge key={i} className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                          {skill}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {selectedUserProfile.structuredProfile?.detailed_breakdown?.technical_skills?.missing_skills?.length > 0 && (
                                  <div className="mt-2">
                                    <div className="text-xs font-medium text-orange-600 dark:text-orange-400 mb-1">Missing Skills</div>
                                    <div className="flex flex-wrap gap-1">
                                      {selectedUserProfile.structuredProfile?.detailed_breakdown?.technical_skills?.missing_skills.map((skill: string, i: number) => (
                                        <Badge key={i} className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                                          {skill}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            {/* Experience Sub-scores */}
                            {selectedUserProfile.structuredProfile?.detailed_breakdown?.experience?.sub_scores && (
                              <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                                  Experience Breakdown
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                  {Object.entries(selectedUserProfile.structuredProfile?.detailed_breakdown?.experience?.sub_scores).map(([key, value]: [string, any]) => (
                                    <div key={key} className="p-2 bg-slate-50 dark:bg-slate-800 rounded">
                                      <div className="text-xs text-slate-500 dark:text-slate-400 capitalize">{key.replace('_', ' ')}</div>
                                      <div className={`text-lg font-bold ${getScoreColorClass(typeof value === 'number' ? value : 0)}`}>
                                        {typeof value === 'number' ? value : 0}%
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                {selectedUserProfile.structuredProfile?.detailed_breakdown?.experience?.evidence && (
                                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-3 p-2 bg-slate-100 dark:bg-slate-900 rounded">
                                    {selectedUserProfile.structuredProfile?.detailed_breakdown?.experience?.evidence}
                                  </p>
                                )}
                                {selectedUserProfile.structuredProfile?.detailed_breakdown?.experience?.matched_experience?.length > 0 && (
                                  <div className="mt-3">
                                    <div className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">Matched Experience</div>
                                    <div className="flex flex-wrap gap-1">
                                      {selectedUserProfile.structuredProfile?.detailed_breakdown?.experience?.matched_experience.map((exp: string, i: number) => (
                                        <Badge key={i} className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                          {exp}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {selectedUserProfile.structuredProfile?.detailed_breakdown?.experience?.gaps?.length > 0 && (
                                  <div className="mt-2">
                                    <div className="text-xs font-medium text-orange-600 dark:text-orange-400 mb-1">Experience Gaps</div>
                                    <div className="flex flex-wrap gap-1">
                                      {selectedUserProfile.structuredProfile?.detailed_breakdown?.experience?.gaps.map((gap: string, i: number) => (
                                        <Badge key={i} className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                                          {gap}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            {/* Cultural Fit Sub-scores */}
                            {selectedUserProfile.structuredProfile?.detailed_breakdown?.cultural_fit?.sub_scores && (
                              <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                                  Cultural Fit Breakdown
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                  {Object.entries(selectedUserProfile.structuredProfile?.detailed_breakdown?.cultural_fit?.sub_scores).map(([key, value]: [string, any]) => (
                                    <div key={key} className="p-2 bg-slate-50 dark:bg-slate-800 rounded">
                                      <div className="text-xs text-slate-500 dark:text-slate-400 capitalize">{key.replace('_', ' ')}</div>
                                      <div className={`text-lg font-bold ${getScoreColorClass(typeof value === 'number' ? value : 0)}`}>
                                        {typeof value === 'number' ? value : 0}%
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                {selectedUserProfile.structuredProfile?.detailed_breakdown?.cultural_fit?.evidence && (
                                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-3 p-2 bg-slate-100 dark:bg-slate-900 rounded">
                                    {selectedUserProfile.structuredProfile?.detailed_breakdown?.cultural_fit?.evidence}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Cross-Reference Analysis - Supports V3 and V4 */}
                      {(selectedUserProfile.structuredProfile?.cross_reference_analysis || selectedUserProfile.structuredProfile?.cross_reference_analysis) && (
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-4 mb-4">
                          <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                            <Shield className="h-4 w-4" /> Resume-Interview Cross-Reference
                          </h4>
                          <div className="space-y-3">
                            {/* V4: Claims Verified with details */}
                            {selectedUserProfile.structuredProfile?.cross_reference_analysis?.claims_verified?.length > 0 && (
                              <div>
                                <div className="text-xs font-medium text-green-600 dark:text-green-400 mb-2">Claims Verified</div>
                                <div className="space-y-2">
                                  {selectedUserProfile.structuredProfile?.cross_reference_analysis?.claims_verified.map((item: any, i: number) => (
                                    <div key={i} className="p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-700">
                                      <div className="text-sm font-medium text-green-800 dark:text-green-300 flex items-center gap-1">
                                        <CheckCircle className="h-3 w-3" /> {item.claim}
                                      </div>
                                      {item.resume_evidence && (
                                        <p className="text-xs text-green-600 dark:text-green-500 mt-1">Resume: {item.resume_evidence}</p>
                                      )}
                                      {item.interview_evidence && (
                                        <p className="text-xs text-green-600 dark:text-green-500">Interview: {item.interview_evidence}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* V4: Claims Contradicted with details */}
                            {selectedUserProfile.structuredProfile?.cross_reference_analysis?.claims_contradicted?.length > 0 && (
                              <div>
                                <div className="text-xs font-medium text-red-600 dark:text-red-400 mb-2">Claims Contradicted</div>
                                <div className="space-y-2">
                                  {selectedUserProfile.structuredProfile?.cross_reference_analysis?.claims_contradicted.map((item: any, i: number) => (
                                    <div key={i} className={`p-2 rounded border ${
                                      item.concern_level === 'HIGH' ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700' :
                                      'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700'
                                    }`}>
                                      <div className="flex items-center justify-between mb-1">
                                        <div className="text-sm font-medium text-red-800 dark:text-red-300 flex items-center gap-1">
                                          <AlertTriangle className="h-3 w-3" /> {item.claim}
                                        </div>
                                        {item.concern_level && (
                                          <Badge className={`text-xs ${getSeverityColor(item.concern_level)}`}>
                                            {item.concern_level}
                                          </Badge>
                                        )}
                                      </div>
                                      {item.resume_says && (
                                        <p className="text-xs text-red-600 dark:text-red-500">Resume says: {item.resume_says}</p>
                                      )}
                                      {item.interview_says && (
                                        <p className="text-xs text-red-600 dark:text-red-500">Interview says: {item.interview_says}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* V4: Claims Unverified */}
                            {selectedUserProfile.structuredProfile?.cross_reference_analysis?.claims_unverified?.length > 0 && (
                              <div>
                                <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Claims Not Verified in Interview</div>
                                <div className="flex flex-wrap gap-1">
                                  {selectedUserProfile.structuredProfile?.cross_reference_analysis?.claims_unverified.map((claim: string, i: number) => (
                                    <Badge key={i} variant="outline" className="text-xs">
                                      {claim}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* V4: New Information */}
                            {selectedUserProfile.structuredProfile?.cross_reference_analysis?.new_information?.length > 0 && (
                              <div>
                                <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">New Information (Not in Resume)</div>
                                <div className="flex flex-wrap gap-1">
                                  {selectedUserProfile.structuredProfile?.cross_reference_analysis?.new_information.map((info: string, i: number) => (
                                    <Badge key={i} className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                      {info}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* V3: Verified Claims */}
                            {selectedUserProfile.structuredProfile?.cross_reference_analysis?.verified_claims?.length > 0 && (
                              <div>
                                <div className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">Verified Claims</div>
                                <div className="flex flex-wrap gap-1">
                                  {selectedUserProfile.structuredProfile?.cross_reference_analysis?.verified_claims.map((claim: string, i: number) => (
                                    <Badge key={i} className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                      <CheckCircle className="h-3 w-3 mr-1" /> {claim}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            {selectedUserProfile.structuredProfile?.cross_reference_analysis?.resume_interview_discrepancies?.length > 0 && (
                              <div>
                                <div className="text-xs font-medium text-orange-600 dark:text-orange-400 mb-1">Discrepancies Found</div>
                                <div className="flex flex-wrap gap-1">
                                  {selectedUserProfile.structuredProfile?.cross_reference_analysis?.resume_interview_discrepancies.map((disc: string, i: number) => (
                                    <Badge key={i} className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                                      <AlertTriangle className="h-3 w-3 mr-1" /> {disc}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            {selectedUserProfile.structuredProfile?.cross_reference_analysis?.unverified_claims?.length > 0 && (
                              <div>
                                <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Unverified Claims</div>
                                <div className="flex flex-wrap gap-1">
                                  {selectedUserProfile.structuredProfile?.cross_reference_analysis?.unverified_claims.map((claim: string, i: number) => (
                                    <Badge key={i} variant="outline" className="text-xs">
                                      {claim}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Red Flags */}
                      {selectedUserProfile.structuredProfile?.red_flags && selectedUserProfile.structuredProfile?.red_flags?.length > 0 && (
                        <div className="bg-red-50 dark:bg-red-900/20 rounded-md p-4 mb-4 border border-red-200 dark:border-red-700">
                          <h4 className="font-semibold text-red-700 dark:text-red-400 mb-3 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" /> Red Flags ({selectedUserProfile.structuredProfile?.red_flags?.length})
                          </h4>
                          <div className="space-y-2">
                            {selectedUserProfile.structuredProfile?.red_flags?.map((flag: any, i: number) => (
                              <div key={i} className={`p-2 rounded border ${getSeverityColor(flag.severity)}`}>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium text-sm">{flag.issue}</span>
                                  <Badge className={`text-xs ${getSeverityColor(flag.severity)}`}>
                                    {flag.severity}
                                  </Badge>
                                </div>
                                {flag.evidence && (
                                  <p className="text-xs opacity-80">{flag.evidence}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Competitive Intel (if available) */}
                      {selectedUserProfile.structuredProfile?.competitive_intel && (
                        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-md p-4 border border-purple-200 dark:border-purple-700 mb-4">
                          <h4 className="font-semibold text-purple-700 dark:text-purple-400 mb-3 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" /> Competitive Intelligence
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                            {selectedUserProfile.structuredProfile?.competitive_intel?.market_position && (
                              <div className="p-2 bg-white dark:bg-slate-800 rounded border">
                                <div className="text-slate-500 dark:text-slate-400">Market Position</div>
                                <div className="font-medium text-purple-700 dark:text-purple-300">
                                  {selectedUserProfile.structuredProfile?.competitive_intel?.market_position}
                                </div>
                              </div>
                            )}
                            {selectedUserProfile.structuredProfile?.competitive_intel?.growth_potential && (
                              <div className="p-2 bg-white dark:bg-slate-800 rounded border">
                                <div className="text-slate-500 dark:text-slate-400">Growth Potential</div>
                                <Badge className={`text-xs ${
                                  selectedUserProfile.structuredProfile?.competitive_intel?.growth_potential === 'HIGH' ? 'bg-green-100 text-green-700' :
                                  selectedUserProfile.structuredProfile?.competitive_intel?.growth_potential === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {selectedUserProfile.structuredProfile?.competitive_intel?.growth_potential}
                                </Badge>
                              </div>
                            )}
                            {selectedUserProfile.structuredProfile?.competitive_intel?.flight_risk && (
                              <div className="p-2 bg-white dark:bg-slate-800 rounded border">
                                <div className="text-slate-500 dark:text-slate-400">Flight Risk</div>
                                <Badge className={`text-xs ${
                                  selectedUserProfile.structuredProfile?.competitive_intel?.flight_risk === 'LOW' ? 'bg-green-100 text-green-700' :
                                  selectedUserProfile.structuredProfile?.competitive_intel?.flight_risk === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {selectedUserProfile.structuredProfile?.competitive_intel?.flight_risk}
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Interview Analysis Section - Supports V3 interviewAnalysis and V4 transcript_analysis */}
                      {(selectedUserProfile.structuredProfile?.interview_analysis || selectedUserProfile.structuredProfile?.transcript_analysis) && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700 mb-4">
                          <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-3 flex items-center gap-2">
                            <Briefcase className="h-4 w-4" /> Interview/Transcript Analysis
                          </h4>

                          {/* V4: Overall Quality Assessment */}
                          {selectedUserProfile.structuredProfile?.transcript_analysis?.overall_quality && (
                            <div className="mb-4 p-3 bg-white dark:bg-slate-800 rounded border">
                              <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Overall Quality Assessment</div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {Object.entries(selectedUserProfile.structuredProfile?.transcript_analysis?.overall_quality).map(([key, value]: [string, any]) => (
                                  <div key={key} className="p-2 bg-slate-50 dark:bg-slate-900 rounded text-center">
                                    <div className="text-xs text-slate-500 capitalize">{key.replace(/_/g, ' ')}</div>
                                    <Badge className={`text-xs mt-1 ${
                                      value === 'DEEP' || value === 'HIGHLY_SPECIFIC' || value === 'WELL_STRUCTURED' || value === 'HIGHLY_ENGAGED' ? 'bg-green-100 text-green-700' :
                                      value === 'MODERATE' || value === 'MODERATELY_SPECIFIC' || value === 'ADEQUATE' || value === 'ENGAGED' ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-red-100 text-red-700'
                                    }`}>
                                      {String(value).replace(/_/g, ' ')}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* V4: Linguistic Patterns */}
                          {selectedUserProfile.structuredProfile?.transcript_analysis?.linguistic_patterns && (
                            <div className="mb-4 p-3 bg-white dark:bg-slate-800 rounded border">
                              <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Linguistic Patterns</div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <div className="text-xs text-green-600">Confidence Markers: {selectedUserProfile.structuredProfile?.transcript_analysis?.linguistic_patterns?.confidence_markers_count || 0}</div>
                                  {selectedUserProfile.structuredProfile?.transcript_analysis?.linguistic_patterns?.confidence_examples?.length > 0 && (
                                    <div className="mt-1 space-y-1">
                                      {selectedUserProfile.structuredProfile?.transcript_analysis?.linguistic_patterns?.confidence_examples.slice(0, 2).map((ex: string, i: number) => (
                                        <p key={i} className="text-xs text-green-700 dark:text-green-400 italic">"{ex}"</p>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div className="text-xs text-orange-600">Uncertainty Markers: {selectedUserProfile.structuredProfile?.transcript_analysis?.linguistic_patterns?.uncertainty_markers_count || 0}</div>
                                  {selectedUserProfile.structuredProfile?.transcript_analysis?.linguistic_patterns?.uncertainty_examples?.length > 0 && (
                                    <div className="mt-1 space-y-1">
                                      {selectedUserProfile.structuredProfile?.transcript_analysis?.linguistic_patterns?.uncertainty_examples.slice(0, 2).map((ex: string, i: number) => (
                                        <p key={i} className="text-xs text-orange-700 dark:text-orange-400 italic">"{ex}"</p>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {selectedUserProfile.structuredProfile?.transcript_analysis?.linguistic_patterns?.ownership_pattern && (
                                <div className="mt-2">
                                  <Badge className={`text-xs ${
                                    selectedUserProfile.structuredProfile?.transcript_analysis?.linguistic_patterns?.ownership_pattern === 'STRONG_INDIVIDUAL' ? 'bg-green-100 text-green-700' :
                                    selectedUserProfile.structuredProfile?.transcript_analysis?.linguistic_patterns?.ownership_pattern === 'MIXED' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    Ownership: {selectedUserProfile.structuredProfile?.transcript_analysis?.linguistic_patterns?.ownership_pattern?.replace(/_/g, ' ')}
                                  </Badge>
                                  {selectedUserProfile.structuredProfile?.transcript_analysis?.linguistic_patterns?.ownership_evidence && (
                                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 italic">
                                      "{selectedUserProfile.structuredProfile?.transcript_analysis?.linguistic_patterns?.ownership_evidence}"
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* V4: Authenticity Assessment */}
                          {selectedUserProfile.structuredProfile?.transcript_analysis?.authenticity_assessment && (
                            <div className="mb-4 p-3 bg-white dark:bg-slate-800 rounded border">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="text-xs font-medium text-slate-600 dark:text-slate-400">Authenticity Assessment</div>
                                <Badge className={`text-xs ${
                                  selectedUserProfile.structuredProfile?.transcript_analysis?.authenticity_assessment?.rating === 'HIGHLY_AUTHENTIC' ? 'bg-green-100 text-green-700' :
                                  selectedUserProfile.structuredProfile?.transcript_analysis?.authenticity_assessment?.rating === 'MOSTLY_AUTHENTIC' ? 'bg-blue-100 text-blue-700' :
                                  selectedUserProfile.structuredProfile?.transcript_analysis?.authenticity_assessment?.rating === 'MIXED' ? 'bg-yellow-100 text-yellow-700' :
                                  selectedUserProfile.structuredProfile?.transcript_analysis?.authenticity_assessment?.rating === 'SEEMS_REHEARSED' ? 'bg-orange-100 text-orange-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {selectedUserProfile.structuredProfile?.transcript_analysis?.authenticity_assessment?.rating?.replace(/_/g, ' ')}
                                </Badge>
                              </div>
                              {selectedUserProfile.structuredProfile?.transcript_analysis?.authenticity_assessment?.reasoning && (
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                  {selectedUserProfile.structuredProfile?.transcript_analysis?.authenticity_assessment?.reasoning}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Transcript Summary (V3) */}
                          {selectedUserProfile.structuredProfile?.interview_analysis?.transcript_summary && (
                            <div className="mb-4 p-3 bg-white dark:bg-slate-800 rounded border">
                              <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Interview Summary</div>
                              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">
                                {selectedUserProfile.structuredProfile?.interview_analysis?.transcript_summary}
                              </p>
                            </div>
                          )}

                          {/* Response Quality Ratings (V3) */}
                          {selectedUserProfile.structuredProfile?.interview_analysis?.response_quality && (
                            <div className="mb-4">
                              <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Response Quality</div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {Object.entries(selectedUserProfile.structuredProfile?.interview_analysis?.response_quality).map(([key, value]: [string, any]) => (
                                  <div key={key} className="p-2 bg-white dark:bg-slate-800 rounded border text-center">
                                    <div className="text-xs text-slate-500 capitalize">{key.replace(/_/g, ' ')}</div>
                                    <Badge className={`text-xs mt-1 ${
                                      value === 'DEEP' || value === 'HIGHLY_SPECIFIC' || value === 'WELL_STRUCTURED' || value === 'ON_POINT' ? 'bg-green-100 text-green-700' :
                                      value === 'ADEQUATE' || value === 'MODERATELY_SPECIFIC' || value === 'MOSTLY_RELEVANT' ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-red-100 text-red-700'
                                    }`}>
                                      {String(value).replace(/_/g, ' ')}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Communication Patterns */}
                          {selectedUserProfile.structuredProfile?.interview_analysis?.communication_patterns && (
                            <div className="mb-4">
                              <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Communication Patterns</div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {selectedUserProfile.structuredProfile?.interview_analysis?.communication_patterns?.ownership_language && (
                                  <div className="p-2 bg-white dark:bg-slate-800 rounded border">
                                    <div className="text-xs text-slate-500">Ownership Language</div>
                                    <p className="text-sm text-slate-700 dark:text-slate-300">
                                      {selectedUserProfile.structuredProfile?.interview_analysis?.communication_patterns?.ownership_language}
                                    </p>
                                  </div>
                                )}
                                {selectedUserProfile.structuredProfile?.interview_analysis?.communication_patterns?.technical_fluency && (
                                  <div className="p-2 bg-white dark:bg-slate-800 rounded border">
                                    <div className="text-xs text-slate-500">Technical Fluency</div>
                                    <p className="text-sm text-slate-700 dark:text-slate-300">
                                      {selectedUserProfile.structuredProfile?.interview_analysis?.communication_patterns?.technical_fluency}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* V4: Strongest Responses */}
                          {selectedUserProfile.structuredProfile?.transcript_analysis?.strongest_responses?.length > 0 && (
                            <div className="mb-4">
                              <div className="text-xs font-medium text-green-600 dark:text-green-400 mb-2">Strongest Responses</div>
                              <div className="space-y-2">
                                {selectedUserProfile.structuredProfile?.transcript_analysis?.strongest_responses.map((response: any, i: number) => (
                                  <div key={i} className="p-2 bg-green-50 dark:bg-green-900/30 rounded border border-green-200 dark:border-green-700">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Badge className="text-xs bg-green-200 text-green-800">Q{response.question_number}</Badge>
                                      <span className="text-sm font-medium text-green-800 dark:text-green-300">{response.question_topic}</span>
                                    </div>
                                    <p className="text-xs text-green-700 dark:text-green-400">{response.why_strong}</p>
                                    {response.verbatim_highlight && (
                                      <p className="text-xs text-green-600 dark:text-green-500 italic mt-1 border-l-2 border-green-400 pl-2">
                                        "{response.verbatim_highlight}"
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* V4: Weakest Responses */}
                          {selectedUserProfile.structuredProfile?.transcript_analysis?.weakest_responses?.length > 0 && (
                            <div className="mb-4">
                              <div className="text-xs font-medium text-orange-600 dark:text-orange-400 mb-2">Weakest Responses</div>
                              <div className="space-y-2">
                                {selectedUserProfile.structuredProfile?.transcript_analysis?.weakest_responses.map((response: any, i: number) => (
                                  <div key={i} className="p-2 bg-orange-50 dark:bg-orange-900/30 rounded border border-orange-200 dark:border-orange-700">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Badge className="text-xs bg-orange-200 text-orange-800">Q{response.question_number}</Badge>
                                      <span className="text-sm font-medium text-orange-800 dark:text-orange-300">{response.question_topic}</span>
                                    </div>
                                    <p className="text-xs text-orange-700 dark:text-orange-400">{response.why_weak}</p>
                                    {response.verbatim_example && (
                                      <p className="text-xs text-orange-600 dark:text-orange-500 italic mt-1 border-l-2 border-orange-400 pl-2">
                                        "{response.verbatim_example}"
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* V4: Red Flags from Transcript */}
                          {selectedUserProfile.structuredProfile?.transcript_analysis?.red_flags_detected?.length > 0 && (
                            <div className="mb-4">
                              <div className="text-xs font-medium text-red-600 dark:text-red-400 mb-2">Red Flags Detected</div>
                              <div className="space-y-2">
                                {selectedUserProfile.structuredProfile?.transcript_analysis?.red_flags_detected.map((flag: any, i: number) => (
                                  <div key={i} className={`p-2 rounded border ${getSeverityColor(flag.severity || 'MEDIUM')}`}>
                                    <div className="flex items-center justify-between mb-1">
                                      <div className="flex items-center gap-2">
                                        <AlertTriangle className="h-3 w-3" />
                                        <Badge className="text-xs bg-slate-200 text-slate-700">{flag.flag_type?.replace(/_/g, ' ')}</Badge>
                                      </div>
                                      <Badge className={`text-xs ${getSeverityColor(flag.severity || 'MEDIUM')}`}>
                                        {flag.severity}
                                      </Badge>
                                    </div>
                                    <p className="text-sm font-medium">{flag.description}</p>
                                    {flag.evidence && (
                                      <p className="text-xs opacity-80 mt-1 italic">"{flag.evidence}"</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* V4: Green Flags from Transcript */}
                          {selectedUserProfile.structuredProfile?.transcript_analysis?.green_flags_detected?.length > 0 && (
                            <div className="mb-4">
                              <div className="text-xs font-medium text-green-600 dark:text-green-400 mb-2">Green Flags Detected</div>
                              <div className="space-y-2">
                                {selectedUserProfile.structuredProfile?.transcript_analysis?.green_flags_detected.map((flag: any, i: number) => (
                                  <div key={i} className="p-2 bg-green-50 dark:bg-green-900/30 rounded border border-green-200 dark:border-green-700">
                                    <div className="flex items-center gap-2 mb-1">
                                      <CheckCircle className="h-3 w-3 text-green-600" />
                                      <Badge className="text-xs bg-green-200 text-green-800">{flag.flag_type?.replace(/_/g, ' ')}</Badge>
                                    </div>
                                    <p className="text-sm text-green-800 dark:text-green-300">{flag.description}</p>
                                    {flag.evidence && (
                                      <p className="text-xs text-green-600 dark:text-green-500 mt-1 italic">"{flag.evidence}"</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* V3: Strongest Moments */}
                          {selectedUserProfile.structuredProfile?.interview_analysis?.strongest_moments?.length > 0 && (
                            <div className="mb-4">
                              <div className="text-xs font-medium text-green-600 dark:text-green-400 mb-2">Strongest Moments</div>
                              <div className="space-y-2">
                                {selectedUserProfile.structuredProfile?.interview_analysis?.strongest_moments.map((moment: any, i: number) => (
                                  <div key={i} className="p-2 bg-green-50 dark:bg-green-900/30 rounded border border-green-200 dark:border-green-700">
                                    <div className="text-sm font-medium text-green-800 dark:text-green-300">{moment.moment}</div>
                                    {moment.quote && (
                                      <p className="text-xs text-green-700 dark:text-green-400 italic mt-1">"{moment.quote}"</p>
                                    )}
                                    {moment.why_impressive && (
                                      <p className="text-xs text-green-600 dark:text-green-500 mt-1">{moment.why_impressive}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* V3: Concerning Moments */}
                          {selectedUserProfile.structuredProfile?.interview_analysis?.concerning_moments?.length > 0 && (
                            <div className="mb-4">
                              <div className="text-xs font-medium text-orange-600 dark:text-orange-400 mb-2">Concerning Moments</div>
                              <div className="space-y-2">
                                {selectedUserProfile.structuredProfile?.interview_analysis?.concerning_moments.map((moment: any, i: number) => (
                                  <div key={i} className="p-2 bg-orange-50 dark:bg-orange-900/30 rounded border border-orange-200 dark:border-orange-700">
                                    <div className="flex items-center justify-between">
                                      <div className="text-sm font-medium text-orange-800 dark:text-orange-300">{moment.moment}</div>
                                      {moment.concern_level && (
                                        <Badge className={`text-xs ${
                                          moment.concern_level === 'HIGH' ? 'bg-red-100 text-red-700' :
                                          moment.concern_level === 'MEDIUM' ? 'bg-orange-100 text-orange-700' :
                                          'bg-yellow-100 text-yellow-700'
                                        }`}>
                                          {moment.concern_level}
                                        </Badge>
                                      )}
                                    </div>
                                    {moment.quote && (
                                      <p className="text-xs text-orange-700 dark:text-orange-400 italic mt-1">"{moment.quote}"</p>
                                    )}
                                    {moment.why_concerning && (
                                      <p className="text-xs text-orange-600 dark:text-orange-500 mt-1">{moment.why_concerning}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Notable Quotes */}
                          {selectedUserProfile.structuredProfile?.interview_analysis?.notable_quotes?.length > 0 && (
                            <div className="mb-4">
                              <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Notable Quotes</div>
                              <div className="space-y-2">
                                {selectedUserProfile.structuredProfile?.interview_analysis?.notable_quotes.map((quote: string, i: number) => (
                                  <div key={i} className="p-2 bg-slate-100 dark:bg-slate-800 rounded border-l-2 border-blue-400">
                                    <p className="text-sm text-slate-700 dark:text-slate-300 italic">"{quote}"</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Green & Red Flags from Interview */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {selectedUserProfile.structuredProfile?.interview_analysis?.green_flags_detected?.length > 0 && (
                              <div>
                                <div className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">Green Flags</div>
                                <div className="space-y-1">
                                  {selectedUserProfile.structuredProfile?.interview_analysis?.green_flags_detected.map((flag: string, i: number) => (
                                    <Badge key={i} className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 mr-1 mb-1">
                                      <CheckCircle className="h-3 w-3 mr-1" /> {flag}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            {selectedUserProfile.structuredProfile?.interview_analysis?.red_flags_detected?.length > 0 && (
                              <div>
                                <div className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">Red Flags</div>
                                <div className="space-y-1">
                                  {selectedUserProfile.structuredProfile?.interview_analysis?.red_flags_detected.map((flag: string, i: number) => (
                                    <Badge key={i} className="text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 mr-1 mb-1">
                                      <AlertTriangle className="h-3 w-3 mr-1" /> {flag}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Job Match Section - Supports V3 jobMatch and V4 job_match_analysis */}
                      {(selectedUserProfile.structuredProfile?.job_match || selectedUserProfile.structuredProfile?.job_match_analysis) && (
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-700 mb-4">
                          <h4 className="font-semibold text-indigo-700 dark:text-indigo-400 mb-3 flex items-center gap-2">
                            <Briefcase className="h-4 w-4" /> Job Match Analysis: {
                              selectedUserProfile.structuredProfile?.job_match_analysis?.job_title ||
                              selectedUserProfile.structuredProfile?.job_match?.job_title_evaluated_for
                            }
                          </h4>

                          {/* V4: Requirements Assessment */}
                          {selectedUserProfile.structuredProfile?.job_match_analysis?.requirements_assessment?.length > 0 && (
                            <div className="mb-4">
                              <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Requirements Assessment</div>
                              <div className="space-y-2">
                                {selectedUserProfile.structuredProfile?.job_match_analysis?.requirements_assessment.map((req: any, i: number) => (
                                  <div key={i} className={`p-2 rounded border ${
                                    req.met_status === 'CLEARLY_MET' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700' :
                                    req.met_status === 'PARTIALLY_MET' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700' :
                                    'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
                                  }`}>
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-sm font-medium">{req.requirement}</span>
                                      <Badge className={`text-xs ${
                                        req.met_status === 'CLEARLY_MET' ? 'bg-green-100 text-green-700' :
                                        req.met_status === 'PARTIALLY_MET' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-red-100 text-red-700'
                                      }`}>
                                        {req.met_status?.replace(/_/g, ' ')}
                                      </Badge>
                                    </div>
                                    {req.evidence && (
                                      <p className="text-xs text-slate-600 dark:text-slate-400 italic">{req.evidence}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* V4: Candidate Interest Level */}
                          {selectedUserProfile.structuredProfile?.job_match_analysis?.candidate_interest_level && (
                            <div className="mb-4 p-3 bg-white dark:bg-slate-800 rounded border">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Candidate Interest Level</span>
                                <Badge className={`text-xs ${
                                  selectedUserProfile.structuredProfile?.job_match_analysis?.candidate_interest_level === 'HIGH' ? 'bg-green-100 text-green-700' :
                                  selectedUserProfile.structuredProfile?.job_match_analysis?.candidate_interest_level === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                                  selectedUserProfile.structuredProfile?.job_match_analysis?.candidate_interest_level === 'LOW' ? 'bg-red-100 text-red-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {selectedUserProfile.structuredProfile?.job_match_analysis?.candidate_interest_level}
                                </Badge>
                              </div>
                              {selectedUserProfile.structuredProfile?.job_match_analysis?.interest_evidence && (
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                  {selectedUserProfile.structuredProfile?.job_match_analysis?.interest_evidence}
                                </p>
                              )}
                            </div>
                          )}

                          {/* V4: Recommendation */}
                          {selectedUserProfile.structuredProfile?.job_match_analysis?.recommendation && (
                            <div className={`p-3 rounded mb-4 ${
                              selectedUserProfile.structuredProfile?.job_match_analysis?.recommendation === 'STRONGLY_RECOMMEND' ? 'bg-green-100 dark:bg-green-900/30 border border-green-300' :
                              selectedUserProfile.structuredProfile?.job_match_analysis?.recommendation === 'RECOMMEND' ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-300' :
                              selectedUserProfile.structuredProfile?.job_match_analysis?.recommendation === 'CONSIDER' ? 'bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300' :
                              selectedUserProfile.structuredProfile?.job_match_analysis?.recommendation === 'HESITANT' ? 'bg-orange-100 dark:bg-orange-900/30 border border-orange-300' :
                              'bg-red-100 dark:bg-red-900/30 border border-red-300'
                            }`}>
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className={`text-sm ${
                                  selectedUserProfile.structuredProfile?.job_match_analysis?.recommendation === 'STRONGLY_RECOMMEND' ? 'bg-green-500 text-white' :
                                  selectedUserProfile.structuredProfile?.job_match_analysis?.recommendation === 'RECOMMEND' ? 'bg-blue-500 text-white' :
                                  selectedUserProfile.structuredProfile?.job_match_analysis?.recommendation === 'CONSIDER' ? 'bg-yellow-500 text-white' :
                                  selectedUserProfile.structuredProfile?.job_match_analysis?.recommendation === 'HESITANT' ? 'bg-orange-500 text-white' :
                                  'bg-red-500 text-white'
                                }`}>
                                  {selectedUserProfile.structuredProfile?.job_match_analysis?.recommendation?.replace(/_/g, ' ')}
                                </Badge>
                              </div>
                              {selectedUserProfile.structuredProfile?.job_match_analysis?.recommendation_reasoning && (
                                <p className="text-sm text-slate-700 dark:text-slate-300">
                                  {selectedUserProfile.structuredProfile?.job_match_analysis?.recommendation_reasoning}
                                </p>
                              )}
                            </div>
                          )}

                          {/* V4: Strongest Alignments & Critical Gaps */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                            {selectedUserProfile.structuredProfile?.job_match_analysis?.strongest_alignments?.length > 0 && (
                              <div>
                                <div className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">Strongest Alignments</div>
                                <div className="flex flex-wrap gap-1">
                                  {selectedUserProfile.structuredProfile?.job_match_analysis?.strongest_alignments.map((item: string, i: number) => (
                                    <Badge key={i} className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                      <CheckCircle className="h-3 w-3 mr-1" /> {item}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            {selectedUserProfile.structuredProfile?.job_match_analysis?.critical_gaps?.length > 0 && (
                              <div>
                                <div className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">Critical Gaps</div>
                                <div className="flex flex-wrap gap-1">
                                  {selectedUserProfile.structuredProfile?.job_match_analysis?.critical_gaps.map((item: string, i: number) => (
                                    <Badge key={i} className="text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                                      <AlertTriangle className="h-3 w-3 mr-1" /> {item}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Hire Recommendation Banner */}
                          {selectedUserProfile.structuredProfile?.job_match?.hire_recommendation && (
                            <div className={`p-3 rounded mb-4 ${
                              selectedUserProfile.structuredProfile?.job_match?.hire_recommendation === 'strong_match' ? 'bg-green-100 dark:bg-green-900/30 border border-green-300' :
                              selectedUserProfile.structuredProfile?.job_match?.hire_recommendation === 'good_match' ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-300' :
                              selectedUserProfile.structuredProfile?.job_match?.hire_recommendation === 'potential_match' ? 'bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300' :
                              'bg-red-100 dark:bg-red-900/30 border border-red-300'
                            }`}>
                              <div className="flex items-center justify-between">
                                <Badge className={`text-sm ${
                                  selectedUserProfile.structuredProfile?.job_match?.hire_recommendation === 'strong_match' ? 'bg-green-500 text-white' :
                                  selectedUserProfile.structuredProfile?.job_match?.hire_recommendation === 'good_match' ? 'bg-blue-500 text-white' :
                                  selectedUserProfile.structuredProfile?.job_match?.hire_recommendation === 'potential_match' ? 'bg-yellow-500 text-white' :
                                  'bg-red-500 text-white'
                                }`}>
                                  {selectedUserProfile.structuredProfile?.job_match?.hire_recommendation?.replace(/_/g, ' ').toUpperCase()}
                                </Badge>
                                {selectedUserProfile.structuredProfile?.job_match?.interest_level_in_role && (
                                  <span className="text-xs text-slate-600 dark:text-slate-400">
                                    Interest: {selectedUserProfile.structuredProfile?.job_match?.interest_level_in_role}
                                  </span>
                                )}
                              </div>
                              {selectedUserProfile.structuredProfile?.job_match?.recommendation_reasoning && (
                                <p className="text-sm mt-2 text-slate-700 dark:text-slate-300">
                                  {selectedUserProfile.structuredProfile?.job_match?.recommendation_reasoning}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Job Fit Assessment */}
                          {selectedUserProfile.structuredProfile?.job_match?.overall_job_fit_assessment && (
                            <div className="p-3 bg-white dark:bg-slate-800 rounded border mb-4">
                              <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Job Fit Assessment</div>
                              <p className="text-sm text-slate-700 dark:text-slate-300">
                                {selectedUserProfile.structuredProfile?.job_match?.overall_job_fit_assessment}
                              </p>
                            </div>
                          )}

                          {/* Requirements Met */}
                          {selectedUserProfile.structuredProfile?.job_match?.requirements_met?.length > 0 && (
                            <div className="mb-4">
                              <div className="text-xs font-medium text-green-600 dark:text-green-400 mb-2">Requirements Met</div>
                              <div className="space-y-2">
                                {selectedUserProfile.structuredProfile?.job_match?.requirements_met.map((req: any, i: number) => (
                                  <div key={i} className="p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-700">
                                    <div className="text-sm font-medium text-green-800 dark:text-green-300">{req.requirement || req}</div>
                                    {req.evidence_from_interview && (
                                      <p className="text-xs text-green-600 dark:text-green-500 mt-1 italic">Evidence: {req.evidence_from_interview}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Requirements Not Met */}
                          {selectedUserProfile.structuredProfile?.job_match?.requirements_not_met?.length > 0 && (
                            <div className="mb-4">
                              <div className="text-xs font-medium text-red-600 dark:text-red-400 mb-2">Requirements Not Met</div>
                              <div className="space-y-2">
                                {selectedUserProfile.structuredProfile?.job_match?.requirements_not_met.map((req: any, i: number) => (
                                  <div key={i} className="p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-700">
                                    <div className="text-sm font-medium text-red-800 dark:text-red-300">{req.requirement || req}</div>
                                    {req.evidence_of_gap && (
                                      <p className="text-xs text-red-600 dark:text-red-500 mt-1">{req.evidence_of_gap}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Skills Match */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {selectedUserProfile.structuredProfile?.job_match?.skills_mentioned_in_interview_matching_jd?.length > 0 && (
                              <div>
                                <div className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">Skills Matching JD</div>
                                <div className="flex flex-wrap gap-1">
                                  {selectedUserProfile.structuredProfile?.job_match?.skills_mentioned_in_interview_matching_jd.map((skill: string, i: number) => (
                                    <Badge key={i} className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                      {skill}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            {selectedUserProfile.structuredProfile?.job_match?.skills_in_jd_not_discussed?.length > 0 && (
                              <div>
                                <div className="text-xs font-medium text-orange-600 dark:text-orange-400 mb-1">JD Skills Not Discussed</div>
                                <div className="flex flex-wrap gap-1">
                                  {selectedUserProfile.structuredProfile?.job_match?.skills_in_jd_not_discussed.map((skill: string, i: number) => (
                                    <Badge key={i} className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                                      {skill}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Career Story */}
                      {selectedUserProfile.structuredProfile?.career_story && (
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 mb-4">
                          <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-3">Career Story</h4>
                          {selectedUserProfile.structuredProfile?.career_story.narrative && (
                            <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line mb-3">
                              {selectedUserProfile.structuredProfile?.career_story.narrative}
                            </p>
                          )}
                          {selectedUserProfile.structuredProfile?.career_story.key_milestones?.length > 0 && (
                            <div className="mb-2">
                              <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Key Milestones</div>
                              <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-400">
                                {selectedUserProfile.structuredProfile?.career_story.key_milestones.map((milestone: string, i: number) => (
                                  <li key={i}>{milestone}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* V4: Interview Metadata */}
                      {selectedUserProfile.structuredProfile?.interview_metadata && (
                        <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700 mb-4">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                              <span>Exchanges: <strong>{selectedUserProfile.structuredProfile?.interview_metadata.exchange_count || 0}</strong></span>
                              <span>Avg Response: <strong>{selectedUserProfile.structuredProfile?.interview_metadata.avg_response_length_chars || 0}</strong> chars</span>
                              {selectedUserProfile.structuredProfile?.interview_metadata.interview_quality && (
                                <Badge className={`text-xs ${
                                  selectedUserProfile.structuredProfile?.interview_metadata.interview_quality === 'COMPREHENSIVE' ? 'bg-green-100 text-green-700' :
                                  selectedUserProfile.structuredProfile?.interview_metadata.interview_quality === 'ADEQUATE' ? 'bg-blue-100 text-blue-700' :
                                  selectedUserProfile.structuredProfile?.interview_metadata.interview_quality === 'SHORT' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {selectedUserProfile.structuredProfile?.interview_metadata.interview_quality} Interview
                                </Badge>
                              )}
                            </div>
                            {selectedUserProfile.structuredProfile?.interview_metadata.data_limitations?.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {selectedUserProfile.structuredProfile?.interview_metadata.data_limitations.map((limit: string, i: number) => (
                                  <Badge key={i} variant="outline" className="text-xs text-orange-600 border-orange-300">
                                    <AlertTriangle className="h-3 w-3 mr-1" /> {limit}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* V4: Detailed Profile - Skills Demonstrated */}
                      {selectedUserProfile.structuredProfile?.detailed_profile?.skills_demonstrated && (
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 mb-4">
                          <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-3">Skills Demonstrated in Interview</h4>

                          {/* Technical Skills */}
                          {selectedUserProfile.structuredProfile?.detailed_profile.skills_demonstrated.technical_skills?.length > 0 && (
                            <div className="mb-3">
                              <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Technical Skills</div>
                              <div className="space-y-2">
                                {selectedUserProfile.structuredProfile?.detailed_profile.skills_demonstrated.technical_skills?.map((skill: any, i: number) => (
                                  <div key={i} className="flex items-center gap-2">
                                    <Badge className={`text-xs ${
                                      skill.demonstrated_level === 'EXPERT' ? 'bg-green-100 text-green-700' :
                                      skill.demonstrated_level === 'PROFICIENT' ? 'bg-blue-100 text-blue-700' :
                                      skill.demonstrated_level === 'FAMILIAR' ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-gray-100 text-gray-700'
                                    }`}>
                                      {skill.skill}
                                    </Badge>
                                    <span className="text-xs text-slate-500">{skill.demonstrated_level}</span>
                                    {skill.evidence && (
                                      <span className="text-xs text-slate-400 italic truncate max-w-xs">{skill.evidence}</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Soft Skills */}
                          {selectedUserProfile.structuredProfile?.detailed_profile.skills_demonstrated.soft_skills?.length > 0 && (
                            <div>
                              <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Soft Skills</div>
                              <div className="space-y-2">
                                {selectedUserProfile.structuredProfile?.detailed_profile.skills_demonstrated.soft_skills.map((skill: any, i: number) => (
                                  <div key={i} className="flex items-center gap-2">
                                    <Badge className={`text-xs ${
                                      skill.demonstrated_level === 'STRONG' ? 'bg-green-100 text-green-700' :
                                      skill.demonstrated_level === 'ADEQUATE' ? 'bg-blue-100 text-blue-700' :
                                      skill.demonstrated_level === 'DEVELOPING' ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-red-100 text-red-700'
                                    }`}>
                                      {skill.skill}
                                    </Badge>
                                    <span className="text-xs text-slate-500">{skill.demonstrated_level}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* V4: Detailed Profile - Personality Indicators */}
                      {selectedUserProfile.structuredProfile?.detailed_profile?.personality_indicators && (
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 mb-4">
                          <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-3">Personality & Work Style</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                            {selectedUserProfile.structuredProfile?.detailed_profile.personality_indicators.thinking_style && (
                              <div className="p-2 bg-white dark:bg-slate-900 rounded border text-center">
                                <div className="text-xs text-slate-500">Thinking Style</div>
                                <Badge className="text-xs mt-1 bg-purple-100 text-purple-700">
                                  {selectedUserProfile.structuredProfile?.detailed_profile.personality_indicators.thinking_style}
                                </Badge>
                              </div>
                            )}
                            {selectedUserProfile.structuredProfile?.detailed_profile.personality_indicators.energy_level && (
                              <div className="p-2 bg-white dark:bg-slate-900 rounded border text-center">
                                <div className="text-xs text-slate-500">Energy Level</div>
                                <Badge className={`text-xs mt-1 ${
                                  selectedUserProfile.structuredProfile?.detailed_profile.personality_indicators.energy_level === 'HIGH' ? 'bg-green-100 text-green-700' :
                                  selectedUserProfile.structuredProfile?.detailed_profile.personality_indicators.energy_level === 'MODERATE' ? 'bg-blue-100 text-blue-700' :
                                  'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {selectedUserProfile.structuredProfile?.detailed_profile.personality_indicators.energy_level}
                                </Badge>
                              </div>
                            )}
                            {selectedUserProfile.structuredProfile?.detailed_profile.personality_indicators.interpersonal_orientation && (
                              <div className="p-2 bg-white dark:bg-slate-900 rounded border text-center">
                                <div className="text-xs text-slate-500">Work Orientation</div>
                                <Badge className="text-xs mt-1 bg-indigo-100 text-indigo-700">
                                  {selectedUserProfile.structuredProfile?.detailed_profile.personality_indicators.interpersonal_orientation}
                                </Badge>
                              </div>
                            )}
                          </div>
                          {selectedUserProfile.structuredProfile?.detailed_profile.personality_indicators.communication_style && (
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                              <strong>Communication:</strong> {selectedUserProfile.structuredProfile?.detailed_profile.personality_indicators.communication_style}
                            </p>
                          )}
                          {selectedUserProfile.structuredProfile?.detailed_profile.personality_indicators.key_personality_observations?.length > 0 && (
                            <div>
                              <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Key Observations</div>
                              <ul className="text-sm text-slate-600 dark:text-slate-400 list-disc list-inside">
                                {selectedUserProfile.structuredProfile?.detailed_profile.personality_indicators.key_personality_observations.map((obs: string, i: number) => (
                                  <li key={i}>{obs}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* V4: Assessment Metadata */}
                      {selectedUserProfile.structuredProfile?.assessment_metadata && (
                        <div className="bg-gray-100 dark:bg-slate-900 rounded-lg p-3 border border-gray-200 dark:border-slate-700 mb-4">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500">Assessment Confidence:</span>
                              <div className="flex items-center gap-1">
                                <Progress value={selectedUserProfile.structuredProfile?.assessment_metadata.overall_confidence || 0} className="w-20 h-2" />
                                <span className="text-xs font-medium">{selectedUserProfile.structuredProfile?.assessment_metadata.overall_confidence || 0}%</span>
                              </div>
                            </div>
                            {selectedUserProfile.structuredProfile?.assessment_metadata.assessment_version && (
                              <Badge variant="outline" className="text-xs">
                                Profile V{selectedUserProfile.structuredProfile?.assessment_metadata.assessment_version}
                              </Badge>
                            )}
                          </div>
                          {selectedUserProfile.structuredProfile?.assessment_metadata.confidence_explanation && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                              {selectedUserProfile.structuredProfile?.assessment_metadata.confidence_explanation}
                            </p>
                          )}
                          {selectedUserProfile.structuredProfile?.assessment_metadata.caveats?.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {selectedUserProfile.structuredProfile?.assessment_metadata.caveats.map((caveat: string, i: number) => (
                                <Badge key={i} variant="outline" className="text-xs text-orange-600 border-orange-300">
                                  {caveat}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* V4: Tags */}
                      {selectedUserProfile.structuredProfile?.tags?.length > 0 && (
                        <div className="mb-4">
                          <div className="flex flex-wrap gap-1">
                            {selectedUserProfile.structuredProfile?.tags.map((tag: string, i: number) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Skills & Capabilities - V3 */}
                      {selectedUserProfile.structuredProfile?.skills_and_capabilities && (
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 mb-4">
                          <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-3">Skills & Capabilities</h4>

                          {/* Skill Depth Analysis */}
                          {selectedUserProfile.structuredProfile?.skills_and_capabilities.skill_depth_analysis && (
                            <div className="space-y-2 mb-3">
                              {selectedUserProfile.structuredProfile?.skills_and_capabilities.skill_depth_analysis.expert_level?.length > 0 && (
                                <div>
                                  <div className="text-xs font-medium text-green-600 mb-1">Expert Level</div>
                                  <div className="flex flex-wrap gap-1">
                                    {selectedUserProfile.structuredProfile?.skills_and_capabilities.skill_depth_analysis.expert_level.map((skill: string, i: number) => (
                                      <Badge key={i} className="text-xs bg-green-100 text-green-800">{skill}</Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {selectedUserProfile.structuredProfile?.skills_and_capabilities.skill_depth_analysis.proficient_level?.length > 0 && (
                                <div>
                                  <div className="text-xs font-medium text-blue-600 mb-1">Proficient Level</div>
                                  <div className="flex flex-wrap gap-1">
                                    {selectedUserProfile.structuredProfile?.skills_and_capabilities.skill_depth_analysis.proficient_level.map((skill: string, i: number) => (
                                      <Badge key={i} className="text-xs bg-blue-100 text-blue-800">{skill}</Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {selectedUserProfile.structuredProfile?.skills_and_capabilities.skill_depth_analysis.basic_level?.length > 0 && (
                                <div>
                                  <div className="text-xs font-medium text-slate-600 mb-1">Basic Level</div>
                                  <div className="flex flex-wrap gap-1">
                                    {selectedUserProfile.structuredProfile?.skills_and_capabilities.skill_depth_analysis.basic_level.map((skill: string, i: number) => (
                                      <Badge key={i} variant="outline" className="text-xs">{skill}</Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {selectedUserProfile.structuredProfile?.skills_and_capabilities.strengths_summary && (
                            <p className="text-sm text-slate-600 dark:text-slate-400 p-2 bg-green-50 dark:bg-green-900/20 rounded mb-2">
                              <strong>Strengths:</strong> {selectedUserProfile.structuredProfile?.skills_and_capabilities.strengths_summary}
                            </p>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    /* Legacy v1/v2 rendering (backward compatibility) - but still try V4 scores first */
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                        <div className="text-center">
                          <div className={`text-3xl font-bold mb-2 ${getScoreColorClass(selectedUserProfile?.structuredProfile?.scores?.overall_score?.value || selectedUserProfile?.structuredProfile?.scores?.overall_score?.score || selectedUserProfile?.matchScorePercentage || selectedApplicant?.matchScore || 0)}`}>
                            {selectedUserProfile?.structuredProfile?.scores?.overall_score?.value ?? selectedUserProfile?.structuredProfile?.scores?.overall_score?.score ?? selectedUserProfile?.matchScorePercentage ?? selectedApplicant?.matchScore ?? 0}%
                          </div>
                          <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Overall Match</div>
                          <Progress value={selectedUserProfile?.structuredProfile?.scores?.overall_score?.value ?? selectedUserProfile?.structuredProfile?.scores?.overall_score?.score ?? selectedUserProfile?.matchScorePercentage ?? selectedApplicant?.matchScore ?? 0} className="h-1.5 mt-2" />
                        </div>
                        <div className="text-center">
                          <div className={`text-3xl font-bold mb-2 ${getScoreColorClass(selectedUserProfile?.structuredProfile?.scores?.technical_competence?.score || selectedUserProfile?.techSkillsPercentage || selectedApplicant?.technicalScore || 0)}`}>
                            {selectedUserProfile?.structuredProfile?.scores?.technical_competence?.score ?? selectedUserProfile?.techSkillsPercentage ?? selectedApplicant?.technicalScore ?? 0}%
                          </div>
                          <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Technical Skills</div>
                          <Progress value={selectedUserProfile?.structuredProfile?.scores?.technical_competence?.score ?? selectedUserProfile?.techSkillsPercentage ?? selectedApplicant?.technicalScore ?? 0} className="h-1.5 mt-2" />
                        </div>
                        <div className="text-center">
                          <div className={`text-3xl font-bold mb-2 ${getScoreColorClass(selectedUserProfile?.structuredProfile?.scores?.experience_quality?.score || selectedUserProfile?.experiencePercentage || selectedApplicant?.experienceScore || 0)}`}>
                            {selectedUserProfile?.structuredProfile?.scores?.experience_quality?.score ?? selectedUserProfile?.experiencePercentage ?? selectedApplicant?.experienceScore ?? 0}%
                          </div>
                          <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Experience</div>
                          <Progress value={selectedUserProfile?.structuredProfile?.scores?.experience_quality?.score ?? selectedUserProfile?.experiencePercentage ?? selectedApplicant?.experienceScore ?? 0} className="h-1.5 mt-2" />
                        </div>
                        <div className="text-center">
                          <div className={`text-3xl font-bold mb-2 ${getScoreColorClass(selectedUserProfile?.structuredProfile?.scores?.cultural_collaboration_fit?.score || selectedUserProfile?.culturalFitPercentage || selectedApplicant?.culturalFitScore || 0)}`}>
                            {selectedUserProfile?.structuredProfile?.scores?.cultural_collaboration_fit?.score ?? selectedUserProfile?.culturalFitPercentage ?? selectedApplicant?.culturalFitScore ?? 0}%
                          </div>
                          <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Cultural Fit</div>
                          <Progress value={selectedUserProfile?.structuredProfile?.scores?.cultural_collaboration_fit?.score ?? selectedUserProfile?.culturalFitPercentage ?? selectedApplicant?.culturalFitScore ?? 0} className="h-1.5 mt-2" />
                        </div>
                      </div>

                      {/* Legacy AI Analysis Summary */}
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-4">
                        <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">AI Assessment Summary</h4>
                        <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                          {selectedApplicant.matchSummary ? (
                            <p>{selectedApplicant.matchSummary}</p>
                          ) : selectedUserProfile?.userProfile ? (
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {selectedUserProfile.userProfile.length > 500
                                  ? selectedUserProfile.userProfile.substring(0, 500) + '...'
                                  : selectedUserProfile.userProfile
                                }
                              </ReactMarkdown>
                            </div>
                          ) : (
                            <p>This candidate demonstrates potential for the {selectedApplicant.jobTitle} position.</p>
                          )}
                        </div>
                      </div>
                    </>
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

                {/* Assessment Responses Section */}
                {selectedApplicant?.assessmentResponses && selectedApplicant.assessmentResponses.responses.length > 0 && (
                  <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Assessment Responses</h3>
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        Completed {new Date(selectedApplicant.assessmentResponses.completedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="space-y-4">
                      {selectedApplicant.assessmentResponses.responses.map((response, index) => (
                        <div key={response.questionId || index} className="border-b border-slate-100 dark:border-slate-700 pb-4 last:border-0 last:pb-0">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            {index + 1}. {response.questionText}
                          </p>
                          <div className="text-slate-600 dark:text-slate-400">
                            {response.type === 'multiple_choice' && Array.isArray(response.answer) ? (
                              <div className="flex flex-wrap gap-2">
                                {response.answer.map((option, i) => (
                                  <Badge key={i} variant="outline" className="text-sm">
                                    {option}
                                  </Badge>
                                ))}
                              </div>
                            ) : response.type === 'yes_no' ? (
                              <Badge variant={response.answer === true || response.answer === 'true' ? 'default' : 'secondary'}>
                                {response.answer === true || response.answer === 'true' ? 'Yes' : 'No'}
                              </Badge>
                            ) : response.type === 'rating' ? (
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`w-5 h-5 ${
                                      star <= Number(response.answer)
                                        ? 'text-yellow-400 fill-yellow-400'
                                        : 'text-slate-300 dark:text-slate-600'
                                    }`}
                                  />
                                ))}
                                <span className="ml-2 text-sm">({response.answer}/5)</span>
                              </div>
                            ) : response.type === 'file_upload' && response.fileUrl ? (
                              <a
                                href={response.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                              >
                                <Download className="w-4 h-4" />
                                View uploaded file
                              </a>
                            ) : response.type === 'numeric' ? (
                              <span className="font-medium">{response.answer}</span>
                            ) : (
                              <p className="whitespace-pre-wrap">{String(response.answer)}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
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