import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { FileText, Search, User, Briefcase, Star, Upload, Users } from 'lucide-react';

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
  const [resumeText, setResumeText] = useState('');
  const [bulkResumes, setBulkResumes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<ProfileWithScores | null>(null);

  // Fetch company job postings
  const { data: jobs = [] } = useQuery<any[]>({
    queryKey: ['/api/job-postings'],
  });

  // Fetch processed resume profiles
  const { data: profiles = [], isLoading: profilesLoading } = useQuery<ProfileWithScores[]>({
    queryKey: ['/api/resume-profiles'],
    enabled: activeTab === 'results',
  });

  // Process individual resume
  const processResumeMutation = useMutation({
    mutationFn: async (resumeData: { resumeText: string }) => {
      const response = await apiRequest('POST', '/api/resume-profiles/process', resumeData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Resume Processed',
        description: 'Resume has been analyzed and profile created successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/resume-profiles'] });
      setActiveTab('results');
      setResumeText('');
    },
    onError: (error: Error) => {
      toast({
        title: 'Processing Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Process bulk resumes
  const processBulkMutation = useMutation({
    mutationFn: async (bulkData: { resumesText: string }) => {
      const response = await apiRequest('POST', '/api/resume-profiles/process-bulk', bulkData);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Bulk Processing Complete',
        description: `Successfully processed ${data.processedCount} resumes.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/resume-profiles'] });
      setActiveTab('results');
      setBulkResumes('');
    },
    onError: (error: Error) => {
      toast({
        title: 'Bulk Processing Failed',
        description: error.message,
        variant: 'destructive',
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Resume Searcher
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Individual Resume Processing */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Single Resume
                  </CardTitle>
                  <CardDescription>
                    Paste a single resume text for AI analysis and profile creation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    placeholder="Paste resume content here..."
                    className="min-h-[200px]"
                  />
                  <Button
                    onClick={() => processResumeMutation.mutate({ resumeText })}
                    disabled={!resumeText.trim() || processResumeMutation.isPending}
                    className="w-full"
                  >
                    {processResumeMutation.isPending ? 'Processing...' : 'Process Resume'}
                  </Button>
                </CardContent>
              </Card>

              {/* Bulk Resume Processing */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Bulk Resumes
                  </CardTitle>
                  <CardDescription>
                    Paste multiple resumes separated by "---" for batch processing
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={bulkResumes}
                    onChange={(e) => setBulkResumes(e.target.value)}
                    placeholder="Paste multiple resumes here, separated by '---' between each resume..."
                    className="min-h-[200px]"
                  />
                  <Button
                    onClick={() => processBulkMutation.mutate({ resumesText: bulkResumes })}
                    disabled={!bulkResumes.trim() || processBulkMutation.isPending}
                    className="w-full"
                  >
                    {processBulkMutation.isPending ? 'Processing Bulk...' : 'Process Bulk Resumes'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'results' && (
          <div className="space-y-4">
            {/* Search Bar */}
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
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setSelectedProfile(profile)}
                                    >
                                      View Full Profile
                                    </Button>
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
                <DialogTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {selectedProfile.name} - Full Profile
                </DialogTitle>
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
                                  <Badge variant={getScoreBadgeVariant(jobScore.overallScore)}>
                                    {jobScore.overallScore}% Overall Match
                                  </Badge>
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