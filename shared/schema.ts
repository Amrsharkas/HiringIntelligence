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

// User storage table - Updated for custom authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: varchar("email").unique().notNull(),
  password: varchar("password").notNull(), // Hashed password
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  username: varchar("username").unique(), // For username-based login
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("employer"),
  isVerified: boolean("is_verified").notNull().default(false), // Email verification status
  verificationToken: varchar("verification_token"), // For email verification
  resetPasswordToken: varchar("reset_password_token"), // For password reset
  resetPasswordExpires: timestamp("reset_password_expires"), // Reset token expiry
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Organizations/Companies
export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
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
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  role: varchar("role").notNull().default("member"),
  joinedAt: timestamp("joined_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Organization invitations
export const organizationInvitations = pgTable("organization_invitations", {
  id: serial("id").primaryKey(),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  email: varchar("email").notNull(),
  role: varchar("role").notNull().default("member"),
  token: varchar("token").notNull().unique(),
  inviteCode: varchar("invite_code").notNull().unique(), // 6-8 digit human-readable code
  invitedBy: varchar("invited_by").notNull().references(() => users.id),
  status: varchar("status").notNull().default("pending"), // pending, accepted, expired
  expiresAt: timestamp("expires_at").notNull(),
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
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  is_active: boolean("is_active").notNull().default(true),
  views: integer("views").notNull().default(0),
  airtableRecordId: varchar("airtable_record_id"), // Store Airtable record ID for deletion
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
  sentInvitations: many(organizationInvitations),
  createdJobs: many(jobs),
}));

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  owner: one(users, { fields: [organizations.ownerId], references: [users.id] }),
  members: many(organizationMembers),
  invitations: many(organizationInvitations),
  jobs: many(jobs),
}));

export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
  organization: one(organizations, { fields: [organizationMembers.organizationId], references: [organizations.id] }),
  user: one(users, { fields: [organizationMembers.userId], references: [users.id] }),
}));

export const organizationInvitationsRelations = relations(organizationInvitations, ({ one }) => ({
  organization: one(organizations, { fields: [organizationInvitations.organizationId], references: [organizations.id] }),
  invitedByUser: one(users, { fields: [organizationInvitations.invitedBy], references: [users.id] }),
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
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
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

// Scored applicants tracking table - prevents score recalculation
export const scoredApplicants = pgTable("scored_applicants", {
  id: serial("id").primaryKey(),
  applicantId: varchar("applicant_id").notNull().unique(), // Airtable record ID
  matchScore: integer("match_score").notNull(),
  matchSummary: text("match_summary"),
  technicalSkillsScore: integer("technical_skills_score"),
  experienceScore: integer("experience_score"),
  culturalFitScore: integer("cultural_fit_score"),
  jobId: varchar("job_id").notNull(),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  scoredAt: timestamp("scored_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Schemas for validation
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Auth schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isVerified: true,
  verificationToken: true,
  resetPasswordToken: true,
  resetPasswordExpires: true,
});

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  username: z.string().min(3, "Username must be at least 3 characters").optional(),
});

export type LoginData = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;

// Shortlisted applicants table
export const shortlistedApplicants = pgTable("shortlisted_applicants", {
  id: text("id").primaryKey().notNull(),
  employerId: text("employer_id").notNull(),
  applicantId: text("applicant_id").notNull(),
  applicantName: text("applicant_name").notNull(),
  jobTitle: text("job_title").notNull(),
  jobId: text("job_id").notNull(),
  note: text("note"),
  dateShortlisted: timestamp("date_shortlisted").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type ShortlistedApplicant = typeof shortlistedApplicants.$inferSelect;
export type InsertShortlistedApplicant = typeof shortlistedApplicants.$inferInsert;
export type AcceptedApplicant = typeof acceptedApplicants.$inferSelect;
export type InsertAcceptedApplicant = typeof acceptedApplicants.$inferInsert;
export type RealInterview = typeof realInterviews.$inferSelect;
export type InsertRealInterview = typeof realInterviews.$inferInsert;
export type ScoredApplicant = typeof scoredApplicants.$inferSelect;
export type InsertScoredApplicant = typeof scoredApplicants.$inferInsert;

export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;

export const insertOrganizationInvitationSchema = createInsertSchema(organizationInvitations).omit({
  id: true,
  token: true,
  status: true,
  createdAt: true,
});
export type InsertOrganizationInvitation = z.infer<typeof insertOrganizationInvitationSchema>;
export type OrganizationInvitation = typeof organizationInvitations.$inferSelect;
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
