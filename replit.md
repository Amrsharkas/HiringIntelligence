# Employer Hiring Platform

## Overview
This project is an employer-facing web application designed to streamline and enhance the hiring process. It leverages AI to assess candidates, generate detailed profiles, and match them efficiently to job postings. It serves as the employer-side component of a larger two-platform system, aiming to make hiring smarter and faster.

## User Preferences
Preferred communication style: Simple, everyday language.

## Public Launch Status
**READY FOR PUBLIC LAUNCH** - Database completely cleared on August 18, 2025
- All user data, organizations, jobs, interviews, and applicants removed
- Platform prepared for fresh public deployment with clean database
- SendGrid email integration fully operational for new users

## System Architecture

### Frontend
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui
- **State Management**: TanStack Query
- **Routing**: Wouter
- **Animations**: Framer Motion
- **Form Handling**: React Hook Form with Zod

### Backend
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth with OpenID Connect
- **Session Management**: PostgreSQL session store
- **Build Tool**: Vite (development), ESBuild (production)

### UI/UX Design Principles
- **Workflow**: Modal-based for dashboard interaction
- **Visuals**: 3D interactive design with scroll-activated animations
- **Updates**: Real-time component updates without full page reloads
- **Responsiveness**: Mobile-first adaptive layouts

### Key Features
- **Authentication**: Replit Auth, PostgreSQL-backed sessions, route-level authorization, automatic user management.
- **Job Management**: AI-powered job creation (OpenAI), dynamic skill extraction, full job lifecycle management (create, edit, delete, view), and analytics.
- **Candidate Matching**: Airtable integration, AI matching engine (OpenAI GPT-4o) with instant dynamic scoring (no pending states), brutally honest ratings (5-25% range), real-time analysis without database caching, detailed match reasoning, and comprehensive candidate profiles.
- **Interview Management**: Automated interview scheduling with SendGrid email notifications containing complete interview details (date, time, job title, company, meeting link, timezone, notes).
- **Organization Management**: Company and team setup, email-based member invitation with role-based access control, SendGrid integration, and configurable preferences.
- **Email Integration**: Working SendGrid service for interview notifications, test endpoints for email verification, and fallback email handling for missing applicant contact information.
- **Data Flow**: Automated processes for job posting, AI-driven candidate matching, real-time dashboard updates with live components, and instant email notifications for scheduled interviews.

## External Dependencies

### AI Services
- **OpenAI GPT-4o**: Used for job description generation, requirements creation, technical skill extraction, and candidate matching.

### Database Services
- **Neon PostgreSQL**: Serverless PostgreSQL database with WebSocket-based connection and Drizzle migrations.

### Authentication
- **Replit Auth**: Integrated authentication system utilizing OpenID Connect for secure flows and session management.

### UI Components & Libraries
- **Radix UI**: Provides accessible component primitives.
- **shadcn/ui**: Pre-styled component library.
- **Lucide Icons**: Comprehensive icon library.
- **Framer Motion**: For animations and interactive elements.
- **Airtable API**: Direct connection for external candidate database sourcing and bidirectional data synchronization (platojobmatches, platojobapplications, platojobpostings).
- **SendGrid**: Email service for professional email invitations.