import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  CheckCircle,
  AlertTriangle,
  X,
  ChevronDown,
  ChevronRight,
  FileText,
  Briefcase,
  User,
  Users,
  Star,
} from 'lucide-react';

// Type definitions for job scoring data
interface JobScoring {
  jobId: number;
  overallScore: number;
  matchSummary?: string;
  disqualified?: boolean;
  disqualificationReason?: string;
  improvementAreas?: any[];
  redFlags?: any[];
  strengthsHighlights?: any[];
  fullResponse?: any;
}

interface DetailedAnalysisProps {
  jobScore: JobScoring;
}

export const DetailedAnalysis = ({ jobScore }: DetailedAnalysisProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const fullResponse = jobScore.fullResponse;

  if (!fullResponse || !fullResponse.detailedBreakdown) {
    return null;
  }

  const { detailedBreakdown } = fullResponse;

  // Detect if using new 100-point matrix format (has sectionA) or legacy format (has technicalSkills array)
  const isNewFormat = detailedBreakdown.sectionA !== undefined;

  const getEvidenceIcon = (present: boolean | 'partial') => {
    if (present === true) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (present === 'partial') return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return <X className="h-4 w-4 text-red-500" />;
  };

  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'text-green-600 bg-green-50';
    if (percentage >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  // Render a subsection item for new format
  const renderSubsectionItem = (label: string, data: any, maxScore?: number) => {
    if (!data) return null;
    const score = data.score;
    const hasScore = score !== undefined && maxScore !== undefined;

    return (
      <div className="p-3 bg-gray-50 rounded border border-gray-200">
        <div className="flex items-start justify-between mb-2">
          <span className="text-sm font-medium flex-1">{label}</span>
          {hasScore && (
            <span className={`text-xs font-bold px-2 py-1 rounded ${getScoreColor(score, maxScore)}`}>
              {score}/{maxScore} pts
            </span>
          )}
        </div>
        {data.evidence && (
          <div className="text-xs text-gray-600 mb-1">{data.evidence}</div>
        )}
        {data.matchedSkills && data.matchedSkills.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {data.matchedSkills.map((skill: string, i: number) => (
              <Badge key={i} variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                {skill}
              </Badge>
            ))}
          </div>
        )}
        {data.matchedTools && data.matchedTools.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {data.matchedTools.map((tool: string, i: number) => (
              <Badge key={i} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                {tool}
              </Badge>
            ))}
          </div>
        )}
        {data.matchedKeywords && data.matchedKeywords.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {data.matchedKeywords.map((keyword: string, i: number) => (
              <Badge key={i} variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                {keyword}
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
        {data.matchedCerts && data.matchedCerts.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {data.matchedCerts.map((cert: string, i: number) => (
              <Badge key={i} variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                {cert}
              </Badge>
            ))}
          </div>
        )}
        {data.candidateYears !== undefined && data.requiredYears !== undefined && (
          <div className="text-xs text-gray-500 mt-1">
            Candidate: {data.candidateYears} years / Required: {data.requiredYears} years
          </div>
        )}
        {data.averageTenure !== undefined && (
          <div className="text-xs text-gray-500 mt-1">
            Average tenure: {data.averageTenure} years
          </div>
        )}
        {data.jdLevel && (
          <div className="text-xs text-gray-500 mt-1">
            JD Level: {data.jdLevel}
          </div>
        )}
        {data.candidateDegree && (
          <div className="text-xs text-gray-500 mt-1">
            Degree: {data.candidateDegree} {data.requiredDegree && `(Required: ${data.requiredDegree})`}
          </div>
        )}
        {data.candidateLocation && (
          <div className="text-xs text-gray-500 mt-1">
            Location: {data.candidateLocation} {data.jdLocation && `-> ${data.jdLocation}`}
          </div>
        )}
        {(data.hasEmail !== undefined || data.hasPhone !== undefined) && (
          <div className="text-xs text-gray-500 mt-1 flex gap-2">
            {data.hasEmail && <span className="text-green-600">Email</span>}
            {data.hasPhone && <span className="text-green-600">Phone</span>}
            {data.cleanFormat && <span className="text-green-600">Clean Format</span>}
          </div>
        )}
        {data.triggered !== undefined && (
          <div className={`text-xs mt-1 ${data.triggered ? 'text-red-600' : 'text-green-600'}`}>
            {data.triggered ? `Triggered: ${data.reason}` : 'Not triggered'}
          </div>
        )}
        {data.appliedBonuses && data.appliedBonuses.length > 0 && (
          <div className="mt-1">
            {data.appliedBonuses.map((bonus: any, i: number) => (
              <div key={i} className="text-xs text-green-600">+ {bonus.condition}: {bonus.points} pts</div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Helper for domain match level colors
  const getDomainMatchColor = (level: string) => {
    switch (level?.toUpperCase()) {
      case 'EXACT': return 'bg-green-100 text-green-800 border-green-200';
      case 'RELATED': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ADJACENT': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'DIFFERENT': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'UNRELATED': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Helper for skill depth colors
  const getSkillDepthColor = (depth: string) => {
    switch (depth?.toUpperCase()) {
      case 'EXPERT': return 'bg-green-100 text-green-700 border-green-300';
      case 'PROFICIENT': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'FAMILIAR': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'LISTED_ONLY': return 'bg-gray-100 text-gray-600 border-gray-300';
      default: return 'bg-gray-100 text-gray-600 border-gray-300';
    }
  };

  // Helper for career progression colors
  const getProgressionColor = (progression: string) => {
    switch (progression?.toUpperCase()) {
      case 'ASCENDING': return 'bg-green-100 text-green-700';
      case 'STABLE': return 'bg-blue-100 text-blue-700';
      case 'MIXED': return 'bg-yellow-100 text-yellow-700';
      case 'DESCENDING': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Helper for red flag severity colors
  const getSeverityColor = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case 'HIGH': return 'bg-red-100 text-red-800 border-red-300';
      case 'MEDIUM': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'LOW': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Helper for verdict decision colors
  const getVerdictColor = (decision: string) => {
    switch (decision?.toUpperCase()) {
      case 'INTERVIEW': return 'bg-green-500 text-white border-green-600';
      case 'CONSIDER': return 'bg-primary text-white border-primary';
      case 'REVIEW': return 'bg-yellow-500 text-white border-yellow-600';
      case 'NOT PASS': return 'bg-red-500 text-white border-red-600';
      default: return 'bg-gray-500 text-white border-gray-600';
    }
  };

  // Helper for recommendation colors
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

  // Render new 100-point matrix format
  const renderNewFormat = () => (
    <div className="p-4 space-y-4 bg-white">
      {/* Executive Summary - Quick Scan Section */}
      {fullResponse.executiveSummary && (
        <div className="p-3 rounded-lg bg-linear-to-r from-slate-900 to-slate-800 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold">{fullResponse.executiveSummary.oneLiner || 'Candidate Analysis'}</span>
            </div>
            <div className="flex items-center gap-2">
              {fullResponse.executiveSummary.fitScore && (
                <Badge className={`text-xs ${
                  fullResponse.executiveSummary.fitScore === 'EXCELLENT' ? 'bg-green-500' :
                  fullResponse.executiveSummary.fitScore === 'GOOD' ? 'bg-primary' :
                  fullResponse.executiveSummary.fitScore === 'FAIR' ? 'bg-yellow-500' :
                  fullResponse.executiveSummary.fitScore === 'POOR' ? 'bg-orange-500' :
                  'bg-red-500'
                }`}>
                  {fullResponse.executiveSummary.fitScore} FIT
                </Badge>
              )}
              {fullResponse.executiveSummary.hiringUrgency && (
                <Badge className={`text-xs ${
                  fullResponse.executiveSummary.hiringUrgency === 'EXPEDITE' ? 'bg-green-600' :
                  fullResponse.executiveSummary.hiringUrgency === 'STANDARD' ? 'bg-primary' :
                  fullResponse.executiveSummary.hiringUrgency === 'LOW_PRIORITY' ? 'bg-gray-600' :
                  'bg-red-600'
                }`}>
                  {fullResponse.executiveSummary.hiringUrgency.replace('_', ' ')}
                </Badge>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Verdict & Recommendation - Most Important Section */}
      {fullResponse.verdict && (
        <div className="p-4 rounded-lg border-2 border-gray-300 bg-linear-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Badge className={`text-lg px-4 py-2 font-bold ${getVerdictColor(fullResponse.verdict.decision)}`}>
                {fullResponse.verdict.decision === 'INTERVIEW' ? 'INTERVIEW' :
                 fullResponse.verdict.decision === 'CONSIDER' ? '? CONSIDER' :
                 fullResponse.verdict.decision === 'REVIEW' ? 'REVIEW' :
                 'NOT SUITABLE'}
              </Badge>
              {fullResponse.verdict.confidence && (
                <span className={`text-xs font-medium px-2 py-1 rounded ${
                  fullResponse.verdict.confidence === 'HIGH' ? 'bg-green-100 text-green-700' :
                  fullResponse.verdict.confidence === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {fullResponse.verdict.confidence} Confidence
                </span>
              )}
              {fullResponse.verdict.riskLevel && (
                <span className={`text-xs font-medium px-2 py-1 rounded ${
                  fullResponse.verdict.riskLevel === 'LOW' ? 'bg-green-100 text-green-700' :
                  fullResponse.verdict.riskLevel === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                  fullResponse.verdict.riskLevel === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {fullResponse.verdict.riskLevel} Risk
                </span>
              )}
            </div>
            {fullResponse.recommendation && (
              <Badge className={`px-3 py-1 ${getRecommendationColor(fullResponse.recommendation)}`}>
                {fullResponse.recommendation.replace('_', ' ')}
              </Badge>
            )}
          </div>

          {fullResponse.verdict.summary && (
            <p className="text-base font-medium text-gray-800 mb-3">
              {fullResponse.verdict.summary}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            {fullResponse.verdict.topStrength && (
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="text-xs font-semibold text-green-600 mb-1 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" /> TOP STRENGTH
                </div>
                <div className="text-sm text-green-800">{fullResponse.verdict.topStrength}</div>
              </div>
            )}
            {fullResponse.verdict.topConcern && fullResponse.verdict.topConcern !== 'None significant' && fullResponse.verdict.topConcern !== 'None' && fullResponse.verdict.topConcern !== 'None identified' && (
              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div className="text-xs font-semibold text-orange-600 mb-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> TOP CONCERN
                </div>
                <div className="text-sm text-orange-800">{fullResponse.verdict.topConcern}</div>
              </div>
            )}
            {fullResponse.verdict.topConcern && (fullResponse.verdict.topConcern === 'None significant' || fullResponse.verdict.topConcern === 'None' || fullResponse.verdict.topConcern === 'None identified') && (
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" /> TOP CONCERN
                </div>
                <div className="text-sm text-gray-600 italic">No significant concerns</div>
              </div>
            )}
          </div>

          {/* Dealbreakers if any */}
          {fullResponse.verdict.dealbreakers && fullResponse.verdict.dealbreakers.length > 0 && (
            <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="text-xs font-semibold text-red-600 mb-1">DEALBREAKERS</div>
              <ul className="text-sm text-red-800">
                {fullResponse.verdict.dealbreakers.map((item: string, i: number) => (
                  <li key={i} className="flex items-start gap-1">
                    <span className="text-red-500">x</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {fullResponse.recommendationReason && (
            <p className="text-sm text-gray-600 mt-3 italic border-t pt-3">
              {fullResponse.recommendationReason}
            </p>
          )}
        </div>
      )}

      {/* Section Scores Summary with Accordion */}
      {(fullResponse.sectionA !== undefined || fullResponse.sectionB !== undefined) && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <h5 className="font-medium text-sm mb-3 text-blue-800">Score Breakdown by Section (Click to expand details)</h5>
          <Accordion type="multiple" className="space-y-2">
            {/* Section A: Skills */}
            {fullResponse.detailedBreakdown?.sectionA && (
              <AccordionItem value="sectionA" className="bg-white rounded border overflow-hidden">
                <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-gray-50">
                  <div className="flex items-center justify-between w-full pr-2">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Section A: Skills & Competency</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-blue-700">{fullResponse.sectionA ?? '-'}<span className="text-xs font-normal text-gray-500">/30</span></span>
                      <span className="text-xs text-gray-500">({fullResponse.sectionA !== undefined ? Math.round((fullResponse.sectionA / 30) * 100) : 0}%)</span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3">
                  <div className="space-y-2 pt-2 border-t">
                    {fullResponse.detailedBreakdown.sectionA.A1_skillsMatch && renderSubsectionItem('A1: Skills Match', fullResponse.detailedBreakdown.sectionA.A1_skillsMatch, 15)}
                    {fullResponse.detailedBreakdown.sectionA.A1_coreTechStackMatch && renderSubsectionItem('A1: Core Skills Match', fullResponse.detailedBreakdown.sectionA.A1_coreTechStackMatch, 15)}
                    {fullResponse.detailedBreakdown.sectionA.A2_skillDepth && renderSubsectionItem('A2: Skill Depth & Recency', fullResponse.detailedBreakdown.sectionA.A2_skillDepth, 10)}
                    {fullResponse.detailedBreakdown.sectionA.A2_skillRecency && renderSubsectionItem('A2: Skill Recency', fullResponse.detailedBreakdown.sectionA.A2_skillRecency, 10)}
                    {fullResponse.detailedBreakdown.sectionA.A3_toolsMatch && renderSubsectionItem('A3: Tools/Systems Match', fullResponse.detailedBreakdown.sectionA.A3_toolsMatch, 5)}
                    {fullResponse.detailedBreakdown.sectionA.A3_requiredToolVolume && renderSubsectionItem('A3: Required Tools', fullResponse.detailedBreakdown.sectionA.A3_requiredToolVolume, 5)}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Section B: Experience */}
            {fullResponse.detailedBreakdown?.sectionB && (
              <AccordionItem value="sectionB" className="bg-white rounded border overflow-hidden">
                <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-gray-50">
                  <div className="flex items-center justify-between w-full pr-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Section B: Experience Alignment</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-blue-700">{fullResponse.sectionB ?? '-'}<span className="text-xs font-normal text-gray-500">/25</span></span>
                      <span className="text-xs text-gray-500">({fullResponse.sectionB !== undefined ? Math.round((fullResponse.sectionB / 25) * 100) : 0}%)</span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3">
                  <div className="space-y-2 pt-2 border-t">
                    {fullResponse.detailedBreakdown.sectionB.B1_yearsExperience && renderSubsectionItem('B1: Years of Experience', fullResponse.detailedBreakdown.sectionB.B1_yearsExperience, 10)}
                    {fullResponse.detailedBreakdown.sectionB.B1_qualifiedYears && renderSubsectionItem('B1: Qualified Years', fullResponse.detailedBreakdown.sectionB.B1_qualifiedYears, 10)}
                    {fullResponse.detailedBreakdown.sectionB.B2_seniorityMatch && renderSubsectionItem('B2: Seniority Match', fullResponse.detailedBreakdown.sectionB.B2_seniorityMatch, 10)}
                    {fullResponse.detailedBreakdown.sectionB.B2_seniorityValidation && renderSubsectionItem('B2: Seniority Validation', fullResponse.detailedBreakdown.sectionB.B2_seniorityValidation, 10)}
                    {fullResponse.detailedBreakdown.sectionB.B3_stability && renderSubsectionItem('B3: Career Stability', fullResponse.detailedBreakdown.sectionB.B3_stability, 5)}
                    {fullResponse.detailedBreakdown.sectionB.B3_jobStability && renderSubsectionItem('B3: Job Stability', fullResponse.detailedBreakdown.sectionB.B3_jobStability, 5)}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Section C: Impact */}
            {fullResponse.detailedBreakdown?.sectionC && (
              <AccordionItem value="sectionC" className="bg-white rounded border overflow-hidden">
                <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-gray-50">
                  <div className="flex items-center justify-between w-full pr-2">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Section C: Impact & Achievements</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-blue-700">{fullResponse.sectionC ?? '-'}<span className="text-xs font-normal text-gray-500">/20</span></span>
                      <span className="text-xs text-gray-500">({fullResponse.sectionC !== undefined ? Math.round((fullResponse.sectionC / 20) * 100) : 0}%)</span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3">
                  <div className="space-y-2 pt-2 border-t">
                    {fullResponse.detailedBreakdown.sectionC.C1_quantifiedResults && renderSubsectionItem('C1: Quantified Results', fullResponse.detailedBreakdown.sectionC.C1_quantifiedResults, 12)}
                    {fullResponse.detailedBreakdown.sectionC.C1_scopeComplexity && renderSubsectionItem('C1: Scope & Complexity', fullResponse.detailedBreakdown.sectionC.C1_scopeComplexity, 12)}
                    {fullResponse.detailedBreakdown.sectionC.C2_softSkills && renderSubsectionItem('C2: Soft Skills Evidence', fullResponse.detailedBreakdown.sectionC.C2_softSkills, 8)}
                    {fullResponse.detailedBreakdown.sectionC.C2_softSkillMatch && renderSubsectionItem('C2: Soft Skill Match', fullResponse.detailedBreakdown.sectionC.C2_softSkillMatch, 8)}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Section D: Qualifications */}
            {fullResponse.detailedBreakdown?.sectionD && (
              <AccordionItem value="sectionD" className="bg-white rounded border overflow-hidden">
                <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-gray-50">
                  <div className="flex items-center justify-between w-full pr-2">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Section D: Qualifications</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-blue-700">{fullResponse.sectionD ?? '-'}<span className="text-xs font-normal text-gray-500">/10</span></span>
                      <span className="text-xs text-gray-500">({fullResponse.sectionD !== undefined ? Math.round((fullResponse.sectionD / 10) * 100) : 0}%)</span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3">
                  <div className="space-y-2 pt-2 border-t">
                    {fullResponse.detailedBreakdown.sectionD.D1_education && renderSubsectionItem('D1: Education', fullResponse.detailedBreakdown.sectionD.D1_education, 5)}
                    {fullResponse.detailedBreakdown.sectionD.D2_certifications && renderSubsectionItem('D2: Certifications', fullResponse.detailedBreakdown.sectionD.D2_certifications, 5)}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Section E: Logistics */}
            {fullResponse.detailedBreakdown?.sectionE && (
              <AccordionItem value="sectionE" className="bg-white rounded border overflow-hidden">
                <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-gray-50">
                  <div className="flex items-center justify-between w-full pr-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Section E: Logistics & Compatibility</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-blue-700">{fullResponse.sectionE ?? '-'}<span className="text-xs font-normal text-gray-500">/10</span></span>
                      <span className="text-xs text-gray-500">({fullResponse.sectionE !== undefined ? Math.round((fullResponse.sectionE / 10) * 100) : 0}%)</span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3">
                  <div className="space-y-2 pt-2 border-t">
                    {fullResponse.detailedBreakdown.sectionE.E1_location && renderSubsectionItem('E1: Location Match', fullResponse.detailedBreakdown.sectionE.E1_location, 4)}
                    {fullResponse.detailedBreakdown.sectionE.E1_languageMatch && renderSubsectionItem('E1: Language Match', fullResponse.detailedBreakdown.sectionE.E1_languageMatch, 4)}
                    {fullResponse.detailedBreakdown.sectionE.E2_language && renderSubsectionItem('E2: Language', fullResponse.detailedBreakdown.sectionE.E2_language, 3)}
                    {fullResponse.detailedBreakdown.sectionE.E2_locationMatch && renderSubsectionItem('E2: Location', fullResponse.detailedBreakdown.sectionE.E2_locationMatch, 3)}
                    {fullResponse.detailedBreakdown.sectionE.E3_contactQuality && renderSubsectionItem('E3: Contact & Resume Quality', fullResponse.detailedBreakdown.sectionE.E3_contactQuality, 3)}
                    {fullResponse.detailedBreakdown.sectionE.E3_contactability && renderSubsectionItem('E3: Contactability', fullResponse.detailedBreakdown.sectionE.E3_contactability, 3)}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Section F: Modifiers */}
            {fullResponse.detailedBreakdown?.sectionF && (
              <AccordionItem value="sectionF" className="bg-white rounded border overflow-hidden">
                <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-gray-50">
                  <div className="flex items-center justify-between w-full pr-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Section F: Bonus & Penalties</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-lg font-bold ${(fullResponse.sectionF ?? 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {(fullResponse.sectionF ?? 0) >= 0 ? '+' : ''}{fullResponse.sectionF ?? '0'}
                      </span>
                      <span className="text-xs text-gray-500">pts</span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3">
                  <div className="space-y-2 pt-2 border-t">
                    {fullResponse.detailedBreakdown.sectionF.bonusPoints && renderSubsectionItem('Bonus Points', fullResponse.detailedBreakdown.sectionF.bonusPoints, 5)}
                    {fullResponse.detailedBreakdown.sectionF.penalties && renderSubsectionItem('Penalties', fullResponse.detailedBreakdown.sectionF.penalties, undefined)}
                    {fullResponse.detailedBreakdown.sectionF.F1_disqualification && renderSubsectionItem('Disqualification Check', fullResponse.detailedBreakdown.sectionF.F1_disqualification, undefined)}
                    {fullResponse.detailedBreakdown.sectionF.F2_bonusPoints && renderSubsectionItem('Bonus Points', fullResponse.detailedBreakdown.sectionF.F2_bonusPoints, 5)}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>

          {/* Fallback summary row if no detailed breakdown available */}
          {!fullResponse.detailedBreakdown && (
            <div className="grid grid-cols-6 gap-2 mt-2">
              <div className="text-center p-2 bg-white rounded border">
                <div className="text-lg font-bold text-blue-700">{fullResponse.sectionA ?? '-'}<span className="text-xs font-normal text-gray-500">/30</span></div>
                <div className="text-xs text-primary font-medium">Skills</div>
              </div>
              <div className="text-center p-2 bg-white rounded border">
                <div className="text-lg font-bold text-blue-700">{fullResponse.sectionB ?? '-'}<span className="text-xs font-normal text-gray-500">/25</span></div>
                <div className="text-xs text-primary font-medium">Experience</div>
              </div>
              <div className="text-center p-2 bg-white rounded border">
                <div className="text-lg font-bold text-blue-700">{fullResponse.sectionC ?? '-'}<span className="text-xs font-normal text-gray-500">/20</span></div>
                <div className="text-xs text-primary font-medium">Impact</div>
              </div>
              <div className="text-center p-2 bg-white rounded border">
                <div className="text-lg font-bold text-blue-700">{fullResponse.sectionD ?? '-'}<span className="text-xs font-normal text-gray-500">/10</span></div>
                <div className="text-xs text-primary font-medium">Qualifications</div>
              </div>
              <div className="text-center p-2 bg-white rounded border">
                <div className="text-lg font-bold text-blue-700">{fullResponse.sectionE ?? '-'}<span className="text-xs font-normal text-gray-500">/10</span></div>
                <div className="text-xs text-primary font-medium">Logistics</div>
              </div>
              <div className="text-center p-2 bg-white rounded border">
                <div className={`text-lg font-bold ${(fullResponse.sectionF ?? 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {(fullResponse.sectionF ?? 0) >= 0 ? '+' : ''}{fullResponse.sectionF ?? '0'}
                </div>
                <div className="text-xs text-gray-600 font-medium">Modifiers</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 bg-green-50 rounded-lg border border-green-200 text-center">
          <div className="text-2xl font-bold text-green-700">
            {fullResponse.strengthsHighlights?.length || 0}
          </div>
          <div className="text-xs text-green-600">Strengths Found</div>
        </div>
        <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-center">
          <div className="text-2xl font-bold text-red-700">
            {fullResponse.improvementAreas?.length || 0}
          </div>
          <div className="text-xs text-red-600">Gaps Identified</div>
        </div>
        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-center">
          <div className="text-2xl font-bold text-amber-700">
            {fullResponse.skillAnalysis?.matchedSkills?.length || 0}
          </div>
          <div className="text-xs text-amber-600">Skills Matched</div>
        </div>
        <div className="p-3 bg-purple-50 rounded-lg border border-purple-200 text-center">
          <div className="text-2xl font-bold text-purple-700">
            {fullResponse.skillAnalysis?.missingSkills?.length || 0}
          </div>
          <div className="text-xs text-purple-600">Skills Missing</div>
        </div>
      </div>

      {/* Strengths & Gaps Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Strengths Column */}
        <div className="p-3 bg-linear-to-b from-green-50 to-emerald-50 rounded-lg border border-green-200">
          <h5 className="font-medium text-sm mb-3 flex items-center gap-2 text-green-800">
            <CheckCircle className="h-4 w-4" />
            Strengths ({fullResponse.strengthsHighlights?.length || 0})
          </h5>
          {fullResponse.strengthsHighlights && fullResponse.strengthsHighlights.length > 0 ? (
            <div className="space-y-2">
              {fullResponse.strengthsHighlights.map((item: any, i: number) => (
                <div key={i} className="p-2 bg-white rounded border border-green-100">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-green-800">{item.strength || (typeof item === 'string' ? item : 'Strength identified')}</div>
                      {item.evidence && (
                        <div className="text-xs text-gray-600 mt-1">
                          <span className="font-medium">Evidence:</span> {item.evidence}
                        </div>
                      )}
                      {(item.relevanceToJob || item.relevanceToJD) && (
                        <div className="text-xs text-green-600 mt-1">
                          <span className="font-medium">Job Relevance:</span> {item.relevanceToJob || item.relevanceToJD}
                        </div>
                      )}
                    </div>
                    {item.impact && (
                      <Badge variant="outline" className={`text-xs ml-2 ${
                        item.impact === 'HIGH' ? 'bg-green-100 text-green-700 border-green-300' :
                        item.impact === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
                        'bg-gray-100 text-gray-600 border-gray-300'
                      }`}>
                        {item.impact} Impact
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500 italic">No significant strengths identified</div>
          )}
        </div>

        {/* Gaps Column */}
        <div className="p-3 bg-linear-to-b from-red-50 to-orange-50 rounded-lg border border-red-200">
          <h5 className="font-medium text-sm mb-3 flex items-center gap-2 text-red-800">
            <AlertTriangle className="h-4 w-4" />
            Gaps & Areas for Concern ({fullResponse.improvementAreas?.length || 0})
          </h5>
          {fullResponse.improvementAreas && fullResponse.improvementAreas.length > 0 ? (
            <div className="space-y-2">
              {fullResponse.improvementAreas.map((item: any, i: number) => (
                <div key={i} className={`p-2 bg-white rounded border ${
                  item.severity === 'CRITICAL' ? 'border-red-300' :
                  item.severity === 'MAJOR' ? 'border-orange-300' :
                  'border-yellow-300'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-red-800">{item.gap || (typeof item === 'string' ? item : 'Gap identified')}</div>
                      {(item.jobRequirement || item.jdRequirement) && (
                        <div className="text-xs text-gray-600 mt-1">
                          <span className="font-medium">Job Requirement:</span> {item.jobRequirement || item.jdRequirement}
                        </div>
                      )}
                      {item.reason && (
                        <div className="text-xs text-gray-700 mt-1">
                          <span className="font-medium">Why it's a gap:</span> {item.reason}
                        </div>
                      )}
                      {item.impact && (
                        <div className="text-xs text-red-600 mt-1">
                          <span className="font-medium">Impact:</span> {item.impact}
                        </div>
                      )}
                      {item.evidenceFromResume && (
                        <div className="text-xs text-gray-600 mt-1">
                          <span className="font-medium">Evidence:</span> {item.evidenceFromResume}
                        </div>
                      )}
                      {item.recommendation && (
                        <div className="text-xs text-primary mt-1">
                          <span className="font-medium">Recommendation:</span> {item.recommendation}
                        </div>
                      )}
                      {item.workaround && (
                        <div className="text-xs text-purple-600 mt-1">
                          <span className="font-medium">Workaround:</span> {item.workaround}
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
                      {item.timeToAddress && (
                        <span className="text-xs text-gray-500">
                          {item.timeToAddress}
                        </span>
                      )}
                      {item.trainable !== undefined && (
                        <span className={`text-xs ${item.trainable ? 'text-green-600' : 'text-gray-500'}`}>
                          {item.trainable ? 'Trainable' : 'Not Trainable'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500 italic">No significant gaps identified</div>
          )}
        </div>
      </div>

      {/* Domain Analysis */}
      {fullResponse.domainAnalysis && (
        <div className="p-3 bg-linear-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
          <h5 className="font-medium text-sm mb-3 flex items-center gap-2 text-indigo-800">
            <Briefcase className="h-4 w-4" />
            Domain Match Analysis
          </h5>
          <div className="grid grid-cols-2 gap-3 mb-2">
            <div>
              <span className="text-xs text-gray-500">Job Description Domain:</span>
              <div className="text-sm font-medium">{fullResponse.domainAnalysis.jobDescriptionDomain || fullResponse.domainAnalysis.jdDomain || 'N/A'}</div>
            </div>
            <div>
              <span className="text-xs text-gray-500">Candidate Domain:</span>
              <div className="text-sm font-medium">{fullResponse.domainAnalysis.candidateDomain || 'N/A'}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <Badge className={`${getDomainMatchColor(fullResponse.domainAnalysis.domainMatchLevel)}`}>
              {fullResponse.domainAnalysis.domainMatchLevel || 'UNKNOWN'}
            </Badge>
            {fullResponse.domainAnalysis.domainMatchScore !== undefined && (
              <span className="text-sm font-bold text-indigo-700">
                {fullResponse.domainAnalysis.domainMatchScore}% Match Score
              </span>
            )}
            {(fullResponse.domainAnalysis.domainPenaltyPercent > 0 || fullResponse.domainAnalysis.domainPenalty > 0) && (
              <span className="text-xs text-red-600 font-medium bg-red-50 px-2 py-1 rounded">
                -{fullResponse.domainAnalysis.domainPenaltyPercent || Math.round((fullResponse.domainAnalysis.domainPenalty || 0) * 100)}% Penalty Applied
              </span>
            )}
          </div>
          {(fullResponse.domainAnalysis.transferabilityNotes || fullResponse.domainAnalysis.domainNotes) && (
            <p className="text-xs text-gray-600 mt-2">{fullResponse.domainAnalysis.transferabilityNotes || fullResponse.domainAnalysis.domainNotes}</p>
          )}
        </div>
      )}

      {/* Skill Analysis Summary */}
      {fullResponse.skillAnalysis && (
        <div className="p-3 bg-linear-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
          <h5 className="font-medium text-sm mb-3 flex items-center gap-2 text-green-800">
            <Star className="h-4 w-4" />
            Skill Depth Analysis
          </h5>

          {/* Skill Depth Summary */}
          {fullResponse.skillAnalysis.matchedSkills && fullResponse.skillAnalysis.matchedSkills.length > 0 && (() => {
            const skills = fullResponse.skillAnalysis.matchedSkills;
            const expertCount = skills.filter((s: any) => s.depth?.toLowerCase() === 'expert').length;
            const proficientCount = skills.filter((s: any) => s.depth?.toLowerCase() === 'proficient').length;
            const familiarCount = fullResponse.skillAnalysis?.partialMatches?.length || 0;
            const listedOnlyCount = skills.filter((s: any) => s.depth?.toLowerCase() === 'listed only' || s.depth?.toLowerCase() === 'listedonly' || s.depth?.toLowerCase() === 'listed').length;

            return (
              <div className="grid grid-cols-4 gap-2 mb-3">
                <div className="text-center p-2 bg-green-100 rounded">
                  <div className="text-lg font-bold text-green-700">{expertCount}</div>
                  <div className="text-xs text-green-600">Expert</div>
                </div>
                <div className="text-center p-2 bg-blue-100 rounded">
                  <div className="text-lg font-bold text-blue-700">{proficientCount}</div>
                  <div className="text-xs text-primary">Proficient</div>
                </div>
                <div className="text-center p-2 bg-yellow-100 rounded">
                  <div className="text-lg font-bold text-yellow-700">{familiarCount}</div>
                  <div className="text-xs text-yellow-600">Familiar</div>
                </div>
                <div className="text-center p-2 bg-gray-100 rounded">
                  <div className="text-lg font-bold text-gray-600">{listedOnlyCount}</div>
                  <div className="text-xs text-gray-500">Listed Only</div>
                </div>
              </div>
            );
          })()}

          {/* Matched Skills */}
          {fullResponse.skillAnalysis.matchedSkills && fullResponse.skillAnalysis.matchedSkills.length > 0 && (
            <div className="mb-2">
              <span className="text-xs font-medium text-green-700">Matched Skills:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {fullResponse.skillAnalysis.matchedSkills.map((s: any, i: number) => (
                  <Badge key={i} variant="outline" className={`text-xs ${getSkillDepthColor(s.depth)}`}>
                    {s.skill} <span className="opacity-70 ml-1">{s.depth}</span>
                    {s.yearsUsed && <span className="opacity-50 ml-1">({s.yearsUsed}y)</span>}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Missing Skills */}
          {fullResponse.skillAnalysis.missingSkills && fullResponse.skillAnalysis.missingSkills.length > 0 && (
            <div className="mt-2">
              <span className="text-xs font-medium text-red-700">Missing Skills:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {fullResponse.skillAnalysis.missingSkills.map((s: any, i: number) => (
                  <Badge key={i} variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                    {s.skill || s}
                    {s.importance && <span className="opacity-70 ml-1">({s.importance})</span>}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Partial Matches */}
          {fullResponse.skillAnalysis.partialMatches && fullResponse.skillAnalysis.partialMatches.length > 0 && (
            <div className="mt-2">
              <span className="text-xs font-medium text-yellow-700">Partial Matches:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {fullResponse.skillAnalysis.partialMatches.map((s: any, i: number) => (
                  <Badge key={i} variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                    {s.required} - {s.found} ({Math.round((s.similarity || 0) * 100)}%)
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Experience Analysis */}
      {fullResponse.experienceAnalysis && (
        <div className="p-3 bg-linear-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
          <h5 className="font-medium text-sm mb-3 flex items-center gap-2 text-blue-800">
            <User className="h-4 w-4" />
            Experience & Career Analysis
          </h5>

          {/* Experience Summary */}
          {fullResponse.experienceAnalysis.experienceSummary && (
            <p className="text-xs text-gray-700 mb-3 p-2 bg-white/60 rounded border border-blue-100">
              {fullResponse.experienceAnalysis.experienceSummary}
            </p>
          )}

          <div className="grid grid-cols-4 gap-2 mb-3">
            <div className="text-center p-2 bg-white rounded border">
              <div className="text-lg font-bold text-blue-700">
                {fullResponse.experienceAnalysis.totalExperienceFormatted ||
                 `${fullResponse.experienceAnalysis.totalYears || 0}y ${fullResponse.experienceAnalysis.totalMonths || 0}m`}
              </div>
              <div className="text-xs text-gray-500">Total Experience</div>
            </div>
            <div className="text-center p-2 bg-white rounded border">
              <div className="text-lg font-bold text-green-700">
                {fullResponse.experienceAnalysis.relevantExperienceFormatted ||
                 `${fullResponse.experienceAnalysis.relevantYears || 0}y ${fullResponse.experienceAnalysis.relevantMonths || 0}m`}
              </div>
              <div className="text-xs text-gray-500">Relevant</div>
            </div>
            <div className="text-center p-2 bg-white rounded border">
              <div className="text-lg font-bold text-purple-700">
                {fullResponse.experienceAnalysis.domainExperienceFormatted ||
                 `${fullResponse.experienceAnalysis.domainYears || 0}y ${fullResponse.experienceAnalysis.domainMonths || 0}m`}
              </div>
              <div className="text-xs text-gray-500">Domain</div>
            </div>
            <div className="text-center p-2 bg-white rounded border">
              <Badge className={`${getProgressionColor(fullResponse.experienceAnalysis.careerProgression)} text-xs`}>
                {fullResponse.experienceAnalysis.careerProgression || 'N/A'}
              </Badge>
              <div className="text-xs text-gray-500 mt-1">Progression</div>
            </div>
          </div>

          {/* Seniority Match */}
          {fullResponse.experienceAnalysis.seniorityMatch && (
            <div className="p-2 bg-white rounded border mb-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">Seniority:</span>
                <span className="font-medium">{fullResponse.experienceAnalysis.seniorityMatch.candidateLevel}</span>
                <span className="text-gray-400">-</span>
                <span className="font-medium">{fullResponse.experienceAnalysis.seniorityMatch.jobRequiredLevel || fullResponse.experienceAnalysis.seniorityMatch.jdLevel}</span>
                <Badge variant="outline" className={`text-xs ${
                  fullResponse.experienceAnalysis.seniorityMatch.match === 'EXACT' ? 'bg-green-50 text-green-700' :
                  fullResponse.experienceAnalysis.seniorityMatch.match === 'OVERQUALIFIED' ? 'bg-blue-50 text-blue-700' :
                  fullResponse.experienceAnalysis.seniorityMatch.match === 'UNDERQUALIFIED' ? 'bg-yellow-50 text-yellow-700' :
                  'bg-red-50 text-red-700'
                }`}>
                  {fullResponse.experienceAnalysis.seniorityMatch.match}
                </Badge>
              </div>
              {fullResponse.experienceAnalysis.seniorityMatch.gapExplanation && (
                <p className="text-xs text-gray-600 mt-1">{fullResponse.experienceAnalysis.seniorityMatch.gapExplanation}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Quantified Achievements */}
      {fullResponse.quantifiedAchievements && fullResponse.quantifiedAchievements.length > 0 && (
        <div className="p-3 bg-linear-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
          <h5 className="font-medium text-sm mb-3 flex items-center gap-2 text-amber-800">
            <Star className="h-4 w-4" />
            Quantified Achievements ({fullResponse.quantifiedAchievements.length})
          </h5>
          <div className="space-y-2">
            {fullResponse.quantifiedAchievements.map((achievement: any, i: number) => (
              <div key={i} className="p-2 bg-white rounded border flex items-start justify-between">
                <div className="flex-1">
                  <div className="text-sm">{achievement.achievement}</div>
                  {achievement.metric && (
                    <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded mt-1 inline-block">
                      {achievement.metric}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {achievement.category && (
                    <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700">
                      {achievement.category}
                    </Badge>
                  )}
                  {achievement.verified && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Enhanced Red Flags */}
      {fullResponse.redFlags && fullResponse.redFlags.length > 0 && (
        <div className="p-3 bg-linear-to-r from-red-50 to-pink-50 rounded-lg border border-red-200">
          <h5 className="font-medium text-sm mb-3 flex items-center gap-2 text-red-800">
            <AlertTriangle className="h-4 w-4" />
            Red Flags ({fullResponse.redFlags.length})
          </h5>
          <div className="space-y-2">
            {fullResponse.redFlags.map((flag: any, i: number) => (
              <div key={i} className={`p-2 rounded border ${getSeverityColor(flag.severity)}`}>
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{flag.type || 'FLAG'}</Badge>
                    <Badge variant="outline" className={`text-xs ${getSeverityColor(flag.severity)}`}>
                      {flag.severity || 'MEDIUM'}
                    </Badge>
                  </div>
                </div>
                <div className="text-sm font-medium">{flag.issue}</div>
                {flag.evidence && (
                  <div className="text-xs text-gray-600 mt-1">Evidence: {flag.evidence}</div>
                )}
                {flag.dates && (
                  <div className="text-xs text-gray-500 mt-1">Dates: {flag.dates}</div>
                )}
                {flag.impact && (
                  <div className="text-xs text-red-600 mt-1">Impact: {flag.impact}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interview Recommendations */}
      {fullResponse.interviewRecommendations && (
        <div className="p-3 bg-linear-to-r from-teal-50 to-cyan-50 rounded-lg border border-teal-200">
          <h5 className="font-medium text-sm mb-3 flex items-center gap-2 text-teal-800">
            <Users className="h-4 w-4" />
            Interview Preparation Guide
          </h5>

          {/* New structured format */}
          {typeof fullResponse.interviewRecommendations === 'object' && !Array.isArray(fullResponse.interviewRecommendations) && (
            <div className="space-y-3">
              {fullResponse.interviewRecommendations.mustExplore && fullResponse.interviewRecommendations.mustExplore.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-teal-700 mb-1">Must Explore</div>
                  <ul className="space-y-1">
                    {fullResponse.interviewRecommendations.mustExplore.map((item: string, i: number) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-teal-600 font-bold">-</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {fullResponse.interviewRecommendations.redFlagQuestions && fullResponse.interviewRecommendations.redFlagQuestions.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-orange-700 mb-1">Red Flag Questions</div>
                  <ul className="space-y-1">
                    {fullResponse.interviewRecommendations.redFlagQuestions.map((item: string, i: number) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-orange-500">!</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {fullResponse.interviewRecommendations.technicalValidation && fullResponse.interviewRecommendations.technicalValidation.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-blue-700 mb-1">Technical Validation</div>
                  <ul className="space-y-1">
                    {fullResponse.interviewRecommendations.technicalValidation.map((item: string, i: number) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-primary">-</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {fullResponse.interviewRecommendations.culturalFitTopics && fullResponse.interviewRecommendations.culturalFitTopics.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-purple-700 mb-1">Cultural Fit Topics</div>
                  <ul className="space-y-1">
                    {fullResponse.interviewRecommendations.culturalFitTopics.map((item: string, i: number) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-purple-500">-</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Legacy array format */}
          {Array.isArray(fullResponse.interviewRecommendations) && fullResponse.interviewRecommendations.length > 0 && (
            <ul className="space-y-1">
              {fullResponse.interviewRecommendations.map((rec: string, i: number) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-teal-500 mt-1">-</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

    </div>
  );

  // Render legacy format
  const renderLegacyFormat = () => (
    <div className="p-4 space-y-4 bg-white">
      {/* Technical Skills Breakdown */}
      {detailedBreakdown.technicalSkills && detailedBreakdown.technicalSkills.length > 0 && (
        <div>
          <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Technical Skills
          </h5>
          <div className="space-y-2">
            {detailedBreakdown.technicalSkills.map((skill: any, index: number) => (
              <div key={index} className="p-2 bg-gray-50 rounded border border-gray-200">
                <div className="flex items-start justify-between mb-1">
                  <span className="text-sm font-medium flex-1">{skill.requirement}</span>
                  <div className="flex items-center gap-2">
                    {skill.gapPercentage !== undefined && (
                      <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded">
                        {skill.gapPercentage}% Gap
                      </span>
                    )}
                    {getEvidenceIcon(skill.present)}
                  </div>
                </div>
                <div className="text-xs text-gray-600 mb-1">
                  {skill.evidence}
                </div>
                {skill.missingDetail && (
                  <div className="text-xs text-primary">
                    {skill.missingDetail}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Experience Breakdown */}
      {detailedBreakdown.experience && detailedBreakdown.experience.length > 0 && (
        <div>
          <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
            <User className="h-4 w-4" />
            Experience
          </h5>
          <div className="space-y-2">
            {detailedBreakdown.experience.map((exp: any, index: number) => (
              <div key={index} className="p-2 bg-gray-50 rounded border border-gray-200">
                <div className="flex items-start justify-between mb-1">
                  <span className="text-sm font-medium flex-1">{exp.requirement}</span>
                  <div className="flex items-center gap-2">
                    {exp.gapPercentage !== undefined && (
                      <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded">
                        {exp.gapPercentage}% Gap
                      </span>
                    )}
                    {getEvidenceIcon(exp.present)}
                  </div>
                </div>
                <div className="text-xs text-gray-600 mb-1">
                  {exp.evidence}
                </div>
                {exp.missingDetail && (
                  <div className="text-xs text-primary">
                    {exp.missingDetail}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education & Certifications Breakdown */}
      {detailedBreakdown.educationAndCertifications && detailedBreakdown.educationAndCertifications.length > 0 && (
        <div>
          <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
            <Star className="h-4 w-4" />
            Education & Certifications
          </h5>
          <div className="space-y-2">
            {detailedBreakdown.educationAndCertifications.map((edu: any, index: number) => (
              <div key={index} className="p-2 bg-gray-50 rounded border border-gray-200">
                <div className="flex items-start justify-between mb-1">
                  <span className="text-sm font-medium flex-1">{edu.requirement}</span>
                  <div className="flex items-center gap-2">
                    {edu.gapPercentage !== undefined && (
                      <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded">
                        {edu.gapPercentage}% Gap
                      </span>
                    )}
                    {getEvidenceIcon(edu.present)}
                  </div>
                </div>
                <div className="text-xs text-gray-600 mb-1">
                  {edu.evidence}
                </div>
                {edu.missingDetail && (
                  <div className="text-xs text-primary">
                    {edu.missingDetail}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cultural Fit & Soft Skills Breakdown */}
      {detailedBreakdown.culturalFitAndSoftSkills && detailedBreakdown.culturalFitAndSoftSkills.length > 0 && (
        <div>
          <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
            <Users className="h-4 w-4" />
            Cultural Fit & Soft Skills
          </h5>
          <div className="space-y-2">
            {detailedBreakdown.culturalFitAndSoftSkills.map((skill: any, index: number) => (
              <div key={index} className="p-2 bg-gray-50 rounded border border-gray-200">
                <div className="flex items-start justify-between mb-1">
                  <span className="text-sm font-medium flex-1">{skill.requirement}</span>
                  <div className="flex items-center gap-2">
                    {skill.gapPercentage !== undefined && (
                      <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded">
                        {skill.gapPercentage}% Gap
                      </span>
                    )}
                    {getEvidenceIcon(skill.present)}
                  </div>
                </div>
                <div className="text-xs text-gray-600 mb-1">
                  {skill.evidence}
                </div>
                {skill.missingDetail && (
                  <div className="text-xs text-primary">
                    {skill.missingDetail}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="mt-4 border border-gray-200 rounded-lg">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full p-3 bg-gray-50 hover:bg-gray-100 rounded-t-lg transition-colors"
      >
        <span className="font-medium text-sm flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Detailed Analysis {isNewFormat && <Badge variant="outline" className="text-xs">100-Point Matrix</Badge>}
        </span>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>

      {isExpanded && (isNewFormat ? renderNewFormat() : renderLegacyFormat())}
    </div>
  );
};

export default DetailedAnalysis;
