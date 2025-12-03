import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';

// Type definitions for fullResponse
interface FullResponse {
  executiveSummary?: {
    oneLiner?: string;
    fitScore?: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'MISMATCH';
    hiringUrgency?: 'EXPEDITE' | 'STANDARD' | 'LOW_PRIORITY' | 'PASS';
    competitivePosition?: string;
  };
  verdict?: {
    decision?: 'INTERVIEW' | 'CONSIDER' | 'REVIEW' | 'PASS';
    confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
    riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    summary?: string;
    topStrength?: string;
    topConcern?: string;
    dealbreakers?: string[];
  };
  recommendation?: string;
  recommendationReason?: string;
  sectionA?: number;
  sectionB?: number;
  sectionC?: number;
  sectionD?: number;
  sectionE?: number;
  sectionF?: number;
  domainAnalysis?: {
    jobDescriptionDomain?: string;
    jdDomain?: string;
    candidateDomain?: string;
    domainMatchLevel?: string;
    domainMatchScore?: number;
    domainPenaltyPercent?: number;
    domainPenalty?: number;
    transferabilityNotes?: string;
    domainNotes?: string;
    matchRationale?: {
      step1_jobDomain?: string;
      step2_candidateDomain?: string;
      step3_overlaps?: string;
      step4_gaps?: string;
      step5_verdict?: string;
    } | string;
    domainMatchExplanation?: string;
    domainRiskLevel?: string;
    rampUpEstimate?: string;
    domainRiskExplanation?: string;
    previousDomainTransitions?: string;
    industryContext?: string;
    crossoverSkills?: string[];
    domainGaps?: Array<string | { gap: string; importance?: string; reason?: string; canBeLearnedOnJob?: boolean; estimatedRampUpTime?: string }>;
    domainHiringRecommendation?: string;
    domainTransitionSuccess?: string;
    domainHiringRationale?: string;
    competitiveAdvantage?: string;
    domainInterviewQuestions?: string[];
    domainOnboardingNeeds?: string[];
  };
  competitiveIntel?: {
    marketPosition?: string;
    salaryExpectation?: string;
    urgencyToHire?: string;
    urgencyReason?: string;
    growthPotential?: string;
    growthPotentialReason?: string;
    flightRisk?: string;
    flightRiskReason?: string;
    counterofferRisk?: string;
    counterofferRiskReason?: string;
    competitorRisk?: string;
    negotiationLeverage?: string;
    timingConsiderations?: string;
    retentionFactors?: string[];
  };
  skillAnalysis?: {
    skillDepthSummary?: {
      expert?: number;
      proficient?: number;
      familiar?: number;
      listedOnly?: number;
    };
    matchedSkills?: Array<{ skill: string; depth: string; yearsUsed?: number }>;
    missingSkills?: Array<string | { skill: string; importance?: string }>;
    partialMatches?: Array<{ required: string; found: string; similarity?: number }>;
  };
  experienceAnalysis?: {
    experienceSummary?: string;
    totalYears?: number;
    totalMonths?: number;
    totalExperienceFormatted?: string;
    relevantYears?: number;
    relevantMonths?: number;
    relevantExperienceFormatted?: string;
    domainYears?: number;
    domainMonths?: number;
    domainExperienceFormatted?: string;
    careerProgression?: 'ASCENDING' | 'STABLE' | 'MIXED' | 'DESCENDING';
    progressionExplanation?: string;
    velocityExplanation?: string;
    seniorityMatch?: {
      candidateLevel?: string;
      jobRequiredLevel?: string;
      jdLevel?: string;
      match?: string;
      gapExplanation?: string;
    };
    industryExperience?: Array<{ industry: string; years?: number; months?: number; formatted?: string; relevance?: string }>;
    employmentGaps?: Array<{ gapStart: string; gapEnd: string; durationMonths: number; severity: string; possibleReason?: string }>;
    roleTimeline?: Array<{
      title: string;
      company: string;
      companyType?: string;
      duration?: string;
      startDate?: string;
      endDate?: string;
      relevance?: string;
      relevanceReason?: string;
      promotionIndicator?: string;
      impactScope?: string;
      industryDomain?: string;
      roleProgression?: string;
      responsibilities?: string;
      teamContext?: string;
      keyAchievement?: string;
      skillsUsed?: string[];
      technologiesUsed?: string[];
    }>;
    tenureAnalysis?: {
      averageTenure?: number;
      averageTenureFormatted?: string;
      longestTenure?: number;
      longestTenureFormatted?: string;
      shortestTenure?: number;
      shortestTenureFormatted?: string;
      pattern?: string;
      patternExplanation?: string;
    };
  };
  quantifiedAchievements?: Array<{ achievement: string; metric?: string; category?: string; verified?: boolean }>;
  strengthsHighlights?: Array<string | { strength: string; evidence?: string; impact?: string; relevanceToJob?: string; relevanceToJD?: string }>;
  improvementAreas?: Array<string | {
    gap: string;
    severity?: string;
    jobRequirement?: string;
    jdRequirement?: string;
    reason?: string;
    impact?: string;
    evidenceFromResume?: string;
    recommendation?: string;
    workaround?: string;
    timeToAddress?: string;
    trainable?: boolean
  }>;
  redFlags?: Array<{ type?: string; severity?: string; issue: string; evidence?: string; dates?: string; impact?: string }>;
  interviewRecommendations?: {
    mustExplore?: string[];
    redFlagQuestions?: string[];
    technicalValidation?: string[];
    culturalFitTopics?: string[];
    referenceCheckFocus?: string[];
  } | string[];
  detailedBreakdown?: {
    sectionA?: any;
    sectionB?: any;
    sectionC?: any;
    sectionD?: any;
    sectionE?: any;
    sectionF?: any;
    technicalSkills?: Array<{ requirement: string; present: boolean | 'partial'; evidence?: string; missingDetail?: string; gapPercentage?: number }>;
    experience?: Array<{ requirement: string; present: boolean | 'partial'; evidence?: string; missingDetail?: string; gapPercentage?: number }>;
    educationAndCertifications?: Array<{ requirement: string; present: boolean | 'partial'; evidence?: string; missingDetail?: string; gapPercentage?: number }>;
    culturalFitAndSoftSkills?: Array<{ requirement: string; present: boolean | 'partial'; evidence?: string; missingDetail?: string; gapPercentage?: number }>;
  };
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
}

interface JobScoring {
  jobId: string;
  jobTitle: string;
  overallScore: number;
  technicalSkillsScore: number;
  experienceScore: number;
  culturalFitScore: number;
  matchSummary: string;
  strengthsHighlights: string[];
  improvementAreas: string[];
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
  fullResponse?: FullResponse;
}

interface ProfilePDFProps {
  profile: ResumeProfile & { jobScores: JobScoring[] };
  jobs?: any[];
  includeJobScores?: boolean;
  selectedJobId?: string;
}

// Color utility functions
const getVerdictColor = (decision?: string) => {
  switch (decision?.toUpperCase()) {
    case 'INTERVIEW': return { bg: '#059669', text: '#ffffff' };
    case 'CONSIDER': return { bg: '#3b82f6', text: '#ffffff' };
    case 'REVIEW': return { bg: '#eab308', text: '#ffffff' };
    case 'PASS': return { bg: '#dc2626', text: '#ffffff' };
    default: return { bg: '#6b7280', text: '#ffffff' };
  }
};

const getFitScoreColor = (fitScore?: string) => {
  switch (fitScore) {
    case 'EXCELLENT': return '#059669';
    case 'GOOD': return '#3b82f6';
    case 'FAIR': return '#eab308';
    case 'POOR': return '#f97316';
    default: return '#dc2626';
  }
};

const getSeverityColor = (severity?: string) => {
  switch (severity?.toUpperCase()) {
    case 'CRITICAL': return { bg: '#fef2f2', border: '#dc2626', text: '#991b1b' };
    case 'HIGH': return { bg: '#fef2f2', border: '#dc2626', text: '#991b1b' };
    case 'MAJOR': return { bg: '#fff7ed', border: '#f97316', text: '#9a3412' };
    case 'MEDIUM': return { bg: '#fff7ed', border: '#f97316', text: '#9a3412' };
    case 'MINOR': return { bg: '#fefce8', border: '#eab308', text: '#854d0e' };
    case 'LOW': return { bg: '#fefce8', border: '#eab308', text: '#854d0e' };
    default: return { bg: '#f3f4f6', border: '#9ca3af', text: '#374151' };
  }
};

const getDomainMatchColor = (level?: string) => {
  switch (level?.toUpperCase()) {
    case 'EXACT': return { bg: '#dcfce7', text: '#166534' };
    case 'RELATED': return { bg: '#dbeafe', text: '#1e40af' };
    case 'ADJACENT': return { bg: '#fef9c3', text: '#854d0e' };
    case 'DIFFERENT': return { bg: '#ffedd5', text: '#9a3412' };
    case 'UNRELATED': return { bg: '#fee2e2', text: '#991b1b' };
    default: return { bg: '#f3f4f6', text: '#374151' };
  }
};

const getSkillDepthColor = (depth?: string) => {
  switch (depth?.toUpperCase()) {
    case 'EXPERT': return { bg: '#dcfce7', text: '#166534' };
    case 'PROFICIENT': return { bg: '#dbeafe', text: '#1e40af' };
    case 'FAMILIAR': return { bg: '#fef9c3', text: '#854d0e' };
    default: return { bg: '#f3f4f6', text: '#4b5563' };
  }
};

const styles = StyleSheet.create({
  // Page styles
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 40,
    fontSize: 10,
    lineHeight: 1.4,
    fontFamily: 'Helvetica',
  },

  // Header Section
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#2563eb',
    borderBottomStyle: 'solid',
    paddingBottom: 15,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  contactInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  contactItem: {
    fontSize: 10,
    color: '#64748b',
  },

  // Section styles
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    borderBottomStyle: 'solid',
  },

  // Profile content
  summary: {
    fontSize: 10,
    color: '#334155',
    lineHeight: 1.5,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  skill: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 3,
    fontSize: 8,
    color: '#334155',
  },
  listItem: {
    marginBottom: 6,
    paddingLeft: 8,
  },
  listItemText: {
    fontSize: 10,
    color: '#334155',
  },
  languagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  language: {
    fontSize: 9,
    color: '#334155',
  },

  // Job Match Section - Card style
  jobMatchCard: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'solid',
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },

  // Executive Summary Block
  executiveSummaryBlock: {
    backgroundColor: '#1e293b',
    padding: 12,
    borderRadius: 4,
    marginBottom: 16,
  },
  executiveSummaryText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 3,
    fontSize: 8,
    fontWeight: 'bold',
  },

  // Verdict Block
  verdictBlock: {
    padding: 12,
    borderRadius: 4,
    marginBottom: 16,
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  verdictHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  verdictBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 'bold',
  },
  verdictMeta: {
    flexDirection: 'row',
    gap: 6,
  },
  verdictMetaBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 3,
    fontSize: 7,
    fontWeight: 'bold',
  },
  verdictSummary: {
    fontSize: 10,
    color: '#374151',
    marginBottom: 10,
    lineHeight: 1.4,
  },
  verdictGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  verdictStrengthBox: {
    flex: 1,
    padding: 8,
    backgroundColor: '#f0fdf4',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#86efac',
    borderStyle: 'solid',
  },
  verdictConcernBox: {
    flex: 1,
    padding: 8,
    backgroundColor: '#fff7ed',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#fdba74',
    borderStyle: 'solid',
  },
  verdictLabel: {
    fontSize: 7,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  verdictValue: {
    fontSize: 9,
    color: '#374151',
  },
  dealbreakersBox: {
    padding: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderStyle: 'solid',
  },
  dealbreakerItem: {
    fontSize: 8,
    color: '#991b1b',
    marginBottom: 2,
  },

  // Section Scores Grid
  scoresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
    padding: 10,
    backgroundColor: '#eff6ff',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderStyle: 'solid',
  },
  scoreBox: {
    width: '15%',
    textAlign: 'center',
    padding: 6,
    backgroundColor: '#ffffff',
    borderRadius: 3,
  },
  scoreValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e40af',
  },
  scoreMax: {
    fontSize: 7,
    color: '#6b7280',
  },
  scoreLabel: {
    fontSize: 7,
    color: '#3b82f6',
    fontWeight: 'bold',
    marginTop: 2,
  },

  // Domain Analysis Block
  domainBlock: {
    padding: 12,
    backgroundColor: '#eef2ff',
    borderRadius: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#c7d2fe',
    borderStyle: 'solid',
  },
  domainHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  domainInfo: {
    flex: 1,
  },
  domainLabel: {
    fontSize: 7,
    color: '#6b7280',
  },
  domainValue: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  domainBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 3,
    fontSize: 8,
    fontWeight: 'bold',
  },
  rationaleBox: {
    padding: 8,
    backgroundColor: '#ffffff',
    borderRadius: 3,
    marginTop: 8,
  },
  rationaleStep: {
    flexDirection: 'row',
    marginBottom: 4,
    alignItems: 'flex-start',
  },
  rationaleNumber: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#6366f1',
    color: '#ffffff',
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 16,
    marginRight: 6,
  },
  rationaleText: {
    flex: 1,
    fontSize: 8,
    color: '#374151',
  },

  // Quick Stats Grid
  statsGrid: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    textAlign: 'center',
    padding: 8,
    borderRadius: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 7,
  },

  // Strengths & Gaps Container
  strengthsGapsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  strengthsColumn: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f0fdf4',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#86efac',
    borderStyle: 'solid',
  },
  gapsColumn: {
    flex: 1,
    padding: 10,
    backgroundColor: '#fef2f2',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderStyle: 'solid',
  },
  columnTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  itemCard: {
    marginBottom: 6,
    padding: 6,
    backgroundColor: '#ffffff',
    borderRadius: 3,
  },
  itemTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 2,
  },
  itemEvidence: {
    fontSize: 7,
    color: '#6b7280',
  },
  itemImpact: {
    fontSize: 7,
    fontWeight: 'bold',
    marginTop: 2,
  },

  // Skill Analysis Block
  skillAnalysisBlock: {
    padding: 12,
    backgroundColor: '#f0fdf4',
    borderRadius: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#86efac',
    borderStyle: 'solid',
  },
  skillDepthRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  skillDepthBox: {
    flex: 1,
    textAlign: 'center',
    padding: 6,
    borderRadius: 3,
  },
  skillDepthCount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  skillDepthLabel: {
    fontSize: 7,
  },
  skillBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    marginTop: 6,
  },
  skillBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 3,
    fontSize: 7,
  },

  // Experience Analysis Block
  experienceBlock: {
    padding: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderStyle: 'solid',
  },
  experienceGrid: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  experienceBox: {
    flex: 1,
    textAlign: 'center',
    padding: 8,
    backgroundColor: '#ffffff',
    borderRadius: 3,
  },
  experienceValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e40af',
  },
  experienceLabel: {
    fontSize: 7,
    color: '#6b7280',
  },
  roleCard: {
    marginBottom: 8,
    padding: 8,
    backgroundColor: '#ffffff',
    borderRadius: 3,
  },
  roleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  roleTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  roleCompany: {
    fontSize: 9,
    color: '#6b7280',
  },
  roleDuration: {
    fontSize: 8,
    color: '#6b7280',
  },
  roleRelevance: {
    fontSize: 8,
    color: '#059669',
    marginTop: 2,
  },
  tenureBox: {
    marginTop: 8,
    padding: 6,
    backgroundColor: '#ffffff',
    borderRadius: 3,
  },

  // Red Flags Block
  redFlagsBlock: {
    padding: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderStyle: 'solid',
  },
  redFlagCard: {
    marginBottom: 8,
    padding: 8,
    backgroundColor: '#ffffff',
    borderRadius: 3,
  },
  redFlagHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  redFlagType: {
    fontSize: 7,
    fontWeight: 'bold',
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 2,
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  redFlagSeverity: {
    fontSize: 7,
    fontWeight: 'bold',
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 2,
  },
  redFlagIssue: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#991b1b',
    marginBottom: 2,
  },
  redFlagEvidence: {
    fontSize: 8,
    color: '#6b7280',
  },

  // Interview Section
  interviewBlock: {
    padding: 12,
    backgroundColor: '#f0fdfa',
    borderRadius: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#5eead4',
    borderStyle: 'solid',
  },
  interviewCategory: {
    marginBottom: 10,
  },
  interviewCategoryTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  interviewItem: {
    fontSize: 8,
    color: '#374151',
    marginBottom: 3,
    paddingLeft: 10,
  },

  // Match Summary
  matchSummaryBox: {
    fontSize: 9,
    color: '#475569',
    marginTop: 8,
    fontStyle: 'italic',
    padding: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 3,
  },

  // Status Badge
  statusBadge: {
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: 'bold',
  },

  // Disqualified Section
  disqualifiedBlock: {
    backgroundColor: '#fef2f2',
    borderWidth: 2,
    borderColor: '#ef4444',
    borderStyle: 'solid',
    borderRadius: 5,
    padding: 12,
    marginBottom: 16,
  },
  disqualifiedTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 6,
    textAlign: 'center',
  },
  disqualifiedReason: {
    fontSize: 10,
    color: '#991b1b',
    fontStyle: 'italic',
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#94a3b8',
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    borderTopStyle: 'solid',
    paddingTop: 10,
  },

  // Page break helper
  pageBreakBefore: {
    marginTop: 0,
  },

  // Block title (for section headers within job analysis)
  blockTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 6,
    paddingBottom: 0,
    borderBottomWidth: 0,
  },

  // Competitive Intel Block
  competitiveBlock: {
    padding: 12,
    backgroundColor: '#faf5ff',
    borderRadius: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9d5ff',
    borderStyle: 'solid',
  },
  competitiveGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  competitiveItem: {
    width: '23%',
    padding: 6,
    backgroundColor: '#ffffff',
    borderRadius: 3,
  },
  competitiveLabel: {
    fontSize: 7,
    color: '#6b7280',
  },
  competitiveValue: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#7c3aed',
  },
});

export const ProfilePDF: React.FC<ProfilePDFProps> = ({
  profile,
  includeJobScores = true,
  selectedJobId
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const filteredJobScores = includeJobScores
    ? selectedJobId
      ? profile.jobScores.filter(score => score.jobId === selectedJobId)
      : profile.jobScores
    : [];

  return (
    <Document>
      {/* Page 1: Profile Overview */}
      <Page size="A4" style={styles.page} wrap>
        {/* Header Section - Never break */}
        <View style={styles.header} wrap={false}>
          <Text style={styles.name}>{profile.name}</Text>
          <View style={styles.contactInfo}>
            <Text style={styles.contactItem}>{profile.email}</Text>
            <Text style={styles.contactItem}>{profile.phone}</Text>
            <Text style={styles.contactItem}>Generated: {formatDate(new Date().toISOString())}</Text>
          </View>
        </View>

        {/* Professional Summary - Keep together */}
        {profile.summary && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Professional Summary</Text>
            <Text style={styles.summary}>{profile.summary}</Text>
          </View>
        )}

        {/* Skills Section */}
        {profile.skills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skills</Text>
            <View style={styles.skillsContainer}>
              {profile.skills.map((skill, index) => (
                <Text key={index} style={styles.skill}>{skill}</Text>
              ))}
            </View>
          </View>
        )}

        {/* Languages Section - Keep together */}
        {profile.languages.length > 0 && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Languages</Text>
            <View style={styles.languagesContainer}>
              {profile.languages.map((language, index) => (
                <Text key={index} style={styles.language}>
                  {language}{index < profile.languages.length - 1 ? ' | ' : ''}
                </Text>
              ))}
            </View>
          </View>
        )}

        {/* Experience Section */}
        {profile.experience.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Professional Experience</Text>
            {profile.experience.map((exp, index) => (
              <View key={index} style={styles.listItem} wrap={false}>
                <Text style={styles.listItemText}>{exp}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Education Section */}
        {profile.education.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Education</Text>
            {profile.education.map((edu, index) => (
              <View key={index} style={styles.listItem} wrap={false}>
                <Text style={styles.listItemText}>{edu}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Certifications Section */}
        {profile.certifications.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Certifications</Text>
            {profile.certifications.map((cert, index) => (
              <View key={index} style={styles.listItem} wrap={false}>
                <Text style={styles.listItemText}>* {cert}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer} fixed>
          Resume Profile Export - Generated on {formatDate(new Date().toISOString())}
        </Text>
      </Page>

      {/* Job Match Analysis Pages - Each job gets dedicated treatment */}
      {includeJobScores && filteredJobScores.map((jobScore) => {
        const fullResponse = jobScore.fullResponse;
        return (
          <Page key={jobScore.jobId} size="A4" style={styles.page} wrap>
            {/* Job Title Header */}
            <View wrap={false}>
              <Text style={styles.sectionTitle}>Job Match Analysis</Text>
              <Text style={styles.jobTitle}>{jobScore.jobTitle}</Text>
            </View>

            {/* Disqualified Status - Keep together */}
            {jobScore.disqualified && (
              <View style={styles.disqualifiedBlock} wrap={false}>
                <Text style={styles.disqualifiedTitle}>CANDIDATE DISQUALIFIED</Text>
                {jobScore.disqualificationReason && (
                  <Text style={styles.disqualifiedReason}>{jobScore.disqualificationReason}</Text>
                )}
              </View>
            )}

            {/* Executive Summary - Keep together */}
            {fullResponse?.executiveSummary && (
              <View style={styles.executiveSummaryBlock} wrap={false}>
                <Text style={styles.executiveSummaryText}>
                  {fullResponse.executiveSummary.oneLiner || 'Candidate Analysis'}
                </Text>
                <View style={styles.badgeRow}>
                  {fullResponse.executiveSummary.fitScore && (
                    <Text style={[styles.badge, { backgroundColor: getFitScoreColor(fullResponse.executiveSummary.fitScore), color: '#ffffff' }]}>
                      {fullResponse.executiveSummary.fitScore} FIT
                    </Text>
                  )}
                  {fullResponse.executiveSummary.hiringUrgency && (
                    <Text style={[styles.badge, { backgroundColor: '#4b5563', color: '#ffffff' }]}>
                      {fullResponse.executiveSummary.hiringUrgency.replace('_', ' ')}
                    </Text>
                  )}
                </View>
                {fullResponse.executiveSummary.competitivePosition && (
                  <Text style={{ fontSize: 8, color: '#cbd5e1', marginTop: 4 }}>
                    {fullResponse.executiveSummary.competitivePosition}
                  </Text>
                )}
              </View>
            )}

            {/* Verdict Section - Keep together */}
            {fullResponse?.verdict && (
              <View style={styles.verdictBlock} wrap={false}>
                <View style={styles.verdictHeader}>
                  <Text style={[styles.verdictBadge, {
                    backgroundColor: getVerdictColor(fullResponse.verdict.decision).bg,
                    color: getVerdictColor(fullResponse.verdict.decision).text
                  }]}>
                    {fullResponse.verdict.decision === 'INTERVIEW' ? 'INTERVIEW' :
                     fullResponse.verdict.decision === 'CONSIDER' ? 'CONSIDER' :
                     fullResponse.verdict.decision === 'REVIEW' ? 'REVIEW' :
                     'NOT SUITABLE'}
                  </Text>
                  <View style={styles.verdictMeta}>
                    {fullResponse.verdict.confidence && (
                      <Text style={[styles.verdictMetaBadge, { backgroundColor: '#dbeafe', color: '#1e40af' }]}>
                        {fullResponse.verdict.confidence} Confidence
                      </Text>
                    )}
                    {fullResponse.verdict.riskLevel && (
                      <Text style={[styles.verdictMetaBadge, {
                        backgroundColor: fullResponse.verdict.riskLevel === 'LOW' ? '#dcfce7' :
                                       fullResponse.verdict.riskLevel === 'MEDIUM' ? '#fef9c3' :
                                       fullResponse.verdict.riskLevel === 'HIGH' ? '#ffedd5' : '#fee2e2',
                        color: fullResponse.verdict.riskLevel === 'LOW' ? '#166534' :
                              fullResponse.verdict.riskLevel === 'MEDIUM' ? '#854d0e' :
                              fullResponse.verdict.riskLevel === 'HIGH' ? '#9a3412' : '#991b1b'
                      }]}>
                        {fullResponse.verdict.riskLevel} Risk
                      </Text>
                    )}
                  </View>
                </View>
                {fullResponse.verdict.summary && (
                  <Text style={styles.verdictSummary}>{fullResponse.verdict.summary}</Text>
                )}
                <View style={styles.verdictGrid}>
                  {fullResponse.verdict.topStrength && (
                    <View style={styles.verdictStrengthBox}>
                      <Text style={[styles.verdictLabel, { color: '#166534' }]}>TOP STRENGTH</Text>
                      <Text style={styles.verdictValue}>{fullResponse.verdict.topStrength}</Text>
                    </View>
                  )}
                  {fullResponse.verdict.topConcern && fullResponse.verdict.topConcern !== 'None significant' && fullResponse.verdict.topConcern !== 'None' && (
                    <View style={styles.verdictConcernBox}>
                      <Text style={[styles.verdictLabel, { color: '#9a3412' }]}>TOP CONCERN</Text>
                      <Text style={styles.verdictValue}>{fullResponse.verdict.topConcern}</Text>
                    </View>
                  )}
                </View>
                {fullResponse.verdict.dealbreakers && fullResponse.verdict.dealbreakers.length > 0 && (
                  <View style={styles.dealbreakersBox}>
                    <Text style={[styles.verdictLabel, { color: '#991b1b', marginBottom: 4 }]}>DEALBREAKERS</Text>
                    {fullResponse.verdict.dealbreakers.map((item, i) => (
                      <Text key={i} style={styles.dealbreakerItem}>* {item}</Text>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Section Scores Grid - Keep together */}
            {(fullResponse?.sectionA !== undefined || fullResponse?.sectionB !== undefined) && (
              <View style={styles.scoresGrid} wrap={false}>
                <View style={styles.scoreBox}>
                  <Text style={styles.scoreValue}>{fullResponse.sectionA ?? '-'}</Text>
                  <Text style={styles.scoreMax}>/30</Text>
                  <Text style={styles.scoreLabel}>Skills</Text>
                </View>
                <View style={styles.scoreBox}>
                  <Text style={styles.scoreValue}>{fullResponse.sectionB ?? '-'}</Text>
                  <Text style={styles.scoreMax}>/25</Text>
                  <Text style={styles.scoreLabel}>Experience</Text>
                </View>
                <View style={styles.scoreBox}>
                  <Text style={styles.scoreValue}>{fullResponse.sectionC ?? '-'}</Text>
                  <Text style={styles.scoreMax}>/20</Text>
                  <Text style={styles.scoreLabel}>Impact</Text>
                </View>
                <View style={styles.scoreBox}>
                  <Text style={styles.scoreValue}>{fullResponse.sectionD ?? '-'}</Text>
                  <Text style={styles.scoreMax}>/10</Text>
                  <Text style={styles.scoreLabel}>Quals</Text>
                </View>
                <View style={styles.scoreBox}>
                  <Text style={styles.scoreValue}>{fullResponse.sectionE ?? '-'}</Text>
                  <Text style={styles.scoreMax}>/10</Text>
                  <Text style={styles.scoreLabel}>Logistics</Text>
                </View>
                <View style={styles.scoreBox}>
                  <Text style={[styles.scoreValue, { color: (fullResponse.sectionF ?? 0) >= 0 ? '#059669' : '#dc2626' }]}>
                    {(fullResponse.sectionF ?? 0) >= 0 ? '+' : ''}{fullResponse.sectionF ?? 0}
                  </Text>
                  <Text style={styles.scoreMax}>pts</Text>
                  <Text style={styles.scoreLabel}>Modifiers</Text>
                </View>
              </View>
            )}

            {/* Quick Stats Grid - Keep together */}
            <View style={styles.statsGrid} wrap={false}>
              <View style={[styles.statBox, { backgroundColor: '#f0fdf4' }]}>
                <Text style={[styles.statValue, { color: '#059669' }]}>
                  {fullResponse?.strengthsHighlights?.length || jobScore.strengthsHighlights?.length || 0}
                </Text>
                <Text style={[styles.statLabel, { color: '#059669' }]}>Strengths</Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: '#fef2f2' }]}>
                <Text style={[styles.statValue, { color: '#dc2626' }]}>
                  {fullResponse?.improvementAreas?.length || jobScore.improvementAreas?.length || 0}
                </Text>
                <Text style={[styles.statLabel, { color: '#dc2626' }]}>Gaps</Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: '#fffbeb' }]}>
                <Text style={[styles.statValue, { color: '#d97706' }]}>
                  {fullResponse?.skillAnalysis?.matchedSkills?.length || 0}
                </Text>
                <Text style={[styles.statLabel, { color: '#d97706' }]}>Matched Skills</Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: '#faf5ff' }]}>
                <Text style={[styles.statValue, { color: '#7c3aed' }]}>
                  {fullResponse?.skillAnalysis?.missingSkills?.length || 0}
                </Text>
                <Text style={[styles.statLabel, { color: '#7c3aed' }]}>Missing Skills</Text>
              </View>
            </View>

            {/* Domain Analysis - Keep together */}
            {fullResponse?.domainAnalysis && (
              <View style={styles.domainBlock} wrap={false}>
                <Text style={[styles.blockTitle, { color: '#4f46e5' }]}>Domain Match Analysis</Text>
                <View style={styles.domainHeader}>
                  <View style={styles.domainInfo}>
                    <Text style={styles.domainLabel}>Job Domain</Text>
                    <Text style={styles.domainValue}>
                      {fullResponse.domainAnalysis.jobDescriptionDomain || fullResponse.domainAnalysis.jdDomain || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.domainInfo}>
                    <Text style={styles.domainLabel}>Candidate Domain</Text>
                    <Text style={styles.domainValue}>{fullResponse.domainAnalysis.candidateDomain || 'N/A'}</Text>
                  </View>
                  <View>
                    <Text style={[styles.domainBadge, {
                      backgroundColor: getDomainMatchColor(fullResponse.domainAnalysis.domainMatchLevel).bg,
                      color: getDomainMatchColor(fullResponse.domainAnalysis.domainMatchLevel).text
                    }]}>
                      {fullResponse.domainAnalysis.domainMatchLevel || 'UNKNOWN'}
                    </Text>
                    {fullResponse.domainAnalysis.domainMatchScore !== undefined && (
                      <Text style={{ fontSize: 8, color: '#4f46e5', marginTop: 2, textAlign: 'center' }}>
                        {fullResponse.domainAnalysis.domainMatchScore}% Match
                      </Text>
                    )}
                  </View>
                </View>
                {(fullResponse.domainAnalysis.domainPenaltyPercent! > 0 || fullResponse.domainAnalysis.domainPenalty! > 0) && (
                  <Text style={{ fontSize: 8, color: '#dc2626', backgroundColor: '#fef2f2', padding: 4, borderRadius: 2, marginBottom: 6 }}>
                    -{fullResponse.domainAnalysis.domainPenaltyPercent || Math.round((fullResponse.domainAnalysis.domainPenalty || 0) * 100)}% Penalty Applied
                  </Text>
                )}
                {/* Match Rationale */}
                {fullResponse.domainAnalysis.matchRationale && typeof fullResponse.domainAnalysis.matchRationale === 'object' && (
                  <View style={styles.rationaleBox}>
                    <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#4f46e5', marginBottom: 6 }}>Match Rationale</Text>
                    {fullResponse.domainAnalysis.matchRationale.step1_jobDomain && (
                      <View style={styles.rationaleStep}>
                        <Text style={styles.rationaleNumber}>1</Text>
                        <Text style={styles.rationaleText}>
                          <Text style={{ fontWeight: 'bold' }}>Job Domain: </Text>
                          {fullResponse.domainAnalysis.matchRationale.step1_jobDomain}
                        </Text>
                      </View>
                    )}
                    {fullResponse.domainAnalysis.matchRationale.step2_candidateDomain && (
                      <View style={styles.rationaleStep}>
                        <Text style={styles.rationaleNumber}>2</Text>
                        <Text style={styles.rationaleText}>
                          <Text style={{ fontWeight: 'bold' }}>Candidate: </Text>
                          {fullResponse.domainAnalysis.matchRationale.step2_candidateDomain}
                        </Text>
                      </View>
                    )}
                    {fullResponse.domainAnalysis.matchRationale.step3_overlaps && (
                      <View style={styles.rationaleStep}>
                        <Text style={[styles.rationaleNumber, { backgroundColor: '#059669' }]}>3</Text>
                        <Text style={styles.rationaleText}>
                          <Text style={{ fontWeight: 'bold' }}>Overlaps: </Text>
                          {fullResponse.domainAnalysis.matchRationale.step3_overlaps}
                        </Text>
                      </View>
                    )}
                    {fullResponse.domainAnalysis.matchRationale.step4_gaps && (
                      <View style={styles.rationaleStep}>
                        <Text style={[styles.rationaleNumber, { backgroundColor: '#f97316' }]}>4</Text>
                        <Text style={styles.rationaleText}>
                          <Text style={{ fontWeight: 'bold' }}>Gaps: </Text>
                          {fullResponse.domainAnalysis.matchRationale.step4_gaps}
                        </Text>
                      </View>
                    )}
                    {fullResponse.domainAnalysis.matchRationale.step5_verdict && (
                      <View style={[styles.rationaleStep, { marginTop: 4, paddingTop: 4, borderTopWidth: 1, borderTopColor: '#e0e7ff', borderTopStyle: 'solid' }]}>
                        <Text style={[styles.rationaleNumber, { backgroundColor: '#4f46e5' }]}>!</Text>
                        <Text style={[styles.rationaleText, { fontWeight: 'bold' }]}>
                          {fullResponse.domainAnalysis.matchRationale.step5_verdict}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Competitive Intelligence - Keep together */}
            {fullResponse?.competitiveIntel && (
              <View style={styles.competitiveBlock} wrap={false}>
                <Text style={[styles.blockTitle, { color: '#7c3aed' }]}>Competitive Intelligence</Text>
                <View style={styles.competitiveGrid}>
                  {fullResponse.competitiveIntel.marketPosition && (
                    <View style={styles.competitiveItem}>
                      <Text style={styles.competitiveLabel}>Market Position</Text>
                      <Text style={styles.competitiveValue}>{fullResponse.competitiveIntel.marketPosition}</Text>
                    </View>
                  )}
                  {fullResponse.competitiveIntel.salaryExpectation && (
                    <View style={styles.competitiveItem}>
                      <Text style={styles.competitiveLabel}>Salary Expectation</Text>
                      <Text style={styles.competitiveValue}>{fullResponse.competitiveIntel.salaryExpectation}</Text>
                    </View>
                  )}
                  {fullResponse.competitiveIntel.flightRisk && (
                    <View style={styles.competitiveItem}>
                      <Text style={styles.competitiveLabel}>Flight Risk</Text>
                      <Text style={[styles.competitiveValue, {
                        color: fullResponse.competitiveIntel.flightRisk === 'LOW' ? '#059669' :
                              fullResponse.competitiveIntel.flightRisk === 'MEDIUM' ? '#d97706' : '#dc2626'
                      }]}>{fullResponse.competitiveIntel.flightRisk}</Text>
                    </View>
                  )}
                  {fullResponse.competitiveIntel.growthPotential && (
                    <View style={styles.competitiveItem}>
                      <Text style={styles.competitiveLabel}>Growth Potential</Text>
                      <Text style={[styles.competitiveValue, {
                        color: fullResponse.competitiveIntel.growthPotential === 'HIGH' ? '#059669' :
                              fullResponse.competitiveIntel.growthPotential === 'MEDIUM' ? '#d97706' : '#dc2626'
                      }]}>{fullResponse.competitiveIntel.growthPotential}</Text>
                    </View>
                  )}
                </View>
                {fullResponse.competitiveIntel.retentionFactors && fullResponse.competitiveIntel.retentionFactors.length > 0 && (
                  <View style={{ marginTop: 6 }}>
                    <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#7c3aed', marginBottom: 3 }}>Retention Factors:</Text>
                    <View style={styles.skillBadgesRow}>
                      {fullResponse.competitiveIntel.retentionFactors.map((factor, i) => (
                        <Text key={i} style={[styles.skillBadge, { backgroundColor: '#f3e8ff', color: '#7c3aed' }]}>
                          {factor}
                        </Text>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Strengths & Gaps - Side by side */}
            <View style={styles.strengthsGapsRow}>
              {/* Strengths Column */}
              <View style={styles.strengthsColumn}>
                <Text style={[styles.columnTitle, { color: '#166534' }]}>
                  Strengths ({fullResponse?.strengthsHighlights?.length || jobScore.strengthsHighlights?.length || 0})
                </Text>
                {(fullResponse?.strengthsHighlights || jobScore.strengthsHighlights || []).slice(0, 5).map((item: any, i: number) => (
                  <View key={i} style={styles.itemCard} wrap={false}>
                    <Text style={styles.itemTitle}>
                      {typeof item === 'string' ? item : (item.strength || 'Strength identified')}
                    </Text>
                    {typeof item !== 'string' && item.evidence && (
                      <Text style={styles.itemEvidence}>Evidence: {item.evidence}</Text>
                    )}
                    {typeof item !== 'string' && item.impact && (
                      <Text style={[styles.itemImpact, { color: '#059669' }]}>{item.impact} Impact</Text>
                    )}
                  </View>
                ))}
              </View>
              {/* Gaps Column */}
              <View style={styles.gapsColumn}>
                <Text style={[styles.columnTitle, { color: '#991b1b' }]}>
                  Gaps ({fullResponse?.improvementAreas?.length || jobScore.improvementAreas?.length || 0})
                </Text>
                {(fullResponse?.improvementAreas || jobScore.improvementAreas || []).slice(0, 5).map((item: any, i: number) => (
                  <View key={i} style={styles.itemCard} wrap={false}>
                    <Text style={styles.itemTitle}>
                      {typeof item === 'string' ? item : (item.gap || 'Gap identified')}
                    </Text>
                    {typeof item !== 'string' && item.severity && (
                      <Text style={[styles.itemImpact, {
                        color: item.severity === 'CRITICAL' ? '#991b1b' :
                              item.severity === 'MAJOR' ? '#9a3412' : '#854d0e'
                      }]}>{item.severity}</Text>
                    )}
                    {typeof item !== 'string' && item.trainable !== undefined && (
                      <Text style={[styles.itemEvidence, { color: item.trainable ? '#059669' : '#6b7280' }]}>
                        {item.trainable ? 'Trainable' : 'Not Trainable'}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            </View>

            {/* Skill Analysis - New Page Section */}
            {fullResponse?.skillAnalysis && (
              <View style={styles.skillAnalysisBlock} wrap={false}>
                <Text style={[styles.blockTitle, { color: '#166534' }]}>Skill Depth Analysis</Text>
                {fullResponse.skillAnalysis.skillDepthSummary && (
                  <View style={styles.skillDepthRow}>
                    <View style={[styles.skillDepthBox, { backgroundColor: '#dcfce7' }]}>
                      <Text style={[styles.skillDepthCount, { color: '#166534' }]}>
                        {fullResponse.skillAnalysis.skillDepthSummary.expert || 0}
                      </Text>
                      <Text style={[styles.skillDepthLabel, { color: '#166534' }]}>Expert</Text>
                    </View>
                    <View style={[styles.skillDepthBox, { backgroundColor: '#dbeafe' }]}>
                      <Text style={[styles.skillDepthCount, { color: '#1e40af' }]}>
                        {fullResponse.skillAnalysis.skillDepthSummary.proficient || 0}
                      </Text>
                      <Text style={[styles.skillDepthLabel, { color: '#1e40af' }]}>Proficient</Text>
                    </View>
                    <View style={[styles.skillDepthBox, { backgroundColor: '#fef9c3' }]}>
                      <Text style={[styles.skillDepthCount, { color: '#854d0e' }]}>
                        {fullResponse.skillAnalysis.skillDepthSummary.familiar || 0}
                      </Text>
                      <Text style={[styles.skillDepthLabel, { color: '#854d0e' }]}>Familiar</Text>
                    </View>
                    <View style={[styles.skillDepthBox, { backgroundColor: '#f3f4f6' }]}>
                      <Text style={[styles.skillDepthCount, { color: '#4b5563' }]}>
                        {fullResponse.skillAnalysis.skillDepthSummary.listedOnly || 0}
                      </Text>
                      <Text style={[styles.skillDepthLabel, { color: '#4b5563' }]}>Listed</Text>
                    </View>
                  </View>
                )}
                {/* Matched Skills */}
                {fullResponse.skillAnalysis.matchedSkills && fullResponse.skillAnalysis.matchedSkills.length > 0 && (
                  <View>
                    <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#166534', marginBottom: 3 }}>Matched Skills:</Text>
                    <View style={styles.skillBadgesRow}>
                      {fullResponse.skillAnalysis.matchedSkills.slice(0, 15).map((s, i) => (
                        <Text key={i} style={[styles.skillBadge, {
                          backgroundColor: getSkillDepthColor(s.depth).bg,
                          color: getSkillDepthColor(s.depth).text
                        }]}>
                          {s.skill} ({s.depth})
                        </Text>
                      ))}
                    </View>
                  </View>
                )}
                {/* Missing Skills */}
                {fullResponse.skillAnalysis.missingSkills && fullResponse.skillAnalysis.missingSkills.length > 0 && (
                  <View style={{ marginTop: 6 }}>
                    <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#991b1b', marginBottom: 3 }}>Missing Skills:</Text>
                    <View style={styles.skillBadgesRow}>
                      {fullResponse.skillAnalysis.missingSkills.slice(0, 10).map((s, i) => (
                        <Text key={i} style={[styles.skillBadge, { backgroundColor: '#fee2e2', color: '#991b1b' }]}>
                          {typeof s === 'string' ? s : s.skill}
                        </Text>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Experience Analysis */}
            {fullResponse?.experienceAnalysis && (
              <View style={styles.experienceBlock} break>
                <Text style={[styles.blockTitle, { color: '#1e40af' }]}>Experience & Career Analysis</Text>
                {fullResponse.experienceAnalysis.experienceSummary && (
                  <Text style={{ fontSize: 8, color: '#374151', marginBottom: 8, padding: 6, backgroundColor: '#ffffff', borderRadius: 3 }}>
                    {fullResponse.experienceAnalysis.experienceSummary}
                  </Text>
                )}
                <View style={styles.experienceGrid} wrap={false}>
                  <View style={styles.experienceBox}>
                    <Text style={styles.experienceValue}>
                      {fullResponse.experienceAnalysis.totalExperienceFormatted ||
                       `${fullResponse.experienceAnalysis.totalYears || 0}y ${fullResponse.experienceAnalysis.totalMonths || 0}m`}
                    </Text>
                    <Text style={styles.experienceLabel}>Total</Text>
                  </View>
                  <View style={styles.experienceBox}>
                    <Text style={[styles.experienceValue, { color: '#059669' }]}>
                      {fullResponse.experienceAnalysis.relevantExperienceFormatted ||
                       `${fullResponse.experienceAnalysis.relevantYears || 0}y ${fullResponse.experienceAnalysis.relevantMonths || 0}m`}
                    </Text>
                    <Text style={styles.experienceLabel}>Relevant</Text>
                  </View>
                  <View style={styles.experienceBox}>
                    <Text style={[styles.experienceValue, { color: '#7c3aed' }]}>
                      {fullResponse.experienceAnalysis.domainExperienceFormatted ||
                       `${fullResponse.experienceAnalysis.domainYears || 0}y ${fullResponse.experienceAnalysis.domainMonths || 0}m`}
                    </Text>
                    <Text style={styles.experienceLabel}>Domain</Text>
                  </View>
                  <View style={styles.experienceBox}>
                    <Text style={[styles.badge, {
                      backgroundColor: fullResponse.experienceAnalysis.careerProgression === 'ASCENDING' ? '#dcfce7' :
                                     fullResponse.experienceAnalysis.careerProgression === 'STABLE' ? '#dbeafe' :
                                     fullResponse.experienceAnalysis.careerProgression === 'MIXED' ? '#fef9c3' : '#fee2e2',
                      color: fullResponse.experienceAnalysis.careerProgression === 'ASCENDING' ? '#166534' :
                            fullResponse.experienceAnalysis.careerProgression === 'STABLE' ? '#1e40af' :
                            fullResponse.experienceAnalysis.careerProgression === 'MIXED' ? '#854d0e' : '#991b1b',
                      fontSize: 8
                    }]}>
                      {fullResponse.experienceAnalysis.careerProgression || 'N/A'}
                    </Text>
                    <Text style={styles.experienceLabel}>Progression</Text>
                  </View>
                </View>
                {/* Role Timeline */}
                {fullResponse.experienceAnalysis.roleTimeline && fullResponse.experienceAnalysis.roleTimeline.length > 0 && (
                  <View style={{ marginTop: 8 }}>
                    <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#1e40af', marginBottom: 4 }}>Role Timeline:</Text>
                    {fullResponse.experienceAnalysis.roleTimeline.slice(0, 3).map((role, i) => (
                      <View key={i} style={styles.roleCard} wrap={false}>
                        <View style={styles.roleHeader}>
                          <View>
                            <Text style={styles.roleTitle}>{role.title}</Text>
                            <Text style={styles.roleCompany}>{role.company}</Text>
                          </View>
                          <Text style={styles.roleDuration}>{role.duration}</Text>
                        </View>
                        {role.relevanceReason && (
                          <Text style={styles.roleRelevance}>Why relevant: {role.relevanceReason}</Text>
                        )}
                      </View>
                    ))}
                  </View>
                )}
                {/* Tenure Analysis */}
                {fullResponse.experienceAnalysis.tenureAnalysis && (
                  <View style={styles.tenureBox} wrap={false}>
                    <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#1e40af', marginBottom: 4 }}>Tenure Analysis:</Text>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <Text style={{ fontSize: 8, color: '#374151' }}>
                        Avg: {fullResponse.experienceAnalysis.tenureAnalysis.averageTenureFormatted || `${fullResponse.experienceAnalysis.tenureAnalysis.averageTenure || 0}y`}
                      </Text>
                      <Text style={{ fontSize: 8, color: '#374151' }}>
                        Longest: {fullResponse.experienceAnalysis.tenureAnalysis.longestTenureFormatted || `${fullResponse.experienceAnalysis.tenureAnalysis.longestTenure || 0}y`}
                      </Text>
                      {fullResponse.experienceAnalysis.tenureAnalysis.pattern && (
                        <Text style={[styles.badge, {
                          backgroundColor: fullResponse.experienceAnalysis.tenureAnalysis.pattern === 'STABLE' ? '#dcfce7' :
                                         fullResponse.experienceAnalysis.tenureAnalysis.pattern === 'MIXED' ? '#fef9c3' : '#fee2e2',
                          color: fullResponse.experienceAnalysis.tenureAnalysis.pattern === 'STABLE' ? '#166534' :
                                fullResponse.experienceAnalysis.tenureAnalysis.pattern === 'MIXED' ? '#854d0e' : '#991b1b',
                          fontSize: 7
                        }]}>
                          {fullResponse.experienceAnalysis.tenureAnalysis.pattern}
                        </Text>
                      )}
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Red Flags */}
            {fullResponse?.redFlags && fullResponse.redFlags.length > 0 && (
              <View style={styles.redFlagsBlock} wrap={false}>
                <Text style={[styles.blockTitle, { color: '#991b1b' }]}>Red Flags ({fullResponse.redFlags.length})</Text>
                {fullResponse.redFlags.map((flag, i) => (
                  <View key={i} style={styles.redFlagCard} wrap={false}>
                    <View style={styles.redFlagHeader}>
                      <Text style={styles.redFlagType}>{flag.type || 'FLAG'}</Text>
                      <Text style={[styles.redFlagSeverity, {
                        backgroundColor: getSeverityColor(flag.severity).bg,
                        color: getSeverityColor(flag.severity).text
                      }]}>
                        {flag.severity || 'MEDIUM'}
                      </Text>
                    </View>
                    <Text style={styles.redFlagIssue}>{flag.issue}</Text>
                    {flag.evidence && (
                      <Text style={styles.redFlagEvidence}>Evidence: {flag.evidence}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Interview Recommendations */}
            {fullResponse?.interviewRecommendations && typeof fullResponse.interviewRecommendations === 'object' && !Array.isArray(fullResponse.interviewRecommendations) && (
              <View style={styles.interviewBlock} break>
                <Text style={[styles.blockTitle, { color: '#0f766e' }]}>Interview Preparation Guide</Text>
                {fullResponse.interviewRecommendations.mustExplore && fullResponse.interviewRecommendations.mustExplore.length > 0 && (
                  <View style={styles.interviewCategory} wrap={false}>
                    <Text style={[styles.interviewCategoryTitle, { color: '#0f766e' }]}>Must Explore</Text>
                    {fullResponse.interviewRecommendations.mustExplore.map((item, i) => (
                      <Text key={i} style={styles.interviewItem}>→ {item}</Text>
                    ))}
                  </View>
                )}
                {fullResponse.interviewRecommendations.redFlagQuestions && fullResponse.interviewRecommendations.redFlagQuestions.length > 0 && (
                  <View style={styles.interviewCategory} wrap={false}>
                    <Text style={[styles.interviewCategoryTitle, { color: '#c2410c' }]}>Red Flag Questions</Text>
                    {fullResponse.interviewRecommendations.redFlagQuestions.map((item, i) => (
                      <Text key={i} style={styles.interviewItem}>! {item}</Text>
                    ))}
                  </View>
                )}
                {fullResponse.interviewRecommendations.technicalValidation && fullResponse.interviewRecommendations.technicalValidation.length > 0 && (
                  <View style={styles.interviewCategory} wrap={false}>
                    <Text style={[styles.interviewCategoryTitle, { color: '#1e40af' }]}>Technical Validation</Text>
                    {fullResponse.interviewRecommendations.technicalValidation.map((item, i) => (
                      <Text key={i} style={styles.interviewItem}>* {item}</Text>
                    ))}
                  </View>
                )}
                {fullResponse.interviewRecommendations.culturalFitTopics && fullResponse.interviewRecommendations.culturalFitTopics.length > 0 && (
                  <View style={styles.interviewCategory} wrap={false}>
                    <Text style={[styles.interviewCategoryTitle, { color: '#7c3aed' }]}>Cultural Fit Topics</Text>
                    {fullResponse.interviewRecommendations.culturalFitTopics.map((item, i) => (
                      <Text key={i} style={styles.interviewItem}>- {item}</Text>
                    ))}
                  </View>
                )}
                {fullResponse.interviewRecommendations.referenceCheckFocus && fullResponse.interviewRecommendations.referenceCheckFocus.length > 0 && (
                  <View style={styles.interviewCategory} wrap={false}>
                    <Text style={[styles.interviewCategoryTitle, { color: '#4b5563' }]}>Reference Check Focus</Text>
                    {fullResponse.interviewRecommendations.referenceCheckFocus.map((item, i) => (
                      <Text key={i} style={styles.interviewItem}>+ {item}</Text>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Match Summary */}
            {jobScore.matchSummary && (
              <Text style={styles.matchSummaryBox}>
                Match Summary: {jobScore.matchSummary}
              </Text>
            )}

            {/* Status Badge */}
            <View style={{ marginTop: 10, alignItems: 'center' }} wrap={false}>
              {jobScore.disqualified && (
                <Text style={[styles.statusBadge, { backgroundColor: '#fef2f2', color: '#dc2626' }]}>
                  STATUS: NOT QUALIFIED
                </Text>
              )}
              {jobScore.invitationStatus === 'invited' && (
                <Text style={[styles.statusBadge, { backgroundColor: '#f0fdf4', color: '#059669' }]}>
                  STATUS: INVITED TO INTERVIEW
                </Text>
              )}
              {!jobScore.disqualified && jobScore.invitationStatus !== 'invited' && (
                <Text style={[styles.statusBadge, { backgroundColor: '#f0fdfa', color: '#0891b2' }]}>
                  STATUS: QUALIFIED - PENDING REVIEW
                </Text>
              )}
            </View>

            {/* Footer */}
            <Text style={styles.footer} fixed>
              Resume Profile Export - Generated on {formatDate(new Date().toISOString())}
            </Text>
          </Page>
        );
      })}
    </Document>
  );
};

export default ProfilePDF;
