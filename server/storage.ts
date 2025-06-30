import {
  users,
  organizations,
  organizationMembers,
  jobs,
  candidates,
  matches,
  type User,
  type UpsertUser,
  type Organization,
  type InsertOrganization,
  type Job,
  type InsertJob,
  type Candidate,
  type Match,
  type OrganizationMember,
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

  async getOrganizationMembers(organizationId: number): Promise<OrganizationMember[]> {
    return await db
      .select()
      .from(organizationMembers)
      .where(eq(organizationMembers.organizationId, organizationId));
  }

  // Job operations
  async createJob(jobData: InsertJob): Promise<Job> {
    const [job] = await db.insert(jobs).values(jobData).returning();
    return job;
  }

  async getJobsByOrganization(organizationId: number): Promise<Job[]> {
    return await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.organizationId, organizationId), eq(jobs.isActive, true)))
      .orderBy(desc(jobs.createdAt));
  }

  async getJobById(id: number): Promise<Job | undefined> {
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
    await db.update(jobs).set({ isActive: false }).where(eq(jobs.id, id));
  }

  async incrementJobViews(id: number): Promise<void> {
    await db
      .update(jobs)
      .set({ views: sql`${jobs.views} + 1` })
      .where(eq(jobs.id, id));
  }

  async getActiveJobsCount(organizationId: number): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(jobs)
      .where(and(eq(jobs.organizationId, organizationId), eq(jobs.isActive, true)));
    
    return result?.count || 0;
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
      .select()
      .from(matches)
      .innerJoin(jobs, eq(matches.jobId, jobs.id))
      .where(eq(jobs.organizationId, organizationId))
      .orderBy(desc(matches.createdAt));
  }

  async createMatch(matchData: { jobId: number; candidateId: number; matchScore: number; matchReasoning?: string }): Promise<Match> {
    const [match] = await db.insert(matches).values(matchData).returning();
    return match;
  }
}

export const storage = new DatabaseStorage();
