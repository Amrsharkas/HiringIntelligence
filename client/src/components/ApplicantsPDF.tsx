import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Link
} from '@react-pdf/renderer';

interface Applicant {
  id: string;
  name: string;
  email: string;
  location: string;
  appliedDate: string;
  status: string;
  jobId: string;
  jobTitle: string;
  experience: string;
  skills: string[];
  userId: string;
  matchScore?: number;
  technicalScore?: number;
  experienceScore?: number;
  culturalFitScore?: number;
  matchSummary?: string;
  applicantUserId?: string;
}

interface ApplicantsPDFProps {
  applicants: Applicant[];
  includeScores?: boolean;
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
  applicantList: {
    marginBottom: 20,
  },
  applicantItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8 0',
    borderBottom: '1px solid #e2e8f0',
  },
  applicantName: {
    fontSize: 11,
    color: '#334155',
    flex: 3,
  },
  applicantJob: {
    fontSize: 10,
    color: '#64748b',
    flex: 2,
  },
  applicantStatus: {
    fontSize: 9,
    color: '#059669',
    backgroundColor: '#f0fdf4',
    padding: '2 6',
    borderRadius: 3,
    textAlign: 'center',
    flex: 1,
  },
  applicantPage: {
    fontSize: 10,
    color: '#64748b',
    flex: 1,
    textAlign: 'right',
  },
  summarySection: {
    backgroundColor: '#f8fafc',
    padding: 15,
    borderRadius: 5,
    marginBottom: 30,
  },
  summaryText: {
    fontSize: 10,
    color: '#475569',
    lineHeight: 1.4,
    marginBottom: 5,
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
  // Applicant detail styles
  applicantHeader: {
    marginBottom: 20,
    borderBottom: '2px solid #2563eb',
    paddingBottom: 15,
  },
  applicantName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  applicantContactInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  contactItem: {
    fontSize: 10,
    color: '#64748b',
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
    borderBottom: '1px solid #e2e8f0',
    paddingBottom: 4,
  },
  jobInfo: {
    backgroundColor: '#f1f5f9',
    padding: 10,
    borderRadius: 3,
    marginBottom: 10,
  },
  jobTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  jobDetails: {
    fontSize: 10,
    color: '#64748b',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 10,
  },
  skill: {
    backgroundColor: '#dbeafe',
    padding: '3 8',
    borderRadius: 3,
    fontSize: 9,
    color: '#1e40af',
  },
  experience: {
    fontSize: 10,
    color: '#334155',
    lineHeight: 1.5,
    marginBottom: 10,
  },
  scoresSection: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 5,
    marginTop: 10,
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
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  matchSummary: {
    fontSize: 9,
    color: '#475569',
    marginTop: 8,
    fontStyle: 'italic',
  },
  statusBadge: {
    fontSize: 9,
    padding: '3 8',
    borderRadius: 3,
    textAlign: 'center',
    alignSelf: 'flex-start',
  },
  statusPending: {
    backgroundColor: '#fef3c7',
    color: '#d97706',
  },
  statusAccepted: {
    backgroundColor: '#d1fae5',
    color: '#059669',
  },
  statusDenied: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
  },
});

const TableOfContents: React.FC<{ applicants: ApplicantsPDFProps['applicants'] }> = ({ applicants }) => {
  const getStatusStyle = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'accepted') return styles.statusAccepted;
    if (statusLower === 'denied') return styles.statusDenied;
    return styles.statusPending;
  };

  return (
    <View style={styles.tableOfContents}>
      <Text style={styles.title}>Job Applicants Export</Text>
      <Text style={styles.subtitle}>
        Generated on {new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}
      </Text>

      <Text style={styles.title}>Export Summary</Text>
      <View style={styles.summarySection}>
        <Text style={styles.summaryText}>
          Total Applicants: {applicants.length}
        </Text>
        <Text style={styles.summaryText}>
          Export Date: {new Date().toLocaleDateString()}
        </Text>
      </View>

      <Text style={styles.title}>Table of Contents</Text>
      <View style={styles.applicantList}>
        {applicants.map((applicant, index) => (
          <View key={applicant.id} style={styles.applicantItem}>
            <Text style={styles.applicantName}>{index + 1}. {applicant.name}</Text>
            <Text style={styles.applicantJob}>{applicant.jobTitle}</Text>
            <View style={[styles.statusBadge, getStatusStyle(applicant.status || 'pending')]}>
              <Text>{applicant.status || 'pending'}</Text>
            </View>
            <Text style={styles.applicantPage}>Page {index + 2}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export const ApplicantsPDF: React.FC<ApplicantsPDFProps> = ({
  applicants,
  includeScores = true
}) => {
  if (applicants.length === 0) {
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <Text style={styles.title}>No Applicants to Export</Text>
          <Text style={styles.summaryText}>
            There are no job applicants available for export.
          </Text>
        </Page>
      </Document>
    );
  }

  const getStatusStyle = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'accepted') return styles.statusAccepted;
    if (statusLower === 'denied') return styles.statusDenied;
    return styles.statusPending;
  };

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

  return (
    <Document>
      {/* Table of Contents Page */}
      <Page size="A4" style={styles.page}>
        <TableOfContents applicants={applicants} />
        <Text style={styles.footer}>
          Job Applicants Export - Generated on {new Date().toLocaleDateString()}
        </Text>
      </Page>

      {/* Individual Applicant Pages */}
      {applicants.map((applicant, index) => (
        <Page key={applicant.id} size="A4" style={styles.page}>
          {/* Header Section */}
          <View style={styles.applicantHeader}>
            <Text style={styles.applicantName}>{applicant.name}</Text>

            <View style={styles.applicantContactInfo}>
              <Text style={styles.contactItem}>📧 {applicant.email}</Text>
              {applicant.location && (
                <Text style={styles.contactItem}>📍 {applicant.location}</Text>
              )}
              <Text style={styles.contactItem}>📅 Applied: {formatDate(applicant.appliedDate)}</Text>
            </View>

            <View style={[styles.statusBadge, getStatusStyle(applicant.status || 'pending')]}>
              <Text>Status: {applicant.status || 'pending'}</Text>
            </View>
          </View>

          {/* Job Information Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Applied Position</Text>
            <View style={styles.jobInfo}>
              <Text style={styles.jobTitle}>{applicant.jobTitle}</Text>
              <Text style={styles.jobDetails}>Job ID: {applicant.jobId}</Text>
            </View>
          </View>

          {/* Skills Section */}
          {applicant.skills && applicant.skills.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Skills</Text>
              <View style={styles.skillsContainer}>
                {applicant.skills.map((skill, skillIndex) => (
                  <Text key={skillIndex} style={styles.skill}>{skill}</Text>
                ))}
              </View>
            </View>
          )}

          {/* Experience Section */}
          {applicant.experience && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Experience</Text>
              <Text style={styles.experience}>{applicant.experience}</Text>
            </View>
          )}

          {/* AI Scores Section */}
          {includeScores && (
            <View style={styles.scoresSection}>
              <Text style={styles.sectionTitle}>AI Assessment Scores</Text>

              {(applicant.matchScore !== undefined || applicant.technicalScore !== undefined ||
                applicant.experienceScore !== undefined || applicant.culturalFitScore !== undefined) && (
                <View style={styles.scoreContainer}>
                  {applicant.technicalScore !== undefined && (
                    <View style={styles.scoreItem}>
                      <Text style={styles.scoreLabel}>Technical</Text>
                      <Text style={[styles.scoreValue, { color: getScoreColor(applicant.technicalScore) }]}>
                        {applicant.technicalScore}%
                      </Text>
                    </View>
                  )}
                  {applicant.experienceScore !== undefined && (
                    <View style={styles.scoreItem}>
                      <Text style={styles.scoreLabel}>Experience</Text>
                      <Text style={[styles.scoreValue, { color: getScoreColor(applicant.experienceScore) }]}>
                        {applicant.experienceScore}%
                      </Text>
                    </View>
                  )}
                  {applicant.culturalFitScore !== undefined && (
                    <View style={styles.scoreItem}>
                      <Text style={styles.scoreLabel}>Cultural Fit</Text>
                      <Text style={[styles.scoreValue, { color: getScoreColor(applicant.culturalFitScore) }]}>
                        {applicant.culturalFitScore}%
                      </Text>
                    </View>
                  )}
                  {applicant.matchScore !== undefined && (
                    <View style={styles.scoreItem}>
                      <Text style={styles.scoreLabel}>Overall Match</Text>
                      <Text style={[styles.scoreValue, { color: getScoreColor(applicant.matchScore) }]}>
                        {applicant.matchScore}%
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {applicant.matchSummary && (
                <Text style={styles.matchSummary}>AI Assessment: {applicant.matchSummary}</Text>
              )}
            </View>
          )}

          <Text style={styles.footer}>
            Applicant {index + 1} of {applicants.length} - Job Applicants Export
          </Text>
        </Page>
      ))}
    </Document>
  );
};

export default ApplicantsPDF;