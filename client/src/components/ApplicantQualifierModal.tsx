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
  fileName: string;
  jobId: number;
  qualificationScore: number;
  technicalSkillsScore: number;
  experienceScore: number;
  culturalFitScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  summary: string;
  reasoning: string;
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
        
        if (!qualifyResponse.ok) {
          throw new Error(`Server error: ${qualifyResponse.status} ${qualifyResponse.statusText}`);
        }
        
        const qualifyResult = await qualifyResponse.json();
        
        // Check for errors in the response
        if (qualifyResult.error || qualifyResult.message) {
          throw new Error(qualifyResult.message || qualifyResult.error || 'Unknown processing error');
        }
        
        console.log('✅ Raw AI Response:', qualifyResult);
        
        // Map server response to expected frontend format
        const mappedResult = {
          ...qualifyResult,
          qualificationScore: qualifyResult.score || 0, // Map 'score' to 'qualificationScore'
          candidateId: qualifyResult.candidateName || 'unknown',
          id: i + 1, // Generate simple ID
          jobId: selectedJobId,
          matchedSkills: [], // Will be populated if available
          missingSkills: [], // Will be populated if available
          decision: '', // Not used in current implementation
          passThreshold: 70, // Default threshold
          autoAdvanceEnabled: false,
          candidateStage: 'screening',
          createdAt: new Date().toISOString()
        };
        
        console.log('✅ Mapped Result:', mappedResult);
        results.push(mappedResult);
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
      <DialogContent className="max-w-6xl h-[90vh] p-0 flex flex-col">
        <div className="p-6 border-b flex-shrink-0">
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
        </div>

        <div className="flex-1 overflow-y-auto p-6">
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
                          <ScrollArea className="h-[300px]">
                            <div className="space-y-4 pr-4">
                              <div>
                                <h4 className="font-medium text-gray-900 mb-2">Job Description</h4>
                                <p className="text-sm text-gray-600 leading-relaxed">{selectedJob.description}</p>
                              </div>
                              
                              <Separator />
                              
                              <div>
                                <h4 className="font-medium text-gray-900 mb-2">Requirements</h4>
                                <p className="text-sm text-gray-600 leading-relaxed">{selectedJob.requirements}</p>
                              </div>
                            </div>
                          </ScrollArea>
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
                            {qualificationResults.length > 0 ? Math.round(qualificationResults.reduce((acc, r) => acc + (r.qualificationScore || 0), 0) / qualificationResults.length) : 0}%
                          </div>
                          <div className="text-sm text-gray-600">Average Score</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {qualificationResults.length > 0 ? Math.max(...qualificationResults.map(r => r.qualificationScore || 0)) : 0}%
                          </div>
                          <div className="text-sm text-gray-600">Highest Score</div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Individual CV Analysis */}
                    <div className="space-y-4">
                      {qualificationResults
                        .sort((a, b) => b.qualificationScore - a.qualificationScore)
                        .map((result, index) => (
                        <Card key={index} className="border-l-4 border-l-blue-500 shadow-lg">
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold text-xl flex items-center justify-center shadow-lg">
                                  {result.qualificationScore}%
                                </div>
                                <div>
                                  <CardTitle className="text-xl flex items-center gap-2">
                                    <FileText className="w-5 h-5" />
                                    Candidate Profile Analysis
                                  </CardTitle>
                                  <CardDescription className="text-base">
                                    <span className="font-medium">{result.fileName}</span>
                                  </CardDescription>
                                </div>
                              </div>
                              <Badge 
                                variant={result.qualificationScore >= 70 ? "default" : result.qualificationScore >= 50 ? "secondary" : "destructive"}
                                className="text-lg px-4 py-2"
                              >
                                Overall Match
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-6">
                            
                            {/* Enhanced Score Breakdown */}
                            <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-6">
                              <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5" />
                                Skill Assessment Breakdown
                              </h4>
                              <div className="grid grid-cols-3 gap-6">
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-blue-600 mb-2">{result.technicalSkillsScore}%</div>
                                  <div className="text-sm text-gray-600 font-medium mb-2">Technical Skills</div>
                                  <Progress value={result.technicalSkillsScore} className="h-3" />
                                </div>
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-green-600 mb-2">{result.experienceScore}%</div>
                                  <div className="text-sm text-gray-600 font-medium mb-2">Experience Level</div>
                                  <Progress value={result.experienceScore} className="h-3" />
                                </div>
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-orange-600 mb-2">{result.culturalFitScore}%</div>
                                  <div className="text-sm text-gray-600 font-medium mb-2">Cultural Fit</div>
                                  <Progress value={result.culturalFitScore} className="h-3" />
                                </div>
                              </div>
                            </div>

                            {/* Comprehensive AI Analysis */}
                            <div className="space-y-4">
                              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                                <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                                  <Star className="w-5 h-5" />
                                  Executive Summary
                                </h4>
                                <p className="text-sm leading-relaxed text-blue-800">{result.summary}</p>
                              </div>
                              
                              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                                <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                                  <Target className="w-5 h-5" />
                                  Detailed Analysis & Recommendations
                                </h4>
                                <p className="text-sm leading-relaxed text-green-800">{result.reasoning}</p>
                              </div>

                              {/* Skills Assessment */}
                              {(result.matchedSkills?.length > 0 || result.missingSkills?.length > 0) && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {result.matchedSkills?.length > 0 && (
                                    <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                                      <h4 className="font-semibold text-emerald-800 mb-3 flex items-center gap-2">
                                        <CheckCircle className="w-5 h-5" />
                                        Matched Skills & Qualifications
                                      </h4>
                                      <div className="flex flex-wrap gap-2">
                                        {result.matchedSkills.map((skill, idx) => (
                                          <Badge key={idx} variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300">
                                            {skill}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {result.missingSkills?.length > 0 && (
                                    <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                                      <h4 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                                        <XCircle className="w-5 h-5" />
                                        Development Areas
                                      </h4>
                                      <div className="flex flex-wrap gap-2">
                                        {result.missingSkills.map((skill, idx) => (
                                          <Badge key={idx} variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                                            {skill}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
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
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center p-6 border-t bg-white flex-shrink-0">
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
              <Button 
                onClick={handleAnalyzeClick}
                disabled={!selectedJobId}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Analyze & Score CVs <Target className="w-4 h-4 ml-1" />
              </Button>
            )}
            

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}