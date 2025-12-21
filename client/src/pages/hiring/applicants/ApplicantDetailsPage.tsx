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

  return (
    <div className="p-4 space-y-4 bg-white dark:bg-slate-900">
      {/* Executive Summary */}
      {profile.executiveSummary && (
        <div className="p-3 rounded-lg bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold">{profile.executiveSummary.oneLiner || 'Candidate Analysis'}</span>
            </div>
            <div className="flex items-center gap-2">
              {profile.executiveSummary.fitScore && (
                <Badge className={`text-xs ${
                  profile.executiveSummary.fitScore === 'EXCELLENT' ? 'bg-green-500' :
                  profile.executiveSummary.fitScore === 'GOOD' ? 'bg-primary' :
                  profile.executiveSummary.fitScore === 'FAIR' ? 'bg-yellow-500' :
                  profile.executiveSummary.fitScore === 'POOR' ? 'bg-orange-500' :
                  'bg-red-500'
                }`}>
                  {profile.executiveSummary.fitScore} FIT
                </Badge>
              )}
              {profile.executiveSummary.hiringUrgency && (
                <Badge className={`text-xs ${
                  profile.executiveSummary.hiringUrgency === 'EXPEDITE' ? 'bg-green-600' :
                  profile.executiveSummary.hiringUrgency === 'STANDARD' ? 'bg-primary' :
                  profile.executiveSummary.hiringUrgency === 'LOW_PRIORITY' ? 'bg-gray-600' :
                  'bg-red-600'
                }`}>
                  {profile.executiveSummary.hiringUrgency.replace('_', ' ')}
                </Badge>
              )}
            </div>
          </div>
          {profile.executiveSummary.uniqueValueProposition && (
            <p className="text-sm text-gray-300 mt-2">{profile.executiveSummary.uniqueValueProposition}</p>
          )}
        </div>
      )}

      {/* Verdict & Recommendation */}
      {profile.verdict && (
        <div className="p-4 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-gradient-to-r from-gray-50 to-white dark:from-slate-800 dark:to-slate-900">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Badge className={`text-lg px-4 py-2 font-bold ${getVerdictColor(profile.verdict.decision)}`}>
                {profile.verdict.decision === 'INTERVIEW' ? '✓ PROCEED TO HIRE' :
                 profile.verdict.decision === 'CONSIDER' ? '? CONSIDER' :
                 profile.verdict.decision === 'REVIEW' ? '⚠ NEEDS REVIEW' :
                 '✗ NOT SUITABLE'}
              </Badge>
              {profile.verdict.confidence && (
                <span className={`text-xs font-medium px-2 py-1 rounded ${
                  profile.verdict.confidence === 'HIGH' ? 'bg-green-100 text-green-700' :
                  profile.verdict.confidence === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {profile.verdict.confidence} Confidence
                </span>
              )}
              {profile.verdict.riskLevel && (
                <span className={`text-xs font-medium px-2 py-1 rounded ${
                  profile.verdict.riskLevel === 'LOW' ? 'bg-green-100 text-green-700' :
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

          {profile.verdict.summary && (
            <p className="text-base font-medium text-gray-800 dark:text-gray-200 mb-3">
              {profile.verdict.summary}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            {profile.verdict.topStrength && (
              <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-700">
                <div className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" /> TOP STRENGTH
                </div>
                <div className="text-sm text-green-800 dark:text-green-300">{profile.verdict.topStrength}</div>
              </div>
            )}
            {profile.verdict.topConcern && profile.verdict.topConcern !== 'None identified' && (
              <div className="p-3 bg-orange-50 dark:bg-orange-900/30 rounded-lg border border-orange-200 dark:border-orange-700">
                <div className="text-xs font-semibold text-orange-600 dark:text-orange-400 mb-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> TOP CONCERN
                </div>
                <div className="text-sm text-orange-800 dark:text-orange-300">{profile.verdict.topConcern}</div>
              </div>
            )}
          </div>

          {profile.verdict.dealbreakers && profile.verdict.dealbreakers.length > 0 && (
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

          {profile.recommendationReason && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 italic border-t border-gray-200 dark:border-gray-700 pt-3">
              {profile.recommendationReason}
            </p>
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

      {/* Strengths & Gaps */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Strengths */}
        <div className="p-3 bg-gradient-to-b from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-lg border border-green-200 dark:border-green-700">
          <h5 className="font-medium text-sm mb-3 flex items-center gap-2 text-green-800 dark:text-green-300">
            <CheckCircle className="h-4 w-4" />
            Strengths ({profile.strengthsHighlights?.length || 0})
          </h5>
          {profile.strengthsHighlights && profile.strengthsHighlights.length > 0 ? (
            <div className="space-y-2">
              {profile.strengthsHighlights.map((item: any, i: number) => (
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
                      <Badge variant="outline" className={`text-xs ml-2 ${
                        item.impact === 'HIGH' ? 'bg-green-100 text-green-700 border-green-300' :
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
          ) : (
            <div className="text-sm text-gray-500 italic">No strengths identified yet</div>
          )}
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
                <div key={i} className={`p-2 bg-white dark:bg-slate-800 rounded border ${
                  item.severity === 'CRITICAL' ? 'border-red-300' :
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
                        <Badge variant="outline" className={`text-xs ${
                          item.severity === 'CRITICAL' ? 'bg-red-100 text-red-700 border-red-300' :
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

      {/* Interview Recommendations */}
      {profile.interviewRecommendations && (
        <div className="p-3 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/30 dark:to-cyan-900/30 rounded-lg border border-teal-200 dark:border-teal-700">
          <h5 className="font-medium text-sm mb-3 flex items-center gap-2 text-teal-800 dark:text-teal-300">
            <Target className="h-4 w-4" />
            Follow-up Recommendations
          </h5>
          <div className="space-y-3">
            {profile.interviewRecommendations.mustExplore?.length > 0 && (
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
            {profile.interviewRecommendations.technicalValidation?.length > 0 && (
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
                    className={`text-xs ${
                      flag.severity === "HIGH" || flag.severity === "CRITICAL"
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

          {/* Interview Profile Analysis Section */}
          {applicant.brutallyHonestProfile && (
            <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                    <Brain className="w-5 h-5 text-purple-500" />
                    Interview Profile Analysis
                  </CardTitle>
                  {applicant.brutallyHonestProfile.overallScore !== undefined && (
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${getScoreBgColor(applicant.brutallyHonestProfile.overallScore)}`}>
                      <span className={`text-3xl font-bold ${getScoreColor(applicant.brutallyHonestProfile.overallScore)}`}>
                        {applicant.brutallyHonestProfile.overallScore}
                      </span>
                      <span className="text-sm text-slate-600 dark:text-slate-400">/100</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <InterviewProfileAnalysis profile={applicant.brutallyHonestProfile} />
              </CardContent>
            </Card>
          )}

          {/* Score Cards (if profile has dimension scores) */}
          {applicant.brutallyHonestProfile && (
            applicant.brutallyHonestProfile.technicalSkillsScore !== undefined ||
            applicant.brutallyHonestProfile.experienceScore !== undefined ||
            applicant.brutallyHonestProfile.culturalFitScore !== undefined ||
            applicant.brutallyHonestProfile.communicationScore !== undefined
          ) && (
            <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                  <Target className="w-5 h-5 text-blue-500" />
                  Dimension Scores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {applicant.brutallyHonestProfile.technicalSkillsScore !== undefined && (
                    <div className={`p-4 rounded-lg text-center ${getScoreBgColor(applicant.brutallyHonestProfile.technicalSkillsScore)}`}>
                      <div className={`text-2xl font-bold ${getScoreColor(applicant.brutallyHonestProfile.technicalSkillsScore)}`}>
                        {applicant.brutallyHonestProfile.technicalSkillsScore}%
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Technical Skills</div>
                    </div>
                  )}
                  {applicant.brutallyHonestProfile.experienceScore !== undefined && (
                    <div className={`p-4 rounded-lg text-center ${getScoreBgColor(applicant.brutallyHonestProfile.experienceScore)}`}>
                      <div className={`text-2xl font-bold ${getScoreColor(applicant.brutallyHonestProfile.experienceScore)}`}>
                        {applicant.brutallyHonestProfile.experienceScore}%
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Experience</div>
                    </div>
                  )}
                  {applicant.brutallyHonestProfile.culturalFitScore !== undefined && (
                    <div className={`p-4 rounded-lg text-center ${getScoreBgColor(applicant.brutallyHonestProfile.culturalFitScore)}`}>
                      <div className={`text-2xl font-bold ${getScoreColor(applicant.brutallyHonestProfile.culturalFitScore)}`}>
                        {applicant.brutallyHonestProfile.culturalFitScore}%
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Cultural Fit</div>
                    </div>
                  )}
                  {applicant.brutallyHonestProfile.communicationScore !== undefined && (
                    <div className={`p-4 rounded-lg text-center ${getScoreBgColor(applicant.brutallyHonestProfile.communicationScore)}`}>
                      <div className={`text-2xl font-bold ${getScoreColor(applicant.brutallyHonestProfile.communicationScore)}`}>
                        {applicant.brutallyHonestProfile.communicationScore}%
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Communication</div>
                    </div>
                  )}
                  {applicant.brutallyHonestProfile.leadershipScore !== undefined && (
                    <div className={`p-4 rounded-lg text-center ${getScoreBgColor(applicant.brutallyHonestProfile.leadershipScore)}`}>
                      <div className={`text-2xl font-bold ${getScoreColor(applicant.brutallyHonestProfile.leadershipScore)}`}>
                        {applicant.brutallyHonestProfile.leadershipScore}%
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Leadership</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}