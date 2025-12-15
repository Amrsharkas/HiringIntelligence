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
  ClipboardCheck,
  Heart,
  Eye,
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

// Enhanced score visualization helpers
const getScoreColor = (score: number) => {
  if (score >= 85) return {
    bg: 'bg-emerald-500',
    light: 'bg-emerald-50 dark:bg-emerald-900/20',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-700',
    progress: 'bg-emerald-500',
    label: 'Outstanding'
  };
  if (score >= 70) return {
    bg: 'bg-blue-500',
    light: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-700',
    progress: 'bg-blue-500',
    label: 'Strong'
  };
  if (score >= 55) return {
    bg: 'bg-amber-500',
    light: 'bg-amber-50 dark:bg-amber-900/20',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-700',
    progress: 'bg-amber-500',
    label: 'Good'
  };
  if (score >= 40) return {
    bg: 'bg-orange-500',
    light: 'bg-orange-50 dark:bg-orange-900/20',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-200 dark:border-orange-700',
    progress: 'bg-orange-500',
    label: 'Fair'
  };
  return {
    bg: 'bg-red-500',
    light: 'bg-red-50 dark:bg-red-900/20',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-700',
    progress: 'bg-red-500',
    label: 'Needs Work'
  };
};

const getScoreRingColor = (score: number) => {
  if (score >= 85) return 'stroke-emerald-500';
  if (score >= 70) return 'stroke-blue-500';
  if (score >= 55) return 'stroke-amber-500';
  if (score >= 40) return 'stroke-orange-500';
  return 'stroke-red-500';
};

// Enhanced score component
const ScoreRing = ({ score, size = 60, strokeWidth = 4, label }: { score: number; size?: number; strokeWidth?: number; label?: string }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;
  const colors = getScoreColor(score);

  return (
    <div className="relative inline-flex flex-col items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-200 dark:text-gray-700"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={getScoreRingColor(score)}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-lg font-bold ${colors.text}`}>{score}</span>
        {label && <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>}
      </div>
    </div>
  );
};

// Score bar component
const ScoreBar = ({ score, label, showLabel = true }: { score: number; label: string; showLabel?: boolean }) => {
  const colors = getScoreColor(score);

  return (
    <div className="space-y-2">
      {showLabel && (
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold ${colors.text}`}>{score}/100</span>
            <Badge className={`text-xs ${colors.bg} text-white`}>
              {colors.label}
            </Badge>
          </div>
        </div>
      )}
      <div className="relative">
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ease-out ${colors.progress}`}
            style={{ width: `${score}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-gray-500">0</span>
          <span className="text-xs text-gray-500">100</span>
        </div>
      </div>
    </div>
  );
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

  // Single query to fetch all applicant data including interview video URL and transcription
  const { data: applicant, isLoading } = useQuery<any>({
    queryKey: ["/api/applicants/detail", applicantId],
    queryFn: async () => {
      const response = await fetch(`/api/applicants/detail/${applicantId}`);
      if (!response.ok) throw new Error("Failed to fetch applicant");
      return response.json();
    },
  });

  // Extract transcription data from the applicant
  const interviewTranscription = applicant?.interviewTranscription;

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

  // Extract profile data from the V6 structure
  const profile = applicant.brutallyHonestProfile;

  // V6 specific fields
  const execSummary = profile?.executive_summary;
  const interviewMeta = profile?.interview_metadata;

  // V6 new assessment dimensions
  const linguisticAnalysis = profile?.linguistic_analysis;
  const technicalMastery = profile?.technical_mastery;
  const problemSolvingCapability = profile?.problem_solving_capability;
  const communicationExcellence = profile?.communication_excellence;
  const leadershipPotential = profile?.leadership_potential;
  const culturalAlignment = profile?.cultural_alignment;
  const learningAgility = profile?.learning_agility;
  const emotionalIntelligence = profile?.emotional_intelligence;

  // V7 enhanced assessment dimensions
  const psycholinguisticAnalysis = profile?.psycholinguistic_analysis;
  const technicalPhilosophy = profile?.technical_philosophy;
  const leadershipDynamics = profile?.leadership_dynamics;
  const adaptabilityResilience = profile?.adaptability_resilience;

  // V6 behavioral indicators
  const behavioralIndicators = profile?.behavioral_indicators;
  const redFlags = behavioralIndicators?.red_flags || [];
  const greenFlags = behavioralIndicators?.strengths?.filter((s: any) => s.impact_level === 'HIGH') || [];

  // V6 skill taxonomy mapping
  const skillTaxonomyMapping = profile?.skill_taxonomy_mapping;

  // V6 predictive assessment
  const predictiveAssessment = profile?.predictive_assessment;

  // V6 hiring recommendation
  const hiringRecommendation = profile?.hiring_recommendation;

  // V6 follow-up questions
  const followUpQuestions = profile?.follow_up_questions;

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

          {/* Interview Video and Transcription Section */}
          {applicant.interviewVideoUrl && (
            <>
              <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                    <Play className="w-5 h-5" />
                    Interview Recording & Transcription
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Video Player */}
                    <div>
                      <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Video Recording</h4>
                      <div className="aspect-video bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                        <HLSVideoPlayer
                          src={applicant.interviewVideoUrl}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>

                    {/* Transcription */}
                    <div>
                      <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Interview Transcription
                      </h4>
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 h-[calc(100%-3rem)] overflow-y-auto max-h-96 lg:max-h-none">
                        {interviewTranscription ? (
                          <div className="space-y-3">
                            {(() => {
                              // Handle different transcription formats
                              if (interviewTranscription.questions && interviewTranscription.responses) {
                                // Session format with questions and responses arrays
                                const elements = [];
                                const questions = interviewTranscription.questions || [];
                                const responses = interviewTranscription.responses || [];

                                for (let i = 0; i < Math.max(questions.length, responses.length); i++) {
                                  if (questions[i]) {
                                    elements.push(
                                      <div key={`q-${i}`} className="border-l-2 border-blue-200 pl-3 py-2">
                                        <div className="flex items-start gap-2">
                                          <span className="text-xs font-medium text-blue-600 dark:text-blue-400 min-w-[80px]">
                                            Interviewer:
                                          </span>
                                          <p className="text-sm text-slate-700 dark:text-slate-300 flex-1">
                                            {questions[i].question}
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  }

                                  if (responses[i]) {
                                    elements.push(
                                      <div key={`r-${i}`} className="border-l-2 border-green-200 pl-3 py-2 ml-4">
                                        <div className="flex items-start gap-2">
                                          <span className="text-xs font-medium text-green-600 dark:text-green-400 min-w-[80px]">
                                            Candidate:
                                          </span>
                                          <p className="text-sm text-slate-700 dark:text-slate-300 flex-1">
                                            {responses[i].content}
                                          </p>
                                        </div>
                                        {responses[i].timestamp && (
                                          <span className="text-xs text-slate-400 ml-[92px] block">
                                            {new Date(responses[i].timestamp).toLocaleTimeString()}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  }
                                }
                                return elements;
                              } else if (Array.isArray(interviewTranscription)) {
                                // Simple array format
                                return interviewTranscription.map((item: any, index: number) => (
                                  <div key={index} className={`border-l-2 pl-3 py-1 ${
                                    item.role === 'assistant' ? 'border-blue-200' : 'border-green-200'
                                  }`}>
                                    <div className="flex items-start gap-2">
                                      <span className={`text-xs font-medium min-w-[80px] ${
                                        item.role === 'assistant'
                                          ? 'text-blue-600 dark:text-blue-400'
                                          : 'text-green-600 dark:text-green-400'
                                      }`}>
                                        {item.role === 'assistant' ? 'Interviewer' : 'Candidate'}:
                                      </span>
                                      <p className="text-sm text-slate-700 dark:text-slate-300 flex-1">
                                        {item.content}
                                      </p>
                                    </div>
                                    {item.timestamp && (
                                      <span className="text-xs text-slate-400 ml-[92px] block">
                                        {new Date(item.timestamp).toLocaleTimeString()}
                                      </span>
                                    )}
                                  </div>
                                ));
                              } else if (typeof interviewTranscription === 'string') {
                                // Plain string format
                                return (
                                  <div className="border-l-2 border-slate-200 pl-3 py-2">
                                    <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                                      {interviewTranscription}
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500 italic">
                            Transcription not available for this interview.
                          </p>
                        )}
                      </div>
                    </div>
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
                      <p className="text-base text-slate-100">{execSummary.unique_value_proposition || 'No unique value proposition identified'}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={`text-lg px-4 py-2 font-bold ${getVerdictColor(execSummary.overall_verdict)}`}>
                        {execSummary.overall_verdict?.replace(/_/g, ' ')}
                      </Badge>
                      <Badge className="text-xs bg-blue-500 text-white">
                        Level: {execSummary.core_competency_level}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                    <div className="p-3 bg-green-900/40 rounded-lg border border-green-700 text-center">
                      <div className="text-xs text-green-400 font-semibold mb-1">SUCCESS PROBABILITY</div>
                      <div className="text-lg font-bold text-green-100">{execSummary.success_probability || 0}%</div>
                    </div>
                    <div className="p-3 bg-blue-900/40 rounded-lg border border-blue-700 text-center">
                      <div className="text-xs text-blue-400 font-semibold mb-1">ROLE FIT SCORE</div>
                      <div className="text-lg font-bold text-blue-100">{execSummary.role_fit_score || 0}/100</div>
                    </div>
                    <div className="p-3 bg-purple-900/40 rounded-lg border border-purple-700 text-center">
                      <div className="text-xs text-purple-400 font-semibold mb-1">TEAM COMPATIBILITY</div>
                      <div className="text-sm font-bold text-purple-100">{execSummary.team_compatibility?.replace(/_/g, ' ')}</div>
                    </div>
                  </div>

                  {execSummary.primary_hiring_risks && (
                    <div className="p-3 bg-orange-900/40 rounded-lg border border-orange-700">
                      <div className="text-xs text-orange-400 font-semibold mb-2">PRIMARY HIRING RISKS</div>
                      <p className="text-sm text-orange-100">{execSummary.primary_hiring_risks}</p>
                    </div>
                  )}
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

              {/* V6 Hiring Recommendation */}
              {hiringRecommendation && (
                <Card className="bg-white dark:bg-slate-900 border-2 border-indigo-200 dark:border-indigo-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" /> Hiring Recommendation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Badge className={`text-lg px-4 py-2 font-bold ${getVerdictColor(hiringRecommendation.recommendation)}`}>
                        {hiringRecommendation.recommendation?.replace(/_/g, ' ')}
                      </Badge>
                      <Badge className="text-xs bg-blue-500 text-white">
                        {hiringRecommendation.confidence_level} Confidence
                      </Badge>
                    </div>

                    {hiringRecommendation.key_success_factors?.length > 0 && (
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                        <div className="text-xs font-semibold text-green-700 dark:text-green-400 mb-2">Key Success Factors</div>
                        <ul className="space-y-1">
                          {hiringRecommendation.key_success_factors.map((factor: string, i: number) => (
                            <li key={i} className="text-sm text-green-800 dark:text-green-200">• {factor}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {hiringRecommendation.mitigation_strategies?.length > 0 && (
                      <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-700">
                        <div className="text-xs font-semibold text-orange-700 dark:text-orange-400 mb-2">Mitigation Strategies</div>
                        <ul className="space-y-1">
                          {hiringRecommendation.mitigation_strategies.map((strategy: string, i: number) => (
                            <li key={i} className="text-sm text-orange-800 dark:text-orange-200">• {strategy}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {hiringRecommendation.onboarding_recommendations && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                          <div className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-2">Onboarding Strategy</div>
                          <div className="space-y-2">
                            {hiringRecommendation.onboarding_recommendations.first_week_priorities?.length > 0 && (
                              <div>
                                <span className="text-xs font-medium text-blue-600 dark:text-blue-300">First Week:</span>
                                <ul className="space-y-1 ml-2">
                                  {hiringRecommendation.onboarding_recommendations.first_week_priorities.map((rec: string, i: number) => (
                                    <li key={i} className="text-xs text-blue-800 dark:text-blue-200">• {rec}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {hiringRecommendation.onboarding_recommendations.first_month_goals?.length > 0 && (
                              <div>
                                <span className="text-xs font-medium text-blue-600 dark:text-blue-300">First Month:</span>
                                <ul className="space-y-1 ml-2">
                                  {hiringRecommendation.onboarding_recommendations.first_month_goals.map((goal: string, i: number) => (
                                    <li key={i} className="text-xs text-blue-800 dark:text-blue-200">• {goal}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {hiringRecommendation.growth_path && (
                        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
                          <div className="text-xs font-semibold text-purple-700 dark:text-purple-400 mb-2">Growth Trajectory</div>
                          <div className="space-y-2">
                            <div>
                              <span className="text-xs font-medium text-purple-600 dark:text-purple-300">12 Months:</span>
                              <p className="text-xs text-purple-800 dark:text-purple-200">{hiringRecommendation.growth_path.trajectory_12_months}</p>
                            </div>
                            <div>
                              <span className="text-xs font-medium text-purple-600 dark:text-purple-300">3 Years:</span>
                              <p className="text-xs text-purple-800 dark:text-purple-200">{hiringRecommendation.growth_path.trajectory_3_years}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Additional Hiring Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {hiringRecommendation.decision_urgency && (
                        <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                          <div className="text-xs font-semibold text-orange-700 dark:text-orange-400 mb-1">Decision Urgency</div>
                          <Badge className={`text-xs ${
                            hiringRecommendation.decision_urgency === 'HIGH' ? 'bg-red-500' :
                            hiringRecommendation.decision_urgency === 'MEDIUM' ? 'bg-yellow-500' :
                            'bg-green-500'
                          } text-white`}>
                            {hiringRecommendation.decision_urgency}
                          </Badge>
                        </div>
                      )}
                      {hiringRecommendation.offer_readiness && (
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                          <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">Offer Readiness</div>
                          <Badge className={`text-xs ${
                            hiringRecommendation.offer_readiness === 'IMMEDIATE' ? 'bg-green-500' :
                            hiringRecommendation.offer_readiness === 'NEXT_ROUND' ? 'bg-yellow-500' :
                            'bg-orange-500'
                          } text-white`}>
                            {hiringRecommendation.offer_readiness.replace('_', ' ')}
                          </Badge>
                        </div>
                      )}
                      {hiringRecommendation.compensation_analysis && (
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                          <div className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Value Score</div>
                          <div className="text-lg font-bold text-amber-800 dark:text-amber-300">
                            {hiringRecommendation.compensation_analysis.total_value_score}/100
                          </div>
                        </div>
                      )}
                    </div>

                    {hiringRecommendation.team_integration_strategy && (
                      <div className="p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg border border-cyan-200 dark:border-cyan-700">
                        <div className="text-xs font-semibold text-cyan-700 dark:text-cyan-400 mb-2">Team Integration Strategy</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <span className="text-xs font-medium text-cyan-600 dark:text-cyan-300">Optimal Team Placement:</span>
                            <p className="text-xs text-cyan-800 dark:text-cyan-200">{hiringRecommendation.team_integration_strategy.optimal_team_placement}</p>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-cyan-600 dark:text-cyan-300">Reporting Structure:</span>
                            <p className="text-xs text-cyan-800 dark:text-cyan-200">{hiringRecommendation.team_integration_strategy.reporting_structure_preference}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {hiringRecommendation.interview_rounds_needed && (
                      <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="text-xs font-semibold text-slate-700 dark:text-slate-400 mb-2">Additional Interview Rounds Needed</div>
                        <p className="text-sm text-slate-600 dark:text-slate-300">{hiringRecommendation.interview_rounds_needed}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* V6 Assessment Dimensions Overview - Redesigned */}
              <div className="space-y-6">
                {/* Primary Core Scores with Ring Visualization */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {technicalMastery && (
                    <Card className={`bg-white dark:bg-slate-900 border-2 ${getScoreColor(technicalMastery.score).border} hover:shadow-lg transition-shadow`}>
                      <CardContent className="p-6 text-center">
                        <ScoreRing score={technicalMastery.score} size={80} label="Tech" />
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-3">Technical Mastery</h4>
                        <Badge className={`text-xs mt-2 ${getScoreColor(technicalMastery.score).bg} text-white`}>
                          {getScoreColor(technicalMastery.score).label}
                        </Badge>
                      </CardContent>
                    </Card>
                  )}
                  {problemSolvingCapability && (
                    <Card className={`bg-white dark:bg-slate-900 border-2 ${getScoreColor(problemSolvingCapability.score).border} hover:shadow-lg transition-shadow`}>
                      <CardContent className="p-6 text-center">
                        <ScoreRing score={problemSolvingCapability.score} size={80} label="Solve" />
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-3">Problem Solving</h4>
                        <Badge className={`text-xs mt-2 ${getScoreColor(problemSolvingCapability.score).bg} text-white`}>
                          {getScoreColor(problemSolvingCapability.score).label}
                        </Badge>
                      </CardContent>
                    </Card>
                  )}
                  {communicationExcellence && (
                    <Card className={`bg-white dark:bg-slate-900 border-2 ${getScoreColor(communicationExcellence.score).border} hover:shadow-lg transition-shadow`}>
                      <CardContent className="p-6 text-center">
                        <ScoreRing score={communicationExcellence.score} size={80} label="Comm" />
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-3">Communication</h4>
                        <Badge className={`text-xs mt-2 ${getScoreColor(communicationExcellence.score).bg} text-white`}>
                          {getScoreColor(communicationExcellence.score).label}
                        </Badge>
                      </CardContent>
                    </Card>
                  )}
                  {leadershipPotential && (
                    <Card className={`bg-white dark:bg-slate-900 border-2 ${getScoreColor(leadershipPotential.score).border} hover:shadow-lg transition-shadow`}>
                      <CardContent className="p-6 text-center">
                        <ScoreRing score={leadershipPotential.score} size={80} label="Lead" />
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-3">Leadership</h4>
                        <Badge className={`text-xs mt-2 ${getScoreColor(leadershipPotential.score).bg} text-white`}>
                          {getScoreColor(leadershipPotential.score).label}
                        </Badge>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Secondary Assessment Bars */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {culturalAlignment && (
                    <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                      <CardContent className="p-4">
                        <ScoreBar score={culturalAlignment.score} label="Cultural Alignment" />
                      </CardContent>
                    </Card>
                  )}
                  {learningAgility && (
                    <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                      <CardContent className="p-4">
                        <ScoreBar score={learningAgility.score} label="Learning Agility" />
                      </CardContent>
                    </Card>
                  )}
                  {emotionalIntelligence && (
                    <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                      <CardContent className="p-4">
                        <ScoreBar score={emotionalIntelligence.score} label="Emotional Intelligence" />
                      </CardContent>
                    </Card>
                  )}
                  {linguisticAnalysis?.cognitive_complexity && (
                    <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                      <CardContent className="p-4">
                        <ScoreBar score={linguisticAnalysis.cognitive_complexity.score} label="Cognitive Complexity" />
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Enhanced Assessment Dimensions */}
                {(psycholinguisticAnalysis || technicalPhilosophy || leadershipDynamics || adaptabilityResilience) && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {psycholinguisticAnalysis?.personality_traits?.big_five_assessment?.conscientiousness && (
                      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-700">
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                            {psycholinguisticAnalysis.personality_traits.big_five_assessment.conscientiousness.score}
                          </div>
                          <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">Personality Fit</div>
                          <Progress value={psycholinguisticAnalysis.personality_traits.big_five_assessment.conscientiousness.score} className="mt-2 h-2" />
                        </CardContent>
                      </Card>
                    )}
                    {technicalPhilosophy && (
                      <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border-emerald-200 dark:border-emerald-700">
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{technicalPhilosophy.score}</div>
                          <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Technical Philosophy</div>
                          <Progress value={technicalPhilosophy.score} className="mt-2 h-2" />
                        </CardContent>
                      </Card>
                    )}
                    {leadershipDynamics && (
                      <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 border-indigo-200 dark:border-indigo-700">
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">{leadershipDynamics.score}</div>
                          <div className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">Leadership Dynamics</div>
                          <Progress value={leadershipDynamics.score} className="mt-2 h-2" />
                        </CardContent>
                      </Card>
                    )}
                    {adaptabilityResilience && (
                      <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-amber-200 dark:border-amber-700">
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{adaptabilityResilience.score}</div>
                          <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">Adaptability & Resilience</div>
                          <Progress value={adaptabilityResilience.score} className="mt-2 h-2" />
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </div>

              {/* V6 Detailed Assessment Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {technicalMastery && (
                  <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-slate-800 dark:text-slate-200">Technical Mastery</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-slate-600 dark:text-slate-300">{technicalMastery.depth_of_knowledge}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-300">{technicalMastery.practical_application}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-300">{technicalMastery.problem_solving_methodology}</p>

                      {technicalMastery.tool_proficiency && (
                        <div className="space-y-2">
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-center">
                              <div className="text-xs text-blue-600 font-semibold">Tool Score</div>
                              <div className="text-lg font-bold text-blue-700">{technicalMastery.tool_proficiency.score}</div>
                            </div>
                            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded text-center">
                              <div className="text-xs text-green-600 font-semibold">Mastered</div>
                              <div className="text-lg font-bold text-green-700">{technicalMastery.tool_proficiency.mastered_tools?.length || 0}</div>
                            </div>
                            <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-center">
                              <div className="text-xs text-yellow-600 font-semibold">Familiar</div>
                              <div className="text-lg font-bold text-yellow-700">{technicalMastery.tool_proficiency.familiar_tools?.length || 0}</div>
                            </div>
                          </div>
                          {technicalMastery.tool_proficiency.mastered_tools?.length > 0 && (
                            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded">
                              <div className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">Mastered Tools</div>
                              <div className="flex flex-wrap gap-1">
                                {technicalMastery.tool_proficiency.mastered_tools.map((tool: string, i: number) => (
                                  <Badge key={i} variant="secondary" className="text-xs">{tool}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {technicalMastery.tool_proficiency.familiar_tools?.length > 0 && (
                            <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                              <div className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 mb-1">Familiar Tools</div>
                              <div className="flex flex-wrap gap-1">
                                {technicalMastery.tool_proficiency.familiar_tools.map((tool: string, i: number) => (
                                  <Badge key={i} variant="outline" className="text-xs border-yellow-300">{tool}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {technicalMastery.code_quality_indicators && (
                        <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded">
                          <div className="text-xs font-semibold text-purple-700 dark:text-purple-400 mb-2">Code Quality Indicators</div>
                          <div className="space-y-1 text-xs text-purple-600 dark:text-purple-300">
                            <p>• Best Practices: {technicalMastery.code_quality_indicators.best_practices}</p>
                            <p>• Scalability: {technicalMastery.code_quality_indicators.scalability_awareness}</p>
                            <p>• Security: {technicalMastery.code_quality_indicators.security_considerations}</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {linguisticAnalysis && (
                  <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-slate-800 dark:text-slate-200">Linguistic Analysis</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                          <div className="text-xs text-blue-600 font-semibold">Vocabulary Score</div>
                          <div className="text-lg font-bold text-blue-700">{linguisticAnalysis.vocabulary_sophistication?.score || 0}</div>
                          <div className="text-xs text-blue-500">{linguisticAnalysis.vocabulary_sophistication?.technical_accuracy}</div>
                        </div>
                        <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded">
                          <div className="text-xs text-purple-600 font-semibold">Cognitive Complexity</div>
                          <div className="text-lg font-bold text-purple-700">{linguisticAnalysis.cognitive_complexity?.score || 0}</div>
                        </div>
                      </div>

                      {linguisticAnalysis.vocabulary_sophistication?.indicators && (
                        <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded">
                          <div className="text-xs font-semibold text-orange-700 dark:text-orange-400 mb-1">Vocabulary Indicators</div>
                          <ul className="space-y-1">
                            {linguisticAnalysis.vocabulary_sophistication.indicators.map((indicator: string, i: number) => (
                              <li key={i} className="text-xs text-orange-600 dark:text-orange-300">• {indicator}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {linguisticAnalysis.cognitive_complexity && (
                        <div className="p-2 bg-cyan-50 dark:bg-cyan-900/20 rounded">
                          <div className="text-xs font-semibold text-cyan-700 dark:text-cyan-400 mb-2">Cognitive Indicators</div>
                          <div className="space-y-1 text-xs text-cyan-600 dark:text-cyan-300">
                            <p>• Abstract Thinking: {linguisticAnalysis.cognitive_complexity.abstract_thinking}</p>
                            <p>• Systems Thinking: {linguisticAnalysis.cognitive_complexity.systems_thinking}</p>
                            <p>• Analytical Depth: {linguisticAnalysis.cognitive_complexity.analytical_depth}</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Communication Patterns */}
              {profile?.communication_patterns && (
                <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-slate-800 dark:text-slate-200">Communication Patterns</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                        <div className="text-2xl font-bold text-blue-600">{profile.communication_patterns.clarity_score}</div>
                        <div className="text-xs text-blue-500">Clarity Score</div>
                      </div>
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                        <div className="text-2xl font-bold text-green-600">{profile.communication_patterns.structure_utilization === 'some use of structure but limited detail' ? 'Partial' : 'Full'}</div>
                        <div className="text-xs text-green-500">Structure Use</div>
                      </div>
                      <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
                        <div className="text-2xl font-bold text-purple-600">{profile.communication_patterns.example_quality === 'examples are brief and sometimes unconvincing' ? 'Limited' : 'Strong'}</div>
                        <div className="text-xs text-purple-500">Example Quality</div>
                      </div>
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-center">
                        <div className="text-2xl font-bold text-yellow-600">{profile.communication_patterns.conciseness_effectiveness === 'concise but sometimes too brief to be useful' ? 'Too Brief' : 'Balanced'}</div>
                        <div className="text-xs text-yellow-500">Conciseness</div>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 italic">{profile.communication_patterns.structure_utilization}</p>
                  </CardContent>
                </Card>
              )}

              {/* V6 Problem Solving & Communication */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {problemSolvingCapability && (
                  <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-slate-800 dark:text-slate-200">Problem Solving Capability</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Overall Score</span>
                          <Badge className={`${getScoreColor(problemSolvingCapability.score).bg} text-white`}>
                            {problemSolvingCapability.score}
                          </Badge>
                        </div>
                        <Progress value={problemSolvingCapability.score} className="h-2" />
                        <p className="text-sm text-slate-600 dark:text-slate-300">{problemSolvingCapability.analytical_approach}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-300">{problemSolvingCapability.creative_solutions}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-300">{problemSolvingCapability.decision_process}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-300">{problemSolvingCapability.trade_off_understanding}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-300">{problemSolvingCapability.complexity_handling}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {communicationExcellence && (
                  <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-slate-800 dark:text-slate-200">Communication Excellence</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Overall Score</span>
                          <Badge className={`${getScoreColor(communicationExcellence.score).bg} text-white`}>
                            {communicationExcellence.score}
                          </Badge>
                        </div>
                        <Progress value={communicationExcellence.score} className="h-2" />
                        <p className="text-sm text-slate-600 dark:text-slate-300">{communicationExcellence.articulation_clarity}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-300">{communicationExcellence.active_listening}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-300">{communicationExcellence.stakeholder_communication}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-300">{communicationExcellence.technical_translation}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-300">{communicationExcellence.presentation_skills}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Leadership & Cultural Alignment */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {leadershipPotential && (
                  <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-slate-800 dark:text-slate-200">Leadership Potential</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Leadership Score</span>
                          <Badge className={`${getScoreColor(leadershipPotential.score).bg} text-white`}>
                            {leadershipPotential.score}
                          </Badge>
                        </div>
                        <Progress value={leadershipPotential.score} className="h-2" />
                        <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                          <p>• Initiative: {leadershipPotential.initiative_demonstration}</p>
                          <p>• Influence: {leadershipPotential.influence_without_authority}</p>
                          <p>• Collaboration: {leadershipPotential.team_collaboration}</p>
                          <p>• Mentoring: {leadershipPotential.mentoring_indicators}</p>
                          <p>• Strategy: {leadershipPotential.strategic_thinking}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {culturalAlignment && (
                  <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-slate-800 dark:text-slate-200">Cultural Alignment</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Alignment Score</span>
                          <Badge className={`${getScoreColor(culturalAlignment.score).bg} text-white`}>
                            {culturalAlignment.score}
                          </Badge>
                        </div>
                        <Progress value={culturalAlignment.score} className="h-2" />
                        <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                          <p>• Values: {culturalAlignment.value_alignment}</p>
                          <p>• Work Style: {culturalAlignment.work_style_fit}</p>
                          <p>• Team Dynamics: {culturalAlignment.team_dynamics}</p>
                          <p>• Adaptability: {culturalAlignment.adaptability_flexibility}</p>
                          <p>• Commitment: {culturalAlignment.long_term_commitment}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Learning Agility */}
              {learningAgility && (
                <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-slate-800 dark:text-slate-200">Learning Agility</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Learning Score</span>
                        <Badge className={`${getScoreColor(learningAgility.score).bg} text-white`}>
                          {learningAgility.score}
                        </Badge>
                      </div>
                      <Progress value={learningAgility.score} className="h-2" />
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                          <div className="text-xs font-semibold text-blue-700 dark:text-blue-400">Learning Speed</div>
                          <p className="text-sm text-blue-800 dark:text-blue-200">{learningAgility.learning_speed}</p>
                        </div>
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded">
                          <div className="text-xs font-semibold text-green-700 dark:text-green-400">Knowledge Application</div>
                          <p className="text-sm text-green-800 dark:text-green-200">{learningAgility.knowledge_application}</p>
                        </div>
                        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded">
                          <div className="text-xs font-semibold text-purple-700 dark:text-purple-400">Continuous Learning</div>
                          <p className="text-sm text-purple-800 dark:text-purple-200">{learningAgility.continuous_learning}</p>
                        </div>
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                          <div className="text-xs font-semibold text-yellow-700 dark:text-yellow-400">Feedback Receptivity</div>
                          <p className="text-sm text-yellow-800 dark:text-yellow-200">{learningAgility.feedback_receptivity}</p>
                        </div>
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded">
                          <div className="text-xs font-semibold text-red-700 dark:text-red-400">Curiosity Indicators</div>
                          <p className="text-sm text-red-800 dark:text-red-200">{learningAgility.curiosity_indicators}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* V6 Skill Taxonomy Mapping - Updated */}
              {skillTaxonomyMapping && (
                <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <Target className="h-4 w-4" /> Skills Mapping
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Required Skills</h5>
                        <div className="space-y-2">
                          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded">
                            <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Technical Skills</div>
                            <div className="flex flex-wrap gap-1">
                              {skillTaxonomyMapping.required_skills?.technical?.map((skill: string, i: number) => (
                                <Badge key={i} variant="secondary" className="text-xs">{skill}</Badge>
                              ))}
                            </div>
                          </div>
                          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded">
                            <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Soft Skills</div>
                            <div className="flex flex-wrap gap-1">
                              {skillTaxonomyMapping.required_skills?.soft?.map((skill: string, i: number) => (
                                <Badge key={i} variant="outline" className="text-xs">{skill}</Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h5 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Preferred Skills</h5>
                        <div className="space-y-2">
                          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded">
                            <div className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1">Technical Skills</div>
                            <div className="flex flex-wrap gap-1">
                              {skillTaxonomyMapping.preferred_skills?.technical?.map((skill: string, i: number) => (
                                <Badge key={i} className="text-xs bg-green-100 text-green-800 border-green-200">{skill}</Badge>
                              ))}
                            </div>
                          </div>
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                            <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">Soft Skills</div>
                            <div className="flex flex-wrap gap-1">
                              {skillTaxonomyMapping.preferred_skills?.soft?.map((skill: string, i: number) => (
                                <Badge key={i} className="text-xs bg-blue-100 text-blue-800 border-blue-200">{skill}</Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* V6 Predictive Assessment */}
              {predictiveAssessment && (
                <Card className="bg-white dark:bg-slate-900 border-2 border-indigo-200 dark:border-indigo-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" /> Predictive Assessment
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Performance Trajectory */}
                    {predictiveAssessment.performance_trajectory && (
                      <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                        <div className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 mb-3">Performance Trajectory</div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                          <div className="text-center">
                            <div className="text-lg font-bold text-indigo-600">{predictiveAssessment.performance_trajectory.score}</div>
                            <div className="text-xs text-indigo-500">Score</div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-medium text-indigo-600">{predictiveAssessment.performance_trajectory.ramp_up_timeline}</div>
                            <div className="text-xs text-indigo-500">Ramp Up</div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-medium text-indigo-600">{predictiveAssessment.performance_trajectory.peak_performance_timeline}</div>
                            <div className="text-xs text-indigo-500">Peak Performance</div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-medium text-indigo-600">{predictiveAssessment.performance_trajectory.growth_acceleration}</div>
                            <div className="text-xs text-indigo-500">Growth</div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-medium text-indigo-600">{predictiveAssessment.performance_trajectory.advancement_readiness}</div>
                            <div className="text-xs text-indigo-500">Advancement</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Retention Analysis */}
                    {predictiveAssessment.retention_analysis && (
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="text-xs font-semibold text-green-700 dark:text-green-400 mb-3">Retention Analysis</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <span className="text-xs font-medium text-green-600">Retention Probability:</span>
                            <div className="flex items-center gap-2 mt-1">
                              <Progress value={predictiveAssessment.retention_analysis.probability_score * 20} className="h-2 flex-1" />
                              <span className="text-sm font-bold text-green-700">{predictiveAssessment.retention_analysis.probability_score * 20}%</span>
                            </div>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-green-600">Cultural Fit Strength:</span>
                            <Badge className="text-xs bg-green-500 text-white mt-1">{predictiveAssessment.retention_analysis.cultural_fit_strength}</Badge>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-green-600">Career Path Alignment:</span>
                            <Badge className="text-xs bg-emerald-500 text-white mt-1">{predictiveAssessment.retention_analysis.career_path_alignment}</Badge>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-green-600">Risk Factors:</span>
                            <ul className="mt-1">
                              {predictiveAssessment.retention_analysis.risk_factors?.map((risk: string, i: number) => (
                                <li key={i} className="text-xs text-red-600">• {risk}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Leadership Potential */}
                    {predictiveAssessment.leadership_potential && (
                      <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <div className="text-xs font-semibold text-purple-700 dark:text-purple-400 mb-3">Leadership Potential</div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="text-center">
                            <div className="text-lg font-bold text-purple-600">{predictiveAssessment.leadership_potential.current_readiness}</div>
                            <div className="text-xs text-purple-500">Readiness</div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-medium text-purple-600">{predictiveAssessment.leadership_potential.leadership_development_timeline}</div>
                            <div className="text-xs text-purple-500">Timeline</div>
                          </div>
                          <div className="text-center">
                            <Badge className="text-xs bg-purple-500 text-white">{predictiveAssessment.leadership_potential.leadership_style_prediction}</Badge>
                            <div className="text-xs text-purple-500 mt-1">Style</div>
                          </div>
                          <div className="text-center">
                            <Badge className="text-xs bg-indigo-500 text-white">{predictiveAssessment.leadership_potential.influence_trajectory}</Badge>
                            <div className="text-xs text-purple-500 mt-1">Influence</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* V6 Behavioral Indicators - Enhanced */}
              {behavioralIndicators && (
                <Card className="bg-white dark:bg-slate-900 border-2 border-orange-200 dark:border-orange-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-orange-700 dark:text-orange-400 flex items-center gap-2">
                      <Eye className="h-4 w-4" /> Behavioral Indicators
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Strengths */}
                    {behavioralIndicators.strengths?.length > 0 && (
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="text-xs font-semibold text-green-700 dark:text-green-400 mb-2">Strengths</div>
                        <div className="space-y-2">
                          {behavioralIndicators.strengths.map((strength: any, i: number) => (
                            <div key={i} className="flex items-start gap-2">
                              <Badge className={`text-xs ${strength.impact_level === 'HIGH' ? 'bg-green-500' : 'bg-yellow-500'} text-white`}>
                                {strength.impact_level}
                              </Badge>
                              <div className="flex-1">
                                <div className="text-sm font-medium text-green-900 dark:text-green-100">{strength.description}</div>
                                <p className="text-xs text-green-700 dark:text-green-300">Evidence: {strength.evidence}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Development Areas */}
                    {behavioralIndicators.development_areas?.length > 0 && (
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <div className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 mb-2">Development Areas</div>
                        <div className="space-y-2">
                          {behavioralIndicators.development_areas.map((area: any, i: number) => (
                            <div key={i} className="p-2 bg-yellow-100 dark:bg-yellow-900/40 rounded">
                              <div className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-1">{area.description}</div>
                              <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-1">{area.evidence}</p>
                              <p className="text-xs text-yellow-600 dark:text-yellow-400 italic">Suggestion: {area.development_suggestions}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Enhanced Assessment Dimensions - Psycholinguistic Analysis */}
              {psycholinguisticAnalysis && (
                <Card className="bg-white dark:bg-slate-900 border-2 border-purple-200 dark:border-purple-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-purple-700 dark:text-purple-400 flex items-center gap-2">
                      <Brain className="h-4 w-4" /> Psycholinguistic Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Big Five Personality Traits - Enhanced */}
                    {psycholinguisticAnalysis.personality_traits?.big_five_assessment && (
                      <div>
                        <h5 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                          <Brain className="h-4 w-4" /> Big Five Personality Assessment
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {Object.entries(psycholinguisticAnalysis.personality_traits.big_five_assessment).map(([trait, data]: [string, any]) => (
                            <Card key={trait} className={`border-2 ${getScoreColor(data.score).border} hover:shadow-md transition-shadow`}>
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start mb-3">
                                  <div>
                                    <h6 className="text-sm font-semibold capitalize text-slate-700 dark:text-slate-300">{trait}</h6>
                                    <Badge className={`text-xs mt-1 ${getScoreColor(data.score).bg} text-white`}>
                                      {getScoreColor(data.score).label}
                                    </Badge>
                                  </div>
                                  <div className="flex flex-col items-end">
                                    <span className={`text-lg font-bold ${getScoreColor(data.score).text}`}>{data.score}</span>
                                    <span className="text-xs text-gray-500">/100</span>
                                  </div>
                                </div>
                                <Progress value={data.score} className="h-2 mb-3" />
                                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                                  {data.detail_orientation || data.communication_style || data.cooperation_level || data.stress_tolerance || data.creativity_indicators || data.confidence_level || data.emotional_stability}
                                </p>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Communication Psychology */}
                    {psycholinguisticAnalysis.communication_psychology && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {Object.entries(psycholinguisticAnalysis.communication_psychology).map(([aspect, data]: [string, any]) => (
                          <div key={aspect} className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 capitalize">{aspect.replace('_', ' ')}</span>
                              <span className="text-sm font-bold text-blue-800 dark:text-blue-300">{data.score}</span>
                            </div>
                            <Progress value={data.score} className="h-1 mb-2" />
                            <p className="text-xs text-blue-600 dark:text-blue-200">
                              {data.confidence_expression || data.growth_mindset || data.team_preference}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Behavioral Consistency */}
                    {psycholinguisticAnalysis.behavioral_consistency && (
                      <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-semibold text-purple-700 dark:text-purple-400">Authenticity Score</span>
                          <span className="text-sm font-bold text-purple-800 dark:text-purple-300">{psycholinguisticAnalysis.behavioral_consistency.authenticity_score}</span>
                        </div>
                        <Progress value={psycholinguisticAnalysis.behavioral_consistency.authenticity_score} className="h-1 mb-2" />
                        {psycholinguisticAnalysis.behavioral_consistency.contradiction_detection?.length > 0 && (
                          <div className="mt-2">
                            <div className="text-xs font-medium text-purple-700 dark:text-purple-400 mb-1">Detected Contradictions:</div>
                            <ul className="space-y-1">
                              {psycholinguisticAnalysis.behavioral_consistency.contradiction_detection.map((contradiction: string, i: number) => (
                                <li key={i} className="text-xs text-purple-600 dark:text-purple-200">• {contradiction}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Technical Philosophy & Code Quality */}
              {technicalPhilosophy && (
                <Card className="bg-white dark:bg-slate-900 border-2 border-emerald-200 dark:border-emerald-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                      <Shield className="h-4 w-4" /> Technical Philosophy & Code Quality
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {technicalPhilosophy.code_quality_mindset && (
                        <Card className={`border-2 ${getScoreColor(technicalPhilosophy.code_quality_mindset.score).border}`}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-center mb-3">
                              <h6 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Code Quality Mindset</h6>
                              <Badge className={`text-xs ${getScoreColor(technicalPhilosophy.code_quality_mindset.score).bg} text-white`}>
                                {getScoreColor(technicalPhilosophy.code_quality_mindset.score).label}
                              </Badge>
                            </div>
                            <ScoreBar
                              score={technicalPhilosophy.code_quality_mindset.score}
                              label="Quality Standards"
                              showLabel={false}
                            />
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-3 line-clamp-2">
                              {technicalPhilosophy.code_quality_mindset.clean_code_advocacy}
                            </p>
                          </CardContent>
                        </Card>
                      )}
                      {technicalPhilosophy.technical_debt_awareness && (
                        <Card className={`border-2 ${getScoreColor(technicalPhilosophy.technical_debt_awareness.score).border}`}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-center mb-3">
                              <h6 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Technical Debt Awareness</h6>
                              <Badge className={`text-xs ${getScoreColor(technicalPhilosophy.technical_debt_awareness.score).bg} text-white`}>
                                {getScoreColor(technicalPhilosophy.technical_debt_awareness.score).label}
                              </Badge>
                            </div>
                            <ScoreBar
                              score={technicalPhilosophy.technical_debt_awareness.score}
                              label="Debt Management"
                              showLabel={false}
                            />
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-3 line-clamp-2">
                              {technicalPhilosophy.technical_debt_awareness.debt_identification}
                            </p>
                          </CardContent>
                        </Card>
                      )}
                      {technicalPhilosophy.architectural_thinking && (
                        <Card className={`border-2 ${getScoreColor(technicalPhilosophy.architectural_thinking.score).border}`}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-center mb-3">
                              <h6 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Architectural Thinking</h6>
                              <Badge className={`text-xs ${getScoreColor(technicalPhilosophy.architectural_thinking.score).bg} text-white`}>
                                {getScoreColor(technicalPhilosophy.architectural_thinking.score).label}
                              </Badge>
                            </div>
                            <ScoreBar
                              score={technicalPhilosophy.architectural_thinking.score}
                              label="System Design"
                              showLabel={false}
                            />
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-3 line-clamp-2">
                              {technicalPhilosophy.architectural_thinking.scalability_considerations}
                            </p>
                          </CardContent>
                        </Card>
                      )}
                      {technicalPhilosophy.innovation_quotient && (
                        <Card className={`border-2 ${getScoreColor(technicalPhilosophy.innovation_quotient.score).border}`}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-center mb-3">
                              <h6 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Innovation Quotient</h6>
                              <Badge className={`text-xs ${getScoreColor(technicalPhilosophy.innovation_quotient.score).bg} text-white`}>
                                {getScoreColor(technicalPhilosophy.innovation_quotient.score).label}
                              </Badge>
                            </div>
                            <ScoreBar
                              score={technicalPhilosophy.innovation_quotient.score}
                              label="Innovation Capacity"
                              showLabel={false}
                            />
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-3 line-clamp-2">
                              {technicalPhilosophy.innovation_quotient.creative_problem_solving}
                            </p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Leadership Dynamics */}
              {leadershipDynamics && (
                <Card className="bg-white dark:bg-slate-900 border-2 border-indigo-200 dark:border-indigo-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
                      <Award className="h-4 w-4" /> Leadership Dynamics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Leadership Style */}
                    {leadershipDynamics.leadership_style && (
                      <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="text-sm font-semibold text-indigo-700 dark:text-indigo-400">Leadership Style</h5>
                          <Badge className="bg-indigo-500 text-white text-xs">
                            {leadershipDynamics.leadership_style.primary_style?.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-300">Decision Approach:</span>
                            <p className="text-xs text-indigo-800 dark:text-indigo-200">{leadershipDynamics.leadership_style.decision_making_approach}</p>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-300">Strategic Thinking:</span>
                            <p className="text-xs text-indigo-800 dark:text-indigo-200">{leadershipDynamics.leadership_style.strategic_thinking}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Leadership Sub-dimensions - Enhanced */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {leadershipDynamics.team_integration && (
                        <Card className={`border-2 ${getScoreColor(leadershipDynamics.team_integration.score).border}`}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-center mb-3">
                              <h6 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Team Integration</h6>
                              <Badge className={`text-xs ${getScoreColor(leadershipDynamics.team_integration.score).bg} text-white`}>
                                {getScoreColor(leadershipDynamics.team_integration.score).label}
                              </Badge>
                            </div>
                            <ScoreRing score={leadershipDynamics.team_integration.score} size={60} />
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-3 text-center">
                              {leadershipDynamics.team_integration.collaboration_effectiveness}
                            </p>
                          </CardContent>
                        </Card>
                      )}
                      {leadershipDynamics.influence_ability && (
                        <Card className={`border-2 ${getScoreColor(leadershipDynamics.influence_ability.score).border}`}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-center mb-3">
                              <h6 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Influence Ability</h6>
                              <Badge className={`text-xs ${getScoreColor(leadershipDynamics.influence_ability.score).bg} text-white`}>
                                {getScoreColor(leadershipDynamics.influence_ability.score).label}
                              </Badge>
                            </div>
                            <ScoreRing score={leadershipDynamics.influence_ability.score} size={60} />
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-3 text-center">
                              {leadershipDynamics.influence_ability.persuasive_communication}
                            </p>
                          </CardContent>
                        </Card>
                      )}
                      {leadershipDynamics.accountability_ownership && (
                        <Card className={`border-2 ${getScoreColor(leadershipDynamics.accountability_ownership.score).border}`}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-center mb-3">
                              <h6 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Accountability</h6>
                              <Badge className={`text-xs ${getScoreColor(leadershipDynamics.accountability_ownership.score).bg} text-white`}>
                                {getScoreColor(leadershipDynamics.accountability_ownership.score).label}
                              </Badge>
                            </div>
                            <ScoreRing score={leadershipDynamics.accountability_ownership.score} size={60} />
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-3 text-center">
                              {leadershipDynamics.accountability_ownership.responsibility_acceptance}
                            </p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Adaptability & Resilience */}
              {adaptabilityResilience && (
                <Card className="bg-white dark:bg-slate-900 border-2 border-amber-200 dark:border-amber-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-amber-700 dark:text-amber-400 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" /> Adaptability & Resilience
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {adaptabilityResilience.learning_agility && (
                        <Card className={`border-2 ${getScoreColor(adaptabilityResilience.learning_agility.score).border}`}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-center mb-3">
                              <h6 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Learning Agility</h6>
                              <div className="flex items-center gap-2">
                                <ScoreRing score={adaptabilityResilience.learning_agility.score} size={50} />
                                <Badge className={`text-xs ${getScoreColor(adaptabilityResilience.learning_agility.score).bg} text-white`}>
                                  {getScoreColor(adaptabilityResilience.learning_agility.score).label}
                                </Badge>
                              </div>
                            </div>
                            <div className="mt-3">
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-slate-600 dark:text-slate-400">Learning Speed</span>
                                <span className="font-medium text-slate-700 dark:text-slate-300">{adaptabilityResilience.learning_agility.learning_speed}</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-600 dark:text-slate-400">Versatility</span>
                                <span className="font-medium text-slate-700 dark:text-slate-300">{adaptabilityResilience.learning_agility.versatility}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                      {adaptabilityResilience.change_resilience && (
                        <Card className={`border-2 ${getScoreColor(adaptabilityResilience.change_resilience.score).border}`}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-center mb-3">
                              <h6 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Change Resilience</h6>
                              <div className="flex items-center gap-2">
                                <ScoreRing score={adaptabilityResilience.change_resilience.score} size={50} />
                                <Badge className={`text-xs ${getScoreColor(adaptabilityResilience.change_resilience.score).bg} text-white`}>
                                  {getScoreColor(adaptabilityResilience.change_resilience.score).label}
                                </Badge>
                              </div>
                            </div>
                            <div className="mt-3">
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-slate-600 dark:text-slate-400">Adaptation Speed</span>
                                <span className="font-medium text-slate-700 dark:text-slate-300">{adaptabilityResilience.change_resilience.adaptation_speed}</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-600 dark:text-slate-400">Ambiguity Tolerance</span>
                                <span className="font-medium text-slate-700 dark:text-slate-300">{adaptabilityResilience.change_resilience.ambiguity_tolerance}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                      {adaptabilityResilience.stress_resilience && (
                        <Card className={`border-2 ${getScoreColor(adaptabilityResilience.stress_resilience.score).border}`}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-center mb-3">
                              <h6 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Stress Resilience</h6>
                              <div className="flex items-center gap-2">
                                <ScoreRing score={adaptabilityResilience.stress_resilience.score} size={50} />
                                <Badge className={`text-xs ${getScoreColor(adaptabilityResilience.stress_resilience.score).bg} text-white`}>
                                  {getScoreColor(adaptabilityResilience.stress_resilience.score).label}
                                </Badge>
                              </div>
                            </div>
                            <div className="mt-3">
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-slate-600 dark:text-slate-400">Pressure Performance</span>
                                <span className="font-medium text-slate-700 dark:text-slate-300">{adaptabilityResilience.stress_resilience.pressure_performance}</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-600 dark:text-slate-400">Recovery Speed</span>
                                <span className="font-medium text-slate-700 dark:text-slate-300">{adaptabilityResilience.stress_resilience.recovery_speed}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                      {adaptabilityResilience.growth_trajectory && (
                        <Card className={`border-2 ${getScoreColor(adaptabilityResilience.growth_trajectory.score).border}`}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-center mb-3">
                              <h6 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Growth Trajectory</h6>
                              <div className="flex items-center gap-2">
                                <ScoreRing score={adaptabilityResilience.growth_trajectory.score} size={50} />
                                <Badge className={`text-xs ${getScoreColor(adaptabilityResilience.growth_trajectory.score).bg} text-white`}>
                                  {getScoreColor(adaptabilityResilience.growth_trajectory.score).label}
                                </Badge>
                              </div>
                            </div>
                            <div className="mt-3">
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-slate-600 dark:text-slate-400">Development Path</span>
                                <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[150px]" title={adaptabilityResilience.growth_trajectory.development_roadmap}>
                                  {adaptabilityResilience.growth_trajectory.development_roadmap}
                                </span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-600 dark:text-slate-400">Ambition Level</span>
                                <span className="font-medium text-slate-700 dark:text-slate-300">{adaptabilityResilience.growth_trajectory.ambition_alignment}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* V6 Skill Taxonomy Mapping */}
              {skillTaxonomyMapping && (
                <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <Target className="h-4 w-4" /> Skills Mapping
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {skillTaxonomyMapping.required_skills && (
                      <div>
                        <h5 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Required Skills</h5>
                        <div className="space-y-2">
                          {skillTaxonomyMapping.required_skills.demonstrated?.length > 0 && (
                            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded">
                              <div className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">Demonstrated</div>
                              <div className="flex flex-wrap gap-1">
                                {skillTaxonomyMapping.required_skills.demonstrated.map((skill: string, i: number) => (
                                  <Badge key={i} variant="secondary" className="text-xs">{skill}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {skillTaxonomyMapping.required_skills.partially_demonstrated?.length > 0 && (
                            <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                              <div className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 mb-1">Partially Demonstrated</div>
                              <div className="flex flex-wrap gap-1">
                                {skillTaxonomyMapping.required_skills.partially_demonstrated.map((skill: string, i: number) => (
                                  <Badge key={i} variant="outline" className="text-xs border-yellow-300">{skill}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {skillTaxonomyMapping.required_skills.not_demonstrated?.length > 0 && (
                            <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded">
                              <div className="text-xs font-semibold text-slate-700 dark:text-slate-400 mb-1">Not Demonstrated</div>
                              <div className="flex flex-wrap gap-1">
                                {skillTaxonomyMapping.required_skills.not_demonstrated.map((skill: string, i: number) => (
                                  <Badge key={i} variant="secondary" className="text-xs">{skill}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* V6 Predictive Assessment */}
              {predictiveAssessment && (
                <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" /> Predictive Assessment
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {predictiveAssessment.performance_trajectory && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <div className="text-xs text-blue-600 font-semibold mb-1">Performance Trajectory</div>
                          {typeof predictiveAssessment.performance_trajectory === 'string' ? (
                            <p className="text-sm text-blue-800 dark:text-blue-200">{predictiveAssessment.performance_trajectory}</p>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-blue-600">Score:</span>
                                <span className="text-sm font-bold text-blue-800">{predictiveAssessment.performance_trajectory.score}</span>
                              </div>
                              <div className="grid grid-cols-1 gap-1">
                                <div className="text-xs text-blue-700">
                                  <span className="font-medium">Ramp-up:</span> {predictiveAssessment.performance_trajectory.ramp_up_timeline} weeks
                                </div>
                                <div className="text-xs text-blue-700">
                                  <span className="font-medium">Peak Performance:</span> {predictiveAssessment.performance_trajectory.peak_performance_timeline} months
                                </div>
                                {predictiveAssessment.performance_trajectory.growth_acceleration && (
                                  <div className="text-xs text-blue-700 truncate" title={predictiveAssessment.performance_trajectory.growth_acceleration}>
                                    <span className="font-medium">Growth Factors:</span> {predictiveAssessment.performance_trajectory.growth_acceleration}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {predictiveAssessment.retention_probability && (
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <div className="text-xs text-green-600 font-semibold mb-1">Retention Probability</div>
                          {typeof predictiveAssessment.retention_probability === 'string' ? (
                            <p className="text-sm text-green-800 dark:text-green-200">{predictiveAssessment.retention_probability}</p>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-green-600">Score:</span>
                                <span className="text-sm font-bold text-green-800">{predictiveAssessment.retention_probability.probability_score}%</span>
                              </div>
                              <Progress value={predictiveAssessment.retention_probability.probability_score} className="h-1 mb-2" />
                              {predictiveAssessment.retention_probability.cultural_fit_strength && (
                                <div className="text-xs text-green-700 truncate" title={predictiveAssessment.retention_probability.cultural_fit_strength}>
                                  <span className="font-medium">Fit:</span> {predictiveAssessment.retention_probability.cultural_fit_strength}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      {predictiveAssessment.leadership_potential && (
                        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                          <div className="text-xs text-purple-600 font-semibold mb-1">Leadership Potential</div>
                          {typeof predictiveAssessment.leadership_potential === 'string' ? (
                            <p className="text-sm text-purple-800 dark:text-purple-200">{predictiveAssessment.leadership_potential}</p>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-purple-600">Readiness:</span>
                                <span className="text-sm font-bold text-purple-800">{predictiveAssessment.leadership_potential.current_readiness}</span>
                              </div>
                              <Progress value={predictiveAssessment.leadership_potential.current_readiness} className="h-1 mb-2" />
                              {predictiveAssessment.leadership_potential.leadership_style_prediction && (
                                <div className="text-xs text-purple-700">
                                  <span className="font-medium">Style:</span> {predictiveAssessment.leadership_potential.leadership_style_prediction}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      {predictiveAssessment.innovation_capacity && (
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                          <div className="text-xs text-amber-600 font-semibold mb-1">Innovation Capacity</div>
                          {typeof predictiveAssessment.innovation_capacity === 'string' ? (
                            <p className="text-sm text-amber-800 dark:text-amber-200">{predictiveAssessment.innovation_capacity}</p>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-amber-600">Score:</span>
                                <span className="text-sm font-bold text-amber-800">{predictiveAssessment.innovation_capacity.score}</span>
                              </div>
                              <Progress value={predictiveAssessment.innovation_capacity.score} className="h-1 mb-2" />
                              {predictiveAssessment.innovation_capacity.creative_problem_solving && (
                                <div className="text-xs text-amber-700 truncate" title={predictiveAssessment.innovation_capacity.creative_problem_solving}>
                                  <span className="font-medium">Problem Solving:</span> {predictiveAssessment.innovation_capacity.creative_problem_solving}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      {predictiveAssessment.team_integration && (
                        <div className="p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
                          <div className="text-xs text-teal-600 font-semibold mb-1">Team Integration</div>
                          {typeof predictiveAssessment.team_integration === 'string' ? (
                            <p className="text-sm text-teal-800 dark:text-teal-200">{predictiveAssessment.team_integration}</p>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-teal-600">Success Probability:</span>
                                <span className="text-sm font-bold text-teal-800">{predictiveAssessment.team_integration.collaboration_success_probability}%</span>
                              </div>
                              <Progress value={predictiveAssessment.team_integration.collaboration_success_probability} className="h-1 mb-2" />
                              {predictiveAssessment.team_integration.mentorship_potential && (
                                <div className="text-xs text-teal-700 truncate" title={predictiveAssessment.team_integration.mentorship_potential}>
                                  <span className="font-medium">Mentorship:</span> {predictiveAssessment.team_integration.mentorship_potential}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* V6 Behavioral Development Areas */}
              {behavioralIndicators?.development_areas?.length > 0 && (
                <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <Target className="h-4 w-4" /> Development Areas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {behavioralIndicators.development_areas.map((area: any, i: number) => (
                        <div key={i} className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
                          <div className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-1">{area.description}</div>
                          <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-2">{area.evidence}</p>
                          <p className="text-xs text-yellow-600 dark:text-yellow-400 italic">Suggestion: {area.development_suggestions}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

          {/* V6 Follow-up Questions */}
              {followUpQuestions && (
                <Card className="bg-white dark:bg-slate-900 border-2 border-purple-200 dark:border-purple-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-purple-700 dark:text-purple-400 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" /> Follow-up Questions for Next Interview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Technical Deep Dive */}
                    {followUpQuestions.technical_deep_dive && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                        <div className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-3">Technical Deep Dive</div>
                        {Array.isArray(followUpQuestions.technical_deep_dive) ? (
                          <ul className="space-y-1">
                            {followUpQuestions.technical_deep_dive.map((q: string, i: number) => (
                              <li key={i} className="text-sm text-blue-800 dark:text-blue-200">• {q}</li>
                            ))}
                          </ul>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {Object.entries(followUpQuestions.technical_deep_dive).map(([category, questions]: [string, any]) => (
                              <div key={category}>
                                <span className="text-xs font-medium text-blue-600 dark:text-blue-300 capitalize">{category.replace('_', ' ')}:</span>
                                <ul className="space-y-1 ml-2">
                                  {Array.isArray(questions) ? questions.map((q: string, i: number) => (
                                    <li key={i} className="text-xs text-blue-800 dark:text-blue-200">• {q}</li>
                                  )) : (
                                    <li className="text-xs text-blue-800 dark:text-blue-200">• {questions}</li>
                                  )}
                                </ul>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Behavioral Exploration */}
                    {followUpQuestions.behavioral_exploration && (
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                        <div className="text-xs font-semibold text-green-700 dark:text-green-400 mb-3">Behavioral Exploration</div>
                        {Array.isArray(followUpQuestions.behavioral_exploration) ? (
                          <ul className="space-y-1">
                            {followUpQuestions.behavioral_exploration.map((q: string, i: number) => (
                              <li key={i} className="text-sm text-green-800 dark:text-green-200">• {q}</li>
                            ))}
                          </ul>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {Object.entries(followUpQuestions.behavioral_exploration).map(([category, questions]: [string, any]) => (
                              <div key={category}>
                                <span className="text-xs font-medium text-green-600 dark:text-green-300 capitalize">{category.replace('_', ' ')}:</span>
                                <ul className="space-y-1 ml-2">
                                  {Array.isArray(questions) ? questions.map((q: string, i: number) => (
                                    <li key={i} className="text-xs text-green-800 dark:text-green-200">• {q}</li>
                                  )) : (
                                    <li className="text-xs text-green-800 dark:text-green-200">• {questions}</li>
                                  )}
                                </ul>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Psycholinguistic Deep Dive */}
                    {followUpQuestions.psycholinguistic_deep_dive && (
                      <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
                        <div className="text-xs font-semibold text-purple-700 dark:text-purple-400 mb-3">Psycholinguistic Deep Dive</div>
                        {Array.isArray(followUpQuestions.psycholinguistic_deep_dive) ? (
                          <ul className="space-y-1">
                            {followUpQuestions.psycholinguistic_deep_dive.map((q: string, i: number) => (
                              <li key={i} className="text-sm text-purple-800 dark:text-purple-200">• {q}</li>
                            ))}
                          </ul>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {Object.entries(followUpQuestions.psycholinguistic_deep_dive).map(([category, questions]: [string, any]) => (
                              <div key={category}>
                                <span className="text-xs font-medium text-purple-600 dark:text-purple-300 capitalize">{category.replace('_', ' ')}:</span>
                                <ul className="space-y-1 ml-2">
                                  {Array.isArray(questions) ? questions.map((q: string, i: number) => (
                                    <li key={i} className="text-xs text-purple-800 dark:text-purple-200">• {q}</li>
                                  )) : (
                                    <li className="text-xs text-purple-800 dark:text-purple-200">• {questions}</li>
                                  )}
                                </ul>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Cultural Fit */}
                    {followUpQuestions.cultural_fit && (
                      <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-700">
                        <div className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 mb-3">Cultural Fit Assessment</div>
                        {Array.isArray(followUpQuestions.cultural_fit) ? (
                          <ul className="space-y-1">
                            {followUpQuestions.cultural_fit.map((q: string, i: number) => (
                              <li key={i} className="text-sm text-indigo-800 dark:text-indigo-200">• {q}</li>
                            ))}
                          </ul>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {Object.entries(followUpQuestions.cultural_fit).map(([category, questions]: [string, any]) => (
                              <div key={category}>
                                <span className="text-xs font-medium text-indigo-600 dark:text-indigo-300 capitalize">{category.replace('_', ' ')}:</span>
                                <ul className="space-y-1 ml-2">
                                  {Array.isArray(questions) ? questions.map((q: string, i: number) => (
                                    <li key={i} className="text-xs text-indigo-800 dark:text-indigo-200">• {q}</li>
                                  )) : (
                                    <li className="text-xs text-indigo-800 dark:text-indigo-200">• {questions}</li>
                                  )}
                                </ul>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Leadership Assessment */}
                    {followUpQuestions.leadership_assessment && (
                      <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-700">
                        <div className="text-xs font-semibold text-orange-700 dark:text-orange-400 mb-3">Leadership Assessment</div>
                        {Array.isArray(followUpQuestions.leadership_assessment) ? (
                          <ul className="space-y-1">
                            {followUpQuestions.leadership_assessment.map((q: string, i: number) => (
                              <li key={i} className="text-sm text-orange-800 dark:text-orange-200">• {q}</li>
                            ))}
                          </ul>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {Object.entries(followUpQuestions.leadership_assessment).map(([category, questions]: [string, any]) => (
                              <div key={category}>
                                <span className="text-xs font-medium text-orange-600 dark:text-orange-300 capitalize">{category.replace('_', ' ')}:</span>
                                <ul className="space-y-1 ml-2">
                                  {Array.isArray(questions) ? questions.map((q: string, i: number) => (
                                    <li key={i} className="text-xs text-orange-800 dark:text-orange-200">• {q}</li>
                                  )) : (
                                    <li className="text-xs text-orange-800 dark:text-orange-200">• {questions}</li>
                                  )}
                                </ul>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Growth and Development */}
                    {followUpQuestions.growth_and_development && (
                      <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700">
                        <div className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-3">Growth & Development</div>
                        {Array.isArray(followUpQuestions.growth_and_development) ? (
                          <ul className="space-y-1">
                            {followUpQuestions.growth_and_development.map((q: string, i: number) => (
                              <li key={i} className="text-sm text-amber-800 dark:text-amber-200">• {q}</li>
                            ))}
                          </ul>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {Object.entries(followUpQuestions.growth_and_development).map(([category, questions]: [string, any]) => (
                              <div key={category}>
                                <span className="text-xs font-medium text-amber-600 dark:text-amber-300 capitalize">{category.replace('_', ' ')}:</span>
                                <ul className="space-y-1 ml-2">
                                  {Array.isArray(questions) ? questions.map((q: string, i: number) => (
                                    <li key={i} className="text-xs text-amber-800 dark:text-amber-200">• {q}</li>
                                  )) : (
                                    <li className="text-xs text-amber-800 dark:text-amber-200">• {questions}</li>
                                  )}
                                </ul>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* V6 Interview Process Recommendation */}
              {profile?.interview_process_recommendation && (
                <Card className="bg-white dark:bg-slate-900 border-2 border-teal-200 dark:border-teal-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-teal-700 dark:text-teal-400 flex items-center gap-2">
                      <ClipboardCheck className="h-4 w-4" /> Interview Process Recommendation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Additional Rounds Needed */}
                    {profile.interview_process_recommendation.additional_rounds_needed && (
                      <div className="p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
                        <div className="text-xs font-semibold text-teal-700 dark:text-teal-400 mb-2">Additional Rounds Needed</div>
                        <div className="flex flex-wrap gap-2">
                          {profile.interview_process_recommendation.additional_rounds_needed.map((round: string, i: number) => (
                            <Badge key={i} className="text-xs bg-teal-500 text-white">{round}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Focus Areas */}
                    {profile.interview_process_recommendation.specific_focus_areas && (
                      <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                        <div className="text-xs font-semibold text-orange-700 dark:text-orange-400 mb-2">Specific Focus Areas</div>
                        <div className="flex flex-wrap gap-2">
                          {profile.interview_process_recommendation.specific_focus_areas.map((area: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs border-orange-300 text-orange-700">{area}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Interview Panel Composition */}
                    {profile.interview_process_recommendation.interview_panel_composition && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-2">Interview Panel Composition</div>
                        <div className="flex flex-wrap gap-2">
                          {profile.interview_process_recommendation.interview_panel_composition.map((panelist: string, i: number) => (
                            <Badge key={i} variant="secondary" className="text-xs bg-blue-100 text-blue-800">{panelist}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Technical Assessment Needs */}
                    {profile.interview_process_recommendation.technical_assessment_needs && (
                      <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <div className="text-xs font-semibold text-purple-700 dark:text-purple-400 mb-2">Technical Assessment Needs</div>
                        <p className="text-sm text-purple-800 dark:text-purple-200">{profile.interview_process_recommendation.technical_assessment_needs}</p>
                      </div>
                    )}

                    {/* Cultural Fit Validation */}
                    {profile.interview_process_recommendation.cultural_fit_validation && (
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="text-xs font-semibold text-green-700 dark:text-green-400 mb-2">Cultural Fit Validation</div>
                        <p className="text-sm text-green-800 dark:text-green-200">{profile.interview_process_recommendation.cultural_fit_validation}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* V6 Growth and Development */}
              {profile?.growth_and_development && (
                <Card className="bg-white dark:bg-slate-900 border-2 border-rose-200 dark:border-rose-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-rose-700 dark:text-rose-400 flex items-center gap-2">
                      <Heart className="h-4 w-4" /> Growth and Development Assessment
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Career Goal Alignment */}
                      {profile.growth_and_development.career_goal_alignment && (
                        <div className="p-3 bg-rose-50 dark:bg-rose-900/20 rounded-lg">
                          <div className="text-xs font-semibold text-rose-700 dark:text-rose-400 mb-2">Career Goal Alignment</div>
                          <ul className="space-y-1">
                            {profile.growth_and_development.career_goal_alignment.map((goal: string, i: number) => (
                              <li key={i} className="text-sm text-rose-800 dark:text-rose-200">• {goal}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Skill Development Planning */}
                      {profile.growth_and_development.skill_development_planning && (
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                          <div className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 mb-2">Skill Development Planning</div>
                          <ul className="space-y-1">
                            {profile.growth_and_development.skill_development_planning.map((plan: string, i: number) => (
                              <li key={i} className="text-sm text-indigo-800 dark:text-indigo-200">• {plan}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Learning Capacity Assessment */}
                      {profile.growth_and_development.learning_capacity_assessment && (
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                          <div className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-2">Learning Capacity Assessment</div>
                          <ul className="space-y-1">
                            {profile.growth_and_development.learning_capacity_assessment.map((assessment: string, i: number) => (
                              <li key={i} className="text-sm text-amber-800 dark:text-amber-200">• {assessment}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Ambition Level Evaluation */}
                      {profile.growth_and_development.ambition_level_evaluation && (
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                          <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-2">Ambition Level Evaluation</div>
                          <ul className="space-y-1">
                            {profile.growth_and_development.ambition_level_evaluation.map((ambition: string, i: number) => (
                              <li key={i} className="text-sm text-emerald-800 dark:text-emerald-200">• {ambition}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Industry Trends Engagement */}
                    {profile.growth_and_development.industry_trends_engagement && (
                      <div className="p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
                        <div className="text-xs font-semibold text-cyan-700 dark:text-cyan-400 mb-2">Industry Trends Engagement</div>
                        <ul className="space-y-1">
                          {profile.growth_and_development.industry_trends_engagement.map((trend: string, i: number) => (
                            <li key={i} className="text-sm text-cyan-800 dark:text-cyan-200">• {trend}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Personal Brand Development */}
                    {profile.growth_and_development.personal_brand_development && (
                      <div className="p-3 bg-violet-50 dark:bg-violet-900/20 rounded-lg">
                        <div className="text-xs font-semibold text-violet-700 dark:text-violet-400 mb-2">Personal Brand Development</div>
                        <ul className="space-y-1">
                          {profile.growth_and_development.personal_brand_development.map((brand: string, i: number) => (
                            <li key={i} className="text-sm text-violet-800 dark:text-violet-200">• {brand}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

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
                                <div className="text-sm font-medium text-red-900 dark:text-red-100">{flag.description || flag.flag_type}</div>
                                <p className="text-xs text-red-700 dark:text-red-300 mt-1">{flag.evidence}</p>
                                {flag.hiring_implication && (
                                  <p className="text-xs text-red-600 dark:text-red-400 mt-1 italic">Hiring Impact: {flag.hiring_implication}</p>
                                )}
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
                            <div className="text-sm font-medium text-green-900 dark:text-green-100">{flag.description || flag.flag_type}</div>
                            <p className="text-xs text-green-700 dark:text-green-300 mt-1">{flag.evidence}</p>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* V6 Assessment Metadata */}
              <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-slate-800 dark:text-slate-200">Assessment Metadata</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">Assessment Version:</span>
                    <Badge className="bg-blue-500 text-white">V6</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">Assessment Date:</span>
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {profile?.assessment_date ? new Date(profile.assessment_date).toLocaleDateString() : 'Not available'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">Overall Confidence:</span>
                    <Badge className={getConfidenceColor(profile?.assessment_confidence)}>
                      {profile?.assessment_confidence?.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  {interviewMeta?.data_limitations?.length > 0 && (
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <div className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 mb-2">Data Limitations</div>
                      <ul className="space-y-1">
                        {interviewMeta.data_limitations.map((limit: string, i: number) => (
                          <li key={i} className="text-xs text-yellow-700 dark:text-yellow-300">• {limit}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {interviewMeta && (
                    <div className="space-y-4">
                      {/* Session Details */}
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-2">Session Details</div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                          <div>
                            <span className="text-blue-600 font-medium">Questions:</span>
                            <div className="text-blue-800 font-bold">{interviewMeta.session_details?.questions_asked || interviewMeta.questions_asked}</div>
                          </div>
                          <div>
                            <span className="text-blue-600 font-medium">Responses:</span>
                            <div className="text-blue-800 font-bold">{interviewMeta.session_details?.responses_provided || interviewMeta.responses_provided}</div>
                          </div>
                          <div>
                            <span className="text-blue-600 font-medium">Duration:</span>
                            <div className="text-blue-800">{interviewMeta.session_details?.estimated_speaking_time_minutes || interviewMeta.estimated_speaking_time_minutes || 'N/A'} min</div>
                          </div>
                          <div>
                            <span className="text-blue-600 font-medium">Quality:</span>
                            <Badge className="text-xs bg-blue-500 text-white mt-1">
                              {interviewMeta.transcript_analysis_quality}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Engagement Metrics */}
                      {interviewMeta.engagement_metrics && (
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <div className="text-xs font-semibold text-green-700 dark:text-green-400 mb-2">Engagement Metrics</div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-green-600">Engagement Level:</span>
                              <Badge className={`text-xs ${
                                interviewMeta.engagement_metrics.engagement_level === 'HIGH' ? 'bg-green-500' :
                                interviewMeta.engagement_metrics.engagement_level === 'MEDIUM' ? 'bg-yellow-500' :
                                'bg-red-500'
                              } text-white`}>
                                {interviewMeta.engagement_metrics.engagement_level}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-green-600">Response Style:</span>
                              <Badge className="text-xs bg-green-500 text-white">
                                {interviewMeta.engagement_metrics.response_proactiveness}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-green-600">Preparation:</span>
                              <Badge className={`text-xs ${
                                interviewMeta.engagement_metrics.preparation_level === 'HIGH' ? 'bg-emerald-500' :
                                interviewMeta.engagement_metrics.preparation_level === 'MEDIUM' ? 'bg-yellow-500' :
                                'bg-red-500'
                              } text-white`}>
                                {interviewMeta.engagement_metrics.preparation_level}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Communication Analysis */}
                      {interviewMeta.communication_analysis && (
                        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                          <div className="text-xs font-semibold text-purple-700 dark:text-purple-400 mb-2">Communication Analysis</div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <div>
                              <span className="text-xs font-medium text-purple-600">Clarity Score:</span>
                              <div className="flex items-center gap-1 mt-1">
                                <Progress value={interviewMeta.communication_analysis.clarity_score} className="h-1 flex-1" />
                                <span className="text-xs text-purple-800 font-bold">{interviewMeta.communication_analysis.clarity_score}</span>
                              </div>
                            </div>
                            <div>
                              <span className="text-xs font-medium text-purple-600">Articulation:</span>
                              <p className="text-xs text-purple-800 mt-1 truncate">{interviewMeta.communication_analysis.articulation_quality}</p>
                            </div>
                            <div>
                              <span className="text-xs font-medium text-purple-600">Listening:</span>
                              <p className="text-xs text-purple-800 mt-1 truncate">{interviewMeta.communication_analysis.listening_indicators}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Session Dynamics */}
                      {interviewMeta.session_dynamics && (
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                          <div className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-2">Session Dynamics</div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-amber-600">Conversation Flow:</span>
                              <Badge className={`text-xs ${
                                interviewMeta.session_dynamics.conversation_flow === 'NATURAL' ? 'bg-emerald-500' :
                                interviewMeta.session_dynamics.conversation_flow === 'STRUCTURED' ? 'bg-blue-500' :
                                'bg-gray-500'
                              } text-white`}>
                                {interviewMeta.session_dynamics.conversation_flow}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-amber-600">Energy Level:</span>
                              <Badge className={`text-xs ${
                                interviewMeta.session_dynamics.energy_level === 'HIGH' ? 'bg-green-500' :
                                interviewMeta.session_dynamics.energy_level === 'MEDIUM' ? 'bg-yellow-500' :
                                'bg-red-500'
                              } text-white`}>
                                {interviewMeta.session_dynamics.energy_level}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          </div>
      </ScrollArea>
    </div>
  );
}
