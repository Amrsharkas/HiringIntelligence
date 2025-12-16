import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Upload, File, X, Loader2, FileText, Briefcase, History, Clock, ArrowLeft } from 'lucide-react';
import { CreditPurchaseModal } from '@/components/CreditPurchaseModal';

interface CustomRule {
  id: string;
  organizationId: string;
  jobId: number | null;
  rulesText: string;
  createdAt: string;
}

export default function ResumeUploadPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [processingJobId, setProcessingJobId] = useState<string>('all');
  const [customRules, setCustomRules] = useState<string>('');
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
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
  });

  // Calculate the number of jobs to process against
  const activeJobCount = jobs.filter((job: any) => job.is_active !== false).length;
  const targetJobCount = processingJobId === 'all' ? activeJobCount : 1;

  // Calculate total credit cost: files * jobs * cost per processing
  const totalCreditCost = selectedFiles.length * targetJobCount * resumeProcessingCost.cost;

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    addFiles(files);
  };

  const addFiles = (files: File[]) => {
    const maxFileSize = 5 * 1024 * 1024; // 5MB limit

    const validFiles = files.filter(file => {
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
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

      if (file.type === 'text/plain' || file.type.startsWith('text/')) {
        reader.onload = (e) => {
          const text = e.target?.result as string;
          resolve(text);
        };
        reader.onerror = () => reject(new Error('Failed to read text file'));
        reader.readAsText(file);
      } else {
        reader.onload = (e) => {
          const arrayBuffer = e.target?.result as ArrayBuffer;
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
        const file = files[0];
        const fileData = await extractTextFromFile(file);

        const requestBody: any = {
          resumeText: fileData,
          fileName: file.name,
          fileType: file.type
        };

        if (processingJobId !== 'all') {
          requestBody.jobId = processingJobId;
        }

        if (customRules.trim()) {
          requestBody.customRules = customRules.trim();
        }

        const response = await apiRequest('POST', '/api/resume-profiles/process', requestBody);
        const result = await response.json();

        return {
          jobIds: result.jobIds,
          fileCount: result.fileCount || 1,
          jobCount: result.jobCount || 1,
          message: result.message,
          status: result.status,
          creditBalance: result.creditBalance
        };
      } else {
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

        if (processingJobId !== 'all') {
          requestBody.jobId = processingJobId;
        }

        if (customRules.trim()) {
          requestBody.customRules = customRules.trim();
        }

        const response = await apiRequest('POST', '/api/resume-profiles/process-bulk', requestBody);
        const result = await response.json();

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
        description: result.message || `${result.fileCount} file${result.fileCount > 1 ? 's' : ''} are being processed against ${jobCount} job${jobCount > 1 ? 's' : ''} in the background.`,
      });

      if (result.creditBalance) {
        queryClient.setQueryData(['/api/organizations/current/credits'], result.creditBalance);
      } else {
        queryClient.invalidateQueries({ queryKey: ['/api/organizations/current/credits'] });
      }

      clearAllFiles();

      // Navigate back to resumes page after successful upload
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/resume-profiles'] });
        navigate('/hiring/resumes');
      }, 1500);
    },
    onError: (error: Error) => {
      if (error.message.includes('Insufficient credits') || error.message.includes('credit')) {
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/hiring/resumes')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
            Upload Resumes
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Upload and process resume files for AI analysis
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column - Job Selection & Custom Rules */}
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
                  <SelectItem value="all">Score against all jobs ({activeJobCount} active)</SelectItem>
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
                className="min-h-[200px] resize-y"
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column - File Upload */}
        <div className="space-y-6">
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
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="*"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Drag and Drop Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                  ${isDragOver
                    ? 'border-primary bg-primary/5'
                    : 'border-slate-300 dark:border-slate-600 hover:border-primary hover:bg-slate-50 dark:hover:bg-slate-800'}
                `}
              >
                <Upload className={`h-10 w-10 mx-auto mb-4 ${isDragOver ? 'text-primary' : 'text-slate-400'}`} />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {isDragOver ? 'Drop files here' : 'Click to select or drag files here'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  PDF, DOC, DOCX, TXT, images, and more (max 5MB per file)
                </p>
              </div>

              {/* Selected Files Display */}
              {selectedFiles.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Selected Files ({selectedFiles.length})</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearAllFiles}
                      className="text-slate-500 hover:text-slate-700"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Clear All
                    </Button>
                  </div>
                  <div className="grid gap-2 max-h-[300px] overflow-y-auto">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 bg-white dark:bg-slate-700 rounded-lg">
                            <File className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <p className="text-xs text-slate-500">
                              {(file.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFile(index)}
                          className="h-8 w-8 text-slate-400 hover:text-red-500"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Credit Cost Indicator */}
              {selectedFiles.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Credit Cost
                      </span>
                    </div>
                    <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100">
                      {totalCreditCost} credit{totalCreditCost !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                    {selectedFiles.length} resume{selectedFiles.length !== 1 ? 's' : ''} x {targetJobCount} job{targetJobCount !== 1 ? 's' : ''} x {resumeProcessingCost.cost} credit{resumeProcessingCost.cost !== 1 ? 's' : ''} each
                  </p>
                </div>
              )}

              {/* Process Button */}
              <Button
                onClick={() => processFilesMutation.mutate(selectedFiles)}
                disabled={selectedFiles.length === 0 || processFilesMutation.isPending}
                className="w-full"
                size="lg"
              >
                {processFilesMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''}...
                  </div>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Process {selectedFiles.length || ''} Resume{selectedFiles.length !== 1 ? 's' : ''}
                  </>
                )}
              </Button>

              {/* File Format Help */}
              <div className="text-xs text-slate-500 dark:text-slate-400">
                <p>Supported formats: All file types (max 5MB per file)</p>
                <p className="mt-1">Note: Text extraction works best with text-based and image-based files. The AI will attempt to extract text from any file format.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Credit Purchase Modal */}
      <CreditPurchaseModal
        isOpen={showCreditModal}
        onClose={() => setShowCreditModal(false)}
        onSuccess={() => {
          setShowCreditModal(false);
          queryClient.invalidateQueries({ queryKey: ['/api/organizations/current/credits'] });
        }}
      />
    </div>
  );
}
