import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet
} from '@react-pdf/renderer';

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
  invitationStatus?: string | null;
}

interface ProfilesSummaryPDFProps {
  profiles: (ResumeProfile & { jobScores: JobScoring[] })[];
  jobs?: any[];
  selectedJobId?: string;
}

const getScoreColor = (score: number) => {
  if (score >= 80) return '#059669';
  if (score >= 60) return '#d97706';
  return '#dc2626';
};

const getScoreBgColor = (score: number) => {
  if (score >= 80) return '#dcfce7';
  if (score >= 60) return '#fef3c7';
  return '#fee2e2';
};

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    paddingTop: 35,
    paddingBottom: 50,
    paddingHorizontal: 35,
    fontSize: 10,
    lineHeight: 1.4,
    fontFamily: 'Helvetica',
  },
  // Header Section
  header: {
    marginBottom: 25,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
    borderBottomStyle: 'solid',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 10,
    color: '#64748b',
  },
  // Stats Row
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
  },
  statBox: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Table Styles
  table: {
    marginTop: 5,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  tableHeaderCell: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    borderBottomStyle: 'solid',
    borderLeftWidth: 1,
    borderLeftColor: '#e2e8f0',
    borderLeftStyle: 'solid',
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
    borderRightStyle: 'solid',
  },
  tableRowAlt: {
    backgroundColor: '#f8fafc',
  },
  tableRowLast: {
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  // Column widths
  colRank: { width: '5%', textAlign: 'center' },
  colName: { width: '22%', overflow: 'hidden' },
  colContact: { width: '23%', overflow: 'hidden' },
  colJob: { width: '20%', overflow: 'hidden' },
  colScore: { width: '12%', textAlign: 'center' },
  colStatus: { width: '18%', textAlign: 'center' },
  // Cell styles
  cellText: {
    fontSize: 9,
    color: '#334155',
    flexWrap: 'wrap',
  },
  cellTextBold: {
    fontSize: 9,
    color: '#1e293b',
    fontWeight: 'bold',
    flexWrap: 'wrap',
  },
  cellTextSmall: {
    fontSize: 7,
    color: '#64748b',
    marginTop: 1,
    flexWrap: 'wrap',
  },
  // Score Badge
  scoreBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  // Status Badge
  statusBadge: {
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 3,
    fontSize: 7,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 35,
    right: 35,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#94a3b8',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    borderTopStyle: 'solid',
  },
  pageNumber: {
    fontSize: 8,
    color: '#64748b',
  },
  // No data
  noData: {
    textAlign: 'center',
    padding: 40,
    color: '#94a3b8',
    fontSize: 12,
  },
});

export const ProfilesSummaryPDF: React.FC<ProfilesSummaryPDFProps> = ({
  profiles,
  selectedJobId
}) => {
  if (profiles.length === 0) {
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.title}>Resume Profiles Summary</Text>
          </View>
          <Text style={styles.noData}>No profiles available for export</Text>
        </Page>
      </Document>
    );
  }

  // Calculate stats
  const totalProfiles = profiles.length;
  const qualifiedCount = profiles.filter(p =>
    p.jobScores?.some(s => !s.disqualified)
  ).length;
  const disqualifiedCount = profiles.filter(p =>
    p.jobScores?.length > 0 && p.jobScores.every(s => s.disqualified)
  ).length;
  const invitedCount = profiles.filter(p =>
    p.jobScores?.some(s => s.invitationStatus === 'invited')
  ).length;

  // Flatten profiles with their job scores for table display
  const tableRows: Array<{
    profile: ResumeProfile & { jobScores: JobScoring[] };
    score: JobScoring | null;
    index: number;
    isFirst: boolean;
  }> = [];

  profiles.forEach((profile, index) => {
    const filteredScores = selectedJobId
      ? profile.jobScores?.filter(s => s.jobId === selectedJobId) || []
      : profile.jobScores || [];

    if (filteredScores.length === 0) {
      tableRows.push({ profile, score: null, index, isFirst: true });
    } else {
      filteredScores.forEach((score, scoreIndex) => {
        tableRows.push({ profile, score, index, isFirst: scoreIndex === 0 });
      });
    }
  });

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        {/* Header */}
        <View style={styles.header} fixed>
          <Text style={styles.title}>Candidates Summary</Text>
          <Text style={styles.subtitle}>
            Generated on {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statBox, { backgroundColor: '#eff6ff' }]}>
            <Text style={[styles.statNumber, { color: '#2563eb' }]}>{totalProfiles}</Text>
            <Text style={[styles.statLabel, { color: '#3b82f6' }]}>Total</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: '#dcfce7' }]}>
            <Text style={[styles.statNumber, { color: '#059669' }]}>{qualifiedCount}</Text>
            <Text style={[styles.statLabel, { color: '#10b981' }]}>Qualified</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: '#fee2e2' }]}>
            <Text style={[styles.statNumber, { color: '#dc2626' }]}>{disqualifiedCount}</Text>
            <Text style={[styles.statLabel, { color: '#ef4444' }]}>Disqualified</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: '#f3e8ff' }]}>
            <Text style={[styles.statNumber, { color: '#7c3aed' }]}>{invitedCount}</Text>
            <Text style={[styles.statLabel, { color: '#8b5cf6' }]}>Invited</Text>
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader} fixed>
            <Text style={[styles.tableHeaderCell, styles.colRank]}>#</Text>
            <Text style={[styles.tableHeaderCell, styles.colName]}>Candidate</Text>
            <Text style={[styles.tableHeaderCell, styles.colContact]}>Contact</Text>
            <Text style={[styles.tableHeaderCell, styles.colJob]}>Position</Text>
            <Text style={[styles.tableHeaderCell, styles.colScore]}>Score</Text>
            <Text style={[styles.tableHeaderCell, styles.colStatus]}>Status</Text>
          </View>

          {/* Table Rows */}
          {tableRows.map((row, rowIndex) => {
            const isLast = rowIndex === tableRows.length - 1;
            const isAlt = rowIndex % 2 === 1;

            return (
              <View
                key={`${row.profile.id}-${row.score?.jobId || 'no-job'}-${rowIndex}`}
                style={[
                  styles.tableRow,
                  isAlt ? styles.tableRowAlt : {},
                  isLast ? styles.tableRowLast : {}
                ]}
                wrap={false}
              >
                {/* Rank */}
                <View style={styles.colRank}>
                  {row.isFirst && (
                    <Text style={styles.cellTextBold}>{row.index + 1}</Text>
                  )}
                </View>

                {/* Name */}
                <View style={styles.colName}>
                  {row.isFirst && (
                    <Text style={styles.cellTextBold}>{row.profile.name}</Text>
                  )}
                </View>

                {/* Contact */}
                <View style={styles.colContact}>
                  {row.isFirst && (
                    <>
                      <Text style={styles.cellText}>{row.profile.email}</Text>
                      <Text style={styles.cellTextSmall}>{row.profile.phone}</Text>
                    </>
                  )}
                </View>

                {/* Job */}
                <View style={styles.colJob}>
                  {row.score ? (
                    <Text style={styles.cellText}>{row.score.jobTitle}</Text>
                  ) : (
                    <Text style={[styles.cellTextSmall, { fontStyle: 'italic' }]}>No matches</Text>
                  )}
                </View>

                {/* Score */}
                <View style={styles.colScore}>
                  {row.score && (
                    <Text style={[styles.scoreBadge, {
                      backgroundColor: getScoreBgColor(row.score.overallScore),
                      color: getScoreColor(row.score.overallScore)
                    }]}>
                      {row.score.overallScore}%
                    </Text>
                  )}
                </View>

                {/* Status */}
                <View style={styles.colStatus}>
                  {row.score && (
                    <View style={styles.statusContainer}>
                      {row.score.disqualified ? (
                        <Text style={[styles.statusBadge, {
                          backgroundColor: '#fee2e2',
                          color: '#dc2626'
                        }]}>
                          Disqualified
                        </Text>
                      ) : row.score.invitationStatus === 'invited' ? (
                        <Text style={[styles.statusBadge, {
                          backgroundColor: '#dcfce7',
                          color: '#059669'
                        }]}>
                          Invited
                        </Text>
                      ) : (
                        <Text style={[styles.statusBadge, {
                          backgroundColor: '#dbeafe',
                          color: '#1e40af'
                        }]}>
                          Qualified
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>Hiring Intelligence - Candidates Summary</Text>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
            `Page ${pageNumber} of ${totalPages}`
          )} />
        </View>
      </Page>
    </Document>
  );
};

export default ProfilesSummaryPDF;
