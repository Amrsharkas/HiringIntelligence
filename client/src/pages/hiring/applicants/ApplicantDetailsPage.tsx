import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowLeft,
  Star,
  CheckCircle,
  XCircle,
  Calendar,
  Loader2,
  Play,
  User,
  Brain,
  MessageSquare,
  Target,
  TrendingUp,
  AlertTriangle,
  Briefcase,
  Users,
  Award,
  FileText,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { HLSVideoPlayer } from "@/components/HLSVideoPlayer";

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

// Helper functions for score colors
const getScoreColor = (score: number) => {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
};

const getScoreBgColor = (score: number) => {
  if (score >= 80) return "bg-green-100 dark:bg-green-900/30";
  if (score >= 60) return "bg-yellow-100 dark:bg-yellow-900/30";
  return "bg-red-100 dark:bg-red-900/30";
};

// Helper function for Gap Severity Score (higher = worse, inverted logic)
const getGapSeverityColor = (score: number) => {
  if (score >= 76) return "text-red-600 dark:text-red-400"; // High risk
  if (score >= 51) return "text-orange-600 dark:text-orange-400"; // Serious risk
  if (score >= 21) return "text-yellow-600 dark:text-yellow-400"; // Manageable risk
  return "text-green-600 dark:text-green-400"; // Low risk
};

const getGapSeverityBgColor = (score: number) => {
  if (score >= 76) return "bg-red-100 dark:bg-red-900/30"; // High risk
  if (score >= 51) return "bg-orange-100 dark:bg-orange-900/30"; // Serious risk
  if (score >= 21) return "bg-yellow-100 dark:bg-yellow-900/30"; // Manageable risk
  return "bg-green-100 dark:bg-green-900/30"; // Low risk
};

const getSectionScoreColor = (score: number, maxScore: number) => {
  const percentage = (score / maxScore) * 100;
  if (percentage >= 80) return 'text-green-600 bg-green-50';
  if (percentage >= 60) return 'text-yellow-600 bg-yellow-50';
  return 'text-red-600 bg-red-50';
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

const getRecommendationColor = (rec: string) => {
  switch (rec?.toUpperCase()) {
    case 'STRONG_YES': return 'bg-green-100 text-green-800 border-green-300';
    case 'YES': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case 'MAYBE': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'NO': return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'STRONG_NO': return 'bg-red-100 text-red-800 border-red-300';
    default: return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

const getSkillDepthColor = (depth: string) => {
  switch (depth?.toUpperCase()) {
    case 'EXPERT': return 'bg-green-100 text-green-700 border-green-300';
    case 'PROFICIENT': return 'bg-blue-100 text-blue-700 border-blue-300';
    case 'FAMILIAR': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    case 'LISTED': case 'LISTED_ONLY': return 'bg-gray-100 text-gray-600 border-gray-300';
    default: return 'bg-gray-100 text-gray-600 border-gray-300';
  }
};

const getProgressionColor = (progression: string) => {
  switch (progression?.toUpperCase()) {
    case 'ASCENDING': return 'bg-green-100 text-green-700';
    case 'STABLE': return 'bg-blue-100 text-blue-700';
    case 'MIXED': return 'bg-yellow-100 text-yellow-700';
    case 'DESCENDING': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

// Interview Profile Analysis Component
const InterviewProfileAnalysis = ({ profile }: { profile: any }) => {
  if (!profile) {
    return (
      <div className="text-center py-4 text-slate-500 dark:text-slate-400">
        <p className="text-sm">No interview profile analysis available.</p>
        <p className="text-xs mt-1">Profile will be generated after the interview is analyzed.</p>
      </div>
    );
  }

  const renderSubsectionItem = (label: string, data: any, maxScore?: number) => {
    if (!data) return null;
    const score = data.score;
    const hasScore = score !== undefined && maxScore !== undefined;

    return (
      <div className="p-3 bg-gray-50 dark:bg-gray-900/30 rounded border border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between mb-2">
          <span className="text-sm font-medium flex-1">{label}</span>
          {hasScore && (
            <span className={`text-xs font-bold px-2 py-1 rounded ${getSectionScoreColor(score, maxScore)}`}>
              {score}/{maxScore} pts
            </span>
          )}
        </div>
        {data.evidence && (
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">{data.evidence}</div>
        )}
        {data.demonstratedSkills && data.demonstratedSkills.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {data.demonstratedSkills.map((skill: string, i: number) => (
              <Badge key={i} variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                {skill}
              </Badge>
            ))}
          </div>
        )}
        {data.matchedSoftSkills && data.matchedSoftSkills.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {data.matchedSoftSkills.map((skill: string, i: number) => (
              <Badge key={i} variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200">
                {skill}
              </Badge>
            ))}
          </div>
        )}
        {data.approach && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{data.approach}</div>
        )}
        {data.articulation && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Articulation: {data.articulation}</div>
        )}
        {data.progression && (
          <Badge variant="outline" className={`text-xs mt-1 ${getProgressionColor(data.progression)}`}>
            {data.progression}
          </Badge>
        )}
      </div>
    );
  };

  // Support both V5 structure (executive_summary) and legacy structure (executiveSummary)
  const executiveSummary = profile.executive_summary || profile.executiveSummary;
  const fitVerdict = executiveSummary?.fit_verdict || executiveSummary?.fitScore;
  const oneSentence = executiveSummary?.one_sentence || executiveSummary?.oneLiner || executiveSummary?.key_impression;
  const standoutPositive = executiveSummary?.standout_positive;

  return (
    <div className="p-4 space-y-4 bg-white dark:bg-slate-900">
      {/* Executive Summary - V5 or Legacy */}
      {executiveSummary && (
        <div className="p-3 rounded-lg bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold">{oneSentence || 'Candidate Analysis'}</span>
            </div>
            <div className="flex items-center gap-2">
              {fitVerdict && (
                <Badge className={`text-xs ${fitVerdict === 'EXCELLENT' || fitVerdict === 'STRONGLY_RECOMMEND' ? 'bg-green-500' :
                  fitVerdict === 'GOOD' || fitVerdict === 'RECOMMEND' ? 'bg-primary' :
                    fitVerdict === 'FAIR' || fitVerdict === 'CONSIDER' ? 'bg-yellow-500' :
                      fitVerdict === 'POOR' || fitVerdict === 'HESITANT' ? 'bg-orange-500' :
                        fitVerdict === 'DO_NOT_RECOMMEND' ? 'bg-red-500' :
                          'bg-gray-500'
                  }`}>
                  {fitVerdict.replace(/_/g, ' ')}
                </Badge>
              )}
              {executiveSummary.hiringUrgency && (
                <Badge className={`text-xs ${executiveSummary.hiringUrgency === 'EXPEDITE' ? 'bg-green-600' :
                  executiveSummary.hiringUrgency === 'STANDARD' ? 'bg-primary' :
                    executiveSummary.hiringUrgency === 'LOW_PRIORITY' ? 'bg-gray-600' :
                      'bg-red-600'
                  }`}>
                  {executiveSummary.hiringUrgency.replace('_', ' ')}
                </Badge>
              )}
            </div>
          </div>
          {standoutPositive && (
            <p className="text-sm text-gray-300 mt-2">{standoutPositive}</p>
          )}
          {executiveSummary.uniqueValueProposition && (
            <p className="text-sm text-gray-300 mt-2">{executiveSummary.uniqueValueProposition}</p>
          )}
        </div>
      )}

      {/* Hiring Guidance / Verdict & Recommendation - V5 or Legacy */}
      {(profile.hiring_guidance || profile.verdict) && (
        <div className="p-4 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-gradient-to-r from-gray-50 to-white dark:from-slate-800 dark:to-slate-900">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {/* V5 structure uses hiring_guidance.proceed_to_next_round */}
              {profile.hiring_guidance?.proceed_to_next_round && (
                <Badge className={`text-lg px-4 py-2 font-bold ${getVerdictColor(profile.hiring_guidance.proceed_to_next_round)}`}>
                  {profile.hiring_guidance.proceed_to_next_round === 'YES' ? '✓ PROCEED TO HIRE' :
                    profile.hiring_guidance.proceed_to_next_round === 'LIKELY' ? '✓ LIKELY PROCEED' :
                      profile.hiring_guidance.proceed_to_next_round === 'MAYBE' ? '? CONSIDER' :
                        profile.hiring_guidance.proceed_to_next_round === 'UNLIKELY' ? '⚠ UNLIKELY' :
                          '✗ NOT SUITABLE'}
                </Badge>
              )}
              {/* Legacy structure uses verdict.decision */}
              {profile.verdict?.decision && (
                <Badge className={`text-lg px-4 py-2 font-bold ${getVerdictColor(profile.verdict.decision)}`}>
                  {profile.verdict.decision === 'INTERVIEW' ? '✓ PROCEED TO HIRE' :
                    profile.verdict.decision === 'CONSIDER' ? '? CONSIDER' :
                      profile.verdict.decision === 'REVIEW' ? '⚠ NEEDS REVIEW' :
                        '✗ NOT SUITABLE'}
                </Badge>
              )}
              {profile.verdict?.confidence && (
                <span className={`text-xs font-medium px-2 py-1 rounded ${profile.verdict.confidence === 'HIGH' ? 'bg-green-100 text-green-700' :
                  profile.verdict.confidence === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                  {profile.verdict.confidence} Confidence
                </span>
              )}
              {profile.verdict?.riskLevel && (
                <span className={`text-xs font-medium px-2 py-1 rounded ${profile.verdict.riskLevel === 'LOW' ? 'bg-green-100 text-green-700' :
                  profile.verdict.riskLevel === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                    profile.verdict.riskLevel === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                      'bg-red-100 text-red-700'
                  }`}>
                  {profile.verdict.riskLevel} Risk
                </span>
              )}
            </div>
            {profile.recommendation && (
              <Badge className={`px-3 py-1 ${getRecommendationColor(profile.recommendation)}`}>
                {profile.recommendation.replace('_', ' ')}
              </Badge>
            )}
          </div>

          {profile.hiring_guidance?.reasoning && (
            <p className="text-base font-medium text-gray-800 dark:text-gray-200 mb-3">
              {profile.hiring_guidance.reasoning}
            </p>
          )}
          {profile.verdict?.summary && (
            <p className="text-base font-medium text-gray-800 dark:text-gray-200 mb-3">
              {profile.verdict.summary}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            {profile.verdict?.topStrength && (
              <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-700">
                <div className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" /> TOP STRENGTH
                </div>
                <div className="text-sm text-green-800 dark:text-green-300">{profile.verdict.topStrength}</div>
              </div>
            )}
            {profile.verdict?.topConcern && profile.verdict.topConcern !== 'None identified' && (
              <div className="p-3 bg-orange-50 dark:bg-orange-900/30 rounded-lg border border-orange-200 dark:border-orange-700">
                <div className="text-xs font-semibold text-orange-600 dark:text-orange-400 mb-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> TOP CONCERN
                </div>
                <div className="text-sm text-orange-800 dark:text-orange-300">{profile.verdict.topConcern}</div>
              </div>
            )}
          </div>

          {profile.verdict?.dealbreakers && profile.verdict.dealbreakers.length > 0 && (
            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-700">
              <div className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">DEALBREAKERS</div>
              <ul className="text-sm text-red-800 dark:text-red-300">
                {profile.verdict.dealbreakers.map((item: string, i: number) => (
                  <li key={i} className="flex items-start gap-1">
                    <span className="text-red-500">✗</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {profile.hiring_guidance?.suggested_follow_up_questions && profile.hiring_guidance.suggested_follow_up_questions.length > 0 && (
            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
              <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2">Suggested Follow-up Questions</div>
              <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                {profile.hiring_guidance.suggested_follow_up_questions.map((item: string, i: number) => (
                  <li key={i} className="flex items-start gap-1">
                    <span className="text-blue-500">→</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {profile.recommendationReason && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 italic border-t border-gray-200 dark:border-gray-700 pt-3">
              {profile.recommendationReason}
            </p>
          )}
        </div>
      )}

      {/* Job Match Analysis - V5 structure */}
      {profile.job_match_analysis && (
        <div className="p-4 rounded-lg border-2 border-blue-300 dark:border-blue-600 bg-gradient-to-r from-blue-50 to-white dark:from-blue-900/30 dark:to-slate-900">
          <h5 className="font-medium text-sm mb-3 flex items-center gap-2 text-blue-800 dark:text-blue-300">
            <Target className="h-4 w-4" />
            Job Match Analysis
            {profile.job_match_analysis.job_title && (
              <span className="text-xs text-gray-500">({profile.job_match_analysis.job_title})</span>
            )}
          </h5>

          {profile.job_match_analysis.recommendation_reasoning && (
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              {profile.job_match_analysis.recommendation_reasoning}
            </p>
          )}

          {profile.job_match_analysis.requirements_assessment && profile.job_match_analysis.requirements_assessment.length > 0 && (
            <div className="space-y-2 mb-3">
              <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Requirements Assessment</div>
              {profile.job_match_analysis.requirements_assessment.map((req: any, i: number) => (
                <div key={i} className={`p-2 rounded border ${req.met_status === 'CLEARLY_MET' ? 'bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-700' :
                  req.met_status === 'PARTIALLY_MET' ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/30 dark:border-yellow-700' :
                    'bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-700'
                  }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium">{req.requirement}</span>
                    <Badge variant="outline" className={`text-xs ${req.met_status === 'CLEARLY_MET' ? 'bg-green-100 text-green-700' :
                      req.met_status === 'PARTIALLY_MET' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                      {req.met_status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  {req.evidence && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Evidence: {req.evidence}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {profile.job_match_analysis.strongest_alignments && profile.job_match_analysis.strongest_alignments.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1">Strongest Alignments</div>
              <div className="flex flex-wrap gap-1">
                {profile.job_match_analysis.strongest_alignments.map((alignment: string, i: number) => (
                  <Badge key={i} variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                    {alignment}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {profile.job_match_analysis.critical_gaps && profile.job_match_analysis.critical_gaps.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">Critical Gaps</div>
              <div className="flex flex-wrap gap-1">
                {profile.job_match_analysis.critical_gaps.map((gap: string, i: number) => (
                  <Badge key={i} variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                    {gap}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Section Scores Summary */}
      {(profile.sectionA !== undefined || profile.sectionB !== undefined) && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
          <h5 className="font-medium text-sm mb-3 text-blue-800 dark:text-blue-300">Score Breakdown by Section</h5>
          <Accordion type="multiple" className="space-y-2">
            {/* Section A: Technical */}
            {profile.detailedBreakdown?.sectionA && (
              <AccordionItem value="sectionA" className="bg-white dark:bg-slate-800 rounded border dark:border-gray-600 overflow-hidden">
                <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-gray-50 dark:hover:bg-slate-700">
                  <div className="flex items-center justify-between w-full pr-2">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Section A: Technical Competency</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-blue-700">{profile.sectionA ?? '-'}<span className="text-xs font-normal text-gray-500">/30</span></span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3">
                  <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                    {profile.detailedBreakdown.sectionA.A1_technicalKnowledge && renderSubsectionItem('A1: Technical Knowledge', profile.detailedBreakdown.sectionA.A1_technicalKnowledge, 15)}
                    {profile.detailedBreakdown.sectionA.A2_problemSolving && renderSubsectionItem('A2: Problem Solving', profile.detailedBreakdown.sectionA.A2_problemSolving, 10)}
                    {profile.detailedBreakdown.sectionA.A3_practicalApplication && renderSubsectionItem('A3: Practical Application', profile.detailedBreakdown.sectionA.A3_practicalApplication, 5)}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Section B: Experience */}
            {profile.detailedBreakdown?.sectionB && (
              <AccordionItem value="sectionB" className="bg-white dark:bg-slate-800 rounded border dark:border-gray-600 overflow-hidden">
                <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-gray-50 dark:hover:bg-slate-700">
                  <div className="flex items-center justify-between w-full pr-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Section B: Experience & Achievements</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-blue-700">{profile.sectionB ?? '-'}<span className="text-xs font-normal text-gray-500">/25</span></span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3">
                  <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                    {profile.detailedBreakdown.sectionB.B1_experienceDepth && renderSubsectionItem('B1: Experience Depth', profile.detailedBreakdown.sectionB.B1_experienceDepth, 10)}
                    {profile.detailedBreakdown.sectionB.B2_achievementCommunication && renderSubsectionItem('B2: Achievement Communication', profile.detailedBreakdown.sectionB.B2_achievementCommunication, 10)}
                    {profile.detailedBreakdown.sectionB.B3_careerProgression && renderSubsectionItem('B3: Career Progression', profile.detailedBreakdown.sectionB.B3_careerProgression, 5)}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Section C: Communication */}
            {profile.detailedBreakdown?.sectionC && (
              <AccordionItem value="sectionC" className="bg-white dark:bg-slate-800 rounded border dark:border-gray-600 overflow-hidden">
                <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-gray-50 dark:hover:bg-slate-700">
                  <div className="flex items-center justify-between w-full pr-2">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Section C: Communication & Soft Skills</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-blue-700">{profile.sectionC ?? '-'}<span className="text-xs font-normal text-gray-500">/20</span></span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3">
                  <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                    {profile.detailedBreakdown.sectionC.C1_communicationClarity && renderSubsectionItem('C1: Communication Clarity', profile.detailedBreakdown.sectionC.C1_communicationClarity, 10)}
                    {profile.detailedBreakdown.sectionC.C2_listeningSkills && renderSubsectionItem('C2: Listening Skills', profile.detailedBreakdown.sectionC.C2_listeningSkills, 5)}
                    {profile.detailedBreakdown.sectionC.C3_softSkillsEvidence && renderSubsectionItem('C3: Soft Skills Evidence', profile.detailedBreakdown.sectionC.C3_softSkillsEvidence, 5)}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Section D: Cultural Fit */}
            {profile.detailedBreakdown?.sectionD && (
              <AccordionItem value="sectionD" className="bg-white dark:bg-slate-800 rounded border dark:border-gray-600 overflow-hidden">
                <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-gray-50 dark:hover:bg-slate-700">
                  <div className="flex items-center justify-between w-full pr-2">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Section D: Cultural Fit & Values</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-blue-700">{profile.sectionD ?? '-'}<span className="text-xs font-normal text-gray-500">/10</span></span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3">
                  <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                    {profile.detailedBreakdown.sectionD.D1_valueAlignment && renderSubsectionItem('D1: Value Alignment', profile.detailedBreakdown.sectionD.D1_valueAlignment, 5)}
                    {profile.detailedBreakdown.sectionD.D2_teamFit && renderSubsectionItem('D2: Team Fit', profile.detailedBreakdown.sectionD.D2_teamFit, 5)}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Section E: Leadership */}
            {profile.detailedBreakdown?.sectionE && (
              <AccordionItem value="sectionE" className="bg-white dark:bg-slate-800 rounded border dark:border-gray-600 overflow-hidden">
                <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-gray-50 dark:hover:bg-slate-700">
                  <div className="flex items-center justify-between w-full pr-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Section E: Leadership & Growth</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-blue-700">{profile.sectionE ?? '-'}<span className="text-xs font-normal text-gray-500">/10</span></span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3">
                  <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                    {profile.detailedBreakdown.sectionE.E1_leadershipPotential && renderSubsectionItem('E1: Leadership Potential', profile.detailedBreakdown.sectionE.E1_leadershipPotential, 5)}
                    {profile.detailedBreakdown.sectionE.E2_growthMindset && renderSubsectionItem('E2: Growth Mindset', profile.detailedBreakdown.sectionE.E2_growthMindset, 5)}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Section F: Modifiers */}
            {profile.detailedBreakdown?.sectionF && (
              <AccordionItem value="sectionF" className="bg-white dark:bg-slate-800 rounded border dark:border-gray-600 overflow-hidden">
                <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-gray-50 dark:hover:bg-slate-700">
                  <div className="flex items-center justify-between w-full pr-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Section F: Bonus & Penalties</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-lg font-bold ${(profile.sectionF ?? 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {(profile.sectionF ?? 0) >= 0 ? '+' : ''}{profile.sectionF ?? '0'}
                      </span>
                      <span className="text-xs text-gray-500">pts</span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3">
                  <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                    {profile.detailedBreakdown.sectionF.bonusPoints?.appliedBonuses?.map((bonus: any, i: number) => (
                      <div key={i} className="text-xs text-green-600">+ {bonus.condition}: {bonus.points} pts</div>
                    ))}
                    {profile.detailedBreakdown.sectionF.penalties?.appliedPenalties?.map((penalty: any, i: number) => (
                      <div key={i} className="text-xs text-red-600">{penalty.issue}: {penalty.points} pts</div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </div>
      )}

      {/* Quick Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-700 text-center">
          <div className="text-2xl font-bold text-green-700">
            {profile.strengthsHighlights?.length || 0}
          </div>
          <div className="text-xs text-green-600">Strengths Found</div>
        </div>
        <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-700 text-center">
          <div className="text-2xl font-bold text-red-700">
            {profile.improvementAreas?.length || 0}
          </div>
          <div className="text-xs text-red-600">Gaps Identified</div>
        </div>
        <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-lg border border-amber-200 dark:border-amber-700 text-center">
          <div className="text-2xl font-bold text-amber-700">
            {profile.skillAnalysis?.matchedSkills?.length || 0}
          </div>
          <div className="text-xs text-amber-600">Skills Matched</div>
        </div>
        <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-700 text-center">
          <div className="text-2xl font-bold text-purple-700">
            {profile.quantifiedAchievements?.length || 0}
          </div>
          <div className="text-xs text-purple-600">Achievements</div>
        </div>
      </div>

      {/* Transcript Analysis - Green Flags (V5 structure) */}
      {profile.transcript_analysis?.green_flags_detected && profile.transcript_analysis.green_flags_detected.length > 0 && (
        <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-lg border border-green-200 dark:border-green-700">
          <h5 className="font-medium text-sm mb-3 flex items-center gap-2 text-green-800 dark:text-green-300">
            <CheckCircle className="h-4 w-4" />
            Green Flags Detected ({profile.transcript_analysis.green_flags_detected.length})
          </h5>
          <div className="space-y-2">
            {profile.transcript_analysis.green_flags_detected.map((flag: any, i: number) => (
              <div key={i} className="p-2 bg-white dark:bg-slate-800 rounded border border-green-100 dark:border-green-800">
                <div className="text-sm font-medium text-green-800 dark:text-green-300">
                  {flag.description || flag}
                </div>
                {flag.evidence && (
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    <span className="font-medium">Evidence:</span> {flag.evidence}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strengths & Gaps */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Strengths - Support both V5 and legacy */}
        <div className="p-3 bg-gradient-to-b from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-lg border border-green-200 dark:border-green-700">
          <h5 className="font-medium text-sm mb-3 flex items-center gap-2 text-green-800 dark:text-green-300">
            <CheckCircle className="h-4 w-4" />
            Strengths ({profile.strengthsHighlights?.length || profile.transcript_analysis?.green_flags_detected?.length || 0})
          </h5>
          {(() => {
            // Support both V5 (transcript_analysis.green_flags_detected) and legacy (strengthsHighlights)
            const strengths = profile.strengthsHighlights ||
              profile.transcript_analysis?.green_flags_detected?.map((f: any) => ({ strength: f.description || f, evidence: f.evidence })) || [];

            if (strengths.length > 0) {
              return (
                <div className="space-y-2">
                  {strengths.map((item: any, i: number) => (
                    <div key={i} className="p-2 bg-white dark:bg-slate-800 rounded border border-green-100 dark:border-green-800">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-green-800 dark:text-green-300">{item.strength || item}</div>
                          {item.evidence && (
                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              <span className="font-medium">Evidence:</span> {item.evidence}
                            </div>
                          )}
                          {item.relevanceToJob && (
                            <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                              <span className="font-medium">Job Relevance:</span> {item.relevanceToJob}
                            </div>
                          )}
                        </div>
                        {item.impact && (
                          <Badge variant="outline" className={`text-xs ml-2 ${item.impact === 'HIGH' ? 'bg-green-100 text-green-700 border-green-300' :
                            item.impact === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
                              'bg-gray-100 text-gray-600 border-gray-300'
                            }`}>
                            {item.impact}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            }
            return <div className="text-sm text-gray-500 italic">No strengths identified yet</div>;
          })()}
        </div>

        {/* Gaps */}
        <div className="p-3 bg-gradient-to-b from-red-50 to-orange-50 dark:from-red-900/30 dark:to-orange-900/30 rounded-lg border border-red-200 dark:border-red-700">
          <h5 className="font-medium text-sm mb-3 flex items-center gap-2 text-red-800 dark:text-red-300">
            <AlertTriangle className="h-4 w-4" />
            Gaps & Concerns ({profile.improvementAreas?.length || 0})
          </h5>
          {profile.improvementAreas && profile.improvementAreas.length > 0 ? (
            <div className="space-y-2">
              {profile.improvementAreas.map((item: any, i: number) => (
                <div key={i} className={`p-2 bg-white dark:bg-slate-800 rounded border ${item.severity === 'CRITICAL' ? 'border-red-300' :
                  item.severity === 'MAJOR' ? 'border-orange-300' :
                    'border-yellow-300'
                  }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-red-800 dark:text-red-300">{item.gap || item}</div>
                      {item.reason && (
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          <span className="font-medium">Reason:</span> {item.reason}
                        </div>
                      )}
                      {item.recommendation && (
                        <div className="text-xs text-primary mt-1">
                          <span className="font-medium">Recommendation:</span> {item.recommendation}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {item.severity && (
                        <Badge variant="outline" className={`text-xs ${item.severity === 'CRITICAL' ? 'bg-red-100 text-red-700 border-red-300' :
                          item.severity === 'MAJOR' ? 'bg-orange-100 text-orange-700 border-orange-300' :
                            'bg-yellow-100 text-yellow-700 border-yellow-300'
                          }`}>
                          {item.severity}
                        </Badge>
                      )}
                      {item.trainable !== undefined && (
                        <span className={`text-xs ${item.trainable ? 'text-green-600' : 'text-gray-500'}`}>
                          {item.trainable ? '✓ Trainable' : '✗ Not Trainable'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500 italic">No gaps identified</div>
          )}
        </div>
      </div>

      {/* Skill Analysis */}
      {profile.skillAnalysis && (
        <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-lg border border-green-200 dark:border-green-700">
          <h5 className="font-medium text-sm mb-3 flex items-center gap-2 text-green-800 dark:text-green-300">
            <Star className="h-4 w-4" />
            Skill Analysis
          </h5>

          {/* Skill Depth Summary */}
          {profile.skillAnalysis.skillDepthSummary && (
            <div className="grid grid-cols-4 gap-2 mb-3">
              <div className="text-center p-2 bg-green-100 dark:bg-green-900/50 rounded">
                <div className="text-lg font-bold text-green-700">{profile.skillAnalysis.skillDepthSummary.expert || 0}</div>
                <div className="text-xs text-green-600">Expert</div>
              </div>
              <div className="text-center p-2 bg-blue-100 dark:bg-blue-900/50 rounded">
                <div className="text-lg font-bold text-blue-700">{profile.skillAnalysis.skillDepthSummary.proficient || 0}</div>
                <div className="text-xs text-primary">Proficient</div>
              </div>
              <div className="text-center p-2 bg-yellow-100 dark:bg-yellow-900/50 rounded">
                <div className="text-lg font-bold text-yellow-700">{profile.skillAnalysis.skillDepthSummary.familiar || 0}</div>
                <div className="text-xs text-yellow-600">Familiar</div>
              </div>
              <div className="text-center p-2 bg-gray-100 dark:bg-gray-800 rounded">
                <div className="text-lg font-bold text-gray-600">{profile.skillAnalysis.skillDepthSummary.listedOnly || 0}</div>
                <div className="text-xs text-gray-500">Listed Only</div>
              </div>
            </div>
          )}

          {/* Matched Skills */}
          {profile.skillAnalysis.matchedSkills && profile.skillAnalysis.matchedSkills.length > 0 && (
            <div className="mb-2">
              <span className="text-xs font-medium text-green-700">Matched Skills:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {profile.skillAnalysis.matchedSkills.map((s: any, i: number) => (
                  <Badge key={i} variant="outline" className={`text-xs ${getSkillDepthColor(s.depth)}`}>
                    {s.skill} <span className="opacity-70 ml-1">{s.depth}</span>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Missing Skills */}
          {profile.skillAnalysis.missingSkills && profile.skillAnalysis.missingSkills.length > 0 && (
            <div className="mt-2">
              <span className="text-xs font-medium text-red-700">Missing Skills:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {profile.skillAnalysis.missingSkills.map((s: any, i: number) => (
                  <Badge key={i} variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                    {s.skill || s}
                    {s.importance && <span className="opacity-70 ml-1">({s.importance})</span>}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Experience Analysis */}
      {profile.experienceAnalysis && (
        <div className="p-3 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
          <h5 className="font-medium text-sm mb-3 flex items-center gap-2 text-blue-800 dark:text-blue-300">
            <Briefcase className="h-4 w-4" />
            Experience Analysis
          </h5>

          {profile.experienceAnalysis.experienceSummary && (
            <p className="text-xs text-gray-700 dark:text-gray-300 mb-3 p-2 bg-white/60 dark:bg-slate-800/60 rounded border border-blue-100 dark:border-blue-800">
              {profile.experienceAnalysis.experienceSummary}
            </p>
          )}

          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="text-center p-2 bg-white dark:bg-slate-800 rounded border dark:border-gray-600">
              <div className="text-lg font-bold text-blue-700 dark:text-blue-400">
                {profile.experienceAnalysis.totalYears || 0}y
              </div>
              <div className="text-xs text-gray-500">Total Experience</div>
            </div>
            <div className="text-center p-2 bg-white dark:bg-slate-800 rounded border dark:border-gray-600">
              <div className="text-lg font-bold text-green-700">
                {profile.experienceAnalysis.relevantYears || 0}y
              </div>
              <div className="text-xs text-gray-500">Relevant</div>
            </div>
            <div className="text-center p-2 bg-white dark:bg-slate-800 rounded border dark:border-gray-600">
              <Badge className={`${getProgressionColor(profile.experienceAnalysis.careerProgression)} text-xs`}>
                {profile.experienceAnalysis.careerProgression || 'N/A'}
              </Badge>
              <div className="text-xs text-gray-500 mt-1">Progression</div>
            </div>
          </div>

          {/* Key Projects */}
          {profile.experienceAnalysis.keyProjects && profile.experienceAnalysis.keyProjects.length > 0 && (
            <div className="mt-2">
              <span className="text-xs font-medium text-blue-700">Key Projects Discussed:</span>
              <div className="space-y-2 mt-1">
                {profile.experienceAnalysis.keyProjects.slice(0, 3).map((project: any, i: number) => (
                  <div key={i} className="text-xs p-2 bg-white dark:bg-slate-800 rounded border dark:border-gray-600">
                    <div className="font-medium">{project.project}</div>
                    {project.role && <div className="text-gray-500">Role: {project.role}</div>}
                    {project.impact && <div className="text-green-600">Impact: {project.impact}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Communication Analysis */}
      {profile.communicationAnalysis && (
        <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 rounded-lg border border-purple-200 dark:border-purple-700">
          <h5 className="font-medium text-sm mb-3 flex items-center gap-2 text-purple-800 dark:text-purple-300">
            <MessageSquare className="h-4 w-4" />
            Communication Analysis
          </h5>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="text-center p-2 bg-white dark:bg-slate-800 rounded border dark:border-gray-600">
              <div className="text-lg font-bold text-purple-700">{profile.communicationAnalysis.overallScore || 0}</div>
              <div className="text-xs text-gray-500">Overall</div>
            </div>
            {profile.communicationAnalysis.clarity && (
              <div className="text-center p-2 bg-white dark:bg-slate-800 rounded border dark:border-gray-600">
                <div className="text-lg font-bold text-purple-700">{profile.communicationAnalysis.clarity.score || 0}</div>
                <div className="text-xs text-gray-500">Clarity</div>
              </div>
            )}
            {profile.communicationAnalysis.structuredThinking && (
              <div className="text-center p-2 bg-white dark:bg-slate-800 rounded border dark:border-gray-600">
                <div className="text-lg font-bold text-purple-700">{profile.communicationAnalysis.structuredThinking.score || 0}</div>
                <div className="text-xs text-gray-500">Structure</div>
              </div>
            )}
            {profile.communicationAnalysis.listeningSkills && (
              <div className="text-center p-2 bg-white dark:bg-slate-800 rounded border dark:border-gray-600">
                <div className="text-lg font-bold text-purple-700">{profile.communicationAnalysis.listeningSkills.score || 0}</div>
                <div className="text-xs text-gray-500">Listening</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quantified Achievements */}
      {profile.quantifiedAchievements && profile.quantifiedAchievements.length > 0 && (
        <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 rounded-lg border border-amber-200 dark:border-amber-700">
          <h5 className="font-medium text-sm mb-3 flex items-center gap-2 text-amber-800 dark:text-amber-300">
            <Award className="h-4 w-4" />
            Quantified Achievements ({profile.quantifiedAchievements.length})
          </h5>
          <div className="space-y-2">
            {profile.quantifiedAchievements.map((achievement: any, i: number) => (
              <div key={i} className="p-2 bg-white dark:bg-slate-800 rounded border dark:border-gray-600 flex items-start justify-between">
                <div className="flex-1">
                  <div className="text-sm">{achievement.achievement}</div>
                  {achievement.metric && (
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded mt-1 inline-block">
                      {achievement.metric}
                    </span>
                  )}
                </div>
                {achievement.category && (
                  <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700">
                    {achievement.category}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Profile - Professional Identity (V5 structure) */}
      {profile.detailed_profile?.professional_identity && (
        <div className="p-3 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
          <h5 className="font-medium text-sm mb-3 flex items-center gap-2 text-blue-800 dark:text-blue-300">
            <User className="h-4 w-4" />
            Professional Identity
          </h5>
          <div className="space-y-2">
            {profile.detailed_profile.professional_identity.current_role_level && (
              <div className="text-sm">
                <span className="font-medium">Current Role:</span> {profile.detailed_profile.professional_identity.current_role_level}
              </div>
            )}
            {profile.detailed_profile.professional_identity.years_experience_indicated && (
              <div className="text-sm">
                <span className="font-medium">Years Experience:</span> {profile.detailed_profile.professional_identity.years_experience_indicated}
              </div>
            )}
            {profile.detailed_profile.professional_identity.career_stage && (
              <div className="text-sm">
                <span className="font-medium">Career Stage:</span>
                <Badge variant="outline" className="ml-2 text-xs">
                  {profile.detailed_profile.professional_identity.career_stage.replace(/_/g, ' ')}
                </Badge>
              </div>
            )}
            {profile.detailed_profile.professional_identity.identity_summary && (
              <p className="text-xs text-gray-700 dark:text-gray-300 mt-2">
                {profile.detailed_profile.professional_identity.identity_summary}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Detailed Profile - Skills Demonstrated (V5 structure) */}
      {profile.detailed_profile?.skills_demonstrated && (
        <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-lg border border-green-200 dark:border-green-700">
          <h5 className="font-medium text-sm mb-3 flex items-center gap-2 text-green-800 dark:text-green-300">
            <Star className="h-4 w-4" />
            Skills Demonstrated
          </h5>
          {profile.detailed_profile.skills_demonstrated.technical_skills && profile.detailed_profile.skills_demonstrated.technical_skills.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-semibold text-green-700 mb-1">Technical Skills</div>
              <div className="flex flex-wrap gap-1">
                {profile.detailed_profile.skills_demonstrated.technical_skills.map((skill: any, i: number) => (
                  <Badge key={i} variant="outline" className={`text-xs ${getSkillDepthColor(skill.demonstrated_level)}`}>
                    {skill.skill} <span className="opacity-70 ml-1">({skill.demonstrated_level?.replace(/_/g, ' ')})</span>
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {profile.detailed_profile.skills_demonstrated.soft_skills && profile.detailed_profile.skills_demonstrated.soft_skills.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-indigo-700 mb-1">Soft Skills</div>
              <div className="flex flex-wrap gap-1">
                {profile.detailed_profile.skills_demonstrated.soft_skills.map((skill: any, i: number) => (
                  <Badge key={i} variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200">
                    {skill.skill} <span className="opacity-70 ml-1">({skill.demonstrated_level?.replace(/_/g, ' ')})</span>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Interview Recommendations - Support both V5 and legacy */}
      {(profile.interviewRecommendations || profile.hiring_guidance) && (
        <div className="p-3 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/30 dark:to-cyan-900/30 rounded-lg border border-teal-200 dark:border-teal-700">
          <h5 className="font-medium text-sm mb-3 flex items-center gap-2 text-teal-800 dark:text-teal-300">
            <Target className="h-4 w-4" />
            Follow-up Recommendations
          </h5>
          <div className="space-y-3">
            {/* V5 structure uses hiring_guidance.suggested_follow_up_questions */}
            {profile.hiring_guidance?.suggested_follow_up_questions?.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-teal-700 dark:text-teal-300 mb-1">Suggested Follow-up Questions</div>
                <ul className="space-y-1">
                  {profile.hiring_guidance.suggested_follow_up_questions.map((item: string, i: number) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-teal-600">→</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {/* Legacy structure uses interviewRecommendations */}
            {profile.interviewRecommendations?.mustExplore?.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-teal-700 dark:text-teal-300 mb-1">Must Explore in Next Round</div>
                <ul className="space-y-1">
                  {profile.interviewRecommendations.mustExplore.map((item: string, i: number) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-teal-600">→</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {profile.interviewRecommendations?.technicalValidation?.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-blue-700 mb-1">Technical Validation Needed</div>
                <ul className="space-y-1">
                  {profile.interviewRecommendations.technicalValidation.map((item: string, i: number) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-primary">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {profile.hiring_guidance?.interview_tips_for_next_round?.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-blue-700 mb-1">Interview Tips for Next Round</div>
                <ul className="space-y-1">
                  {profile.hiring_guidance.interview_tips_for_next_round.map((item: string, i: number) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-primary">→</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {profile.hiring_guidance?.risk_factors_to_investigate?.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-orange-700 mb-1">Risk Factors to Investigate</div>
                <ul className="space-y-1">
                  {profile.hiring_guidance.risk_factors_to_investigate.map((item: string, i: number) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-orange-600">⚠</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Red Flags */}
      {profile.redFlags && profile.redFlags.length > 0 && (
        <div className="p-3 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/30 dark:to-pink-900/30 rounded-lg border border-red-200 dark:border-red-700">
          <h5 className="font-medium text-sm mb-3 flex items-center gap-2 text-red-800 dark:text-red-300">
            <AlertTriangle className="h-4 w-4" />
            Red Flags ({profile.redFlags.length})
          </h5>
          <div className="space-y-2">
            {profile.redFlags.map((flag: any, i: number) => (
              <div key={i} className="p-2 bg-white dark:bg-slate-800 rounded border border-red-200 dark:border-red-700">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">{flag.type || "FLAG"}</Badge>
                  <Badge
                    variant="outline"
                    className={`text-xs ${flag.severity === "HIGH" || flag.severity === "CRITICAL"
                      ? "bg-red-100 text-red-700"
                      : "bg-yellow-100 text-yellow-700"
                      }`}
                  >
                    {flag.severity || "MEDIUM"}
                  </Badge>
                </div>
                <div className="text-sm font-medium">{flag.issue}</div>
                {flag.evidence && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Evidence: {flag.evidence}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interview Transcript Insights */}
      {profile.interviewMetadata && (
        <div className="p-3 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900/50 dark:to-gray-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
          <h5 className="font-medium text-sm mb-3 flex items-center gap-2 text-slate-800 dark:text-slate-300">
            <MessageSquare className="h-4 w-4" />
            Interview Transcript Insights
          </h5>

          {/* Session Details */}
          {profile.interviewMetadata.sessionDetails && (
            <div className="mb-4">
              <h6 className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Session Overview</h6>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="p-2 bg-white dark:bg-slate-800 rounded border dark:border-gray-600 text-center">
                  <div className="text-lg font-bold text-slate-700 dark:text-slate-300">
                    {profile.interviewMetadata.sessionDetails.questionsAsked || 0}
                  </div>
                  <div className="text-xs text-gray-500">Questions Asked</div>
                </div>
                <div className="p-2 bg-white dark:bg-slate-800 rounded border dark:border-gray-600 text-center">
                  <div className="text-lg font-bold text-slate-700 dark:text-slate-300">
                    {profile.interviewMetadata.sessionDetails.responsesProvided || 0}
                  </div>
                  <div className="text-xs text-gray-500">Responses</div>
                </div>
                <div className="p-2 bg-white dark:bg-slate-800 rounded border dark:border-gray-600 text-center">
                  <div className="text-lg font-bold text-slate-700 dark:text-slate-300">
                    {profile.interviewMetadata.sessionDetails.totalResponseWords || 0}
                  </div>
                  <div className="text-xs text-gray-500">Total Words</div>
                </div>
                <div className="p-2 bg-white dark:bg-slate-800 rounded border dark:border-gray-600 text-center">
                  <div className="text-lg font-bold text-slate-700 dark:text-slate-300">
                    {profile.interviewMetadata.sessionDetails.estimatedSpeakingTimeMinutes || 0}
                  </div>
                  <div className="text-xs text-gray-500">Minutes Speaking</div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-gray-500">Interview Duration:</span>
                <Badge variant="outline" className={`text-xs ${profile.interviewMetadata.sessionDetails.interviewDurationCategory === 'COMPREHENSIVE' ? 'bg-green-50 text-green-700 border-green-200' :
                  profile.interviewMetadata.sessionDetails.interviewDurationCategory === 'STANDARD' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    profile.interviewMetadata.sessionDetails.interviewDurationCategory === 'BRIEF' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                      'bg-red-50 text-red-700 border-red-200'
                  }`}>
                  {profile.interviewMetadata.sessionDetails.interviewDurationCategory || 'N/A'}
                </Badge>
                {profile.interviewMetadata.sessionDetails.averageResponseLength && (
                  <span className="text-xs text-gray-500 ml-2">
                    Avg. Response: {profile.interviewMetadata.sessionDetails.averageResponseLength} chars
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Engagement & Quality Analysis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Engagement Metrics */}
            {profile.interviewMetadata.engagementMetrics && (
              <div className="p-3 bg-white dark:bg-slate-800 rounded border dark:border-gray-600">
                <h6 className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-2 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Engagement Analysis
                </h6>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Engagement Level</span>
                    <Badge variant="outline" className={`text-xs ${profile.interviewMetadata.engagementMetrics.engagementLevel === 'HIGH' ? 'bg-green-50 text-green-700 border-green-200' :
                      profile.interviewMetadata.engagementMetrics.engagementLevel === 'MEDIUM' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                        'bg-red-50 text-red-700 border-red-200'
                      }`}>
                      {profile.interviewMetadata.engagementMetrics.engagementLevel || 'N/A'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Response Style</span>
                    <Badge variant="outline" className={`text-xs ${profile.interviewMetadata.engagementMetrics.responseProactiveness === 'PROACTIVE' ? 'bg-green-50 text-green-700 border-green-200' :
                      profile.interviewMetadata.engagementMetrics.responseProactiveness === 'RESPONSIVE' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-gray-50 text-gray-600 border-gray-200'
                      }`}>
                      {profile.interviewMetadata.engagementMetrics.responseProactiveness || 'N/A'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Preparation Level</span>
                    <Badge variant="outline" className={`text-xs ${profile.interviewMetadata.engagementMetrics.preparationLevel === 'HIGH' ? 'bg-green-50 text-green-700 border-green-200' :
                      profile.interviewMetadata.engagementMetrics.preparationLevel === 'MEDIUM' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                        'bg-red-50 text-red-700 border-red-200'
                      }`}>
                      {profile.interviewMetadata.engagementMetrics.preparationLevel || 'N/A'}
                    </Badge>
                  </div>
                  {profile.interviewMetadata.engagementMetrics.enthusiasmIndicators && (
                    <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                      <span className="text-xs text-gray-500">Enthusiasm: </span>
                      <span className="text-xs text-gray-700 dark:text-gray-300">
                        {profile.interviewMetadata.engagementMetrics.enthusiasmIndicators}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Transcript Quality */}
            {profile.interviewMetadata.transcriptQuality && (
              <div className="p-3 bg-white dark:bg-slate-800 rounded border dark:border-gray-600">
                <h6 className="text-xs font-semibold text-purple-700 dark:text-purple-400 mb-2 flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  Response Quality
                </h6>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Content Depth</span>
                    <Badge variant="outline" className={`text-xs ${profile.interviewMetadata.transcriptQuality.contentDepth === 'DEEP' ? 'bg-green-50 text-green-700 border-green-200' :
                      profile.interviewMetadata.transcriptQuality.contentDepth === 'MODERATE' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        profile.interviewMetadata.transcriptQuality.contentDepth === 'SURFACE' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                          'bg-red-50 text-red-700 border-red-200'
                      }`}>
                      {profile.interviewMetadata.transcriptQuality.contentDepth || 'N/A'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Analysis Quality</span>
                    <Badge variant="outline" className={`text-xs ${profile.interviewMetadata.transcriptQuality.analysisQuality === 'EXCELLENT' ? 'bg-green-50 text-green-700 border-green-200' :
                      profile.interviewMetadata.transcriptQuality.analysisQuality === 'GOOD' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        profile.interviewMetadata.transcriptQuality.analysisQuality === 'ADEQUATE' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                          'bg-red-50 text-red-700 border-red-200'
                      }`}>
                      {profile.interviewMetadata.transcriptQuality.analysisQuality || 'N/A'}
                    </Badge>
                  </div>
                  {profile.interviewMetadata.transcriptQuality.exampleQuality && (
                    <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                      <span className="text-xs text-gray-500">Example Quality: </span>
                      <span className="text-xs text-gray-700 dark:text-gray-300">
                        {profile.interviewMetadata.transcriptQuality.exampleQuality}
                      </span>
                    </div>
                  )}
                  {profile.interviewMetadata.transcriptQuality.authenticityIndicators && (
                    <div className="mt-1">
                      <span className="text-xs text-gray-500">Authenticity: </span>
                      <span className="text-xs text-gray-700 dark:text-gray-300">
                        {profile.interviewMetadata.transcriptQuality.authenticityIndicators}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Assessment Confidence - Check both locations for backward compatibility */}
          {(profile.assessmentConfidence || profile.interviewMetadata?.assessmentConfidence) && (
            <div className="mt-3 p-3 bg-white dark:bg-slate-800 rounded border dark:border-gray-600">
              <h6 className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 mb-2 flex items-center gap-1">
                <Target className="h-3 w-3" />
                Assessment Confidence
              </h6>
              {(() => {
                // Use assessmentConfidence directly if available, otherwise fallback to interviewMetadata
                const assessmentConfidence = profile.assessmentConfidence || profile.interviewMetadata?.assessmentConfidence;
                return (
                  <>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Badge variant="outline" className={`text-xs ${assessmentConfidence.overallConfidence === 'VERY_HIGH' ||
                        assessmentConfidence.overallConfidence === 'HIGH' ? 'bg-green-50 text-green-700 border-green-200' :
                        assessmentConfidence.overallConfidence === 'MEDIUM' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                          'bg-red-50 text-red-700 border-red-200'
                        }`}>
                        {assessmentConfidence.overallConfidence?.replace('_', ' ') || 'N/A'} Confidence
                      </Badge>
                      <Badge variant="outline" className={`text-xs ${assessmentConfidence.dataSufficiency === 'SUFFICIENT' ? 'bg-green-50 text-green-700 border-green-200' :
                        assessmentConfidence.dataSufficiency === 'ADEQUATE' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          assessmentConfidence.dataSufficiency === 'LIMITED' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                            'bg-red-50 text-red-700 border-red-200'
                        }`}>
                        Data: {assessmentConfidence.dataSufficiency || 'N/A'}
                      </Badge>
                    </div>
                    {assessmentConfidence.dataLimitations &&
                      assessmentConfidence.dataLimitations.length > 0 && (
                        <div className="mt-2">
                          <span className="text-xs font-medium text-orange-600 dark:text-orange-400">Data Limitations:</span>
                          <ul className="mt-1 space-y-1">
                            {assessmentConfidence.dataLimitations.map((limitation: string, i: number) => (
                              <li key={i} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-1">
                                <span className="text-orange-500">⚠</span>
                                {limitation}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    {assessmentConfidence.confidenceEnhancers &&
                      assessmentConfidence.confidenceEnhancers.length > 0 && (
                        <div className="mt-2">
                          <span className="text-xs font-medium text-green-600 dark:text-green-400">Confidence Enhancers:</span>
                          <ul className="mt-1 space-y-1">
                            {assessmentConfidence.confidenceEnhancers.map((enhancer: string, i: number) => (
                              <li key={i} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-1">
                                <span className="text-green-500">✓</span>
                                {enhancer}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                  </>
                );
              })()}
            </div>
          )}
          <ul className="mt-1 space-y-1">
            {profile.interviewMetadata.assessmentConfidence.confidenceEnhancers.map((enhancer: string, i: number) => (
              <li key={i} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-1">
                <span className="text-green-500">✓</span>
                {enhancer}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Behavioral & Psychological Insights */}
      {(profile.behavioralIndicators || profile.psycholinguisticAnalysis) && (
        <div className="p-3 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-900/30 dark:to-violet-900/30 rounded-lg border border-indigo-200 dark:border-indigo-700">
          <h5 className="font-medium text-sm mb-3 flex items-center gap-2 text-indigo-800 dark:text-indigo-300">
            <Brain className="h-4 w-4" />
            Behavioral & Psychological Insights
          </h5>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Emotional Intelligence */}
            {profile.behavioralIndicators?.emotionalIntelligence && (
              <div className="p-3 bg-white dark:bg-slate-800 rounded border dark:border-gray-600">
                <h6 className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 mb-2">Emotional Intelligence</h6>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 dark:text-gray-400">EQ Score</span>
                    <span className={`text-sm font-bold ${getScoreColor(profile.behavioralIndicators.emotionalIntelligence.score || 0)}`}>
                      {profile.behavioralIndicators.emotionalIntelligence.score || 0}/100
                    </span>
                  </div>
                  {profile.behavioralIndicators.emotionalIntelligence.selfAwareness && (
                    <div className="text-xs">
                      <span className="text-gray-500">Self-Awareness:</span>
                      <span className="text-gray-700 dark:text-gray-300 ml-1">
                        {profile.behavioralIndicators.emotionalIntelligence.selfAwareness}
                      </span>
                    </div>
                  )}
                  {profile.behavioralIndicators.emotionalIntelligence.empathy && (
                    <div className="text-xs">
                      <span className="text-gray-500">Empathy:</span>
                      <span className="text-gray-700 dark:text-gray-300 ml-1">
                        {profile.behavioralIndicators.emotionalIntelligence.empathy}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Work Style */}
            {profile.behavioralIndicators?.workStyle && (
              <div className="p-3 bg-white dark:bg-slate-800 rounded border dark:border-gray-600">
                <h6 className="text-xs font-semibold text-violet-700 dark:text-violet-400 mb-2">Work Style Preferences</h6>
                <div className="space-y-2">
                  {profile.behavioralIndicators.workStyle.preferredEnvironment &&
                    profile.behavioralIndicators.workStyle.preferredEnvironment !== 'Not assessed.' && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600 dark:text-gray-400">Environment</span>
                        <Badge variant="outline" className="text-xs bg-violet-50 text-violet-700 border-violet-200">
                          {profile.behavioralIndicators.workStyle.preferredEnvironment}
                        </Badge>
                      </div>
                    )}
                  {profile.behavioralIndicators.workStyle.collaborationStyle &&
                    profile.behavioralIndicators.workStyle.collaborationStyle !== 'Not assessed.' && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600 dark:text-gray-400">Collaboration</span>
                        <Badge variant="outline" className="text-xs bg-violet-50 text-violet-700 border-violet-200">
                          {profile.behavioralIndicators.workStyle.collaborationStyle}
                        </Badge>
                      </div>
                    )}
                  {profile.behavioralIndicators.workStyle.stressHandling &&
                    profile.behavioralIndicators.workStyle.stressHandling !== 'Not assessed.' && (
                      <div className="text-xs">
                        <span className="text-gray-500">Stress Handling:</span>
                        <span className="text-gray-700 dark:text-gray-300 ml-1">
                          {profile.behavioralIndicators.workStyle.stressHandling}
                        </span>
                      </div>
                    )}
                </div>
              </div>
            )}

            {/* Personality Indicators (Big Five) */}
            {profile.psycholinguisticAnalysis?.personalityIndicators && (
              <div className="p-3 bg-white dark:bg-slate-800 rounded border dark:border-gray-600 md:col-span-2">
                <h6 className="text-xs font-semibold text-purple-700 dark:text-purple-400 mb-2">Personality Indicators (Big Five)</h6>
                <div className="grid grid-cols-5 gap-2">
                  {['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'].map((trait) => {
                    const traitData = profile.psycholinguisticAnalysis.personalityIndicators[trait];
                    if (!traitData) return null;
                    return (
                      <div key={trait} className="text-center p-2 bg-gray-50 dark:bg-gray-900/50 rounded">
                        <div className={`text-sm font-bold ${getScoreColor(traitData.score || 0)}`}>
                          {traitData.score || 0}
                        </div>
                        <div className="text-xs text-gray-500 capitalize">{trait.slice(0, 4)}.</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Cognitive Style */}
            {profile.psycholinguisticAnalysis?.cognitiveStyle && (
              <div className="p-3 bg-white dark:bg-slate-800 rounded border dark:border-gray-600">
                <h6 className="text-xs font-semibold text-cyan-700 dark:text-cyan-400 mb-2">Cognitive Style</h6>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Analytical</span>
                    <span className={`text-sm font-bold ${getScoreColor(profile.psycholinguisticAnalysis.cognitiveStyle.analyticalThinking || 0)}`}>
                      {profile.psycholinguisticAnalysis.cognitiveStyle.analyticalThinking || 0}/100
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Creative</span>
                    <span className={`text-sm font-bold ${getScoreColor(profile.psycholinguisticAnalysis.cognitiveStyle.creativeThinking || 0)}`}>
                      {profile.psycholinguisticAnalysis.cognitiveStyle.creativeThinking || 0}/100
                    </span>
                  </div>
                  {profile.psycholinguisticAnalysis.cognitiveStyle.decisionMaking &&
                    profile.psycholinguisticAnalysis.cognitiveStyle.decisionMaking !== 'N/A' && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600 dark:text-gray-400">Decision Making</span>
                        <Badge variant="outline" className="text-xs bg-cyan-50 text-cyan-700 border-cyan-200">
                          {profile.psycholinguisticAnalysis.cognitiveStyle.decisionMaking}
                        </Badge>
                      </div>
                    )}
                </div>
              </div>
            )}

            {/* Authenticity */}
            {profile.psycholinguisticAnalysis?.authenticity && (
              <div className="p-3 bg-white dark:bg-slate-800 rounded border dark:border-gray-600">
                <h6 className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-2">Response Authenticity</h6>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Authenticity Score</span>
                    <span className={`text-sm font-bold ${getScoreColor(profile.psycholinguisticAnalysis.authenticity.score || 0)}`}>
                      {profile.psycholinguisticAnalysis.authenticity.score || 0}/100
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Genuine Responses</span>
                    <span className={`text-xs ${profile.psycholinguisticAnalysis.authenticity.genuineResponses ? 'text-green-600' : 'text-red-600'}`}>
                      {profile.psycholinguisticAnalysis.authenticity.genuineResponses ? '✓ Yes' : '✗ No'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Consistent Answers</span>
                    <span className={`text-xs ${profile.psycholinguisticAnalysis.authenticity.consistencyAcrossAnswers ? 'text-green-600' : 'text-red-600'}`}>
                      {profile.psycholinguisticAnalysis.authenticity.consistencyAcrossAnswers ? '✓ Yes' : '✗ No'}
                    </span>
                  </div>
                  {profile.psycholinguisticAnalysis.authenticity.contradictions &&
                    profile.psycholinguisticAnalysis.authenticity.contradictions.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                        <span className="text-xs font-medium text-red-600">Contradictions Detected:</span>
                        <ul className="mt-1">
                          {profile.psycholinguisticAnalysis.authenticity.contradictions.map((c: string, i: number) => (
                            <li key={i} className="text-xs text-gray-600 dark:text-gray-400">• {c}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                </div>
              </div>
            )}
          </div>

          {/* Motivation Drivers */}
          {profile.behavioralIndicators?.motivationDrivers &&
            profile.behavioralIndicators.motivationDrivers.length > 0 && (
              <div className="mt-3 p-2 bg-white/60 dark:bg-slate-800/60 rounded border border-indigo-100 dark:border-indigo-800">
                <span className="text-xs font-medium text-indigo-700 dark:text-indigo-400">Motivation Drivers:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {profile.behavioralIndicators.motivationDrivers.map((driver: string, i: number) => (
                    <Badge key={i} variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200">
                      {driver}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
        </div>
      )}
    </div>
  );
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

  const regenerateProfileMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/applicants/${applicantId}/regenerate-profile`);
    },
    onSuccess: () => {
      // Invalidate queries to refetch applicant data with new profile
      queryClient.invalidateQueries({ queryKey: ["/api/applicants/detail", applicantId] });
    },
    onError: (error) => {
      console.error("Failed to regenerate profile:", error);
    },
  });

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
          <Button
            variant="outline"
            onClick={() => regenerateProfileMutation.mutate()}
            disabled={regenerateProfileMutation.isPending}
          >
            {regenerateProfileMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Brain className="w-4 h-4 mr-2" />
            )}
            Regenerate Profile
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
                                  <div key={index} className={`border-l-2 pl-3 py-1 ${item.role === 'assistant' ? 'border-blue-200' : 'border-green-200'
                                    }`}>
                                    <div className="flex items-start gap-2">
                                      <span className={`text-xs font-medium min-w-[80px] ${item.role === 'assistant'
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

          {/* Interview Profile Analysis Section */}
          {(() => {
            // Prioritize comprehensiveProfile.brutallyHonestProfile, then brutallyHonestProfile, then generatedProfile
            const profileToDisplay = applicant.comprehensiveProfile?.brutallyHonestProfile ||
              applicant.brutallyHonestProfile ||
              applicant.comprehensiveProfile ||
              applicant.generatedProfile;

            if (!profileToDisplay) return null;

            return (
              <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                      <Brain className="w-5 h-5 text-purple-500" />
                      Interview Profile Analysis
                    </CardTitle>
                    {(() => {
                      const overallScore = applicant.keyMetrics?.overallScore ||
                        applicant.keyMetrics?.scores?.overallScore ||
                        profileToDisplay?.overallScore ||
                        profileToDisplay?.scores?.overall_score?.value ||
                        applicant.generatedProfile?.matchScorePercentage;
                      if (overallScore !== undefined) {
                        return (
                          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${getScoreBgColor(overallScore)}`}>
                            <span className={`text-3xl font-bold ${getScoreColor(overallScore)}`}>
                              {overallScore}
                            </span>
                            <span className="text-sm text-slate-600 dark:text-slate-400">/100</span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <InterviewProfileAnalysis profile={profileToDisplay} />
                </CardContent>
              </Card>
            );
          })()}

          {/* Honest Profile Section - Display separately if available */}
          {applicant.honestProfile && (
            <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                  <MessageSquare className="w-5 h-5 text-blue-500" />
                  Honest Assessment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {applicant.honestProfile.profileSummary && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Profile Summary</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{applicant.honestProfile.profileSummary}</p>
                  </div>
                )}

                {applicant.honestProfile.strengths && applicant.honestProfile.strengths.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-green-700 dark:text-green-400 mb-2">Strengths</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {applicant.honestProfile.strengths.map((strength: string, i: number) => (
                        <li key={i} className="text-sm text-slate-600 dark:text-slate-400">{strength}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {applicant.honestProfile.criticalWeaknesses && applicant.honestProfile.criticalWeaknesses.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">Critical Weaknesses</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {applicant.honestProfile.criticalWeaknesses.map((weakness: string, i: number) => (
                        <li key={i} className="text-sm text-slate-600 dark:text-slate-400">{weakness}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {applicant.honestProfile.skillAssessment && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Skill Assessment</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{applicant.honestProfile.skillAssessment}</p>
                  </div>
                )}

                {applicant.honestProfile.redFlags && applicant.honestProfile.redFlags.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">Red Flags</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {applicant.honestProfile.redFlags.map((flag: string, i: number) => (
                        <li key={i} className="text-sm text-slate-600 dark:text-slate-400">{flag}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {applicant.honestProfile.hirabilityScore !== undefined && (
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Hirability Score: </span>
                      <span className={`text-lg font-bold ${getScoreColor(applicant.honestProfile.hirabilityScore * 10)}`}>
                        {applicant.honestProfile.hirabilityScore}/10
                      </span>
                    </div>
                    {applicant.honestProfile.recommendedRole && (
                      <div>
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Recommended Role: </span>
                        <span className="text-sm text-slate-600 dark:text-slate-400">{applicant.honestProfile.recommendedRole}</span>
                      </div>
                    )}
                  </div>
                )}

                {applicant.honestProfile.salaryRange && (
                  <div>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Salary Range: </span>
                    <span className="text-sm text-slate-600 dark:text-slate-400">{applicant.honestProfile.salaryRange}</span>
                  </div>
                )}

                {applicant.honestProfile.notes && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Notes</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{applicant.honestProfile.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Score Cards (if profile has dimension scores) - Support V5 and legacy structures */}
          {(() => {
            const profile = applicant.comprehensiveProfile?.brutallyHonestProfile ||
              applicant.brutallyHonestProfile ||
              applicant.comprehensiveProfile ||
              applicant.generatedProfile;
            const scores = profile?.scores || {};
            const keyMetricsScores = applicant.keyMetrics?.scores || {};
            const hasScores =
              applicant.technicalSkillsScore !== undefined ||
              applicant.experienceScore !== undefined ||
              applicant.culturalFitScore !== undefined ||
              applicant.communicationScore !== undefined ||
              applicant.selfAwarenessScore !== undefined ||
              applicant.jobFitScore !== undefined ||
              profile?.technicalSkillsScore !== undefined ||
              profile?.experienceScore !== undefined ||
              profile?.culturalFitScore !== undefined ||
              profile?.communicationScore !== undefined ||
              keyMetricsScores.technicalSkillsScore !== undefined ||
              keyMetricsScores.experienceScore !== undefined ||
              keyMetricsScores.culturalFitScore !== undefined ||
              keyMetricsScores.communicationScore !== undefined ||
              scores.technical_competence !== undefined ||
              scores.experience_quality !== undefined ||
              scores.cultural_collaboration_fit !== undefined ||
              scores.communication_presence !== undefined ||
              scores.self_awareness_growth !== undefined ||
              scores.job_specific_fit !== undefined ||
              profile?.gapSeverityScore !== undefined ||
              applicant.keyMetrics?.gapSeverityScore !== undefined ||
              profile?.answerQualityScore !== undefined ||
              applicant.keyMetrics?.answerQualityScore !== undefined ||
              profile?.cvConsistencyScore !== undefined ||
              applicant.keyMetrics?.cvConsistencyScore !== undefined;

            if (!hasScores) return null;

            // Extract scores from keyMetrics, applicant, profile, or V5 structure
            const technicalScore = applicant.technicalSkillsScore ||
              keyMetricsScores.technicalSkillsScore ||
              profile?.technicalSkillsScore ||
              Math.round(scores.technical_competence?.final_score || scores.technical_competence?.score || 0);
            const experienceScore = applicant.experienceScore ||
              keyMetricsScores.experienceScore ||
              profile?.experienceScore ||
              Math.round(scores.experience_quality?.final_score || scores.experience_quality?.score || 0);
            const culturalFitScore = applicant.culturalFitScore ||
              keyMetricsScores.culturalFitScore ||
              profile?.culturalFitScore ||
              Math.round(scores.cultural_collaboration_fit?.final_score || scores.cultural_collaboration_fit?.score || 0);
            const communicationScore = applicant.communicationScore ||
              keyMetricsScores.communicationScore ||
              profile?.communicationScore ||
              Math.round(scores.communication_presence?.final_score || scores.communication_presence?.score || 0);
            const selfAwarenessScore = applicant.selfAwarenessScore ||
              Math.round(scores.self_awareness_growth?.final_score || scores.self_awareness_growth?.score || 0);
            const jobFitScore = applicant.jobFitScore ||
              Math.round(scores.job_specific_fit?.final_score || scores.job_specific_fit?.score ||
                scores.general_employability?.final_score || scores.general_employability?.score || 0);

            return (
              <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                    <Target className="w-5 h-5 text-blue-500" />
                    Dimension Scores
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {technicalScore > 0 && (
                      <div className={`p-4 rounded-lg text-center ${getScoreBgColor(technicalScore)}`}>
                        <div className={`text-2xl font-bold ${getScoreColor(technicalScore)}`}>
                          {technicalScore}%
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Technical Skills</div>
                      </div>
                    )}
                    {experienceScore > 0 && (
                      <div className={`p-4 rounded-lg text-center ${getScoreBgColor(experienceScore)}`}>
                        <div className={`text-2xl font-bold ${getScoreColor(experienceScore)}`}>
                          {experienceScore}%
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Experience</div>
                      </div>
                    )}
                    {culturalFitScore > 0 && (
                      <div className={`p-4 rounded-lg text-center ${getScoreBgColor(culturalFitScore)}`}>
                        <div className={`text-2xl font-bold ${getScoreColor(culturalFitScore)}`}>
                          {culturalFitScore}%
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Cultural Fit</div>
                      </div>
                    )}
                    {communicationScore > 0 && (
                      <div className={`p-4 rounded-lg text-center ${getScoreBgColor(communicationScore)}`}>
                        <div className={`text-2xl font-bold ${getScoreColor(communicationScore)}`}>
                          {communicationScore}%
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Communication</div>
                      </div>
                    )}
                    {selfAwarenessScore > 0 && (
                      <div className={`p-4 rounded-lg text-center ${getScoreBgColor(selfAwarenessScore)}`}>
                        <div className={`text-2xl font-bold ${getScoreColor(selfAwarenessScore)}`}>
                          {selfAwarenessScore}%
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Self-Awareness</div>
                      </div>
                    )}
                    {jobFitScore > 0 && (
                      <div className={`p-4 rounded-lg text-center ${getScoreBgColor(jobFitScore)}`}>
                        <div className={`text-2xl font-bold ${getScoreColor(jobFitScore)}`}>
                          {jobFitScore}%
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Job Fit</div>
                      </div>
                    )}
                    {profile?.leadershipScore !== undefined && (
                      <div className={`p-4 rounded-lg text-center ${getScoreBgColor(profile.leadershipScore)}`}>
                        <div className={`text-2xl font-bold ${getScoreColor(profile.leadershipScore)}`}>
                          {profile.leadershipScore}%
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Leadership</div>
                      </div>
                    )}
                    {/* New Quality Metrics */}
                    {(() => {
                      const gapSeverityScore = applicant.keyMetrics?.gapSeverityScore || profile?.gapSeverityScore;
                      const answerQualityScore = applicant.keyMetrics?.answerQualityScore || profile?.answerQualityScore;
                      const cvConsistencyScore = applicant.keyMetrics?.cvConsistencyScore || profile?.cvConsistencyScore;

                      return (
                        <>
                          {gapSeverityScore !== undefined && (
                            <div className={`p-4 rounded-lg text-center ${getGapSeverityBgColor(gapSeverityScore)}`}>
                              <div className={`text-2xl font-bold ${getGapSeverityColor(gapSeverityScore)}`}>
                                {gapSeverityScore}%
                              </div>
                              <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Gap Severity</div>
                              <div className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">(Higher = Worse)</div>
                            </div>
                          )}
                          {answerQualityScore !== undefined && (
                            <div className={`p-4 rounded-lg text-center ${getScoreBgColor(answerQualityScore)}`}>
                              <div className={`text-2xl font-bold ${getScoreColor(answerQualityScore)}`}>
                                {answerQualityScore}%
                              </div>
                              <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Answer Quality</div>
                            </div>
                          )}
                          {cvConsistencyScore !== undefined && (
                            <div className={`p-4 rounded-lg text-center ${getScoreBgColor(cvConsistencyScore)}`}>
                              <div className={`text-2xl font-bold ${getScoreColor(cvConsistencyScore)}`}>
                                {cvConsistencyScore}%
                              </div>
                              <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">CV Consistency</div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            );
          })()}
        </div>
      </ScrollArea>
    </div>
  );
}