import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet
} from '@react-pdf/renderer';

// Import shared types from ProfilePDF
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
    matchRationale?: {
      step1_jobDomain?: string;
      step2_candidateDomain?: string;
      step3_overlaps?: string;
      step4_gaps?: string;
      step5_verdict?: string;
    } | string;
  };
  competitiveIntel?: {
    marketPosition?: string;
    salaryExpectation?: string;
    flightRisk?: string;
    growthPotential?: string;
    retentionFactors?: string[];
  };
  skillAnalysis?: {
    skillDepthSummary?: { expert?: number; proficient?: number; familiar?: number; listedOnly?: number };
    matchedSkills?: Array<{ skill: string; depth: string }>;
    missingSkills?: Array<string | { skill: string }>;
  };
  experienceAnalysis?: {
    experienceSummary?: string;
    totalExperienceFormatted?: string;
    totalYears?: number;
    totalMonths?: number;
    relevantExperienceFormatted?: string;
    relevantYears?: number;
    relevantMonths?: number;
    domainExperienceFormatted?: string;
    domainYears?: number;
    domainMonths?: number;
    careerProgression?: string;
    roleTimeline?: Array<{ title: string; company: string; duration?: string; relevanceReason?: string }>;
    tenureAnalysis?: { averageTenureFormatted?: string; averageTenure?: number; longestTenureFormatted?: string; longestTenure?: number; pattern?: string };
  };
  strengthsHighlights?: Array<string | { strength: string; evidence?: string; impact?: string }>;
  improvementAreas?: Array<string | { gap: string; severity?: string; trainable?: boolean }>;
  redFlags?: Array<{ type?: string; severity?: string; issue: string; evidence?: string }>;
  interviewRecommendations?: {
    mustExplore?: string[];
    redFlagQuestions?: string[];
    technicalValidation?: string[];
    culturalFitTopics?: string[];
  } | string[];
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
  redFlags?: Array<{ issue: string; evidence: string; reason: string }>;
  invitationStatus?: string | null;
  fullResponse?: FullResponse;
}

interface ProfilesPDFProps {
  profiles: (ResumeProfile & { jobScores: JobScoring[] })[];
  jobs?: any[];
  includeJobScores?: boolean;
  selectedJobId?: string;
}

// Color utilities
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
    case 'CRITICAL': case 'HIGH': return { bg: '#fef2f2', text: '#991b1b' };
    case 'MAJOR': case 'MEDIUM': return { bg: '#fff7ed', text: '#9a3412' };
    default: return { bg: '#fefce8', text: '#854d0e' };
  }
};

const getDomainMatchColor = (level?: string) => {
  switch (level?.toUpperCase()) {
    case 'EXACT': return { bg: '#dcfce7', text: '#166534' };
    case 'RELATED': return { bg: '#dbeafe', text: '#1e40af' };
    case 'ADJACENT': return { bg: '#fef9c3', text: '#854d0e' };
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

  // Table of Contents styles
  tocContainer: {
    marginBottom: 30,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 20,
  },
  summaryBox: {
    backgroundColor: '#f8fafc',
    padding: 15,
    borderRadius: 5,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'solid',
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 10,
    color: '#475569',
    marginBottom: 4,
  },
  tocTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    borderBottomStyle: 'solid',
  },
  tocList: {
    marginBottom: 20,
  },
  tocItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    borderBottomStyle: 'solid',
  },
  tocName: {
    fontSize: 10,
    color: '#334155',
    flex: 1,
  },
  tocPage: {
    fontSize: 9,
    color: '#64748b',
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

  // Profile Header
  header: {
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#2563eb',
    borderBottomStyle: 'solid',
    paddingBottom: 12,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 6,
  },
  contactInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  contactItem: {
    fontSize: 9,
    color: '#64748b',
  },

  // Section styles
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    borderBottomStyle: 'solid',
  },
  summary: {
    fontSize: 9,
    color: '#334155',
    lineHeight: 1.5,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
  },
  skill: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 2,
    paddingHorizontal: 5,
    borderRadius: 2,
    fontSize: 7,
    color: '#334155',
  },
  listItem: {
    marginBottom: 5,
    paddingLeft: 6,
  },
  listItemText: {
    fontSize: 9,
    color: '#334155',
  },
  languagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  language: {
    fontSize: 8,
    color: '#334155',
  },

  // Job Match Section
  jobMatchSection: {
    marginTop: 12,
  },
  jobMatchCard: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'solid',
  },
  jobTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 10,
  },

  // Executive Summary Block
  executiveSummaryBlock: {
    backgroundColor: '#1e293b',
    padding: 10,
    borderRadius: 4,
    marginBottom: 12,
  },
  executiveSummaryText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
  },
  badge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 2,
    fontSize: 7,
    fontWeight: 'bold',
  },

  // Verdict Block
  verdictBlock: {
    padding: 10,
    borderRadius: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  verdictHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  verdictBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 3,
    fontSize: 10,
    fontWeight: 'bold',
  },
  verdictMeta: {
    flexDirection: 'row',
    gap: 4,
  },
  verdictSummary: {
    fontSize: 8,
    color: '#374151',
    marginBottom: 8,
  },
  verdictGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  verdictStrengthBox: {
    flex: 1,
    padding: 6,
    backgroundColor: '#f0fdf4',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#86efac',
    borderStyle: 'solid',
  },
  verdictConcernBox: {
    flex: 1,
    padding: 6,
    backgroundColor: '#fff7ed',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#fdba74',
    borderStyle: 'solid',
  },
  verdictLabel: {
    fontSize: 6,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  verdictValue: {
    fontSize: 8,
    color: '#374151',
  },

  // Section Scores Grid
  scoresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 12,
    padding: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderStyle: 'solid',
  },
  scoreBox: {
    width: '15%',
    textAlign: 'center',
    padding: 4,
    backgroundColor: '#ffffff',
    borderRadius: 2,
  },
  scoreValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1e40af',
  },
  scoreMax: {
    fontSize: 6,
    color: '#6b7280',
  },
  scoreLabel: {
    fontSize: 6,
    color: '#3b82f6',
    fontWeight: 'bold',
  },

  // Quick Stats Grid
  statsGrid: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    textAlign: 'center',
    padding: 6,
    borderRadius: 3,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 6,
  },

  // Domain Analysis Block
  domainBlock: {
    padding: 10,
    backgroundColor: '#eef2ff',
    borderRadius: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#c7d2fe',
    borderStyle: 'solid',
  },
  domainHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  domainInfo: {
    flex: 1,
  },
  domainLabel: {
    fontSize: 6,
    color: '#6b7280',
  },
  domainValue: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  domainBadge: {
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 2,
    fontSize: 7,
    fontWeight: 'bold',
  },

  // Block title
  blockTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 6,
  },

  // Competitive Intel Block
  competitiveBlock: {
    padding: 10,
    backgroundColor: '#faf5ff',
    borderRadius: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9d5ff',
    borderStyle: 'solid',
  },
  competitiveGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  competitiveItem: {
    width: '30%',
    padding: 4,
    backgroundColor: '#ffffff',
    borderRadius: 2,
  },
  competitiveLabel: {
    fontSize: 6,
    color: '#6b7280',
  },
  competitiveValue: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#7c3aed',
  },

  // Strengths & Gaps Container
  strengthsGapsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  strengthsColumn: {
    flex: 1,
    padding: 8,
    backgroundColor: '#f0fdf4',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#86efac',
    borderStyle: 'solid',
  },
  gapsColumn: {
    flex: 1,
    padding: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderStyle: 'solid',
  },
  columnTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  itemCard: {
    marginBottom: 4,
    padding: 4,
    backgroundColor: '#ffffff',
    borderRadius: 2,
  },
  itemTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#1e293b',
  },

  // Skill Analysis Block
  skillAnalysisBlock: {
    padding: 10,
    backgroundColor: '#f0fdf4',
    borderRadius: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#86efac',
    borderStyle: 'solid',
  },
  skillDepthRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  skillDepthBox: {
    flex: 1,
    textAlign: 'center',
    padding: 4,
    borderRadius: 2,
  },
  skillDepthCount: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  skillDepthLabel: {
    fontSize: 6,
  },
  skillBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    marginTop: 4,
  },
  skillBadge: {
    paddingVertical: 1,
    paddingHorizontal: 4,
    borderRadius: 2,
    fontSize: 6,
  },

  // Experience Analysis Block
  experienceBlock: {
    padding: 10,
    backgroundColor: '#eff6ff',
    borderRadius: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderStyle: 'solid',
  },
  experienceGrid: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  experienceBox: {
    flex: 1,
    textAlign: 'center',
    padding: 6,
    backgroundColor: '#ffffff',
    borderRadius: 2,
  },
  experienceValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1e40af',
  },
  experienceLabel: {
    fontSize: 6,
    color: '#6b7280',
  },

  // Red Flags Block
  redFlagsBlock: {
    padding: 10,
    backgroundColor: '#fef2f2',
    borderRadius: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderStyle: 'solid',
  },
  redFlagCard: {
    marginBottom: 6,
    padding: 6,
    backgroundColor: '#ffffff',
    borderRadius: 2,
  },
  redFlagHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  redFlagType: {
    fontSize: 6,
    fontWeight: 'bold',
    paddingVertical: 1,
    paddingHorizontal: 3,
    borderRadius: 1,
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  redFlagSeverity: {
    fontSize: 6,
    fontWeight: 'bold',
    paddingVertical: 1,
    paddingHorizontal: 3,
    borderRadius: 1,
  },
  redFlagIssue: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#991b1b',
  },
  redFlagEvidence: {
    fontSize: 7,
    color: '#6b7280',
  },

  // Interview Section
  interviewBlock: {
    padding: 10,
    backgroundColor: '#f0fdfa',
    borderRadius: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#5eead4',
    borderStyle: 'solid',
  },
  interviewCategory: {
    marginBottom: 8,
  },
  interviewCategoryTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  interviewItem: {
    fontSize: 7,
    color: '#374151',
    marginBottom: 2,
    paddingLeft: 8,
  },

  // Match Summary
  matchSummaryBox: {
    fontSize: 8,
    color: '#475569',
    marginTop: 6,
    fontStyle: 'italic',
    padding: 6,
    backgroundColor: '#f8fafc',
    borderRadius: 2,
  },

  // Status Badge
  statusBadge: {
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 3,
    textAlign: 'center',
    fontSize: 8,
    fontWeight: 'bold',
  },

  // Disqualified
  disqualifiedBlock: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderStyle: 'solid',
    borderRadius: 3,
    padding: 8,
    marginBottom: 12,
  },
  disqualifiedTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 4,
    textAlign: 'center',
  },
  disqualifiedReason: {
    fontSize: 8,
    color: '#991b1b',
    fontStyle: 'italic',
  },
});

const TableOfContents: React.FC<{ profiles: ProfilesPDFProps['profiles'] }> = ({ profiles }) => {
  return (
    <View style={styles.tocContainer}>
      <Text style={styles.title}>Resume Profiles Export</Text>
      <Text style={styles.subtitle}>
        Generated on {new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}
      </Text>

      <View style={styles.summaryBox}>
        <Text style={styles.summaryTitle}>Export Summary</Text>
        <Text style={styles.summaryText}>Total Profiles: {profiles.length}</Text>
        <Text style={styles.summaryText}>Export Date: {new Date().toLocaleDateString()}</Text>
      </View>

      <Text style={styles.tocTitle}>Table of Contents</Text>
      <View style={styles.tocList}>
        {profiles.map((profile, index) => (
          <View key={profile.id} style={styles.tocItem}>
            <Text style={styles.tocName}>{index + 1}. {profile.name}</Text>
            <Text style={styles.tocPage}>Page {index + 2}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export const ProfilesPDF: React.FC<ProfilesPDFProps> = ({
  profiles,
  jobs = [],
  includeJobScores = true,
  selectedJobId
}) => {
  if (profiles.length === 0) {
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <Text style={styles.title}>No Profiles to Export</Text>
          <Text style={styles.summary}>
            There are no resume profiles available for export.
          </Text>
        </Page>
      </Document>
    );
  }

  return (
    <Document>
      {/* Table of Contents Page */}
      <Page size="A4" style={styles.page}>
        <TableOfContents profiles={profiles} />
        <Text style={styles.footer} fixed>
          Resume Profiles Export - Generated on {new Date().toLocaleDateString()}
        </Text>
      </Page>

      {/* Individual Profile Pages */}
      {profiles.map((profile, index) => (
        <Page key={profile.id} size="A4" style={styles.page} wrap>
          <ProfilePDFContent
            profile={profile}
            jobs={jobs}
            includeJobScores={includeJobScores}
            selectedJobId={selectedJobId}
          />
          <Text style={styles.footer} fixed>
            Profile {index + 1} of {profiles.length} - Resume Profiles Export
          </Text>
        </Page>
      ))}
    </Document>
  );
};

// Enhanced ProfilePDFContent component with proper page breaks
const ProfilePDFContent: React.FC<{
  profile: ResumeProfile & { jobScores: JobScoring[] };
  jobs?: any[];
  includeJobScores?: boolean;
  selectedJobId?: string;
}> = ({
  profile,
  jobs = [],
  includeJobScores = true,
  selectedJobId
}) => {
  const filteredJobScores = includeJobScores
    ? selectedJobId
      ? profile.jobScores.filter(score => score.jobId === selectedJobId)
      : profile.jobScores
    : [];

  return (
    <>
      {/* Header Section - Never break */}
      <View style={styles.header} wrap={false}>
        <Text style={styles.name}>{profile.name}</Text>
        <View style={styles.contactInfo}>
          <Text style={styles.contactItem}>{profile.email}</Text>
          <Text style={styles.contactItem}>{profile.phone}</Text>
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

      {/* Job Scores Section - starts on new page if there are job scores */}
      {includeJobScores && filteredJobScores.length > 0 && (
        <View style={styles.jobMatchSection} break>
          <Text style={styles.sectionTitle}>Job Match Analysis</Text>
          {filteredJobScores.map((jobScore) => {
            const fullResponse = jobScore.fullResponse;
            return (
              <View key={jobScore.jobId} style={styles.jobMatchCard}>
                <Text style={styles.jobTitle}>{jobScore.jobTitle}</Text>

                {/* Disqualified Status */}
                {jobScore.disqualified && (
                  <View style={styles.disqualifiedBlock} wrap={false}>
                    <Text style={styles.disqualifiedTitle}>CANDIDATE DISQUALIFIED</Text>
                    {jobScore.disqualificationReason && (
                      <Text style={styles.disqualifiedReason}>{jobScore.disqualificationReason}</Text>
                    )}
                  </View>
                )}

                {/* Executive Summary */}
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
                  </View>
                )}

                {/* Verdict Section */}
                {fullResponse?.verdict && (
                  <View style={styles.verdictBlock} wrap={false}>
                    <View style={styles.verdictHeader}>
                      <Text style={[styles.verdictBadge, {
                        backgroundColor: getVerdictColor(fullResponse.verdict.decision).bg,
                        color: getVerdictColor(fullResponse.verdict.decision).text
                      }]}>
                        {fullResponse.verdict.decision === 'INTERVIEW' ? 'INTERVIEW' :
                         fullResponse.verdict.decision === 'CONSIDER' ? 'CONSIDER' :
                         fullResponse.verdict.decision === 'REVIEW' ? 'REVIEW' : 'NOT SUITABLE'}
                      </Text>
                      <View style={styles.verdictMeta}>
                        {fullResponse.verdict.confidence && (
                          <Text style={[styles.badge, { backgroundColor: '#dbeafe', color: '#1e40af' }]}>
                            {fullResponse.verdict.confidence}
                          </Text>
                        )}
                        {fullResponse.verdict.riskLevel && (
                          <Text style={[styles.badge, {
                            backgroundColor: fullResponse.verdict.riskLevel === 'LOW' ? '#dcfce7' :
                                           fullResponse.verdict.riskLevel === 'MEDIUM' ? '#fef9c3' : '#fee2e2',
                            color: fullResponse.verdict.riskLevel === 'LOW' ? '#166534' :
                                  fullResponse.verdict.riskLevel === 'MEDIUM' ? '#854d0e' : '#991b1b'
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
                  </View>
                )}

                {/* Section Scores */}
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
                      <Text style={styles.scoreLabel}>Exp</Text>
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
                      <Text style={styles.scoreLabel}>Log</Text>
                    </View>
                    <View style={styles.scoreBox}>
                      <Text style={[styles.scoreValue, { color: (fullResponse.sectionF ?? 0) >= 0 ? '#059669' : '#dc2626' }]}>
                        {(fullResponse.sectionF ?? 0) >= 0 ? '+' : ''}{fullResponse.sectionF ?? 0}
                      </Text>
                      <Text style={styles.scoreMax}>pts</Text>
                      <Text style={styles.scoreLabel}>Mod</Text>
                    </View>
                  </View>
                )}

                {/* Quick Stats */}
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
                    <Text style={[styles.statLabel, { color: '#d97706' }]}>Matched</Text>
                  </View>
                  <View style={[styles.statBox, { backgroundColor: '#faf5ff' }]}>
                    <Text style={[styles.statValue, { color: '#7c3aed' }]}>
                      {fullResponse?.skillAnalysis?.missingSkills?.length || 0}
                    </Text>
                    <Text style={[styles.statLabel, { color: '#7c3aed' }]}>Missing</Text>
                  </View>
                </View>

                {/* Domain Analysis */}
                {fullResponse?.domainAnalysis && (
                  <View style={styles.domainBlock} wrap={false}>
                    <Text style={[styles.blockTitle, { color: '#4f46e5' }]}>Domain Analysis</Text>
                    <View style={styles.domainHeader}>
                      <View style={styles.domainInfo}>
                        <Text style={styles.domainLabel}>Job Domain</Text>
                        <Text style={styles.domainValue}>
                          {fullResponse.domainAnalysis.jobDescriptionDomain || fullResponse.domainAnalysis.jdDomain || 'N/A'}
                        </Text>
                      </View>
                      <View style={styles.domainInfo}>
                        <Text style={styles.domainLabel}>Candidate</Text>
                        <Text style={styles.domainValue}>{fullResponse.domainAnalysis.candidateDomain || 'N/A'}</Text>
                      </View>
                      <Text style={[styles.domainBadge, {
                        backgroundColor: getDomainMatchColor(fullResponse.domainAnalysis.domainMatchLevel).bg,
                        color: getDomainMatchColor(fullResponse.domainAnalysis.domainMatchLevel).text
                      }]}>
                        {fullResponse.domainAnalysis.domainMatchLevel || 'UNKNOWN'}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Competitive Intelligence */}
                {fullResponse?.competitiveIntel && (
                  <View style={styles.competitiveBlock} wrap={false}>
                    <Text style={[styles.blockTitle, { color: '#7c3aed' }]}>Competitive Intel</Text>
                    <View style={styles.competitiveGrid}>
                      {fullResponse.competitiveIntel.marketPosition && (
                        <View style={styles.competitiveItem}>
                          <Text style={styles.competitiveLabel}>Market Position</Text>
                          <Text style={styles.competitiveValue}>{fullResponse.competitiveIntel.marketPosition}</Text>
                        </View>
                      )}
                      {fullResponse.competitiveIntel.flightRisk && (
                        <View style={styles.competitiveItem}>
                          <Text style={styles.competitiveLabel}>Flight Risk</Text>
                          <Text style={[styles.competitiveValue, {
                            color: fullResponse.competitiveIntel.flightRisk === 'LOW' ? '#059669' : '#dc2626'
                          }]}>{fullResponse.competitiveIntel.flightRisk}</Text>
                        </View>
                      )}
                      {fullResponse.competitiveIntel.growthPotential && (
                        <View style={styles.competitiveItem}>
                          <Text style={styles.competitiveLabel}>Growth</Text>
                          <Text style={[styles.competitiveValue, {
                            color: fullResponse.competitiveIntel.growthPotential === 'HIGH' ? '#059669' : '#d97706'
                          }]}>{fullResponse.competitiveIntel.growthPotential}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {/* Strengths & Gaps */}
                <View style={styles.strengthsGapsRow}>
                  <View style={styles.strengthsColumn}>
                    <Text style={[styles.columnTitle, { color: '#166534' }]}>
                      Strengths ({fullResponse?.strengthsHighlights?.length || jobScore.strengthsHighlights?.length || 0})
                    </Text>
                    {(fullResponse?.strengthsHighlights || jobScore.strengthsHighlights || []).slice(0, 3).map((item: any, i: number) => (
                      <View key={i} style={styles.itemCard} wrap={false}>
                        <Text style={styles.itemTitle}>
                          {typeof item === 'string' ? item : (item.strength || 'Strength')}
                        </Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.gapsColumn}>
                    <Text style={[styles.columnTitle, { color: '#991b1b' }]}>
                      Gaps ({fullResponse?.improvementAreas?.length || jobScore.improvementAreas?.length || 0})
                    </Text>
                    {(fullResponse?.improvementAreas || jobScore.improvementAreas || []).slice(0, 3).map((item: any, i: number) => (
                      <View key={i} style={styles.itemCard} wrap={false}>
                        <Text style={styles.itemTitle}>
                          {typeof item === 'string' ? item : (item.gap || 'Gap')}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Skill Analysis */}
                {fullResponse?.skillAnalysis && (
                  <View style={styles.skillAnalysisBlock} wrap={false}>
                    <Text style={[styles.blockTitle, { color: '#166534' }]}>Skill Analysis</Text>
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
                      </View>
                    )}
                    {fullResponse.skillAnalysis.matchedSkills && fullResponse.skillAnalysis.matchedSkills.length > 0 && (
                      <View style={styles.skillBadgesRow}>
                        {fullResponse.skillAnalysis.matchedSkills.slice(0, 10).map((s, i) => (
                          <Text key={i} style={[styles.skillBadge, {
                            backgroundColor: getSkillDepthColor(s.depth).bg,
                            color: getSkillDepthColor(s.depth).text
                          }]}>
                            {s.skill}
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                {/* Experience Analysis */}
                {fullResponse?.experienceAnalysis && (
                  <View style={styles.experienceBlock} wrap={false}>
                    <Text style={[styles.blockTitle, { color: '#1e40af' }]}>Experience Analysis</Text>
                    <View style={styles.experienceGrid}>
                      <View style={styles.experienceBox}>
                        <Text style={styles.experienceValue}>
                          {fullResponse.experienceAnalysis.totalExperienceFormatted ||
                           `${fullResponse.experienceAnalysis.totalYears || 0}y`}
                        </Text>
                        <Text style={styles.experienceLabel}>Total</Text>
                      </View>
                      <View style={styles.experienceBox}>
                        <Text style={[styles.experienceValue, { color: '#059669' }]}>
                          {fullResponse.experienceAnalysis.relevantExperienceFormatted ||
                           `${fullResponse.experienceAnalysis.relevantYears || 0}y`}
                        </Text>
                        <Text style={styles.experienceLabel}>Relevant</Text>
                      </View>
                      <View style={styles.experienceBox}>
                        <Text style={[styles.badge, {
                          backgroundColor: fullResponse.experienceAnalysis.careerProgression === 'ASCENDING' ? '#dcfce7' :
                                         fullResponse.experienceAnalysis.careerProgression === 'STABLE' ? '#dbeafe' : '#fef9c3',
                          color: fullResponse.experienceAnalysis.careerProgression === 'ASCENDING' ? '#166534' :
                                fullResponse.experienceAnalysis.careerProgression === 'STABLE' ? '#1e40af' : '#854d0e',
                          fontSize: 7
                        }]}>
                          {fullResponse.experienceAnalysis.careerProgression || 'N/A'}
                        </Text>
                        <Text style={styles.experienceLabel}>Progression</Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Red Flags */}
                {fullResponse?.redFlags && fullResponse.redFlags.length > 0 && (
                  <View style={styles.redFlagsBlock}>
                    <Text style={[styles.blockTitle, { color: '#991b1b' }]}>
                      Red Flags ({fullResponse.redFlags.length})
                    </Text>
                    {fullResponse.redFlags.slice(0, 3).map((flag, i) => (
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
                      </View>
                    ))}
                  </View>
                )}

                {/* Interview Recommendations */}
                {fullResponse?.interviewRecommendations && typeof fullResponse.interviewRecommendations === 'object' && !Array.isArray(fullResponse.interviewRecommendations) && (
                  <View style={styles.interviewBlock}>
                    <Text style={[styles.blockTitle, { color: '#0f766e' }]}>Interview Guide</Text>
                    {fullResponse.interviewRecommendations.mustExplore && fullResponse.interviewRecommendations.mustExplore.length > 0 && (
                      <View style={styles.interviewCategory} wrap={false}>
                        <Text style={[styles.interviewCategoryTitle, { color: '#0f766e' }]}>Must Explore</Text>
                        {fullResponse.interviewRecommendations.mustExplore.slice(0, 3).map((item, i) => (
                          <Text key={i} style={styles.interviewItem}>→ {item}</Text>
                        ))}
                      </View>
                    )}
                    {fullResponse.interviewRecommendations.technicalValidation && fullResponse.interviewRecommendations.technicalValidation.length > 0 && (
                      <View style={styles.interviewCategory} wrap={false}>
                        <Text style={[styles.interviewCategoryTitle, { color: '#1e40af' }]}>Technical Validation</Text>
                        {fullResponse.interviewRecommendations.technicalValidation.slice(0, 3).map((item, i) => (
                          <Text key={i} style={styles.interviewItem}>* {item}</Text>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                {/* Match Summary */}
                {jobScore.matchSummary && (
                  <Text style={styles.matchSummaryBox}>
                    {jobScore.matchSummary}
                  </Text>
                )}

                {/* Status Badge */}
                <View style={{ marginTop: 8, alignItems: 'center' }} wrap={false}>
                  {jobScore.disqualified && (
                    <Text style={[styles.statusBadge, { backgroundColor: '#fef2f2', color: '#dc2626' }]}>
                      NOT QUALIFIED
                    </Text>
                  )}
                  {jobScore.invitationStatus === 'invited' && (
                    <Text style={[styles.statusBadge, { backgroundColor: '#f0fdf4', color: '#059669' }]}>
                      INVITED TO INTERVIEW
                    </Text>
                  )}
                  {!jobScore.disqualified && jobScore.invitationStatus !== 'invited' && (
                    <Text style={[styles.statusBadge, { backgroundColor: '#f0fdfa', color: '#0891b2' }]}>
                      QUALIFIED - PENDING REVIEW
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </>
  );
};

export default ProfilesPDF;
