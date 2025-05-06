import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { getDatabaseUrl, loadEnvironment, getEnvironment } from './config';

// Ensure environment variables are loaded based on NODE_ENV
loadEnvironment();

neonConfig.webSocketConstructor = ws;

// Get the database URL from our environment configuration
const databaseUrl = getDatabaseUrl();

// Log database connection info (safely, without exposing credentials)
const dbUrlParts = databaseUrl.split('@');
if (dbUrlParts.length > 1) {
  const dbHostAndName = dbUrlParts[1].split('/');
  if (dbHostAndName.length > 1) {
    console.log(`[DB Connection] Environment: ${getEnvironment()}`);
    console.log(`[DB Connection] Host: ${dbHostAndName[0]}`);
    console.log(`[DB Connection] Database: ${dbHostAndName[1].split('?')[0]}`);
  }
}

export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle({ client: pool, schema });
