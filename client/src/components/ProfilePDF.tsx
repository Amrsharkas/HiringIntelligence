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
  invitationStatus?: string | null;
  interviewDate?: Date | null;
  interviewTime?: string | null;
  interviewLink?: string | null;
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
            <Text style={styles.sectionTitle}>Job Match Scores</Text>
            {filteredJobScores.map((jobScore) => (
              <View key={jobScore.jobId} style={styles.jobScoreItem}>
                <Text style={styles.jobScoreTitle}>{jobScore.jobTitle}</Text>

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

                {jobScore.matchSummary && (
                  <Text style={styles.matchSummary}>{jobScore.matchSummary}</Text>
                )}
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