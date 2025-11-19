import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { X, Search, Mail, Phone, Award, Star, FileText, ExternalLink, Target, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface ResumeSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedJobId?: number;
}

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

export function ResumeSearchModal({ isOpen, onClose, preSelectedJobId }: ResumeSearchModalProps) {
  const { toast } = useToast();
  const [selectedJobId, setSelectedJobId] = useState<string>(preSelectedJobId?.toString() || "");
  const [searchResults, setSearchResults] = useState<ResumeMatch[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [selectedResume, setSelectedResume] = useState<ResumeMatch | null>(null);

  // Update selectedJobId when preSelectedJobId changes
  useEffect(() => {
    if (preSelectedJobId) {
      setSelectedJobId(preSelectedJobId.toString());
    }
  }, [preSelectedJobId]);

  // Fetch available jobs
  const { data: jobs = [], isLoading: isLoadingJobs } = useQuery<any[]>({
    queryKey: ["/api/job-postings"],
    enabled: isOpen,
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      }
    },
  });

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

      console.log("Resume search response:", response);

      setSearchResults(response.matches || []);
      setSelectedJob(response.job);
      setHasSearched(true);

      toast({
        title: "Search Complete",
        description: `Found ${response.totalMatches || 0} matching resumes.`,
      });
    } catch (error) {
      console.error("Error searching resumes:", error);
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to search resumes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleViewProfile = (resumeId: string) => {
    // Find the resume match and show it in the dialog
    const resume = searchResults.find(r => r.resume.id === resumeId);
    if (resume) {
      setSelectedResume(resume);
    }
  };

  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "outline" => {
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "outline";
  };

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6 rounded-t-2xl z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Source Candidates</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Find the best candidates using AI-powered semantic search
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Search Section */}
              <div className="mb-6 bg-slate-50 dark:bg-slate-700/50 rounded-xl p-6 border border-slate-200/50 dark:border-slate-600/50">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <h3 className="font-semibold text-slate-900 dark:text-white">Select Job Position</h3>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Choose a job to find candidates with matching skills and experience
                </p>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Select
                      value={selectedJobId}
                      onValueChange={setSelectedJobId}
                      disabled={isLoadingJobs}
                    >
                      <SelectTrigger className="w-full bg-white dark:bg-slate-800">
                        <SelectValue placeholder="Select a job position..." />
                      </SelectTrigger>
                      <SelectContent>
                        {jobs.map((job) => (
                          <SelectItem key={job.id} value={job.id.toString()}>
                            {job.title} {job.location && `- ${job.location}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={handleSearch}
                    disabled={!selectedJobId || isSearching}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    {isSearching ? "Searching..." : "Search"}
                  </Button>
                </div>
              </div>

              {/* Loading State */}
              {isSearching && (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-600 dark:text-slate-400 font-medium">
                      Searching for matching resumes...
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">
                      Analyzing candidate profiles with AI
                    </p>
                  </div>
                </div>
              )}

              {/* Empty State */}
              {hasSearched && !isSearching && (!searchResults || searchResults.length === 0) && (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-10 w-10 text-slate-400" />
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
              )}

              {/* Results */}
              {hasSearched && !isSearching && searchResults && searchResults.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      Found {searchResults.length} matching {searchResults.length === 1 ? 'resume' : 'resumes'} for {selectedJob?.title}
                    </h3>
                  </div>

                  <div className="space-y-4">
                    {searchResults.map((match, index) => (
                      <motion.div
                        key={match.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-6 border border-slate-200/50 dark:border-slate-600/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            {/* Header */}
                            <div className="flex items-center gap-3 mb-3">
                              <h4 className="text-xl font-bold text-slate-900 dark:text-white truncate">
                                {match.resume.name}
                              </h4>
                              <Badge
                                variant={getScoreBadgeVariant(match.matchScore)}
                                className="flex items-center gap-1 flex-shrink-0"
                              >
                                <Star className="h-3 w-3" />
                                {match.matchScore}% Match
                              </Badge>
                            </div>

                            {/* Contact Info */}
                            <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400 mb-3">
                              {match.resume.email && (
                                <div className="flex items-center gap-1.5">
                                  <Mail className="h-4 w-4" />
                                  <span className="truncate">{match.resume.email}</span>
                                </div>
                              )}
                              {match.resume.phone && (
                                <div className="flex items-center gap-1.5">
                                  <Phone className="h-4 w-4" />
                                  {match.resume.phone}
                                </div>
                              )}
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
                              <div className="mb-4">
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

                            {/* Existing Score */}
                            {match.existingScore && (
                              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                <h5 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
                                  Already scored against this job
                                </h5>
                                <div className="flex flex-wrap gap-4 text-sm text-blue-800 dark:text-blue-300">
                                  <span>Overall: <strong>{match.existingScore.overallScore}%</strong></span>
                                  <span>Technical: <strong>{match.existingScore.technicalSkillsScore}%</strong></span>
                                  <span>Experience: <strong>{match.existingScore.experienceScore}%</strong></span>
                                  <span>Culture: <strong>{match.existingScore.culturalFitScore}%</strong></span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex-shrink-0">
                            <Button
                              onClick={() => handleViewProfile(match.resume.id)}
                              variant="outline"
                              size="sm"
                              className="whitespace-nowrap hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-700"
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View Profile
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </AnimatePresence>

      {/* Profile View Overlay - separate fixed element */}
      {selectedResume && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6 rounded-t-2xl z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedResume(null)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                      {selectedResume.resume.name}
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Candidate Profile</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Profile Header */}
              <div className="flex items-start gap-6">
                <div className="w-24 h-24 bg-slate-200 dark:bg-slate-600 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 font-semibold text-2xl">
                  {selectedResume.resume.name?.split(' ').map((n: string) => n.charAt(0)).join('') || 'C'}
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                    {selectedResume.resume.name}
                  </h3>
                  {selectedResume.resume.email && (
                    <div className="mb-3">
                      <span className="inline-flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                        📧 {selectedResume.resume.email}
                      </span>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    {selectedResume.resume.phone && (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Phone className="w-4 h-4" />
                        <span>{selectedResume.resume.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-blue-500" />
                      <span className="font-medium text-blue-600 dark:text-blue-400">
                        {selectedResume.matchScore}% Match
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Match Score and Reasons */}
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-purple-500" />
                  Match Score: {selectedResume.matchScore}%
                </h4>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
                  This candidate matches {selectedResume.matchScore}% of the job requirements based on AI analysis.
                </p>
                <div>
                  <h5 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Why this candidate matches
                  </h5>
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
                </div>
              </div>

              {/* Summary */}
              {selectedResume.resume.summary && (
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-6">
                  <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Professional Summary</h4>
                  <div className="whitespace-pre-wrap text-slate-700 dark:text-slate-300 leading-relaxed">
                    {selectedResume.resume.summary}
                  </div>
                </div>
              )}

              {/* Experience */}
              {selectedResume.resume.experience.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-6">
                  <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Experience</h4>
                  <div className="space-y-3">
                    {selectedResume.resume.experience.map((exp, idx) => (
                      <div key={idx} className="text-slate-700 dark:text-slate-300">
                        • {exp}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skills */}
              {selectedResume.resume.skills.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Award className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    <h4 className="text-lg font-semibold text-slate-900 dark:text-white">Skills</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedResume.resume.skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm rounded-full"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Education */}
              {selectedResume.resume.education.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-6">
                  <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Education</h4>
                  <div className="space-y-3">
                    {selectedResume.resume.education.map((edu, idx) => (
                      <div key={idx} className="text-slate-700 dark:text-slate-300">
                        • {edu}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Certifications */}
              {selectedResume.resume.certifications.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-6">
                  <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Certifications</h4>
                  <div className="space-y-3">
                    {selectedResume.resume.certifications.map((cert, idx) => (
                      <div key={idx} className="text-slate-700 dark:text-slate-300">
                        • {cert}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Languages */}
              {selectedResume.resume.languages.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-6">
                  <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Languages</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedResume.resume.languages.map((lang, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm rounded-full"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Existing Score */}
              {selectedResume.existingScore && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                  <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-4">
                    Previously Scored Against This Job
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                        {selectedResume.existingScore.overallScore}%
                      </div>
                      <div className="text-blue-600 dark:text-blue-400">Overall</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                        {selectedResume.existingScore.technicalSkillsScore}%
                      </div>
                      <div className="text-blue-600 dark:text-blue-400">Technical</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                        {selectedResume.existingScore.experienceScore}%
                      </div>
                      <div className="text-blue-600 dark:text-blue-400">Experience</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                        {selectedResume.existingScore.culturalFitScore}%
                      </div>
                      <div className="text-blue-600 dark:text-blue-400">Culture</div>
                    </div>
                  </div>
                  {selectedResume.existingScore.matchSummary && (
                    <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-700">
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        {selectedResume.existingScore.matchSummary}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
