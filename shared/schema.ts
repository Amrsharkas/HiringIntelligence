import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
  real,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("employer"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Organizations/Companies
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  companyName: varchar("company_name").notNull(),
  industry: varchar("industry"),
  companySize: varchar("company_size"),
  description: text("description"),
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Organization members
export const organizationMembers = pgTable("organization_members", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  role: varchar("role").notNull().default("member"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Job postings
export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  requirements: text("requirements").notNull(),
  location: varchar("location").notNull(),
  salaryRange: varchar("salary_range"),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  softSkills: text("soft_skills").array(),
  technicalSkills: text("technical_skills").array(),
  employerQuestions: text("employer_questions").array(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  is_active: boolean("is_active").notNull().default(true),
  views: integer("views").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Candidates (read-only from this platform perspective)
export const candidates = pgTable("candidates", {
  id: serial("id").primaryKey(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  email: varchar("email").unique().notNull(),
  profileImageUrl: varchar("profile_image_url"),
  title: varchar("title"),
  location: varchar("location"),
  summary: text("summary"),
  skills: text("skills").array(),
  experience: text("experience"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Candidate-Job matches with AI ratings
export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull().references(() => jobs.id),
  candidateId: integer("candidate_id").notNull().references(() => candidates.id),
  matchScore: integer("match_score").notNull(), // 1-100 rating
  matchReasoning: text("match_reasoning"),
  skillGaps: text("skill_gaps").array(),
  culturalFit: integer("cultural_fit"), // 1-10 rating
  createdAt: timestamp("created_at").defaultNow(),
});

// Candidate application status for specific jobs
export const candidateApplications = pgTable("candidate_applications", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  candidateId: varchar("candidate_id").notNull(), // Airtable candidate ID
  candidateName: varchar("candidate_name").notNull(),
  status: varchar("status").notNull().default("pending"), // pending, accepted, declined
  matchScore: integer("match_score"),
  matchReasoning: text("match_reasoning"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Interview scheduling
export const interviews = pgTable("interviews", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull().references(() => candidateApplications.id, { onDelete: "cascade" }),
  jobId: integer("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  candidateId: varchar("candidate_id").notNull(), // Airtable candidate ID
  candidateName: varchar("candidate_name").notNull(),
  scheduledDate: timestamp("scheduled_date"),
  scheduledTime: varchar("scheduled_time"),
  interviewType: varchar("interview_type").default("video"), // video, phone, in-person
  meetingLink: text("meeting_link"),
  notes: text("notes"),
  status: varchar("status").default("scheduled"), // scheduled, completed, cancelled, rescheduled
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  ownedOrganizations: many(organizations),
  organizationMemberships: many(organizationMembers),
  createdJobs: many(jobs),
}));

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  owner: one(users, { fields: [organizations.ownerId], references: [users.id] }),
  members: many(organizationMembers),
  jobs: many(jobs),
}));

export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
  organization: one(organizations, { fields: [organizationMembers.organizationId], references: [organizations.id] }),
  user: one(users, { fields: [organizationMembers.userId], references: [users.id] }),
}));

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  organization: one(organizations, { fields: [jobs.organizationId], references: [organizations.id] }),
  createdBy: one(users, { fields: [jobs.createdById], references: [users.id] }),
  matches: many(matches),
}));

export const candidatesRelations = relations(candidates, ({ many }) => ({
  matches: many(matches),
}));

export const matchesRelations = relations(matches, ({ one }) => ({
  job: one(jobs, { fields: [matches.jobId], references: [jobs.id] }),
  candidate: one(candidates, { fields: [matches.candidateId], references: [candidates.id] }),
}));

export const candidateApplicationsRelations = relations(candidateApplications, ({ one, many }) => ({
  job: one(jobs, { fields: [candidateApplications.jobId], references: [jobs.id] }),
  reviewer: one(users, { fields: [candidateApplications.reviewedBy], references: [users.id] }),
  interviews: many(interviews),
}));

export const interviewsRelations = relations(interviews, ({ one }) => ({
  application: one(candidateApplications, { fields: [interviews.applicationId], references: [candidateApplications.id] }),
  job: one(jobs, { fields: [interviews.jobId], references: [jobs.id] }),
  createdBy: one(users, { fields: [interviews.createdBy], references: [users.id] }),
}));

// Accepted applicants - Local storage for accepted candidates
export const acceptedApplicants = pgTable("accepted_applicants", {
  id: serial("id").primaryKey(),
  candidateId: varchar("candidate_id").notNull(), // User ID from Airtable
  candidateName: varchar("candidate_name").notNull(),
  candidateEmail: varchar("candidate_email"),
  jobId: varchar("job_id").notNull(),
  jobTitle: varchar("job_title").notNull(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  acceptedBy: varchar("accepted_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Real interviews table for scheduling
export const realInterviews = pgTable("real_interviews", {
  id: varchar("id").primaryKey().notNull(),
  candidateName: varchar("candidate_name").notNull(),
  candidateEmail: varchar("candidate_email"),
  candidateId: varchar("candidate_id").notNull(),
  jobId: varchar("job_id").notNull(),
  jobTitle: varchar("job_title").notNull(),
  scheduledDate: varchar("scheduled_date").notNull(),
  scheduledTime: varchar("scheduled_time").notNull(),
  timeZone: varchar("time_zone").notNull().default('UTC'),
  interviewType: varchar("interview_type").notNull().default('video'),
  meetingLink: varchar("meeting_link"),
  interviewer: varchar("interviewer").notNull(),
  status: varchar("status").notNull().default('scheduled'),
  notes: text("notes"),
  organizationId: varchar("organization_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Schemas for validation
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type AcceptedApplicant = typeof acceptedApplicants.$inferSelect;
export type InsertAcceptedApplicant = typeof acceptedApplicants.$inferInsert;
export type RealInterview = typeof realInterviews.$inferSelect;
export type InsertRealInterview = typeof realInterviews.$inferInsert;

export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Organization = typeof organizations.$inferSelect;

export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  views: true,
});
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobs.$inferSelect;

export type Candidate = typeof candidates.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type CandidateApplication = typeof candidateApplications.$inferSelect;
export type InsertCandidateApplication = typeof candidateApplications.$inferInsert;
export type Interview = typeof interviews.$inferSelect;
export type InsertInterview = typeof interviews.$inferInsert;
