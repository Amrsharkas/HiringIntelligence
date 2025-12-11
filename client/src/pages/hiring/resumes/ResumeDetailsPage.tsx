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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ProfilePDF } from "@/components/ProfilePDF";

interface JobScore {
  jobId: string;
  jobTitle: string;
  overallScore: number;
  disqualified?: boolean;
  invitationStatus?: string | null;
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
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
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
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return "bg-green-100 dark:bg-green-900/30";
    if (score >= 60) return "bg-yellow-100 dark:bg-yellow-900/30";
    return "bg-red-100 dark:bg-red-900/30";
  };

  // Detailed Analysis Component - matches the pattern from ResumeProfilesList
  const DetailedAnalysis = ({ jobScore }: { jobScore: JobScore }) => {
    const fullResponse = jobScore?.fullResponse;
    if (!fullResponse) {
      return (
        <div className="text-center py-4 text-slate-500 dark:text-slate-400">
          <p className="text-sm">No detailed analysis available for this job match.</p>
          <p className="text-xs mt-1">Analysis data may not have been generated yet.</p>
        </div>
      );
    }

    const { detailedBreakdown } = fullResponse;
    const isNewFormat = detailedBreakdown?.sectionA !== undefined;

    const renderSubsectionItem = (label: string, data: any, maxScore?: number) => {
      if (!data) return null;
      const score = data.score ?? data.points ?? 0;
      const percentage = maxScore ? Math.round((score / maxScore) * 100) : null;

      return (
        <div className="p-2 bg-white dark:bg-slate-800 rounded border">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{label}</span>
            <div className="flex items-center gap-2">
              {maxScore && (
                <span className={`text-sm font-bold ${getScoreColor(percentage || 0)}`}>
                  {score}/{maxScore}
                </span>
              )}
              {percentage !== null && (
                <span className="text-xs text-slate-500">({percentage}%)</span>
              )}
            </div>
          </div>
          {(data.evidence || data.reasoning || data.rationale) && (
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              {data.evidence || data.reasoning || data.rationale}
            </p>
          )}
        </div>
      );
    };

    if (!isNewFormat) {
      // Legacy format rendering
      return (
        <div className="space-y-4">
          {fullResponse.matchSummary && (
            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <CardContent className="p-4">
                <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">Match Summary</h4>
                <p className="text-sm text-blue-700 dark:text-blue-400">{fullResponse.matchSummary}</p>
              </CardContent>
            </Card>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Score Summary Grid */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <div className={`text-center p-3 rounded-lg border ${getScoreBgColor((fullResponse.sectionA / 30) * 100)}`}>
            <div className={`text-lg font-bold ${getScoreColor((fullResponse.sectionA / 30) * 100)}`}>
              {fullResponse.sectionA ?? "-"}/30
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400">Skills</div>
          </div>
          <div className={`text-center p-3 rounded-lg border ${getScoreBgColor((fullResponse.sectionB / 25) * 100)}`}>
            <div className={`text-lg font-bold ${getScoreColor((fullResponse.sectionB / 25) * 100)}`}>
              {fullResponse.sectionB ?? "-"}/25
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400">Experience</div>
          </div>
          <div className={`text-center p-3 rounded-lg border ${getScoreBgColor((fullResponse.sectionC / 20) * 100)}`}>
            <div className={`text-lg font-bold ${getScoreColor((fullResponse.sectionC / 20) * 100)}`}>
              {fullResponse.sectionC ?? "-"}/20
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400">Impact</div>
          </div>
          <div className={`text-center p-3 rounded-lg border ${getScoreBgColor((fullResponse.sectionD / 10) * 100)}`}>
            <div className={`text-lg font-bold ${getScoreColor((fullResponse.sectionD / 10) * 100)}`}>
              {fullResponse.sectionD ?? "-"}/10
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400">Qualifications</div>
          </div>
          <div className={`text-center p-3 rounded-lg border ${getScoreBgColor((fullResponse.sectionE / 10) * 100)}`}>
            <div className={`text-lg font-bold ${getScoreColor((fullResponse.sectionE / 10) * 100)}`}>
              {fullResponse.sectionE ?? "-"}/10
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400">Logistics</div>
          </div>
          <div className="text-center p-3 rounded-lg border bg-slate-50 dark:bg-slate-800">
            <div className={`text-lg font-bold ${(fullResponse.sectionF ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
              {(fullResponse.sectionF ?? 0) >= 0 ? "+" : ""}{fullResponse.sectionF ?? 0}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400">Modifiers</div>
          </div>
        </div>

        {/* Detailed Accordion Sections */}
        <Accordion type="multiple" className="space-y-2">
          {/* Section A: Technical Skills */}
          {detailedBreakdown?.sectionA && (
            <AccordionItem value="sectionA" className="bg-white dark:bg-slate-800 rounded-lg border overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-slate-50 dark:hover:bg-slate-700">
                <div className="flex items-center justify-between w-full pr-2">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">Section A: Technical Skills</span>
                  </div>
                  <Badge className={getScoreBgColor((fullResponse.sectionA / 30) * 100)}>
                    {fullResponse.sectionA}/30
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-2 pt-2 border-t">
                  {renderSubsectionItem("A1: Required Skills", detailedBreakdown.sectionA.A1_requiredSkills, 15)}
                  {renderSubsectionItem("A2: Nice-to-Have Skills", detailedBreakdown.sectionA.A2_niceToHaveSkills, 10)}
                  {renderSubsectionItem("A3: Domain Knowledge", detailedBreakdown.sectionA.A3_domainKnowledge, 5)}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Section B: Experience */}
          {detailedBreakdown?.sectionB && (
            <AccordionItem value="sectionB" className="bg-white dark:bg-slate-800 rounded-lg border overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-slate-50 dark:hover:bg-slate-700">
                <div className="flex items-center justify-between w-full pr-2">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">Section B: Experience</span>
                  </div>
                  <Badge className={getScoreBgColor((fullResponse.sectionB / 25) * 100)}>
                    {fullResponse.sectionB}/25
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-2 pt-2 border-t">
                  {renderSubsectionItem("B1: Years of Experience", detailedBreakdown.sectionB.B1_yearsOfExperience, 10)}
                  {renderSubsectionItem("B2: Relevant Experience", detailedBreakdown.sectionB.B2_relevantExperience, 10)}
                  {renderSubsectionItem("B3: Career Trajectory", detailedBreakdown.sectionB.B3_careerTrajectory, 5)}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Section C: Impact */}
          {detailedBreakdown?.sectionC && (
            <AccordionItem value="sectionC" className="bg-white dark:bg-slate-800 rounded-lg border overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-slate-50 dark:hover:bg-slate-700">
                <div className="flex items-center justify-between w-full pr-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">Section C: Impact & Achievements</span>
                  </div>
                  <Badge className={getScoreBgColor((fullResponse.sectionC / 20) * 100)}>
                    {fullResponse.sectionC}/20
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-2 pt-2 border-t">
                  {renderSubsectionItem("C1: Quantified Results", detailedBreakdown.sectionC.C1_quantifiedResults, 12)}
                  {renderSubsectionItem("C2: Soft Skills Evidence", detailedBreakdown.sectionC.C2_softSkills, 8)}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Section D: Qualifications */}
          {detailedBreakdown?.sectionD && (
            <AccordionItem value="sectionD" className="bg-white dark:bg-slate-800 rounded-lg border overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-slate-50 dark:hover:bg-slate-700">
                <div className="flex items-center justify-between w-full pr-2">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">Section D: Qualifications</span>
                  </div>
                  <Badge className={getScoreBgColor((fullResponse.sectionD / 10) * 100)}>
                    {fullResponse.sectionD}/10
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-2 pt-2 border-t">
                  {renderSubsectionItem("D1: Education", detailedBreakdown.sectionD.D1_education, 5)}
                  {renderSubsectionItem("D2: Certifications", detailedBreakdown.sectionD.D2_certifications, 5)}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Section E: Logistics */}
          {detailedBreakdown?.sectionE && (
            <AccordionItem value="sectionE" className="bg-white dark:bg-slate-800 rounded-lg border overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-slate-50 dark:hover:bg-slate-700">
                <div className="flex items-center justify-between w-full pr-2">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">Section E: Logistics & Compatibility</span>
                  </div>
                  <Badge className={getScoreBgColor((fullResponse.sectionE / 10) * 100)}>
                    {fullResponse.sectionE}/10
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-2 pt-2 border-t">
                  {renderSubsectionItem("E1: Location Match", detailedBreakdown.sectionE.E1_location, 4)}
                  {renderSubsectionItem("E2: Language", detailedBreakdown.sectionE.E2_language, 3)}
                  {renderSubsectionItem("E3: Contact Quality", detailedBreakdown.sectionE.E3_contactQuality, 3)}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Section F: Modifiers */}
          {detailedBreakdown?.sectionF && (
            <AccordionItem value="sectionF" className="bg-white dark:bg-slate-800 rounded-lg border overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-slate-50 dark:hover:bg-slate-700">
                <div className="flex items-center justify-between w-full pr-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <span className="font-medium">Section F: Bonus & Penalties</span>
                  </div>
                  <Badge className={(fullResponse.sectionF ?? 0) >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                    {(fullResponse.sectionF ?? 0) >= 0 ? "+" : ""}{fullResponse.sectionF ?? 0}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-2 pt-2 border-t">
                  {renderSubsectionItem("Bonus Points", detailedBreakdown.sectionF.bonusPoints || detailedBreakdown.sectionF.F2_bonusPoints, 5)}
                  {detailedBreakdown.sectionF.penalties && (
                    <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200">
                      <span className="text-xs font-medium text-red-700 dark:text-red-300">Penalties Applied</span>
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        {typeof detailedBreakdown.sectionF.penalties === "string"
                          ? detailedBreakdown.sectionF.penalties
                          : JSON.stringify(detailedBreakdown.sectionF.penalties)}
                      </p>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>

        {/* Quick Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 text-center">
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">
              {fullResponse.strengthsHighlights?.length || 0}
            </div>
            <div className="text-xs text-green-600 dark:text-green-500">Strengths Found</div>
          </div>
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 text-center">
            <div className="text-2xl font-bold text-red-700 dark:text-red-400">
              {fullResponse.improvementAreas?.length || 0}
            </div>
            <div className="text-xs text-red-600 dark:text-red-500">Gaps Identified</div>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 text-center">
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
              {fullResponse.skillAnalysis?.matchedSkills?.length || 0}
            </div>
            <div className="text-xs text-amber-600 dark:text-amber-500">Skills Matched</div>
          </div>
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 text-center">
            <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">
              {fullResponse.skillAnalysis?.missingSkills?.length || 0}
            </div>
            <div className="text-xs text-purple-600 dark:text-purple-500">Skills Missing</div>
          </div>
        </div>

        {/* Strengths & Gaps */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Strengths */}
          {fullResponse.strengthsHighlights && fullResponse.strengthsHighlights.length > 0 && (
            <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-green-800 dark:text-green-300">
                  <CheckCircle className="h-4 w-4" />
                  Strengths ({fullResponse.strengthsHighlights.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {fullResponse.strengthsHighlights.map((item: any, i: number) => (
                  <div key={i} className="p-2 bg-white dark:bg-slate-800 rounded border border-green-100 dark:border-green-900">
                    <div className="text-sm font-medium text-green-800 dark:text-green-300">
                      {item.strength || (typeof item === "string" ? item : "Strength identified")}
                    </div>
                    {item.evidence && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        Evidence: {item.evidence}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Gaps */}
          {fullResponse.improvementAreas && fullResponse.improvementAreas.length > 0 && (
            <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-red-800 dark:text-red-300">
                  <AlertTriangle className="h-4 w-4" />
                  Gaps & Concerns ({fullResponse.improvementAreas.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {fullResponse.improvementAreas.map((item: any, i: number) => (
                  <div key={i} className="p-2 bg-white dark:bg-slate-800 rounded border border-red-100 dark:border-red-900">
                    <div className="flex items-start justify-between">
                      <div className="text-sm font-medium text-red-800 dark:text-red-300">
                        {item.gap || (typeof item === "string" ? item : "Gap identified")}
                      </div>
                      {item.severity && (
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            item.severity === "CRITICAL"
                              ? "bg-red-100 text-red-700 border-red-300"
                              : item.severity === "MAJOR"
                              ? "bg-orange-100 text-orange-700 border-orange-300"
                              : "bg-yellow-100 text-yellow-700 border-yellow-300"
                          }`}
                        >
                          {item.severity}
                        </Badge>
                      )}
                    </div>
                    {item.reason && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{item.reason}</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Interview Recommendations */}
        {fullResponse.interviewRecommendations && (
          <Card className="bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-teal-800 dark:text-teal-300">
                <Users className="h-4 w-4" />
                Interview Preparation Guide
              </CardTitle>
            </CardHeader>
            <CardContent>
              {typeof fullResponse.interviewRecommendations === "object" && !Array.isArray(fullResponse.interviewRecommendations) ? (
                <div className="space-y-3">
                  {fullResponse.interviewRecommendations.mustExplore?.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-teal-700 dark:text-teal-400 mb-1">Must Explore</div>
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
                      <div className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">Technical Validation</div>
                      <ul className="space-y-1">
                        {fullResponse.interviewRecommendations.technicalValidation.map((item: string, i: number) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <span className="text-blue-500">✓</span>
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
            </CardContent>
          </Card>
        )}

        {/* Red Flags */}
        {fullResponse.redFlags && fullResponse.redFlags.length > 0 && (
          <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-red-800 dark:text-red-300">
                <AlertTriangle className="h-4 w-4" />
                Red Flags ({fullResponse.redFlags.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {fullResponse.redFlags.map((flag: any, i: number) => (
                <div key={i} className="p-2 bg-white dark:bg-slate-800 rounded border border-red-200">
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
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Evidence: {flag.evidence}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    );
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Contact & Basic Info */}
        <div className="space-y-4">
          {/* Contact Card */}
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-xl">
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

        {/* Right Column - Details & Analysis */}
        <div className="lg:col-span-2 space-y-4">
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
