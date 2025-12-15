import { db } from './db';
import * as schema from '../shared/schema';
import { eq, and, or, ilike, desc, asc, inArray } from 'drizzle-orm';
import {
  AirtableUserProfile,
  InsertAirtableUserProfile,
  AirtableJobPosting,
  InsertAirtableJobPosting,
  AirtableJobApplication,
  InsertAirtableJobApplication,
  AirtableJobMatch,
  InsertAirtableJobMatch
} from '../shared/schema';

export class LocalDatabaseService {

  // User Profiles Operations
  async createUserProfile(data: InsertAirtableUserProfile): Promise<AirtableUserProfile> {
    try {
      const [profile] = await db
        .insert(schema.airtableUserProfiles)
        .values(data)
        .returning();
      return profile;
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  }

  async getUserProfile(userId: string): Promise<AirtableUserProfile | null> {
    try {
      const [profile] = await db
        .select()
        .from(schema.airtableUserProfiles)
        .where(eq(schema.airtableUserProfiles.userId, userId));
      return profile || null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }

  async updateUserProfile(userId: string, data: Partial<InsertAirtableUserProfile>): Promise<AirtableUserProfile | null> {
    try {
      const [profile] = await db
        .update(schema.airtableUserProfiles)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(schema.airtableUserProfiles.userId, userId))
        .returning();
      return profile || null;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  async getAllUserProfiles(): Promise<AirtableUserProfile[]> {
    try {
      return await db
        .select()
        .from(schema.airtableUserProfiles)
        .orderBy(desc(schema.airtableUserProfiles.createdAt));
    } catch (error) {
      console.error('Error getting all user profiles:', error);
      throw error;
    }
  }

  async searchUserProfiles(query: string): Promise<AirtableUserProfile[]> {
    try {
      return await db
        .select()
        .from(schema.airtableUserProfiles)
        .where(
          or(
            ilike(schema.airtableUserProfiles.name, `%${query}%`),
            ilike(schema.airtableUserProfiles.email, `%${query}%`),
            ilike(schema.airtableUserProfiles.professionalSummary, `%${query}%`),
            ilike(schema.airtableUserProfiles.location, `%${query}%`)
          )
        )
        .orderBy(desc(schema.airtableUserProfiles.createdAt));
    } catch (error) {
      console.error('Error searching user profiles:', error);
      throw error;
    }
  }

  // Job Postings Operations
  async createJobPosting(data: InsertAirtableJobPosting): Promise<AirtableJobPosting> {
    try {
      const [job] = await db
        .insert(schema.airtableJobPostings)
        .values(data)
        .returning();
      return job;
    } catch (error) {
      console.error('Error creating job posting:', error);
      throw error;
    }
  }

  async getJobPosting(jobId: string): Promise<AirtableJobPosting | null> {
    try {
      const [job] = await db
        .select()
        .from(schema.airtableJobPostings)
        .where(eq(schema.airtableJobPostings.jobId, jobId));
      return job || null;
    } catch (error) {
      console.error('Error getting job posting:', error);
      throw error;
    }
  }

  async updateJobPosting(jobId: string, data: Partial<InsertAirtableJobPosting>): Promise<AirtableJobPosting | null> {
    try {
      const [job] = await db
        .update(schema.airtableJobPostings)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(schema.airtableJobPostings.jobId, jobId))
        .returning();
      return job || null;
    } catch (error) {
      console.error('Error updating job posting:', error);
      throw error;
    }
  }

  async getAllJobPostings(): Promise<AirtableJobPosting[]> {
    try {
      return await db
        .select()
        .from(schema.airtableJobPostings)
        .orderBy(desc(schema.airtableJobPostings.datePosted));
    } catch (error) {
      console.error('Error getting all job postings:', error);
      throw error;
    }
  }

  async searchJobPostings(query: string): Promise<AirtableJobPosting[]> {
    try {
      return await db
        .select()
        .from(schema.airtableJobPostings)
        .where(
          or(
            ilike(schema.airtableJobPostings.jobTitle, `%${query}%`),
            ilike(schema.airtableJobPostings.company, `%${query}%`),
            ilike(schema.airtableJobPostings.location, `%${query}%`),
            ilike(schema.airtableJobPostings.jobDescription, `%${query}%`)
          )
        )
        .orderBy(desc(schema.airtableJobPostings.datePosted));
    } catch (error) {
      console.error('Error searching job postings:', error);
      throw error;
    }
  }

  async deleteJobPosting(jobId: string): Promise<boolean> {
    try {
      const [deleted] = await db
        .delete(schema.airtableJobPostings)
        .where(eq(schema.airtableJobPostings.jobId, jobId))
        .returning({ id: schema.airtableJobPostings.id });
      return !!deleted;
    } catch (error) {
      console.error('Error deleting job posting:', error);
      throw error;
    }
  }

  // Job Applications Operations
  async createJobApplication(data: InsertAirtableJobApplication): Promise<AirtableJobApplication> {
    try {
      const [application] = await db
        .insert(schema.airtableJobApplications)
        .values(data)
        .returning();
      return application;
    } catch (error) {
      console.error('Error creating job application:', error);
      throw error;
    }
  }

  async getJobApplication(id: string): Promise<AirtableJobApplication | null> {
    try {
      const [application] = await db
        .select()
        .from(schema.airtableJobApplications)
        .where(eq(schema.airtableJobApplications.id, id));
      return application || null;
    } catch (error) {
      console.error('Error getting job application:', error);
      throw error;
    }
  }

  async getJobApplicationsByUser(userId: string): Promise<AirtableJobApplication[]> {
    try {
      return await db
        .select()
        .from(schema.airtableJobApplications)
        .where(eq(schema.airtableJobApplications.applicantUserId, userId))
        .orderBy(desc(schema.airtableJobApplications.applicationDate));
    } catch (error) {
      console.error('Error getting job applications by user:', error);
      throw error;
    }
  }

  async getJobApplicationsByJob(jobId: string): Promise<AirtableJobApplication[]> {
    try {
      return await db
        .select()
        .from(schema.airtableJobApplications)
        .where(eq(schema.airtableJobApplications.jobId, jobId))
        .orderBy(desc(schema.airtableJobApplications.applicationDate));
    } catch (error) {
      console.error('Error getting job applications by job:', error);
      throw error;
    }
  }

  async updateJobApplication(id: string, data: Partial<InsertAirtableJobApplication>): Promise<AirtableJobApplication | null> {
    try {
      const [application] = await db
        .update(schema.airtableJobApplications)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(schema.airtableJobApplications.id, id))
        .returning();
      return application || null;
    } catch (error) {
      console.error('Error updating job application:', error);
      throw error;
    }
  }

  async getAllJobApplications(): Promise<AirtableJobApplication[]> {
    try {
      return await db
        .select()
        .from(schema.airtableJobApplications)
        .orderBy(desc(schema.airtableJobApplications.applicationDate));
    } catch (error) {
      console.error('Error getting all job applications:', error);
      throw error;
    }
  }

  // Fetch job applications filtered by job IDs, single jobId, status and optional pagination
  async getJobApplicationsFiltered(options: {
    jobIds?: string[];
    jobId?: string;
    status?: string;
    limit?: number;
    offset?: number;
    organizationId?: string;
  }): Promise<AirtableJobApplication[]> {
    try {
      let query = db.select().from(schema.airtableJobApplications);

      const { jobIds, jobId, status, limit, offset, organizationId } = options;

      // If organizationId provided, fetch job IDs for that organization and use them
      let resolvedJobIds = jobIds;
      if (organizationId) {
        try {
          const orgJobs = await db.select({ id: schema.jobs.id }).from(schema.jobs).where(eq(schema.jobs.organizationId, organizationId));
          resolvedJobIds = orgJobs.map(j => String(j.id));
        } catch (e) {
          console.error('Error fetching jobs for organization in getJobApplicationsFiltered:', e);
          resolvedJobIds = [];
        }
      }

      if (jobId) {
        query = query.where(eq(schema.airtableJobApplications.jobId, jobId));
      } else if (resolvedJobIds && resolvedJobIds.length > 0) {
        query = query.where(inArray(schema.airtableJobApplications.jobId, resolvedJobIds));
      }

      if (status) {
        query = query.where(eq(schema.airtableJobApplications.status, status));
      }

      query = query.orderBy(desc(schema.airtableJobApplications.applicationDate));

      if (typeof limit === 'number') {
        // drizzle orm supports limit/offset chaining
        query = query.limit(limit);
      }
      if (typeof offset === 'number') {
        query = query.offset(offset);
      }

      return await query;
    } catch (error) {
      console.error('Error getting filtered job applications:', error);
      throw error;
    }
  }

  // Job Matches Operations
  async createJobMatch(data: InsertAirtableJobMatch): Promise<AirtableJobMatch> {
    try {
      const [match] = await db
        .insert(schema.airtableJobMatches)
        .values(data)
        .returning();
      return match;
    } catch (error) {
      console.error('Error creating job match:', error);
      throw error;
    }
  }

  async getJobMatch(id: string): Promise<AirtableJobMatch | null> {
    try {
      const [match] = await db
        .select()
        .from(schema.airtableJobMatches)
        .where(eq(schema.airtableJobMatches.id, id));
      return match || null;
    } catch (error) {
      console.error('Error getting job match:', error);
      throw error;
    }
  }

  async getJobMatchesByUser(userId: string): Promise<AirtableJobMatch[]> {
    try {
      return await db
        .select()
        .from(schema.airtableJobMatches)
        .where(eq(schema.airtableJobMatches.userId, userId))
        .orderBy(desc(schema.airtableJobMatches.createdAt));
    } catch (error) {
      console.error('Error getting job matches by user:', error);
      throw error;
    }
  }

  async getJobMatchesByJob(jobId: string): Promise<AirtableJobMatch[]> {
    try {
      return await db
        .select()
        .from(schema.airtableJobMatches)
        .where(eq(schema.airtableJobMatches.jobId, jobId))
        .orderBy(desc(schema.airtableJobMatches.createdAt));
    } catch (error) {
      console.error('Error getting job matches by job:', error);
      throw error;
    }
  }

  async getJobMatchesByJobIds(jobIds: string[]): Promise<AirtableJobMatch[]> {
    try {
      if (jobIds.length === 0) {
        return [];
      }
      return await db
        .select()
        .from(schema.airtableJobMatches)
        .where(inArray(schema.airtableJobMatches.jobId, jobIds))
        .orderBy(desc(schema.airtableJobMatches.createdAt));
    } catch (error) {
      console.error('Error getting job matches by job IDs:', error);
      throw error;
    }
  }

  async getJobMatchByUserAndJob(userId: string, jobId: string): Promise<AirtableJobMatch | null> {
    try {
      const [match] = await db
        .select()
        .from(schema.airtableJobMatches)
        .where(and(
          eq(schema.airtableJobMatches.userId, userId),
          eq(schema.airtableJobMatches.jobId, jobId)
        ));
      return match || null;
    } catch (error) {
      console.error('Error getting job match by user and job:', error);
      throw error;
    }
  }

  async updateJobMatch(id: string, data: Partial<InsertAirtableJobMatch>): Promise<AirtableJobMatch | null> {
    try {
      const [match] = await db
        .update(schema.airtableJobMatches)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(schema.airtableJobMatches.id, id))
        .returning();
      return match || null;
    } catch (error) {
      console.error('Error updating job match:', error);
      throw error;
    }
  }

  async updateJobMatchStatus(id: string, status: string): Promise<AirtableJobMatch | null> {
    try {
      const [match] = await db
        .update(schema.airtableJobMatches)
        .set({ status, updatedAt: new Date() })
        .where(eq(schema.airtableJobMatches.id, id))
        .returning();
      return match || null;
    } catch (error) {
      console.error('Error updating job match status:', error);
      throw error;
    }
  }

  async scheduleInterview(id: string, interviewDate: Date, interviewTime: string, interviewLink?: string): Promise<AirtableJobMatch | null> {
    try {
      const [match] = await db
        .update(schema.airtableJobMatches)
        .set({
          interviewDate,
          interviewTime,
          interviewLink,
          status: 'scheduled',
          updatedAt: new Date()
        })
        .where(eq(schema.airtableJobMatches.id, id))
        .returning();
      return match || null;
    } catch (error) {
      console.error('Error scheduling interview:', error);
      throw error;
    }
  }

  async getAllJobMatches(): Promise<AirtableJobMatch[]> {
    try {
      return await db
        .select()
        .from(schema.airtableJobMatches)
        .orderBy(desc(schema.airtableJobMatches.createdAt));
    } catch (error) {
      console.error('Error getting all job matches:', error);
      throw error;
    }
  }

  async deleteJobMatchesByJobId(jobId: string): Promise<void> {
    try {
      await db
        .delete(schema.airtableJobMatches)
        .where(eq(schema.airtableJobMatches.jobId, jobId));
    } catch (error) {
      console.error('Error deleting job matches by job ID:', error);
      throw error;
    }
  }

  // Helper method to extract data from user profile (migrated from Airtable service)
  private extractFromProfile(profile: string, field: string): string {
    if (!profile) return '';

    const lines = profile.split('\n').map(line => line.trim());

    switch (field.toLowerCase()) {
      case 'location':
        const locationLine = lines.find(line => line.toLowerCase().startsWith('location:'));
        return locationLine ? locationLine.replace(/^location:\s*/i, '').trim() : '';

      case 'background':
        const backgroundLine = lines.find(line => line.toLowerCase().startsWith('background:'));
        return backgroundLine ? backgroundLine.replace(/^background:\s*/i, '').trim() : '';

      case 'skills':
        const skillsIndex = lines.findIndex(line => line.toLowerCase().includes('skills:'));
        if (skillsIndex !== -1) {
          let skillsText = '';
          for (let i = skillsIndex; i < lines.length; i++) {
            const line = lines[i];
            if (i === skillsIndex) {
              skillsText += line.replace(/^.*skills:\s*/i, '').trim();
            } else if (line.includes(':') && !line.toLowerCase().includes('skills')) {
              break;
            } else {
              skillsText += ' ' + line.trim();
            }
          }
          return skillsText.trim();
        }
        return '';

      case 'interests':
        const interestsLine = lines.find(line => line.toLowerCase().includes('interests:'));
        return interestsLine ? interestsLine.replace(/^.*interests:\s*/i, '').trim() : '';

      case 'experience':
        const expMatch = profile.match(/(\d+)\+?\s*years?\s*(of\s*)?(experience|exp)/i);
        return expMatch ? expMatch[1] + ' years' : '';

      default:
        return '';
    }
  }
}

export const localDatabaseService = new LocalDatabaseService();