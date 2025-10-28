import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { FileText, Search, User, Briefcase, Star, Upload, Users, File, X, Loader2, MailCheck, Mail, Download, Trash2, ChevronDown, ChevronRight, AlertTriangle, CheckCircle } from 'lucide-react';
import { BlobProvider } from '@react-pdf/renderer';
import ProfilePDF from './ProfilePDF';
import ProfilesPDF from './ProfilesPDF';

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

interface ResumeSearcherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ResumeSearcherModal({ isOpen, onClose }: ResumeSearcherModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'upload' | 'search' | 'results'>('upload');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [processingJobId, setProcessingJobId] = useState<string>('all');
  const [selectedProfile, setSelectedProfile] = useState<ProfileWithScores | null>(null);
  const [customRules, setCustomRules] = useState<string>('');
  const [showProcessingNotice, setShowProcessingNotice] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch company job postings
  const { data: jobs = [] } = useQuery<any[]>({
    queryKey: ['/api/job-postings'],
  });

  // Fetch processed resume profiles with per-job pagination
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [jobPages, setJobPages] = useState<{ [key: string]: number }>({});

  // Initialize job pages to 1 when jobs are loaded
  useEffect(() => {
    if (jobs.length > 0) {
      const initialPages: { [key: string]: number } = {};
      jobs.forEach((job: any) => {
        initialPages[job.id] = 1;
      });
      setJobPages(initialPages);
    }
  }, [jobs]);

  const { data: profilesResponse, isLoading: profilesLoading, refetch: refetchProfiles } = useQuery<{
    data: ProfileWithScores[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }>({
    queryKey: ['/api/resume-profiles', 1, 1000], // Get all profiles (with high limit) for proper per-job pagination
    queryFn: async () => {
      const response = await fetch(`/api/resume-profiles?page=1&limit=1000`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch resume profiles');
      }
      return response.json();
    }
  });

  const profiles = profilesResponse?.data || [];
  const pagination = profilesResponse?.pagination;
  const totalProfiles = pagination?.totalItems || 0;

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const maxFileSize = 5 * 1024 * 1024; // 5MB limit
    
    const validFiles = files.filter(file => {
      // Check file type
      const isValidType = file.type === 'application/pdf' || 
        file.type === 'text/plain' || 
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.type === 'application/msword';
      
      // Check file size
      const isValidSize = file.size <= maxFileSize;
      
      if (!isValidType) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not supported. Only PDF, DOC, DOCX, and TXT files are allowed.`,
          variant: "destructive",
        });
        return false;
      }
      
      if (!isValidSize) {
        toast({
          title: "File too large",
          description: `${file.name} is too large. Maximum file size is 5MB.`,
          variant: "destructive",
        });
        return false;
      }
      
      return true;
    });
    
    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllFiles = () => {
    setSelectedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Extract text from file
  const extractTextFromFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      if (file.type === 'application/pdf') {
        // For PDF files, we'll send the base64 data to the server for processing
        reader.onload = (e) => {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          // Use a more efficient method for large files
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          const chunkSize = 0x8000; // 32KB chunks
          for (let i = 0; i < bytes.length; i += chunkSize) {
            const chunk = bytes.subarray(i, i + chunkSize);
            binary += String.fromCharCode.apply(null, Array.from(chunk));
          }
          const base64 = btoa(binary);
          resolve(base64);
        };
        reader.onerror = () => reject(new Error('Failed to read PDF file'));
        reader.readAsArrayBuffer(file);
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.type === 'application/msword') {
        // For DOCX files, we'll send the base64 data to the server for processing
        reader.onload = (e) => {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          // Use a more efficient method for large files
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          const chunkSize = 0x8000; // 32KB chunks
          for (let i = 0; i < bytes.length; i += chunkSize) {
            const chunk = bytes.subarray(i, i + chunkSize);
            binary += String.fromCharCode.apply(null, Array.from(chunk));
          }
          const base64 = btoa(binary);
          resolve(base64);
        };
        reader.onerror = () => reject(new Error('Failed to read DOCX file'));
        reader.readAsArrayBuffer(file);
      } else {
        // For text files, read as text
        reader.onload = (e) => {
          const text = e.target?.result as string;
          resolve(text);
        };
        reader.onerror = () => reject(new Error('Failed to read text file'));
        reader.readAsText(file);
      }
    });
  };

  // Process multiple resume files (background processing)
  const processFilesMutation = useMutation({
    mutationFn: async (files: File[]) => {
      if (files.length === 1) {
        // Single file processing
        const file = files[0];
        console.log(`🔄 Starting background processing for single file: ${file.name}, type: ${file.type}, size: ${file.size}`);

        const fileData = await extractTextFromFile(file);
        console.log(`📄 Extracted text length: ${fileData?.length}`);

        const requestBody: any = {
          resumeText: fileData,
          fileName: file.name,
          fileType: file.type
        };

        // Add jobId to request if a specific job is selected
        if (processingJobId !== 'all') {
          requestBody.jobId = processingJobId;
        }

        // Add custom rules if provided
        if (customRules.trim()) {
          requestBody.customRules = customRules.trim();
        }

        const response = await apiRequest('POST', '/api/resume-profiles/process', requestBody);
        const result = await response.json();

        console.log(`📋 Created background job ${result.jobId} for ${file.name}`);

        return {
          jobId: result.jobId,
          fileCount: 1,
          message: result.message,
          status: result.status
        };
      } else {
        // Bulk processing
        console.log(`🔄 Starting background bulk processing for ${files.length} files`);

        const filesData = [];
        for (const file of files) {
          const fileData = await extractTextFromFile(file);
          filesData.push({
            name: file.name,
            content: fileData,
            type: file.type
          });
        }

        const requestBody: any = {
          files: filesData
        };

        // Add jobId to request if a specific job is selected
        if (processingJobId !== 'all') {
          requestBody.jobId = processingJobId;
        }

        // Add custom rules if provided
        if (customRules.trim()) {
          requestBody.customRules = customRules.trim();
        }

        const response = await apiRequest('POST', '/api/resume-profiles/process-bulk', requestBody);
        const result = await response.json();

        console.log(`📋 Created background bulk job ${result.jobId} for ${result.fileCount} files`);

        return {
          jobId: result.jobId,
          fileCount: result.fileCount,
          message: result.message,
          status: result.status
        };
      }
    },
    onSuccess: (result) => {
      toast({
        title: "Resume Processing Started",
        description: `${result.fileCount} file${result.fileCount > 1 ? 's' : ''} are being processed in the background. Please refresh the page manually to see new profiles once processing is complete.`,
      });

      setShowProcessingNotice(true);
      clearAllFiles();
      setActiveTab('results');

      // Refresh profiles list after a delay to allow for processing
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/resume-profiles'] });
        // Hide the notice after profiles are refreshed (even if empty)
        setShowProcessingNotice(false);
      }, 5000);
    },
    onError: (error: Error) => {
      toast({
        title: "Processing Failed to Start",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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
                Generating PDF...
              </Button>
            );
          }

          if (error) {
            return (
              <Button variant="outline" size="sm" disabled>
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
                description: `${profile.name}'s full profile has been exported successfully`,
              });
            }
          };

          return (
            <Button variant="outline" size="sm" onClick={handleDownload} className="flex items-center gap-2">
              <Download className="h-3 w-3" />
              <span className="hidden sm:inline">Export PDF</span>
              <span className="sm:hidden">PDF</span>
            </Button>
          );
        }}
      </BlobProvider>
    );
  };

  // Export disqualified candidates summary
  const exportDisqualifiedSummary = () => {
    const disqualifiedProfiles = filteredProfiles.filter(profile =>
      profile.jobScores.some(score => score.disqualified)
    );

    if (disqualifiedProfiles.length === 0) {
      return (
        <Button variant="outline" disabled>
          No Disqualified Candidates
        </Button>
      );
    }

    const fileName = `disqualified_candidates_summary_${new Date().toISOString().split('T')[0]}.pdf`;

    return (
      <BlobProvider document={<ProfilesPDF profiles={disqualifiedProfiles} jobs={jobs} />}>
        {({ blob, loading, error }) => {
          if (loading) {
            return (
              <Button variant="outline" disabled>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating Summary...
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
                title: "Summary Exported",
                description: `${disqualifiedProfiles.length} disqualified candidates have been exported successfully`,
              });
            }
          };

          return (
            <Button variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Export Disqualified Summary ({disqualifiedProfiles.length})
            </Button>
          );
        }}
      </BlobProvider>
    );
  };

  // Export all profiles as PDF
  const exportAllProfiles = () => {
    const fileName = `all_resumes_export_${new Date().toISOString().split('T')[0]}.pdf`;

    return (
      <BlobProvider document={<ProfilesPDF profiles={filteredProfiles} jobs={jobs} />}>
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
                description: `All ${filteredProfiles.length} profiles have been exported successfully`,
              });
            }
          };

          return (
            <Button variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Export All Profiles ({filteredProfiles.length})
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

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  const filteredProfiles = profiles.filter(profile =>
    profile.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    profile.skills.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase())) ||
    profile.experience.some(exp => exp.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Helper function to get paginated profiles for a specific job
  const getPaginatedProfilesForJob = (jobId: string) => {
    const jobProfiles = filteredProfiles
      .map(profile => ({
        ...profile,
        jobScore: profile.jobScores.find(score => score.jobId === jobId)
      }))
      .filter(profile => profile.jobScore)
      .sort((a, b) => (b.jobScore?.overallScore || 0) - (a.jobScore?.overallScore || 0));

    const currentPage = jobPages[jobId] || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;

    return {
      profiles: jobProfiles.slice(startIndex, endIndex),
      totalCount: jobProfiles.length,
      currentPage,
      totalPages: Math.ceil(jobProfiles.length / itemsPerPage),
      hasNextPage: currentPage < Math.ceil(jobProfiles.length / itemsPerPage),
      hasPrevPage: currentPage > 1
    };
  };

  // Helper function to set page for a specific job
  const setJobPage = (jobId: string, page: number) => {
    setJobPages(prev => ({
      ...prev,
      [jobId]: page
    }));
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto p-6">
          <div className="max-w-full overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Resume Searcher
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-4 mb-4 sticky top-0 bg-background z-10 pb-2">
          <Button
            variant={activeTab === 'upload' ? 'default' : 'outline'}
            onClick={() => setActiveTab('upload')}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Process Resumes
          </Button>
          <Button
            variant={activeTab === 'results' ? 'default' : 'outline'}
            onClick={() => setActiveTab('results')}
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            View Profiles ({totalProfiles})
          </Button>
        </div>

        {activeTab === 'upload' && (
          <div className="space-y-6">
            {/* Job Selection Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Select Job for Scoring
                </CardTitle>
                <CardDescription>
                  Choose a specific job to score resumes against, or leave blank to score against all jobs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={processingJobId} onValueChange={setProcessingJobId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a job (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Score against all jobs</SelectItem>
                    {jobs.map((job: any) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Custom Rules Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Custom Parsing Rules
                </CardTitle>
                <CardDescription>
                  Write specific instructions for how the AI should parse and analyze the resumes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={customRules}
                  onChange={(e) => setCustomRules(e.target.value)}
                  placeholder="Example rules:
- Focus on extracting leadership experience and team management skills
- Pay special attention to cloud computing certifications (AWS, Azure, GCP)
- Look for remote work experience and cross-functional collaboration
- Highlight any experience with agile methodologies and DevOps
- Emphasize experience with scalable system design and microservices
- Look for data analysis and machine learning experience
- Focus on startup or fast-paced environment experience"
                  className="min-h-[120px] resize-y"
                />
              </CardContent>
            </Card>

            {/* File Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload Resume Files
                </CardTitle>
                <CardDescription>
                  Upload single or multiple resume files (PDF, DOC, DOCX, TXT) for AI analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* File Input */}
                <div className="space-y-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Select Files
                    </Button>
                    
                    {selectedFiles.length > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={clearAllFiles}
                        className="flex items-center gap-2"
                      >
                        <X className="h-4 w-4" />
                        Clear All
                      </Button>
                    )}
                  </div>

                  {/* Selected Files Display */}
                  {selectedFiles.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Selected Files ({selectedFiles.length})</h4>
                      <div className="grid gap-2 max-h-40 overflow-y-auto">
                        {selectedFiles.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 bg-muted rounded-md"
                          >
                            <div className="flex items-center gap-2">
                              <File className="h-4 w-4" />
                              <span className="text-sm truncate">{file.name}</span>
                              <span className="text-xs text-muted-foreground">
                                ({(file.size / 1024).toFixed(1)} KB)
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(index)}
                              className="h-6 w-6 p-0"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Process Button */}
                  <Button
                    onClick={() => processFilesMutation.mutate(selectedFiles)}
                    disabled={selectedFiles.length === 0 || processFilesMutation.isPending}
                    className="w-full"
                  >
                    {processFilesMutation.isPending ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''}...
                      </div>
                    ) : (
                      `Process ${selectedFiles.length} Resume${selectedFiles.length !== 1 ? 's' : ''}`
                    )}
                  </Button>
                </div>

                {/* File Format Help */}
                <div className="text-xs text-muted-foreground">
                  <p>Supported formats: PDF, DOC, DOCX, TXT (max 5MB per file)</p>
                  <p>Note: Text extraction works best with text-based files. Scanned PDFs may not process correctly.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'results' && (
          <div className="space-y-4">
            {/* Background Processing Notice - only show when processing */}
            {(showProcessingNotice || processFilesMutation.isPending) && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-sm text-blue-800">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Resumes are being processed in the background. Please refresh the page manually to see new profiles once processing is complete.</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Search Bar and Export Controls */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search profiles by name, skills, or experience..."
                    className="pl-10"
                  />
                </div>
                {filteredProfiles.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {exportDisqualifiedSummary()}
                    {exportAllProfiles()}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete All ({filteredProfiles.length})
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete All Profiles</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete all {filteredProfiles.length} resume profiles?
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
                  </div>
                )}
              </div>

              {/* Quick Stats */}
              <div className="flex items-center justify-between">
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>Total: {totalProfiles} profiles</span>
                  <span>•</span>
                  <span className="text-red-600">
                    Disqualified: {filteredProfiles.filter(profile =>
                      profile.jobScores.some(score => score.disqualified)
                    ).length}
                  </span>
                  <span>•</span>
                  <span className="text-green-600">
                    Qualified: {filteredProfiles.filter(profile =>
                      profile.jobScores.some(score => !score.disqualified)
                    ).length}
                  </span>
                </div>

                {/* Page size selector */}
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">Show:</label>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      // Reset all job pages to 1 when changing page size
                      setJobPages(prev => {
                        const newPages: { [key: string]: number } = {};
                        Object.keys(prev).forEach(jobId => {
                          newPages[jobId] = 1;
                        });
                        return newPages;
                      });
                    }}
                    className="text-sm border border-gray-300 rounded px-2 py-1"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>
            </div>

            {profilesLoading ? (
              <div className="text-center py-8">Loading profiles...</div>
            ) : filteredProfiles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {profiles.length === 0 ? 'No resume profiles yet. Upload some resumes to get started.' : 'No profiles match your search.'}
              </div>
            ) : (
              <ScrollArea className="h-[60vh]">
                <div className="space-y-6">
                  {jobs.map((job: any) => {
                    const jobPagination = getPaginatedProfilesForJob(job.id);

                    return (
                      <div key={job.id}>
                        {/* Job Header */}
                        <div className="mb-4 p-4 bg-blue-50 rounded-lg border-l-4 border-l-blue-500">
                          <div className="flex items-center gap-3">
                            <Briefcase className="h-5 w-5 text-blue-600" />
                            <div>
                              <h3 className="font-semibold text-lg">{job.title}</h3>
                              <p className="text-sm text-muted-foreground">
                                {job.location} • {job.jobType} • {job.salaryRange}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Profiles Table for this Job */}
                        {jobPagination.totalCount > 0 ? (
                          <div className="border rounded-lg overflow-hidden">
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="min-w-[200px]">Candidate</TableHead>
                                    <TableHead className="min-w-[100px]">Overall Score</TableHead>
                                    <TableHead className="min-w-[100px]">Technical</TableHead>
                                    <TableHead className="min-w-[100px]">Experience</TableHead>
                                    <TableHead className="min-w-[120px]">Status</TableHead>
                                    <TableHead className="min-w-[300px]">Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {jobPagination.profiles.map((profile) => (
                                    <TableRow key={`${job.id}-${profile.id}`}>
                                      <TableCell>
                                        <div className="flex items-center gap-3">
                                          <User className="h-5 w-5 text-muted-foreground" />
                                          <div>
                                            <div className="font-semibold">{profile.name}</div>
                                            <div className="text-sm text-muted-foreground">{profile.email}</div>
                                          </div>
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <div className={`font-bold ${profile.jobScore?.disqualified ? 'text-red-600' : getScoreColor(profile.jobScore?.overallScore || 0)}`}>
                                          {profile.jobScore?.overallScore || 0}%
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <div className={`font-semibold ${profile.jobScore?.disqualified ? 'text-red-600' : getScoreColor(profile.jobScore?.technicalSkillsScore || 0)}`}>
                                          {profile.jobScore?.technicalSkillsScore || 0}%
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <div className={`font-semibold ${profile.jobScore?.disqualified ? 'text-red-600' : getScoreColor(profile.jobScore?.experienceScore || 0)}`}>
                                          {profile.jobScore?.experienceScore || 0}%
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-2">
                                          {profile.jobScore?.disqualified ? (
                                            <Badge variant="destructive" className="text-xs font-semibold">
                                              DISQUALIFIED
                                            </Badge>
                                          ) : (
                                            <Badge variant={getScoreBadgeVariant(profile.jobScore?.overallScore || 0)}>
                                              {profile.jobScore?.overallScore}% Match
                                            </Badge>
                                          )}
                                          {profile.jobScore?.invitationStatus === 'invited' && (
                                            <Badge variant="default" className="bg-green-100 text-green-800 border-green-200 text-xs">
                                              <MailCheck className="h-3 w-3 mr-1" />
                                              Invited
                                            </Badge>
                                          )}
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-1 flex-wrap">
                                          {profile.jobScore?.invitationStatus !== 'invited' && !profile.jobScore?.disqualified && (
                                            <Button
                                              variant="default"
                                              size="sm"
                                              onClick={() => inviteApplicantMutation.mutate({
                                                profileId: profile.id,
                                                jobId: job.id.toString()
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
                                          {exportSingleProfile(profile)}
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setSelectedProfile(profile)}
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
                                                  Are you sure you want to delete {profile.name}'s profile? This action cannot be undone.
                                                </AlertDialogDescription>
                                              </AlertDialogHeader>
                                              <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction
                                                  onClick={() => deleteProfileMutation.mutate(profile.id)}
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

                            {/* Job-specific pagination controls */}
                            {jobPagination.totalPages > 1 && (
                              <div className="flex justify-center mt-4 p-4 border-t">
                                <Pagination>
                                  <PaginationContent>
                                    <PaginationItem>
                                      <PaginationPrevious
                                        onClick={() => setJobPage(job.id, jobPagination.currentPage - 1)}
                                        className={!jobPagination.hasPrevPage ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                      />
                                    </PaginationItem>

                                    {/* Show page numbers for this job */}
                                    {Array.from({ length: Math.min(5, jobPagination.totalPages) }, (_, i) => {
                                      let pageNum;
                                      if (jobPagination.totalPages <= 5) {
                                        pageNum = i + 1;
                                      } else if (jobPagination.currentPage <= 3) {
                                        pageNum = i + 1;
                                      } else if (jobPagination.currentPage >= jobPagination.totalPages - 2) {
                                        pageNum = jobPagination.totalPages - 4 + i;
                                      } else {
                                        pageNum = jobPagination.currentPage - 2 + i;
                                      }

                                      return (
                                        <PaginationItem key={pageNum}>
                                          <PaginationLink
                                            onClick={() => setJobPage(job.id, pageNum)}
                                            isActive={pageNum === jobPagination.currentPage}
                                            className="cursor-pointer"
                                          >
                                            {pageNum}
                                          </PaginationLink>
                                        </PaginationItem>
                                      );
                                    })}

                                    <PaginationItem>
                                      <PaginationNext
                                        onClick={() => setJobPage(job.id, jobPagination.currentPage + 1)}
                                        className={!jobPagination.hasNextPage ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                      />
                                    </PaginationItem>
                                  </PaginationContent>
                                </Pagination>
                                <div className="ml-4 text-sm text-muted-foreground">
                                  Showing {jobPagination.profiles.length} of {jobPagination.totalCount} candidates
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                            No candidate profiles scored for this job yet
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}

                      </div>
        )}

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
                    <div className="flex gap-2">
                      {exportSingleProfile(selectedProfile)}
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
      </DialogContent>
    </Dialog>
  );
}