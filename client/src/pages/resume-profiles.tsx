import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from '@/components/ui/pagination';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Search, User, Briefcase, Star, Download, Trash2, Loader2, MailCheck, Mail, AlertTriangle, CheckCircle, FileText, Users, ChevronDown, ChevronRight, X, ArrowLeft } from 'lucide-react';
import { BlobProvider } from '@react-pdf/renderer';
import ProfilePDF from '@/components/ProfilePDF';
import ProfilesPDF from '@/components/ProfilesPDF';

interface ResumeProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  summary: string;
  experience: string[];
  skills: string[];
  education: string[];
  certifications: string[];
  languages: string[];
  resumeText: string;
  createdAt: string;
}

interface JobScoring {
  jobId: string;
  jobTitle: string;
  overallScore: number;
  technicalSkillsScore: number;
  experienceScore: number;
  culturalFitScore: number;
  matchSummary: string;
  strengthsHighlights: string[];
  improvementAreas: string[];
  disqualified?: boolean;
  disqualificationReason?: string;
  redFlags?: Array<{
    issue: string;
    evidence: string;
    reason: string;
  }>;
  invitationStatus?: string | null;
  interviewDate?: Date | null;
  interviewTime?: string | null;
  interviewLink?: string | null;
  fullResponse?: any;
}

interface ProfileWithScores extends ResumeProfile {
  jobScores: JobScoring[];
}

// Flattened row structure for table display
interface ProfileJobRow {
  profileId: string;
  name: string;
  email: string;
  phone: string;
  jobId: string;
  jobTitle: string;
  overallScore: number;
  technicalSkillsScore: number;
  experienceScore: number;
  culturalFitScore: number;
  disqualified: boolean;
  invitationStatus: string | null;
  profile: ProfileWithScores;
  jobScore: JobScoring;
}

export default function ResumeProfiles() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJobFilter, setSelectedJobFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [selectedProfile, setSelectedProfile] = useState<ProfileWithScores | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Fetch company job postings
  const { data: jobs = [] } = useQuery<any[]>({
    queryKey: ['/api/job-postings'],
  });

  // Fetch resume profiles with pagination
  const { data: profilesResponse, isLoading: profilesLoading } = useQuery<{
    data: ProfileWithScores[];
    pagination: any;
  }>({
    queryKey: ['/api/resume-profiles', currentPage, itemsPerPage],
    queryFn: async () => {
      const response = await fetch(`/api/resume-profiles?page=${currentPage}&limit=${itemsPerPage}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch resume profiles');
      }
      return response.json();
    }
  });

  const profiles = profilesResponse?.data || [];
  const serverPagination = profilesResponse?.pagination;

  // Flatten profiles into profile-job rows
  const flattenedRows = useMemo(() => {
    const rows: ProfileJobRow[] = [];
    profiles.forEach(profile => {
      profile.jobScores.forEach(jobScore => {
        rows.push({
          profileId: profile.id,
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
          jobId: jobScore.jobId,
          jobTitle: jobScore.jobTitle,
          overallScore: jobScore.overallScore,
          technicalSkillsScore: jobScore.technicalSkillsScore,
          experienceScore: jobScore.experienceScore,
          culturalFitScore: jobScore.culturalFitScore,
          disqualified: jobScore.disqualified || false,
          invitationStatus: jobScore.invitationStatus || null,
          profile,
          jobScore
        });
      });
    });
    return rows;
  }, [profiles]);

  // For server-side pagination, we don't need client-side pagination logic
  // The API handles pagination and filtering
  const totalPages = serverPagination?.totalPages || 1;
  const totalItems = serverPagination?.totalItems || 0;

  // Reset to page 1 when filters change
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  // Helper function to generate pagination items
  const generatePaginationItems = () => {
    const items = [];

    if (totalPages <= 7) {
      // Show all pages if total pages is 7 or less
      for (let i = 1; i <= totalPages; i++) {
        items.push(i);
      }
    } else {
      // Show first page
      items.push(1);

      if (currentPage > 3) {
        items.push('ellipsis');
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        items.push(i);
      }

      if (currentPage < totalPages - 2) {
        items.push('ellipsis');
      }

      // Show last page
      items.push(totalPages);
    }

    return items;
  };

  // Invite applicant mutation
  const inviteApplicantMutation = useMutation({
    mutationFn: async ({ profileId, jobId }: { profileId: string; jobId: string }) => {
      const response = await apiRequest('POST', '/api/invite-applicant', {
        profileId,
        jobId
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Invitation Sent",
        description: "Applicant has been invited successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/resume-profiles'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Invitation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete profile mutation
  const deleteProfileMutation = useMutation({
    mutationFn: async (profileId: string) => {
      const response = await apiRequest('DELETE', `/api/resume-profiles/${profileId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile Deleted",
        description: "Resume profile has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/resume-profiles'] });
      setSelectedProfile(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Deletion Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete all profiles mutation
  const deleteAllProfilesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('DELETE', '/api/resume-profiles');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "All Profiles Deleted",
        description: data.message || "All resume profiles have been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/resume-profiles'] });
      setSelectedProfile(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Deletion Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Export single profile as PDF
  const exportSingleProfile = (profile: ProfileWithScores) => {
    const fileName = `resume_${profile.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;

    return (
      <BlobProvider document={<ProfilePDF profile={profile} jobs={jobs} />}>
        {({ blob, loading, error }) => {
          if (loading) {
            return (
              <Button variant="outline" size="sm" disabled>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                PDF...
              </Button>
            );
          }

          if (error) {
            return (
              <Button variant="outline" size="sm" disabled>
                Error
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
                description: `${profile.name}'s profile has been exported successfully`,
              });
            }
          };

          return (
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-3 w-3 mr-1" />
              PDF
            </Button>
          );
        }}
      </BlobProvider>
    );
  };

  // Export all filtered profiles as PDF
  const exportAllProfiles = () => {
    // Get unique profiles from flattened rows
    const uniqueProfiles = Array.from(
      new Map(flattenedRows.map(row => [row.profileId, row.profile])).values()
    );

    const fileName = `resume_profiles_export_${new Date().toISOString().split('T')[0]}.pdf`;

    return (
      <BlobProvider document={<ProfilesPDF profiles={uniqueProfiles} jobs={jobs} />}>
        {({ blob, loading, error }) => {
          if (loading) {
            return (
              <Button variant="outline" disabled>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </Button>
            );
          }

          if (error) {
            return (
              <Button variant="outline" disabled>
                PDF Error
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
                description: `${uniqueProfiles.length} profiles have been exported successfully`,
              });
            }
          };

          return (
            <Button variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Export All ({uniqueProfiles.length})
            </Button>
          );
        }}
      </BlobProvider>
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  // Detailed Analysis Component
  const DetailedAnalysis = ({ jobScore }: { jobScore: JobScoring }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const fullResponse = jobScore.fullResponse;

    if (!fullResponse || !fullResponse.detailedBreakdown) {
      return null;
    }

    const { detailedBreakdown } = fullResponse;

    const getEvidenceIcon = (present: boolean | 'partial') => {
      if (present === true) return <CheckCircle className="h-4 w-4 text-green-500" />;
      if (present === 'partial') return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      return <X className="h-4 w-4 text-red-500" />;
    };

    return (
      <div className="mt-4 border border-gray-200 rounded-lg">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full p-3 bg-gray-50 hover:bg-gray-100 rounded-t-lg transition-colors"
        >
          <span className="font-medium text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Detailed Analysis
          </span>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        {isExpanded && (
          <div className="p-4 space-y-4 bg-white">
            {/* Technical Skills Breakdown */}
            {detailedBreakdown.technicalSkills && detailedBreakdown.technicalSkills.length > 0 && (
              <div>
                <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Technical Skills
                </h5>
                <div className="space-y-2">
                  {detailedBreakdown.technicalSkills.map((skill: any, index: number) => (
                    <div key={index} className="p-2 bg-gray-50 rounded border border-gray-200">
                      <div className="flex items-start justify-between mb-1">
                        <span className="text-sm font-medium flex-1">{skill.requirement}</span>
                        <div className="flex items-center gap-2">
                          {skill.gapPercentage !== undefined && (
                            <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded">
                              {skill.gapPercentage}% Gap
                            </span>
                          )}
                          {getEvidenceIcon(skill.present)}
                        </div>
                      </div>
                      <div className="text-xs text-gray-600 mb-1">
                        {skill.evidence}
                      </div>
                      {skill.missingDetail && (
                        <div className="text-xs text-blue-600">
                          {skill.missingDetail}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Experience Breakdown */}
            {detailedBreakdown.experience && detailedBreakdown.experience.length > 0 && (
              <div>
                <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Experience
                </h5>
                <div className="space-y-2">
                  {detailedBreakdown.experience.map((exp: any, index: number) => (
                    <div key={index} className="p-2 bg-gray-50 rounded border border-gray-200">
                      <div className="flex items-start justify-between mb-1">
                        <span className="text-sm font-medium flex-1">{exp.requirement}</span>
                        <div className="flex items-center gap-2">
                          {exp.gapPercentage !== undefined && (
                            <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded">
                              {exp.gapPercentage}% Gap
                            </span>
                          )}
                          {getEvidenceIcon(exp.present)}
                        </div>
                      </div>
                      <div className="text-xs text-gray-600 mb-1">
                        {exp.evidence}
                      </div>
                      {exp.missingDetail && (
                        <div className="text-xs text-blue-600">
                          {exp.missingDetail}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Education & Certifications Breakdown */}
            {detailedBreakdown.educationAndCertifications && detailedBreakdown.educationAndCertifications.length > 0 && (
              <div>
                <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Education & Certifications
                </h5>
                <div className="space-y-2">
                  {detailedBreakdown.educationAndCertifications.map((edu: any, index: number) => (
                    <div key={index} className="p-2 bg-gray-50 rounded border border-gray-200">
                      <div className="flex items-start justify-between mb-1">
                        <span className="text-sm font-medium flex-1">{edu.requirement}</span>
                        <div className="flex items-center gap-2">
                          {edu.gapPercentage !== undefined && (
                            <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded">
                              {edu.gapPercentage}% Gap
                            </span>
                          )}
                          {getEvidenceIcon(edu.present)}
                        </div>
                      </div>
                      <div className="text-xs text-gray-600 mb-1">
                        {edu.evidence}
                      </div>
                      {edu.missingDetail && (
                        <div className="text-xs text-blue-600">
                          {edu.missingDetail}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cultural Fit & Soft Skills Breakdown */}
            {detailedBreakdown.culturalFitAndSoftSkills && detailedBreakdown.culturalFitAndSoftSkills.length > 0 && (
              <div>
                <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Cultural Fit & Soft Skills
                </h5>
                <div className="space-y-2">
                  {detailedBreakdown.culturalFitAndSoftSkills.map((skill: any, index: number) => (
                    <div key={index} className="p-2 bg-gray-50 rounded border border-gray-200">
                      <div className="flex items-start justify-between mb-1">
                        <span className="text-sm font-medium flex-1">{skill.requirement}</span>
                        <div className="flex items-center gap-2">
                          {skill.gapPercentage !== undefined && (
                            <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded">
                              {skill.gapPercentage}% Gap
                            </span>
                          )}
                          {getEvidenceIcon(skill.present)}
                        </div>
                      </div>
                      <div className="text-xs text-gray-600 mb-1">
                        {skill.evidence}
                      </div>
                      {skill.missingDetail && (
                        <div className="text-xs text-blue-600">
                          {skill.missingDetail}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Button
                variant="outline"
                onClick={() => window.history.back()}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Resume Profiles</h1>
            <p className="text-gray-600">View and manage all candidate profiles with job match scores</p>
          </div>

          {/* Filters Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Filters & Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      handleFilterChange();
                    }}
                    placeholder="Search by name, email, or skills..."
                    className="pl-10"
                  />
                </div>

                {/* Job Filter */}
                <Select
                  value={selectedJobFilter}
                  onValueChange={(value) => {
                    setSelectedJobFilter(value);
                    handleFilterChange();
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by job" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Jobs</SelectItem>
                    {jobs.map((job: any) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Status Filter */}
                <Select
                  value={selectedStatusFilter}
                  onValueChange={(value) => {
                    setSelectedStatusFilter(value);
                    handleFilterChange();
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="disqualified">Disqualified</SelectItem>
                    <SelectItem value="invited">Invited</SelectItem>
                    <SelectItem value="not-invited">Not Invited</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Stats & Actions */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>Total Profiles: {totalItems}</span>
                  <span>•</span>
                  <span className="text-green-600">
                    Qualified: {flattenedRows.filter(row => !row.disqualified).length}
                  </span>
                  <span>•</span>
                  <span className="text-red-600">
                    Disqualified: {flattenedRows.filter(row => row.disqualified).length}
                  </span>
                </div>

                <div className="flex gap-2">
                  {flattenedRows.length > 0 && exportAllProfiles()}
                  {profiles.length > 0 && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete All
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete All Profiles</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete all {profiles.length} resume profiles?
                            This action cannot be undone and will permanently remove all candidate data.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteAllProfilesMutation.mutate()}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={deleteAllProfilesMutation.isPending}
                          >
                            {deleteAllProfilesMutation.isPending ? (
                              <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Deleting...
                              </div>
                            ) : (
                              "Delete All Profiles"
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profiles Table */}
          <Card>
            <CardContent className="p-0">
              {profilesLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-600" />
                  <p className="text-muted-foreground">Loading profiles...</p>
                </div>
              ) : flattenedRows.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {profiles.length === 0
                    ? 'No resume profiles yet. Upload some resumes to get started.'
                    : 'No profiles match your search criteria.'}
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[200px]">Candidate</TableHead>
                          <TableHead className="min-w-[180px]">Job Position</TableHead>
                          <TableHead className="min-w-[100px]">Score</TableHead>
                          <TableHead className="min-w-[120px]">Status</TableHead>
                          <TableHead className="min-w-[250px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {flattenedRows.map((row, index) => (
                          <TableRow key={`${row.profileId}-${row.jobId}-${index}`}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <User className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                <div className="min-w-0">
                                  <div className="font-semibold truncate">{row.name}</div>
                                  <div className="text-sm text-muted-foreground truncate">{row.email}</div>
                                  <div className="text-xs text-muted-foreground truncate">{row.phone}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Briefcase className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span className="font-medium truncate">{row.jobTitle}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className={`font-bold text-lg ${row.disqualified ? 'text-red-600' : getScoreColor(row.overallScore)}`}>
                                {row.overallScore}%
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                {row.disqualified ? (
                                  <Badge variant="destructive" className="w-fit">
                                    DISQUALIFIED
                                  </Badge>
                                ) : (
                                  <Badge variant={getScoreBadgeVariant(row.overallScore)} className="w-fit">
                                    {row.overallScore}% Match
                                  </Badge>
                                )}
                                {row.invitationStatus === 'invited' && (
                                  <Badge variant="default" className="bg-green-100 text-green-800 border-green-200 w-fit">
                                    <MailCheck className="h-3 w-3 mr-1" />
                                    Invited
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 flex-wrap">
                                {row.invitationStatus !== 'invited' && !row.disqualified && (
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => inviteApplicantMutation.mutate({
                                      profileId: row.profileId,
                                      jobId: row.jobId.toString()
                                    })}
                                    disabled={inviteApplicantMutation.isPending}
                                    className="h-8 px-2 text-xs"
                                  >
                                    {inviteApplicantMutation.isPending ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <>
                                        <Mail className="h-3 w-3 mr-1" />
                                        Invite
                                      </>
                                    )}
                                  </Button>
                                )}
                                {exportSingleProfile(row.profile)}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedProfile(row.profile)}
                                  className="h-8 px-2 text-xs"
                                >
                                  View
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Profile</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete {row.name}'s profile? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteProfileMutation.mutate(row.profileId)}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}</span>
                        <Select
                          value={itemsPerPage.toString()}
                          onValueChange={(value) => {
                            setItemsPerPage(Number(value));
                            setCurrentPage(1);
                          }}
                        >
                          <SelectTrigger className="w-[70px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="20">20</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                          </SelectContent>
                        </Select>
                        <span>per page</span>
                      </div>

                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                              className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>

                          {generatePaginationItems().map((item, index) => (
                            <PaginationItem key={index}>
                              {item === 'ellipsis' ? (
                                <PaginationEllipsis />
                              ) : (
                                <PaginationLink
                                  onClick={() => setCurrentPage(item as number)}
                                  isActive={currentPage === item}
                                  className="cursor-pointer"
                                >
                                  {item}
                                </PaginationLink>
                              )}
                            </PaginationItem>
                          ))}

                          <PaginationItem>
                            <PaginationNext
                              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                              className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Profile Detail Modal */}
        {selectedProfile && (
          <Dialog open={!!selectedProfile} onOpenChange={() => setSelectedProfile(null)}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-6">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {selectedProfile.name} - Full Profile
                  </DialogTitle>
                  <div className="flex gap-2">
                    {exportSingleProfile(selectedProfile)}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Profile</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {selectedProfile.name}'s profile? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteProfileMutation.mutate(selectedProfile.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </DialogHeader>
              <ScrollArea className="h-[70vh]">
                <div className="space-y-6">
                  {/* Header Section */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center">
                        <User className="h-8 w-8 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">{selectedProfile.name}</h3>
                        <p className="text-sm text-muted-foreground">{selectedProfile.email}</p>
                        <p className="text-sm text-muted-foreground">{selectedProfile.phone}</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Professional Summary */}
                  <div>
                    <h4 className="font-semibold mb-3 text-lg">Professional Summary</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{selectedProfile.summary}</p>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-semibold mb-4 text-lg">Job Match Analysis</h4>
                    <div className="space-y-4">
                      {selectedProfile.jobScores.map((jobScore) => {
                        const job = jobs.find((j: any) => j.id === jobScore.jobId);
                        return (
                          <Card key={jobScore.jobId} className={jobScore.disqualified ? 'border-red-200 bg-red-50/30' : ''}>
                            <CardContent className="p-6">
                              {/* Job Header */}
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <Briefcase className="h-5 w-5 text-muted-foreground" />
                                    <h5 className="font-semibold text-lg">
                                      {job?.title || `Job #${jobScore.jobId}`}
                                    </h5>
                                  </div>
                                  {job && (
                                    <p className="text-sm text-muted-foreground mb-2">
                                      {job.location} • {job.jobType} • {job.salaryRange}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {jobScore.disqualified ? (
                                      <Badge variant="destructive" className="text-xs font-semibold">
                                        NOT A MATCH
                                      </Badge>
                                    ) : (
                                      <Badge variant={getScoreBadgeVariant(jobScore.overallScore)}>
                                        {jobScore.overallScore}% Overall Match
                                      </Badge>
                                    )}
                                    {jobScore.invitationStatus === 'invited' && (
                                      <Badge variant="default" className="bg-green-100 text-green-800 border-green-200 text-xs">
                                        <MailCheck className="h-3 w-3 mr-1" />
                                        Invited
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  {jobScore.invitationStatus !== 'invited' && !jobScore.disqualified && (
                                    <Button
                                      variant="default"
                                      size="sm"
                                      onClick={() => inviteApplicantMutation.mutate({
                                        profileId: selectedProfile.id,
                                        jobId: jobScore.jobId.toString()
                                      })}
                                      disabled={inviteApplicantMutation.isPending}
                                      className="flex items-center gap-2"
                                    >
                                      {inviteApplicantMutation.isPending ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <Mail className="h-3 w-3" />
                                      )}
                                      Invite
                                    </Button>
                                  )}
                                </div>
                              </div>

                              {/* Disqualified Candidate Special Layout */}
                              {jobScore.disqualified && (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                                  {/* Left Column - Status and Scores */}
                                  <div className="space-y-4">
                                    <div className="p-4 bg-red-100 border border-red-200 rounded-lg">
                                      <div className="flex items-center gap-2 mb-3">
                                        <AlertTriangle className="h-5 w-5 text-red-600" />
                                        <h6 className="font-semibold text-red-800">Not Suitable for This Role</h6>
                                      </div>
                                      {jobScore.disqualificationReason && (
                                        <p className="text-sm text-red-700 mb-3">{jobScore.disqualificationReason}</p>
                                      )}

                                      {/* Score Display */}
                                      <div className="grid grid-cols-3 gap-3">
                                        <div className="text-center p-3 bg-white rounded border">
                                          <div className="text-2xl font-bold text-red-600">{jobScore.overallScore}%</div>
                                          <div className="text-xs text-red-600">Overall</div>
                                        </div>
                                        <div className="text-center p-3 bg-white rounded border">
                                          <div className="text-2xl font-bold text-red-600">{jobScore.technicalSkillsScore}%</div>
                                          <div className="text-xs text-red-600">Technical</div>
                                        </div>
                                        <div className="text-center p-3 bg-white rounded border">
                                          <div className="text-2xl font-bold text-red-600">{jobScore.experienceScore}%</div>
                                          <div className="text-xs text-red-600">Experience</div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Key Skill Gaps */}
                                    {jobScore.improvementAreas && jobScore.improvementAreas.length > 0 && (
                                      <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                                        <div className="flex items-center gap-2 mb-3">
                                          <AlertTriangle className="h-4 w-4 text-orange-600" />
                                          <h6 className="font-semibold text-orange-800">
                                            Critical Skill Gaps ({jobScore.improvementAreas.length})
                                          </h6>
                                        </div>
                                        <ul className="space-y-2">
                                          {jobScore.improvementAreas.map((gap, index) => (
                                            <li key={index} className="text-sm text-orange-700 flex items-start gap-2">
                                              <span className="text-orange-500 mt-1">•</span>
                                              <span>{gap}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>

                                  {/* Right Column - Additional Info */}
                                  <div className="space-y-4">
                                    {jobScore.redFlags && jobScore.redFlags.length > 0 && (
                                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                        <h6 className="font-semibold text-yellow-800 mb-2">Red Flags</h6>
                                        <ul className="space-y-1">
                                          {jobScore.redFlags.map((flag, index) => (
                                            <li key={index} className="text-sm text-yellow-700">
                                              • {flag.issue} - {flag.reason}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}

                                    {jobScore.matchSummary && (
                                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                        <h6 className="font-semibold text-gray-700 mb-2">Assessment Summary</h6>
                                        <p className="text-sm text-gray-600">{jobScore.matchSummary}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Regular Score Breakdown (for non-disqualified) */}
                              {!jobScore.disqualified && (
                                <>
                                  <div className="grid grid-cols-3 gap-4 mb-4">
                                    <div>
                                      <div className="text-xs text-muted-foreground mb-1">Technical Skills</div>
                                      <div className={`text-lg font-semibold ${getScoreColor(jobScore.technicalSkillsScore)}`}>
                                        {jobScore.technicalSkillsScore}%
                                      </div>
                                      <Progress value={jobScore.technicalSkillsScore} className="h-2 mt-1" />
                                    </div>
                                    <div>
                                      <div className="text-xs text-muted-foreground mb-1">Experience</div>
                                      <div className={`text-lg font-semibold ${getScoreColor(jobScore.experienceScore)}`}>
                                        {jobScore.experienceScore}%
                                      </div>
                                      <Progress value={jobScore.experienceScore} className="h-2 mt-1" />
                                    </div>
                                    <div>
                                      <div className="text-xs text-muted-foreground mb-1">Cultural Fit</div>
                                      <div className={`text-lg font-semibold ${getScoreColor(jobScore.culturalFitScore)}`}>
                                        {jobScore.culturalFitScore}%
                                      </div>
                                      <Progress value={jobScore.culturalFitScore} className="h-2 mt-1" />
                                    </div>
                                  </div>
                                  {jobScore.matchSummary && (
                                    <p className="text-sm text-muted-foreground mb-4">{jobScore.matchSummary}</p>
                                  )}
                                </>
                              )}

                              <DetailedAnalysis jobScore={jobScore} />
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-2">Skills</h4>
                      <div className="flex flex-wrap gap-1">
                        {selectedProfile.skills.map((skill, index) => (
                          <Badge key={index} variant="outline">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Languages</h4>
                      <div className="flex flex-wrap gap-1">
                        {selectedProfile.languages.map((language, index) => (
                          <Badge key={index} variant="secondary">
                            {language}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Experience</h4>
                    <div className="space-y-2">
                      {selectedProfile.experience.map((exp, index) => (
                        <p key={index} className="text-sm bg-gray-50 p-2 rounded">
                          {exp}
                        </p>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Education</h4>
                    <div className="space-y-2">
                      {selectedProfile.education.map((edu, index) => (
                        <p key={index} className="text-sm bg-gray-50 p-2 rounded">
                          {edu}
                        </p>
                      ))}
                    </div>
                  </div>

                  {selectedProfile.certifications.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Certifications</h4>
                      <div className="space-y-2">
                        {selectedProfile.certifications.map((cert, index) => (
                          <p key={index} className="text-sm bg-gray-50 p-2 rounded">
                            {cert}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
