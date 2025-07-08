# Employer Hiring Platform

## Overview

This is a standalone employer-facing web application designed to make hiring more efficient, smarter, and faster. The platform uses AI to assess candidates through interviews and generate detailed user profiles that are matched to job postings with ratings. This is the employer side of a two-platform system.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query for server state
- **Routing**: Wouter for client-side routing
- **Animations**: Framer Motion for interactive animations
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth with OpenID Connect
- **Session Management**: PostgreSQL session store
- **Build Tool**: Vite for development, ESBuild for production

### UI/UX Design Principles
- **Modal-based workflow**: All features open in modals/popouts to prevent navigation away from dashboard
- **3D interactive design**: Rich visual elements with scroll-activated animations
- **Real-time updates**: Live components that refresh specific data without page reload
- **Responsive design**: Mobile-first approach with adaptive layouts

## Key Components

### Authentication System
- **Provider**: Replit Auth with OpenID Connect integration
- **Session Storage**: PostgreSQL-backed sessions with 7-day TTL
- **Authorization**: Route-level protection for authenticated endpoints
- **User Management**: Automatic user creation and role assignment

### Job Management
- **AI-Powered Job Creation**: OpenAI integration for generating job descriptions and requirements
- **Dynamic Skill Extraction**: AI-based technical skills extraction from job descriptions
- **Job Lifecycle**: Create, edit, delete, and view job postings
- **Analytics**: Job performance tracking and metrics

### Candidate Matching
- **Airtable Integration**: Direct connection to external candidate database via Airtable API
- **AI Matching Engine**: OpenAI GPT-4o powered candidate-to-job matching with 1-100 rating system
- **Real-time Analysis**: Live AI analysis of candidate profiles against job requirements
- **Match Reasoning**: Detailed explanations for match scores and skill gap analysis
- **Comprehensive Profiles**: Interview scores, salary expectations, and experience data from Airtable
- **Cross-platform Integration**: Seamless linking between employer and candidate platforms

### Organization Management
- **Company Setup**: Organization creation and management
- **Team Management**: Member invitation and role management
- **Settings**: Company-wide configuration and preferences

## Data Flow

### Job Posting Flow
1. Employer creates job posting through modal interface
2. AI generates description/requirements if requested
3. System extracts technical skills using OpenAI
4. Job is stored in database with all metadata
5. Real-time updates refresh job counts across dashboard

### Candidate Matching Flow
1. System analyzes existing candidates against job requirements
2. AI generates match scores and reasoning
3. Matches are stored with scores and explanations
4. Employers can view ranked candidates with detailed insights
5. Communication and interview scheduling through platform

### Dashboard Updates
1. Live components poll specific endpoints every 200ms
2. Data is cached and updated without full page refresh
3. Real-time job counts, organization info, and match data
4. Error handling redirects to authentication on 401 errors

## External Dependencies

### AI Services
- **OpenAI GPT-4o**: Job description generation, requirements creation, technical skill extraction, candidate matching
- **Model**: Latest GPT-4o model for optimal performance
- **Rate Limiting**: Proper error handling for API limits

### Database Services
- **Neon PostgreSQL**: Serverless PostgreSQL database
- **Connection**: WebSocket-based connection with connection pooling
- **Schema Management**: Drizzle migrations for database evolution

### Authentication
- **Replit Auth**: Integrated authentication system
- **OIDC**: OpenID Connect for secure authentication flow
- **Session Management**: Secure session handling with proper expiration

### UI Components
- **Radix UI**: Accessible component primitives
- **shadcn/ui**: Pre-styled component library
- **Lucide Icons**: Comprehensive icon library
- **Framer Motion**: Animation and interaction library

## Deployment Strategy

### Development Environment
- **Vite Dev Server**: Hot module replacement and fast builds
- **TSX Runtime**: Direct TypeScript execution for server
- **Development Logging**: Comprehensive request/response logging
- **Error Overlay**: Runtime error display in development

### Production Build
- **Frontend**: Vite build process with asset optimization
- **Backend**: ESBuild bundling for Node.js deployment
- **Static Assets**: Optimized and minified for production
- **Environment Variables**: Secure configuration management

### Database Management
- **Migrations**: Drizzle Kit for schema management
- **Connection Pooling**: Neon serverless with auto-scaling
- **Session Storage**: PostgreSQL tables for session persistence
- **Data Validation**: Zod schemas for type-safe data handling

## Changelog

```
Changelog:
- June 30, 2025. Initial setup
- June 30, 2025. Added organization setup flow for new users
- June 30, 2025. Implemented dynamic organization name display on dashboard
- June 30, 2025. Enhanced job posting modal with modern UI, location field, salary range dropdown, and dynamic skills selection
- June 30, 2025. Fixed technical skills dropdown to show AI-suggested skills based on job title/description
- June 30, 2025. Fixed AI job description generation to use actual location from location field instead of placeholder text
- June 30, 2025. Fixed job editing modal to properly populate all fields with existing job data
- June 30, 2025. Fixed salary display in active job postings to show selected salary range instead of "not specified"
- July 02, 2025. Integrated Airtable API for candidate data sourcing with comprehensive AI-powered matching
- July 02, 2025. Enhanced candidate matching system with real-time AI analysis using OpenAI GPT-4o
- July 02, 2025. Updated candidate display to show Airtable profile data, interview scores, and match reasoning
- July 05, 2025. Redesigned candidates modal with horizontal stacked layout for better UX
- July 05, 2025. Enhanced AI matching to use specific numerical ratings (avoid round numbers like 70, 80, 90)
- July 05, 2025. Added detailed profile view modal with complete candidate information and full AI analysis
- July 05, 2025. Implemented short AI analysis preview in candidate cards with "View Profile" for full details
- July 05, 2025. Added comprehensive candidate application management with accept/decline functionality and interview scheduling
- July 05, 2025. Implemented auto-refresh system that monitors Airtable database every minute for new candidates with visual indicators
- July 05, 2025. Fixed Airtable bidirectional integration - when employers accept candidates, job details are written to "Job Title" and "Job Description" fields
- July 05, 2025. Added instant visual feedback for accept/decline actions with optimistic updates and loading states
- July 05, 2025. Updated Airtable integration to use new "platojobmatches" table - creates job match records instead of updating candidate profiles
- July 05, 2025. Enhanced job match records to include company name field - now populates all 5 fields (Name, User ID, Job title, Job Description, Company name)
- July 08, 2025. Added email field support from Airtable "platouserprofiles" table - email addresses now displayed in interview scheduling modal and detailed profile view for easier candidate contact
- July 08, 2025. Integrated "platojobpostings" Airtable table (Base ID: appCjIvd73lvp0oLf) with automatic bidirectional sync - all job postings now automatically sync to Airtable every minute with full job details including title, company, location, description, requirements, salary, skills, and posting date
- July 08, 2025. Added Job ID field to all Airtable tables for consistent tracking across platojobpostings, platojobmatches, and platojobapplications tables
- July 08, 2025. Implemented "platojobapplications" table integration (Base ID: appEYs1fTytFXoJ7x) with separate applicants modal for direct job applications, complete with accept/decline workflow and interview scheduling
- July 08, 2025. Enhanced job deletion to cascade across all Airtable tables - when employers delete jobs, corresponding records are automatically removed from platojobpostings, platojobmatches, and platojobapplications tables
- July 08, 2025. Successfully resolved job posting sync to "platojobpostings" Airtable table - fixed field mapping to match exact Airtable field names (Job title, Job ID, Job description, Date Posted, Company, Job type, Salary, Location) and confirmed 2 job postings synced successfully
- July 08, 2025. Cleaned up unwanted test job postings from database and Airtable - removed "Psychologist" and "Business Analyst" test entries, keeping only employer-created jobs
- July 08, 2025. Updated sync frequency from 60 seconds to 15 seconds for faster real-time updates between platform and Airtable tables
- July 08, 2025. Fixed database field reference issue (isActive vs is_active) for proper job querying and sync functionality
- July 08, 2025. Successfully implemented complete auto-sync and auto-fill workflow - job postings now automatically sync to "platojobpostings" table and trigger AI-powered auto-fill of "platojobapplications" table when employers create new jobs
- July 08, 2025. Resolved all Drizzle ORM field mapping issues and SQL syntax errors - system now properly detects active jobs and syncs them to Airtable with 15-second real-time updates
- July 08, 2025. Added "View Profile" button to ApplicantsModal with comprehensive AI-powered profile analysis featuring 1-100 scoring system, detailed candidate assessment, key strengths identification, and development areas analysis using OpenAI GPT-4o
- July 08, 2025. Implemented modern company logo carousel on landing page with persuasive messaging about successful client adoption - features smooth 3D transitions, auto-cycling every 3 seconds, clickable indicators, and success metrics display with 95% hiring success rate, 60% time reduction, and 98% client satisfaction
- July 08, 2025. Expanded company logo carousel to include 11 total client logos (added Monument, Skillcreds, Jaugmentor, and AiCanSell) strengthening the persuasive messaging about diverse successful partnerships across different industries
- July 08, 2025. Massively expanded company logo carousel to showcase 21 total client logos with additional variations of existing companies - creates highly persuasive visual impact demonstrating widespread adoption across diverse industries and company sizes
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```