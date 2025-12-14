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
  FileText,
  Loader2,
  Play,
  User,
  AlertTriangle,
  TrendingUp,
  Brain,
  MessageSquare,
  Target,
  Shield,
  Award,
  Flag,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { HLSVideoPlayer } from "@/components/HLSVideoPlayer";

// Helper functions for structured profile rendering
const getFitScoreColor = (fit: string) => {
  switch (fit?.toUpperCase()) {
    case 'EXCELLENT': return 'bg-green-500';
    case 'GOOD': return 'bg-primary';
    case 'FAIR': return 'bg-yellow-500';
    case 'POOR': return 'bg-orange-500';
    case 'NOT_FIT': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
};

const getVerdictColor = (decision: string) => {
  switch (decision?.toUpperCase()) {
    case 'INTERVIEW': return 'bg-green-500 text-white border-green-600';
    case 'CONSIDER': return 'bg-primary text-white border-primary';
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
  if (score >= 60) return 'text-primary dark:text-blue-400';
  if (score >= 40) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
};

export default function ApplicantDetailsPage() {
  const { applicantId } = useParams<{ applicantId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Single query to fetch all applicant data including interview video URL
  const { data: applicant, isLoading } = useQuery<any>({
    queryKey: ["/api/applicants/detail", applicantId],
    queryFn: async () => {
      const response = await fetch(`/api/applicants/detail/${applicantId}`);
      if (!response.ok) throw new Error("Failed to fetch applicant");
      return response.json();
    },
  });

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
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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

  // Extract profile data from the detail endpoint response
  const profile = applicant.brutallyHonestProfile;
  const execSummary = profile?.executive_summary;
  const interviewMeta = profile?.interview_metadata;
  const transcript = profile?.transcript_analysis;
  const overallQuality = transcript?.overall_quality;
  const hiringGuidance = profile?.hiring_guidance;
  const cognitivePatterns = profile?.cognitive_patterns;
  const linguisticPatterns = profile?.linguistic_patterns;
  const redFlags = profile?.red_flags_detected;
  const greenFlags = profile?.green_flags_detected;
  const strongestResponses = profile?.strongest_responses;
  const weakestResponses = profile?.weakest_responses;
  const topicsWellCovered = profile?.topics_well_covered;
  const topicsAvoidedOrWeak = profile?.topics_avoided_or_weak;
  const omissionsAnalysis = profile?.omissions_analysis;
  const authenticityAssessment = profile?.authenticity_assessment;
  const assessmentMetadata = profile?.assessment_metadata;
  const fullResponse = applicant.fullResponse;

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
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white text-2xl font-semibold">
              {applicant.firstName?.[0] || applicant.email?.[0]?.toUpperCase() || "A"}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                  {applicant.firstName && applicant.lastName
                    ? `${applicant.firstName} ${applicant.lastName}`
                    : applicant.name || applicant.email}
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
          {/* Basic Info Section */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-gray-600 dark:text-slate-300" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                  {applicant.firstName && applicant.lastName
                    ? `${applicant.firstName} ${applicant.lastName}`
                    : applicant.name || applicant.email}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{applicant.email}</p>
                {applicant.phone && <p className="text-sm text-slate-500 dark:text-slate-400">{applicant.phone}</p>}
              </div>
            </div>
          </div>

          <Separator />

          {/* Interview Video Section */}
          {applicant.interviewVideoUrl && (
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
                      src={applicant.interviewVideoUrl}
                      className="w-full h-full object-contain"
                    />
                  </div>
                </CardContent>
              </Card>
              <Separator />
            </>
          )}

          {/* AI Candidate Analysis */}
          {profile && (
            <div className="space-y-6">
              <h4 className="font-semibold text-xl text-slate-800 dark:text-slate-200">
                AI Candidate Analysis
              </h4>

              {/* Executive Summary Banner */}
              {execSummary && (
                <div className="p-5 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 text-white">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <h5 className="text-lg font-bold mb-1">{profile.candidate_name}</h5>
                      <p className="text-base text-slate-100">{execSummary.one_sentence}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={`text-sm px-3 py-1 ${getFitScoreColor(execSummary.fit_verdict)}`}>
                        {execSummary.fit_verdict?.replace(/_/g, ' ')}
                      </Badge>
                      <Badge className={`text-xs ${getConfidenceColor(execSummary.confidence_in_verdict)}`}>
                        {execSummary.confidence_in_verdict} Confidence
                      </Badge>
                    </div>
                  </div>

                  {execSummary.key_impression && (
                    <p className="text-sm text-slate-300 mb-4 italic">
                      "{execSummary.key_impression}"
                    </p>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 bg-green-900/40 rounded-lg border border-green-700">
                      <div className="text-xs text-green-400 font-semibold mb-1">STANDOUT POSITIVE</div>
                      <div className="text-sm text-green-100">{execSummary.standout_positive || 'None identified'}</div>
                    </div>
                    <div className="p-3 bg-orange-900/40 rounded-lg border border-orange-700">
                      <div className="text-xs text-orange-400 font-semibold mb-1">PRIMARY CONCERN</div>
                      <div className="text-sm text-orange-100">{execSummary.primary_concern || 'None identified'}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Interview Metadata */}
              {interviewMeta && (
                <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-slate-800 dark:text-slate-200">Interview Metadata</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <div className="text-2xl font-bold text-slate-700 dark:text-slate-300">{interviewMeta.exchange_count}</div>
                        <div className="text-xs text-slate-500">Exchanges</div>
                      </div>
                      <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <Badge className={`${
                          interviewMeta.interview_quality === 'EXCELLENT' ? 'bg-green-500' :
                          interviewMeta.interview_quality === 'GOOD' ? 'bg-primary' :
                          interviewMeta.interview_quality === 'ADEQUATE' ? 'bg-yellow-500' :
                          'bg-orange-500'
                        } text-white`}>
                          {interviewMeta.interview_quality}
                        </Badge>
                        <div className="text-xs text-slate-500 mt-1">Quality</div>
                      </div>
                      <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg col-span-2">
                        <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {interviewMeta.avg_response_length_chars} chars avg
                        </div>
                        <div className="text-xs text-slate-500">Response Length</div>
                      </div>
                    </div>
                    {interviewMeta.data_limitations?.length > 0 && (
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
                        <div className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 mb-2">Data Limitations</div>
                        <ul className="space-y-1">
                          {interviewMeta.data_limitations.map((limit: string, i: number) => (
                            <li key={i} className="text-sm text-yellow-800 dark:text-yellow-200 flex items-start gap-2">
                              <span className="text-yellow-500">•</span> {limit}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Hiring Guidance */}
              {hiringGuidance && (
                <Card className="bg-white dark:bg-slate-900 border-2 border-indigo-200 dark:border-indigo-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" /> Hiring Guidance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Badge className={`text-lg px-4 py-2 font-bold ${
                        hiringGuidance.proceed_to_next_round === 'YES' ? 'bg-green-500 text-white' :
                        hiringGuidance.proceed_to_next_round === 'LIKELY' ? 'bg-primary text-white' :
                        hiringGuidance.proceed_to_next_round === 'MAYBE' ? 'bg-yellow-500 text-white' :
                        hiringGuidance.proceed_to_next_round === 'UNLIKELY' ? 'bg-orange-500 text-white' :
                        'bg-red-500 text-white'
                      }`}>
                        {hiringGuidance.proceed_to_next_round === 'YES' ? '✓ PROCEED' :
                         hiringGuidance.proceed_to_next_round === 'LIKELY' ? '↗ LIKELY' :
                         hiringGuidance.proceed_to_next_round === 'MAYBE' ? '? MAYBE' :
                         hiringGuidance.proceed_to_next_round === 'UNLIKELY' ? '↘ UNLIKELY' :
                         '✗ NO'}
                      </Badge>
                      <span className="text-sm text-slate-600 dark:text-slate-400">Next Round</span>
                    </div>

                    {hiringGuidance.reasoning && (
                      <p className="text-sm text-slate-700 dark:text-slate-300 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                        {hiringGuidance.reasoning}
                      </p>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {hiringGuidance.potential_role_fits?.length > 0 && (
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                          <div className="text-xs font-semibold text-green-700 dark:text-green-400 mb-2">Potential Role Fits</div>
                          <div className="flex flex-wrap gap-1">
                            {hiringGuidance.potential_role_fits.map((role: string, i: number) => (
                              <Badge key={i} variant="secondary" className="text-xs">{role}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {hiringGuidance.risk_factors_to_investigate?.length > 0 && (
                        <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-700">
                          <div className="text-xs font-semibold text-orange-700 dark:text-orange-400 mb-2">Risk Factors to Investigate</div>
                          <ul className="space-y-1">
                            {hiringGuidance.risk_factors_to_investigate.map((risk: string, i: number) => (
                              <li key={i} className="text-xs text-orange-800 dark:text-orange-200">• {risk}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {hiringGuidance.interview_tips_for_next_round?.length > 0 && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                        <div className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-2">Interview Tips for Next Round</div>
                        <ul className="space-y-1">
                          {hiringGuidance.interview_tips_for_next_round.map((tip: string, i: number) => (
                            <li key={i} className="text-sm text-blue-800 dark:text-blue-200">• {tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {hiringGuidance.suggested_follow_up_questions?.length > 0 && (
                      <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
                        <div className="text-xs font-semibold text-purple-700 dark:text-purple-400 mb-2">Suggested Follow-up Questions</div>
                        <ul className="space-y-1">
                          {hiringGuidance.suggested_follow_up_questions.map((q: any, i: number) => (
                            <li key={i} className="text-sm text-purple-800 dark:text-purple-200">
                              {typeof q === 'string' ? `• ${q}` : (
                                <>
                                  <span className="font-medium">• {q.question}</span>
                                  {q.purpose && <span className="text-xs text-purple-600 block ml-3">Purpose: {q.purpose}</span>}
                                </>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {hiringGuidance.risk_assessment && (
                      <div className={`p-3 rounded-lg border ${
                        hiringGuidance.risk_assessment.overall_risk === 'LOW' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700' :
                        hiringGuidance.risk_assessment.overall_risk === 'MEDIUM' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700' :
                        hiringGuidance.risk_assessment.overall_risk === 'HIGH' ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700' :
                        'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`text-xs font-semibold ${
                            hiringGuidance.risk_assessment.overall_risk === 'LOW' ? 'text-green-700 dark:text-green-400' :
                            hiringGuidance.risk_assessment.overall_risk === 'MEDIUM' ? 'text-yellow-700 dark:text-yellow-400' :
                            hiringGuidance.risk_assessment.overall_risk === 'HIGH' ? 'text-orange-700 dark:text-orange-400' :
                            'text-red-700 dark:text-red-400'
                          }`}>
                            Risk Assessment
                          </div>
                          <Badge className={`text-xs ${
                            hiringGuidance.risk_assessment.overall_risk === 'LOW' ? 'bg-green-500 text-white' :
                            hiringGuidance.risk_assessment.overall_risk === 'MEDIUM' ? 'bg-yellow-500 text-white' :
                            hiringGuidance.risk_assessment.overall_risk === 'HIGH' ? 'bg-orange-500 text-white' :
                            'bg-red-500 text-white'
                          }`}>
                            {hiringGuidance.risk_assessment.overall_risk}
                          </Badge>
                        </div>
                        {hiringGuidance.risk_assessment.risk_factors?.length > 0 && (
                          <ul className="space-y-2">
                            {hiringGuidance.risk_assessment.risk_factors.map((risk: any, i: number) => (
                              <li key={i} className="text-xs">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className={`text-xs ${
                                    risk.severity === 'HIGH' ? 'border-red-500 text-red-700' :
                                    risk.severity === 'MEDIUM' ? 'border-yellow-500 text-yellow-700' :
                                    'border-green-500 text-green-700'
                                  }`}>
                                    {risk.severity}
                                  </Badge>
                                  <span className="font-medium text-slate-700 dark:text-slate-300">{risk.factor}</span>
                                </div>
                                {risk.mitigation && (
                                  <p className="text-xs text-slate-500 ml-14 mt-1">Mitigation: {risk.mitigation}</p>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                    {hiringGuidance.verification_needed?.length > 0 && (
                      <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="text-xs font-semibold text-slate-700 dark:text-slate-400 mb-2">Verification Needed (References/Background)</div>
                        <ul className="space-y-1">
                          {hiringGuidance.verification_needed.map((item: string, i: number) => (
                            <li key={i} className="text-xs text-slate-600 dark:text-slate-300">• {item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {hiringGuidance.roles_to_avoid?.length > 0 && (
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700">
                        <div className="text-xs font-semibold text-red-700 dark:text-red-400 mb-2">Roles to Avoid</div>
                        <div className="flex flex-wrap gap-1">
                          {hiringGuidance.roles_to_avoid.map((role: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs border-red-300 text-red-700">{role}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Interview Quality & Linguistic Patterns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {overallQuality && (
                  <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-slate-800 dark:text-slate-200">Interview Quality Assessment</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded text-center">
                          <div className="text-xs text-slate-500">Depth</div>
                          <Badge variant="outline" className="mt-1">{overallQuality.depth_rating}</Badge>
                        </div>
                        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded text-center">
                          <div className="text-xs text-slate-500">Structure</div>
                          <Badge variant="outline" className="mt-1">{overallQuality.structure_rating}</Badge>
                        </div>
                        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded text-center">
                          <div className="text-xs text-slate-500">Engagement</div>
                          <Badge variant="outline" className="mt-1">{overallQuality.engagement_rating}</Badge>
                        </div>
                        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded text-center">
                          <div className="text-xs text-slate-500">Specificity</div>
                          <Badge variant="outline" className="mt-1">{overallQuality.specificity_rating}</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {linguisticPatterns && (
                  <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-slate-800 dark:text-slate-200">Linguistic Patterns</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-500">Ownership Pattern:</span>
                        <Badge variant="outline">{linguisticPatterns.ownership_pattern}</Badge>
                      </div>
                      {linguisticPatterns.ownership_evidence && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 italic">
                          "{linguisticPatterns.ownership_evidence}"
                        </p>
                      )}
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded">
                          <div className="text-xs text-green-600 font-semibold">Confidence Markers: {linguisticPatterns.confidence_markers_count}</div>
                          {linguisticPatterns.confidence_examples?.map((ex: string, i: number) => (
                            <div key={i} className="text-xs text-green-700 italic">"{ex}"</div>
                          ))}
                        </div>
                        <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded">
                          <div className="text-xs text-orange-600 font-semibold">Uncertainty Markers: {linguisticPatterns.uncertainty_markers_count}</div>
                          {linguisticPatterns.uncertainty_examples?.map((ex: string, i: number) => (
                            <div key={i} className="text-xs text-orange-700 italic">"{ex}"</div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Response-by-Response Micro Analysis */}
              {transcript?.response_by_response?.length > 0 && (
                <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" /> Response-by-Response Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {transcript.response_by_response.map((resp: any, i: number) => (
                        <div key={i} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">Q{resp.question_number}</Badge>
                              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{resp.topic || 'General'}</span>
                            </div>
                            <div className="flex gap-1">
                              <Badge className={`text-xs ${
                                resp.quality === 'EXCELLENT' ? 'bg-green-500' :
                                resp.quality === 'GOOD' ? 'bg-primary' :
                                resp.quality === 'ADEQUATE' ? 'bg-yellow-500' :
                                'bg-orange-500'
                              } text-white`}>
                                {resp.quality}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{resp.question}</p>
                          <p className="text-xs text-slate-500 italic mb-2">Analysis: {resp.micro_analysis}</p>
                          {resp.flags?.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {resp.flags.map((flag: string, j: number) => (
                                <Badge key={j} variant="outline" className="text-xs">{flag}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Cognitive Patterns */}
              {cognitivePatterns && (
                <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <Brain className="h-4 w-4" /> Cognitive Patterns
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="text-xs text-primary font-semibold mb-1">Thinking Style</div>
                        <Badge variant="outline">{cognitivePatterns.thinking_style}</Badge>
                        {cognitivePatterns.thinking_style_evidence && (
                          <p className="text-xs text-blue-700 mt-2 italic">"{cognitivePatterns.thinking_style_evidence}"</p>
                        )}
                      </div>
                      <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <div className="text-xs text-purple-600 font-semibold mb-1">Systems Thinking</div>
                        <Badge variant="outline">{cognitivePatterns.systems_thinking_level}</Badge>
                      </div>
                      <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                        <div className="text-xs text-indigo-600 font-semibold mb-1">Problem Solving</div>
                        <Badge variant="outline">{cognitivePatterns.problem_solving_approach}</Badge>
                      </div>
                    </div>
                    {cognitivePatterns.learning_indicators?.length > 0 && (
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="text-xs text-green-600 font-semibold mb-2">Learning Indicators</div>
                        <div className="flex flex-wrap gap-1">
                          {cognitivePatterns.learning_indicators.map((indicator: string, i: number) => (
                            <Badge key={i} variant="secondary" className="text-xs">{indicator}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Topics Coverage */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {topicsWellCovered?.length > 0 && (
                  <Card className="bg-white dark:bg-slate-900 border border-green-200 dark:border-green-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-green-700 dark:text-green-400 flex items-center gap-2">
                        <Award className="h-4 w-4" /> Topics Well Covered
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {topicsWellCovered.map((topic: any, i: number) => (
                          <li key={i} className="p-2 bg-green-50 dark:bg-green-900/20 rounded">
                            <div className="text-sm font-medium text-green-900 dark:text-green-100">{topic.topic}</div>
                            <p className="text-xs text-green-700 dark:text-green-300 mt-1">{topic.why_strong}</p>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {topicsAvoidedOrWeak?.length > 0 && (
                  <Card className="bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-orange-700 dark:text-orange-400 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" /> Topics Avoided/Weak
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {topicsAvoidedOrWeak.map((topic: any, i: number) => (
                          <li key={i} className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded">
                            <div className="text-sm font-medium text-orange-900 dark:text-orange-100">{topic.topic}</div>
                            <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">{topic.evidence}</p>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Strongest & Weakest Responses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {strongestResponses?.length > 0 && (
                  <Card className="bg-white dark:bg-slate-900 border border-green-200 dark:border-green-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-green-700 dark:text-green-400">Strongest Responses</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {strongestResponses.map((resp: any, i: number) => (
                          <li key={i} className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <div className="text-sm font-medium text-green-900 dark:text-green-100 mb-1">{resp.question_topic}</div>
                            <p className="text-xs text-green-700 dark:text-green-300">{resp.why_strong}</p>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {weakestResponses?.length > 0 && (
                  <Card className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-red-700 dark:text-red-400">Weakest Responses</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {weakestResponses.map((resp: any, i: number) => (
                          <li key={i} className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                            <div className="text-sm font-medium text-red-900 dark:text-red-100 mb-1">{resp.question_topic}</div>
                            <p className="text-xs text-red-700 dark:text-red-300">{resp.why_weak}</p>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Red Flags & Green Flags */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {redFlags?.length > 0 && (
                  <Card className="bg-white dark:bg-slate-900 border-2 border-red-300 dark:border-red-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-red-700 dark:text-red-400 flex items-center gap-2">
                        <Flag className="h-4 w-4" /> Red Flags Detected
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {redFlags.map((flag: any, i: number) => (
                          <li key={i} className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700">
                            <div className="flex items-start gap-2">
                              <Badge className={`text-xs ${getRiskColor(flag.severity)}`}>{flag.severity}</Badge>
                              <div className="flex-1">
                                <div className="text-sm font-medium text-red-900 dark:text-red-100">{flag.flag}</div>
                                <p className="text-xs text-red-700 dark:text-red-300 mt-1">{flag.evidence}</p>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {greenFlags?.length > 0 && (
                  <Card className="bg-white dark:bg-slate-900 border-2 border-green-300 dark:border-green-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-green-700 dark:text-green-400 flex items-center gap-2">
                        <Flag className="h-4 w-4" /> Green Flags Detected
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {greenFlags.map((flag: any, i: number) => (
                          <li key={i} className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                            <div className="text-sm font-medium text-green-900 dark:text-green-100">{flag.flag}</div>
                            <p className="text-xs text-green-700 dark:text-green-300 mt-1">{flag.evidence}</p>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Omissions Analysis */}
              {omissionsAnalysis && (
                <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-slate-800 dark:text-slate-200">Omissions Analysis</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {omissionsAnalysis.expected_but_missing?.length > 0 && (
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
                        <div className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 mb-2">Expected but Missing</div>
                        <ul className="space-y-1">
                          {omissionsAnalysis.expected_but_missing.map((item: string, i: number) => (
                            <li key={i} className="text-sm text-yellow-800 dark:text-yellow-200">• {item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {omissionsAnalysis.suspicious_gaps?.length > 0 && (
                      <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-700">
                        <div className="text-xs font-semibold text-orange-700 dark:text-orange-400 mb-2">Suspicious Gaps</div>
                        <ul className="space-y-1">
                          {omissionsAnalysis.suspicious_gaps.map((gap: string, i: number) => (
                            <li key={i} className="text-sm text-orange-800 dark:text-orange-200">• {gap}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Authenticity Assessment */}
              {authenticityAssessment && (
                <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <Shield className="h-4 w-4" /> Authenticity Assessment
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Authenticity Score:</span>
                      <Badge className={`text-sm ${
                        authenticityAssessment.authenticity_score >= 80 ? 'bg-green-500' :
                        authenticityAssessment.authenticity_score >= 60 ? 'bg-primary' :
                        authenticityAssessment.authenticity_score >= 40 ? 'bg-yellow-500' :
                        'bg-red-500'
                      } text-white`}>
                        {authenticityAssessment.authenticity_score}%
                      </Badge>
                    </div>
                    {authenticityAssessment.genuine_indicators?.length > 0 && (
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="text-xs font-semibold text-green-700 dark:text-green-400 mb-2">Genuine Indicators</div>
                        <ul className="space-y-1">
                          {authenticityAssessment.genuine_indicators.map((indicator: string, i: number) => (
                            <li key={i} className="text-xs text-green-700 dark:text-green-300">• {indicator}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {authenticityAssessment.coaching_indicators?.length > 0 && (
                      <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                        <div className="text-xs font-semibold text-orange-700 dark:text-orange-400 mb-2">Coaching Indicators</div>
                        <ul className="space-y-1">
                          {authenticityAssessment.coaching_indicators.map((indicator: string, i: number) => (
                            <li key={i} className="text-xs text-orange-700 dark:text-orange-300">• {indicator}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Assessment Metadata */}
              {assessmentMetadata && (
                <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-slate-800 dark:text-slate-200">Assessment Metadata</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500">Analysis Confidence:</span>
                      <Badge className={getConfidenceColor(assessmentMetadata.analysis_confidence)}>{assessmentMetadata.analysis_confidence}</Badge>
                    </div>
                    {assessmentMetadata.caveats?.length > 0 && (
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <div className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 mb-2">Caveats</div>
                        <ul className="space-y-1">
                          {assessmentMetadata.caveats.map((caveat: string, i: number) => (
                            <li key={i} className="text-xs text-yellow-700 dark:text-yellow-300">• {caveat}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {assessmentMetadata.data_gaps?.length > 0 && (
                      <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <div className="text-xs font-semibold text-slate-700 dark:text-slate-400 mb-2">Data Gaps</div>
                        <ul className="space-y-1">
                          {assessmentMetadata.data_gaps.map((gap: string, i: number) => (
                            <li key={i} className="text-xs text-slate-600 dark:text-slate-300">• {gap}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Resume/CV Full Response Analysis */}
          {fullResponse && (
            <>
              <Separator />
              <div className="space-y-6">
                <h4 className="font-semibold text-xl text-slate-800 dark:text-slate-200">
                  Resume & CV Analysis
                </h4>

                {fullResponse.executiveSummary && (
                  <div className="p-5 rounded-xl bg-gradient-to-r from-indigo-900 to-purple-900 text-white">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <h5 className="text-lg font-bold mb-1">Executive Summary</h5>
                        <p className="text-base text-indigo-100">{fullResponse.executiveSummary.summary}</p>
                      </div>
                      {fullResponse.executiveSummary.verdict && (
                        <Badge className={`text-sm px-3 py-1 ${getVerdictColor(fullResponse.executiveSummary.verdict.decision)}`}>
                          {fullResponse.executiveSummary.verdict.decision}
                        </Badge>
                      )}
                    </div>
                    {fullResponse.executiveSummary.verdict?.reasoning && (
                      <p className="text-sm text-indigo-200 italic">
                        {fullResponse.executiveSummary.verdict.reasoning}
                      </p>
                    )}
                  </div>
                )}

                {fullResponse.skillAnalysis && (
                  <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-slate-800 dark:text-slate-200">Skill Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {fullResponse.skillAnalysis.overallScore !== undefined && (
                          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                            <span className="font-medium text-slate-700 dark:text-slate-300">Overall Skill Score</span>
                            <div className="flex items-center gap-2">
                              <Progress value={fullResponse.skillAnalysis.overallScore} className="w-24" />
                              <span className={`font-bold ${getScoreColor(fullResponse.skillAnalysis.overallScore)}`}>
                                {fullResponse.skillAnalysis.overallScore}%
                              </span>
                            </div>
                          </div>
                        )}
                        {fullResponse.skillAnalysis.breakdown?.length > 0 && (
                          <div className="space-y-2">
                            <div className="text-sm font-semibold text-slate-700 dark:text-slate-400">Breakdown</div>
                            {fullResponse.skillAnalysis.breakdown.map((item: any, i: number) => (
                              <div key={i} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded">
                                <span className="text-sm text-slate-600 dark:text-slate-400">{item.skill}</span>
                                <Badge variant="secondary">{item.level || item.score}</Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {fullResponse.experienceAnalysis && (
                  <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-slate-800 dark:text-slate-200">Experience Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {fullResponse.experienceAnalysis.summary && (
                          <p className="text-sm text-slate-600 dark:text-slate-400">{fullResponse.experienceAnalysis.summary}</p>
                        )}
                        {fullResponse.experienceAnalysis.score !== undefined && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-500">Score:</span>
                            <span className={`font-bold ${getScoreColor(fullResponse.experienceAnalysis.score)}`}>
                              {fullResponse.experienceAnalysis.score}%
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {fullResponse.interviewRecommendations && (
                  <Card className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-indigo-700 dark:text-indigo-400">Interview Recommendations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {fullResponse.interviewRecommendations.areasToProbe?.length > 0 && (
                          <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                            <div className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 mb-2">Areas to Probe</div>
                            <ul className="space-y-1">
                              {fullResponse.interviewRecommendations.areasToProbe.map((area: string, i: number) => (
                                <li key={i} className="text-sm text-indigo-800 dark:text-indigo-200">• {area}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {fullResponse.interviewRecommendations.suggestedQuestions?.length > 0 && (
                          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                            <div className="text-xs font-semibold text-purple-700 dark:text-purple-400 mb-2">Suggested Questions</div>
                            <ul className="space-y-1">
                              {fullResponse.interviewRecommendations.suggestedQuestions.map((q: string, i: number) => (
                                <li key={i} className="text-sm text-purple-800 dark:text-purple-200">• {q}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
