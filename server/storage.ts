import {
  users,
  organizations,
  organizationMembers,
  organizationInvitations,
  jobs,
  candidates,
  matches,
  candidateApplications,
  interviews,
  acceptedApplicants,
  realInterviews,
  scoredApplicants,
  type User,
  type UpsertUser,
  type Organization,
  type InsertOrganization,
  type OrganizationMember,
  type OrganizationInvitation,
  type InsertOrganizationInvitation,
  type Job,
  type InsertJob,
  type Candidate,
  type Match,
  type CandidateApplication,
  type InsertCandidateApplication,
  type Interview,
  type InsertInterview,
  type AcceptedApplicant,
  type InsertAcceptedApplicant,
  type RealInterview,
  type InsertRealInterview,
  type ScoredApplicant,
  type InsertScoredApplicant,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Organization operations
  createOrganization(org: InsertOrganization): Promise<Organization>;
  getOrganizationByUser(userId: string): Promise<Organization | undefined>;
  getOrganizationMembers(organizationId: number): Promise<OrganizationMember[]>;
  addOrganizationMember(member: { organizationId: number; userId: string; role: string }): Promise<OrganizationMember>;
  
  // Job operations
  createJob(job: InsertJob): Promise<Job>;
  getJobsByOrganization(organizationId: number): Promise<Job[]>;
  getJobById(id: number): Promise<Job | undefined>;
  getJob(id: number): Promise<Job | undefined>;
  updateJob(id: number, job: Partial<InsertJob>): Promise<Job>;
  deleteJob(id: number): Promise<void>;
  incrementJobViews(id: number): Promise<void>;
  getActiveJobsCount(organizationId: number): Promise<number>;
  
  // Candidate operations
  getCandidates(): Promise<Candidate[]>;
  getCandidatesByJob(jobId: number): Promise<Candidate[]>;
  
  // Match operations
  getMatchesByJob(jobId: number): Promise<Match[]>;
  getMatchesByOrganization(organizationId: number): Promise<Match[]>;
  createMatch(match: { jobId: number; candidateId: number; matchScore: number; matchReasoning?: string }): Promise<Match>;
  
  // Application operations
  createApplication(app: InsertCandidateApplication): Promise<CandidateApplication>;
  updateApplicationStatus(jobId: number, candidateId: string, status: string, reviewedBy: string): Promise<CandidateApplication>;
  getApplicationsByJob(jobId: number): Promise<CandidateApplication[]>;
  getApplication(jobId: number, candidateId: string): Promise<CandidateApplication | undefined>;
  
  // Interview operations
  createRealInterview(interview: InsertRealInterview): Promise<RealInterview>;
  getRealInterviewsByOrganization(organizationId: string): Promise<RealInterview[]>;
  updateRealInterview(id: string, interview: Partial<InsertRealInterview>): Promise<RealInterview>;
  
  // Interview operations
  createInterview(interview: InsertInterview): Promise<Interview>;
  getInterviewsByJob(jobId: number): Promise<Interview[]>;
  updateInterview(id: number, interview: Partial<InsertInterview>): Promise<Interview>;
  
  // Accepted applicants operations
  addAcceptedApplicant(applicant: InsertAcceptedApplicant): Promise<AcceptedApplicant>;
  getAcceptedApplicantsByOrganization(organizationId: number): Promise<AcceptedApplicant[]>;
  removeAcceptedApplicant(candidateId: string, jobId: string, organizationId: number): Promise<void>;

  // Scored applicants operations - for permanent score persistence
  getScoredApplicant(applicantId: string): Promise<ScoredApplicant | undefined>;
  createScoredApplicant(scored: InsertScoredApplicant): Promise<ScoredApplicant>;
  updateScoredApplicant(applicantId: string, scored: Partial<InsertScoredApplicant>): Promise<ScoredApplicant>;
  getScoredApplicantsByOrganization(organizationId: number): Promise<ScoredApplicant[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Organization operations
  async createOrganization(orgData: InsertOrganization): Promise<Organization> {
    const [org] = await db.insert(organizations).values(orgData).returning();
    
    // Add the owner as a member
    await db.insert(organizationMembers).values({
      organizationId: org.id,
      userId: orgData.ownerId,
      role: "owner",
    });
    
    return org;
  }

  async getOrganizationByUser(userId: string): Promise<Organization | undefined> {
    const [result] = await db
      .select()
      .from(organizations)
      .innerJoin(organizationMembers, eq(organizations.id, organizationMembers.organizationId))
      .where(eq(organizationMembers.userId, userId))
      .limit(1);
    
    return result?.organizations;
  }

  async getOrganizationMembers(organizationId: number): Promise<any[]> {
    return await db
      .select({
        id: organizationMembers.id,
        organizationId: organizationMembers.organizationId,
        userId: organizationMembers.userId,
        role: organizationMembers.role,
        createdAt: organizationMembers.createdAt,
        name: users.firstName,
        email: users.email,
        picture: users.profileImageUrl
      })
      .from(organizationMembers)
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .where(eq(organizationMembers.organizationId, organizationId));
  }

  async addOrganizationMember(memberData: { organizationId: number; userId: string; role: string }): Promise<OrganizationMember> {
    const [member] = await db
      .insert(organizationMembers)
      .values(memberData)
      .returning();
    return member;
  }

  // Organization invitation operations
  async createInvitation(invitationData: InsertOrganizationInvitation & { token: string }): Promise<OrganizationInvitation> {
    const [invitation] = await db
      .insert(organizationInvitations)
      .values(invitationData)
      .returning();
    return invitation;
  }

  async getInvitationByToken(token: string): Promise<OrganizationInvitation | undefined> {
    const [invitation] = await db
      .select()
      .from(organizationInvitations)
      .where(eq(organizationInvitations.token, token));
    return invitation;
  }

  async getOrganizationInvitations(organizationId: number): Promise<OrganizationInvitation[]> {
    return await db
      .select()
      .from(organizationInvitations)
      .where(eq(organizationInvitations.organizationId, organizationId))
      .orderBy(desc(organizationInvitations.createdAt));
  }

  async updateInvitationStatus(token: string, status: string): Promise<void> {
    await db
      .update(organizationInvitations)
      .set({ status })
      .where(eq(organizationInvitations.token, token));
  }

  async acceptInvitation(token: string, userId: string): Promise<{ organization: Organization; member: OrganizationMember } | null> {
    const invitation = await this.getInvitationByToken(token);
    
    if (!invitation || invitation.status !== 'pending' || invitation.expiresAt < new Date()) {
      return null;
    }

    // Add user to organization
    const [member] = await db
      .insert(organizationMembers)
      .values({
        organizationId: invitation.organizationId,
        userId: userId,
        role: invitation.role,
      })
      .returning();

    // Update invitation status
    await this.updateInvitationStatus(token, 'accepted');

    // Get organization info
    const organization = await this.getOrganizationById(invitation.organizationId);
    
    if (!organization) {
      throw new Error('Organization not found');
    }

    return { organization, member };
  }

  async getOrganizationById(id: number): Promise<Organization | undefined> {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id));
    return org;
  }

  // Job operations
  async createJob(jobData: InsertJob): Promise<Job> {
    const [job] = await db.insert(jobs).values(jobData).returning();
    return job;
  }

  async getJobsByOrganization(organizationId: number): Promise<Job[]> {
    const allJobs = await db
      .select()
      .from(jobs)
      .where(eq(jobs.organizationId, organizationId))
      .orderBy(desc(jobs.createdAt));
    
    // Filter active jobs manually for now to avoid SQL syntax issues
    return allJobs.filter(job => job.is_active !== false);
  }

  async getJobById(id: number): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    return job;
  }

  async getJob(id: number): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    return job;
  }

  async updateJob(id: number, jobData: Partial<InsertJob>): Promise<Job> {
    const [job] = await db
      .update(jobs)
      .set({ ...jobData, updatedAt: new Date() })
      .where(eq(jobs.id, id))
      .returning();
    return job;
  }

  async deleteJob(id: number): Promise<void> {
    await db.update(jobs).set({ is_active: false }).where(eq(jobs.id, id));
  }

  async incrementJobViews(id: number): Promise<void> {
    await db
      .update(jobs)
      .set({ views: sql`${jobs.views} + 1` })
      .where(eq(jobs.id, id));
  }

  async getActiveJobsCount(organizationId: number): Promise<number> {
    const allJobs = await db
      .select()
      .from(jobs)
      .where(eq(jobs.organizationId, organizationId));
    
    // Count active jobs manually for now to avoid SQL syntax issues
    return allJobs.filter(job => job.is_active !== false).length;
  }

  // Candidate operations
  async getCandidates(): Promise<Candidate[]> {
    return await db.select().from(candidates).orderBy(desc(candidates.createdAt));
  }

  async getCandidatesByJob(jobId: number): Promise<Candidate[]> {
    return await db
      .select({
        id: candidates.id,
        firstName: candidates.firstName,
        lastName: candidates.lastName,
        email: candidates.email,
        profileImageUrl: candidates.profileImageUrl,
        title: candidates.title,
        location: candidates.location,
        summary: candidates.summary,
        skills: candidates.skills,
        experience: candidates.experience,
        createdAt: candidates.createdAt,
      })
      .from(candidates)
      .innerJoin(matches, eq(candidates.id, matches.candidateId))
      .where(eq(matches.jobId, jobId))
      .orderBy(desc(matches.matchScore));
  }

  // Match operations
  async getMatchesByJob(jobId: number): Promise<Match[]> {
    return await db
      .select()
      .from(matches)
      .where(eq(matches.jobId, jobId))
      .orderBy(desc(matches.matchScore));
  }

  async getMatchesByOrganization(organizationId: number): Promise<Match[]> {
    return await db
      .select({
        id: matches.id,
        jobId: matches.jobId,
        candidateId: matches.candidateId,
        matchScore: matches.matchScore,
        matchReasoning: matches.matchReasoning,
        skillGaps: matches.skillGaps,
        culturalFit: matches.culturalFit,
        createdAt: matches.createdAt,
      })
      .from(matches)
      .innerJoin(jobs, eq(matches.jobId, jobs.id))
      .where(eq(jobs.organizationId, organizationId))
      .orderBy(desc(matches.createdAt));
  }

  async createMatch(matchData: { jobId: number; candidateId: number; matchScore: number; matchReasoning?: string }): Promise<Match> {
    const [match] = await db.insert(matches).values(matchData).returning();
    return match;
  }

  // Application operations
  async createApplication(appData: InsertCandidateApplication): Promise<CandidateApplication> {
    const [app] = await db.insert(candidateApplications).values(appData).returning();
    return app;
  }

  async updateApplicationStatus(jobId: number, candidateId: string, status: string, reviewedBy: string): Promise<CandidateApplication> {
    const [app] = await db
      .update(candidateApplications)
      .set({ 
        status, 
        reviewedBy, 
        reviewedAt: new Date() 
      })
      .where(and(
        eq(candidateApplications.jobId, jobId),
        eq(candidateApplications.candidateId, candidateId)
      ))
      .returning();
    return app;
  }

  async getApplicationsByJob(jobId: number): Promise<CandidateApplication[]> {
    const apps = await db
      .select()
      .from(candidateApplications)
      .where(eq(candidateApplications.jobId, jobId))
      .orderBy(desc(candidateApplications.createdAt));
    return apps;
  }

  async getApplication(jobId: number, candidateId: string): Promise<CandidateApplication | undefined> {
    const [app] = await db
      .select()
      .from(candidateApplications)
      .where(and(
        eq(candidateApplications.jobId, jobId),
        eq(candidateApplications.candidateId, candidateId)
      ));
    return app;
  }

  // Interview operations
  async createInterview(interviewData: InsertInterview): Promise<Interview> {
    const [interview] = await db.insert(interviews).values(interviewData).returning();
    return interview;
  }

  async getInterviewsByJob(jobId: number): Promise<Interview[]> {
    const interviewList = await db
      .select()
      .from(interviews)
      .where(eq(interviews.jobId, jobId))
      .orderBy(desc(interviews.createdAt));
    return interviewList;
  }

  async updateInterview(id: number, interviewData: Partial<InsertInterview>): Promise<Interview> {
    const [interview] = await db
      .update(interviews)
      .set({ ...interviewData, updatedAt: new Date() })
      .where(eq(interviews.id, id))
      .returning();
    return interview;
  }

  // Real Interview operations (for the interview scheduling system)
  async createRealInterview(interviewData: InsertRealInterview): Promise<RealInterview> {
    const [interview] = await db.insert(realInterviews).values(interviewData).returning();
    return interview;
  }

  async getRealInterviewsByOrganization(organizationId: string): Promise<RealInterview[]> {
    return await db
      .select()
      .from(realInterviews)
      .where(eq(realInterviews.organizationId, organizationId))
      .orderBy(desc(realInterviews.createdAt));
  }

  async updateRealInterview(id: string, interviewData: Partial<InsertRealInterview>): Promise<RealInterview> {
    const [interview] = await db
      .update(realInterviews)
      .set({ ...interviewData, updatedAt: new Date() })
      .where(eq(realInterviews.id, id))
      .returning();
    return interview;
  }

  // Accepted applicants operations
  async addAcceptedApplicant(applicantData: InsertAcceptedApplicant): Promise<AcceptedApplicant> {
    const [applicant] = await db.insert(acceptedApplicants).values(applicantData).returning();
    return applicant;
  }

  async getAcceptedApplicantsByOrganization(organizationId: number): Promise<AcceptedApplicant[]> {
    const applicants = await db
      .select()
      .from(acceptedApplicants)
      .where(eq(acceptedApplicants.organizationId, organizationId))
      .orderBy(desc(acceptedApplicants.createdAt));
    return applicants;
  }

  async removeAcceptedApplicant(candidateId: string, jobId: string, organizationId: number): Promise<void> {
    await db
      .delete(acceptedApplicants)
      .where(and(
        eq(acceptedApplicants.candidateId, candidateId),
        eq(acceptedApplicants.jobId, jobId),
        eq(acceptedApplicants.organizationId, organizationId)
      ));
  }

  // Scored applicants operations - for permanent score persistence
  async getScoredApplicant(applicantId: string): Promise<ScoredApplicant | undefined> {
    const [scored] = await db
      .select()
      .from(scoredApplicants)
      .where(eq(scoredApplicants.applicantId, applicantId));
    return scored;
  }

  async createScoredApplicant(scoredData: InsertScoredApplicant): Promise<ScoredApplicant> {
    const [scored] = await db.insert(scoredApplicants).values(scoredData).returning();
    return scored;
  }

  async updateScoredApplicant(applicantId: string, scoredData: Partial<InsertScoredApplicant>): Promise<ScoredApplicant> {
    const [scored] = await db
      .update(scoredApplicants)
      .set({ ...scoredData, updatedAt: new Date() })
      .where(eq(scoredApplicants.applicantId, applicantId))
      .returning();
    return scored;
  }

  async getScoredApplicantsByOrganization(organizationId: number): Promise<ScoredApplicant[]> {
    return await db
      .select()
      .from(scoredApplicants)
      .where(eq(scoredApplicants.organizationId, organizationId))
      .orderBy(desc(scoredApplicants.scoredAt));
  }
}

export const storage = new DatabaseStorage();
