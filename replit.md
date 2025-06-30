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
- **AI Matching Engine**: OpenAI-powered candidate-to-job matching with 1-100 rating system
- **Match Reasoning**: Detailed explanations for match scores
- **Candidate Profiles**: Comprehensive candidate information display
- **Interview Management**: Scheduling and tracking candidate interviews

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
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```