import { useState, useRef, useEffect } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  FileText, 
  Upload, 
  Users, 
  Briefcase, 
  CheckCircle,
  XCircle,
  Loader2,
  Target,
  TrendingUp,
  Star,
  ArrowRight,
  Settings
} from 'lucide-react';

interface Job {
  id: number;
  title: string;
  description: string;
  requirements: string;
  location: string;
  salaryRange: string;
}

interface QualificationResult {
  id: number;
  candidateId: string;
  candidateName: string;
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

interface ApplicantQualifierModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type FlowStep = 'upload' | 'job-selection' | 'processing' | 'results';

export function ApplicantQualifierModal({ isOpen, onClose }: ApplicantQualifierModalProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<FlowStep>('upload');
  
  // Debug logging for step changes
  const setCurrentStepWithLogging = (newStep: FlowStep) => {
    console.log(`🔄 Step change: ${currentStep} → ${newStep}`);
    setCurrentStep(newStep);
  };
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  // Removed threshold - now just shows scoring analysis
  const [qualificationResults, setQualificationResults] = useState<QualificationResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch available jobs
  const { data: jobs = [], error: jobsError, isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ['/api/job-postings'],
    enabled: isOpen,
    retry: 3,
    retryDelay: 1000
  });

  // Combined process and qualify mutation
  const processAndQualifyMutation = useMutation({
    mutationFn: async () => {
      if (!selectedJobId || selectedFiles.length === 0) {
        throw new Error('Please select a job and upload resumes');
      }

      setIsProcessing(true);
      setProcessingProgress(0);
      const results: QualificationResult[] = [];

      // Get the selected job details
      const selectedJobDetails = jobs.find(job => job.id === selectedJobId);
      if (!selectedJobDetails) {
        throw new Error('Selected job not found');
      }

      // Step 1: Process all resumes and get AI scores (80% of progress)
      const stepProgress = 80 / selectedFiles.length;
      
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setProcessingProgress(10 + (i * stepProgress));
        
        // Convert file to base64 for processing
        const fileBuffer = await file.arrayBuffer();
        const base64Data = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));
        
        // Process resume and get AI scoring
        const qualifyResponse = await apiRequest('POST', '/api/applicants/process-and-qualify', {
          fileName: file.name,
          fileType: file.type,
          fileData: base64Data,
          jobId: selectedJobId,
          jobTitle: selectedJobDetails.title,
          jobDescription: selectedJobDetails.description,
          jobRequirements: selectedJobDetails.requirements,
          jobSalary: selectedJobDetails.salaryRange,
          jobLocation: selectedJobDetails.location,
          jobType: selectedJobDetails.employmentType,
          jobSkills: [...(selectedJobDetails.technicalSkills || []), ...(selectedJobDetails.softSkills || [])]
        });
        
        const qualifyResult = await qualifyResponse.json();
        results.push(qualifyResult);
      }

      // Step 2: Complete processing (90-100% progress)
      setProcessingProgress(100);
      return results;
    },
    onSuccess: (results) => {
      setQualificationResults(results);
      setCurrentStepWithLogging('results');
      setIsProcessing(false);
      
      toast({
        title: "CV Analysis Complete!",
        description: `Processed ${results.length} CV(s) with detailed AI scoring analysis.`,
      });
      
      // Invalidate cache to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/resume-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['/api/applicants'] });
    },
    onError: (error: Error) => {
      setIsProcessing(false);
      setProcessingProgress(0);
      toast({
        title: "Processing Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => 
      file.type === 'application/pdf' || 
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.type === 'text/plain'
    );
    
    if (validFiles.length !== files.length) {
      toast({
        title: "Invalid Files",
        description: "Only PDF, DOCX, and TXT files are supported.",
        variant: "destructive",
      });
    }
    
    setSelectedFiles(validFiles);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(files => files.filter((_, i) => i !== index));
  };

  const handleNext = () => {
    console.log('🔄 handleNext called, currentStep:', currentStep, 'selectedFiles:', selectedFiles.length);
    if (currentStep === 'upload' && selectedFiles.length > 0) {
      console.log('✅ Advancing to job-selection step');
      setCurrentStepWithLogging('job-selection');
    }
  };

  const handleAnalyzeClick = () => {
    console.log('🎯 handleAnalyzeClick called, currentStep:', currentStep, 'selectedJobId:', selectedJobId);
    if (currentStep === 'job-selection' && selectedJobId) {
      console.log('🚀 Starting processing...');
      setCurrentStepWithLogging('processing');
      processAndQualifyMutation.mutate();
    }
  };

  const resetFlow = () => {
    setCurrentStepWithLogging('upload');
    setSelectedFiles([]);
    setSelectedJobId(null);
    setQualificationResults([]);
    setIsProcessing(false);
    setProcessingProgress(0);
  };

  const selectedJob = jobs.find(job => job.id === selectedJobId);
  
  // Preserve state across modal reopens - prevent unwanted resets
  useEffect(() => {
    if (isOpen && currentStep === 'upload' && selectedFiles.length === 0 && !selectedJobId) {
      // Only reset if modal is truly starting fresh
      console.log('🔄 MODAL OPENED: Fresh start detected');
    } else if (isOpen) {
      console.log('🔄 MODAL REOPENED: Preserving existing state', {
        currentStep,
        filesCount: selectedFiles.length,
        selectedJobId
      });
    }
  }, [isOpen, currentStep, selectedFiles.length, selectedJobId]);

  // Debug logging
  console.log('🔍 RENDER DEBUG:', {
    currentStep,
    selectedJobId,
    selectedJobType: typeof selectedJobId,
    jobsLength: jobs.length,
    jobIds: jobs.map(j => ({ id: j.id, type: typeof j.id })),
    selectedJob: selectedJob ? 'FOUND' : 'NOT FOUND'
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            Process & Qualify Applicants
          </DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-center space-x-4 py-4">
          {(['upload', 'job-selection', 'processing', 'results'] as FlowStep[]).map((step, index) => (
            <div key={step} className="flex items-center">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                ${currentStep === step ? 'bg-blue-600 text-white' : 
                  index < (['upload', 'job-selection', 'processing', 'results'] as FlowStep[]).indexOf(currentStep) 
                  ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'}
              `}>
                {index < (['upload', 'job-selection', 'processing', 'results'] as FlowStep[]).indexOf(currentStep) ? '✓' : index + 1}
              </div>
              {index < 3 && (
                <ArrowRight className={`w-4 h-4 mx-2 ${
                  index < (['upload', 'job-selection', 'processing', 'results'] as FlowStep[]).indexOf(currentStep) 
                  ? 'text-green-600' : 'text-gray-400'
                }`} />
              )}
            </div>
          ))}
        </div>

        <ScrollArea className="flex-1 min-h-0">
          {/* Step 1: Upload Resumes */}
          {currentStep === 'upload' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Upload Resume Files
                  </CardTitle>
                  <CardDescription>
                    Upload multiple resume files (PDF, DOCX, TXT) to process and qualify against a job posting.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".pdf,.docx,.txt"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    
                    <Button 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-24 border-2 border-dashed border-gray-300 hover:border-blue-500"
                      variant="outline"
                    >
                      <div className="text-center">
                        <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <div className="text-sm font-medium">Click to upload resume files</div>
                        <div className="text-xs text-gray-500">PDF, DOCX, TXT files supported</div>
                      </div>
                    </Button>

                    {selectedFiles.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium">Selected Files ({selectedFiles.length})</h4>
                        {selectedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              <span className="text-sm">{file.name}</span>
                              <span className="text-xs text-gray-500">
                                ({(file.size / 1024 / 1024).toFixed(2)} MB)
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(index)}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 2: Job Selection */}
          {currentStep === 'job-selection' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5" />
                    Select Job Posting
                  </CardTitle>
                  <CardDescription>
                    Choose the job posting to evaluate candidates against.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {jobsLoading && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading jobs...
                      </div>
                    )}
                    
                    {jobsError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                        Error loading jobs: {jobsError.message}
                        <button 
                          className="ml-2 underline"
                          onClick={() => window.location.reload()}
                        >
                          Refresh page
                        </button>
                      </div>
                    )}
                    
                    {!jobsLoading && !jobsError && jobs.length === 0 && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-700 text-sm">
                        No job postings found. Please create a job posting first.
                      </div>
                    )}
                    
                    {!jobsLoading && !jobsError && jobs.length > 0 && (
                      <Select value={selectedJobId?.toString()} onValueChange={(value) => {
                        console.log('📋 Job selected:', value, 'currentStep:', currentStep);
                        setSelectedJobId(Number(value));
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a job posting..." />
                        </SelectTrigger>
                        <SelectContent>
                          {jobs.map((job) => (
                            <SelectItem key={job.id} value={job.id.toString()}>
                              {job.title} - {job.location}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {selectedJob && (
                      <Card className="bg-blue-50">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg">{selectedJob.title}</CardTitle>
                          <div className="flex gap-2">
                            <Badge variant="secondary">{selectedJob.location}</Badge>
                            <Badge variant="outline">{selectedJob.salaryRange}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <h4 className="font-medium">Description</h4>
                            <p className="text-sm text-gray-600 line-clamp-3">{selectedJob.description}</p>
                            
                            <h4 className="font-medium">Requirements</h4>
                            <p className="text-sm text-gray-600 line-clamp-3">{selectedJob.requirements}</p>
                          </div>
                        </CardContent>
                      </Card>
                    )}


                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 3: Processing */}
          {currentStep === 'processing' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing & Qualifying Candidates
                  </CardTitle>
                  <CardDescription>
                    Analyzing {selectedFiles.length} resumes against "{selectedJob?.title}"...
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Progress value={processingProgress} className="w-full" />
                    <div className="text-center text-sm text-gray-600">
                      {processingProgress < 20 && "Preparing files..."}
                      {processingProgress >= 20 && processingProgress < 70 && "Processing resumes..."}
                      {processingProgress >= 70 && processingProgress < 100 && "Running qualification analysis..."}
                      {processingProgress === 100 && "Complete!"}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 4: Results */}
          {currentStep === 'results' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    CV Scoring Analysis
                  </CardTitle>
                  <CardDescription>
                    {qualificationResults.length} CV(s) analyzed against "{selectedJob?.title}"
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Scoring Summary */}
                    <div className="grid grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {qualificationResults.length}
                          </div>
                          <div className="text-sm text-gray-600">CVs Analyzed</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-purple-600">
                            {Math.round(qualificationResults.reduce((acc, r) => acc + r.score, 0) / qualificationResults.length)}%
                          </div>
                          <div className="text-sm text-gray-600">Average Score</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {Math.max(...qualificationResults.map(r => r.score))}%
                          </div>
                          <div className="text-sm text-gray-600">Highest Score</div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Individual CV Analysis */}
                    <div className="space-y-4">
                      {qualificationResults
                        .sort((a, b) => b.score - a.score)
                        .map((result, index) => (
                        <Card key={index} className="border-blue-200 bg-blue-50">
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-blue-600 text-white font-bold text-lg flex items-center justify-center">
                                  {result.score}%
                                </div>
                                <div>
                                  <h4 className="font-semibold text-lg">{result.candidateName}</h4>
                                  <p className="text-sm text-gray-600">{result.fileName}</p>
                                </div>
                              </div>
                            </div>

                            {/* Detailed Scoring Breakdown */}
                            <div className="grid grid-cols-3 gap-4 mb-4">
                              <div className="text-center">
                                <div className="text-lg font-bold text-purple-600">{result.technicalSkillsScore}%</div>
                                <div className="text-xs text-gray-600">Technical Skills</div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-bold text-green-600">{result.experienceScore}%</div>
                                <div className="text-xs text-gray-600">Experience</div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-bold text-orange-600">{result.culturalFitScore}%</div>
                                <div className="text-xs text-gray-600">Cultural Fit</div>
                              </div>
                            </div>

                            {/* AI Analysis Summary */}
                            <div className="space-y-3">
                              <div>
                                <span className="text-sm font-medium text-gray-700">Summary:</span>
                                <p className="text-sm mt-1 text-gray-600">{result.summary}</p>
                              </div>
                              
                              <div>
                                <span className="text-sm font-medium text-gray-700">Detailed Analysis:</span>
                                <p className="text-sm mt-1 text-gray-600">{result.reasoning}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </ScrollArea>

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-4 border-t bg-yellow-100 p-4 -m-4 mt-4">
          <div className="flex gap-2">
            {currentStep !== 'upload' && currentStep !== 'processing' && (
              <Button variant="outline" onClick={resetFlow}>
                Start New Process
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              {currentStep === 'results' ? 'Close' : 'Cancel'}
            </Button>
            
            {currentStep === 'upload' && (
              <Button 
                onClick={handleNext}
                disabled={selectedFiles.length === 0}
              >
                Next: Select Job <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            )}
            
            {currentStep === 'job-selection' && (
              <div className="space-x-2">
                <Button 
                  onClick={handleAnalyzeClick}
                  disabled={!selectedJobId}
                  className="bg-red-500 border-4 border-yellow-500"
                  style={{ minWidth: '200px', minHeight: '50px' }}
                >
                  ANALYZE & SCORE CVS <Target className="w-4 h-4 ml-1" />
                </Button>
                <Button variant="outline" onClick={() => {
                  console.log('🔧 DEBUG CLICK: Current state', { 
                    currentStep, 
                    selectedJobId, 
                    selectedJob: selectedJob ? 'FOUND' : 'NOT FOUND',
                    jobsLength: jobs.length
                  });
                }}>
                  Debug State
                </Button>
              </div>
            )}
            
            {/* Debug info - remove after fixing */}
            {console.log('🎯 BUTTON DEBUG - currentStep:', currentStep, 'selectedJobId:', selectedJobId, 'should show button:', currentStep === 'job-selection')}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}