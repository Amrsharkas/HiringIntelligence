# HiringIntelligence - Developer Documentation

## Table of Contents
1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Architecture](#architecture)
4. [Key Features](#key-features)
5. [Subscription System](#subscription-system)
6. [Database Schema](#database-schema)
7. [API Endpoints](#api-endpoints)
8. [External Integrations](#external-integrations)
9. [Background Jobs](#background-jobs)
10. [Setup & Configuration](#setup--configuration)
11. [Development Workflow](#development-workflow)
12. [Important Files Reference](#important-files-reference)

---

## Overview

**HiringIntelligence** is an enterprise hiring platform for employers to manage the complete recruitment lifecycle. The platform provides AI-powered resume processing, candidate matching, interview management, and a comprehensive subscription-based billing system with credit management.

**Location:** `/var/www/plato/HiringIntelligence/`

**Primary Users:** Employers, recruiters, HR teams, and hiring managers

**Main Value Proposition:** AI-powered hiring platform with subscription-based credit system for resume processing, candidate screening, and interview management

---

## Technology Stack

### Frontend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2.3 | UI framework |
| TypeScript | 5.9.3 | Type-safe JavaScript |
| React Router DOM | 7.11.0 | Client-side routing |
| TailwindCSS | 4.1.18 | Utility-first styling |
| Radix UI | Various | Accessible component primitives |
| TanStack Query | 5.90.12 | Server state management |
| Recharts | 3.6.0 | Analytics charts & visualizations |
| React PDF Renderer | 4.3.1 | PDF generation (offer letters) |
| Framer Motion | 12.3.5 | Animations |
| Lucide React | 0.511.2 | Icon library |

### Backend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js + Express | 5.2.1 | Web server framework |
| TypeScript | 5.9.3 | Type safety (ESM modules) |
| Drizzle ORM | 0.45.1 | Database ORM |
| PostgreSQL | - | Primary database (Neon or local) |
| BullMQ | 5.66.2 | Job queue system |
| Redis (ioredis) | 5.8.2 | Queue backend & caching |
| Passport.js | 0.7.0 | Authentication middleware |

### Key Libraries & Services

| Library | Version | Purpose |
|---------|---------|---------|
| OpenAI | 6.15.0 | Resume processing, job matching, AI scoring |
| Stripe | 20.1.0 | **Subscription billing** (critical) |
| Twilio | 5.11.1 | Voice-based AI interviews |
| SendGrid/mail | 8.2.3 | Email notifications |
| pdf-parse | 1.1.1 | Resume PDF parsing |
| pdf-lib | 1.17.1 | PDF manipulation |
| mammoth | 1.8.0 | DOCX parsing |

### Build Tools

- **Vite** 7.3.0 - Fast development server and bundler
- **esbuild** 0.24.2 - TypeScript compilation for server
- **tsx** 4.19.4 - TypeScript execution
- **nodemon** - Auto-restart during development

---

## Architecture

### Directory Structure

```
/var/www/plato/HiringIntelligence/
│
├── client/                              # React Frontend
│   ├── src/
│   │   ├── components/                 # Reusable UI components
│   │   │   ├── ui/                    # Radix UI component wrappers
│   │   │   ├── ApplicantCard.tsx
│   │   │   ├── JobPostingForm.tsx
│   │   │   ├── SubscriptionCard.tsx
│   │   │   └── ...
│   │   ├── pages/                     # Route page components (46 pages!)
│   │   │   ├── hiring/               # Main hiring dashboard area
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   ├── JobPostings.tsx
│   │   │   │   ├── Applicants.tsx
│   │   │   │   ├── ResumeDatabase.tsx
│   │   │   │   ├── Analytics.tsx
│   │   │   │   ├── Settings.tsx
│   │   │   │   ├── Subscription.tsx  # Subscription management
│   │   │   │   └── ...
│   │   │   ├── super-admin/          # Super admin panel
│   │   │   │   ├── SuperAdminDashboard.tsx
│   │   │   │   ├── UserManagement.tsx
│   │   │   │   ├── CompanyManagement.tsx
│   │   │   │   ├── SubscriptionPlans.tsx
│   │   │   │   └── ...
│   │   │   ├── Auth.tsx
│   │   │   ├── Landing.tsx
│   │   │   └── ...
│   │   ├── hooks/                     # Custom React hooks
│   │   │   ├── use-toast.ts
│   │   │   ├── use-subscription.ts
│   │   │   └── ...
│   │   ├── contexts/                  # React context providers
│   │   │   ├── AuthContext.tsx
│   │   │   ├── BrandingContext.tsx   # White-label branding
│   │   │   └── ...
│   │   ├── lib/                       # Utilities
│   │   │   ├── queryClient.ts
│   │   │   └── utils.ts
│   │   ├── App.tsx                   # Main app component
│   │   └── main.tsx                  # Entry point
│   ├── index.html
│   └── vite.config.ts
│
├── server/                              # Express Backend
│   ├── index.ts                        # Server entry point
│   ├── routes.ts                       # Main API routes (296KB file!)
│   ├── worker.ts                       # Background job worker
│   │
│   ├── auth.ts                         # Authentication logic
│   ├── stripeService.ts                # **Stripe integration**
│   ├── subscriptionService.ts          # **Subscription management**
│   ├── creditService.ts                # **Credit system logic**
│   ├── resumeProcessingService.ts      # Resume AI processing
│   ├── emailService.ts                 # SendGrid email integration
│   ├── openai.ts                       # OpenAI service integration
│   ├── storage.ts                      # Data access layer
│   ├── db.ts                           # Database connection
│   │
│   ├── routes/                         # Modular route handlers
│   │   ├── superAdmin.ts              # Super admin routes
│   │   ├── twilioVoice.routes.ts      # Twilio voice API
│   │   └── tutorial.routes.ts         # Tutorial slides
│   │
│   ├── services/                       # Business logic services
│   ├── controllers/                    # Request handlers
│   ├── middleware/                     # Custom middleware
│   └── queues/                         # BullMQ queue definitions
│
├── shared/                              # Shared TypeScript Code
│   └── schema.ts                       # Database schema (1237 lines)
│
├── uploads/                             # Local file storage
│   ├── resumes/                        # Uploaded resume files
│   ├── logos/                          # Organization logos
│   └── offers/                         # Generated offer letters
│
├── docs/                                # Documentation
│   ├── SUBSCRIPTION_SYSTEM.md          # **Subscription system docs**
│   ├── QUICK_START.md                  # Quick start guide
│   └── IMPLEMENTATION_SUMMARY.md       # Implementation notes
│
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .env                                # Environment variables (not in git)
```

### Application Flow

**1. Organization Setup**
   - User registration/login
   - Organization creation (auto-created for first user)
   - Team member invitations
   - Branding configuration (logo, colors)

**2. Subscription Management**
   - Choose subscription plan (Starter/Growth/Pro/Enterprise)
   - Stripe checkout and payment
   - Credit allocation based on plan
   - Monthly/yearly billing cycles

**3. Job Posting**
   - Create job postings (limited by plan)
   - AI-powered job description generation
   - Publish jobs to platform
   - Track active jobs vs plan limit

**4. Resume Processing**
   - Bulk resume upload
   - AI-powered parsing (costs credits)
   - Resume database building
   - RAG-based resume search

**5. Applicant Management**
   - View applicants per job
   - AI candidate scoring (costs credits)
   - Accept/decline/shortlist workflow
   - Offer letter generation

**6. Interview Scheduling**
   - Schedule interviews (costs credits)
   - AI interview question generation
   - Voice-based interviews (Twilio)
   - Email reminders

**7. Analytics & Reporting**
   - Hiring performance metrics
   - Application sources tracking
   - Conversion rates
   - Credit usage analytics

---

## Key Features

### 1. Subscription System (Credit-Based)

**Overview:**
The entire platform operates on a credit-based subscription model. Organizations subscribe to monthly/yearly plans that provide credits for various actions. Credits expire after 45 days to encourage usage.

**Subscription Tiers:**

| Plan | Monthly Price (EGP) | CV Credits | Interview Credits | Job Limit |
|------|---------------------|------------|-------------------|-----------|
| Starter | 29,000 | 1,250 | 25 | 5 active jobs |
| Growth | 39,000 | 2,500 | 50 | 10 active jobs |
| Pro | 49,000 | 5,000 | 80 | Unlimited |
| Enterprise | Custom | Custom | Custom | Unlimited |

**Credit Costs:**

| Action | Credits | Purpose |
|--------|---------|---------|
| Resume Processing | 2 | AI parsing of uploaded resume |
| AI Matching | 1 | Match candidate to job |
| Interview Scheduling | 5 | Schedule and send reminders |

**Additional Credit Packs:**
- 100 credits - 9,000 EGP
- 300 credits - 24,000 EGP
- 1,000 credits - 70,000 EGP

**Credit Expiration:**
- Credits expire 45 days after allocation
- Automatic expiry tracking
- Notifications before expiration

**Implementation Files:**
- `server/subscriptionService.ts` - Core subscription logic
- `server/creditService.ts` - Credit management
- `server/stripeService.ts` - Stripe integration
- See: `SUBSCRIPTION_SYSTEM.md` for detailed documentation

### 2. Organization & Team Management

**Multi-Tenant Architecture:**
- Each organization has isolated data
- Team members with role-based access
- Organization-level settings and branding

**Features:**
- Create/update organization profile
- Invite team members by email
- Remove team members
- Pending invitation management

**White-Label Branding:**
- Upload custom logo
- Set primary brand color
- Set secondary brand color
- Customize organization name

**Implementation:**
- Tables: `organizations`, `organization_members`, `organization_member_invites`
- Routes: `/api/organizations/*`

### 3. Job Posting Management

**Job Limits:**
- Starter: 5 active jobs
- Growth: 10 active jobs
- Pro/Enterprise: Unlimited

**Features:**
- Create job postings
- AI-powered job description generation
- Edit/delete job postings
- Track active job count vs limit
- Job posting analytics

**Job Fields:**
- Title, description, company
- Location, job type, salary range
- Required skills and qualifications
- Responsibilities, benefits

**Implementation:**
- Table: `jobs`
- Routes: `/api/job-postings/*`
- Component: `client/src/pages/hiring/JobPostings.tsx`

### 4. Resume Processing & Database

**Resume Upload:**
- Bulk upload (multiple files)
- Supports PDF and DOCX
- File validation and size limits

**AI Processing:**
- Costs 2 credits per resume
- Extracts structured data:
  - Personal information
  - Work experience
  - Education history
  - Skills and certifications
  - Projects and achievements
- Creates searchable resume profiles

**Resume Database:**
- Central repository of processed resumes
- Full-text search
- RAG-based semantic search
- Filter by skills, experience, location

**Implementation:**
- Service: `server/resumeProcessingService.ts`
- Tables: `resume_profiles`, `resume_uploads`
- Routes: `/api/resumes/*`

### 5. Applicant Management

**Application Sources:**
- Direct applications (from ApplicantTracker)
- Resume database matches
- External referrals

**Applicant Pipeline:**
1. **Applied** - Initial application received
2. **Shortlisted** - Marked as interesting
3. **Interview Scheduled** - Interview arranged
4. **Offered** - Offer extended
5. **Accepted/Declined** - Final status

**AI Candidate Scoring:**
- Costs 1 credit per scoring
- Analyzes fit to job requirements
- Provides score (0-100)
- Generates match reasoning

**Applicant Actions:**
- View all applicants
- Filter by job, status, score
- Accept/decline applicants
- Generate offer letters (PDF)
- Email communications

**Implementation:**
- Tables: `applicant_profiles`, `applicant_scoring`, `job_matches`
- Routes: `/api/applicants/*`
- Components: `client/src/pages/hiring/Applicants.tsx`

### 6. Interview Management

**Interview Scheduling:**
- Costs 5 credits per interview
- Calendar integration
- Email reminders to candidates
- Interview status tracking

**AI Interview Questions:**
- Job-specific question generation
- Role-based question banks
- Difficulty levels

**Voice Interviews (Twilio):**
- AI-powered phone interviews
- Call recording and transcription
- Automated evaluation

**Implementation:**
- Table: `interviews`
- Routes: `/api/interviews/*`
- Service: `server/routes/twilioVoice.routes.ts`

### 7. Analytics & Reporting

**Performance Metrics:**
- Total applicants
- Applications per job
- Average time-to-hire
- Conversion rates (applied → hired)
- Application sources breakdown

**Credit Usage Analytics:**
- Credit consumption over time
- Credits by action type
- Expiring credits warnings
- Usage projections

**Charts & Visualizations:**
- Recharts for interactive graphs
- Applicant funnel visualization
- Source attribution pie charts
- Time series trends

**Implementation:**
- Routes: `/api/analytics/*`
- Component: `client/src/pages/hiring/Analytics.tsx`

### 8. Super Admin Panel

**Purpose:** Platform-wide administration for Plato operators

**Features:**

**User Management:**
- View all users
- Update user details
- Deactivate accounts
- Reset passwords

**Company Management:**
- View all organizations
- Update organization details
- Monitor subscription status
- View credit balances

**Subscription Plan Management:**
- Create/edit subscription plans
- Set pricing (monthly/yearly)
- Configure credit allocations
- Set job posting limits

**Credit Package Management:**
- Define credit packs
- Set pricing
- Configure bonus credits

**Tutorial Management:**
- Create onboarding tutorial slides
- Update tutorial content
- Set slide order

**System Settings:**
- Global configuration
- Feature flags
- Maintenance mode

**Implementation:**
- Routes: `server/routes/superAdmin.ts`
- Components: `client/src/pages/super-admin/*`
- Access: Requires `isSuperAdmin` flag on user

---

## Subscription System

### Architecture

**Credit Lifecycle:**
```
Subscription Created
    ↓
Credits Allocated (with expiry date: +45 days)
    ↓
Credits Consumed (on actions)
    ↓
Credits Expire (after 45 days if unused)
```

**Database Tables:**
- `subscription_plans` - Available plans
- `organization_subscriptions` - Active subscriptions
- `subscription_invoices` - Payment history
- `credit_transactions` - All credit movements
- `credit_expirations` - Tracks expiring credits
- `credit_pricing` - Action costs configuration
- `credit_packages` - Additional credit packs
- `regional_pricing` - Country-specific pricing

### Subscription Flow

**1. Plan Selection:**
```typescript
GET /api/subscriptions/plans
// Returns available plans with pricing
```

**2. Checkout:**
```typescript
POST /api/subscriptions/subscribe
Body: {
  planId: 1,
  billingCycle: 'monthly' // or 'yearly'
}
// Creates Stripe checkout session
// Redirects to Stripe payment page
```

**3. Payment Processing:**
```
Stripe processes payment
    ↓
Webhook sent to /api/payments/webhook
    ↓
Subscription created in database
    ↓
Credits allocated to organization
    ↓
User redirected to success page
```

**4. Credit Allocation:**
```typescript
// Automatic on subscription creation
const expiryDate = new Date();
expiryDate.setDate(expiryDate.getDate() + 45); // 45 days

await creditService.allocateCredits({
  organizationId,
  amount: plan.cvCredits + plan.interviewCredits,
  reason: 'subscription_renewal',
  expiresAt: expiryDate
});
```

**5. Credit Usage:**
```typescript
// When processing resume
await creditService.deductCredits({
  organizationId,
  amount: 2,
  action: 'resume_processing',
  metadata: { resumeId }
});
```

**6. Credit Expiry:**
```typescript
// Background job checks daily
const expiringCredits = await creditService.getExpiringCredits();
// Send notification emails
// Mark credits as expired
```

### Stripe Integration

**Webhook Events:**
- `invoice.paid` - Subscription payment successful
- `invoice.payment_failed` - Payment failed
- `customer.subscription.deleted` - Subscription canceled
- `customer.subscription.updated` - Subscription changed

**Webhook Handler:**
```typescript
// server/routes.ts
app.post('/api/payments/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const event = stripe.webhooks.constructEvent(
    req.body,
    sig,
    process.env.STRIPE_WEBHOOK_SECRET
  );

  // Handle event
  switch (event.type) {
    case 'invoice.paid':
      await handleInvoicePaid(event.data.object);
      break;
    // ...
  }
});
```

### Credit Service API

**Key Functions:**

```typescript
// server/creditService.ts

// Get organization's credit balance
async function getCreditBalance(organizationId: number): Promise<number>

// Allocate credits
async function allocateCredits({
  organizationId,
  amount,
  reason,
  expiresAt
}): Promise<void>

// Deduct credits
async function deductCredits({
  organizationId,
  amount,
  action,
  metadata
}): Promise<{ success: boolean, balance: number }>

// Get credit transaction history
async function getCreditHistory(organizationId: number): Promise<Transaction[]>

// Get expiring credits
async function getExpiringCredits(daysUntilExpiry: number = 7): Promise<ExpiringCredit[]>

// Check if organization has enough credits
async function hasEnoughCredits(organizationId: number, amount: number): Promise<boolean>
```

### Subscription Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/subscriptions/plans` | List all available plans |
| GET | `/api/subscriptions/current` | Get org's current subscription |
| POST | `/api/subscriptions/subscribe` | Subscribe to a plan |
| POST | `/api/subscriptions/cancel` | Cancel subscription |
| POST | `/api/subscriptions/change` | Change plan |
| GET | `/api/subscriptions/invoices` | List payment history |
| GET | `/api/credit-packages` | List additional credit packs |
| POST | `/api/payments/buy-credits` | Purchase credit pack |
| GET | `/api/organizations/current/credits` | Get credit balance |
| GET | `/api/organizations/current/credits/history` | Credit transaction log |
| GET | `/api/subscriptions/credits/expiring` | List expiring credits |

### Documentation

**Comprehensive Docs:**
- `/var/www/plato/HiringIntelligence/SUBSCRIPTION_SYSTEM.md` - Full system documentation
- `/var/www/plato/HiringIntelligence/QUICK_START.md` - Quick setup guide
- `/var/www/plato/HiringIntelligence/IMPLEMENTATION_SUMMARY.md` - Technical implementation

---

## Database Schema

**Database:** PostgreSQL (via Drizzle ORM)

**Schema Location:** `/var/www/plato/HiringIntelligence/shared/schema.ts` (1237 lines)

### Core Tables

#### Users & Authentication

**`users`**
- `id` (serial, primary key)
- `email` (unique)
- `password` (hashed, nullable for OAuth)
- `name`
- `isSuperAdmin` (boolean, for platform admins)
- `googleId` (nullable, for OAuth)
- `emailVerified` (boolean)
- `emailVerificationToken`
- `termsAcceptedAt` (timestamp)
- `createdAt`, `updatedAt`

**`sessions`**
- Express session storage
- `sid` (session ID, primary key)
- `sess` (JSON session data)
- `expire` (timestamp)

#### Organizations

**`organizations`**
- `id` (serial, primary key)
- `name`
- `domain` (nullable, for email domain matching)
- `industry`
- `companySize`
- `website`
- `logoUrl` (white-label logo)
- `primaryColor`, `secondaryColor` (branding)
- `createdAt`, `updatedAt`

**`organization_members`**
- `id` (serial, primary key)
- `organizationId` (foreign key → organizations)
- `userId` (foreign key → users)
- `role` (enum: 'owner', 'admin', 'member')
- `joinedAt`

**`organization_member_invites`**
- `id` (serial, primary key)
- `organizationId` (foreign key → organizations)
- `email`
- `role`
- `token` (invitation token)
- `invitedBy` (foreign key → users)
- `expiresAt`
- `createdAt`

#### Subscriptions & Billing

**`subscription_plans`**
- `id` (serial, primary key)
- `name` (e.g., 'Starter', 'Growth', 'Pro')
- `description`
- `monthlyPrice` (EGP)
- `yearlyPrice` (EGP)
- `cvCredits` (number of CV processing credits)
- `interviewCredits` (number of interview credits)
- `jobPostLimit` (nullable, null = unlimited)
- `features` (JSON array of feature strings)
- `isActive` (boolean)
- `displayOrder` (integer)
- `createdAt`, `updatedAt`

**`organization_subscriptions`**
- `id` (serial, primary key)
- `organizationId` (foreign key → organizations)
- `planId` (foreign key → subscription_plans)
- `billingCycle` (enum: 'monthly', 'yearly')
- `status` (enum: 'active', 'canceled', 'past_due', 'trial')
- `stripeSubscriptionId` (Stripe subscription ID)
- `stripeCustomerId` (Stripe customer ID)
- `currentPeriodStart`, `currentPeriodEnd`
- `cancelAtPeriodEnd` (boolean)
- `createdAt`, `updatedAt`

**`subscription_invoices`**
- `id` (serial, primary key)
- `organizationId` (foreign key → organizations)
- `subscriptionId` (foreign key → organization_subscriptions)
- `amount` (decimal)
- `currency` (default: 'EGP')
- `status` (enum: 'paid', 'pending', 'failed')
- `stripeInvoiceId`
- `paidAt`
- `createdAt`

#### Credit System

**`credit_transactions`**
- `id` (serial, primary key)
- `organizationId` (foreign key → organizations)
- `amount` (integer, can be negative for deductions)
- `balanceAfter` (integer, snapshot of balance)
- `type` (enum: 'allocation', 'deduction', 'expiration', 'refund')
- `reason` (text description)
- `relatedEntityType` (e.g., 'resume', 'interview', 'subscription')
- `relatedEntityId` (integer)
- `metadata` (JSON, extra context)
- `expiresAt` (nullable, for allocated credits)
- `createdAt`

**`credit_expirations`**
- `id` (serial, primary key)
- `organizationId` (foreign key → organizations)
- `amount` (credits to expire)
- `expiryDate` (date of expiration)
- `isExpired` (boolean)
- `notificationSent` (boolean)
- `createdAt`

**`credit_pricing`**
- `id` (serial, primary key)
- `action` (enum: 'resume_processing', 'ai_matching', 'interview_scheduling')
- `creditCost` (integer)
- `description`
- `isActive` (boolean)
- `updatedAt`

**`credit_packages`**
- `id` (serial, primary key)
- `name` (e.g., '100 Credits')
- `credits` (integer amount)
- `price` (decimal, EGP)
- `bonusCredits` (integer, extra credits)
- `isActive` (boolean)
- `displayOrder` (integer)
- `createdAt`, `updatedAt`

**`regional_pricing`**
- `id` (serial, primary key)
- `countryCode` (ISO code)
- `currency`
- `conversionRate` (from base EGP)
- `isActive` (boolean)
- `updatedAt`

#### Hiring

**`jobs`**
- `id` (serial, primary key)
- `organizationId` (foreign key → organizations)
- `title`
- `description`
- `requirements` (JSON array)
- `responsibilities` (JSON array)
- `benefits` (JSON array)
- `location`
- `jobType` (enum: 'full-time', 'part-time', 'contract', 'internship')
- `salaryMin`, `salaryMax`, `salaryCurrency`
- `status` (enum: 'draft', 'published', 'closed')
- `publishedAt`, `closedAt`
- `createdBy` (foreign key → users)
- `createdAt`, `updatedAt`

**`applicant_profiles`**
- `id` (serial, primary key)
- `userId` (foreign key → users, nullable)
- `organizationId` (foreign key → organizations, which org added this)
- `source` (enum: 'application', 'resume_database', 'referral')
- `jobId` (foreign key → jobs, nullable)
- `personalInfo` (JSON: name, email, phone, location)
- `summary` (text)
- `workExperience` (JSON array)
- `education` (JSON array)
- `skills` (JSON array)
- `certifications` (JSON array)
- `resumeUrl` (nullable)
- `status` (enum: 'applied', 'shortlisted', 'interview', 'offered', 'accepted', 'declined')
- `createdAt`, `updatedAt`

**`resume_profiles`**
- `id` (serial, primary key)
- `organizationId` (foreign key → organizations)
- `uploadedBy` (foreign key → users)
- `fileName`
- `fileUrl`
- `extractedData` (JSON, parsed resume data)
- `skills` (text array, for searching)
- `experience` (integer, years)
- `education` (text)
- `location`
- `processedAt`
- `createdAt`

**`applicant_scoring`**
- `id` (serial, primary key)
- `applicantId` (foreign key → applicant_profiles)
- `jobId` (foreign key → jobs)
- `score` (integer 0-100)
- `reasoning` (text, AI explanation)
- `aiModel` (string, e.g., 'gpt-4')
- `metadata` (JSON)
- `scoredAt`

**`job_matches`**
- `id` (serial, primary key)
- `jobId` (foreign key → jobs)
- `applicantId` (foreign key → applicant_profiles)
- `matchScore` (integer 0-100)
- `matchReason` (text)
- `aiAnalysis` (JSON)
- `status` (enum: 'new', 'viewed', 'shortlisted', 'rejected')
- `createdAt`

**`offer_letters`**
- `id` (serial, primary key)
- `organizationId` (foreign key → organizations)
- `applicantId` (foreign key → applicant_profiles)
- `jobId` (foreign key → jobs)
- `offerDetails` (JSON: salary, start date, etc.)
- `pdfUrl` (generated PDF file)
- `status` (enum: 'draft', 'sent', 'accepted', 'declined')
- `sentAt`, `respondedAt`
- `createdAt`, `updatedAt`

**`interviews`**
- `id` (serial, primary key)
- `organizationId` (foreign key → organizations)
- `applicantId` (foreign key → applicant_profiles)
- `jobId` (foreign key → jobs)
- `scheduledAt` (timestamp)
- `duration` (minutes)
- `interviewType` (enum: 'phone', 'video', 'in-person', 'ai-voice')
- `status` (enum: 'scheduled', 'completed', 'canceled', 'no-show')
- `notes` (text)
- `recordingUrl` (nullable)
- `transcription` (nullable)
- `aiQuestions` (JSON array)
- `createdBy` (foreign key → users)
- `createdAt`, `updatedAt`

#### Super Admin

**`tutorial_slides`**
- `id` (serial, primary key)
- `title`
- `content` (text, markdown)
- `imageUrl` (nullable)
- `order` (integer)
- `isActive` (boolean)
- `createdAt`, `updatedAt`

**`system_settings`**
- `id` (serial, primary key)
- `key` (unique string)
- `value` (text)
- `description`
- `updatedBy` (foreign key → users)
- `updatedAt`

### Schema Management

**Push schema changes:**
```bash
npm run db:push
```

**Drizzle configuration:**
- Auto-detects Neon vs local PostgreSQL
- Uses `@neondatabase/serverless` for Neon
- Uses `pg` for local PostgreSQL

---

## API Endpoints

**Base URL:** `http://localhost:5000`

**Main Routes File:** `/var/www/plato/HiringIntelligence/server/routes.ts` (296KB!)

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/user` | Get current authenticated user |
| POST | `/api/auth/login` | Local email/password login |
| POST | `/api/auth/register` | Create new user account |
| POST | `/api/auth/logout` | Log out current user |
| GET | `/api/auth/google` | Initiate Google OAuth flow |
| GET | `/api/auth/google/callback` | Google OAuth callback |
| POST | `/api/auth/verify-email` | Verify email with token |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password with token |

### Organizations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/organizations/current` | Get user's organization |
| POST | `/api/organizations` | Create new organization |
| PUT | `/api/organizations/current` | Update organization |
| POST | `/api/organizations/current/branding/logo` | Upload logo |
| PUT | `/api/organizations/current/branding` | Update branding colors |
| GET | `/api/organizations/current/credits` | Get credit balance |
| GET | `/api/organizations/current/credits/history` | Credit transaction history |

### Team Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/organizations/current/members` | List team members |
| POST | `/api/organizations/current/invite` | Invite team member |
| DELETE | `/api/organizations/current/members/:id` | Remove team member |
| GET | `/api/organizations/invites/:token` | Get invitation details |
| POST | `/api/organizations/invites/:token/accept` | Accept invitation |
| GET | `/api/organizations/current/invites` | List pending invites |

### Subscriptions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/subscriptions/plans` | List available subscription plans |
| GET | `/api/subscriptions/current` | Get org's current subscription |
| POST | `/api/subscriptions/subscribe` | Subscribe to a plan (creates Stripe checkout) |
| POST | `/api/subscriptions/cancel` | Cancel subscription at period end |
| POST | `/api/subscriptions/resume` | Resume canceled subscription |
| POST | `/api/subscriptions/change` | Change to different plan |
| GET | `/api/subscriptions/invoices` | List payment history |
| GET | `/api/subscriptions/credits/expiring` | List expiring credits |

### Payments (Stripe)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payments/create-checkout-session` | Create Stripe checkout for subscription |
| POST | `/api/payments/webhook` | Stripe webhook handler (raw body) |
| GET | `/api/credit-packages` | List additional credit packs |
| POST | `/api/payments/buy-credits` | Purchase credit pack |

### Job Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/job-postings` | List organization's jobs |
| POST | `/api/job-postings` | Create job posting |
| GET | `/api/job-postings/:id` | Get specific job |
| PUT | `/api/job-postings/:id` | Update job |
| DELETE | `/api/job-postings/:id` | Delete job |
| POST | `/api/job-postings/:id/publish` | Publish job |
| POST | `/api/job-postings/:id/close` | Close job |
| GET | `/api/job-postings/count` | Job count vs limit |

### Resume Processing

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/resumes/upload` | Upload resumes (bulk) |
| POST | `/api/resumes/process` | Process resume with AI (costs 2 credits) |
| GET | `/api/resumes` | List processed resumes |
| GET | `/api/resumes/:id` | Get resume details |
| DELETE | `/api/resumes/:id` | Delete resume |
| POST | `/api/resumes/search` | RAG-based resume search |
| GET | `/api/resumes/search` | Simple resume search (query params) |

### Applicant Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/applicants` | List all applicants |
| GET | `/api/applicants/job/:jobId` | Applicants for specific job |
| GET | `/api/applicants/:id` | Get applicant details |
| POST | `/api/applicants/:id/score` | AI score applicant (costs 1 credit) |
| POST | `/api/applicants/:id/accept` | Accept applicant |
| POST | `/api/applicants/:id/decline` | Decline applicant |
| POST | `/api/applicants/:id/shortlist` | Shortlist applicant |
| PUT | `/api/applicants/:id/status` | Update applicant status |
| GET | `/api/applicants/count` | Applicant count statistics |

### Offer Letters

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/offers` | Generate offer letter (PDF) |
| GET | `/api/offers/:id` | Get offer letter |
| POST | `/api/offers/:id/send` | Send offer to applicant |
| PUT | `/api/offers/:id` | Update offer details |

### Interviews

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/interviews` | List scheduled interviews |
| POST | `/api/interviews` | Schedule interview (costs 5 credits) |
| PUT | `/api/interviews/:id` | Update interview |
| DELETE | `/api/interviews/:id` | Cancel interview |
| POST | `/api/interviews/:id/complete` | Mark interview complete |
| POST | `/api/interviews/ai-questions` | Generate AI questions |

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/performance` | Hiring performance metrics |
| GET | `/api/analytics/sources` | Application source breakdown |
| GET | `/api/analytics/conversion` | Conversion funnel data |
| GET | `/api/analytics/credit-usage` | Credit usage over time |

### Super Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/super-admin/stats` | Platform statistics |
| GET | `/api/super-admin/users` | List all users |
| GET | `/api/super-admin/companies` | List all organizations |
| POST | `/api/super-admin/subscription-plans` | Create subscription plan |
| PUT | `/api/super-admin/subscription-plans/:id` | Update plan |
| DELETE | `/api/super-admin/subscription-plans/:id` | Delete plan |
| POST | `/api/super-admin/credit-packages` | Create credit package |
| PUT | `/api/super-admin/credit-packages/:id` | Update credit pack |
| GET | `/api/super-admin/tutorial-slides` | List tutorial slides |
| POST | `/api/super-admin/tutorial-slides` | Create tutorial slide |
| PUT | `/api/super-admin/tutorial-slides/:id` | Update slide |
| DELETE | `/api/super-admin/tutorial-slides/:id` | Delete slide |

---

## External Integrations

### 1. Stripe (Payment Processing)

**Critical Integration** - Handles all subscription billing

**Usage:**
- Subscription checkout
- Credit card processing
- Recurring billing management
- Webhook notifications for payment events
- Credit pack purchases

**Setup:**
1. Create Stripe account
2. Get API keys (test & production)
3. Set up webhook endpoint
4. Configure products and prices in Stripe

**Webhook Events:**
- `invoice.paid` - Activate/renew subscription
- `invoice.payment_failed` - Handle failed payment
- `customer.subscription.deleted` - Cancel subscription
- `customer.subscription.updated` - Update subscription

**Local Development:**
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:5000/api/payments/webhook

# Copy webhook secret to .env
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

**Configuration:**
```bash
STRIPE_SECRET_KEY=sk_test_xxx  # or sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx  # or pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

**Implementation:** `server/stripeService.ts`

### 2. OpenAI API

**Usage:**
- Resume parsing and data extraction
- Job description generation
- Candidate scoring and matching
- Interview question generation
- Offer letter content generation
- RAG-based resume search

**Models Used:**
- `gpt-4` - Complex reasoning, scoring
- `gpt-3.5-turbo` - Simple tasks, faster responses
- `text-embedding-ada-002` - Resume embeddings (RAG)

**Configuration:**
```bash
OPENAI_API_KEY=sk-xxx
```

**Cost Monitoring:**
- Track usage per organization
- Store in `credit_transactions` metadata
- Alert on high usage

**Implementation:** `server/openai.ts`

### 3. Twilio (Voice Interviews)

**Usage:**
- AI-powered phone interviews
- Call routing and recording
- Voice transcription
- Automated candidate screening

**Configuration:**
```bash
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1xxx
```

**Implementation:** `server/routes/twilioVoice.routes.ts`

### 4. SendGrid (Email Service)

**Usage:**
- Team member invitations
- Interview reminders
- Offer letter delivery
- Subscription notifications
- Credit expiry warnings
- Password reset emails

**Email Templates:**
- Team invitation with accept link
- Interview reminder (1 day before)
- Offer letter attached
- Credit expiry warning (7 days before)

**Configuration:**
```bash
SENDGRID_API_KEY=SG.xxx
SENDGRID_FROM_EMAIL=noreply@hiringintelligence.com
```

**Implementation:** `server/emailService.ts`

### 5. Google OAuth 2.0

**Usage:**
- Social login for users
- Quick account creation

**Configuration:**
```bash
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
```

**Implementation:** `server/auth.ts`

---

## Background Jobs

### BullMQ Worker System

**Worker File:** `server/worker.ts`

**Running the Worker:**
```bash
# Development
npm run worker:dev

# Production
npm run worker
```

**Important:** Worker must run separately from main server!

### Job Queues

**1. Resume Processing Queue**

**Queue:** `resumeProcessingQueue`

**Job:** `processResume`

**Process:**
1. Read uploaded resume file (PDF/DOCX)
2. Extract text content
3. Send to OpenAI for parsing
4. Store structured data in `resume_profiles`
5. Deduct 2 credits from organization
6. Update job status

**Job Data:**
```typescript
{
  resumeId: number,
  organizationId: number,
  filePath: string
}
```

**2. Interview Reminder Queue**

**Queue:** `interviewReminderQueue`

**Job:** `sendInterviewReminder`

**Process:**
1. Fetch interview details
2. Generate reminder email
3. Send via SendGrid
4. Mark reminder as sent

**Schedule:** 24 hours before interview

**3. Credit Expiry Queue**

**Queue:** `creditExpiryQueue`

**Job:** `processExpiringCredits`

**Process:**
1. Find credits expiring in next 7 days
2. Send warning email to organization
3. On expiry date, mark credits as expired
4. Create expiration transaction record

**Schedule:** Daily cron

**4. RAG Indexing Queue**

**Queue:** `ragIndexQueue`

**Job:** `indexResume`

**Process:**
1. Generate resume text embedding (OpenAI)
2. Store vector in database for similarity search
3. Update search index

### BullMQ Dashboard

**Access:** `http://localhost:5000/admin/queues`

**Features:**
- View all queues
- Monitor job status
- Retry failed jobs
- View job logs
- See queue statistics

**Setup:**
```typescript
// server/index.ts
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

const serverAdapter = new ExpressAdapter();
createBullBoard({
  queues: [
    new BullMQAdapter(resumeProcessingQueue),
    new BullMQAdapter(interviewReminderQueue),
    new BullMQAdapter(creditExpiryQueue)
  ],
  serverAdapter
});
serverAdapter.setBasePath('/admin/queues');
app.use('/admin/queues', serverAdapter.getRouter());
```

---

## Setup & Configuration

### Prerequisites

- Node.js 20+ (LTS)
- PostgreSQL (local or Neon account)
- Redis server (for BullMQ)
- Stripe account
- OpenAI API account
- Twilio account (optional, for voice interviews)
- SendGrid account (optional)

### Installation Steps

**1. Clone and Install:**
```bash
cd /var/www/plato/HiringIntelligence
npm install
```

**2. Environment Variables:**

Create `.env` file:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/hiring_intelligence
# OR for Neon:
# DATABASE_URL=postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/hiring_intelligence?sslmode=require

# Server
PORT=5000
NODE_ENV=development

# OpenAI
OPENAI_API_KEY=sk-xxx

# Stripe (REQUIRED)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Redis (REQUIRED for BullMQ)
REDIS_URL=redis://localhost:6379

# Session
SESSION_SECRET=your-secret-key-change-in-production

# SendGrid (optional but recommended)
SENDGRID_API_KEY=SG.xxx
SENDGRID_FROM_EMAIL=noreply@hiringintelligence.com

# Twilio (optional)
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1xxx

# Google OAuth (optional)
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
```

**3. Database Setup:**
```bash
# Push schema to database
npm run db:push

# Verify
npm run check
```

**4. Stripe Setup:**
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Listen for webhooks
stripe listen --forward-to localhost:5000/api/payments/webhook

# Copy the webhook secret (whsec_xxx) to .env
```

**5. Redis Setup:**
```bash
# Install (macOS)
brew install redis
brew services start redis

# Verify
redis-cli ping
# Should return: PONG
```

**6. Initialize Subscription Plans:**

Plans are auto-created on first server start. Verify:
```bash
npm run dev
# Check console for "Subscription plans initialized"
```

Or manually create via Super Admin panel.

**7. Start Development Server:**

**Terminal 1 (Main Server):**
```bash
npm run dev
```

**Terminal 2 (Background Worker):**
```bash
npm run worker:dev
```

Server: `http://localhost:5000`
BullMQ Dashboard: `http://localhost:5000/admin/queues`

**8. Create Super Admin:**

Manually update database:
```sql
UPDATE users SET "isSuperAdmin" = true WHERE email = 'admin@example.com';
```

**9. Test Subscription Flow:**
1. Register new account
2. Visit subscription page
3. Select plan
4. Use Stripe test card: `4242 4242 4242 4242`
5. Verify credits allocated

### Production Deployment

**Build:**
```bash
npm run build
```

**Start:**
```bash
# Start server
npm run start

# Start worker (separate process)
npm run worker
```

**Production Checklist:**
- [ ] Use production database (Neon recommended)
- [ ] Set `NODE_ENV=production`
- [ ] Use production Stripe keys
- [ ] Set strong `SESSION_SECRET`
- [ ] Use managed Redis (AWS ElastiCache, Redis Cloud)
- [ ] Configure Stripe webhook on production domain
- [ ] Set up HTTPS (required for Stripe)
- [ ] Configure proper CORS origins
- [ ] Set up error tracking (Sentry)
- [ ] Configure log aggregation
- [ ] Set up database backups
- [ ] Monitor credit usage and costs
- [ ] Set up worker process manager (PM2, systemd)
- [ ] Configure rate limiting
- [ ] Set up uptime monitoring

---

## Development Workflow

### Running the App

**Development mode:**
```bash
# Terminal 1 - Main server
npm run dev

# Terminal 2 - Background worker
npm run worker:dev
```

**Type checking:**
```bash
npm run check
```

**Build:**
```bash
npm run build
```

### Database Migrations

**Push schema:**
```bash
npm run db:push
```

**Edit schema:**
1. Modify `shared/schema.ts`
2. Run `npm run db:push`
3. Verify in database

### Testing Subscription System

**Test Cards (Stripe):**
- Success: `4242 4242 4242 4242`
- Requires authentication: `4000 0025 0000 3155`
- Declined: `4000 0000 0000 9995`

**Test Flow:**
1. Register account
2. Go to `/hiring/subscription`
3. Click "Subscribe" on a plan
4. Stripe checkout opens
5. Use test card
6. Verify redirect to success page
7. Check credits: `GET /api/organizations/current/credits`

**Simulate Webhook:**
```bash
stripe trigger invoice.paid
```

### Adding New Features

**Example: Add new credit action**

**1. Add to credit pricing:**
```sql
INSERT INTO credit_pricing (action, credit_cost, description, is_active)
VALUES ('new_action', 3, 'New feature action', true);
```

**2. Use in code:**
```typescript
// In route handler
const hasCredits = await creditService.hasEnoughCredits(
  organizationId,
  3 // cost
);

if (!hasCredits) {
  return res.status(402).json({ error: 'Insufficient credits' });
}

// Perform action
await performNewAction();

// Deduct credits
await creditService.deductCredits({
  organizationId,
  amount: 3,
  action: 'new_action',
  metadata: { /* context */ }
});
```

### Debugging

**Check Subscription Status:**
```typescript
// In browser console or API test
fetch('/api/subscriptions/current')
  .then(r => r.json())
  .then(console.log);
```

**Check Credit Balance:**
```typescript
fetch('/api/organizations/current/credits')
  .then(r => r.json())
  .then(console.log);
```

**View BullMQ Jobs:**
- Visit: `http://localhost:5000/admin/queues`
- Check failed jobs tab
- View job details and errors

**Redis Debugging:**
```bash
redis-cli
> KEYS bull:*
> HGETALL bull:resumeProcessingQueue:job:1
```

---

## Important Files Reference

### Entry Points

| File | Purpose |
|------|---------|
| `/server/index.ts` | Main server entry |
| `/server/worker.ts` | Background worker entry |
| `/client/src/main.tsx` | Frontend entry |
| `/client/src/App.tsx` | React app root |

### Core Backend Files

| File | Size | Purpose |
|------|------|---------|
| `/server/routes.ts` | 296KB | **Main API routes** |
| `/server/stripeService.ts` | - | **Stripe integration** |
| `/server/subscriptionService.ts` | - | **Subscription logic** |
| `/server/creditService.ts` | - | **Credit management** |
| `/server/resumeProcessingService.ts` | - | Resume AI processing |
| `/server/openai.ts` | - | OpenAI integration |
| `/server/emailService.ts` | - | SendGrid emails |
| `/server/auth.ts` | - | Authentication |
| `/server/storage.ts` | - | Data access layer |

### Routes

| File | Purpose |
|------|---------|
| `/server/routes/superAdmin.ts` | Super admin API |
| `/server/routes/twilioVoice.routes.ts` | Twilio voice API |
| `/server/routes/tutorial.routes.ts` | Tutorial slides |

### Database

| File | Lines | Purpose |
|------|-------|---------|
| `/shared/schema.ts` | 1237 | **Complete database schema** |

### Configuration

| File | Purpose |
|------|---------|
| `/package.json` | Dependencies & scripts |
| `/tsconfig.json` | TypeScript config |
| `/vite.config.ts` | Vite build config |
| `/.env` | Environment variables |

### Documentation

| File | Purpose |
|------|---------|
| `/SUBSCRIPTION_SYSTEM.md` | **Subscription system documentation** |
| `/QUICK_START.md` | Quick setup guide |
| `/IMPLEMENTATION_SUMMARY.md` | Implementation notes |

### Frontend Pages (Key Examples)

| File | Purpose |
|------|---------|
| `/client/src/pages/hiring/Dashboard.tsx` | Main dashboard |
| `/client/src/pages/hiring/Subscription.tsx` | **Subscription management** |
| `/client/src/pages/hiring/JobPostings.tsx` | Job management |
| `/client/src/pages/hiring/Applicants.tsx` | Applicant pipeline |
| `/client/src/pages/hiring/ResumeDatabase.tsx` | Resume search |
| `/client/src/pages/hiring/Analytics.tsx` | Analytics dashboard |
| `/client/src/pages/super-admin/*` | Super admin panel |

---

## Common Issues & Troubleshooting

### Stripe Issues

**Problem:** Webhook verification failed

**Solution:**
- Check `STRIPE_WEBHOOK_SECRET` matches Stripe CLI output
- Ensure webhook endpoint uses raw body: `express.raw({type: 'application/json'})`
- Verify signature header is present

**Problem:** Checkout session not creating

**Solution:**
- Check Stripe API keys are correct
- Verify internet connection
- Check Stripe dashboard for errors
- Ensure prices are created in Stripe

### Credit System Issues

**Problem:** Credits not allocated after payment

**Solution:**
- Check webhook handler processed `invoice.paid` event
- Verify subscription created in database
- Check `credit_transactions` table for allocation record
- Review worker logs for errors

**Problem:** Credit deduction failing

**Solution:**
- Check organization has enough credits
- Verify `credit_pricing` table has action defined
- Check for database errors in console

### Worker Issues

**Problem:** Jobs stuck in queue

**Solution:**
- Check worker is running: `npm run worker:dev`
- Verify Redis connection
- Check worker logs for errors
- Visit BullMQ dashboard: `/admin/queues`
- Retry failed jobs from dashboard

**Problem:** Resume processing fails

**Solution:**
- Check OpenAI API key
- Verify file exists at path
- Check file format (PDF/DOCX supported)
- Review error in failed job details

### Subscription Issues

**Problem:** User can't subscribe

**Solution:**
- Check job posting limit not exceeded
- Verify Stripe checkout session creation
- Check console for errors
- Verify plan exists and is active

**Problem:** Credits expiring unexpectedly

**Solution:**
- Check `credit_expirations` table
- Verify 45-day expiry calculation
- Review credit allocation timestamps
- Check for manual credit adjustments

---

## Next Steps for New Developer

1. **Environment Setup:**
   - [ ] Install all prerequisites
   - [ ] Configure `.env` file with all keys
   - [ ] Set up Stripe CLI and webhooks
   - [ ] Run database migrations
   - [ ] Start server and worker

2. **Understand Subscription System:**
   - [ ] Read `/SUBSCRIPTION_SYSTEM.md` thoroughly
   - [ ] Review `server/subscriptionService.ts`
   - [ ] Review `server/creditService.ts`
   - [ ] Test subscription flow end-to-end
   - [ ] Understand credit expiry mechanism

3. **Code Familiarization:**
   - [ ] Read `shared/schema.ts` for data model
   - [ ] Review `server/routes.ts` for API endpoints
   - [ ] Explore subscription-related tables
   - [ ] Check `server/stripeService.ts` for payment logic
   - [ ] Review super admin routes

4. **Test Core Features:**
   - [ ] Create test organization
   - [ ] Subscribe to plan
   - [ ] Upload and process resumes
   - [ ] Create job posting
   - [ ] Score applicants
   - [ ] Schedule interview
   - [ ] Check credit deductions
   - [ ] View analytics

5. **Stripe Integration:**
   - [ ] Set up Stripe test account
   - [ ] Create test products/prices
   - [ ] Test checkout flow
   - [ ] Test webhook events
   - [ ] Verify subscription creation

6. **Monitoring:**
   - [ ] Set up error tracking
   - [ ] Configure BullMQ dashboard
   - [ ] Monitor credit usage
   - [ ] Track OpenAI costs
   - [ ] Set up log aggregation

---

## Support & Resources

**Official Documentation:**
- Stripe: https://stripe.com/docs
- BullMQ: https://docs.bullmq.io/
- Drizzle ORM: https://orm.drizzle.team/
- OpenAI API: https://platform.openai.com/docs/

**Project Documentation:**
- Subscription System: `/var/www/plato/HiringIntelligence/SUBSCRIPTION_SYSTEM.md`
- Database Schema: `/var/www/plato/HiringIntelligence/shared/schema.ts`
- API Routes: `/var/www/plato/HiringIntelligence/server/routes.ts`

**Key Endpoints to Test:**
- Health: `GET /api/health`
- Current User: `GET /api/auth/user`
- Subscription: `GET /api/subscriptions/current`
- Credits: `GET /api/organizations/current/credits`
- BullMQ Dashboard: `http://localhost:5000/admin/queues`

---

**Document Version:** 1.0
**Last Updated:** 2025-12-23
**Codebase Location:** `/var/www/plato/HiringIntelligence/`