import { useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { pdf } from "@react-pdf/renderer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowLeft,
  Mail,
  Phone,
  Award,
  Briefcase,
  GraduationCap,
  Languages,
  FileText,
  Loader2,
  Star,
  Download,
  CheckCircle,
  AlertTriangle,
  X,
  Target,
  Users,
  TrendingUp,
  User,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ProfilePDF } from "@/components/ProfilePDF";

interface JobScore {
  jobId: string;
  jobTitle: string;
  overallScore: number;
  technicalSkillsScore?: number;
  experienceScore?: number;
  culturalFitScore?: number;
  matchSummary?: string;
  strengthsHighlights?: string[];
  improvementAreas?: string[];
  disqualified?: boolean;
  disqualificationReason?: string;
  redFlags?: Array<{
    issue: string;
    evidence: string;
    reason: string;
  }>;
  invitationStatus?: string | null;
  interviewDate?: Date | null;
  interviewTime?: string | null;
  interviewLink?: string | null;
  fullResponse?: any;
}

interface ResumeProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  summary: string;
  experience: string[];
  skills: string[];
  education: string[];
  certifications: string[];
  languages: string[];
  resumeText: string;
  createdAt: string;
  jobScores?: JobScore[];
}

export default function ResumeDetailsPage() {
  const { resumeId } = useParams<{ resumeId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedJobId, setSelectedJobId] = useState<string>(searchParams.get("jobId") || "");
  const [isExporting, setIsExporting] = useState(false);

  // Fetch jobs for selector
  const { data: jobs = [] } = useQuery<any[]>({
    queryKey: ["/api/job-postings"],
  });

  // Fetch profile with job scores
  const { data: profile, isLoading } = useQuery<ResumeProfile>({
    queryKey: [`/api/resume-profiles/${resumeId}`, selectedJobId],
    queryFn: async () => {
      const url = selectedJobId
        ? `/api/resume-profiles/${resumeId}?jobId=${selectedJobId}`
        : `/api/resume-profiles/${resumeId}`;
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch profile");
      return response.json();
    },
    enabled: !!resumeId,
  });

  const selectedJobScore = profile?.jobScores?.find(
    (js) => js.jobId === selectedJobId
  ) || profile?.jobScores?.[0];

  const handleExport = async () => {
    if (!profile) return;
    setIsExporting(true);

    try {
      const fileName = `${(profile.name || "profile").replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;

      const blob = await pdf(
        <ProfilePDF
          profile={profile}
          jobs={jobs}
          includeJobScores={true}
          selectedJobId={selectedJobId}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "PDF Exported",
        description: "Profile has been exported successfully",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/hiring/resumes")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">Resume Not Found</h1>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">
              The requested resume profile could not be found.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

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

  // Detailed Analysis Component - supports both new 100-point matrix and legacy format
  const DetailedAnalysis = ({ jobScore }: { jobScore: JobScore }) => {
    const fullResponse = jobScore?.fullResponse;

    if (!fullResponse || !fullResponse.detailedBreakdown) {
      return (
        <div className="text-center py-4 text-slate-500 dark:text-slate-400">
          <p className="text-sm">No detailed analysis available for this job match.</p>
          <p className="text-xs mt-1">Analysis data may not have been generated yet.</p>
        </div>
      );
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
        <div className="p-3 bg-gray-50 dark:bg-gray-900/30 rounded border border-gray-200 dark:border-gray-700">
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
              Location: {data.candidateLocation} {data.jdLocation && `→ ${data.jdLocation}`}
            </div>
          )}
          {(data.hasEmail !== undefined || data.hasPhone !== undefined) && (
            <div className="text-xs text-gray-500 mt-1 flex gap-2">
              {data.hasEmail && <span className="text-green-600">✓ Email</span>}
              {data.hasPhone && <span className="text-green-600">✓ Phone</span>}
              {data.cleanFormat && <span className="text-green-600">✓ Clean Format</span>}
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
      <div className="p-4 space-y-4 bg-white dark:bg-slate-900">
        {/* Executive Summary - Quick Scan Section */}
        {fullResponse.executiveSummary && (
          <div className="p-3 rounded-lg bg-linear-to-r from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 text-white">
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
          <div className="p-4 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-linear-to-r from-gray-50 to-white dark:from-slate-800 dark:to-slate-900">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Badge className={`text-lg px-4 py-2 font-bold ${getVerdictColor(fullResponse.verdict.decision)}`}>
                  {fullResponse.verdict.decision === 'INTERVIEW' ? '✓ INTERVIEW' :
                   fullResponse.verdict.decision === 'CONSIDER' ? '? CONSIDER' :
                   fullResponse.verdict.decision === 'REVIEW' ? '⚠ REVIEW' :
                   '✗ NOT SUITABLE'}
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
              <p className="text-base font-medium text-gray-800 dark:text-gray-200 mb-3">
                {fullResponse.verdict.summary}
              </p>
            )}

            <div className="grid grid-cols-2 gap-4">
              {fullResponse.verdict.topStrength && (
                <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-700">
                  <div className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> TOP STRENGTH
                  </div>
                  <div className="text-sm text-green-800 dark:text-green-300">{fullResponse.verdict.topStrength}</div>
                </div>
              )}
              {fullResponse.verdict.topConcern && fullResponse.verdict.topConcern !== 'None significant' && fullResponse.verdict.topConcern !== 'None' && fullResponse.verdict.topConcern !== 'None identified' && (
                <div className="p-3 bg-orange-50 dark:bg-orange-900/30 rounded-lg border border-orange-200 dark:border-orange-700">
                  <div className="text-xs font-semibold text-orange-600 dark:text-orange-400 mb-1 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> TOP CONCERN
                  </div>
                  <div className="text-sm text-orange-800 dark:text-orange-300">{fullResponse.verdict.topConcern}</div>
                </div>
              )}
              {fullResponse.verdict.topConcern && (fullResponse.verdict.topConcern === 'None significant' || fullResponse.verdict.topConcern === 'None' || fullResponse.verdict.topConcern === 'None identified') && (
                <div className="p-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> TOP CONCERN
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300 italic">No significant concerns</div>
                </div>
              )}
            </div>

            {/* Dealbreakers if any */}
            {fullResponse.verdict.dealbreakers && fullResponse.verdict.dealbreakers.length > 0 && (
              <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-700">
                <div className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">DEALBREAKERS</div>
                <ul className="text-sm text-red-800 dark:text-red-300">
                  {fullResponse.verdict.dealbreakers.map((item: string, i: number) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="text-red-500">✗</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {fullResponse.recommendationReason && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 italic border-t border-gray-200 dark:border-gray-700 pt-3">
                {fullResponse.recommendationReason}
              </p>
            )}
          </div>
        )}

        {/* Section Scores Summary with Accordion */}
        {(fullResponse.sectionA !== undefined || fullResponse.sectionB !== undefined) && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
            <h5 className="font-medium text-sm mb-3 text-blue-800 dark:text-blue-300">Score Breakdown by Section (Click to expand details)</h5>
            <Accordion type="multiple" className="space-y-2">
              {/* Section A: Skills */}
              {fullResponse.detailedBreakdown?.sectionA && (
                <AccordionItem value="sectionA" className="bg-white dark:bg-slate-800 rounded border dark:border-gray-600 overflow-hidden">
                  <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-gray-50 dark:hover:bg-slate-700">
                    <div className="flex items-center justify-between w-full pr-2">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Section A: Skills & Competency</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-blue-700">{fullResponse.sectionA ?? '-'}<span className="text-xs font-normal text-gray-500 dark:text-gray-400">/30</span></span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">({fullResponse.sectionA !== undefined ? Math.round((fullResponse.sectionA / 30) * 100) : 0}%)</span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-3">
                    <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-600">
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
                <AccordionItem value="sectionB" className="bg-white dark:bg-slate-800 rounded border dark:border-gray-600 overflow-hidden">
                  <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-gray-50 dark:hover:bg-slate-700">
                    <div className="flex items-center justify-between w-full pr-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Section B: Experience Alignment</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-blue-700">{fullResponse.sectionB ?? '-'}<span className="text-xs font-normal text-gray-500 dark:text-gray-400">/25</span></span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">({fullResponse.sectionB !== undefined ? Math.round((fullResponse.sectionB / 25) * 100) : 0}%)</span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-3">
                    <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-600">
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
                <AccordionItem value="sectionC" className="bg-white dark:bg-slate-800 rounded border dark:border-gray-600 overflow-hidden">
                  <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-gray-50 dark:hover:bg-slate-700">
                    <div className="flex items-center justify-between w-full pr-2">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Section C: Impact & Achievements</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-blue-700">{fullResponse.sectionC ?? '-'}<span className="text-xs font-normal text-gray-500 dark:text-gray-400">/20</span></span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">({fullResponse.sectionC !== undefined ? Math.round((fullResponse.sectionC / 20) * 100) : 0}%)</span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-3">
                    <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-600">
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
                <AccordionItem value="sectionD" className="bg-white dark:bg-slate-800 rounded border dark:border-gray-600 overflow-hidden">
                  <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-gray-50 dark:hover:bg-slate-700">
                    <div className="flex items-center justify-between w-full pr-2">
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Section D: Qualifications</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-blue-700">{fullResponse.sectionD ?? '-'}<span className="text-xs font-normal text-gray-500 dark:text-gray-400">/10</span></span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">({fullResponse.sectionD !== undefined ? Math.round((fullResponse.sectionD / 10) * 100) : 0}%)</span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-3">
                    <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                      {fullResponse.detailedBreakdown.sectionD.D1_education && renderSubsectionItem('D1: Education', fullResponse.detailedBreakdown.sectionD.D1_education, 5)}
                      {fullResponse.detailedBreakdown.sectionD.D2_certifications && renderSubsectionItem('D2: Certifications', fullResponse.detailedBreakdown.sectionD.D2_certifications, 5)}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Section E: Logistics */}
              {fullResponse.detailedBreakdown?.sectionE && (
                <AccordionItem value="sectionE" className="bg-white dark:bg-slate-800 rounded border dark:border-gray-600 overflow-hidden">
                  <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-gray-50 dark:hover:bg-slate-700">
                    <div className="flex items-center justify-between w-full pr-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Section E: Logistics & Compatibility</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-blue-700">{fullResponse.sectionE ?? '-'}<span className="text-xs font-normal text-gray-500 dark:text-gray-400">/10</span></span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">({fullResponse.sectionE !== undefined ? Math.round((fullResponse.sectionE / 10) * 100) : 0}%)</span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-3">
                    <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-600">
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
                <AccordionItem value="sectionF" className="bg-white dark:bg-slate-800 rounded border dark:border-gray-600 overflow-hidden">
                  <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-gray-50 dark:hover:bg-slate-700">
                    <div className="flex items-center justify-between w-full pr-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Section F: Bonus & Penalties</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-bold ${(fullResponse.sectionF ?? 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          {(fullResponse.sectionF ?? 0) >= 0 ? '+' : ''}{fullResponse.sectionF ?? '0'}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">pts</span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-3">
                    <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-600">
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
                <div className="text-center p-2 bg-white dark:bg-slate-800 rounded border dark:border-gray-600">
                  <div className="text-lg font-bold text-blue-700 dark:text-blue-400">{fullResponse.sectionA ?? '-'}<span className="text-xs font-normal text-gray-500 dark:text-gray-400">/30</span></div>
                  <div className="text-xs text-primary font-medium">Skills</div>
                </div>
                <div className="text-center p-2 bg-white dark:bg-slate-800 rounded border dark:border-gray-600">
                  <div className="text-lg font-bold text-blue-700 dark:text-blue-400">{fullResponse.sectionB ?? '-'}<span className="text-xs font-normal text-gray-500 dark:text-gray-400">/25</span></div>
                  <div className="text-xs text-primary font-medium">Experience</div>
                </div>
                <div className="text-center p-2 bg-white dark:bg-slate-800 rounded border dark:border-gray-600">
                  <div className="text-lg font-bold text-blue-700 dark:text-blue-400">{fullResponse.sectionC ?? '-'}<span className="text-xs font-normal text-gray-500 dark:text-gray-400">/20</span></div>
                  <div className="text-xs text-primary font-medium">Impact</div>
                </div>
                <div className="text-center p-2 bg-white dark:bg-slate-800 rounded border dark:border-gray-600">
                  <div className="text-lg font-bold text-blue-700 dark:text-blue-400">{fullResponse.sectionD ?? '-'}<span className="text-xs font-normal text-gray-500 dark:text-gray-400">/10</span></div>
                  <div className="text-xs text-primary font-medium">Qualifications</div>
                </div>
                <div className="text-center p-2 bg-white dark:bg-slate-800 rounded border dark:border-gray-600">
                  <div className="text-lg font-bold text-blue-700 dark:text-blue-400">{fullResponse.sectionE ?? '-'}<span className="text-xs font-normal text-gray-500 dark:text-gray-400">/10</span></div>
                  <div className="text-xs text-primary font-medium">Logistics</div>
                </div>
                <div className="text-center p-2 bg-white dark:bg-slate-800 rounded border dark:border-gray-600">
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
          <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-700 text-center">
            <div className="text-2xl font-bold text-green-700">
              {fullResponse.strengthsHighlights?.length || 0}
            </div>
            <div className="text-xs text-green-600">Strengths Found</div>
          </div>
          <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-700 text-center">
            <div className="text-2xl font-bold text-red-700">
              {fullResponse.improvementAreas?.length || 0}
            </div>
            <div className="text-xs text-red-600">Gaps Identified</div>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-lg border border-amber-200 dark:border-amber-700 text-center">
            <div className="text-2xl font-bold text-amber-700">
              {fullResponse.skillAnalysis?.matchedSkills?.length || 0}
            </div>
            <div className="text-xs text-amber-600">Skills Matched</div>
          </div>
          <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-700 text-center">
            <div className="text-2xl font-bold text-purple-700">
              {fullResponse.skillAnalysis?.missingSkills?.length || 0}
            </div>
            <div className="text-xs text-purple-600">Skills Missing</div>
          </div>
        </div>

        {/* Strengths & Gaps Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Strengths Column */}
          <div className="p-3 bg-linear-to-b from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-lg border border-green-200 dark:border-green-700">
            <h5 className="font-medium text-sm mb-3 flex items-center gap-2 text-green-800 dark:text-green-300">
              <CheckCircle className="h-4 w-4" />
              Strengths ({fullResponse.strengthsHighlights?.length || 0})
            </h5>
            {fullResponse.strengthsHighlights && fullResponse.strengthsHighlights.length > 0 ? (
              <div className="space-y-2">
                {fullResponse.strengthsHighlights.map((item: any, i: number) => (
                  <div key={i} className="p-2 bg-white dark:bg-slate-800 rounded border border-green-100 dark:border-green-800">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-green-800 dark:text-green-300">{item.strength || (typeof item === 'string' ? item : 'Strength identified')}</div>
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
          <div className="p-3 bg-linear-to-b from-red-50 to-orange-50 dark:from-red-900/30 dark:to-orange-900/30 rounded-lg border border-red-200 dark:border-red-700">
            <h5 className="font-medium text-sm mb-3 flex items-center gap-2 text-red-800 dark:text-red-300">
              <AlertTriangle className="h-4 w-4" />
              Gaps & Areas for Concern ({fullResponse.improvementAreas?.length || 0})
            </h5>
            {fullResponse.improvementAreas && fullResponse.improvementAreas.length > 0 ? (
              <div className="space-y-2">
                {fullResponse.improvementAreas.map((item: any, i: number) => (
                  <div key={i} className={`p-2 bg-white dark:bg-slate-800 rounded border ${
                    item.severity === 'CRITICAL' ? 'border-red-300' :
                    item.severity === 'MAJOR' ? 'border-orange-300' :
                    'border-yellow-300'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-red-800 dark:text-red-300">{item.gap || (typeof item === 'string' ? item : 'Gap identified')}</div>
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
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {item.timeToAddress}
                          </span>
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
              <div className="text-sm text-gray-500 italic">No significant gaps identified</div>
            )}
          </div>
        </div>

        {/* Domain Analysis */}
        {fullResponse.domainAnalysis && (
          <div className="p-3 bg-linear-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-lg border border-indigo-200 dark:border-indigo-700">
            <h5 className="font-medium text-sm mb-3 flex items-center gap-2 text-indigo-800 dark:text-indigo-300">
              <Briefcase className="h-4 w-4" />
              Domain Match Analysis
            </h5>
            <div className="grid grid-cols-2 gap-3 mb-2">
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Job Description Domain:</span>
                <div className="text-sm font-medium">{fullResponse.domainAnalysis.jobDescriptionDomain || fullResponse.domainAnalysis.jdDomain || 'N/A'}</div>
              </div>
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Candidate Domain:</span>
                <div className="text-sm font-medium">{fullResponse.domainAnalysis.candidateDomain || 'N/A'}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <Badge className={`${getDomainMatchColor(fullResponse.domainAnalysis.domainMatchLevel)}`}>
                {fullResponse.domainAnalysis.domainMatchLevel || 'UNKNOWN'}
              </Badge>
              {fullResponse.domainAnalysis.domainMatchScore !== undefined && (
                <span className="text-sm font-bold text-indigo-700 dark:text-indigo-400">
                  {fullResponse.domainAnalysis.domainMatchScore}% Match Score
                </span>
              )}
              {(fullResponse.domainAnalysis.domainPenaltyPercent > 0 || fullResponse.domainAnalysis.domainPenalty > 0) && (
                <span className="text-xs text-red-600 dark:text-red-400 font-medium bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded">
                  -{fullResponse.domainAnalysis.domainPenaltyPercent || Math.round((fullResponse.domainAnalysis.domainPenalty || 0) * 100)}% Penalty Applied
                </span>
              )}
            </div>
            {(fullResponse.domainAnalysis.transferabilityNotes || fullResponse.domainAnalysis.domainNotes) && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">{fullResponse.domainAnalysis.transferabilityNotes || fullResponse.domainAnalysis.domainNotes}</p>
            )}

            {/* Match Rationale - Step by step reasoning */}
            {fullResponse.domainAnalysis.matchRationale && (
              <div className="mt-3 p-3 bg-white/80 dark:bg-slate-800/80 rounded border border-indigo-200 dark:border-indigo-700">
                <span className="text-xs font-semibold text-indigo-800 dark:text-indigo-300 mb-2 block">Match Rationale</span>
                {typeof fullResponse.domainAnalysis.matchRationale === 'string' ? (
                  <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-line">{fullResponse.domainAnalysis.matchRationale}</p>
                ) : (
                  <div className="space-y-2">
                    {fullResponse.domainAnalysis.matchRationale.step1_jobDomain && (
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/50 px-1.5 py-0.5 rounded shrink-0">1</span>
                        <div>
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Job Domain: </span>
                          <span className="text-xs text-gray-600 dark:text-gray-400">{fullResponse.domainAnalysis.matchRationale.step1_jobDomain}</span>
                        </div>
                      </div>
                    )}
                    {fullResponse.domainAnalysis.matchRationale.step2_candidateDomain && (
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/50 px-1.5 py-0.5 rounded shrink-0">2</span>
                        <div>
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Candidate Domain: </span>
                          <span className="text-xs text-gray-600 dark:text-gray-400">{fullResponse.domainAnalysis.matchRationale.step2_candidateDomain}</span>
                        </div>
                      </div>
                    )}
                    {fullResponse.domainAnalysis.matchRationale.step3_overlaps && (
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/50 px-1.5 py-0.5 rounded shrink-0">3</span>
                        <div>
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Overlaps: </span>
                          <span className="text-xs text-gray-600 dark:text-gray-400">{fullResponse.domainAnalysis.matchRationale.step3_overlaps}</span>
                        </div>
                      </div>
                    )}
                    {fullResponse.domainAnalysis.matchRationale.step4_gaps && (
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/50 px-1.5 py-0.5 rounded shrink-0">4</span>
                        <div>
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Gaps: </span>
                          <span className="text-xs text-gray-600 dark:text-gray-400">{fullResponse.domainAnalysis.matchRationale.step4_gaps}</span>
                        </div>
                      </div>
                    )}
                    {fullResponse.domainAnalysis.matchRationale.step5_verdict && (
                      <div className="flex items-start gap-2 mt-2 pt-2 border-t border-indigo-100">
                        <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-200 dark:bg-indigo-800 px-1.5 py-0.5 rounded shrink-0">!</span>
                        <div>
                          <span className="text-xs font-semibold text-indigo-800">Verdict: </span>
                          <span className="text-xs text-gray-700">{fullResponse.domainAnalysis.matchRationale.step5_verdict}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Domain Match Explanation */}
            {fullResponse.domainAnalysis.domainMatchExplanation && (
              <div className="mt-2 p-2 bg-white/60 dark:bg-slate-800/60 rounded border border-indigo-100 dark:border-indigo-800">
                <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">Match Explanation:</span>
                <p className="text-xs text-gray-700 dark:text-gray-300 mt-1">{fullResponse.domainAnalysis.domainMatchExplanation}</p>
              </div>
            )}

            {/* Domain Risk Assessment */}
            {(fullResponse.domainAnalysis.domainRiskLevel || fullResponse.domainAnalysis.rampUpEstimate) && (
              <div className="mt-2 p-2 bg-white/60 dark:bg-slate-800/60 rounded border border-indigo-100 dark:border-indigo-800">
                <div className="flex items-center gap-2 mb-1">
                  {fullResponse.domainAnalysis.domainRiskLevel && (
                    <Badge variant="outline" className={`text-xs ${
                      fullResponse.domainAnalysis.domainRiskLevel === 'CRITICAL' ? 'bg-red-100 text-red-700 border-red-300' :
                      fullResponse.domainAnalysis.domainRiskLevel === 'HIGH' ? 'bg-orange-100 text-orange-700 border-orange-300' :
                      fullResponse.domainAnalysis.domainRiskLevel === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
                      'bg-green-100 text-green-700 border-green-300'
                    }`}>
                      {fullResponse.domainAnalysis.domainRiskLevel} Risk
                    </Badge>
                  )}
                  {fullResponse.domainAnalysis.rampUpEstimate && (
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Ramp-up:</span> {fullResponse.domainAnalysis.rampUpEstimate}
                    </span>
                  )}
                </div>
                {fullResponse.domainAnalysis.domainRiskExplanation && (
                  <p className="text-xs text-gray-700">{fullResponse.domainAnalysis.domainRiskExplanation}</p>
                )}
              </div>
            )}

            {/* Previous Domain Transitions */}
            {fullResponse.domainAnalysis.previousDomainTransitions && (
              <div className="mt-2 p-2 bg-white/60 dark:bg-slate-800/60 rounded border border-indigo-100 dark:border-indigo-800">
                <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">Previous Domain Transitions:</span>
                <p className="text-xs text-gray-700 dark:text-gray-300 mt-1">{fullResponse.domainAnalysis.previousDomainTransitions}</p>
              </div>
            )}

            {/* Industry Context */}
            {fullResponse.domainAnalysis.industryContext && (
              <div className="mt-2 p-2 bg-white/60 dark:bg-slate-800/60 rounded border border-indigo-100 dark:border-indigo-800">
                <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">Industry Context:</span>
                <p className="text-xs text-gray-700 dark:text-gray-300 mt-1">{fullResponse.domainAnalysis.industryContext}</p>
              </div>
            )}

            {/* Crossover Skills */}
            {fullResponse.domainAnalysis.crossoverSkills && fullResponse.domainAnalysis.crossoverSkills.length > 0 && (
              <div className="mt-2">
                <span className="text-xs font-medium text-green-700">Crossover Skills:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {fullResponse.domainAnalysis.crossoverSkills.map((skill: string, i: number) => (
                    <Badge key={i} variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Domain Gaps */}
            {fullResponse.domainAnalysis.domainGaps && fullResponse.domainAnalysis.domainGaps.length > 0 && (
              <div className="mt-2">
                <span className="text-xs font-medium text-red-700">Domain-Specific Gaps:</span>
                <div className="space-y-2 mt-1">
                  {fullResponse.domainAnalysis.domainGaps.map((gap: any, i: number) => (
                    typeof gap === 'string' ? (
                      <Badge key={i} variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200 mr-1">
                        {gap}
                      </Badge>
                    ) : (
                      <div key={i} className="p-2 bg-red-50/50 rounded border border-red-200">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-red-800">{gap.gap}</span>
                          {gap.importance && (
                            <Badge variant="outline" className={`text-xs ${
                              gap.importance === 'CRITICAL' ? 'bg-red-100 text-red-700 border-red-300' :
                              gap.importance === 'IMPORTANT' ? 'bg-orange-100 text-orange-700 border-orange-300' :
                              'bg-yellow-100 text-yellow-700 border-yellow-300'
                            }`}>
                              {gap.importance}
                            </Badge>
                          )}
                        </div>
                        {gap.reason && (
                          <p className="text-xs text-gray-600 mt-1">{gap.reason}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1">
                          {gap.canBeLearnedOnJob !== undefined && (
                            <span className={`text-xs ${gap.canBeLearnedOnJob ? 'text-green-600' : 'text-gray-500'}`}>
                              {gap.canBeLearnedOnJob ? '✓ Can learn on job' : '✗ Requires prior experience'}
                            </span>
                          )}
                          {gap.estimatedRampUpTime && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Ramp-up: {gap.estimatedRampUpTime}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}

            {/* Domain Hiring Recommendation */}
            {fullResponse.domainAnalysis.domainHiringRecommendation && (
              <div className="mt-3 p-3 bg-white/80 dark:bg-slate-800/80 rounded border border-indigo-200 dark:border-indigo-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-indigo-800">Domain Hiring Recommendation</span>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs ${
                      fullResponse.domainAnalysis.domainHiringRecommendation === 'PROCEED' ? 'bg-green-100 text-green-700 border-green-300' :
                      fullResponse.domainAnalysis.domainHiringRecommendation === 'PROCEED_WITH_CAUTION' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
                      fullResponse.domainAnalysis.domainHiringRecommendation === 'ADDITIONAL_SCREENING' ? 'bg-orange-100 text-orange-700 border-orange-300' :
                      'bg-red-100 text-red-700 border-red-300'
                    }`}>
                      {fullResponse.domainAnalysis.domainHiringRecommendation.replace(/_/g, ' ')}
                    </Badge>
                    {fullResponse.domainAnalysis.domainTransitionSuccess && (
                      <Badge variant="outline" className={`text-xs ${
                        fullResponse.domainAnalysis.domainTransitionSuccess === 'HIGH' ? 'bg-green-50 text-green-700 border-green-300' :
                        fullResponse.domainAnalysis.domainTransitionSuccess === 'MEDIUM' ? 'bg-yellow-50 text-yellow-700 border-yellow-300' :
                        'bg-red-50 text-red-700 border-red-300'
                      }`}>
                        {fullResponse.domainAnalysis.domainTransitionSuccess} Transition Success
                      </Badge>
                    )}
                  </div>
                </div>
                {fullResponse.domainAnalysis.domainHiringRationale && (
                  <p className="text-xs text-gray-700">{fullResponse.domainAnalysis.domainHiringRationale}</p>
                )}
              </div>
            )}

            {/* Competitive Advantage from Domain */}
            {fullResponse.domainAnalysis.competitiveAdvantage && (
              <div className="mt-2 p-2 bg-green-50/50 rounded border border-green-200">
                <span className="text-xs font-medium text-green-700">Unique Domain Perspective:</span>
                <p className="text-xs text-gray-700 dark:text-gray-300 mt-1">{fullResponse.domainAnalysis.competitiveAdvantage}</p>
              </div>
            )}

            {/* Domain Interview Questions */}
            {fullResponse.domainAnalysis.domainInterviewQuestions && fullResponse.domainAnalysis.domainInterviewQuestions.length > 0 && (
              <div className="mt-2 p-2 bg-blue-50/50 rounded border border-blue-200">
                <span className="text-xs font-medium text-blue-700">Domain Interview Questions:</span>
                <ul className="mt-1 space-y-1">
                  {fullResponse.domainAnalysis.domainInterviewQuestions.map((q: string, i: number) => (
                    <li key={i} className="text-xs text-gray-700 flex items-start gap-1">
                      <span className="text-primary">•</span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Domain Onboarding Needs */}
            {fullResponse.domainAnalysis.domainOnboardingNeeds && fullResponse.domainAnalysis.domainOnboardingNeeds.length > 0 && (
              <div className="mt-2 p-2 bg-purple-50/50 rounded border border-purple-200">
                <span className="text-xs font-medium text-purple-700">Domain Onboarding Needs:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {fullResponse.domainAnalysis.domainOnboardingNeeds.map((need: string, i: number) => (
                    <Badge key={i} variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                      {need}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Skill Analysis Summary */}
        {fullResponse.skillAnalysis && (
          <div className="p-3 bg-linear-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-lg border border-green-200 dark:border-green-700">
            <h5 className="font-medium text-sm mb-3 flex items-center gap-2 text-green-800 dark:text-green-300">
              <Star className="h-4 w-4" />
              Skill Depth Analysis
            </h5>

            {/* Skill Depth Summary - manually counted from matchedSkills */}
            {fullResponse.skillAnalysis.matchedSkills && fullResponse.skillAnalysis.matchedSkills.length > 0 && (() => {
              const skills = fullResponse.skillAnalysis.matchedSkills;
              const expertCount = skills.filter((s: any) => s.depth?.toLowerCase() === 'expert').length;
              const proficientCount = skills.filter((s: any) => s.depth?.toLowerCase() === 'proficient').length;
              const familiarCount = fullResponse.skillAnalysis?.partialMatches?.length;
              const listedOnlyCount = skills.filter((s: any) => s.depth?.toLowerCase() === 'listed only' || s.depth?.toLowerCase() === 'listedonly' || s.depth?.toLowerCase() === 'listed').length;

              return (
                <div className="grid grid-cols-4 gap-2 mb-3">
                  <div className="text-center p-2 bg-green-100 dark:bg-green-900/50 rounded">
                    <div className="text-lg font-bold text-green-700">{expertCount}</div>
                    <div className="text-xs text-green-600">Expert</div>
                  </div>
                  <div className="text-center p-2 bg-blue-100 dark:bg-blue-900/50 rounded">
                    <div className="text-lg font-bold text-blue-700 dark:text-blue-400">{proficientCount}</div>
                    <div className="text-xs text-primary">Proficient</div>
                  </div>
                  <div className="text-center p-2 bg-yellow-100 dark:bg-yellow-900/50 rounded">
                    <div className="text-lg font-bold text-yellow-700">{familiarCount}</div>
                    <div className="text-xs text-yellow-600">Familiar</div>
                  </div>
                  <div className="text-center p-2 bg-gray-100 dark:bg-gray-800 rounded">
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
                      {s.required} → {s.found} ({Math.round((s.similarity || 0) * 100)}%)
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Experience Analysis */}
        {fullResponse.experienceAnalysis && (
          <div className="p-3 bg-linear-to-r from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
            <h5 className="font-medium text-sm mb-3 flex items-center gap-2 text-blue-800 dark:text-blue-300">
              <User className="h-4 w-4" />
              Experience & Career Analysis
            </h5>

            {/* Experience Summary */}
            {fullResponse.experienceAnalysis.experienceSummary && (
              <p className="text-xs text-gray-700 dark:text-gray-300 mb-3 p-2 bg-white/60 dark:bg-slate-800/60 rounded border border-blue-100 dark:border-blue-800">
                {fullResponse.experienceAnalysis.experienceSummary}
              </p>
            )}

            <div className="grid grid-cols-4 gap-2 mb-3">
              <div className="text-center p-2 bg-white dark:bg-slate-800 rounded border dark:border-gray-600">
                <div className="text-lg font-bold text-blue-700 dark:text-blue-400">
                  {fullResponse.experienceAnalysis.totalExperienceFormatted ||
                   `${fullResponse.experienceAnalysis.totalYears || 0}y ${fullResponse.experienceAnalysis.totalMonths || 0}m`}
                </div>
                <div className="text-xs text-gray-500">Total Experience</div>
              </div>
              <div className="text-center p-2 bg-white dark:bg-slate-800 rounded border dark:border-gray-600">
                <div className="text-lg font-bold text-green-700">
                  {fullResponse.experienceAnalysis.relevantExperienceFormatted ||
                   `${fullResponse.experienceAnalysis.relevantYears || 0}y ${fullResponse.experienceAnalysis.relevantMonths || 0}m`}
                </div>
                <div className="text-xs text-gray-500">Relevant</div>
              </div>
              <div className="text-center p-2 bg-white dark:bg-slate-800 rounded border dark:border-gray-600">
                <div className="text-lg font-bold text-purple-700">
                  {fullResponse.experienceAnalysis.domainExperienceFormatted ||
                   `${fullResponse.experienceAnalysis.domainYears || 0}y ${fullResponse.experienceAnalysis.domainMonths || 0}m`}
                </div>
                <div className="text-xs text-gray-500">Domain</div>
              </div>
              <div className="text-center p-2 bg-white dark:bg-slate-800 rounded border dark:border-gray-600">
                <Badge className={`${getProgressionColor(fullResponse.experienceAnalysis.careerProgression)} text-xs`}>
                  {fullResponse.experienceAnalysis.careerProgression || 'N/A'}
                </Badge>
                <div className="text-xs text-gray-500 mt-1">Progression</div>
              </div>
            </div>

            {/* Progression & Velocity Explanation */}
            {(fullResponse.experienceAnalysis.progressionExplanation || fullResponse.experienceAnalysis.velocityExplanation) && (
              <div className="p-2 bg-white/60 dark:bg-slate-800/60 rounded border border-blue-100 dark:border-blue-800 mb-2">
                {fullResponse.experienceAnalysis.progressionExplanation && (
                  <div className="text-xs text-gray-700 mb-1">
                    <span className="font-medium text-blue-700">Progression:</span> {fullResponse.experienceAnalysis.progressionExplanation}
                  </div>
                )}
                {fullResponse.experienceAnalysis.velocityExplanation && (
                  <div className="text-xs text-gray-700">
                    <span className="font-medium text-blue-700">Career Velocity:</span> {fullResponse.experienceAnalysis.velocityExplanation}
                  </div>
                )}
              </div>
            )}

            {/* Seniority Match */}
            {fullResponse.experienceAnalysis.seniorityMatch && (
              <div className="p-2 bg-white dark:bg-slate-800 rounded border dark:border-gray-600 mb-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Seniority:</span>
                  <span className="font-medium">{fullResponse.experienceAnalysis.seniorityMatch.candidateLevel}</span>
                  <span className="text-gray-400">→</span>
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

            {/* Industry Experience */}
            {fullResponse.experienceAnalysis.industryExperience && fullResponse.experienceAnalysis.industryExperience.length > 0 && (
              <div className="mb-2">
                <span className="text-xs font-medium text-blue-700">Industry Experience:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {fullResponse.experienceAnalysis.industryExperience.map((ind: any, i: number) => (
                    <Badge key={i} variant="outline" className={`text-xs ${
                      ind.relevance === 'HIGH' ? 'bg-green-50 text-green-700 border-green-200' :
                      ind.relevance === 'MEDIUM' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                      'bg-gray-50 text-gray-600 border-gray-200'
                    }`}>
                      {ind.industry}: {ind.formatted || `${ind.years}y ${ind.months}m`}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Employment Gaps */}
            {fullResponse.experienceAnalysis.employmentGaps && fullResponse.experienceAnalysis.employmentGaps.length > 0 && (
              <div className="mb-2">
                <span className="text-xs font-medium text-orange-700">Employment Gaps:</span>
                <div className="space-y-1 mt-1">
                  {fullResponse.experienceAnalysis.employmentGaps.map((gap: any, i: number) => (
                    <div key={i} className={`text-xs p-2 bg-white rounded border ${
                      gap.severity === 'SIGNIFICANT' ? 'border-red-200' :
                      gap.severity === 'MODERATE' ? 'border-orange-200' :
                      'border-yellow-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span>{gap.gapStart} - {gap.gapEnd}</span>
                        <Badge variant="outline" className={`text-xs ${
                          gap.severity === 'SIGNIFICANT' ? 'bg-red-50 text-red-700' :
                          gap.severity === 'MODERATE' ? 'bg-orange-50 text-orange-700' :
                          'bg-yellow-50 text-yellow-700'
                        }`}>
                          {gap.durationMonths} months - {gap.severity}
                        </Badge>
                      </div>
                      {gap.possibleReason && (
                        <p className="text-gray-600 mt-1">{gap.possibleReason}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Role Timeline */}
            {fullResponse.experienceAnalysis.roleTimeline && fullResponse.experienceAnalysis.roleTimeline.length > 0 && (
              <div className="mt-2">
                <span className="text-xs font-medium text-blue-700">Role Timeline:</span>
                <div className="space-y-2 mt-1">
                  {fullResponse.experienceAnalysis.roleTimeline.slice(0, 5).map((role: any, i: number) => (
                    <div key={i} className="text-xs p-3 bg-white dark:bg-slate-800 rounded border dark:border-gray-600">
                      {/* Header Row */}
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <span className="font-medium text-sm">{role.title}</span>
                          <span className="text-gray-500 dark:text-gray-400"> @ {role.company}</span>
                          {role.companyType && role.companyType !== 'UNKNOWN' && (
                            <Badge variant="outline" className="ml-2 text-xs bg-gray-50 text-gray-600">
                              {role.companyType}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 dark:text-gray-400">{role.duration}</span>
                          {role.relevance && (
                            <Badge variant="outline" className={`text-xs ${
                              role.relevance === 'HIGH' ? 'bg-green-50 text-green-700' :
                              role.relevance === 'MEDIUM' ? 'bg-yellow-50 text-yellow-700' :
                              'bg-gray-50 text-gray-600'
                            }`}>
                              {role.relevance}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Date and Context Row */}
                      <div className="flex items-center gap-3 text-gray-500 mb-2">
                        {(role.startDate || role.endDate) && (
                          <span>{role.startDate} - {role.endDate}</span>
                        )}
                        {role.promotionIndicator && role.promotionIndicator !== 'UNKNOWN' && (
                          <Badge variant="outline" className={`text-xs ${
                            role.promotionIndicator === 'PROMOTED' ? 'bg-green-50 text-green-700 border-green-200' :
                            role.promotionIndicator === 'RECRUITED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            'bg-gray-50 text-gray-600'
                          }`}>
                            {role.promotionIndicator}
                          </Badge>
                        )}
                        {role.impactScope && role.impactScope !== 'INDIVIDUAL' && (
                          <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                            {role.impactScope} Impact
                          </Badge>
                        )}
                        {role.industryDomain && (
                          <span className="text-xs text-indigo-600">{role.industryDomain}</span>
                        )}
                      </div>

                      {/* Role Progression */}
                      {role.roleProgression && (
                        <p className="text-gray-600 mb-2 italic">{role.roleProgression}</p>
                      )}

                      {/* Relevance Reason */}
                      {role.relevanceReason && (
                        <div className="p-2 bg-blue-50/50 rounded mb-2">
                          <span className="font-medium text-blue-700">Why Relevant:</span>
                          <p className="text-gray-700 mt-0.5">{role.relevanceReason}</p>
                        </div>
                      )}

                      {/* Responsibilities */}
                      {role.responsibilities && (
                        <p className="text-gray-600 dark:text-gray-400 mb-2">
                          <span className="font-medium">Responsibilities:</span> {role.responsibilities}
                        </p>
                      )}

                      {/* Team Context */}
                      {role.teamContext && (
                        <p className="text-gray-500 dark:text-gray-400 mb-2">
                          <span className="font-medium">Team:</span> {role.teamContext}
                        </p>
                      )}

                      {/* Key Achievement */}
                      {role.keyAchievement && (
                        <p className="text-green-700 mb-2">
                          <span className="font-medium">Key Achievement:</span> {role.keyAchievement}
                        </p>
                      )}

                      {/* Skills & Technologies */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {role.skillsUsed && role.skillsUsed.map((skill: string, si: number) => (
                          <span key={`skill-${si}`} className="text-xs bg-blue-50 text-primary px-1.5 py-0.5 rounded">{skill}</span>
                        ))}
                        {role.technologiesUsed && role.technologiesUsed.map((tech: string, ti: number) => (
                          <span key={`tech-${ti}`} className="text-xs bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded">{tech}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tenure Analysis */}
            {fullResponse.experienceAnalysis.tenureAnalysis && (
              <div className="mt-2 p-2 bg-white/60 rounded border border-blue-100">
                <span className="text-xs font-medium text-blue-700">Tenure Analysis:</span>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  <div className="text-center">
                    <div className="text-sm font-medium">{fullResponse.experienceAnalysis.tenureAnalysis.averageTenureFormatted || `${fullResponse.experienceAnalysis.tenureAnalysis.averageTenure || 0}y`}</div>
                    <div className="text-xs text-gray-500">Avg Tenure</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium">{fullResponse.experienceAnalysis.tenureAnalysis.longestTenureFormatted || `${fullResponse.experienceAnalysis.tenureAnalysis.longestTenure || 0}y`}</div>
                    <div className="text-xs text-gray-500">Longest</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium">{fullResponse.experienceAnalysis.tenureAnalysis.shortestTenureFormatted || `${fullResponse.experienceAnalysis.tenureAnalysis.shortestTenure || 0}y`}</div>
                    <div className="text-xs text-gray-500">Shortest</div>
                  </div>
                </div>
                {fullResponse.experienceAnalysis.tenureAnalysis.pattern && (
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className={`text-xs ${
                      fullResponse.experienceAnalysis.tenureAnalysis.pattern === 'STABLE' ? 'bg-green-50 text-green-700' :
                      fullResponse.experienceAnalysis.tenureAnalysis.pattern === 'MIXED' ? 'bg-yellow-50 text-yellow-700' :
                      'bg-red-50 text-red-700'
                    }`}>
                      {fullResponse.experienceAnalysis.tenureAnalysis.pattern}
                    </Badge>
                    {fullResponse.experienceAnalysis.tenureAnalysis.patternExplanation && (
                      <span className="text-xs text-gray-600 dark:text-gray-400">{fullResponse.experienceAnalysis.tenureAnalysis.patternExplanation}</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Quantified Achievements */}
        {fullResponse.quantifiedAchievements && fullResponse.quantifiedAchievements.length > 0 && (
          <div className="p-3 bg-linear-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 rounded-lg border border-amber-200 dark:border-amber-700">
            <h5 className="font-medium text-sm mb-3 flex items-center gap-2 text-amber-800 dark:text-amber-300">
              <Star className="h-4 w-4" />
              Quantified Achievements ({fullResponse.quantifiedAchievements.length})
            </h5>
            <div className="space-y-2">
              {fullResponse.quantifiedAchievements.map((achievement: any, i: number) => (
                <div key={i} className="p-2 bg-white dark:bg-slate-800 rounded border dark:border-gray-600 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-sm">{achievement.achievement}</div>
                    {achievement.metric && (
                      <span className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded mt-1 inline-block">
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

        {/* Interview Recommendations */}
        {fullResponse.interviewRecommendations && (
          <div className="p-3 bg-linear-to-r from-teal-50 to-cyan-50 dark:from-teal-900/30 dark:to-cyan-900/30 rounded-lg border border-teal-200 dark:border-teal-700">
            <h5 className="font-medium text-sm mb-3 flex items-center gap-2 text-teal-800 dark:text-teal-300">
              <Users className="h-4 w-4" />
              Interview Preparation Guide
            </h5>
            {typeof fullResponse.interviewRecommendations === "object" && !Array.isArray(fullResponse.interviewRecommendations) ? (
              <div className="space-y-3">
                {fullResponse.interviewRecommendations.mustExplore?.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-teal-700 dark:text-teal-300 mb-1">Must Explore</div>
                    <ul className="space-y-1">
                      {fullResponse.interviewRecommendations.mustExplore.map((item: string, i: number) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-teal-600">→</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {fullResponse.interviewRecommendations.technicalValidation?.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-blue-700 mb-1">Technical Validation</div>
                    <ul className="space-y-1">
                      {fullResponse.interviewRecommendations.technicalValidation.map((item: string, i: number) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-primary">✓</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : Array.isArray(fullResponse.interviewRecommendations) ? (
              <ul className="space-y-1">
                {fullResponse.interviewRecommendations.map((rec: string, i: number) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <span className="text-teal-500">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )}

        {/* Red Flags */}
        {fullResponse.redFlags && fullResponse.redFlags.length > 0 && (
          <div className="p-3 bg-linear-to-r from-red-50 to-pink-50 dark:from-red-900/30 dark:to-pink-900/30 rounded-lg border border-red-200 dark:border-red-700">
            <h5 className="font-medium text-sm mb-3 flex items-center gap-2 text-red-800 dark:text-red-300">
              <AlertTriangle className="h-4 w-4" />
              Red Flags ({fullResponse.redFlags.length})
            </h5>
            <div className="space-y-2">
              {fullResponse.redFlags.map((flag: any, i: number) => (
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
                    <p className="text-xs text-gray-600 mt-1">Evidence: {flag.evidence}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );

    return isNewFormat ? renderNewFormat() : null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/hiring/resumes")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
              {profile.name || "Unnamed Profile"}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Resume Profile</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Export PDF
          </Button>
        </div>
      </div>

      {/* Job Selector */}
      {jobs.length > 0 && (
        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                View analysis for job:
              </label>
              <Select value={selectedJobId || "none"} onValueChange={(value) => setSelectedJobId(value === "none" ? "" : value)}>
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Select a job to see analysis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No job selected</SelectItem>
                  {jobs.map((job) => (
                    <SelectItem key={job.id} value={job.id.toString()}>
                      {job.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <div className="space-y-6">
        {/* Contact & Basic Info Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Contact Card */}
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-linear-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-xl">
                  {profile.name?.[0]?.toUpperCase() || profile.email?.[0]?.toUpperCase() || "R"}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{profile.name || "Unnamed"}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Added {new Date(profile.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {profile.email && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span>{profile.email}</span>
                </div>
              )}
              {profile.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>{profile.phone}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Overall Score Card */}
          {selectedJobScore && (
            <Card className={`${getScoreBgColor(selectedJobScore.overallScore)} border-2`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Star className="w-5 h-5" />
                  Match Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className={`text-5xl font-bold ${getScoreColor(selectedJobScore.overallScore)}`}>
                    {selectedJobScore.overallScore}%
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    for {selectedJobScore.jobTitle}
                  </p>
                  {selectedJobScore.disqualified && (
                    <Badge className="mt-2 bg-red-100 text-red-700">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Disqualified
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Languages */}
          {profile.languages && profile.languages.length > 0 && (
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Languages className="w-5 h-5" />
                  Languages
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {profile.languages.map((lang, idx) => (
                    <Badge key={idx} variant="outline">{lang}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Details & Analysis Section */}
        <div className="space-y-4">
          {/* Detailed Analysis (if job selected) */}
          {selectedJobScore && (
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-500" />
                  Detailed Analysis for {selectedJobScore.jobTitle}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DetailedAnalysis jobScore={selectedJobScore} />
              </CardContent>
            </Card>
          )}

          {/* Summary */}
          {profile.summary && (
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg">Professional Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {profile.summary}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Skills */}
          {profile.skills && profile.skills.length > 0 && (
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Skills
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill, idx) => (
                    <Badge key={idx} variant="secondary">{skill}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Experience */}
          {profile.experience && profile.experience.length > 0 && (
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Briefcase className="w-5 h-5" />
                  Experience
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {profile.experience.map((exp, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                      {exp}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Education */}
          {profile.education && profile.education.length > 0 && (
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <GraduationCap className="w-5 h-5" />
                  Education
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {profile.education.map((edu, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                      {edu}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Certifications */}
          {profile.certifications && profile.certifications.length > 0 && (
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Certifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {profile.certifications.map((cert, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>{cert}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
