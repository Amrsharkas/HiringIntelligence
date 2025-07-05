import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Search, MapPin, Star, Users, Eye } from "lucide-react";
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
    toast({
      title: "Coming Soon",
      description: "Full profile view will be implemented soon.",
    });
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600 dark:text-green-400";
    if (score >= 80) return "text-blue-600 dark:text-blue-400";
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
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredCandidates.map((candidate, index) => (
                  <motion.div
                    key={candidate.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`bg-gradient-to-br ${getMatchScoreBg(candidate.matchScore || 75)} rounded-xl p-6 border`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-slate-200 dark:bg-slate-600 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 font-semibold">
                          {candidate.name?.split(' ').map((n: string) => n.charAt(0)).join('') || 'C'}
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900 dark:text-white">
                            {candidate.name || 'Unknown Candidate'}
                          </h3>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {candidate.background || candidate.previousRole || 'Background not specified'}
                          </p>
                        </div>
                      </div>
                      
                      {(candidate.matchScore || jobId) && (
                        <div className="text-right">
                          <div className={`text-2xl font-bold ${getMatchScoreColor(candidate.matchScore || 75)}`}>
                            {candidate.matchScore || 75}
                          </div>
                          <div className={`text-xs font-medium ${getMatchScoreColor(candidate.matchScore || 75)}`}>
                            MATCH SCORE
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <p className="text-sm text-slate-700 dark:text-slate-300 mb-4 line-clamp-3">
                      {candidate.userProfile?.substring(0, 150) || candidate.background || candidate.summary || "Professional candidate profile available."}
                    </p>
                    
                    <div className="space-y-2 mb-4">
                      {/* Skills from user profile */}
                      {candidate.skills && typeof candidate.skills === 'string' && (
                        <div className="flex flex-wrap gap-2">
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Skills:</span>
                          {candidate.skills.split(/[,;\n]/).slice(0, 4).map((skill: string, index: number) => {
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
                          })}
                        </div>
                      )}
                      
                      {/* Interests */}
                      {candidate.interests && typeof candidate.interests === 'string' && (
                        <div className="flex flex-wrap gap-2">
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Interests:</span>
                          {candidate.interests.split(/[,;\n]/).slice(0, 3).map((interest: string, index: number) => {
                            const trimmedInterest = interest.trim();
                            return trimmedInterest ? (
                              <Badge
                                key={index}
                                variant="secondary"
                                className="text-xs bg-green-100/60 dark:bg-green-900/60 text-green-700 dark:text-green-300"
                              >
                                {trimmedInterest}
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      )}
                      
                      {/* Experience and Salary */}
                      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                        {candidate.yearsExperience && (
                          <span>📅 {candidate.yearsExperience} years exp</span>
                        )}
                        {candidate.salaryExpectation && (
                          <span>💰 {candidate.salaryExpectation}</span>
                        )}
                        {candidate.interviewScore && (
                          <span>⭐ Interview: {candidate.interviewScore}/10</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-white/30 dark:border-slate-600/30">
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <MapPin className="w-3 h-3" />
                        <span>{candidate.location || "Location not specified"}</span>
                      </div>
                      <Button
                        onClick={() => handleViewProfile(candidate.id)}
                        className={`px-4 py-2 ${
                          (candidate.matchScore || 0) >= 90 
                            ? "bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600" 
                            : (candidate.matchScore || 0) >= 80 
                            ? "bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                            : (candidate.matchScore || 0) >= 70
                            ? "bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-500 dark:hover:bg-yellow-600"
                            : (candidate.matchScore || 0) >= 60
                            ? "bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600"
                            : "bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
                        } text-white rounded-lg text-sm transition-colors duration-200`}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View Profile
                      </Button>
                    </div>

                    {candidate.matchReasoning && (
                      <div className="mt-4 p-3 bg-white/50 dark:bg-slate-700/50 rounded-lg">
                        <h4 className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          AI Match Analysis
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300">{candidate.matchReasoning}</p>
                      </div>
                    )}
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
