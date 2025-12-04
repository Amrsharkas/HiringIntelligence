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
        
        const response = await fetch(`/api/public-profile/${encodeURIComponent(applicant.applicantUserId)}`);
        if (response.ok) {
          const userProfile = await response.json();

          console.log({
            userProfile
          });
          
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

                  {/* Check if we have v3 structured profile data */}
                  {selectedUserProfile?.profileVersion >= 3 && selectedUserProfile?.structuredProfile ? (
                    <>
                      {/* Executive Summary Banner */}
                      {selectedUserProfile.structuredProfile.executiveSummary && (
                        <div className="p-4 rounded-lg bg-gradient-to-r from-slate-900 to-slate-800 text-white mb-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <span className="text-lg font-bold">
                                {selectedUserProfile.structuredProfile.executiveSummary.one_liner || 'Candidate Analysis'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {selectedUserProfile.structuredProfile.executiveSummary.fit_score && (
                                <Badge className={`text-xs ${getFitScoreColor(selectedUserProfile.structuredProfile.executiveSummary.fit_score)}`}>
                                  {selectedUserProfile.structuredProfile.executiveSummary.fit_score} FIT
                                </Badge>
                              )}
                              {selectedUserProfile.structuredProfile.executiveSummary.hiring_urgency && (
                                <Badge className={`text-xs ${
                                  selectedUserProfile.structuredProfile.executiveSummary.hiring_urgency === 'EXPEDITE' ? 'bg-green-600' :
                                  selectedUserProfile.structuredProfile.executiveSummary.hiring_urgency === 'STANDARD' ? 'bg-blue-600' :
                                  selectedUserProfile.structuredProfile.executiveSummary.hiring_urgency === 'LOW_PRIORITY' ? 'bg-gray-600' :
                                  'bg-red-600'
                                }`}>
                                  {selectedUserProfile.structuredProfile.executiveSummary.hiring_urgency.replace('_', ' ')}
                                </Badge>
                              )}
                            </div>
                          </div>
                          {selectedUserProfile.structuredProfile.executiveSummary.competitive_position && (
                            <p className="text-xs text-slate-300 mt-2">
                              {selectedUserProfile.structuredProfile.executiveSummary.competitive_position}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Verdict & Recommendation Section */}
                      {selectedUserProfile.structuredProfile.verdict && (
                        <div className="p-4 rounded-lg border-2 border-gray-300 dark:border-slate-600 bg-gradient-to-r from-gray-50 to-white dark:from-slate-800 dark:to-slate-900 mb-4">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <Badge className={`text-lg px-4 py-2 font-bold ${getVerdictColor(selectedUserProfile.structuredProfile.verdict.decision)}`}>
                                {selectedUserProfile.structuredProfile.verdict.decision === 'INTERVIEW' ? '✓ INTERVIEW' :
                                 selectedUserProfile.structuredProfile.verdict.decision === 'CONSIDER' ? '? CONSIDER' :
                                 selectedUserProfile.structuredProfile.verdict.decision === 'REVIEW' ? '⚠ REVIEW' :
                                 '✗ NOT SUITABLE'}
                              </Badge>
                              {selectedUserProfile.structuredProfile.verdict.confidence && (
                                <span className={`text-xs font-medium px-2 py-1 rounded ${getConfidenceColor(selectedUserProfile.structuredProfile.verdict.confidence)}`}>
                                  {selectedUserProfile.structuredProfile.verdict.confidence} Confidence
                                </span>
                              )}
                              {selectedUserProfile.structuredProfile.verdict.risk_level && (
                                <span className={`text-xs font-medium px-2 py-1 rounded ${getRiskColor(selectedUserProfile.structuredProfile.verdict.risk_level)}`}>
                                  {selectedUserProfile.structuredProfile.verdict.risk_level} Risk
                                </span>
                              )}
                            </div>
                          </div>

                          {selectedUserProfile.structuredProfile.verdict.summary && (
                            <p className="text-base font-medium text-gray-800 dark:text-slate-200 mb-3">
                              {selectedUserProfile.structuredProfile.verdict.summary}
                            </p>
                          )}

                          <div className="grid grid-cols-2 gap-4">
                            {selectedUserProfile.structuredProfile.verdict.top_strength && (
                              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                                <div className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1 flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3" /> TOP STRENGTH
                                </div>
                                <div className="text-sm text-green-800 dark:text-green-200">
                                  {selectedUserProfile.structuredProfile.verdict.top_strength}
                                </div>
                              </div>
                            )}
                            {selectedUserProfile.structuredProfile.verdict.top_concern &&
                             selectedUserProfile.structuredProfile.verdict.top_concern !== 'None significant' &&
                             selectedUserProfile.structuredProfile.verdict.top_concern !== 'None' ? (
                              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-700">
                                <div className="text-xs font-semibold text-orange-600 dark:text-orange-400 mb-1 flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" /> TOP CONCERN
                                </div>
                                <div className="text-sm text-orange-800 dark:text-orange-200">
                                  {selectedUserProfile.structuredProfile.verdict.top_concern}
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
                          {selectedUserProfile.structuredProfile.verdict.dealbreakers &&
                           selectedUserProfile.structuredProfile.verdict.dealbreakers.length > 0 && (
                            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700">
                              <div className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">DEALBREAKERS</div>
                              <ul className="text-sm text-red-800 dark:text-red-200">
                                {selectedUserProfile.structuredProfile.verdict.dealbreakers.map((item: string, i: number) => (
                                  <li key={i} className="flex items-start gap-1">
                                    <span className="text-red-500">✗</span> {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Score Breakdown with Sub-scores */}
                      {selectedUserProfile.structuredProfile.detailedBreakdown && (
                        <div className="space-y-4 mb-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {/* Overall Match */}
                            <div className={`text-center p-4 rounded-lg ${getScoreBgClass(selectedUserProfile?.matchScorePercentage || 0)}`}>
                              <div className={`text-3xl font-bold mb-1 ${getScoreColorClass(selectedUserProfile?.matchScorePercentage || 0)}`}>
                                {selectedUserProfile?.matchScorePercentage || 0}%
                              </div>
                              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Overall Match</div>
                              <Progress value={selectedUserProfile?.matchScorePercentage || 0} className="h-1.5 mt-2" />
                            </div>
                            {/* Technical Skills */}
                            <div className={`text-center p-4 rounded-lg ${getScoreBgClass(selectedUserProfile.structuredProfile.detailedBreakdown.technical_skills?.score || selectedUserProfile?.techSkillsPercentage || 0)}`}>
                              <div className={`text-3xl font-bold mb-1 ${getScoreColorClass(selectedUserProfile.structuredProfile.detailedBreakdown.technical_skills?.score || selectedUserProfile?.techSkillsPercentage || 0)}`}>
                                {selectedUserProfile.structuredProfile.detailedBreakdown.technical_skills?.score || selectedUserProfile?.techSkillsPercentage || 0}%
                              </div>
                              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Technical Skills</div>
                              <Progress value={selectedUserProfile.structuredProfile.detailedBreakdown.technical_skills?.score || selectedUserProfile?.techSkillsPercentage || 0} className="h-1.5 mt-2" />
                            </div>
                            {/* Experience */}
                            <div className={`text-center p-4 rounded-lg ${getScoreBgClass(selectedUserProfile.structuredProfile.detailedBreakdown.experience?.score || selectedUserProfile?.experiencePercentage || 0)}`}>
                              <div className={`text-3xl font-bold mb-1 ${getScoreColorClass(selectedUserProfile.structuredProfile.detailedBreakdown.experience?.score || selectedUserProfile?.experiencePercentage || 0)}`}>
                                {selectedUserProfile.structuredProfile.detailedBreakdown.experience?.score || selectedUserProfile?.experiencePercentage || 0}%
                              </div>
                              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Experience</div>
                              <Progress value={selectedUserProfile.structuredProfile.detailedBreakdown.experience?.score || selectedUserProfile?.experiencePercentage || 0} className="h-1.5 mt-2" />
                            </div>
                            {/* Cultural Fit */}
                            <div className={`text-center p-4 rounded-lg ${getScoreBgClass(selectedUserProfile.structuredProfile.detailedBreakdown.cultural_fit?.score || selectedUserProfile?.culturalFitPercentage || 0)}`}>
                              <div className={`text-3xl font-bold mb-1 ${getScoreColorClass(selectedUserProfile.structuredProfile.detailedBreakdown.cultural_fit?.score || selectedUserProfile?.culturalFitPercentage || 0)}`}>
                                {selectedUserProfile.structuredProfile.detailedBreakdown.cultural_fit?.score || selectedUserProfile?.culturalFitPercentage || 0}%
                              </div>
                              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Cultural Fit</div>
                              <Progress value={selectedUserProfile.structuredProfile.detailedBreakdown.cultural_fit?.score || selectedUserProfile?.culturalFitPercentage || 0} className="h-1.5 mt-2" />
                            </div>
                          </div>

                          {/* Sub-scores - Expanded */}
                          <div className="space-y-4">
                            {/* Technical Sub-scores */}
                            {selectedUserProfile.structuredProfile.detailedBreakdown.technical_skills?.sub_scores && (
                              <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                                  Technical Skills Breakdown
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                  {Object.entries(selectedUserProfile.structuredProfile.detailedBreakdown.technical_skills.sub_scores).map(([key, value]: [string, any]) => (
                                    <div key={key} className="p-2 bg-slate-50 dark:bg-slate-800 rounded">
                                      <div className="text-xs text-slate-500 dark:text-slate-400 capitalize">{key.replace('_', ' ')}</div>
                                      <div className={`text-lg font-bold ${getScoreColorClass(typeof value === 'number' ? value : 0)}`}>
                                        {typeof value === 'number' ? value : 0}%
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                {selectedUserProfile.structuredProfile.detailedBreakdown.technical_skills.evidence && (
                                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-3 p-2 bg-slate-100 dark:bg-slate-900 rounded">
                                    {selectedUserProfile.structuredProfile.detailedBreakdown.technical_skills.evidence}
                                  </p>
                                )}
                                {selectedUserProfile.structuredProfile.detailedBreakdown.technical_skills.matched_skills?.length > 0 && (
                                  <div className="mt-3">
                                    <div className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">Matched Skills</div>
                                    <div className="flex flex-wrap gap-1">
                                      {selectedUserProfile.structuredProfile.detailedBreakdown.technical_skills.matched_skills.map((skill: string, i: number) => (
                                        <Badge key={i} className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                          {skill}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {selectedUserProfile.structuredProfile.detailedBreakdown.technical_skills.missing_skills?.length > 0 && (
                                  <div className="mt-2">
                                    <div className="text-xs font-medium text-orange-600 dark:text-orange-400 mb-1">Missing Skills</div>
                                    <div className="flex flex-wrap gap-1">
                                      {selectedUserProfile.structuredProfile.detailedBreakdown.technical_skills.missing_skills.map((skill: string, i: number) => (
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
                            {selectedUserProfile.structuredProfile.detailedBreakdown.experience?.sub_scores && (
                              <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                                  Experience Breakdown
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                  {Object.entries(selectedUserProfile.structuredProfile.detailedBreakdown.experience.sub_scores).map(([key, value]: [string, any]) => (
                                    <div key={key} className="p-2 bg-slate-50 dark:bg-slate-800 rounded">
                                      <div className="text-xs text-slate-500 dark:text-slate-400 capitalize">{key.replace('_', ' ')}</div>
                                      <div className={`text-lg font-bold ${getScoreColorClass(typeof value === 'number' ? value : 0)}`}>
                                        {typeof value === 'number' ? value : 0}%
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                {selectedUserProfile.structuredProfile.detailedBreakdown.experience.evidence && (
                                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-3 p-2 bg-slate-100 dark:bg-slate-900 rounded">
                                    {selectedUserProfile.structuredProfile.detailedBreakdown.experience.evidence}
                                  </p>
                                )}
                                {selectedUserProfile.structuredProfile.detailedBreakdown.experience.matched_experience?.length > 0 && (
                                  <div className="mt-3">
                                    <div className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">Matched Experience</div>
                                    <div className="flex flex-wrap gap-1">
                                      {selectedUserProfile.structuredProfile.detailedBreakdown.experience.matched_experience.map((exp: string, i: number) => (
                                        <Badge key={i} className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                          {exp}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {selectedUserProfile.structuredProfile.detailedBreakdown.experience.gaps?.length > 0 && (
                                  <div className="mt-2">
                                    <div className="text-xs font-medium text-orange-600 dark:text-orange-400 mb-1">Experience Gaps</div>
                                    <div className="flex flex-wrap gap-1">
                                      {selectedUserProfile.structuredProfile.detailedBreakdown.experience.gaps.map((gap: string, i: number) => (
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
                            {selectedUserProfile.structuredProfile.detailedBreakdown.cultural_fit?.sub_scores && (
                              <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                                  Cultural Fit Breakdown
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                  {Object.entries(selectedUserProfile.structuredProfile.detailedBreakdown.cultural_fit.sub_scores).map(([key, value]: [string, any]) => (
                                    <div key={key} className="p-2 bg-slate-50 dark:bg-slate-800 rounded">
                                      <div className="text-xs text-slate-500 dark:text-slate-400 capitalize">{key.replace('_', ' ')}</div>
                                      <div className={`text-lg font-bold ${getScoreColorClass(typeof value === 'number' ? value : 0)}`}>
                                        {typeof value === 'number' ? value : 0}%
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                {selectedUserProfile.structuredProfile.detailedBreakdown.cultural_fit.evidence && (
                                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-3 p-2 bg-slate-100 dark:bg-slate-900 rounded">
                                    {selectedUserProfile.structuredProfile.detailedBreakdown.cultural_fit.evidence}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Cross-Reference Analysis */}
                      {selectedUserProfile.structuredProfile.crossReferenceAnalysis && (
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-4 mb-4">
                          <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                            <Shield className="h-4 w-4" /> Resume-Interview Cross-Reference
                          </h4>
                          <div className="space-y-3">
                            {selectedUserProfile.structuredProfile.crossReferenceAnalysis.verified_claims?.length > 0 && (
                              <div>
                                <div className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">Verified Claims</div>
                                <div className="flex flex-wrap gap-1">
                                  {selectedUserProfile.structuredProfile.crossReferenceAnalysis.verified_claims.map((claim: string, i: number) => (
                                    <Badge key={i} className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                      <CheckCircle className="h-3 w-3 mr-1" /> {claim}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            {selectedUserProfile.structuredProfile.crossReferenceAnalysis.resume_interview_discrepancies?.length > 0 && (
                              <div>
                                <div className="text-xs font-medium text-orange-600 dark:text-orange-400 mb-1">Discrepancies Found</div>
                                <div className="flex flex-wrap gap-1">
                                  {selectedUserProfile.structuredProfile.crossReferenceAnalysis.resume_interview_discrepancies.map((disc: string, i: number) => (
                                    <Badge key={i} className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                                      <AlertTriangle className="h-3 w-3 mr-1" /> {disc}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            {selectedUserProfile.structuredProfile.crossReferenceAnalysis.unverified_claims?.length > 0 && (
                              <div>
                                <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Unverified Claims</div>
                                <div className="flex flex-wrap gap-1">
                                  {selectedUserProfile.structuredProfile.crossReferenceAnalysis.unverified_claims.map((claim: string, i: number) => (
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
                      {selectedUserProfile.structuredProfile.redFlags && selectedUserProfile.structuredProfile.redFlags.length > 0 && (
                        <div className="bg-red-50 dark:bg-red-900/20 rounded-md p-4 mb-4 border border-red-200 dark:border-red-700">
                          <h4 className="font-semibold text-red-700 dark:text-red-400 mb-3 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" /> Red Flags ({selectedUserProfile.structuredProfile.redFlags.length})
                          </h4>
                          <div className="space-y-2">
                            {selectedUserProfile.structuredProfile.redFlags.map((flag: any, i: number) => (
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
                      {selectedUserProfile.structuredProfile.competitiveIntel && (
                        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-md p-4 border border-purple-200 dark:border-purple-700 mb-4">
                          <h4 className="font-semibold text-purple-700 dark:text-purple-400 mb-3 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" /> Competitive Intelligence
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                            {selectedUserProfile.structuredProfile.competitiveIntel.market_position && (
                              <div className="p-2 bg-white dark:bg-slate-800 rounded border">
                                <div className="text-slate-500 dark:text-slate-400">Market Position</div>
                                <div className="font-medium text-purple-700 dark:text-purple-300">
                                  {selectedUserProfile.structuredProfile.competitiveIntel.market_position}
                                </div>
                              </div>
                            )}
                            {selectedUserProfile.structuredProfile.competitiveIntel.growth_potential && (
                              <div className="p-2 bg-white dark:bg-slate-800 rounded border">
                                <div className="text-slate-500 dark:text-slate-400">Growth Potential</div>
                                <Badge className={`text-xs ${
                                  selectedUserProfile.structuredProfile.competitiveIntel.growth_potential === 'HIGH' ? 'bg-green-100 text-green-700' :
                                  selectedUserProfile.structuredProfile.competitiveIntel.growth_potential === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {selectedUserProfile.structuredProfile.competitiveIntel.growth_potential}
                                </Badge>
                              </div>
                            )}
                            {selectedUserProfile.structuredProfile.competitiveIntel.flight_risk && (
                              <div className="p-2 bg-white dark:bg-slate-800 rounded border">
                                <div className="text-slate-500 dark:text-slate-400">Flight Risk</div>
                                <Badge className={`text-xs ${
                                  selectedUserProfile.structuredProfile.competitiveIntel.flight_risk === 'LOW' ? 'bg-green-100 text-green-700' :
                                  selectedUserProfile.structuredProfile.competitiveIntel.flight_risk === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {selectedUserProfile.structuredProfile.competitiveIntel.flight_risk}
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Interview Analysis Section */}
                      {selectedUserProfile.structuredProfile.interviewAnalysis && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700 mb-4">
                          <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-3 flex items-center gap-2">
                            <Briefcase className="h-4 w-4" /> Interview Analysis
                          </h4>

                          {/* Transcript Summary */}
                          {selectedUserProfile.structuredProfile.interviewAnalysis.transcript_summary && (
                            <div className="mb-4 p-3 bg-white dark:bg-slate-800 rounded border">
                              <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Interview Summary</div>
                              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">
                                {selectedUserProfile.structuredProfile.interviewAnalysis.transcript_summary}
                              </p>
                            </div>
                          )}

                          {/* Response Quality Ratings */}
                          {selectedUserProfile.structuredProfile.interviewAnalysis.response_quality && (
                            <div className="mb-4">
                              <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Response Quality</div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {Object.entries(selectedUserProfile.structuredProfile.interviewAnalysis.response_quality).map(([key, value]: [string, any]) => (
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
                          {selectedUserProfile.structuredProfile.interviewAnalysis.communication_patterns && (
                            <div className="mb-4">
                              <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Communication Patterns</div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {selectedUserProfile.structuredProfile.interviewAnalysis.communication_patterns.ownership_language && (
                                  <div className="p-2 bg-white dark:bg-slate-800 rounded border">
                                    <div className="text-xs text-slate-500">Ownership Language</div>
                                    <p className="text-sm text-slate-700 dark:text-slate-300">
                                      {selectedUserProfile.structuredProfile.interviewAnalysis.communication_patterns.ownership_language}
                                    </p>
                                  </div>
                                )}
                                {selectedUserProfile.structuredProfile.interviewAnalysis.communication_patterns.technical_fluency && (
                                  <div className="p-2 bg-white dark:bg-slate-800 rounded border">
                                    <div className="text-xs text-slate-500">Technical Fluency</div>
                                    <p className="text-sm text-slate-700 dark:text-slate-300">
                                      {selectedUserProfile.structuredProfile.interviewAnalysis.communication_patterns.technical_fluency}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Strongest Moments */}
                          {selectedUserProfile.structuredProfile.interviewAnalysis.strongest_moments?.length > 0 && (
                            <div className="mb-4">
                              <div className="text-xs font-medium text-green-600 dark:text-green-400 mb-2">Strongest Moments</div>
                              <div className="space-y-2">
                                {selectedUserProfile.structuredProfile.interviewAnalysis.strongest_moments.map((moment: any, i: number) => (
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

                          {/* Concerning Moments */}
                          {selectedUserProfile.structuredProfile.interviewAnalysis.concerning_moments?.length > 0 && (
                            <div className="mb-4">
                              <div className="text-xs font-medium text-orange-600 dark:text-orange-400 mb-2">Concerning Moments</div>
                              <div className="space-y-2">
                                {selectedUserProfile.structuredProfile.interviewAnalysis.concerning_moments.map((moment: any, i: number) => (
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
                          {selectedUserProfile.structuredProfile.interviewAnalysis.notable_quotes?.length > 0 && (
                            <div className="mb-4">
                              <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Notable Quotes</div>
                              <div className="space-y-2">
                                {selectedUserProfile.structuredProfile.interviewAnalysis.notable_quotes.map((quote: string, i: number) => (
                                  <div key={i} className="p-2 bg-slate-100 dark:bg-slate-800 rounded border-l-2 border-blue-400">
                                    <p className="text-sm text-slate-700 dark:text-slate-300 italic">"{quote}"</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Green & Red Flags from Interview */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {selectedUserProfile.structuredProfile.interviewAnalysis.green_flags_detected?.length > 0 && (
                              <div>
                                <div className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">Green Flags</div>
                                <div className="space-y-1">
                                  {selectedUserProfile.structuredProfile.interviewAnalysis.green_flags_detected.map((flag: string, i: number) => (
                                    <Badge key={i} className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 mr-1 mb-1">
                                      <CheckCircle className="h-3 w-3 mr-1" /> {flag}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            {selectedUserProfile.structuredProfile.interviewAnalysis.red_flags_detected?.length > 0 && (
                              <div>
                                <div className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">Red Flags</div>
                                <div className="space-y-1">
                                  {selectedUserProfile.structuredProfile.interviewAnalysis.red_flags_detected.map((flag: string, i: number) => (
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

                      {/* Job Match Section */}
                      {selectedUserProfile.structuredProfile.jobMatch && (
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-700 mb-4">
                          <h4 className="font-semibold text-indigo-700 dark:text-indigo-400 mb-3 flex items-center gap-2">
                            <Briefcase className="h-4 w-4" /> Job Match Analysis: {selectedUserProfile.structuredProfile.jobMatch.job_title_evaluated_for}
                          </h4>

                          {/* Hire Recommendation Banner */}
                          {selectedUserProfile.structuredProfile.jobMatch.hire_recommendation && (
                            <div className={`p-3 rounded mb-4 ${
                              selectedUserProfile.structuredProfile.jobMatch.hire_recommendation === 'strong_match' ? 'bg-green-100 dark:bg-green-900/30 border border-green-300' :
                              selectedUserProfile.structuredProfile.jobMatch.hire_recommendation === 'good_match' ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-300' :
                              selectedUserProfile.structuredProfile.jobMatch.hire_recommendation === 'potential_match' ? 'bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300' :
                              'bg-red-100 dark:bg-red-900/30 border border-red-300'
                            }`}>
                              <div className="flex items-center justify-between">
                                <Badge className={`text-sm ${
                                  selectedUserProfile.structuredProfile.jobMatch.hire_recommendation === 'strong_match' ? 'bg-green-500 text-white' :
                                  selectedUserProfile.structuredProfile.jobMatch.hire_recommendation === 'good_match' ? 'bg-blue-500 text-white' :
                                  selectedUserProfile.structuredProfile.jobMatch.hire_recommendation === 'potential_match' ? 'bg-yellow-500 text-white' :
                                  'bg-red-500 text-white'
                                }`}>
                                  {selectedUserProfile.structuredProfile.jobMatch.hire_recommendation?.replace(/_/g, ' ').toUpperCase()}
                                </Badge>
                                {selectedUserProfile.structuredProfile.jobMatch.interest_level_in_role && (
                                  <span className="text-xs text-slate-600 dark:text-slate-400">
                                    Interest: {selectedUserProfile.structuredProfile.jobMatch.interest_level_in_role}
                                  </span>
                                )}
                              </div>
                              {selectedUserProfile.structuredProfile.jobMatch.recommendation_reasoning && (
                                <p className="text-sm mt-2 text-slate-700 dark:text-slate-300">
                                  {selectedUserProfile.structuredProfile.jobMatch.recommendation_reasoning}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Job Fit Assessment */}
                          {selectedUserProfile.structuredProfile.jobMatch.overall_job_fit_assessment && (
                            <div className="p-3 bg-white dark:bg-slate-800 rounded border mb-4">
                              <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Job Fit Assessment</div>
                              <p className="text-sm text-slate-700 dark:text-slate-300">
                                {selectedUserProfile.structuredProfile.jobMatch.overall_job_fit_assessment}
                              </p>
                            </div>
                          )}

                          {/* Requirements Met */}
                          {selectedUserProfile.structuredProfile.jobMatch.requirements_met?.length > 0 && (
                            <div className="mb-4">
                              <div className="text-xs font-medium text-green-600 dark:text-green-400 mb-2">Requirements Met</div>
                              <div className="space-y-2">
                                {selectedUserProfile.structuredProfile.jobMatch.requirements_met.map((req: any, i: number) => (
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
                          {selectedUserProfile.structuredProfile.jobMatch.requirements_not_met?.length > 0 && (
                            <div className="mb-4">
                              <div className="text-xs font-medium text-red-600 dark:text-red-400 mb-2">Requirements Not Met</div>
                              <div className="space-y-2">
                                {selectedUserProfile.structuredProfile.jobMatch.requirements_not_met.map((req: any, i: number) => (
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
                            {selectedUserProfile.structuredProfile.jobMatch.skills_mentioned_in_interview_matching_jd?.length > 0 && (
                              <div>
                                <div className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">Skills Matching JD</div>
                                <div className="flex flex-wrap gap-1">
                                  {selectedUserProfile.structuredProfile.jobMatch.skills_mentioned_in_interview_matching_jd.map((skill: string, i: number) => (
                                    <Badge key={i} className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                      {skill}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            {selectedUserProfile.structuredProfile.jobMatch.skills_in_jd_not_discussed?.length > 0 && (
                              <div>
                                <div className="text-xs font-medium text-orange-600 dark:text-orange-400 mb-1">JD Skills Not Discussed</div>
                                <div className="flex flex-wrap gap-1">
                                  {selectedUserProfile.structuredProfile.jobMatch.skills_in_jd_not_discussed.map((skill: string, i: number) => (
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
                      {selectedUserProfile.structuredProfile.careerStory && (
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 mb-4">
                          <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-3">Career Story</h4>
                          {selectedUserProfile.structuredProfile.careerStory.narrative && (
                            <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line mb-3">
                              {selectedUserProfile.structuredProfile.careerStory.narrative}
                            </p>
                          )}
                          {selectedUserProfile.structuredProfile.careerStory.key_milestones?.length > 0 && (
                            <div className="mb-2">
                              <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Key Milestones</div>
                              <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-400">
                                {selectedUserProfile.structuredProfile.careerStory.key_milestones.map((milestone: string, i: number) => (
                                  <li key={i}>{milestone}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Skills & Capabilities */}
                      {selectedUserProfile.structuredProfile.skillsAndCapabilities && (
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 mb-4">
                          <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-3">Skills & Capabilities</h4>

                          {/* Skill Depth Analysis */}
                          {selectedUserProfile.structuredProfile.skillsAndCapabilities.skill_depth_analysis && (
                            <div className="space-y-2 mb-3">
                              {selectedUserProfile.structuredProfile.skillsAndCapabilities.skill_depth_analysis.expert_level?.length > 0 && (
                                <div>
                                  <div className="text-xs font-medium text-green-600 mb-1">Expert Level</div>
                                  <div className="flex flex-wrap gap-1">
                                    {selectedUserProfile.structuredProfile.skillsAndCapabilities.skill_depth_analysis.expert_level.map((skill: string, i: number) => (
                                      <Badge key={i} className="text-xs bg-green-100 text-green-800">{skill}</Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {selectedUserProfile.structuredProfile.skillsAndCapabilities.skill_depth_analysis.proficient_level?.length > 0 && (
                                <div>
                                  <div className="text-xs font-medium text-blue-600 mb-1">Proficient Level</div>
                                  <div className="flex flex-wrap gap-1">
                                    {selectedUserProfile.structuredProfile.skillsAndCapabilities.skill_depth_analysis.proficient_level.map((skill: string, i: number) => (
                                      <Badge key={i} className="text-xs bg-blue-100 text-blue-800">{skill}</Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {selectedUserProfile.structuredProfile.skillsAndCapabilities.skill_depth_analysis.basic_level?.length > 0 && (
                                <div>
                                  <div className="text-xs font-medium text-slate-600 mb-1">Basic Level</div>
                                  <div className="flex flex-wrap gap-1">
                                    {selectedUserProfile.structuredProfile.skillsAndCapabilities.skill_depth_analysis.basic_level.map((skill: string, i: number) => (
                                      <Badge key={i} variant="outline" className="text-xs">{skill}</Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {selectedUserProfile.structuredProfile.skillsAndCapabilities.strengths_summary && (
                            <p className="text-sm text-slate-600 dark:text-slate-400 p-2 bg-green-50 dark:bg-green-900/20 rounded mb-2">
                              <strong>Strengths:</strong> {selectedUserProfile.structuredProfile.skillsAndCapabilities.strengths_summary}
                            </p>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    /* Legacy v1/v2 rendering (backward compatibility) */
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                        <div className="text-center">
                          <div className={`text-3xl font-bold mb-2 ${getScoreColorClass(selectedUserProfile?.matchScorePercentage || selectedApplicant?.matchScore || 0)}`}>
                            {selectedUserProfile?.matchScorePercentage ?? selectedApplicant?.matchScore ?? 0}%
                          </div>
                          <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Overall Match</div>
                          <Progress value={selectedUserProfile?.matchScorePercentage ?? selectedApplicant?.matchScore ?? 0} className="h-1.5 mt-2" />
                        </div>
                        <div className="text-center">
                          <div className={`text-3xl font-bold mb-2 ${getScoreColorClass(selectedUserProfile?.techSkillsPercentage || selectedApplicant?.technicalScore || 0)}`}>
                            {selectedUserProfile?.techSkillsPercentage ?? selectedApplicant?.technicalScore ?? 0}%
                          </div>
                          <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Technical Skills</div>
                          <Progress value={selectedUserProfile?.techSkillsPercentage ?? selectedApplicant?.technicalScore ?? 0} className="h-1.5 mt-2" />
                        </div>
                        <div className="text-center">
                          <div className={`text-3xl font-bold mb-2 ${getScoreColorClass(selectedUserProfile?.experiencePercentage || selectedApplicant?.experienceScore || 0)}`}>
                            {selectedUserProfile?.experiencePercentage ?? selectedApplicant?.experienceScore ?? 0}%
                          </div>
                          <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Experience</div>
                          <Progress value={selectedUserProfile?.experiencePercentage ?? selectedApplicant?.experienceScore ?? 0} className="h-1.5 mt-2" />
                        </div>
                        <div className="text-center">
                          <div className={`text-3xl font-bold mb-2 ${getScoreColorClass(selectedUserProfile?.culturalFitPercentage || selectedApplicant?.culturalFitScore || 0)}`}>
                            {selectedUserProfile?.culturalFitPercentage ?? selectedApplicant?.culturalFitScore ?? 0}%
                          </div>
                          <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Cultural Fit</div>
                          <Progress value={selectedUserProfile?.culturalFitPercentage ?? selectedApplicant?.culturalFitScore ?? 0} className="h-1.5 mt-2" />
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