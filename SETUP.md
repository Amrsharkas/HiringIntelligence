# Local Development Setup Guide

This guide will help you set up the HiringIntelligence project locally.

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- Git

## Step 1: Install Dependencies

Dependencies are already installed. If you need to reinstall:

```bash
npm install
```

## Step 2: Set Up Environment Variables

**Important**: Never commit your `.env` file to version control as it contains sensitive information like API keys and database credentials.

Create a `.env` file in the project root with the following variables (copy from `.env.example` if available):

```env
# Database Configuration
# The application automatically switches between local PostgreSQL (development) and Neon (production)
# based on the NODE_ENV environment variable.
# 
# Development (NODE_ENV=development): Uses local PostgreSQL with pg driver
# Production (NODE_ENV=production): Uses Neon with @neondatabase/serverless driver
#
# Examples:
# - Local PostgreSQL: postgresql://username:password@localhost:5432/hiringintelligence
# - Neon (cloud): postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/neondb
DATABASE_URL=postgresql://username:password@localhost:5432/hiringintelligence

# Session Configuration
SESSION_SECRET=your-super-secret-session-key-change-this-in-production

# OpenAI Configuration
# Get your API key from: https://platform.openai.com/api-keys
OPENAI_API_KEY=your-openai-api-key-here

# Airtable Configuration
# Get your API key from: https://airtable.com/create/tokens
# Base ID and table names are configured in the service files
AIRTABLE_API_KEY=your-airtable-api-key-here

# SendGrid Configuration
# Get your API key from: https://app.sendgrid.com/settings/api_keys
SENDGRID_API_KEY=your-sendgrid-api-key-here

# Replit Configuration (if deploying to Replit)
# These are automatically set in Replit environment
REPL_ID=your-replit-id
REPLIT_DOMAINS=your-replit-domain
ISSUER_URL=https://replit.com/oidc

# Development Configuration
NODE_ENV=development
```

### Environment File Security

The project includes a `.gitignore` file that automatically excludes the following environment files from version control:
- `.env`
- `.env.local`
- `.env.development`
- `.env.production`

This ensures your sensitive information (API keys, database credentials, etc.) is never accidentally committed to the repository.

## Step 3: Set Up Database

The application automatically switches between local PostgreSQL (development) and Neon (production) based on the `NODE_ENV` environment variable.

### Development Environment (Local PostgreSQL)

1. **Install PostgreSQL on your system:**
   
   **macOS (using Homebrew):**
   ```bash
   brew install postgresql
   brew services start postgresql
   ```
   
   **Ubuntu/Debian:**
   ```bash
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   sudo systemctl start postgresql
   sudo systemctl enable postgresql
   ```
   
   **Windows:**
   - Download from [postgresql.org](https://www.postgresql.org/download/windows/)
   - Or use Chocolatey: `choco install postgresql`

2. **Create a database and user:**
   ```bash
   # Connect to PostgreSQL
   psql postgres
   
   # Create database
   CREATE DATABASE hiringintelligence;
   
   # Create user (optional, you can use your system user)
   CREATE USER hiringintelligence_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE hiringintelligence TO hiringintelligence_user;
   
   # Exit psql
   \q
   ```

3. **Update your `.env` file for development:**
   ```env
   # Local development database
   DATABASE_URL=postgresql://hiringintelligence_user:your_password@localhost:5432/hiringintelligence
   # OR if using your system user:
   # DATABASE_URL=postgresql://your_username@localhost:5432/hiringintelligence
   ```

### Production Environment (Neon)

1. **Set up Neon database:**
   - Go to [neon.tech](https://neon.tech)
   - Create a new project
   - Copy the connection string

2. **For production deployment, set the environment variable:**
   ```env
   # Production database (set this in your production environment)
   DATABASE_URL=postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/neondb
   NODE_ENV=production
   ```

### Database Driver Configuration

- **Development (`NODE_ENV=development`)**: Uses `pg` (PostgreSQL) driver with connection pooling for better performance
- **Production (`NODE_ENV=production`)**: Uses `@neondatabase/serverless` for serverless compatibility and edge computing
- **Automatic switching**: The database driver is selected based on `NODE_ENV` environment variable

## Step 4: Set Up External Services

### OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Add it to your `.env` file as `OPENAI_API_KEY`

### Airtable Setup
1. Go to [Airtable](https://airtable.com/create/tokens)
2. Create a new personal access token
3. Add it to your `.env` file as `AIRTABLE_API_KEY`
4. Follow the `airtable-setup-guide.md` for database structure

### SendGrid Setup (Optional for email features)
1. Go to [SendGrid](https://app.sendgrid.com/settings/api_keys)
2. Create a new API key
3. Add it to your `.env` file as `SENDGRID_API_KEY`
4. Follow the `sendgrid-dns-setup.md` for domain authentication

## Step 5: Run Database Migrations

```bash
npm run db:push
```

## Step 6: Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3001`

## Project Structure

- `client/` - React frontend application
- `server/` - Express.js backend API
- `shared/` - Shared TypeScript schemas
- `attached_assets/` - Static assets and documentation

## Available Scripts

- `npm run dev` - Start development server with hot reloading (auto-restart on file changes)
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run check` - Type check
- `npm run db:push` - Push database schema changes

## Hot Reloading

The development server is configured with **nodemon** for automatic restart when files change:
- **Watched directories**: `server/`, `shared/`
- **Watched file types**: `.ts`, `.js`, `.json`
- **Restart delay**: 1 second (prevents rapid restarts)
- **Verbose logging**: Shows restart notifications

When you modify any server-side code, the server will automatically restart and you'll see the changes immediately without manual intervention.

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Check your `DATABASE_URL` format
- Verify database credentials

### API Key Issues
- Ensure all required API keys are set in `.env`
- Check API key permissions and quotas

### Port Issues
- Default port is 3001
- Check if port is already in use
- Modify port in server configuration if needed

## Features

This application includes:
- User authentication and authorization
- Job posting management
- AI-powered candidate matching
- Resume processing and analysis
- Interview management
- Email notifications
- Analytics dashboard
- Airtable integration for candidate database

## Support

If you encounter issues:
1. Check the console for error messages
2. Verify all environment variables are set
3. Ensure all external services are properly configured
4. Check the documentation files in `attached_assets/`
