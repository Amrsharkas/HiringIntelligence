import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { getQueryOptions } from "@/lib/queryConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Search, MapPin, Star, Eye, Brain, TrendingUp, Target, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { ShortlistButton } from './ShortlistButton';

interface EnhancedCandidate {
  id: string;
  name?: string;
  email?: string;
  userId?: string;
  userProfile?: string;
  aiProfile?: string;
  location?: string;
  background?: string;
  skills?: string;
  interests?: string;
  experience?: string;
  matchScore?: number;
  matchSummary?: string;
  bestMatchJob?: {
    id: number;
    title: string;
    description: string;
  };
}

interface CandidatesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CandidatesModal({ isOpen, onClose }: CandidatesModalProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<EnhancedCandidate | null>(null);

  // Fetch enhanced candidates with match scores > 85
  const { data: candidates = [], isLoading, error, refetch, isFetching } = useQuery<EnhancedCandidate[]>({
    queryKey: ["/api/enhanced-candidates"],
    enabled: isOpen,
    retry: false,
    ...getQueryOptions(30000), // 30 seconds in production, disabled in development
  });

  // Manual refresh function
  const handleManualRefresh = () => {
    refetch();
  };

  // Auto-refresh every 30 seconds when modal is open
  useEffect(() => {
    if (!isOpen) return;
    
    const interval = setInterval(() => {
      refetch();
    }, 30000);

    return () => clearInterval(interval);
  }, [isOpen, refetch]);

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
    candidate.skills?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    candidate.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    candidate.bestMatchJob?.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getMatchScoreColor = (score: number) => {
    if (score >= 95) return "text-emerald-600 dark:text-emerald-400";
    if (score >= 90) return "text-green-600 dark:text-green-400";
    if (score >= 85) return "text-primary dark:text-blue-400";
    return "text-purple-600 dark:text-purple-400";
  };

  const getMatchScoreBg = (score: number) => {
    if (score >= 95) return "from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border-emerald-200/50 dark:border-emerald-700/50";
    if (score >= 90) return "from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200/50 dark:border-green-700/50";
    if (score >= 85) return "from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200/50 dark:border-blue-700/50";
    return "from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200/50 dark:border-purple-700/50";
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {!selectedCandidate ? (
            <>
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <Target className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                      AI-Suggested Candidates
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      High-scoring matches (85%+) from our candidate database
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleManualRefresh}
                    disabled={isFetching}
                  >
                    <RefreshCw className={`w-4 h-4 mr-1 ${isFetching ? 'animate-spin' : ''}`} />
                    {isFetching ? 'Refreshing...' : 'Refresh'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Search and Info */}
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search candidates by name, skills, location, or job match..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700/50 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Brain className="w-5 h-5 text-primary dark:text-blue-400 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">AI-Powered Matching</h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        These candidates were automatically analyzed against your job requirements using advanced AI. 
                        Only candidates with 85%+ compatibility are shown here.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
                {isLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <p className="text-slate-500 dark:text-slate-400">Analyzing candidates...</p>
                  </div>
                ) : filteredCandidates.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredCandidates.map((candidate) => (
                      <motion.div
                        key={candidate.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`bg-linear-to-br ${getMatchScoreBg(candidate.matchScore || 0)} border rounded-xl p-6 hover:shadow-lg transition-all duration-200 cursor-pointer`}
                        onClick={() => setSelectedCandidate(candidate)}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                              {candidate.name || 'Unnamed Candidate'}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                              {candidate.location && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {candidate.location}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`font-bold text-lg ${getMatchScoreColor(candidate.matchScore || 0)}`}>
                              {candidate.matchScore || 0}%
                            </div>
                            <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                              <Star className="w-3 h-3" />
                              AI Match
                            </div>
                          </div>
                        </div>

                        {candidate.bestMatchJob && (
                          <div className="mb-4">
                            <Badge variant="secondary" className="text-xs">
                              Best match: {candidate.bestMatchJob.title}
                            </Badge>
                          </div>
                        )}

                        {candidate.matchSummary && (
                          <p className="text-sm text-slate-700 dark:text-slate-300 mb-4 line-clamp-2">
                            {candidate.matchSummary}
                          </p>
                        )}

                        <div className="flex items-center justify-between pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
                          <div className="flex items-center gap-2">
                            {candidate.skills && (
                              <Badge variant="outline" className="text-xs">
                                Skills: {candidate.skills.substring(0, 20)}...
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <ShortlistButton
                              applicantId={candidate.id}
                              applicantName={candidate.name || 'Unnamed Candidate'}
                              jobTitle={candidate.bestMatchJob?.title || 'General Position'}
                              jobId={candidate.bestMatchJob?.id?.toString() || '0'}
                              size="sm"
                              variant="outline"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-primary hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View Profile
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <TrendingUp className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                      No High-Scoring Candidates
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400">
                      {searchTerm 
                        ? "No candidates match your search criteria."
                        : "No candidates with 85%+ match scores found. Try creating more job postings to attract better matches."
                      }
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            // Profile View
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <Button
                  variant="ghost"
                  onClick={() => setSelectedCandidate(null)}
                  className="text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  ← Back to Candidates
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                    {selectedCandidate.name || 'Unnamed Candidate'}
                  </h2>
                  <div className={`text-3xl font-bold ${getMatchScoreColor(selectedCandidate.matchScore || 0)} mb-2`}>
                    {selectedCandidate.matchScore || 0}% Match
                  </div>
                  {selectedCandidate.bestMatchJob && (
                    <Badge className="mb-4">
                      Best fit for: {selectedCandidate.bestMatchJob.title}
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">AI Analysis</h3>
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        {selectedCandidate.matchSummary || 'No analysis available'}
                      </p>
                    </div>
                    
                    {selectedCandidate.location && (
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Location</h3>
                        <p className="text-sm text-slate-700 dark:text-slate-300">{selectedCandidate.location}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    {selectedCandidate.skills && (
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Skills</h3>
                        <p className="text-sm text-slate-700 dark:text-slate-300">{selectedCandidate.skills}</p>
                      </div>
                    )}
                    
                    {selectedCandidate.experience && (
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Experience</h3>
                        <p className="text-sm text-slate-700 dark:text-slate-300">{selectedCandidate.experience}</p>
                      </div>
                    )}
                  </div>
                </div>

                {selectedCandidate.aiProfile && (
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Full AI Profile</h3>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 text-sm text-slate-700 dark:text-slate-300 max-h-40 overflow-y-auto">
                      {selectedCandidate.aiProfile}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}