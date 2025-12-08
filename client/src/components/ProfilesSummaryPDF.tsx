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

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    paddingTop: 24,
    paddingBottom: 32,
    paddingHorizontal: 24,
    fontSize: 8,
    lineHeight: 1.2,
    fontFamily: 'Helvetica',
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleSection: {
    flexDirection: 'column',
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 7,
    color: '#6b7280',
    marginTop: 2,
  },
  // Stats row - compact inline
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 3,
  },
  statNumber: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#374151',
    marginRight: 3,
  },
  statText: {
    fontSize: 7,
    color: '#6b7280',
  },
  // Table container
  tableContainer: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 4,
  },
  // Table header
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  headerCell: {
    fontSize: 6,
    fontWeight: 'bold',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  // Table row
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingVertical: 5,
    paddingHorizontal: 6,
    minHeight: 20,
    alignItems: 'center',
  },
  tableRowAlt: {
    backgroundColor: '#fafafa',
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  // Column widths - compact
  colRank: {
    width: '3%',
  },
  colCandidate: {
    width: '27%',
  },
  colContact: {
    width: '25%',
  },
  colPosition: {
    width: '20%',
  },
  colScores: {
    width: '15%',
  },
  colStatus: {
    width: '10%',
    alignItems: 'flex-end',
  },
  // Cell content styles
  rankText: {
    fontSize: 7,
    color: '#9ca3af',
    fontWeight: 'bold',
  },
  candidateName: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 1,
  },
  candidateMeta: {
    fontSize: 6,
    color: '#9ca3af',
  },
  contactEmail: {
    fontSize: 7,
    color: '#374151',
    marginBottom: 1,
  },
  contactPhone: {
    fontSize: 6,
    color: '#9ca3af',
  },
  positionTitle: {
    fontSize: 7,
    color: '#374151',
  },
  noPosition: {
    fontSize: 6,
    color: '#d1d5db',
    fontStyle: 'italic',
  },
  // Score display - compact bar style
  scoreContainer: {
    flexDirection: 'column',
    gap: 2,
  },
  scoreMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  scoreValue: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  scoreBar: {
    width: 30,
    height: 3,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
  },
  scoreBarFill: {
    height: 3,
    borderRadius: 2,
  },
  scoreHigh: {
    color: '#059669',
  },
  scoreMid: {
    color: '#d97706',
  },
  scoreLow: {
    color: '#dc2626',
  },
  barHigh: {
    backgroundColor: '#10b981',
  },
  barMid: {
    backgroundColor: '#f59e0b',
  },
  barLow: {
    backgroundColor: '#ef4444',
  },
  // Status badge - minimal
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginRight: 3,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  statusText: {
    fontSize: 6,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  statusInvited: {
    color: '#059669',
  },
  statusQualified: {
    color: '#6b7280',
  },
  statusDisqualified: {
    color: '#dc2626',
  },
  dotInvited: {
    backgroundColor: '#10b981',
  },
  dotQualified: {
    backgroundColor: '#9ca3af',
  },
  dotDisqualified: {
    backgroundColor: '#ef4444',
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 12,
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerLogo: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#374151',
  },
  footerDivider: {
    width: 1,
    height: 8,
    backgroundColor: '#e5e7eb',
  },
  footerDate: {
    fontSize: 6,
    color: '#9ca3af',
  },
  pageNumber: {
    fontSize: 6,
    color: '#9ca3af',
  },
  // Empty state
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 10,
    color: '#9ca3af',
  },
});

const getScoreColor = (score: number) => {
  if (score >= 80) return { text: styles.scoreHigh, bar: styles.barHigh };
  if (score >= 60) return { text: styles.scoreMid, bar: styles.barMid };
  return { text: styles.scoreLow, bar: styles.barLow };
};

const getStatusStyle = (score: JobScoring) => {
  if (score.disqualified) return { dot: styles.dotDisqualified, text: styles.statusDisqualified, label: 'DQ' };
  if (score.invitationStatus === 'invited') return { dot: styles.dotInvited, text: styles.statusInvited, label: 'INV' };
  return { dot: styles.dotQualified, text: styles.statusQualified, label: 'OK' };
};

export const ProfilesSummaryPDF: React.FC<ProfilesSummaryPDFProps> = ({
  profiles,
  selectedJobId
}) => {
  const formatDate = () => {
    return new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (profiles.length === 0) {
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <View style={styles.titleSection}>
              <Text style={styles.title}>Candidate Summary</Text>
            </View>
          </View>
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No candidates to display</Text>
          </View>
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

  // Flatten profiles with their job scores
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
          <View style={styles.titleSection}>
            <Text style={styles.title}>Candidate Summary</Text>
            <Text style={styles.subtitle}>{totalProfiles} candidates evaluated</Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statChip}>
              <Text style={styles.statNumber}>{qualifiedCount}</Text>
              <Text style={styles.statText}>qualified</Text>
            </View>
            <View style={styles.statChip}>
              <Text style={styles.statNumber}>{invitedCount}</Text>
              <Text style={styles.statText}>invited</Text>
            </View>
            <View style={styles.statChip}>
              <Text style={styles.statNumber}>{disqualifiedCount}</Text>
              <Text style={styles.statText}>disqualified</Text>
            </View>
          </View>
        </View>

        {/* Table */}
        <View style={styles.tableContainer}>
          {/* Table Header */}
          <View style={styles.tableHeader} fixed>
            <View style={styles.colRank}>
              <Text style={styles.headerCell}>#</Text>
            </View>
            <View style={styles.colCandidate}>
              <Text style={styles.headerCell}>Candidate</Text>
            </View>
            <View style={styles.colContact}>
              <Text style={styles.headerCell}>Contact</Text>
            </View>
            <View style={styles.colPosition}>
              <Text style={styles.headerCell}>Position</Text>
            </View>
            <View style={styles.colScores}>
              <Text style={styles.headerCell}>Score</Text>
            </View>
            <View style={styles.colStatus}>
              <Text style={styles.headerCell}>Status</Text>
            </View>
          </View>

          {/* Table Rows */}
          {tableRows.map((row, rowIndex) => {
            const isLast = rowIndex === tableRows.length - 1;
            const scoreColor = row.score ? getScoreColor(row.score.overallScore) : null;
            const statusStyle = row.score ? getStatusStyle(row.score) : null;

            return (
              <View
                key={`${row.profile.id}-${row.score?.jobId || 'no-job'}-${rowIndex}`}
                style={[
                  styles.tableRow,
                  rowIndex % 2 === 1 ? styles.tableRowAlt : {},
                  isLast ? styles.tableRowLast : {}
                ]}
                wrap={false}
              >
                {/* Rank */}
                <View style={styles.colRank}>
                  {row.isFirst && (
                    <Text style={styles.rankText}>{row.index + 1}</Text>
                  )}
                </View>

                {/* Candidate */}
                <View style={styles.colCandidate}>
                  {row.isFirst && (
                    <>
                      <Text style={styles.candidateName}>{row.profile.name}</Text>
                      <Text style={styles.candidateMeta}>
                        {row.profile.skills?.slice(0, 2).join(' · ') || ''}
                      </Text>
                    </>
                  )}
                </View>

                {/* Contact */}
                <View style={styles.colContact}>
                  {row.isFirst && (
                    <>
                      <Text style={styles.contactEmail}>{row.profile.email}</Text>
                    </>
                  )}
                </View>

                {/* Position */}
                <View style={styles.colPosition}>
                  {row.score ? (
                    <Text style={styles.positionTitle}>{row.score.jobTitle}</Text>
                  ) : (
                    <Text style={styles.noPosition}>No match</Text>
                  )}
                </View>

                {/* Score */}
                <View style={styles.colScores}>
                  {row.score && scoreColor && (
                    <View style={styles.scoreContainer}>
                      <View style={styles.scoreMain}>
                        <Text style={[styles.scoreValue, scoreColor.text]}>
                          {row.score.overallScore}
                        </Text>
                        <View style={styles.scoreBar}>
                          <View
                            style={[
                              styles.scoreBarFill,
                              scoreColor.bar,
                              { width: `${row.score.overallScore}%` }
                            ]}
                          />
                        </View>
                      </View>
                    </View>
                  )}
                </View>

                {/* Status */}
                <View style={styles.colStatus}>
                  {row.score && statusStyle && (
                    <View style={styles.statusContainer}>
                      <View style={[styles.statusDot, statusStyle.dot]} />
                      <Text style={[styles.statusText, statusStyle.text]}>
                        {statusStyle.label}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <View style={styles.footerLeft}>
            <Text style={styles.footerLogo}>Hiring Intelligence</Text>
            <View style={styles.footerDivider} />
            <Text style={styles.footerDate}>{formatDate()}</Text>
          </View>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
            `Page ${pageNumber} of ${totalPages}`
          )} />
        </View>
      </Page>
    </Document>
  );
};

export default ProfilesSummaryPDF;
