import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Search, User, Briefcase, Star, Download, Trash2, Loader2, MailCheck, Mail, AlertTriangle, CheckCircle, FileText, Users, ChevronDown, ChevronRight, X } from 'lucide-react';
import { BlobProvider } from '@react-pdf/renderer';
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

export function ResumeProfilesList() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJobFilter, setSelectedJobFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [selectedProfile, setSelectedProfile] = useState<ProfileWithScores | null>(null);
  const [selectedJobScore, setSelectedJobScore] = useState<JobScoring | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Fetch company job postings
  const { data: jobs = [] } = useQuery<any[]>({
    queryKey: ['/api/job-postings'],
  });

  // Fetch active resume processing jobs
  const { data: activeJobsData } = useQuery<{
    totalFiles: number;
    completedFiles: number;
    overallProgress: number;
    activeJobsCount: number;
    waitingJobsCount: number;
    activeJobDetails: Array<{
      fileName: string;
      fileCount: number;
      progress: number;
    }>;
    hasActiveJobs: boolean;
  }>({
    queryKey: ['/api/resume-processing/active-jobs'],
    queryFn: async () => {
      const response = await fetch('/api/resume-processing/active-jobs', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch active jobs');
      }
      return response.json();
    },
    refetchInterval: 2000, // Poll every 2 seconds
    refetchIntervalInBackground: true,
  });

  // Fetch resume profiles with pagination and filters
  const { data: profilesResponse, isLoading: profilesLoading } = useQuery<{
    data: ProfileWithScores[];
    pagination: any;
  }>({
    queryKey: ['/api/resume-profiles', currentPage, itemsPerPage, searchTerm, selectedJobFilter, selectedStatusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      });

      // Add search term if exists
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      // Add job filter if selected
      if (selectedJobFilter !== 'all') {
        params.append('jobId', selectedJobFilter);
      }

      // Add status filter if selected
      if (selectedStatusFilter !== 'all') {
        params.append('status', selectedStatusFilter);
      }

      const response = await fetch(`/api/resume-profiles?${params}`, {
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

  const totalPages = serverPagination?.totalPages || 1;
  const totalItems = serverPagination?.totalItems || 0;

  // Refresh profiles when active jobs complete
  useEffect(() => {
    if (activeJobsData && !activeJobsData.hasActiveJobs) {
      // All jobs completed, refresh profiles list
      queryClient.invalidateQueries({ queryKey: ['/api/resume-profiles'] });
    }
  }, [activeJobsData]);

  // Display all profiles, including those without job scores
  const displayRows = useMemo(() => {
    const rows: any[] = [];

    profiles.forEach((profile: any) => {
      if (profile.jobScores && profile.jobScores.length > 0) {
        // Profile has job scores - create a row for each job score
        profile.jobScores.forEach((jobScore: any) => {
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
      } else {
        // Profile has no job scores - create a row for the profile without job info
        rows.push({
          profileId: profile.id,
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
          jobId: null,
          jobTitle: 'No Job Analysis',
          overallScore: 0,
          technicalSkillsScore: 0,
          experienceScore: 0,
          culturalFitScore: 0,
          disqualified: false,
          invitationStatus: null,
          profile,
          jobScore: null
        });
      }
    });

    return rows;
  }, [profiles]);

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

  // Export all filtered profiles as PDF
  const exportAllProfiles = () => {
    // Get unique profiles from display rows
    const uniqueProfiles = Array.from(
      new Map(displayRows.map(row => [row.profileId, row.profile])).values()
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

  // Detailed Analysis Component - supports both new 100-point matrix and legacy format
  const DetailedAnalysis = ({ jobScore }: { jobScore: JobScoring }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const fullResponse = jobScore.fullResponse;

    if (!fullResponse || !fullResponse.detailedBreakdown) {
      return null;
    }

    const { detailedBreakdown } = fullResponse;

    // Detect if using new 100-point matrix format (has sectionA) or legacy format (has technicalSkills array)
    const isNewFormat = detailedBreakdown.sectionA !== undefined;

    const getEvidenceIcon = (present: boolean | 'partial') => {
      if (present === true) return <CheckCircle className="h-4 w-4 text-green-500" />;
      if (present === 'partial') return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      return <X className="h-4 w-4 text-red-500" />;
    };

    const getScoreColor = (score: number, maxScore: number) => {
      const percentage = (score / maxScore) * 100;
      if (percentage >= 80) return 'text-green-600 bg-green-50';
      if (percentage >= 60) return 'text-yellow-600 bg-yellow-50';
      return 'text-red-600 bg-red-50';
    };

    // Render a subsection item for new format
    const renderSubsectionItem = (label: string, data: any, maxScore?: number) => {
      if (!data) return null;
      const score = data.score;
      const hasScore = score !== undefined && maxScore !== undefined;

      return (
        <div className="p-3 bg-gray-50 rounded border border-gray-200">
          <div className="flex items-start justify-between mb-2">
            <span className="text-sm font-medium flex-1">{label}</span>
            {hasScore && (
              <span className={`text-xs font-bold px-2 py-1 rounded ${getScoreColor(score, maxScore)}`}>
                {score}/{maxScore} pts
              </span>
            )}
          </div>
          {data.evidence && (
            <div className="text-xs text-gray-600 mb-1">{data.evidence}</div>
          )}
          {data.matchedSkills && data.matchedSkills.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {data.matchedSkills.map((skill: string, i: number) => (
                <Badge key={i} variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                  {skill}
                </Badge>
              ))}
            </div>
          )}
          {data.matchedTools && data.matchedTools.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {data.matchedTools.map((tool: string, i: number) => (
                <Badge key={i} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                  {tool}
                </Badge>
              ))}
            </div>
          )}
          {data.matchedKeywords && data.matchedKeywords.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {data.matchedKeywords.map((keyword: string, i: number) => (
                <Badge key={i} variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                  {keyword}
                </Badge>
              ))}
            </div>
          )}
          {data.matchedSoftSkills && data.matchedSoftSkills.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {data.matchedSoftSkills.map((skill: string, i: number) => (
                <Badge key={i} variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200">
                  {skill}
                </Badge>
              ))}
            </div>
          )}
          {data.matchedCerts && data.matchedCerts.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {data.matchedCerts.map((cert: string, i: number) => (
                <Badge key={i} variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                  {cert}
                </Badge>
              ))}
            </div>
          )}
          {data.candidateYears !== undefined && data.requiredYears !== undefined && (
            <div className="text-xs text-gray-500 mt-1">
              Candidate: {data.candidateYears} years / Required: {data.requiredYears} years
            </div>
          )}
          {data.averageTenure !== undefined && (
            <div className="text-xs text-gray-500 mt-1">
              Average tenure: {data.averageTenure} years
            </div>
          )}
          {data.jdLevel && (
            <div className="text-xs text-gray-500 mt-1">
              JD Level: {data.jdLevel}
            </div>
          )}
          {data.candidateDegree && (
            <div className="text-xs text-gray-500 mt-1">
              Degree: {data.candidateDegree} {data.requiredDegree && `(Required: ${data.requiredDegree})`}
            </div>
          )}
          {data.candidateLocation && (
            <div className="text-xs text-gray-500 mt-1">
              Location: {data.candidateLocation} {data.jdLocation && `→ ${data.jdLocation}`}
            </div>
          )}
          {(data.hasEmail !== undefined || data.hasPhone !== undefined) && (
            <div className="text-xs text-gray-500 mt-1 flex gap-2">
              {data.hasEmail && <span className="text-green-600">✓ Email</span>}
              {data.hasPhone && <span className="text-green-600">✓ Phone</span>}
              {data.cleanFormat && <span className="text-green-600">✓ Clean Format</span>}
            </div>
          )}
          {data.triggered !== undefined && (
            <div className={`text-xs mt-1 ${data.triggered ? 'text-red-600' : 'text-green-600'}`}>
              {data.triggered ? `Triggered: ${data.reason}` : 'Not triggered'}
            </div>
          )}
          {data.appliedBonuses && data.appliedBonuses.length > 0 && (
            <div className="mt-1">
              {data.appliedBonuses.map((bonus: any, i: number) => (
                <div key={i} className="text-xs text-green-600">+ {bonus.condition}: {bonus.points} pts</div>
              ))}
            </div>
          )}
        </div>
      );
    };

    // Helper for domain match level colors
    const getDomainMatchColor = (level: string) => {
      switch (level?.toUpperCase()) {
        case 'EXACT': return 'bg-green-100 text-green-800 border-green-200';
        case 'RELATED': return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'ADJACENT': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'DIFFERENT': return 'bg-orange-100 text-orange-800 border-orange-200';
        case 'UNRELATED': return 'bg-red-100 text-red-800 border-red-200';
        default: return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    };

    // Helper for skill depth colors
    const getSkillDepthColor = (depth: string) => {
      switch (depth?.toUpperCase()) {
        case 'EXPERT': return 'bg-green-100 text-green-700 border-green-300';
        case 'PROFICIENT': return 'bg-blue-100 text-blue-700 border-blue-300';
        case 'FAMILIAR': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
        case 'LISTED_ONLY': return 'bg-gray-100 text-gray-600 border-gray-300';
        default: return 'bg-gray-100 text-gray-600 border-gray-300';
      }
    };

    // Helper for career progression colors
    const getProgressionColor = (progression: string) => {
      switch (progression?.toUpperCase()) {
        case 'ASCENDING': return 'bg-green-100 text-green-700';
        case 'STABLE': return 'bg-blue-100 text-blue-700';
        case 'MIXED': return 'bg-yellow-100 text-yellow-700';
        case 'DESCENDING': return 'bg-red-100 text-red-700';
        default: return 'bg-gray-100 text-gray-700';
      }
    };

    // Helper for red flag severity colors
    const getSeverityColor = (severity: string) => {
      switch (severity?.toUpperCase()) {
        case 'HIGH': return 'bg-red-100 text-red-800 border-red-300';
        case 'MEDIUM': return 'bg-orange-100 text-orange-800 border-orange-300';
        case 'LOW': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
        default: return 'bg-gray-100 text-gray-800 border-gray-300';
      }
    };

    // Helper for verdict decision colors
    const getVerdictColor = (decision: string) => {
      switch (decision?.toUpperCase()) {
        case 'INTERVIEW': return 'bg-green-500 text-white border-green-600';
        case 'CONSIDER': return 'bg-blue-500 text-white border-blue-600';
        case 'REVIEW': return 'bg-yellow-500 text-white border-yellow-600';
        case 'PASS': return 'bg-red-500 text-white border-red-600';
        default: return 'bg-gray-500 text-white border-gray-600';
      }
    };

    // Helper for recommendation colors
    const getRecommendationColor = (rec: string) => {
      switch (rec?.toUpperCase()) {
        case 'STRONG_YES': return 'bg-green-100 text-green-800 border-green-300';
        case 'YES': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
        case 'MAYBE': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
        case 'NO': return 'bg-orange-100 text-orange-800 border-orange-300';
        case 'STRONG_NO': return 'bg-red-100 text-red-800 border-red-300';
        default: return 'bg-gray-100 text-gray-800 border-gray-300';
      }
    };

    // Render new 100-point matrix format
    const renderNewFormat = () => (
      <div className="p-4 space-y-4 bg-white">
        {/* Executive Summary - Quick Scan Section */}
        {fullResponse.executiveSummary && (
          <div className="p-3 rounded-lg bg-gradient-to-r from-slate-900 to-slate-800 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold">{fullResponse.executiveSummary.oneLiner || 'Candidate Analysis'}</span>
              </div>
              <div className="flex items-center gap-2">
                {fullResponse.executiveSummary.fitScore && (
                  <Badge className={`text-xs ${
                    fullResponse.executiveSummary.fitScore === 'EXCELLENT' ? 'bg-green-500' :
                    fullResponse.executiveSummary.fitScore === 'GOOD' ? 'bg-blue-500' :
                    fullResponse.executiveSummary.fitScore === 'FAIR' ? 'bg-yellow-500' :
                    fullResponse.executiveSummary.fitScore === 'POOR' ? 'bg-orange-500' :
                    'bg-red-500'
                  }`}>
                    {fullResponse.executiveSummary.fitScore} FIT
                  </Badge>
                )}
                {fullResponse.executiveSummary.hiringUrgency && (
                  <Badge className={`text-xs ${
                    fullResponse.executiveSummary.hiringUrgency === 'EXPEDITE' ? 'bg-green-600' :
                    fullResponse.executiveSummary.hiringUrgency === 'STANDARD' ? 'bg-blue-600' :
                    fullResponse.executiveSummary.hiringUrgency === 'LOW_PRIORITY' ? 'bg-gray-600' :
                    'bg-red-600'
                  }`}>
                    {fullResponse.executiveSummary.hiringUrgency.replace('_', ' ')}
                  </Badge>
                )}
              </div>
            </div>
            {fullResponse.executiveSummary.competitivePosition && (
              <p className="text-xs text-slate-300 mt-2">{fullResponse.executiveSummary.competitivePosition}</p>
            )}
          </div>
        )}

        {/* Verdict & Recommendation - Most Important Section */}
        {fullResponse.verdict && (
          <div className="p-4 rounded-lg border-2 border-gray-300 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Badge className={`text-lg px-4 py-2 font-bold ${getVerdictColor(fullResponse.verdict.decision)}`}>
                  {fullResponse.verdict.decision === 'INTERVIEW' ? '✓ INTERVIEW' :
                   fullResponse.verdict.decision === 'CONSIDER' ? '? CONSIDER' :
                   fullResponse.verdict.decision === 'REVIEW' ? '⚠ REVIEW' :
                   '✗ PASS'}
                </Badge>
                {fullResponse.verdict.confidence && (
                  <span className={`text-xs font-medium px-2 py-1 rounded ${
                    fullResponse.verdict.confidence === 'HIGH' ? 'bg-green-100 text-green-700' :
                    fullResponse.verdict.confidence === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {fullResponse.verdict.confidence} Confidence
                  </span>
                )}
                {fullResponse.verdict.riskLevel && (
                  <span className={`text-xs font-medium px-2 py-1 rounded ${
                    fullResponse.verdict.riskLevel === 'LOW' ? 'bg-green-100 text-green-700' :
                    fullResponse.verdict.riskLevel === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                    fullResponse.verdict.riskLevel === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {fullResponse.verdict.riskLevel} Risk
                  </span>
                )}
              </div>
              {fullResponse.recommendation && (
                <Badge className={`px-3 py-1 ${getRecommendationColor(fullResponse.recommendation)}`}>
                  {fullResponse.recommendation.replace('_', ' ')}
                </Badge>
              )}
            </div>

            {fullResponse.verdict.summary && (
              <p className="text-base font-medium text-gray-800 mb-3">
                {fullResponse.verdict.summary}
              </p>
            )}

            <div className="grid grid-cols-2 gap-4">
              {fullResponse.verdict.topStrength && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-xs font-semibold text-green-600 mb-1 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> TOP STRENGTH
                  </div>
                  <div className="text-sm text-green-800">{fullResponse.verdict.topStrength}</div>
                </div>
              )}
              {fullResponse.verdict.topConcern && fullResponse.verdict.topConcern !== 'None significant' && fullResponse.verdict.topConcern !== 'None' && fullResponse.verdict.topConcern !== 'None identified' && (
                <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="text-xs font-semibold text-orange-600 mb-1 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> TOP CONCERN
                  </div>
                  <div className="text-sm text-orange-800">{fullResponse.verdict.topConcern}</div>
                </div>
              )}
              {fullResponse.verdict.topConcern && (fullResponse.verdict.topConcern === 'None significant' || fullResponse.verdict.topConcern === 'None' || fullResponse.verdict.topConcern === 'None identified') && (
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> TOP CONCERN
                  </div>
                  <div className="text-sm text-gray-600 italic">No significant concerns</div>
                </div>
              )}
            </div>

            {/* Dealbreakers if any */}
            {fullResponse.verdict.dealbreakers && fullResponse.verdict.dealbreakers.length > 0 && (
              <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="text-xs font-semibold text-red-600 mb-1">DEALBREAKERS</div>
                <ul className="text-sm text-red-800">
                  {fullResponse.verdict.dealbreakers.map((item: string, i: number) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="text-red-500">✗</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {fullResponse.recommendationReason && (
              <p className="text-sm text-gray-600 mt-3 italic border-t pt-3">
                {fullResponse.recommendationReason}
              </p>
            )}
          </div>
        )}

        {/* Competitive Intel */}
        {fullResponse.competitiveIntel && (
          <div className="p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
            <h5 className="font-medium text-sm mb-2 flex items-center gap-2 text-purple-800">
              <Briefcase className="h-4 w-4" />
              Competitive Intelligence
            </h5>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              {fullResponse.competitiveIntel.marketPosition && (
                <div className="p-2 bg-white rounded border">
                  <div className="text-gray-500">Market Position</div>
                  <div className="font-medium text-purple-700">{fullResponse.competitiveIntel.marketPosition}</div>
                </div>
              )}
              {fullResponse.competitiveIntel.salaryExpectation && (
                <div className="p-2 bg-white rounded border">
                  <div className="text-gray-500">Salary Expectation</div>
                  <div className="font-medium text-purple-700">{fullResponse.competitiveIntel.salaryExpectation}</div>
                </div>
              )}
              {fullResponse.competitiveIntel.flightRisk && (
                <div className="p-2 bg-white rounded border">
                  <div className="text-gray-500">Flight Risk</div>
                  <Badge className={`text-xs ${
                    fullResponse.competitiveIntel.flightRisk === 'LOW' ? 'bg-green-100 text-green-700' :
                    fullResponse.competitiveIntel.flightRisk === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {fullResponse.competitiveIntel.flightRisk}
                  </Badge>
                </div>
              )}
              {fullResponse.competitiveIntel.counterofferRisk && (
                <div className="p-2 bg-white rounded border">
                  <div className="text-gray-500">Counteroffer Risk</div>
                  <Badge className={`text-xs ${
                    fullResponse.competitiveIntel.counterofferRisk === 'LOW' ? 'bg-green-100 text-green-700' :
                    fullResponse.competitiveIntel.counterofferRisk === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {fullResponse.competitiveIntel.counterofferRisk}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Section Scores Summary */}
        {(fullResponse.sectionA !== undefined || fullResponse.sectionB !== undefined) && (
          <div className="grid grid-cols-6 gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-700">{fullResponse.sectionA ?? '-'}</div>
              <div className="text-xs text-blue-600">A: Skills (30)</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-700">{fullResponse.sectionB ?? '-'}</div>
              <div className="text-xs text-blue-600">B: Exp (25)</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-700">{fullResponse.sectionC ?? '-'}</div>
              <div className="text-xs text-blue-600">C: Impact (20)</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-700">{fullResponse.sectionD ?? '-'}</div>
              <div className="text-xs text-blue-600">D: Qual (10)</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-700">{fullResponse.sectionE ?? '-'}</div>
              <div className="text-xs text-blue-600">E: Log (10)</div>
            </div>
            <div className="text-center">
              <div className={`text-lg font-bold ${(fullResponse.sectionF ?? 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>{fullResponse.sectionF ?? '-'}</div>
              <div className="text-xs text-gray-600">F: +/- (5)</div>
            </div>
          </div>
        )}

        {/* Quick Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-green-50 rounded-lg border border-green-200 text-center">
            <div className="text-2xl font-bold text-green-700">
              {fullResponse.strengthsHighlights?.length || 0}
            </div>
            <div className="text-xs text-green-600">Strengths Found</div>
          </div>
          <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-center">
            <div className="text-2xl font-bold text-red-700">
              {fullResponse.improvementAreas?.length || 0}
            </div>
            <div className="text-xs text-red-600">Gaps Identified</div>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-center">
            <div className="text-2xl font-bold text-amber-700">
              {fullResponse.skillAnalysis?.matchedSkills?.length || 0}
            </div>
            <div className="text-xs text-amber-600">Skills Matched</div>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg border border-purple-200 text-center">
            <div className="text-2xl font-bold text-purple-700">
              {fullResponse.skillAnalysis?.missingSkills?.length || 0}
            </div>
            <div className="text-xs text-purple-600">Skills Missing</div>
          </div>
        </div>

        {/* Strengths & Gaps Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Strengths Column */}
          <div className="p-3 bg-gradient-to-b from-green-50 to-emerald-50 rounded-lg border border-green-200">
            <h5 className="font-medium text-sm mb-3 flex items-center gap-2 text-green-800">
              <CheckCircle className="h-4 w-4" />
              Strengths ({fullResponse.strengthsHighlights?.length || 0})
            </h5>
            {fullResponse.strengthsHighlights && fullResponse.strengthsHighlights.length > 0 ? (
              <div className="space-y-2">
                {fullResponse.strengthsHighlights.map((item: any, i: number) => (
                  <div key={i} className="p-2 bg-white rounded border border-green-100">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-green-800">{item.strength || (typeof item === 'string' ? item : 'Strength identified')}</div>
                        {item.evidence && (
                          <div className="text-xs text-gray-600 mt-1">
                            <span className="font-medium">Evidence:</span> {item.evidence}
                          </div>
                        )}
                      </div>
                      {item.impact && (
                        <Badge variant="outline" className={`text-xs ml-2 ${
                          item.impact === 'HIGH' ? 'bg-green-100 text-green-700 border-green-300' :
                          item.impact === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
                          'bg-gray-100 text-gray-600 border-gray-300'
                        }`}>
                          {item.impact}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500 italic">No significant strengths identified</div>
            )}
          </div>

          {/* Gaps Column */}
          <div className="p-3 bg-gradient-to-b from-red-50 to-orange-50 rounded-lg border border-red-200">
            <h5 className="font-medium text-sm mb-3 flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-4 w-4" />
              Gaps & Areas for Concern ({fullResponse.improvementAreas?.length || 0})
            </h5>
            {fullResponse.improvementAreas && fullResponse.improvementAreas.length > 0 ? (
              <div className="space-y-2">
                {fullResponse.improvementAreas.map((item: any, i: number) => (
                  <div key={i} className={`p-2 bg-white rounded border ${
                    item.severity === 'CRITICAL' ? 'border-red-300' :
                    item.severity === 'MAJOR' ? 'border-orange-300' :
                    'border-yellow-300'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-red-800">{item.gap || (typeof item === 'string' ? item : 'Gap identified')}</div>
                        {item.jdRequirement && (
                          <div className="text-xs text-gray-600 mt-1">
                            <span className="font-medium">JD Required:</span> {item.jdRequirement}
                          </div>
                        )}
                        {item.impact && (
                          <div className="text-xs text-red-600 mt-1">
                            <span className="font-medium">Impact:</span> {item.impact}
                          </div>
                        )}
                      </div>
                      {item.severity && (
                        <Badge variant="outline" className={`text-xs ml-2 ${
                          item.severity === 'CRITICAL' ? 'bg-red-100 text-red-700 border-red-300' :
                          item.severity === 'MAJOR' ? 'bg-orange-100 text-orange-700 border-orange-300' :
                          'bg-yellow-100 text-yellow-700 border-yellow-300'
                        }`}>
                          {item.severity}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500 italic">No significant gaps identified</div>
            )}
          </div>
        </div>

        {/* Domain Analysis */}
        {fullResponse.domainAnalysis && (
          <div className="p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
            <h5 className="font-medium text-sm mb-3 flex items-center gap-2 text-indigo-800">
              <Briefcase className="h-4 w-4" />
              Domain Match Analysis
            </h5>
            <div className="grid grid-cols-2 gap-3 mb-2">
              <div>
                <span className="text-xs text-gray-500">JD Domain:</span>
                <div className="text-sm font-medium">{fullResponse.domainAnalysis.jdDomain || 'N/A'}</div>
              </div>
              <div>
                <span className="text-xs text-gray-500">Candidate Domain:</span>
                <div className="text-sm font-medium">{fullResponse.domainAnalysis.candidateDomain || 'N/A'}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <Badge className={`${getDomainMatchColor(fullResponse.domainAnalysis.domainMatchLevel)}`}>
                {fullResponse.domainAnalysis.domainMatchLevel || 'UNKNOWN'}
              </Badge>
              {fullResponse.domainAnalysis.domainMatchScore !== undefined && (
                <span className="text-sm font-bold text-indigo-700">
                  {fullResponse.domainAnalysis.domainMatchScore}% match
                </span>
              )}
              {fullResponse.domainAnalysis.domainPenalty > 0 && (
                <span className="text-xs text-red-600 font-medium">
                  -{(fullResponse.domainAnalysis.domainPenalty * 100).toFixed(0)}% penalty
                </span>
              )}
            </div>
            {fullResponse.domainAnalysis.domainNotes && (
              <p className="text-xs text-gray-600 mt-2">{fullResponse.domainAnalysis.domainNotes}</p>
            )}
          </div>
        )}

        {/* Skill Analysis Summary */}
        {fullResponse.skillAnalysis && (
          <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
            <h5 className="font-medium text-sm mb-3 flex items-center gap-2 text-green-800">
              <Star className="h-4 w-4" />
              Skill Depth Analysis
            </h5>

            {/* Skill Depth Summary */}
            {fullResponse.skillAnalysis.skillDepthSummary && (
              <div className="grid grid-cols-4 gap-2 mb-3">
                <div className="text-center p-2 bg-green-100 rounded">
                  <div className="text-lg font-bold text-green-700">{fullResponse.skillAnalysis.skillDepthSummary.expert || 0}</div>
                  <div className="text-xs text-green-600">Expert</div>
                </div>
                <div className="text-center p-2 bg-blue-100 rounded">
                  <div className="text-lg font-bold text-blue-700">{fullResponse.skillAnalysis.skillDepthSummary.proficient || 0}</div>
                  <div className="text-xs text-blue-600">Proficient</div>
                </div>
                <div className="text-center p-2 bg-yellow-100 rounded">
                  <div className="text-lg font-bold text-yellow-700">{fullResponse.skillAnalysis.skillDepthSummary.familiar || 0}</div>
                  <div className="text-xs text-yellow-600">Familiar</div>
                </div>
                <div className="text-center p-2 bg-gray-100 rounded">
                  <div className="text-lg font-bold text-gray-600">{fullResponse.skillAnalysis.skillDepthSummary.listedOnly || 0}</div>
                  <div className="text-xs text-gray-500">Listed Only</div>
                </div>
              </div>
            )}

            {/* Matched Skills */}
            {fullResponse.skillAnalysis.matchedSkills && fullResponse.skillAnalysis.matchedSkills.length > 0 && (
              <div className="mb-2">
                <span className="text-xs font-medium text-green-700">Matched Skills:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {fullResponse.skillAnalysis.matchedSkills.map((s: any, i: number) => (
                    <Badge key={i} variant="outline" className={`text-xs ${getSkillDepthColor(s.depth)}`}>
                      {s.skill} <span className="opacity-70 ml-1">{s.depth}</span>
                      {s.yearsUsed && <span className="opacity-50 ml-1">({s.yearsUsed}y)</span>}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Missing Skills */}
            {fullResponse.skillAnalysis.missingSkills && fullResponse.skillAnalysis.missingSkills.length > 0 && (
              <div className="mt-2">
                <span className="text-xs font-medium text-red-700">Missing Skills:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {fullResponse.skillAnalysis.missingSkills.map((s: any, i: number) => (
                    <Badge key={i} variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                      {s.skill || s}
                      {s.importance && <span className="opacity-70 ml-1">({s.importance})</span>}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Partial Matches */}
            {fullResponse.skillAnalysis.partialMatches && fullResponse.skillAnalysis.partialMatches.length > 0 && (
              <div className="mt-2">
                <span className="text-xs font-medium text-yellow-700">Partial Matches:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {fullResponse.skillAnalysis.partialMatches.map((s: any, i: number) => (
                    <Badge key={i} variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                      {s.required} → {s.found} ({Math.round((s.similarity || 0) * 100)}%)
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Experience Analysis */}
        {fullResponse.experienceAnalysis && (
          <div className="p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
            <h5 className="font-medium text-sm mb-3 flex items-center gap-2 text-blue-800">
              <User className="h-4 w-4" />
              Experience & Career Analysis
            </h5>

            <div className="grid grid-cols-4 gap-2 mb-3">
              <div className="text-center p-2 bg-white rounded border">
                <div className="text-lg font-bold text-blue-700">{fullResponse.experienceAnalysis.totalYears || 0}</div>
                <div className="text-xs text-gray-500">Total Years</div>
              </div>
              <div className="text-center p-2 bg-white rounded border">
                <div className="text-lg font-bold text-green-700">{fullResponse.experienceAnalysis.relevantYears || 0}</div>
                <div className="text-xs text-gray-500">Relevant</div>
              </div>
              <div className="text-center p-2 bg-white rounded border">
                <div className="text-lg font-bold text-purple-700">{fullResponse.experienceAnalysis.domainYears || 0}</div>
                <div className="text-xs text-gray-500">Domain</div>
              </div>
              <div className="text-center p-2 bg-white rounded border">
                <Badge className={`${getProgressionColor(fullResponse.experienceAnalysis.careerProgression)} text-xs`}>
                  {fullResponse.experienceAnalysis.careerProgression || 'N/A'}
                </Badge>
                <div className="text-xs text-gray-500 mt-1">Progression</div>
              </div>
            </div>

            {/* Seniority Match */}
            {fullResponse.experienceAnalysis.seniorityMatch && (
              <div className="p-2 bg-white rounded border mb-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">Seniority:</span>
                  <span className="font-medium">{fullResponse.experienceAnalysis.seniorityMatch.candidateLevel}</span>
                  <span className="text-gray-400">→</span>
                  <span className="font-medium">{fullResponse.experienceAnalysis.seniorityMatch.jdLevel}</span>
                  <Badge variant="outline" className={`text-xs ${
                    fullResponse.experienceAnalysis.seniorityMatch.match === 'EXACT' ? 'bg-green-50 text-green-700' :
                    fullResponse.experienceAnalysis.seniorityMatch.match === 'PARTIAL' ? 'bg-yellow-50 text-yellow-700' :
                    'bg-red-50 text-red-700'
                  }`}>
                    {fullResponse.experienceAnalysis.seniorityMatch.match}
                  </Badge>
                </div>
              </div>
            )}

            {/* Role Timeline */}
            {fullResponse.experienceAnalysis.roleTimeline && fullResponse.experienceAnalysis.roleTimeline.length > 0 && (
              <div className="mt-2">
                <span className="text-xs font-medium text-blue-700">Role Timeline:</span>
                <div className="space-y-1 mt-1">
                  {fullResponse.experienceAnalysis.roleTimeline.slice(0, 3).map((role: any, i: number) => (
                    <div key={i} className="text-xs p-2 bg-white rounded border flex items-center justify-between">
                      <span className="font-medium">{role.title} @ {role.company}</span>
                      <span className="text-gray-500">{role.duration}</span>
                      {role.relevance && (
                        <Badge variant="outline" className={`text-xs ${
                          role.relevance === 'HIGH' ? 'bg-green-50 text-green-700' :
                          role.relevance === 'MEDIUM' ? 'bg-yellow-50 text-yellow-700' :
                          'bg-gray-50 text-gray-600'
                        }`}>
                          {role.relevance}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quantified Achievements */}
        {fullResponse.quantifiedAchievements && fullResponse.quantifiedAchievements.length > 0 && (
          <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
            <h5 className="font-medium text-sm mb-3 flex items-center gap-2 text-amber-800">
              <Star className="h-4 w-4" />
              Quantified Achievements ({fullResponse.quantifiedAchievements.length})
            </h5>
            <div className="space-y-2">
              {fullResponse.quantifiedAchievements.map((achievement: any, i: number) => (
                <div key={i} className="p-2 bg-white rounded border flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-sm">{achievement.achievement}</div>
                    {achievement.metric && (
                      <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded mt-1 inline-block">
                        {achievement.metric}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {achievement.category && (
                      <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700">
                        {achievement.category}
                      </Badge>
                    )}
                    {achievement.verified && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Enhanced Red Flags */}
        {fullResponse.redFlags && fullResponse.redFlags.length > 0 && (
          <div className="p-3 bg-gradient-to-r from-red-50 to-pink-50 rounded-lg border border-red-200">
            <h5 className="font-medium text-sm mb-3 flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-4 w-4" />
              Red Flags ({fullResponse.redFlags.length})
            </h5>
            <div className="space-y-2">
              {fullResponse.redFlags.map((flag: any, i: number) => (
                <div key={i} className={`p-2 rounded border ${getSeverityColor(flag.severity)}`}>
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{flag.type || 'FLAG'}</Badge>
                      <Badge variant="outline" className={`text-xs ${getSeverityColor(flag.severity)}`}>
                        {flag.severity || 'MEDIUM'}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-sm font-medium">{flag.issue}</div>
                  {flag.evidence && (
                    <div className="text-xs text-gray-600 mt-1">Evidence: {flag.evidence}</div>
                  )}
                  {flag.dates && (
                    <div className="text-xs text-gray-500 mt-1">Dates: {flag.dates}</div>
                  )}
                  {flag.impact && (
                    <div className="text-xs text-red-600 mt-1">Impact: {flag.impact}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Interview Recommendations - supports both old array and new structured format */}
        {fullResponse.interviewRecommendations && (
          <div className="p-3 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg border border-teal-200">
            <h5 className="font-medium text-sm mb-3 flex items-center gap-2 text-teal-800">
              <Users className="h-4 w-4" />
              Interview Preparation Guide
            </h5>

            {/* New structured format */}
            {typeof fullResponse.interviewRecommendations === 'object' && !Array.isArray(fullResponse.interviewRecommendations) && (
              <div className="space-y-3">
                {fullResponse.interviewRecommendations.mustExplore && fullResponse.interviewRecommendations.mustExplore.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-teal-700 mb-1">Must Explore</div>
                    <ul className="space-y-1">
                      {fullResponse.interviewRecommendations.mustExplore.map((item: string, i: number) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-teal-600 font-bold">→</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {fullResponse.interviewRecommendations.redFlagQuestions && fullResponse.interviewRecommendations.redFlagQuestions.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-orange-700 mb-1">Red Flag Questions</div>
                    <ul className="space-y-1">
                      {fullResponse.interviewRecommendations.redFlagQuestions.map((item: string, i: number) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-orange-500">⚠</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {fullResponse.interviewRecommendations.technicalValidation && fullResponse.interviewRecommendations.technicalValidation.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-blue-700 mb-1">Technical Validation</div>
                    <ul className="space-y-1">
                      {fullResponse.interviewRecommendations.technicalValidation.map((item: string, i: number) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-blue-500">✓</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {fullResponse.interviewRecommendations.culturalFitTopics && fullResponse.interviewRecommendations.culturalFitTopics.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-purple-700 mb-1">Cultural Fit Topics</div>
                    <ul className="space-y-1">
                      {fullResponse.interviewRecommendations.culturalFitTopics.map((item: string, i: number) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-purple-500">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {fullResponse.interviewRecommendations.referenceCheckFocus && fullResponse.interviewRecommendations.referenceCheckFocus.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-gray-700 mb-1">Reference Check Focus</div>
                    <ul className="space-y-1">
                      {fullResponse.interviewRecommendations.referenceCheckFocus.map((item: string, i: number) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-gray-500">◆</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Legacy array format */}
            {Array.isArray(fullResponse.interviewRecommendations) && fullResponse.interviewRecommendations.length > 0 && (
              <ul className="space-y-1">
                {fullResponse.interviewRecommendations.map((rec: string, i: number) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <span className="text-teal-500 mt-1">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Section A: Skills & Competency */}
        {detailedBreakdown.sectionA && (
          <div>
            <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Section A: Skills & Competency ({fullResponse.sectionA ?? 0}/30 pts)
            </h5>
            <div className="space-y-2">
              {detailedBreakdown.sectionA.A1_skillsMatch && renderSubsectionItem('A1: Skills Match', detailedBreakdown.sectionA.A1_skillsMatch, 15)}
              {detailedBreakdown.sectionA.A1_coreTechStackMatch && renderSubsectionItem('A1: Core Skills Match', detailedBreakdown.sectionA.A1_coreTechStackMatch, 15)}
              {detailedBreakdown.sectionA.A2_skillDepth && renderSubsectionItem('A2: Skill Depth & Recency', detailedBreakdown.sectionA.A2_skillDepth, 10)}
              {detailedBreakdown.sectionA.A2_skillRecency && renderSubsectionItem('A2: Skill Recency', detailedBreakdown.sectionA.A2_skillRecency, 10)}
              {detailedBreakdown.sectionA.A3_toolsMatch && renderSubsectionItem('A3: Tools/Systems Match', detailedBreakdown.sectionA.A3_toolsMatch, 5)}
              {detailedBreakdown.sectionA.A3_requiredToolVolume && renderSubsectionItem('A3: Required Tools', detailedBreakdown.sectionA.A3_requiredToolVolume, 5)}
            </div>
          </div>
        )}

        {/* Section B: Experience */}
        {detailedBreakdown.sectionB && (
          <div>
            <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
              <User className="h-4 w-4" />
              Section B: Experience Alignment ({fullResponse.sectionB ?? 0}/25 pts)
            </h5>
            <div className="space-y-2">
              {detailedBreakdown.sectionB.B1_yearsExperience && renderSubsectionItem('B1: Years of Experience', detailedBreakdown.sectionB.B1_yearsExperience, 10)}
              {detailedBreakdown.sectionB.B1_qualifiedYears && renderSubsectionItem('B1: Qualified Years', detailedBreakdown.sectionB.B1_qualifiedYears, 10)}
              {detailedBreakdown.sectionB.B2_seniorityMatch && renderSubsectionItem('B2: Seniority Match', detailedBreakdown.sectionB.B2_seniorityMatch, 10)}
              {detailedBreakdown.sectionB.B2_seniorityValidation && renderSubsectionItem('B2: Seniority Validation', detailedBreakdown.sectionB.B2_seniorityValidation, 10)}
              {detailedBreakdown.sectionB.B3_stability && renderSubsectionItem('B3: Career Stability', detailedBreakdown.sectionB.B3_stability, 5)}
              {detailedBreakdown.sectionB.B3_jobStability && renderSubsectionItem('B3: Job Stability', detailedBreakdown.sectionB.B3_jobStability, 5)}
            </div>
          </div>
        )}

        {/* Section C: Impact & Achievements */}
        {detailedBreakdown.sectionC && (
          <div>
            <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Section C: Impact & Achievements ({fullResponse.sectionC ?? 0}/20 pts)
            </h5>
            <div className="space-y-2">
              {detailedBreakdown.sectionC.C1_quantifiedResults && renderSubsectionItem('C1: Quantified Results', detailedBreakdown.sectionC.C1_quantifiedResults, 12)}
              {detailedBreakdown.sectionC.C1_scopeComplexity && renderSubsectionItem('C1: Scope & Complexity', detailedBreakdown.sectionC.C1_scopeComplexity, 12)}
              {detailedBreakdown.sectionC.C2_softSkills && renderSubsectionItem('C2: Soft Skills Evidence', detailedBreakdown.sectionC.C2_softSkills, 8)}
              {detailedBreakdown.sectionC.C2_softSkillMatch && renderSubsectionItem('C2: Soft Skill Match', detailedBreakdown.sectionC.C2_softSkillMatch, 8)}
            </div>
          </div>
        )}

        {/* Section D: Qualifications */}
        {detailedBreakdown.sectionD && (
          <div>
            <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
              <Star className="h-4 w-4" />
              Section D: Qualifications ({fullResponse.sectionD ?? 0}/10 pts)
            </h5>
            <div className="space-y-2">
              {renderSubsectionItem('D1: Education', detailedBreakdown.sectionD.D1_education, 5)}
              {renderSubsectionItem('D2: Certifications', detailedBreakdown.sectionD.D2_certifications, 5)}
            </div>
          </div>
        )}

        {/* Section E: Logistics */}
        {detailedBreakdown.sectionE && (
          <div>
            <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Section E: Logistics & Compatibility ({fullResponse.sectionE ?? 0}/10 pts)
            </h5>
            <div className="space-y-2">
              {detailedBreakdown.sectionE.E1_location && renderSubsectionItem('E1: Location Match', detailedBreakdown.sectionE.E1_location, 4)}
              {detailedBreakdown.sectionE.E1_languageMatch && renderSubsectionItem('E1: Language Match', detailedBreakdown.sectionE.E1_languageMatch, 4)}
              {detailedBreakdown.sectionE.E2_language && renderSubsectionItem('E2: Language', detailedBreakdown.sectionE.E2_language, 3)}
              {detailedBreakdown.sectionE.E2_locationMatch && renderSubsectionItem('E2: Location', detailedBreakdown.sectionE.E2_locationMatch, 3)}
              {detailedBreakdown.sectionE.E3_contactQuality && renderSubsectionItem('E3: Contact & Resume Quality', detailedBreakdown.sectionE.E3_contactQuality, 3)}
              {detailedBreakdown.sectionE.E3_contactability && renderSubsectionItem('E3: Contactability', detailedBreakdown.sectionE.E3_contactability, 3)}
            </div>
          </div>
        )}

        {/* Section F: Bonus & Penalties */}
        {detailedBreakdown.sectionF && (
          <div>
            <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Section F: Bonus & Penalties ({fullResponse.sectionF ?? 0} pts)
            </h5>
            <div className="space-y-2">
              {detailedBreakdown.sectionF.bonusPoints && renderSubsectionItem('Bonus Points', detailedBreakdown.sectionF.bonusPoints, 5)}
              {detailedBreakdown.sectionF.penalties && renderSubsectionItem('Penalties', detailedBreakdown.sectionF.penalties, undefined)}
              {detailedBreakdown.sectionF.F1_disqualification && renderSubsectionItem('Disqualification Check', detailedBreakdown.sectionF.F1_disqualification, undefined)}
              {detailedBreakdown.sectionF.F2_bonusPoints && renderSubsectionItem('Bonus Points', detailedBreakdown.sectionF.F2_bonusPoints, 5)}
            </div>
          </div>
        )}
      </div>
    );

    // Render legacy format
    const renderLegacyFormat = () => (
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
    );

    return (
      <div className="mt-4 border border-gray-200 rounded-lg">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full p-3 bg-gray-50 hover:bg-gray-100 rounded-t-lg transition-colors"
        >
          <span className="font-medium text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Detailed Analysis {isNewFormat && <Badge variant="outline" className="text-xs">100-Point Matrix</Badge>}
          </span>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        {isExpanded && (isNewFormat ? renderNewFormat() : renderLegacyFormat())}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Active Jobs Progress Indicator */}
      <AnimatePresence>
        {activeJobsData && activeJobsData.hasActiveJobs && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-blue-200 bg-blue-50/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  Resume Processing in Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-white rounded-lg p-6 border border-blue-200">
                  {/* Overall Progress */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-2xl font-bold text-blue-600">
                        {activeJobsData.completedFiles} / {activeJobsData.totalFiles}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {activeJobsData.totalFiles === 1 ? 'Resume' : 'Resumes'} Processed
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-blue-600">{activeJobsData.overallProgress}%</p>
                      <p className="text-xs text-muted-foreground">Complete</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <Progress value={activeJobsData.overallProgress} className="h-3" />
                  </div>

                  {/* Status Details */}
                  <div className="flex items-center gap-6 text-sm">
                    {activeJobsData.activeJobsCount > 0 && (
                      <div className="flex items-center gap-2 text-blue-600">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="font-medium">
                          {activeJobsData.activeJobsCount} {activeJobsData.activeJobsCount === 1 ? 'job' : 'jobs'} processing
                        </span>
                      </div>
                    )}
                    {activeJobsData.waitingJobsCount > 0 && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        <span>
                          {activeJobsData.waitingJobsCount} {activeJobsData.waitingJobsCount === 1 ? 'job' : 'jobs'} in queue
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Active Job Details */}
                  {activeJobsData.activeJobDetails && activeJobsData.activeJobDetails.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Currently Processing:</p>
                      <div className="space-y-1">
                        {activeJobsData.activeJobDetails.map((job, index) => (
                          <div key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <div className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse"></div>
                            <span>{job.fileName} ({job.progress}%)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters Card */}
      <Card>
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
                  <SelectItem key={job.id} value={String(job.id)}>
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
                Qualified: {displayRows.filter(row => !row.disqualified).length}
              </span>
              <span>•</span>
              <span className="text-red-600">
                Disqualified: {displayRows.filter(row => row.disqualified).length}
              </span>
            </div>

            <div className="flex gap-2">
              {displayRows.length > 0 && exportAllProfiles()}
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
          ) : displayRows.length === 0 ? (
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
                    {displayRows.map((row, index) => (
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
                              <>
                                <Badge variant={getScoreBadgeVariant(row.overallScore)} className="w-fit">
                                  {row.overallScore}% Match
                                </Badge>
                                {row.jobScore?.fullResponse?.verdict?.decision && (
                                  <Badge
                                    className={`w-fit text-xs ${
                                      row.jobScore.fullResponse.verdict.decision === 'INTERVIEW' ? 'bg-green-500 text-white' :
                                      row.jobScore.fullResponse.verdict.decision === 'CONSIDER' ? 'bg-blue-500 text-white' :
                                      row.jobScore.fullResponse.verdict.decision === 'REVIEW' ? 'bg-yellow-500 text-white' :
                                      'bg-red-500 text-white'
                                    }`}
                                  >
                                    {row.jobScore.fullResponse.verdict.decision}
                                  </Badge>
                                )}
                              </>
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
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedProfile(row.profile);
                                setSelectedJobScore(row.jobScore);
                              }}
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

      {/* Profile Detail Modal */}
      {selectedProfile && (
        <Dialog open={!!selectedProfile} onOpenChange={() => {
          setSelectedProfile(null);
          setSelectedJobScore(null);
        }}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-6">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {selectedProfile.name} - Full Profile
                </DialogTitle>
                <div className="flex gap-2">
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
                    {(selectedJobScore ? [selectedJobScore] : selectedProfile.jobScores).map((jobScore) => {
                      const job = jobs.find((j: any) => String(j.id) === String(jobScore.jobId));
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
  );
}
