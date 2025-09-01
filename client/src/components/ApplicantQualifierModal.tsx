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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [passThreshold, setPassThreshold] = useState(70);
  const [autoAdvanceEnabled, setAutoAdvanceEnabled] = useState(true);
  const [qualificationResults, setQualificationResults] = useState<QualificationResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch available jobs
  const { data: jobs = [] } = useQuery<Job[]>({
    queryKey: ['/api/jobs'],
    enabled: isOpen
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

      // Step 1: Process all resumes (20% progress)
      setProcessingProgress(20);
      const processedResumes = [];
      
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const formData = new FormData();
        formData.append('resume', file);
        
        const processResponse = await apiRequest('POST', '/api/resume-profiles/process', formData);
        const processedResume = await processResponse.json();
        processedResumes.push(processedResume);
        
        setProcessingProgress(20 + (i + 1) * (50 / selectedFiles.length));
      }

      // Step 2: Qualify each processed resume (50-90% progress)
      for (let i = 0; i < processedResumes.length; i++) {
        const resume = processedResumes[i];
        
        const qualifyResponse = await apiRequest('POST', '/api/qualification/qualify', {
          candidateId: resume.id,
          jobId: selectedJobId,
          passThreshold,
          autoAdvanceEnabled
        });
        
        const qualificationResult = await qualifyResponse.json();
        results.push({
          ...qualificationResult,
          candidateName: resume.name
        });
        
        setProcessingProgress(70 + (i + 1) * (20 / processedResumes.length));
      }

      setProcessingProgress(100);
      return results;
    },
    onSuccess: (results) => {
      setQualificationResults(results);
      setCurrentStep('results');
      setIsProcessing(false);
      
      const qualifiedCount = results.filter(r => r.decision === 'Qualified').length;
      toast({
        title: "Qualification Complete!",
        description: `Processed ${results.length} candidates. ${qualifiedCount} qualified for the next stage.`,
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
    if (currentStep === 'upload' && selectedFiles.length > 0) {
      setCurrentStep('job-selection');
    } else if (currentStep === 'job-selection' && selectedJobId) {
      setCurrentStep('processing');
      processAndQualifyMutation.mutate();
    }
  };

  const resetFlow = () => {
    setCurrentStep('upload');
    setSelectedFiles([]);
    setSelectedJobId(null);
    setQualificationResults([]);
    setIsProcessing(false);
    setProcessingProgress(0);
  };

  const selectedJob = jobs.find(job => job.id === selectedJobId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
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

        <ScrollArea className="flex-1 max-h-[600px]">
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
                    <Select value={selectedJobId?.toString()} onValueChange={(value) => setSelectedJobId(Number(value))}>
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

                    {/* Qualification Settings */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Settings className="w-5 h-5" />
                          Qualification Settings
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label>Pass Threshold: {passThreshold}%</Label>
                          <Input
                            type="range"
                            min="50"
                            max="90"
                            value={passThreshold}
                            onChange={(e) => setPassThreshold(Number(e.target.value))}
                            className="w-full"
                          />
                          <p className="text-xs text-gray-500">
                            Candidates scoring above this threshold will be marked as "Qualified"
                          </p>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch
                            id="auto-advance"
                            checked={autoAdvanceEnabled}
                            onCheckedChange={setAutoAdvanceEnabled}
                          />
                          <Label htmlFor="auto-advance">
                            Auto-advance qualified candidates to interview stage
                          </Label>
                        </div>
                      </CardContent>
                    </Card>
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
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    Qualification Results
                  </CardTitle>
                  <CardDescription>
                    {qualificationResults.length} candidates evaluated against "{selectedJob?.title}"
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {qualificationResults.filter(r => r.decision === 'Qualified').length}
                          </div>
                          <div className="text-sm text-gray-600">Qualified</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-red-600">
                            {qualificationResults.filter(r => r.decision === 'Not Qualified').length}
                          </div>
                          <div className="text-sm text-gray-600">Not Qualified</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {Math.round(qualificationResults.reduce((acc, r) => acc + r.qualificationScore, 0) / qualificationResults.length)}%
                          </div>
                          <div className="text-sm text-gray-600">Avg Score</div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Individual Results */}
                    <div className="space-y-3">
                      {qualificationResults
                        .sort((a, b) => b.qualificationScore - a.qualificationScore)
                        .map((result) => (
                        <Card key={result.id} className={`${
                          result.decision === 'Qualified' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                        }`}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                  result.decision === 'Qualified' ? 'bg-green-600' : 'bg-red-600'
                                } text-white font-bold`}>
                                  {result.qualificationScore}
                                </div>
                                <div>
                                  <h4 className="font-medium">{result.candidateName}</h4>
                                  <div className="flex items-center gap-2">
                                    {result.decision === 'Qualified' ? (
                                      <CheckCircle className="w-4 h-4 text-green-600" />
                                    ) : (
                                      <XCircle className="w-4 h-4 text-red-600" />
                                    )}
                                    <span className={`text-sm font-medium ${
                                      result.decision === 'Qualified' ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                      {result.decision}
                                    </span>
                                    {result.autoAdvanceEnabled && result.decision === 'Qualified' && (
                                      <Badge variant="secondary" className="text-xs">
                                        Advanced to Interviews
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="text-right">
                                <div className="text-sm text-gray-600">Score</div>
                                <div className="text-2xl font-bold">{result.qualificationScore}%</div>
                              </div>
                            </div>

                            {/* Skills Analysis */}
                            <div className="mt-4 space-y-2">
                              {result.matchedSkills.length > 0 && (
                                <div>
                                  <span className="text-sm font-medium text-green-600">Matched Skills: </span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {result.matchedSkills.map((skill, index) => (
                                      <Badge key={index} variant="secondary" className="text-xs bg-green-100 text-green-800">
                                        {skill}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {result.missingSkills.length > 0 && (
                                <div>
                                  <span className="text-sm font-medium text-red-600">Missing Skills: </span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {result.missingSkills.map((skill, index) => (
                                      <Badge key={index} variant="outline" className="text-xs border-red-200 text-red-600">
                                        {skill}
                                      </Badge>
                                    ))}
                                  </div>
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
        </ScrollArea>

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
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
                onClick={handleNext}
                disabled={!selectedJobId}
              >
                Process & Qualify <Target className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}