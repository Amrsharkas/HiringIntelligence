import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Search, MapPin, Star, Users, Eye, ArrowLeft, Mail, Calendar, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

interface CandidateData {
  id: string;
  name?: string;
  userProfile?: string;
  location?: string;
  background?: string;
  skills?: string;
  interests?: string;
  experience?: string;
  matchScore?: number;
  matchReasoning?: string;
  // Legacy fields for compatibility
  previousRole?: string;
  summary?: string;
  technicalSkills?: string[];
  yearsExperience?: number;
  salaryExpectation?: string;
  interviewScore?: number;
}

interface CandidatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId?: number;
}

export function CandidatesModal({ isOpen, onClose, jobId }: CandidatesModalProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateData | null>(null);

  const { data: candidates = [], isLoading, error } = useQuery<CandidateData[]>({
    queryKey: jobId ? [`/api/job-postings/${jobId}/candidates`] : ["/api/candidates"],
    enabled: isOpen,
    retry: false,
  });

  // Handle unauthorized errors
  React.useEffect(() => {
    if (error && isUnauthorizedError(error as Error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [error, toast]);

  const filteredCandidates = candidates.filter(candidate =>
    candidate.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    candidate.background?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    candidate.userProfile?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    candidate.skills?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    candidate.interests?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    candidate.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    // Legacy field support
    candidate.previousRole?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    candidate.summary?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewProfile = (candidateId: string) => {
    const candidate = candidates.find(c => c.id === candidateId);
    if (candidate) {
      setSelectedCandidate(candidate);
    }
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600 dark:text-green-400";
    if (score >= 80) return "text-primary dark:text-blue-400";
    if (score >= 70) return "text-yellow-600 dark:text-yellow-400";
    if (score >= 60) return "text-orange-600 dark:text-orange-400";
    return "text-red-600 dark:text-red-400";
  };

  const getMatchScoreBg = (score: number) => {
    if (score >= 90) return "from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200/50 dark:border-green-700/50";
    if (score >= 80) return "from-blue-50 to-sky-50 dark:from-blue-900/20 dark:to-sky-900/20 border-blue-200/50 dark:border-blue-700/50";
    if (score >= 70) return "from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border-yellow-200/50 dark:border-yellow-700/50";
    if (score >= 60) return "from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-orange-200/50 dark:border-orange-700/50";
    return "from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border-red-200/50 dark:border-red-700/50";
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
        >
          {selectedCandidate ? (
            /* Detailed Profile View */
            <div>
              <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedCandidate(null)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                        {selectedCandidate.name}
                      </h2>
                      <p className="text-slate-600 dark:text-slate-400">Complete Profile</p>
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
                    {selectedCandidate.name?.split(' ').map((n: string) => n.charAt(0)).join('') || 'C'}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                      {selectedCandidate.name}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <MapPin className="w-4 h-4" />
                        <span>{selectedCandidate.location || 'Location not specified'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Calendar className="w-4 h-4" />
                        <span>{selectedCandidate.experience || 'Experience not specified'}</span>
                      </div>
                      {selectedCandidate.matchScore && (
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-primary" />
                          <span className={`font-medium ${getMatchScoreColor(selectedCandidate.matchScore)}`}>
                            {selectedCandidate.matchScore}% Match
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Complete User Profile */}
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-6">
                  <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Complete Profile</h4>
                  <div className="whitespace-pre-wrap text-slate-700 dark:text-slate-300 leading-relaxed">
                    {selectedCandidate.userProfile || 'No detailed profile available.'}
                  </div>
                </div>

                {/* AI Analysis */}
                {selectedCandidate.matchReasoning && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
                    <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                      <Star className="w-5 h-5 text-primary" />
                      AI Match Analysis
                    </h4>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      {selectedCandidate.matchReasoning}
                    </p>
                  </div>
                )}

                {/* Skills and Interests */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {selectedCandidate.skills && (
                    <div>
                      <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Skills</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedCandidate.skills.split(/[,;\n]/).map((skill: string, index: number) => {
                          const trimmedSkill = skill.trim();
                          return trimmedSkill ? (
                            <Badge
                              key={index}
                              variant="secondary"
                              className="bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300"
                            >
                              {trimmedSkill}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}

                  {selectedCandidate.interests && (
                    <div>
                      <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Interests</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedCandidate.interests.split(/[,;\n]/).map((interest: string, index: number) => {
                          const trimmedInterest = interest.trim();
                          return trimmedInterest ? (
                            <Badge
                              key={index}
                              variant="secondary"
                              className="bg-green-100 dark:bg-green-900/60 text-green-700 dark:text-green-300"
                            >
                              {trimmedInterest}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Candidate List View */
            <div>
          <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6 rounded-t-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {jobId ? "Matched Candidates" : "All Candidates"}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search candidates by name, title, or skills..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-3 text-slate-600 dark:text-slate-400">Loading candidates...</span>
              </div>
            ) : filteredCandidates.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  {searchTerm ? "No matching candidates found" : "No candidates available"}
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  {searchTerm ? "Try adjusting your search terms." : "Candidates will appear here once they join the platform."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredCandidates.map((candidate, index) => (
                  <motion.div
                    key={candidate.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`bg-linear-to-r ${getMatchScoreBg(candidate.matchScore || 75)} rounded-xl p-6 border flex items-center gap-6`}
                  >
                    {/* Left side - Avatar and basic info */}
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="w-16 h-16 bg-slate-200 dark:bg-slate-600 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 font-semibold text-lg">
                        {candidate.name?.split(' ').map((n: string) => n.charAt(0)).join('') || 'C'}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-slate-900 dark:text-white text-lg">
                          {candidate.name || 'Unknown Candidate'}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {candidate.location || 'Location not specified'}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-500 line-clamp-1">
                          {candidate.background || candidate.previousRole || 'Background not specified'}
                        </p>
                      </div>
                    </div>

                    {/* Center - Profile summary and skills */}
                    <div className="flex-1 min-w-0 space-y-3">
                      <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2">
                        {candidate.userProfile?.substring(0, 120) + '...' || "Professional candidate profile available."}
                      </p>
                      
                      {/* AI Match Analysis - short version */}
                      {candidate.matchReasoning && (
                        <div className="bg-white/30 dark:bg-black/20 rounded-lg p-3">
                          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">🤖 AI Analysis:</p>
                          <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2">
                            {candidate.matchReasoning.length > 100 
                              ? candidate.matchReasoning.substring(0, 100) + '...'
                              : candidate.matchReasoning
                            }
                          </p>
                        </div>
                      )}

                      {/* Skills and Interests - compact horizontal layout */}
                      <div className="flex flex-wrap gap-1">
                        {candidate.skills && typeof candidate.skills === 'string' && 
                          candidate.skills.split(/[,;\n]/).slice(0, 3).map((skill: string, index: number) => {
                            const trimmedSkill = skill.trim();
                            return trimmedSkill ? (
                              <Badge
                                key={index}
                                variant="secondary"
                                className="text-xs bg-blue-100/60 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300"
                              >
                                {trimmedSkill}
                              </Badge>
                            ) : null;
                          })
                        }
                        {candidate.interests && typeof candidate.interests === 'string' && 
                          candidate.interests.split(/[,;\n]/).slice(0, 2).map((interest: string, index: number) => {
                            const trimmedInterest = interest.trim();
                            return trimmedInterest ? (
                              <Badge
                                key={`interest-${index}`}
                                variant="secondary"
                                className="text-xs bg-green-100/60 dark:bg-green-900/60 text-green-700 dark:text-green-300"
                              >
                                {trimmedInterest}
                              </Badge>
                            ) : null;
                          })
                        }
                      </div>
                    </div>

                    {/* Right side - Match score and actions */}
                    <div className="flex items-center gap-4 shrink-0">
                      {(candidate.matchScore || jobId) && (
                        <div className="text-center">
                          <div className={`text-3xl font-bold ${getMatchScoreColor(candidate.matchScore || 75)}`}>
                            {candidate.matchScore || 75}
                          </div>
                          <div className={`text-xs font-medium ${getMatchScoreColor(candidate.matchScore || 75)}`}>
                            MATCH SCORE
                          </div>
                        </div>
                      )}
                      
                      <Button
                        onClick={() => handleViewProfile(candidate.id)}
                        className="bg-primary hover:bg-blue-700 dark:bg-primary dark:hover:bg-primary text-white px-6 py-2 rounded-lg text-sm transition-colors duration-200"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Profile
                      </Button>
                    </div>

                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
