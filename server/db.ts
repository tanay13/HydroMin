import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

const { Pool } = pg;

// Use environment variables for database connection
const connectionString: string | undefined = process.env.DATABASE_URL;
const host = process.env.PGHOST;
const port = process.env.PGPORT ? Number(process.env.PGPORT) : undefined;
const user = process.env.PGUSER;
const password = process.env.PGPASSWORD;
const database = process.env.PGDATABASE;

// Log environment variables (except sensitive ones)
console.log("Database environment variables available:", {
  DATABASE_URL: connectionString ? "Set" : "Not set",
  PGHOST: host ? "Set" : "Not set",
  PGPORT: port ? "Set" : "Not set",
  PGUSER: user ? "Set" : "Not set",
  PGPASSWORD: password ? "Set (hidden)" : "Not set",
  PGDATABASE: database ? "Set" : "Not set"
});

let pool: pg.Pool;
let db: ReturnType<typeof drizzle>;

try {
  // Replit-specific: The DATABASE_URL from Replit's PostgreSQL DB should always be used
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  console.log("Using DATABASE_URL for connection");
  
  // Create the connection pool
  pool = new Pool({
    connectionString,
    ssl: false, // Replit's PostgreSQL doesn't require SSL
  });

  console.log('Attempting to connect to PostgreSQL database...');

  // Set up error handling for the pool
  pool.on('error', (err: any) => {
    console.error('Unexpected error on idle PostgreSQL client:', err);
  });

  // Create Drizzle ORM instance
  db = drizzle(pool, { schema });
  
} catch (error: any) {
  console.error('Failed to initialize database connection:', error.message);
  console.error('CRITICAL ERROR: Unable to connect to the database. The application requires a valid PostgreSQL connection.');
  process.exit(1);
}

export { pool, db };
