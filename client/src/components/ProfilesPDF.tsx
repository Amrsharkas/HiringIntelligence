import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet
} from '@react-pdf/renderer';
import ProfilePDF from './ProfilePDF';

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

interface ProfilesPDFProps {
  profiles: (ResumeProfile & { jobScores: JobScoring[] })[];
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
  tableOfContents: {
    marginBottom: 30,
    borderBottom: '2px solid #2563eb',
    paddingBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 15,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 20,
  },
  profileList: {
    marginBottom: 20,
  },
  profileItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8 0',
    borderBottom: '1px solid #e2e8f0',
  },
  profileName: {
    fontSize: 11,
    color: '#334155',
  },
  profilePage: {
    fontSize: 10,
    color: '#64748b',
  },
  pageBreak: {
    pageBreakBefore: 'always',
  },
  summarySection: {
    backgroundColor: '#f8fafc',
    padding: 15,
    borderRadius: 5,
    marginBottom: 30,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 10,
  },
  summaryText: {
    fontSize: 10,
    color: '#475569',
    lineHeight: 1.4,
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
});

const TableOfContents: React.FC<{ profiles: ProfilesPDFProps['profiles'] }> = ({ profiles }) => {
  return (
    <View style={styles.tableOfContents}>
      <Text style={styles.title}>Resume Profiles Export</Text>
      <Text style={styles.subtitle}>
        Generated on {new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}
      </Text>

      <Text style={styles.summaryTitle}>Export Summary</Text>
      <View style={styles.summarySection}>
        <Text style={styles.summaryText}>
          Total Profiles: {profiles.length}
        </Text>
        <Text style={styles.summaryText}>
          Export Date: {new Date().toLocaleDateString()}
        </Text>
      </View>

      <Text style={styles.summaryTitle}>Table of Contents</Text>
      <View style={styles.profileList}>
        {profiles.map((profile, index) => (
          <View key={profile.id} style={styles.profileItem}>
            <Text style={styles.profileName}>{index + 1}. {profile.name}</Text>
            <Text style={styles.profilePage}>Page {index + 2}</Text>
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
          <Text style={styles.summaryText}>
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
        <Text style={styles.footer}>
          Resume Profiles Export - Generated on {new Date().toLocaleDateString()}
        </Text>
      </Page>

      {/* Individual Profile Pages */}
      {profiles.map((profile, index) => (
        <Page key={profile.id} size="A4" style={styles.page}>
          {/* We'll embed the profile content inline here since nested Document components aren't supported */}
          <ProfilePDFContent
            profile={profile}
            jobs={jobs}
            includeJobScores={includeJobScores}
            selectedJobId={selectedJobId}
          />
          <Text style={styles.footer}>
            Profile {index + 1} of {profiles.length} - Resume Profiles Export
          </Text>
        </Page>
      ))}
    </Document>
  );
};

// Helper component to render profile content without creating a new Document
const ProfilePDFContent: React.FC<Omit<ProfilesPDFProps, 'profiles'>> = ({
  profile,
  jobs = [],
  includeJobScores = true,
  selectedJobId
}) => {
  const profileStyles = StyleSheet.create({
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
    educationItem: {
      marginBottom: 10,
    },
    educationTitle: {
      fontSize: 11,
      fontWeight: 'bold',
      color: '#1e293b',
      marginBottom: 3,
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
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#059669';
    if (score >= 60) return '#d97706';
    return '#dc2626';
  };

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
    <>
      {/* Header Section */}
      <View style={profileStyles.header}>
        <Text style={profileStyles.name}>{profile.name}</Text>

        <View style={profileStyles.contactInfo}>
          <Text style={profileStyles.contactItem}>📧 {profile.email}</Text>
          <Text style={profileStyles.contactItem}>📱 {profile.phone}</Text>
        </View>
      </View>

      {/* Professional Summary */}
      <View style={profileStyles.section}>
        <Text style={profileStyles.sectionTitle}>Professional Summary</Text>
        <Text style={profileStyles.summary}>{profile.summary}</Text>
      </View>

      {/* Skills Section */}
      <View style={profileStyles.section}>
        <Text style={profileStyles.sectionTitle}>Skills</Text>
        <View style={profileStyles.skillsContainer}>
          {profile.skills.map((skill, index) => (
            <Text key={index} style={profileStyles.skill}>{skill}</Text>
          ))}
        </View>
      </View>

      {/* Languages Section */}
      {profile.languages.length > 0 && (
        <View style={profileStyles.section}>
          <Text style={profileStyles.sectionTitle}>Languages</Text>
          <View style={profileStyles.languagesContainer}>
            {profile.languages.map((language, index) => (
              <Text key={index} style={profileStyles.language}>
                {language}{index < profile.languages.length - 1 ? ' • ' : ''}
              </Text>
            ))}
          </View>
        </View>
      )}

      {/* Experience Section */}
      {profile.experience.length > 0 && (
        <View style={profileStyles.section}>
          <Text style={profileStyles.sectionTitle}>Professional Experience</Text>
          {profile.experience.map((exp, index) => (
            <View key={index} style={profileStyles.experienceItem}>
              <Text style={profileStyles.experienceTitle}>{exp}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Education Section */}
      {profile.education.length > 0 && (
        <View style={profileStyles.section}>
          <Text style={profileStyles.sectionTitle}>Education</Text>
          {profile.education.map((edu, index) => (
            <View key={index} style={profileStyles.educationItem}>
              <Text style={profileStyles.educationTitle}>{edu}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Certifications Section */}
      {profile.certifications.length > 0 && (
        <View style={profileStyles.section}>
          <Text style={profileStyles.sectionTitle}>Certifications</Text>
          {profile.certifications.map((cert, index) => (
            <Text key={index} style={profileStyles.certificationItem}>• {cert}</Text>
          ))}
        </View>
      )}

      {/* Job Scores Section */}
      {includeJobScores && filteredJobScores.length > 0 && (
        <View style={profileStyles.jobScoresSection}>
          <Text style={profileStyles.sectionTitle}>Job Match Scores</Text>
          {filteredJobScores.map((jobScore) => (
            <View key={jobScore.jobId} style={profileStyles.jobScoreItem}>
              <Text style={profileStyles.jobScoreTitle}>{jobScore.jobTitle}</Text>

              <View style={profileStyles.scoreContainer}>
                <View style={profileStyles.scoreItem}>
                  <Text style={profileStyles.scoreLabel}>Technical Skills</Text>
                  <Text style={[profileStyles.scoreValue, { color: getScoreColor(jobScore.technicalSkillsScore) }]}>
                    {jobScore.technicalSkillsScore}%
                  </Text>
                </View>
                <View style={profileStyles.scoreItem}>
                  <Text style={profileStyles.scoreLabel}>Experience</Text>
                  <Text style={[profileStyles.scoreValue, { color: getScoreColor(jobScore.experienceScore) }]}>
                    {jobScore.experienceScore}%
                  </Text>
                </View>
                <View style={profileStyles.scoreItem}>
                  <Text style={profileStyles.scoreLabel}>Cultural Fit</Text>
                  <Text style={[profileStyles.scoreValue, { color: getScoreColor(jobScore.culturalFitScore) }]}>
                    {jobScore.culturalFitScore}%
                  </Text>
                </View>
                <View style={profileStyles.scoreItem}>
                  <Text style={profileStyles.scoreLabel}>Overall Match</Text>
                  <Text style={[profileStyles.scoreValue, { color: getScoreColor(jobScore.overallScore) }]}>
                    {jobScore.overallScore}%
                  </Text>
                </View>
              </View>

              {jobScore.matchSummary && (
                <Text style={profileStyles.matchSummary}>{jobScore.matchSummary}</Text>
              )}
            </View>
          ))}
        </View>
      )}
    </>
  );
};

export default ProfilesPDF;