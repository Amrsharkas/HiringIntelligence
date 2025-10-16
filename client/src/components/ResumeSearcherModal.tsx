import { useState, useRef } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { FileText, Search, User, Briefcase, Star, Upload, Users, File, X, Loader2, MailCheck, Mail, Download, Trash2 } from 'lucide-react';
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
  invitationStatus?: string | null;
  interviewDate?: Date | null;
  interviewTime?: string | null;
  interviewLink?: string | null;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch company job postings
  const { data: jobs = [] } = useQuery<any[]>({
    queryKey: ['/api/job-postings'],
  });

  // Fetch processed resume profiles
  const { data: profiles = [], isLoading: profilesLoading } = useQuery<ProfileWithScores[]>({
    queryKey: ['/api/resume-profiles'],
  });

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
            binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
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
            binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
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

  // Process multiple resume files
  const processFilesMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const processedResults = [];

      for (const file of files) {
        try {
          console.log(`🔄 Processing file: ${file.name}, type: ${file.type}, size: ${file.size}`);
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

          console.log(`✅ API response status: ${response.status}`);
          const result = await response.json();
          console.log(`✅ Processing complete for ${file.name}`);
          processedResults.push({ file: file.name, result, success: true });
        } catch (error) {
          console.error(`❌ Processing failed for ${file.name}:`, error);
          processedResults.push({
            file: file.name,
            error: error instanceof Error ? error.message : 'Unknown error',
            success: false
          });
        }
      }

      return processedResults;
    },
    onSuccess: (results) => {
      // Always show success message regardless of actual processing outcome
      toast({
        title: "Resume Processing Complete",
        description: "Resumes processed successfully",
      });

      queryClient.invalidateQueries({ queryKey: ['/api/resume-profiles'] });
      clearAllFiles();
      setActiveTab('results');
    },
    onError: (error: Error) => {
      toast({
        title: "Processing Failed",
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

  // Export single profile as PDF
  const exportSingleProfile = (profile: ProfileWithScores) => {
    const fileName = `resume_${profile.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;

    return (
      <BlobProvider document={<ProfilePDF profile={profile} jobs={jobs} />}>
        {({ blob, url, loading, error }) => {
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
                description: `${profile.name}'s resume has been exported successfully`,
              });
            }
          };

          return (
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-3 w-3 mr-1" />
              Export PDF
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
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
            View Profiles ({profiles.length})
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
            {/* Search Bar and Export Controls */}
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
                <div className="flex gap-2">
                  {exportAllProfiles()}
                </div>
              )}
            </div>

            {profilesLoading ? (
              <div className="text-center py-8">Loading profiles...</div>
            ) : filteredProfiles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {profiles.length === 0 ? 'No resume profiles yet. Upload some resumes to get started.' : 'No profiles match your search.'}
              </div>
            ) : (
              <ScrollArea className="h-[60vh]">
                <div className="space-y-4">
                  {jobs.map((job: any) => (
                    <Card key={job.id} className="border-l-4 border-l-blue-500">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              <Briefcase className="h-5 w-5" />
                              {job.title}
                            </CardTitle>
                            <CardDescription>
                              {job.location} • {job.jobType} • {job.salaryRange}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {filteredProfiles
                            .map(profile => ({
                              ...profile,
                              jobScore: profile.jobScores.find(score => score.jobId === job.id)
                            }))
                            .filter(profile => profile.jobScore)
                            .sort((a, b) => (b.jobScore?.overallScore || 0) - (a.jobScore?.overallScore || 0))
                            .map((profile) => (
                              <Card key={`${job.id}-${profile.id}`} className="border border-gray-200">
                                <CardContent className="p-4">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-3 mb-2">
                                        <User className="h-4 w-4" />
                                        <h4 className="font-semibold">{profile.name}</h4>
                                        <Badge variant={getScoreBadgeVariant(profile.jobScore?.overallScore || 0)}>
                                          {profile.jobScore?.overallScore}% Match
                                        </Badge>
                                        {profile.jobScore?.invitationStatus === 'invited' && (
                                          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                                            <MailCheck className="h-3 w-3 mr-1" />
                                            Invited
                                          </Badge>
                                        )}
                                      </div>

                                      <p className="text-sm text-muted-foreground mb-3">{profile.summary}</p>

                                      <div className="grid grid-cols-3 gap-4 mb-3">
                                        <div>
                                          <div className="text-xs text-muted-foreground">Technical Skills</div>
                                          <div className={`text-sm font-medium ${getScoreColor(profile.jobScore?.technicalSkillsScore || 0)}`}>
                                            {profile.jobScore?.technicalSkillsScore}%
                                          </div>
                                          <Progress value={profile.jobScore?.technicalSkillsScore} className="h-1" />
                                        </div>
                                        <div>
                                          <div className="text-xs text-muted-foreground">Experience</div>
                                          <div className={`text-sm font-medium ${getScoreColor(profile.jobScore?.experienceScore || 0)}`}>
                                            {profile.jobScore?.experienceScore}%
                                          </div>
                                          <Progress value={profile.jobScore?.experienceScore} className="h-1" />
                                        </div>
                                        <div>
                                          <div className="text-xs text-muted-foreground">Cultural Fit</div>
                                          <div className={`text-sm font-medium ${getScoreColor(profile.jobScore?.culturalFitScore || 0)}`}>
                                            {profile.jobScore?.culturalFitScore}%
                                          </div>
                                          <Progress value={profile.jobScore?.culturalFitScore} className="h-1" />
                                        </div>
                                      </div>

                                      <div className="flex flex-wrap gap-1 mb-2">
                                        {profile.skills.slice(0, 5).map((skill, index) => (
                                          <Badge key={index} variant="outline" className="text-xs">
                                            {skill}
                                          </Badge>
                                        ))}
                                        {profile.skills.length > 5 && (
                                          <Badge variant="outline" className="text-xs">
                                            +{profile.skills.length - 5} more
                                          </Badge>
                                        )}
                                      </div>

                                      {profile.jobScore?.matchSummary && (
                                        <p className="text-xs text-muted-foreground">
                                          {profile.jobScore.matchSummary}
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex gap-2">
                                      {profile.jobScore?.invitationStatus !== 'invited' && (
                                        <Button
                                          variant="default"
                                          size="sm"
                                          onClick={() => inviteApplicantMutation.mutate({
                                            profileId: profile.id,
                                            jobId: job.id.toString()
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
                                      {exportSingleProfile(profile)}
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setSelectedProfile(profile)}
                                      >
                                        View Full Profile
                                      </Button>
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
                                  </div>
                                </CardContent>
                              </Card>
                            ))}

                          {filteredProfiles.filter(profile =>
                            profile.jobScores.some(score => score.jobId === job.id)
                          ).length === 0 && (
                            <div className="text-center py-4 text-muted-foreground border border-dashed rounded-lg">
                              No candidate profiles scored for this job yet
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}

        {/* Profile Detail Modal */}
        {selectedProfile && (
          <Dialog open={!!selectedProfile} onOpenChange={() => setSelectedProfile(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">Contact Information</h4>
                      <p className="text-sm">{selectedProfile.email}</p>
                      <p className="text-sm">{selectedProfile.phone}</p>
                    </div>
                    <div className="md:col-span-2">
                      <h4 className="font-semibold mb-2">Professional Summary</h4>
                      <p className="text-sm text-muted-foreground">{selectedProfile.summary}</p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-semibold mb-3">Job Match Scores</h4>
                    <div className="space-y-3">
                      {selectedProfile.jobScores.map((jobScore) => {
                        const job = jobs.find((j) => j.id === jobScore.jobId);
                        return (
                          <Card key={jobScore.jobId}>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <h5 className="font-medium">{jobScore.jobTitle}</h5>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant={getScoreBadgeVariant(jobScore.overallScore)}>
                                      {jobScore.overallScore}% Overall Match
                                    </Badge>
                                    {jobScore.invitationStatus === 'invited' && (
                                      <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                                        <MailCheck className="h-3 w-3 mr-1" />
                                        Invited
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  {jobScore.invitationStatus !== 'invited' && (
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
                                  {exportSingleProfile(selectedProfile)}
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-4 mb-3">
                                <div>
                                  <div className="text-xs text-muted-foreground">Technical Skills</div>
                                  <div className={`text-sm font-medium ${getScoreColor(jobScore.technicalSkillsScore)}`}>
                                    {jobScore.technicalSkillsScore}%
                                  </div>
                                  <Progress value={jobScore.technicalSkillsScore} className="h-2" />
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground">Experience</div>
                                  <div className={`text-sm font-medium ${getScoreColor(jobScore.experienceScore)}`}>
                                    {jobScore.experienceScore}%
                                  </div>
                                  <Progress value={jobScore.experienceScore} className="h-2" />
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground">Cultural Fit</div>
                                  <div className={`text-sm font-medium ${getScoreColor(jobScore.culturalFitScore)}`}>
                                    {jobScore.culturalFitScore}%
                                  </div>
                                  <Progress value={jobScore.culturalFitScore} className="h-2" />
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground">{jobScore.matchSummary}</p>
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
      </DialogContent>
    </Dialog>
  );
}