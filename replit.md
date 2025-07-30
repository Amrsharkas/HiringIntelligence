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
- **Authentication**: Firebase Authentication with JWT tokens
- **Session Management**: Firebase token-based authentication
- **Build Tool**: Vite for development, ESBuild for production

### UI/UX Design Principles
- **Modal-based workflow**: All features open in modals/popouts to prevent navigation away from dashboard
- **3D interactive design**: Rich visual elements with scroll-activated animations
- **Real-time updates**: Live components that refresh specific data without page reload
- **Responsive design**: Mobile-first approach with adaptive layouts

## Key Components

### Authentication System
- **Provider**: Firebase Authentication with email/password and Google Sign-In
- **Token Management**: JWT token-based authentication with Firebase Admin SDK
- **Authorization**: Route-level protection using Firebase token verification
- **User Management**: Automatic user creation in Firestore and PostgreSQL
- **Multi-provider Support**: Email/password authentication and Google OAuth

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
- **Team Management**: Email-based member invitation system with role-based access control
- **Invitation System**: Professional email invitations with SendGrid integration and secure token-based acceptance
- **Role Management**: Organization owners and admins can invite members with different permission levels
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
- **Firebase Auth**: Complete authentication system with multiple providers
- **JWT Tokens**: Secure token-based authentication flow
- **Session Management**: Firebase-managed authentication state with automatic token refresh

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
- July 08, 2025. Redesigned carousel with podium-style layout featuring center focus logo (largest), left/right preview logos (smaller and blurred), slower 5-second transitions, larger overall size, and full-screen width design matching modern industry standards
- July 08, 2025. Repositioned carousel below the 3 success stats section (95% hiring success, 60% time reduction, 98% client satisfaction) for improved page flow and visual hierarchy
- July 16, 2025. Added comprehensive testing and cleanup capabilities - created automated cleanup scripts that clear all candidate data (platouserprofiles, platojobmatches, platojobapplications tables) while preserving job postings for fresh system testing. Includes verification script to confirm cleanup success.
- July 16, 2025. Fixed database filtering issues for job deletion and active job retrieval - resolved SQL syntax errors with is_active field references and ensured proper job lifecycle management.
- July 16, 2025. Enhanced Airtable job description sync to include complete information - all job postings now automatically sync with comprehensive descriptions including requirements, technical skills, essential skills, and qualifications to "platojobpostings" table.
- July 16, 2025. Implemented automatic bidirectional job deletion system - when employers delete jobs from dashboard, records are automatically removed from "platojobpostings" table and all related Airtable tables (platojobmatches, platojobapplications) with comprehensive error handling and logging.
- July 16, 2025. Added automatic cleanup system to periodic sync that removes inactive job records from Airtable when they're no longer active in the database, ensuring data consistency between platform and external storage.
- July 19, 2025. Implemented status-based applicant management - accept/decline actions now update Status field ("Accepted"/"Denied") in platojobapplications table instead of deleting records, preserving data integrity and maintaining complete application history.
- July 19, 2025. Fixed User ID mapping in job match creation - system now correctly retrieves and uses exact User ID from platojobapplications table when creating records in platojobmatches table, ensuring accurate candidate-to-job matching and proper interview scheduling functionality.
- July 19, 2025. Enhanced applicant filtering to only display pending applicants in UI - accepted/denied applicants are filtered out from main applicant lists while preserving records in Airtable for data tracking and analysis purposes.
- July 19, 2025. Updated job match creation to include Job ID field - both JobMatchesAirtableService and AirtableService now include Job ID field when creating records in platojobmatches table, ensuring complete job tracking across all Airtable tables.
- July 19, 2025. Implemented comprehensive timezone support for interview scheduling - added timezone field to realInterviews database schema, 15-timezone dropdown in interview forms, timezone display in interview cards, and bidirectional Airtable sync with timezone information in "Date at Time (Timezone)" format.
- July 19, 2025. Fixed interview management API bugs - resolved missing database imports in both interview deletion and update routes, ensuring proper CRUD operations for interview records with complete error handling.
- July 19, 2025. Enhanced job posting system with AI-powered employer questions generation - added OpenAI GPT-4o endpoint (/api/ai/generate-employer-questions) that creates 3-5 thoughtful, role-specific interview questions based on job title, description, and requirements with intelligent fallback questions for different industries.
- July 19, 2025. Updated job posting modal with multi-step interface featuring "AI Generate Questions" button - employers can now automatically generate relevant questions or manually add up to 5 custom questions for candidate applications.
- July 19, 2025. Enhanced Airtable "platojobpostings" table integration (Base ID: appCjIvd73lvp0oLf) - updated sync system to include "Employer Questions" field with auto-sync every 30 seconds, ensuring all job postings sync with complete information including generated questions formatted as numbered list.
- July 19, 2025. Fixed interview count display with accurate real-time updates - replaced team member count with proper LiveInterviewsCount component that shows actual scheduled interviews and auto-refreshes every 30 seconds using /api/interviews/count endpoint.
- July 19, 2025. Implemented instant Airtable sync for all job operations - when employers create new jobs or press "update job" button, changes are immediately synced to "platojobpostings" table including all job details and employer questions, providing real-time updates without waiting for periodic sync.
- July 19, 2025. Fixed Drizzle ORM sync query issues - resolved database field selection errors in periodic sync function to ensure proper job data retrieval and synchronization with Airtable tables.
- July 21, 2025. Removed MessagingModal component completely from application per user request - eliminated all candidate messaging functionality and replaced with real-time Recent Activity system.
- July 21, 2025. Created comprehensive RecentActivityModal with live dashboard statistics - features real-time job counts, interview counts, candidate matches, and application stats with 5-second refresh intervals and detailed activity timeline.
- July 21, 2025. Enhanced bottom dashboard Recent Activity section with live data integration - replaced static activity items with real-time generated activities based on actual platform statistics, refreshing every 5 seconds.
- July 21, 2025. Implemented comprehensive team invitation system - created invitation database schema, email service with SendGrid, invitation API endpoints (invite/accept/get), enhanced Team Management modal with invitation form, role-based access control where organization owners can invite members, and invitation acceptance page with professional UI for seamless team onboarding.
- July 24, 2025. Updated email service to use raef@platohiring.com as verified sender for team invitations - SendGrid integration confirmed working with 202 Accepted response, professional HTML email templates ready for production use.
- July 24, 2025. Implemented comprehensive enhanced team invitation system with embedded identifiers - created team-specific invitation URLs with organization and role parameters, added automatic team access granting through /auth/signup and /auth/signin routes, enhanced invitation emails with multiple access options (direct acceptance, signup with auto-join, signin with auto-join), and integrated post-authentication processing for seamless team joining experience. System now supports complete workflow from invitation email to automatic team membership without manual acceptance steps.
- July 24, 2025. Fixed team invitation flow to handle unauthenticated users properly - updated AcceptInvitation page to show different options based on authentication status (sign in/sign up buttons for non-authenticated users, direct accept for authenticated users), added public invitation lookup endpoint that works without authentication, enhanced invitation URLs to automatically redirect users through authentication flow with embedded team parameters for seamless team joining after login/signup.
- July 24, 2025. Completed comprehensive team invitation system with full authentication flow - enhanced Replit Auth callback to handle post-login redirects preserving invitation URLs, implemented robust invitation acceptance with duplicate member checks and proper error handling, added database schema support for team member tracking with joinedAt timestamps, created seamless invitation workflow where unauthenticated users are redirected through login and automatically returned to accept invitation with automatic team joining upon authentication success.
- July 24, 2025. Implemented role-based member removal system - added permission-controlled member removal where admins can remove regular members and only organization owners can remove admins, created secure API endpoints with proper authorization checks, enhanced TeamManagementModal with remove member buttons and confirmation dialogs, added database methods for team member deletion and role updates, implemented comprehensive permission validation preventing unauthorized removals and self-removal attempts.
- July 24, 2025. Fixed complete invitation acceptance flow - completely rewrote AcceptInvitation component to properly handle authentication states, URL parameter parsing, localStorage-based invitation preservation during login/signup flow, automatic invitation processing post-authentication, clear error states, and seamless redirect flow that prevents loading state issues and properly handles unauthenticated users with automatic team joining after successful authentication.
- July 24, 2025. Fixed email routing issue for invite code system - updated App.tsx routing logic to ensure authenticated users without organizations are directed to home page (EmployerDashboard with invite code modal) instead of organization setup page, ensuring email links correctly route to home page only as requested. Email template already correctly uses baseUrl + "/" for home page routing.
- July 24, 2025. Updated email button to route to production domain - changed "Join the Team" button link from development Replit URL to "https://platohiring.com" to resolve infinite loading issues and provide stable landing page for invite code workflow.
- July 24, 2025. Implemented comprehensive dual authentication system for enhanced security - updated all database schemas to use varchar organization IDs instead of integers, modified organization setup form to require both organization ID (UUID format) and 6-character invite code, enhanced backend accept-code endpoint to validate both parameters with organization ID matching, updated email templates to include both credentials, and fixed all TypeScript compilation errors. System now provides maximum security by requiring both unique organization identifier and invite code for team joining, preventing unauthorized access through invite code guessing or organization ID enumeration.
- July 24, 2025. Fixed critical routing issue for unauthenticated users - updated App.tsx to ensure all unauthenticated users are directed to landing page regardless of URL, preventing organization setup page errors when users click invitation links without being logged in first.
- July 24, 2025. RESOLVED persistent frontend API error - fixed "Failed to execute 'fetch' on 'Window': '/api/invitations/accept-code' is not a valid HTTP method" by enhancing apiRequest function with robust parameter validation, ensuring method and URL parameters are properly typed and formatted. Added comprehensive logging for debugging API requests and responses. System now handles all invitation acceptance scenarios correctly with proper error handling and automatic dashboard redirects.
- July 24, 2025. COMPLETED MAGIC LINK INVITATION SYSTEM - Fully replaced broken invite code system with streamlined magic link workflow. Created InviteAccept.tsx page for token-based invitation acceptance, implemented sendMagicLinkInvitationEmail function with professional HTML templates, added /api/invitations/accept endpoint for magic link processing, updated App.tsx routing for /invite/accept path, and integrated complete authentication flow with automatic team joining. Magic links use format https://platohiring.com/invite/accept?token=... for seamless one-click team joining experience.
- July 24, 2025. Updated email sender branding from "Raef" to "Plato" - Modified sendMagicLinkInvitationEmail and sendInviteCodeEmail functions to display "Plato" as the sender name in all team invitation emails while maintaining the verified raef@platohiring.com sender address for deliverability.
- July 24, 2025. REMOVED TEAM MANAGEMENT FUNCTIONALITY - Completely removed TeamManagementModal component and all team invitation features per user request due to non-functional magic links and persistent email sender issues. Cleaned up employer dashboard to remove all team management UI elements and replaced team management card with Recent Activity card. System now focuses solely on job posting, candidate management, and interview scheduling without team collaboration features.
- July 30, 2025. MAJOR ARCHITECTURE CHANGE: COMPLETE FIREBASE AUTHENTICATION MIGRATION - Completely removed Replit Auth system and replaced with Firebase Authentication. Implemented comprehensive Firebase setup with email/password and Google Sign-In support. Created Firebase client configuration, admin SDK setup, and new useFirebaseAuth hook. Updated all frontend components to use Firebase authentication flow. Modified backend routes to use Firebase token verification middleware. Added modern authentication UI with AuthForm component featuring tabbed sign-in/sign-up interface. System now uses Firebase project "plato-244d4" with proper authorized domains configuration for both development and production environments.
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```