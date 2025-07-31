# Employer Hiring Platform

## Overview
This is an employer-facing web application designed to streamline the hiring process. It leverages AI for candidate assessment through interviews and generates detailed user profiles. These profiles are then matched to job postings with a rating system. The platform aims to make hiring more efficient, smarter, and faster, serving as the employer component of a larger two-platform system.

## User Preferences
Preferred communication style: Simple, everyday language.

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
- **Modal-based workflow**: Features open in modals to maintain dashboard context.
- **3D interactive design**: Rich visuals with scroll-activated animations.
- **Real-time updates**: Live components for dynamic data refresh.
- **Responsive design**: Mobile-first approach with adaptive layouts.

### Key Features
- **Authentication System**: Replit Auth, PostgreSQL-backed sessions, route-level authorization, automatic user management.
- **Job Management**: AI-powered creation, dynamic skill extraction, job lifecycle management, analytics.
- **Candidate Matching**: Airtable integration, AI matching engine (GPT-4o) with rating system, real-time analysis, match reasoning, comprehensive profiles.
- **Organization Management**: Company and team setup, email-based member invitation with SendGrid, role-based access control, settings.
- **Data Flow**: Automated processes for job posting, candidate matching, and real-time dashboard updates.

## External Dependencies

### AI Services
- **OpenAI GPT-4o**: Used for job description generation, requirements creation, technical skill extraction, and candidate matching.

### Database Services
- **Neon PostgreSQL**: Serverless PostgreSQL database with WebSocket connection and Drizzle ORM for schema management.

### Authentication
- **Replit Auth**: Integrated authentication system utilizing OpenID Connect for secure flows and session management.

### UI Components
- **Radix UI**: Provides accessible component primitives.
- **shadcn/ui**: A pre-styled component library.
- **Lucide Icons**: A comprehensive icon library.
- **Framer Motion**: For animations and interactive elements.