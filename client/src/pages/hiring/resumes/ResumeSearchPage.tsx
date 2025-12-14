import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Search,
  Target,
  Star,
  FileText,
  Loader2,
  Sparkles,
  Mail,
  Phone,
  Award,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ResumeMatch {
  id: string;
  matchScore: number;
  matchReasons: string[];
  resume: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    summary: string;
    experience: string[];
    skills: string[];
    education: string[];
    certifications: string[];
    languages: string[];
  };
  existingScore?: {
    overallScore: number;
    technicalSkillsScore: number;
    experienceScore: number;
    culturalFitScore: number;
    matchSummary: string;
  } | null;
}

export default function ResumeSearchPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [searchResults, setSearchResults] = useState<ResumeMatch[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [selectedResume, setSelectedResume] = useState<ResumeMatch | null>(null);

  // Get jobId from URL if present
  const urlParams = new URLSearchParams(window.location.search);
  const jobIdFromUrl = urlParams.get("jobId");

  const { data: jobs = [] } = useQuery<any[]>({
    queryKey: ["/api/job-postings"],
  });

  // Set initial job from URL
  useEffect(() => {
    if (jobIdFromUrl) {
      setSelectedJobId(jobIdFromUrl);
    }
  }, [jobIdFromUrl]);

  const handleSearch = async () => {
    if (!selectedJobId) {
      toast({
        title: "Job Required",
        description: "Please select a job to search for matching resumes.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    setHasSearched(false);

    try {
      const res = await apiRequest<{
        success: boolean;
        job: { id: number; title: string };
        matches: ResumeMatch[];
        totalMatches: number;
      }>("GET", `/api/resume-profiles/search?jobId=${selectedJobId}`);

      const response = await res.json();

      setSearchResults(response.matches || []);
      setSelectedJob(response.job);
      setHasSearched(true);

      toast({
        title: "Search Complete",
        description: `Found ${response.totalMatches || 0} matching resumes.`,
      });
    } catch (error) {
      console.error("Error searching resumes:", error);
      toast({
        title: "Error",
        description: "Failed to search resumes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "outline" => {
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "outline";
  };

  // Render selected resume details
  if (selectedResume) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedResume(null)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
              {selectedResume.resume.name}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Candidate Profile
            </p>
          </div>
        </div>

        {/* Profile Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Contact & Match Info */}
          <div className="space-y-4">
            {/* Contact Card */}
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-xl">
                    {selectedResume.resume.name?.split(' ').map(n => n.charAt(0)).join('') || 'C'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{selectedResume.resume.name}</h3>
                    <Badge variant={getScoreBadgeVariant(selectedResume.matchScore)} className="mt-1">
                      <Star className="h-3 w-3 mr-1" />
                      {selectedResume.matchScore}% Match
                    </Badge>
                  </div>
                </div>
                {selectedResume.resume.email && (
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <Mail className="w-4 h-4" />
                    <span>{selectedResume.resume.email}</span>
                  </div>
                )}
                {selectedResume.resume.phone && (
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <Phone className="w-4 h-4" />
                    <span>{selectedResume.resume.phone}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Match Reasons Card */}
            <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-500" />
                  Why This Candidate Matches
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {selectedResume.matchReasons.map((reason, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full"
                    >
                      {reason}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Existing Score Card */}
            {selectedResume.existingScore && (
              <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <CardHeader>
                  <CardTitle className="text-lg">Previous Job Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                        {selectedResume.existingScore.overallScore}%
                      </div>
                      <div className="text-primary dark:text-blue-400">Overall</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                        {selectedResume.existingScore.technicalSkillsScore}%
                      </div>
                      <div className="text-primary dark:text-blue-400">Technical</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                        {selectedResume.existingScore.experienceScore}%
                      </div>
                      <div className="text-primary dark:text-blue-400">Experience</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                        {selectedResume.existingScore.culturalFitScore}%
                      </div>
                      <div className="text-primary dark:text-blue-400">Culture</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Details */}
          <div className="lg:col-span-2 space-y-4">
            {/* Summary */}
            {selectedResume.resume.summary && (
              <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Professional Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {selectedResume.resume.summary}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Skills */}
            {selectedResume.resume.skills.length > 0 && (
              <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    Skills
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {selectedResume.resume.skills.map((skill, idx) => (
                      <Badge key={idx} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Experience */}
            {selectedResume.resume.experience.length > 0 && (
              <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Experience</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {selectedResume.resume.experience.map((exp, idx) => (
                      <div key={idx} className="text-slate-700 dark:text-slate-300">
                        • {exp}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Education */}
            {selectedResume.resume.education.length > 0 && (
              <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Education</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {selectedResume.resume.education.map((edu, idx) => (
                      <div key={idx} className="text-slate-700 dark:text-slate-300">
                        • {edu}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Certifications */}
            {selectedResume.resume.certifications.length > 0 && (
              <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Certifications</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {selectedResume.resume.certifications.map((cert, idx) => (
                      <div key={idx} className="text-slate-700 dark:text-slate-300">
                        • {cert}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Languages */}
            {selectedResume.resume.languages.length > 0 && (
              <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Languages</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {selectedResume.resume.languages.map((lang, idx) => (
                      <Badge key={idx} variant="outline">
                        {lang}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/hiring/resumes")}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
            AI Resume Search
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Find the best matching candidates for your job postings
          </p>
        </div>
      </div>

      {/* Search Card */}
      <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200/60 dark:border-slate-700/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            AI-Powered Resume Matching
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-600 dark:text-slate-300">
            Select a job posting to find resumes that best match the requirements.
            Our AI will analyze and score each candidate based on skills, experience, and qualifications.
          </p>

          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Select Job Posting
              </label>
              <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a job to match resumes against" />
                </SelectTrigger>
                <SelectContent>
                  {jobs.map((job) => (
                    <SelectItem key={job.id} value={job.id.toString()}>
                      {job.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleSearch}
              disabled={!selectedJobId || isSearching}
              className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
            >
              <Target className="w-4 h-4 mr-2" />
              {isSearching ? "Searching..." : "Search Matching Resumes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isSearching && (
        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <CardContent className="py-16">
            <div className="flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
                <p className="text-slate-600 dark:text-slate-400 font-medium">
                  Searching for matching resumes...
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">
                  Analyzing candidate profiles with AI
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State - No Search Yet */}
      {!hasSearched && !isSearching && (
        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200/60 dark:border-slate-700/60">
          <CardHeader>
            <CardTitle>How AI Resume Matching Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-6 h-6 text-primary dark:text-blue-400" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                  1. Analyze Job Requirements
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  AI extracts key skills, experience, and qualifications from your job posting
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Search className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                  2. Search Resume Database
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Scans all uploaded resumes to find candidates with matching qualifications
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Star className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                  3. Score & Rank Candidates
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Assigns match scores and ranks candidates by fit for the position
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State - No Results */}
      {hasSearched && !isSearching && searchResults.length === 0 && (
        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <CardContent className="py-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                No Matching Resumes Found
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                No resumes match the requirements for {selectedJob?.title}.
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">
                Try uploading more resumes or adjust your job requirements.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      {hasSearched && !isSearching && searchResults.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Found {searchResults.length} matching {searchResults.length === 1 ? 'resume' : 'resumes'} for {selectedJob?.title}
            </h2>
          </div>

          <div className="space-y-4">
            {searchResults.map((match, index) => (
              <motion.div
                key={match.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm hover:shadow-lg transition-all duration-200">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                            {match.resume.name?.[0] || "C"}
                          </div>
                          <div>
                            <h4 className="text-xl font-bold text-slate-900 dark:text-white truncate">
                              {match.resume.name}
                            </h4>
                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                              {match.resume.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {match.resume.email}
                                </span>
                              )}
                            </div>
                          </div>
                          <Badge
                            variant={getScoreBadgeVariant(match.matchScore)}
                            className="flex items-center gap-1 flex-shrink-0 ml-auto"
                          >
                            <Star className="h-3 w-3" />
                            {match.matchScore}% Match
                          </Badge>
                        </div>

                        {/* Summary */}
                        {match.resume.summary && (
                          <p className="text-slate-700 dark:text-slate-300 mb-4 line-clamp-2">
                            {match.resume.summary}
                          </p>
                        )}

                        {/* Match Reasons */}
                        <div className="mb-4">
                          <h5 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                            Why this candidate matches
                          </h5>
                          <div className="flex flex-wrap gap-2">
                            {match.matchReasons.map((reason, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full"
                              >
                                {reason}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Skills */}
                        {match.resume.skills.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Award className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                              <h5 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                Skills
                              </h5>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {match.resume.skills.slice(0, 8).map((skill, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full"
                                >
                                  {skill}
                                </span>
                              ))}
                              {match.resume.skills.length > 8 && (
                                <span className="px-2 py-1 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 text-xs rounded-full">
                                  +{match.resume.skills.length - 8} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex-shrink-0">
                        <Button
                          onClick={() => setSelectedResume(match)}
                          variant="outline"
                          size="sm"
                          className="whitespace-nowrap hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-primary dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-700"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View Profile
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
