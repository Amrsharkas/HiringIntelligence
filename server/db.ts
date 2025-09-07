import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { neon } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import * as schema from "@shared/schema";

// Determine if we're in development or production
const isDevelopment = process.env.NODE_ENV === 'development';

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

let pool: Pool | null = null;
let db: any;

if (isDevelopment) {
  // Use local PostgreSQL in development
  console.log('🔧 Using local PostgreSQL database for development');
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle(pool, { schema });
} else {
  // Use Neon in production
  console.log('☁️ Using Neon database for production');
  const sql = neon(process.env.DATABASE_URL);
  db = drizzleNeon(sql, { schema });
}

export { pool, db };