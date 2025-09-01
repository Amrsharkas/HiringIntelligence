import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  FileText, 
  Search, 
  User, 
  Briefcase, 
  Star, 
  Upload, 
  Users, 
  File, 
  X, 
  Loader2, 
  CheckCircle,
  XCircle,
  Settings
} from 'lucide-react';

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

interface QualificationResult {
  id: number;
  candidateId: string;
  jobId: number;
  qualificationScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  decision: string;
  passThreshold: number;
  autoAdvanceEnabled: boolean;
  candidateStage: string;
  createdAt: string;
}

interface ProfileWithQualification extends ResumeProfile {
  qualificationResults: QualificationResult[];
}

interface ApplicantQualifierModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ApplicantQualifierModal({ isOpen, onClose }: ApplicantQualifierModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'upload' | 'qualify' | 'results'>('qualify');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<ProfileWithQualification | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [passThreshold, setPassThreshold] = useState(70);
  const [autoAdvanceEnabled, setAutoAdvanceEnabled] = useState(true);
  const [qualificationResult, setQualificationResult] = useState<QualificationResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch company job postings
  const { data: jobs = [] } = useQuery<any[]>({
    queryKey: ['/api/job-postings'],
  });

  // Fetch processed resume profiles
  const { data: profiles = [], isLoading: profilesLoading } = useQuery<ProfileWithQualification[]>({
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
          
          const response = await apiRequest('POST', '/api/resume-profiles/process', {
            resumeText: fileData,
            fileName: file.name,
            fileType: file.type
          });
          
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
      toast({
        title: "Resume Processing Complete",
        description: "Resumes processed successfully",
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/resume-profiles'] });
      clearAllFiles();
      setActiveTab('qualify');
    },
    onError: (error: Error) => {
      toast({
        title: "Processing Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Qualify candidate mutation
  const qualifyMutation = useMutation({
    mutationFn: async ({ candidateId, jobId }: { candidateId: string; jobId: number }) => {
      const response = await apiRequest('POST', '/api/qualification/qualify', {
        candidateId,
        jobId,
        passThreshold,
        autoAdvanceEnabled
      });
      return await response.json();
    },
    onSuccess: (result) => {
      setQualificationResult(result);
      queryClient.invalidateQueries({ queryKey: ['/api/resume-profiles'] });
      toast({
        title: "Qualification Complete",
        description: `Candidate scored ${result.qualificationScore}% and was ${result.decision.toLowerCase()}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Qualification Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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

  const handleQualifyCandidate = () => {
    if (!selectedProfile || !selectedJobId) {
      toast({
        title: "Selection Required",
        description: "Please select both a candidate and a job position",
        variant: "destructive",
      });
      return;
    }
    
    qualifyMutation.mutate({
      candidateId: selectedProfile.id,
      jobId: selectedJobId
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Applicant Qualifier
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-4 mb-4">
          <Button
            variant={activeTab === 'upload' ? 'default' : 'outline'}
            onClick={() => setActiveTab('upload')}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Process Resumes
          </Button>
          <Button
            variant={activeTab === 'qualify' ? 'default' : 'outline'}
            onClick={() => setActiveTab('qualify')}
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            Qualify Candidates ({profiles.length})
          </Button>
          <Button
            variant={activeTab === 'results' ? 'default' : 'outline'}
            onClick={() => setActiveTab('results')}
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Qualification Results
          </Button>
        </div>

        {activeTab === 'upload' && (
          <div className="space-y-6">
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

        {activeTab === 'qualify' && (
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search candidates by name, skills, or experience..."
                  className="pl-10"
                />
              </div>
            </div>

            {/* Configuration Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Qualification Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="threshold">Pass Threshold: {passThreshold}%</Label>
                    <Input
                      id="threshold"
                      type="number"
                      min="0"
                      max="100"
                      value={passThreshold}
                      onChange={(e) => setPassThreshold(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="auto-advance">Auto-Advance Qualified Candidates</Label>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="auto-advance"
                        checked={autoAdvanceEnabled}
                        onCheckedChange={setAutoAdvanceEnabled}
                      />
                      <span className="text-sm text-muted-foreground">
                        {autoAdvanceEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="job-select">Select Job Position</Label>
                    <select
                      id="job-select"
                      value={selectedJobId || ''}
                      onChange={(e) => setSelectedJobId(e.target.value ? Number(e.target.value) : null)}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="">Select a job...</option>
                      {jobs.map((job: any) => (
                        <option key={job.id} value={job.id}>
                          {job.title} - {job.location}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {profilesLoading ? (
              <div className="text-center py-8">Loading candidates...</div>
            ) : filteredProfiles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {profiles.length === 0 ? 'No candidate profiles yet. Upload some resumes to get started.' : 'No candidates match your search.'}
              </div>
            ) : (
              <ScrollArea className="h-[50vh]">
                <div className="space-y-4">
                  {filteredProfiles.map((profile) => {
                    const latestQualification = profile.qualificationResults?.[0];
                    return (
                      <Card 
                        key={profile.id} 
                        className={`cursor-pointer transition-colors ${
                          selectedProfile?.id === profile.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedProfile(profile)}
                      >
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5" />
                                {profile.name}
                                {latestQualification && (
                                  <Badge variant={getScoreBadgeVariant(latestQualification.qualificationScore)}>
                                    {latestQualification.qualificationScore}%
                                  </Badge>
                                )}
                              </CardTitle>
                              <CardDescription>
                                {profile.email} • {profile.phone}
                              </CardDescription>
                            </div>
                            {selectedProfile?.id === profile.id && (
                              <CheckCircle className="h-5 w-5 text-blue-500" />
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {profile.summary}
                            </p>
                            
                            <div className="space-y-2">
                              <div>
                                <h4 className="text-sm font-medium">Key Skills</h4>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {profile.skills.slice(0, 6).map((skill, index) => (
                                    <Badge key={index} variant="outline" className="text-xs">
                                      {skill}
                                    </Badge>
                                  ))}
                                  {profile.skills.length > 6 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{profile.skills.length - 6} more
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              
                              {latestQualification && (
                                <div>
                                  <h4 className="text-sm font-medium">Latest Qualification</h4>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-sm font-medium ${getScoreColor(latestQualification.qualificationScore)}`}>
                                      {latestQualification.qualificationScore}% Score
                                    </span>
                                    <span className="text-xs text-muted-foreground">•</span>
                                    <span className={`text-xs ${latestQualification.decision === 'Advanced' ? 'text-green-600' : 'text-red-600'}`}>
                                      {latestQualification.decision}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            )}

            {/* Qualify Button */}
            <div className="flex justify-center pt-4">
              <Button
                onClick={handleQualifyCandidate}
                disabled={!selectedProfile || !selectedJobId || qualifyMutation.isPending}
                size="lg"
                className="min-w-[200px]"
              >
                {qualifyMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Qualifying...
                  </div>
                ) : (
                  'Qualify Selected Candidate'
                )}
              </Button>
            </div>
          </div>
        )}

        {activeTab === 'results' && (
          <div className="space-y-4">
            {qualificationResult ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {qualificationResult.decision === 'Advanced' ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    Qualification Results
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Qualification Score</h4>
                      <div className="flex items-center gap-3">
                        <Progress value={qualificationResult.qualificationScore} className="flex-1" />
                        <span className={`text-lg font-bold ${getScoreColor(qualificationResult.qualificationScore)}`}>
                          {qualificationResult.qualificationScore}%
                        </span>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-2">Decision</h4>
                      <Badge 
                        variant={qualificationResult.decision === 'Advanced' ? 'default' : 'destructive'}
                        className="text-sm"
                      >
                        {qualificationResult.decision}
                      </Badge>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2 text-green-600">Matched Skills</h4>
                      <div className="space-y-1">
                        {qualificationResult.matchedSkills.map((skill, index) => (
                          <Badge key={index} variant="outline" className="mr-1 mb-1 text-green-600 border-green-200">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-2 text-red-600">Missing Skills</h4>
                      <div className="space-y-1">
                        {qualificationResult.missingSkills.map((skill, index) => (
                          <Badge key={index} variant="outline" className="mr-1 mb-1 text-red-600 border-red-200">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <h4 className="text-sm font-medium mb-1">Pass Threshold</h4>
                      <p className="text-sm text-muted-foreground">{qualificationResult.passThreshold}%</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-1">Auto-Advance</h4>
                      <p className="text-sm text-muted-foreground">
                        {qualificationResult.autoAdvanceEnabled ? 'Enabled' : 'Disabled'}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-1">Candidate Stage</h4>
                      <p className="text-sm text-muted-foreground">{qualificationResult.candidateStage}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No qualification results yet. Qualify a candidate to see results here.
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}