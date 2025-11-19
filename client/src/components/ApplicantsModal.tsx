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
  Loader2
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BlobProvider } from '@react-pdf/renderer';
import ApplicantsPDF from './ApplicantsPDF';

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
      queryClient.invalidateQueries({ queryKey: ["/api/real-applicants", currentPage, limit, statusFilter] });
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
        {({ blob, url, loading, error }) => {
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
      case 'denied': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getStatusReadableName = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'Pending Review';
      case 'accepted': return 'Application Accepted';
      case 'denied': return 'Application Denied';
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

                {/* AI Scoring Analysis - Detailed View */}
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
                    AI Analysis & Scoring
                  </h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                    <div className="text-center">
                      <div className={`text-3xl font-bold mb-2 ${
                        (selectedUserProfile?.matchScorePercentage || selectedApplicant?.matchScore || 0) >= 80
                          ? 'text-green-600 dark:text-green-400'
                          : (selectedUserProfile?.matchScorePercentage || selectedApplicant?.matchScore || 0) >= 60
                          ? 'text-blue-600 dark:text-blue-400'
                          : (selectedUserProfile?.matchScorePercentage || selectedApplicant?.matchScore || 0) >= 40
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {selectedUserProfile?.matchScorePercentage ?? selectedApplicant?.matchScore ?? 0}%
                      </div>
                      <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Overall Match</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {selectedUserProfile?.matchScorePercentage ? '📊 Profile-based' : '📄 Application-based'}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className={`text-3xl font-bold mb-2 ${
                        (selectedUserProfile?.techSkillsPercentage || selectedApplicant?.technicalScore || 0) >= 80
                          ? 'text-green-600 dark:text-green-400'
                          : (selectedUserProfile?.techSkillsPercentage || selectedApplicant?.technicalScore || 0) >= 60
                          ? 'text-blue-600 dark:text-blue-400'
                          : (selectedUserProfile?.techSkillsPercentage || selectedApplicant?.technicalScore || 0) >= 40
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {selectedUserProfile?.techSkillsPercentage ?? selectedApplicant?.technicalScore ?? 0}%
                      </div>
                      <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Technical Skills</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {selectedUserProfile?.techSkillsPercentage ? '📊 Profile-based' : '📄 Application-based'}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className={`text-3xl font-bold mb-2 ${
                        (selectedUserProfile?.experiencePercentage || selectedApplicant?.experienceScore || 0) >= 80
                          ? 'text-green-600 dark:text-green-400'
                          : (selectedUserProfile?.experiencePercentage || selectedApplicant?.experienceScore || 0) >= 60
                          ? 'text-purple-600 dark:text-purple-400'
                          : (selectedUserProfile?.experiencePercentage || selectedApplicant?.experienceScore || 0) >= 40
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {selectedUserProfile?.experiencePercentage ?? selectedApplicant?.experienceScore ?? 0}%
                      </div>
                      <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Experience</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {selectedUserProfile?.experiencePercentage ? '📊 Profile-based' : '📄 Application-based'}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className={`text-3xl font-bold mb-2 ${
                        (selectedUserProfile?.culturalFitPercentage || selectedApplicant?.culturalFitScore || 0) >= 80
                          ? 'text-green-600 dark:text-green-400'
                          : (selectedUserProfile?.culturalFitPercentage || selectedApplicant?.culturalFitScore || 0) >= 60
                          ? 'text-orange-600 dark:text-orange-400'
                          : (selectedUserProfile?.culturalFitPercentage || selectedApplicant?.culturalFitScore || 0) >= 40
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                       {selectedUserProfile?.culturalFitPercentage ?? selectedApplicant?.culturalFitScore ?? 0}%
                      </div>
                      <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Cultural Fit</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {selectedUserProfile?.culturalFitPercentage ? '📊 Profile-based' : '📄 Application-based'}
                      </div>
                    </div>
                  </div>

                  {/* Score Quality Indicator */}
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-3 mb-4">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${
                          selectedUserProfile?.matchScorePercentage ? 'bg-green-500' : 'bg-yellow-500'
                        }`}></div>
                        <span className="font-medium">
                          {selectedUserProfile?.matchScorePercentage ? 'High-Confidence Scores' : 'Preliminary Assessment'}
                        </span>
                      </div>
                      <div className="text-slate-500">
                        {selectedUserProfile?.matchScorePercentage
                          ? 'Based on comprehensive profile analysis'
                          : 'Application data only - request full profile for detailed analysis'
                        }
                      </div>
                    </div>
                  </div>

                  {/* Detailed AI Analysis */}
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-4">
                    <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">AI Assessment Summary</h4>
                    <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-3">
                      {/* Data Source Indicator */}
                      <div className="flex items-center gap-2 text-xs">
                        <div className={`w-2 h-2 rounded-full ${selectedUserProfile?.matchScorePercentage ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                        <span>
                          {selectedUserProfile?.matchScorePercentage
                            ? '✨ Analysis based on complete candidate profile data'
                            : '📋 Analysis based on application information'}
                        </span>
                      </div>

                      {/* Summary Text */}
                      <div>
                        {selectedApplicant.matchSummary ? (
                          <p>{selectedApplicant.matchSummary}</p>
                        ) : selectedUserProfile?.userProfile ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {selectedUserProfile.userProfile.length > 300
                                ? selectedUserProfile.userProfile.substring(0, 300) + '...'
                                : selectedUserProfile.userProfile
                              }
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p>This candidate demonstrates potential for the {selectedApplicant.jobTitle} position.
                          {selectedUserProfile?.matchScorePercentage
                            ? ' Their comprehensive profile analysis reveals specific strengths and areas of alignment with the role requirements.'
                            : ' Analysis is based on application data and would benefit from additional profile information for a complete assessment.'
                          }</p>
                        )}
                      </div>

                      {/* Confidence Indicator */}
                      {selectedUserProfile?.matchScorePercentage && (
                        <div className="text-xs bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded p-2">
                          <span className="font-medium">🎯 High-Confidence Analysis:</span> Complete profile data available with detailed scoring breakdown
                        </div>
                      )}
                    </div>
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
                        <div className="text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-800 p-4 rounded-md prose prose-sm dark:prose-invert max-w-none max-h-96 overflow-y-auto">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {selectedUserProfile.userProfile}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}

                    {/* Professional Summary */}
                    {selectedUserProfile.professionalSummary && (
                      <div>
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400 block mb-2">Professional Summary</label>
                        <div className="text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-800 p-4 rounded-md prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {selectedUserProfile.professionalSummary}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}

                    {/* Work Experience */}
                    {(selectedUserProfile.workExperience || selectedUserProfile.experience) && (
                      <div>
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400 block mb-2">Work Experience</label>
                        <div className="text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-800 p-4 rounded-md prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {selectedUserProfile.workExperience || selectedUserProfile.experience}
                          </ReactMarkdown>
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
                        <div className="text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-800 p-4 rounded-md prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {selectedUserProfile.education}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}

                    {/* Skills */}
                    {selectedUserProfile.skills && (
                      <div>
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400 block mb-2">Skills & Competencies</label>
                        <div className="text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-800 p-4 rounded-md prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {selectedUserProfile.skills}
                          </ReactMarkdown>
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
                        <div className="text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-800 p-4 rounded-md prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {selectedUserProfile.skills}
                          </ReactMarkdown>
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
                        <div className="text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-800 p-4 rounded-md prose prose-sm dark:prose-invert max-w-none max-h-48 overflow-y-auto">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {selectedUserProfile.coverLetter}
                          </ReactMarkdown>
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
                        <div className="text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-800 p-4 rounded-md prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {selectedUserProfile.additionalInfo}
                          </ReactMarkdown>
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