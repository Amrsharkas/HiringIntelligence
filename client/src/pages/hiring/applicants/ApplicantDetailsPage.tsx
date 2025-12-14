import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Star,
  CheckCircle,
  XCircle,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  FileText,
  Loader2,
  Play,
  User,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { DetailedAnalysis } from "@/components/DetailedAnalysis";
import { HLSVideoPlayer } from "@/components/HLSVideoPlayer";

// Helper functions for structured profile rendering
const getFitScoreColor = (fit: string) => {
  switch (fit?.toUpperCase()) {
    case 'EXCELLENT': return 'bg-green-500';
    case 'GOOD': return 'bg-blue-500';
    case 'FAIR': return 'bg-yellow-500';
    case 'POOR': return 'bg-orange-500';
    case 'NOT_FIT': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
};

const getVerdictColor = (decision: string) => {
  switch (decision?.toUpperCase()) {
    case 'INTERVIEW': return 'bg-green-500 text-white border-green-600';
    case 'CONSIDER': return 'bg-blue-500 text-white border-blue-600';
    case 'REVIEW': return 'bg-yellow-500 text-white border-yellow-600';
    case 'NOT PASS': return 'bg-red-500 text-white border-red-600';
    default: return 'bg-gray-500 text-white border-gray-600';
  }
};

const getConfidenceColor = (confidence: string) => {
  switch (confidence?.toUpperCase()) {
    case 'HIGH': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
    case 'MEDIUM': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
    case 'LOW': return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300';
    default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300';
  }
};

const getRiskColor = (risk: string) => {
  switch (risk?.toUpperCase()) {
    case 'LOW': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
    case 'MEDIUM': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
    case 'HIGH': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
    case 'CRITICAL': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300';
  }
};

const getScoreColorClass = (score: number) => {
  if (score >= 80) return 'text-green-600 dark:text-green-400';
  if (score >= 60) return 'text-blue-600 dark:text-blue-400';
  if (score >= 40) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
};

export default function ApplicantDetailsPage() {
  const { applicantId } = useParams<{ applicantId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const { data: applicant, isLoading } = useQuery<any>({
    queryKey: ["/api/applicants/detail", applicantId],
    queryFn: async () => {
      const response = await fetch(`/api/applicants/detail/${applicantId}`);
      if (!response.ok) throw new Error("Failed to fetch applicant");
      return response.json();
    },
  });

  // Fetch detailed profile when applicant data is available
  useEffect(() => {
    const fetchProfile = async () => {
      if (!applicantId) return;

      setProfileLoading(true);
      try {
        // Try the application-profile endpoint first (same as modal)
        const response = await fetch(`/api/application-profile/${encodeURIComponent(applicantId)}`);
        if (response.ok) {
          const profile = await response.json();
          setUserProfile(profile);
        } else {
          // Try fallback to public-profile with userId
          if (applicant?.applicantUserId || applicant?.userId) {
            const userId = applicant.applicantUserId || applicant.userId;
            const jobIdParam = applicant.jobId ? `?jobId=${encodeURIComponent(applicant.jobId)}` : '';
            const fallbackResponse = await fetch(`/api/public-profile/${encodeURIComponent(userId)}${jobIdParam}`);
            if (fallbackResponse.ok) {
              const fallbackProfile = await fallbackResponse.json();
              setUserProfile(fallbackProfile);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setProfileLoading(false);
      }
    };

    fetchProfile();
  }, [applicantId, applicant?.applicantUserId, applicant?.userId, applicant?.jobId]);

  const shortlistMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/applicants/${applicantId}/shortlist`);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Applicant shortlisted!" });
      queryClient.invalidateQueries({ queryKey: ["/api/applicants/detail", applicantId] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to shortlist applicant",
        variant: "destructive",
      });
    },
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/applicants/${applicantId}/accept`);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Applicant accepted!" });
      queryClient.invalidateQueries({ queryKey: ["/api/applicants/detail", applicantId] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to accept applicant",
        variant: "destructive",
      });
    },
  });

  const denyMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/applicants/${applicantId}/deny`);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Applicant denied" });
      queryClient.invalidateQueries({ queryKey: ["/api/applicants/detail", applicantId] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to deny applicant",
        variant: "destructive",
      });
    },
  });

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-600 dark:text-green-400";
    if (score >= 50) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "shortlisted":
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Shortlisted</Badge>;
      case "denied":
        return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Denied</Badge>;
      case "accepted":
        return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Accepted</Badge>;
      default:
        return <Badge variant="secondary">New</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!applicant) {
    return (
      <div className="text-center py-12">
        <User className="w-16 h-16 mx-auto mb-4 text-slate-400" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
          Applicant not found
        </h3>
        <Button onClick={() => navigate("/hiring/applicants")}>
          Back to Applicants
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between"
      >
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/hiring/applicants")}
            className="mt-1"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-semibold">
              {applicant.firstName?.[0] || applicant.email?.[0]?.toUpperCase() || "A"}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                  {applicant.firstName && applicant.lastName
                    ? `${applicant.firstName} ${applicant.lastName}`
                    : applicant.email}
                </h1>
                {getStatusBadge(applicant.status)}
              </div>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                Applied for: {applicant.jobTitle || "Unknown Position"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {applicant.status !== "shortlisted" && applicant.status !== "accepted" && (
            <Button
              variant="outline"
              onClick={() => shortlistMutation.mutate()}
              disabled={shortlistMutation.isPending}
            >
              <Star className="w-4 h-4 mr-2" />
              Shortlist
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => navigate(`/hiring/interviews/new?applicantId=${applicantId}`)}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Schedule Interview
          </Button>
          {applicant.status === "shortlisted" && (
            <Button
              onClick={() => acceptMutation.mutate()}
              disabled={acceptMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Accept
            </Button>
          )}
          {applicant.status !== "denied" && (
            <Button
              variant="outline"
              onClick={() => denyMutation.mutate()}
              disabled={denyMutation.isPending}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Deny
            </Button>
          )}
        </div>
      </motion.div>

      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="space-y-6 pr-4">
          {/* Header Section */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-gray-600 dark:text-slate-300" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                  {applicant.name || applicant.firstName && applicant.lastName
                    ? `${applicant.firstName} ${applicant.lastName}`
                    : applicant.email}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{applicant.email}</p>
                {applicant.phone && <p className="text-sm text-slate-500 dark:text-slate-400">{applicant.phone}</p>}
              </div>
            </div>
          </div>

          <Separator />

          {/* Interview Video Section - Same as Modal */}
          {userProfile?.interviewVideoUrl && (
            <>
              <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                    <Play className="w-5 h-5" />
                    Interview Recording
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                    <HLSVideoPlayer
                      src={userProfile.interviewVideoUrl}
                      className="w-full h-full object-contain"
                    />
                  </div>
                </CardContent>
              </Card>
              <Separator />
            </>
          )}

          {/* AI Analysis & Scoring - Same as Modal */}
          {(() => {
            const structuredProfile = userProfile?.structuredProfile;
            const hasV3Profile = (userProfile?.profileVersion >= 3 || structuredProfile?.profile_version === "4.0") && structuredProfile;

            if (profileLoading) {
              return (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
                  <span className="text-slate-500">Loading detailed analysis...</span>
                </div>
              );
            }

            if (!hasV3Profile) return null;

            return (
              <>
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg text-slate-800 dark:text-slate-200">AI Analysis & Scoring</h4>

                  {/* Executive Summary Banner */}
                  {structuredProfile?.executive_summary && (
                    <div className="p-4 rounded-lg bg-gradient-to-r from-slate-900 to-slate-800 text-white">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <span className="text-lg font-bold">
                            {structuredProfile.executive_summary?.one_sentence ||
                             structuredProfile.executive_summary?.one_liner ||
                             'Candidate Analysis'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {(structuredProfile.executive_summary?.fit_verdict ||
                            structuredProfile.executive_summary?.fit_score) && (
                            <Badge className={`text-xs ${getFitScoreColor(
                              structuredProfile.executive_summary?.fit_verdict ||
                              structuredProfile.executive_summary?.fit_score
                            )}`}>
                              {(structuredProfile.executive_summary?.fit_verdict ||
                                structuredProfile.executive_summary?.fit_score)?.replace(/_/g, ' ')} FIT
                            </Badge>
                          )}
                          {structuredProfile.executive_summary?.confidence_in_verdict && (
                            <Badge className={`text-xs ${getConfidenceColor(structuredProfile.executive_summary?.confidence_in_verdict)}`}>
                              {structuredProfile.executive_summary?.confidence_in_verdict} Confidence
                            </Badge>
                          )}
                        </div>
                      </div>
                      {structuredProfile.executive_summary?.key_impression && (
                        <p className="text-sm text-slate-200 mt-2">
                          {structuredProfile.executive_summary?.key_impression}
                        </p>
                      )}
                      {(structuredProfile.executive_summary?.standout_positive ||
                        structuredProfile.executive_summary?.primary_concern) && (
                        <div className="grid grid-cols-2 gap-3 mt-3">
                          {structuredProfile.executive_summary?.standout_positive && (
                            <div className="p-2 bg-green-900/30 rounded border border-green-700">
                              <div className="text-xs text-green-400 font-medium">Standout Positive</div>
                              <div className="text-sm text-green-200">{structuredProfile.executive_summary?.standout_positive}</div>
                            </div>
                          )}
                          {structuredProfile.executive_summary?.primary_concern &&
                           structuredProfile.executive_summary?.primary_concern !== 'None identified' && (
                            <div className="p-2 bg-orange-900/30 rounded border border-orange-700">
                              <div className="text-xs text-orange-400 font-medium">Primary Concern</div>
                              <div className="text-sm text-orange-200">{structuredProfile.executive_summary?.primary_concern}</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Verdict & Recommendation Section */}
                  {structuredProfile?.verdict && (
                    <div className="p-4 rounded-lg border-2 border-gray-300 dark:border-slate-600 bg-gradient-to-r from-gray-50 to-white dark:from-slate-800 dark:to-slate-900">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <Badge className={`text-lg px-4 py-2 font-bold ${getVerdictColor(structuredProfile.verdict?.decision)}`}>
                            {structuredProfile.verdict?.decision === 'INTERVIEW' ? '✓ INTERVIEW' :
                             structuredProfile.verdict?.decision === 'CONSIDER' ? '? CONSIDER' :
                             structuredProfile.verdict?.decision === 'REVIEW' ? '⚠ REVIEW' :
                             '✗ NOT SUITABLE'}
                          </Badge>
                          {structuredProfile.verdict?.confidence && (
                            <span className={`text-xs font-medium px-2 py-1 rounded ${getConfidenceColor(structuredProfile.verdict?.confidence)}`}>
                              {structuredProfile.verdict?.confidence} Confidence
                            </span>
                          )}
                          {structuredProfile.verdict?.risk_level && (
                            <span className={`text-xs font-medium px-2 py-1 rounded ${getRiskColor(structuredProfile.verdict?.risk_level)}`}>
                              {structuredProfile.verdict?.risk_level} Risk
                            </span>
                          )}
                        </div>
                      </div>

                      {structuredProfile.verdict?.summary && (
                        <p className="text-base font-medium text-gray-800 dark:text-slate-200 mb-3">
                          {structuredProfile.verdict?.summary}
                        </p>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        {structuredProfile.verdict?.top_strength && (
                          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                            <div className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1 flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" /> TOP STRENGTH
                            </div>
                            <div className="text-sm text-green-800 dark:text-green-200">
                              {structuredProfile.verdict?.top_strength}
                            </div>
                          </div>
                        )}
                        {structuredProfile.verdict?.top_concern &&
                         structuredProfile.verdict?.top_concern !== 'None significant' &&
                         structuredProfile.verdict?.top_concern !== 'None' ? (
                          <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-700">
                            <div className="text-xs font-semibold text-orange-600 dark:text-orange-400 mb-1 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> TOP CONCERN
                            </div>
                            <div className="text-sm text-orange-800 dark:text-orange-200">
                              {structuredProfile.verdict?.top_concern}
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600">
                            <div className="text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" /> TOP CONCERN
                            </div>
                            <div className="text-sm text-gray-600 dark:text-slate-400 italic">No significant concerns</div>
                          </div>
                        )}
                      </div>

                      {/* Dealbreakers if any */}
                      {structuredProfile.verdict?.dealbreakers &&
                       structuredProfile.verdict?.dealbreakers.length > 0 && (
                        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700">
                          <div className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">DEALBREAKERS</div>
                          <ul className="text-sm text-red-800 dark:text-red-200">
                            {structuredProfile.verdict?.dealbreakers.map((item: string, i: number) => (
                              <li key={i} className="flex items-start gap-1">
                                <span className="text-red-500">✗</span> {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Hiring Guidance Section */}
                  {structuredProfile?.hiring_guidance && (
                    <div className="p-4 rounded-lg border-2 border-indigo-300 dark:border-indigo-600 bg-gradient-to-r from-indigo-50 to-white dark:from-indigo-900/20 dark:to-slate-900">
                      <h5 className="font-semibold text-indigo-700 dark:text-indigo-400 mb-3 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" /> Hiring Guidance
                      </h5>
                      <div className="flex items-center gap-3 mb-4">
                        <Badge className={`text-lg px-4 py-2 font-bold ${
                          structuredProfile.hiring_guidance?.proceed_to_next_round === 'YES' ? 'bg-green-500 text-white' :
                          structuredProfile.hiring_guidance?.proceed_to_next_round === 'LIKELY' ? 'bg-blue-500 text-white' :
                          structuredProfile.hiring_guidance?.proceed_to_next_round === 'MAYBE' ? 'bg-yellow-500 text-white' :
                          structuredProfile.hiring_guidance?.proceed_to_next_round === 'UNLIKELY' ? 'bg-orange-500 text-white' :
                          'bg-red-500 text-white'
                        }`}>
                          {structuredProfile.hiring_guidance?.proceed_to_next_round === 'YES' ? '✓ PROCEED' :
                           structuredProfile.hiring_guidance?.proceed_to_next_round === 'LIKELY' ? '↗ LIKELY PROCEED' :
                           structuredProfile.hiring_guidance?.proceed_to_next_round === 'MAYBE' ? '? MAYBE' :
                           structuredProfile.hiring_guidance?.proceed_to_next_round === 'UNLIKELY' ? '↘ UNLIKELY' :
                           '✗ DO NOT PROCEED'}
                        </Badge>
                      </div>
                      {structuredProfile.hiring_guidance?.reasoning && (
                        <p className="text-sm text-slate-700 dark:text-slate-300 mb-4 p-3 bg-white dark:bg-slate-800 rounded border">
                          {structuredProfile.hiring_guidance?.reasoning}
                        </p>
                      )}
                      {structuredProfile.hiring_guidance?.suggested_follow_up_questions?.length > 0 && (
                        <div className="mb-4">
                          <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-2">Suggested Follow-up Questions</div>
                          <ul className="space-y-1">
                            {structuredProfile.hiring_guidance?.suggested_follow_up_questions.map((q: string, i: number) => (
                              <li key={i} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2">
                                <span className="text-indigo-500">•</span> {q}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Score Breakdown */}
                  {structuredProfile?.scores && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Overall Score</div>
                        <div className={`text-3xl font-bold ${getScoreColorClass(structuredProfile.scores?.overall_score?.value || 0)}`}>
                          {structuredProfile.scores?.overall_score?.value ?? structuredProfile.scores?.overall_score?.score ?? 0}%
                        </div>
                        <Progress value={structuredProfile.scores?.overall_score?.value || 0} className="h-1.5 mt-2" />
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Technical</div>
                        <div className={`text-3xl font-bold ${getScoreColorClass(structuredProfile.scores?.technical_competence?.score || 0)}`}>
                          {structuredProfile.scores?.technical_competence?.score || 0}%
                        </div>
                        <Progress value={structuredProfile.scores?.technical_competence?.score || 0} className="h-1.5 mt-2" />
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Experience</div>
                        <div className={`text-3xl font-bold ${getScoreColorClass(structuredProfile.scores?.experience_quality?.score || 0)}`}>
                          {structuredProfile.scores?.experience_quality?.score || 0}%
                        </div>
                        <Progress value={structuredProfile.scores?.experience_quality?.score || 0} className="h-1.5 mt-2" />
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Cultural Fit</div>
                        <div className={`text-3xl font-bold ${getScoreColorClass(structuredProfile.scores?.cultural_collaboration_fit?.score || 0)}`}>
                          {structuredProfile.scores?.cultural_collaboration_fit?.score || 0}%
                        </div>
                        <Progress value={structuredProfile.scores?.cultural_collaboration_fit?.score || 0} className="h-1.5 mt-2" />
                      </div>
                    </div>
                  )}

                  {/* Red Flags */}
                  {structuredProfile?.red_flags && structuredProfile.red_flags.length > 0 && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700">
                      <h5 className="font-semibold text-red-700 dark:text-red-400 mb-3 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" /> Red Flags ({structuredProfile.red_flags.length})
                      </h5>
                      <div className="space-y-2">
                        {structuredProfile.red_flags.map((flag: any, i: number) => (
                          <div key={i} className="p-3 bg-white dark:bg-slate-800 rounded border border-red-200 dark:border-red-700">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="font-medium text-red-800 dark:text-red-200">{flag.flag || flag.issue}</div>
                                {flag.evidence && (
                                  <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                    Evidence: {flag.evidence}
                                  </div>
                                )}
                              </div>
                              {flag.severity && (
                                <Badge className={`text-xs ${
                                  flag.severity === 'HIGH' ? 'bg-red-100 text-red-700' :
                                  flag.severity === 'MEDIUM' ? 'bg-orange-100 text-orange-700' :
                                  'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {flag.severity}
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <Separator />
              </>
            );
          })()}

          {/* Professional Summary */}
          {(applicant.summary || applicant.matchSummary) && (
            <>
              <div>
                <h4 className="font-semibold mb-3 text-lg text-slate-800 dark:text-slate-200">Professional Summary</h4>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {applicant.summary || applicant.matchSummary}
                </p>
              </div>
              <Separator />
            </>
          )}

          {/* Job Match Analysis */}
          <div>
            <h4 className="font-semibold mb-4 text-lg text-slate-800 dark:text-slate-200">Job Match Analysis</h4>
            <Card className={applicant.disqualified ? 'border-red-200 bg-red-50/30 dark:bg-red-900/10' : ''}>
              <CardContent className="p-6">
                {/* Job Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Briefcase className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                      <h5 className="font-semibold text-lg text-slate-800 dark:text-slate-200">
                        {applicant.jobTitle || 'Applied Position'}
                      </h5>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {applicant.disqualified ? (
                        <Badge variant="destructive" className="text-xs font-semibold">
                          NOT A MATCH
                        </Badge>
                      ) : applicant.matchScore ? (
                        <Badge
                          variant={applicant.matchScore >= 70 ? "default" : applicant.matchScore >= 50 ? "secondary" : "destructive"}
                          className={
                            applicant.matchScore >= 70
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : applicant.matchScore >= 50
                              ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                              : ""
                          }
                        >
                          {applicant.matchScore}% Overall Match
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Disqualified Candidate Special Layout */}
                {applicant.disqualified && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Left Column - Status and Scores */}
                    <div className="space-y-4">
                      <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                        <div className="flex items-center gap-2 mb-3">
                          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                          <h6 className="font-semibold text-red-800 dark:text-red-400">Not Suitable for This Role</h6>
                        </div>
                        {applicant.disqualificationReason && (
                          <p className="text-sm text-red-700 dark:text-red-300 mb-3">{applicant.disqualificationReason}</p>
                        )}
                      </div>

                      {/* Key Skill Gaps */}
                      {applicant.improvementAreas && applicant.improvementAreas.length > 0 && (
                        <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                          <div className="flex items-center gap-2 mb-3">
                            <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                            <h6 className="font-semibold text-orange-800 dark:text-orange-400">
                              Critical Skill Gaps ({applicant.improvementAreas.length})
                            </h6>
                          </div>
                          <ul className="space-y-2">
                            {applicant.improvementAreas.map((gap: any, index: number) => (
                              <li key={index} className="text-sm text-orange-700 dark:text-orange-300 flex items-start gap-2">
                                <span className="text-orange-500 mt-1">-</span>
                                <span>{typeof gap === 'string' ? gap : gap.gap || 'Gap identified'}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Right Column - Additional Info */}
                    <div className="space-y-4">
                      {applicant.redFlags && applicant.redFlags.length > 0 && (
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                          <h6 className="font-semibold text-yellow-800 dark:text-yellow-400 mb-2">Red Flags</h6>
                          <ul className="space-y-1">
                            {applicant.redFlags.map((flag: any, index: number) => (
                              <li key={index} className="text-sm text-yellow-700 dark:text-yellow-300">
                                - {flag.issue} - {flag.reason}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {applicant.matchSummary && (
                        <div className="p-3 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg">
                          <h6 className="font-semibold text-gray-700 dark:text-slate-300 mb-2">Assessment Summary</h6>
                          <p className="text-sm text-gray-600 dark:text-slate-400">{applicant.matchSummary}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Regular Score Breakdown (for non-disqualified) */}
                {!applicant.disqualified && (
                  <>
                    {applicant.matchSummary && (
                      <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">{applicant.matchSummary}</p>
                    )}

                    {/* Component Score Breakdown */}
                    {(applicant.technicalSkillsScore || applicant.experienceScore || applicant.culturalFitScore) && (
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        {applicant.technicalSkillsScore !== undefined && (
                          <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                              {applicant.technicalSkillsScore}%
                            </div>
                            <div className="text-xs text-blue-600 dark:text-blue-400">Technical Skills</div>
                          </div>
                        )}
                        {applicant.experienceScore !== undefined && (
                          <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                            <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                              {applicant.experienceScore}%
                            </div>
                            <div className="text-xs text-green-600 dark:text-green-400">Experience</div>
                          </div>
                        )}
                        {applicant.culturalFitScore !== undefined && (
                          <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                            <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                              {applicant.culturalFitScore}%
                            </div>
                            <div className="text-xs text-purple-600 dark:text-purple-400">Cultural Fit</div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* Detailed Analysis Component */}
                {applicant.fullResponse && (
                  <DetailedAnalysis
                    jobScore={{
                      jobId: parseInt(applicant.jobId) || 0,
                      overallScore: applicant.matchScore || 0,
                      matchSummary: applicant.matchSummary,
                      disqualified: applicant.disqualified,
                      disqualificationReason: applicant.disqualificationReason,
                      improvementAreas: applicant.improvementAreas,
                      redFlags: applicant.redFlags,
                      strengthsHighlights: applicant.strengthsHighlights,
                      fullResponse: applicant.fullResponse,
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* Skills and Other Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Skills */}
            {applicant.skills && applicant.skills.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 text-slate-800 dark:text-slate-200">Skills</h4>
                <div className="flex flex-wrap gap-1">
                  {applicant.skills.map((skill: any, index: number) => (
                    <Badge key={index} variant="outline" className="dark:border-slate-600">
                      {typeof skill === 'string' ? skill : (skill.name || skill.skill || JSON.stringify(skill))}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Languages */}
            {applicant.languages && applicant.languages.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 text-slate-800 dark:text-slate-200">Languages</h4>
                <div className="flex flex-wrap gap-1">
                  {applicant.languages.map((language: any, index: number) => (
                    <Badge key={index} variant="secondary">
                      {typeof language === 'string' ? language : (language.name || language.language || JSON.stringify(language))}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Experience */}
          {applicant.experience && (
            <div>
              <h4 className="font-semibold mb-2 text-slate-800 dark:text-slate-200">Experience</h4>
              <div className="space-y-3">
                {Array.isArray(applicant.experience) ? (
                  applicant.experience.map((exp: any, index: number) => (
                    <div key={index} className="bg-gray-50 dark:bg-slate-700/50 p-3 rounded text-slate-600 dark:text-slate-300">
                      {typeof exp === 'string' ? (
                        <p className="text-sm">{exp}</p>
                      ) : (
                        <>
                          <div className="flex items-start justify-between mb-1">
                            <div>
                              <div className="font-medium text-slate-800 dark:text-slate-200">
                                {exp.position || exp.title || exp.role}
                              </div>
                              <div className="text-sm text-slate-600 dark:text-slate-400">
                                {exp.company || exp.organization}
                                {exp.location && ` - ${exp.location}`}
                              </div>
                            </div>
                            {exp.current && (
                              <Badge variant="secondary" className="text-xs">Current</Badge>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                            {exp.startDate || exp.start_date}
                            {(exp.endDate || exp.end_date || exp.current) &&
                              ` - ${exp.current ? 'Present' : (exp.endDate || exp.end_date)}`}
                            {exp.yearsAtPosition && ` (${exp.yearsAtPosition})`}
                          </div>
                          {exp.responsibilities && (
                            <div className="text-sm">
                              {Array.isArray(exp.responsibilities) ? (
                                <ul className="list-disc list-inside space-y-1">
                                  {exp.responsibilities.map((resp: string, i: number) => (
                                    <li key={i}>{resp}</li>
                                  ))}
                                </ul>
                              ) : (
                                <p>{exp.responsibilities}</p>
                              )}
                            </div>
                          )}
                          {exp.description && !exp.responsibilities && (
                            <p className="text-sm">{exp.description}</p>
                          )}
                        </>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm bg-gray-50 dark:bg-slate-700/50 p-2 rounded text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                    {typeof applicant.experience === 'object'
                      ? JSON.stringify(applicant.experience, null, 2)
                      : applicant.experience}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Education */}
          {applicant.education && (
            <div>
              <h4 className="font-semibold mb-2 text-slate-800 dark:text-slate-200">Education</h4>
              <div className="space-y-3">
                {Array.isArray(applicant.education) ? (
                  applicant.education.map((edu: any, index: number) => (
                    <div key={index} className="bg-gray-50 dark:bg-slate-700/50 p-3 rounded text-slate-600 dark:text-slate-300">
                      {typeof edu === 'string' ? (
                        <p className="text-sm">{edu}</p>
                      ) : (
                        <>
                          <div className="font-medium text-slate-800 dark:text-slate-200">
                            {edu.degree || edu.qualification}
                            {edu.field && ` in ${edu.field}`}
                            {edu.major && ` - ${edu.major}`}
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">
                            {edu.institution || edu.school || edu.university}
                            {edu.location && ` - ${edu.location}`}
                          </div>
                          {(edu.graduationYear || edu.graduation_year || edu.endDate || edu.year) && (
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {edu.startDate || edu.start_date}
                              {edu.startDate && ' - '}
                              {edu.graduationYear || edu.graduation_year || edu.endDate || edu.year}
                            </div>
                          )}
                          {edu.gpa && (
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              GPA: {edu.gpa}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm bg-gray-50 dark:bg-slate-700/50 p-2 rounded text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                    {typeof applicant.education === 'object'
                      ? JSON.stringify(applicant.education, null, 2)
                      : applicant.education}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Certifications */}
          {applicant.certifications && applicant.certifications.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2 text-slate-800 dark:text-slate-200">Certifications</h4>
              <div className="space-y-2">
                {applicant.certifications.map((cert: any, index: number) => (
                  <div key={index} className="text-sm bg-gray-50 dark:bg-slate-700/50 p-2 rounded text-slate-600 dark:text-slate-300">
                    {typeof cert === 'string' ? cert : (
                      <>
                        <span className="font-medium">{cert.name || cert.title}</span>
                        {cert.issuer && <span className="text-slate-500"> - {cert.issuer}</span>}
                        {cert.year && <span className="text-slate-500"> ({cert.year})</span>}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Contact Info & Timeline Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Information */}
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-slate-800 dark:text-slate-200">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Email</p>
                    <a
                      href={`mailto:${applicant.email}`}
                      className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {applicant.email}
                    </a>
                  </div>
                </div>

                {applicant.phone && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                      <Phone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Phone</p>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {applicant.phone}
                      </p>
                    </div>
                  </div>
                )}

                {applicant.location && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                      <MapPin className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Location</p>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {applicant.location}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Application Timeline */}
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-slate-800 dark:text-slate-200">Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">Applied</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(applicant.appliedAt || applicant.createdAt).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                {applicant.shortlistedAt && (
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">Shortlisted</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(applicant.shortlistedAt).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                )}
                {applicant.acceptedAt && (
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">Accepted</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(applicant.acceptedAt).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Resume & Interview Recording */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {applicant.resumeUrl && (
              <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                    <FileText className="w-5 h-5" />
                    Resume
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.open(applicant.resumeUrl, "_blank")}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    View Resume
                  </Button>
                </CardContent>
              </Card>
            )}

            {applicant.interviewRecordingUrl && (
              <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                    <Play className="w-5 h-5" />
                    Interview Recording
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.open(applicant.interviewRecordingUrl, "_blank")}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Watch Recording
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
