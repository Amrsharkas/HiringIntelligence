import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
  Link
} from '@react-pdf/renderer';

// Register fonts (optional - you can add custom fonts)
// Font.register({
//   family: 'Inter',
//   src: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap'
// });

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
  fullResponse?: any;
}

interface ProfilePDFProps {
  profile: ResumeProfile & { jobScores: JobScoring[] };
  jobs?: any[];
  includeJobScores?: boolean;
  selectedJobId?: string;
}

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 40,
    fontSize: 10,
    lineHeight: 1.4,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottom: '2px solid #2563eb',
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
    marginBottom: 5,
  },
  contactItem: {
    fontSize: 10,
    color: '#64748b',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 10,
    borderBottom: '1px solid #e2e8f0',
    paddingBottom: 5,
  },
  summary: {
    fontSize: 11,
    color: '#334155',
    marginBottom: 15,
    lineHeight: 1.5,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 10,
  },
  skill: {
    backgroundColor: '#f1f5f9',
    padding: '4 8',
    borderRadius: 3,
    fontSize: 9,
    color: '#334155',
  },
  experienceItem: {
    marginBottom: 12,
  },
  experienceTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  experienceDescription: {
    fontSize: 10,
    color: '#475569',
    lineHeight: 1.4,
  },
  educationItem: {
    marginBottom: 10,
  },
  educationTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 3,
  },
  educationDetails: {
    fontSize: 10,
    color: '#475569',
  },
  certificationItem: {
    marginBottom: 8,
    fontSize: 10,
    color: '#334155',
  },
  languagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  language: {
    fontSize: 10,
    color: '#334155',
  },
  jobScoresSection: {
    backgroundColor: '#f8fafc',
    padding: 15,
    borderRadius: 5,
    marginTop: 10,
  },
  jobScoreItem: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 3,
  },
  jobScoreTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  scoreContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  scoreItem: {
    flex: 1,
    textAlign: 'center',
  },
  scoreLabel: {
    fontSize: 8,
    color: '#64748b',
    marginBottom: 2,
  },
  scoreValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  matchSummary: {
    fontSize: 9,
    color: '#475569',
    marginTop: 8,
    fontStyle: 'italic',
  },
  disqualifiedSection: {
    backgroundColor: '#fef2f2',
    border: '2px solid #ef4444',
    borderRadius: 5,
    padding: 12,
    marginBottom: 10,
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
    marginBottom: 8,
    fontStyle: 'italic',
  },
  improvementAreasSection: {
    backgroundColor: '#fff7ed',
    border: '1px solid #fb923c',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
  improvementAreasTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ea580c',
    marginBottom: 6,
  },
  improvementArea: {
    fontSize: 9,
    color: '#9a3412',
    marginBottom: 4,
    paddingLeft: 10,
    position: 'relative',
  },
  redFlagsSection: {
    backgroundColor: '#fefce8',
    border: '1px solid #facc15',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
  redFlagsTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ca8a04',
    marginBottom: 6,
  },
  redFlag: {
    fontSize: 9,
    color: '#713f12',
    marginBottom: 3,
    paddingLeft: 10,
    position: 'relative',
  },
  strengthsSection: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #86efac',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
  strengthsTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#166534',
    marginBottom: 6,
  },
  strength: {
    fontSize: 9,
    color: '#14532d',
    marginBottom: 3,
    paddingLeft: 10,
    position: 'relative',
  },
  detailedBreakdown: {
    fontSize: 8,
    color: '#475569',
    marginTop: 6,
    paddingLeft: 8,
    borderLeft: '1px solid #cbd5e1',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#94a3b8',
    textAlign: 'center',
    borderTop: '1px solid #e2e8f0',
    paddingTop: 10,
  },
  getScoreColor: (score: number) => {
    if (score >= 80) return '#059669';
    if (score >= 60) return '#d97706';
    return '#dc2626';
  }
});

export const ProfilePDF: React.FC<ProfilePDFProps> = ({
  profile,
  jobs = [],
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
      <Page size="A4" style={styles.page}>
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.name}>{profile.name}</Text>

          <View style={styles.contactInfo}>
            <Text style={styles.contactItem}>📧 {profile.email}</Text>
            <Text style={styles.contactItem}>📱 {profile.phone}</Text>
            <Text style={styles.contactItem}>📅 Generated: {formatDate(new Date().toISOString())}</Text>
          </View>
        </View>

        {/* Professional Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Professional Summary</Text>
          <Text style={styles.summary}>{profile.summary}</Text>
        </View>

        {/* Skills Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Skills</Text>
          <View style={styles.skillsContainer}>
            {profile.skills.map((skill, index) => (
              <Text key={index} style={styles.skill}>{skill}</Text>
            ))}
          </View>
        </View>

        {/* Languages Section */}
        {profile.languages.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Languages</Text>
            <View style={styles.languagesContainer}>
              {profile.languages.map((language, index) => (
                <Text key={index} style={styles.language}>
                  {language}{index < profile.languages.length - 1 ? ' • ' : ''}
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
              <View key={index} style={styles.experienceItem}>
                <Text style={styles.experienceTitle}>{exp}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Education Section */}
        {profile.education.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Education</Text>
            {profile.education.map((edu, index) => (
              <View key={index} style={styles.educationItem}>
                <Text style={styles.educationTitle}>{edu}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Certifications Section */}
        {profile.certifications.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Certifications</Text>
            {profile.certifications.map((cert, index) => (
              <Text key={index} style={styles.certificationItem}>• {cert}</Text>
            ))}
          </View>
        )}

        {/* Job Scores Section */}
        {includeJobScores && filteredJobScores.length > 0 && (
          <View style={styles.jobScoresSection}>
            <Text style={styles.sectionTitle}>Job Match Analysis</Text>
            {filteredJobScores.map((jobScore) => (
              <View key={jobScore.jobId}>
                {/* Disqualified Status Section */}
                {jobScore.disqualified && (
                  <View style={styles.disqualifiedSection}>
                    <Text style={styles.disqualifiedTitle}>❌ CANDIDATE DISQUALIFIED</Text>
                    {jobScore.disqualificationReason && (
                      <Text style={styles.disqualifiedReason}>{jobScore.disqualificationReason}</Text>
                    )}

                    {/* Score Grid for Disqualified */}
                    <View style={[styles.scoreContainer, { marginTop: 10 }]}>
                      <View style={styles.scoreItem}>
                        <Text style={styles.scoreLabel}>Overall</Text>
                        <Text style={[styles.scoreValue, { color: '#dc2626' }]}>
                          {jobScore.overallScore}%
                        </Text>
                      </View>
                      <View style={styles.scoreItem}>
                        <Text style={styles.scoreLabel}>Technical</Text>
                        <Text style={[styles.scoreValue, { color: '#dc2626' }]}>
                          {jobScore.technicalSkillsScore}%
                        </Text>
                      </View>
                      <View style={styles.scoreItem}>
                        <Text style={styles.scoreLabel}>Experience</Text>
                        <Text style={[styles.scoreValue, { color: '#dc2626' }]}>
                          {jobScore.experienceScore}%
                        </Text>
                      </View>
                      <View style={styles.scoreItem}>
                        <Text style={styles.scoreLabel}>Cultural Fit</Text>
                        <Text style={[styles.scoreValue, { color: '#dc2626' }]}>
                          {jobScore.culturalFitScore}%
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                <View style={styles.jobScoreItem}>
                  <Text style={styles.jobScoreTitle}>{jobScore.jobTitle}</Text>

                  {!jobScore.disqualified && (
                    <View style={styles.scoreContainer}>
                      <View style={styles.scoreItem}>
                        <Text style={styles.scoreLabel}>Technical Skills</Text>
                        <Text style={[styles.scoreValue, { color: styles.getScoreColor(jobScore.technicalSkillsScore) }]}>
                          {jobScore.technicalSkillsScore}%
                        </Text>
                      </View>
                      <View style={styles.scoreItem}>
                        <Text style={styles.scoreLabel}>Experience</Text>
                        <Text style={[styles.scoreValue, { color: styles.getScoreColor(jobScore.experienceScore) }]}>
                          {jobScore.experienceScore}%
                        </Text>
                      </View>
                      <View style={styles.scoreItem}>
                        <Text style={styles.scoreLabel}>Cultural Fit</Text>
                        <Text style={[styles.scoreValue, { color: styles.getScoreColor(jobScore.culturalFitScore) }]}>
                          {jobScore.culturalFitScore}%
                        </Text>
                      </View>
                      <View style={styles.scoreItem}>
                        <Text style={styles.scoreLabel}>Overall Match</Text>
                        <Text style={[styles.scoreValue, { color: styles.getScoreColor(jobScore.overallScore) }]}>
                          {jobScore.overallScore}%
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Improvement Areas */}
                  {jobScore.improvementAreas && jobScore.improvementAreas.length > 0 && (
                    <View style={styles.improvementAreasSection}>
                      <Text style={styles.improvementAreasTitle}>
                        🎯 Key Skill Gaps ({jobScore.improvementAreas.length})
                      </Text>
                      {jobScore.improvementAreas.map((area, index) => (
                        <Text key={index} style={styles.improvementArea}>
                          {index + 1}. {area}
                        </Text>
                      ))}
                    </View>
                  )}

                  {/* Red Flags */}
                  {jobScore.redFlags && jobScore.redFlags.length > 0 && (
                    <View style={styles.redFlagsSection}>
                      <Text style={styles.redFlagsTitle}>
                        ⚠️ Red Flags ({jobScore.redFlags.length})
                      </Text>
                      {jobScore.redFlags.map((flag, index) => (
                        <Text key={index} style={styles.redFlag}>
                          • {flag.issue}: {flag.reason}
                        </Text>
                      ))}
                    </View>
                  )}

                  {/* Strengths Highlights */}
                  {jobScore.strengthsHighlights && jobScore.strengthsHighlights.length > 0 && (
                    <View style={styles.strengthsSection}>
                      <Text style={styles.strengthsTitle}>
                        ✅ Strengths Highlights ({jobScore.strengthsHighlights.length})
                      </Text>
                      {jobScore.strengthsHighlights.map((strength, index) => (
                        <Text key={index} style={styles.strength}>
                          • {strength}
                        </Text>
                      ))}
                    </View>
                  )}

                  {jobScore.matchSummary && (
                    <Text style={styles.matchSummary}>
                      📋 Match Summary: {jobScore.matchSummary}
                    </Text>
                  )}

                  {/* Detailed Breakdown from fullResponse */}
                  {jobScore.fullResponse?.detailedBreakdown && (
                    <View style={styles.detailedBreakdown}>
                      <Text style={{ fontSize: 9, fontWeight: 'bold', marginBottom: 4 }}>
                        🔍 Detailed Analysis:
                      </Text>

                      {jobScore.fullResponse.detailedBreakdown.technicalSkills?.map((skill: any, index: number) => (
                        <Text key={`tech-${index}`} style={{ fontSize: 8, marginBottom: 2 }}>
                          • {skill.requirement}: {skill.present === true ? '✅ Present' : skill.present === 'partial' ? '⚠️ Partial' : '❌ Missing'}
                          {skill.missingDetail && ` - ${skill.missingDetail}`}
                        </Text>
                      ))}

                      {jobScore.fullResponse.detailedBreakdown.experience?.map((exp: any, index: number) => (
                        <Text key={`exp-${index}`} style={{ fontSize: 8, marginBottom: 2 }}>
                          • {exp.requirement}: {exp.present === true ? '✅ Present' : exp.present === 'partial' ? '⚠️ Partial' : '❌ Missing'}
                          {exp.missingDetail && ` - ${exp.missingDetail}`}
                        </Text>
                      ))}
                    </View>
                  )}

                  {/* Status Badge */}
                  <View style={{ marginTop: 8, alignItems: 'center' }}>
                    {jobScore.disqualified && (
                      <Text style={{
                        fontSize: 10,
                        fontWeight: 'bold',
                        color: '#dc2626',
                        backgroundColor: '#fef2f2',
                        padding: '4 8',
                        borderRadius: 3
                      }}>
                        STATUS: NOT QUALIFIED
                      </Text>
                    )}
                    {jobScore.invitationStatus === 'invited' && (
                      <Text style={{
                        fontSize: 10,
                        fontWeight: 'bold',
                        color: '#059669',
                        backgroundColor: '#f0fdf4',
                        padding: '4 8',
                        borderRadius: 3
                      }}>
                        STATUS: INVITED TO INTERVIEW
                      </Text>
                    )}
                    {!jobScore.disqualified && jobScore.invitationStatus !== 'invited' && (
                      <Text style={{
                        fontSize: 10,
                        fontWeight: 'bold',
                        color: '#0891b2',
                        backgroundColor: '#f0fdfa',
                        padding: '4 8',
                        borderRadius: 3
                      }}>
                        STATUS: QUALIFIED - PENDING REVIEW
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          Resume Profile Export - Generated on {formatDate(new Date().toISOString())}
        </Text>
      </Page>
    </Document>
  );
};

export default ProfilePDF;