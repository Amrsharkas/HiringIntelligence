import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Upload, File, X, Loader2, FileText, Search, Briefcase, Users, History, Clock } from 'lucide-react';
import { useLocation } from 'wouter';
import { CreditPurchaseModal } from './CreditPurchaseModal';


interface CustomRule {
  id: string;
  organizationId: string;
  jobId: number | null;
  rulesText: string;
  createdAt: string;
}

interface ResumeSearcherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ResumeSearcherModal({ isOpen, onClose }: ResumeSearcherModalProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [processingJobId, setProcessingJobId] = useState<string>('all');
  const [customRules, setCustomRules] = useState<string>('');
  const [showCreditModal, setShowCreditModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch company job postings
  const { data: jobs = [] } = useQuery<any[]>({
    queryKey: ['/api/job-postings'],
  });

  // Fetch resume processing cost
  const { data: resumeProcessingCost = { cost: 1 } } = useQuery<{ actionType: string; cost: number }>({
    queryKey: ['/api/credits/pricing/resume_processing'],
  });

  // Fetch recent custom rules based on selected job
  const { data: recentRules = [] } = useQuery<CustomRule[]>({
    queryKey: ['/api/custom-rules', processingJobId !== 'all' ? processingJobId : undefined],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (processingJobId !== 'all') {
        params.append('jobId', processingJobId);
      }
      params.append('limit', '5');
      const response = await apiRequest('GET', `/api/custom-rules?${params.toString()}`);
      return response.json();
    },
    enabled: isOpen,
  });

  // Calculate the number of jobs to process against
  const activeJobCount = jobs.filter((job: any) => job.is_active !== false).length;
  const targetJobCount = processingJobId === 'all' ? activeJobCount : 1;

  // Calculate total credit cost: files * jobs * cost per processing
  const totalCreditCost = selectedFiles.length * targetJobCount * resumeProcessingCost.cost;

  
  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const maxFileSize = 5 * 1024 * 1024; // 5MB limit
    
    const validFiles = files.filter(file => {
      // Check file size
      const isValidSize = file.size <= maxFileSize;

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

  const handleTabChange = (value: string) => {
    if (value === 'profiles') {
      onClose();
      setLocation('/resume-profiles');
    }
  };

  // Extract text from file
  const extractTextFromFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      if (file.type === 'text/plain' || file.type.startsWith('text/')) {
        // For text files, read as text
        reader.onload = (e) => {
          const text = e.target?.result as string;
          resolve(text);
        };
        reader.onerror = () => reject(new Error('Failed to read text file'));
        reader.readAsText(file);
      } else {
        // For all other files (PDF, images, documents, etc.), send base64 data to server for processing
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
        reader.onerror = () => reject(new Error(`Failed to read ${file.name} file`));
        reader.readAsArrayBuffer(file);
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

        console.log(`📋 Created background jobs for ${file.name}: ${result.jobIds?.length || 1} queue jobs`);

        return {
          jobIds: result.jobIds,
          fileCount: result.fileCount || 1,
          jobCount: result.jobCount || 1,
          message: result.message,
          status: result.status,
          creditBalance: result.creditBalance
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

        console.log(`📋 Created background bulk jobs: ${result.totalQueueJobs || result.fileCount} queue jobs (${result.fileCount} files x ${result.jobCount || 1} jobs)`);

        return {
          jobIds: result.jobIds,
          fileCount: result.fileCount,
          jobCount: result.jobCount || 1,
          totalQueueJobs: result.totalQueueJobs,
          message: result.message,
          status: result.status,
          creditBalance: result.creditBalance
        };
      }
    },
    onSuccess: (result) => {
      const jobCount = result.jobCount || 1;
      toast({
        title: "Resume Processing Started",
        description: result.message || `${result.fileCount} file${result.fileCount > 1 ? 's' : ''} are being processed against ${jobCount} job${jobCount > 1 ? 's' : ''} in the background. Check the "View Profiles" tab to see progress.`,
      });

      // Update credit balance immediately if returned in response
      if (result.creditBalance) {
        queryClient.setQueryData(['/api/organizations/current/credits'], result.creditBalance);
      } else {
        // Fallback: Refresh credit balance if not in response
        queryClient.invalidateQueries({ queryKey: ['/api/organizations/current/credits'] });
      }

      clearAllFiles();

      // Refresh profiles list after a delay to allow for processing
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/resume-profiles'] });
      }, 2000);
    },
    onError: (error: Error) => {
      // Check if it's a credit-related error
      if (error.message.includes('Insufficient credits') || error.message.includes('credit')) {
        // Show modal for adding credits instead of toast
        setShowCreditModal(true);
      } else {
        toast({
          title: "Processing Failed to Start",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  
  
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Scan Resume
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="upload" className="w-full" onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload Resumes
            </TabsTrigger>
            <TabsTrigger value="profiles" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              View Profiles
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6 mt-6">
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
            <CardContent className="space-y-4">
              {/* Recent Rules Dropdown */}
              {recentRules.length > 0 && (
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <History className="h-4 w-4" />
                    Recent rules {processingJobId !== 'all' ? 'for this job' : ''}
                  </label>
                  <Select
                    onValueChange={(value) => {
                      const rule = recentRules.find(r => r.id === value);
                      if (rule) {
                        setCustomRules(rule.rulesText);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select from recent rules..." />
                    </SelectTrigger>
                    <SelectContent>
                      {recentRules.map((rule) => (
                        <SelectItem key={rule.id} value={rule.id}>
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <span className="truncate max-w-[300px]">
                              {rule.rulesText.slice(0, 60)}{rule.rulesText.length > 60 ? '...' : ''}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
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
                Upload single or multiple resume files (any format) for AI analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* File Input */}
              <div className="space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="*"
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

                {/* Credit Cost Indicator */}
                {selectedFiles.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">
                          Credit Cost
                        </span>
                      </div>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        {totalCreditCost} credit{totalCreditCost !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <p className="text-xs text-blue-700 mt-1">
                      {selectedFiles.length} resume{selectedFiles.length !== 1 ? 's' : ''} x {targetJobCount} job{targetJobCount !== 1 ? 's' : ''} x {resumeProcessingCost.cost} credit{resumeProcessingCost.cost !== 1 ? 's' : ''} each
                    </p>
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
                <p>Supported formats: All file types (max 5MB per file)</p>
                <p>Note: Text extraction works best with text-based and image-based files. The AI will attempt to extract text from any file format.</p>
              </div>
            </CardContent>
          </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>

      {/* Credit Purchase Modal */}
      <CreditPurchaseModal
        isOpen={showCreditModal}
        onClose={() => setShowCreditModal(false)}
        onSuccess={() => {
          setShowCreditModal(false);
          // Refresh credit balance after successful purchase
          queryClient.invalidateQueries({ queryKey: ['/api/organizations/current/credits'] });
        }}
      />
    </Dialog>
  );
}