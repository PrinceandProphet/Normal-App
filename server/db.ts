import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { getDatabaseUrl, loadEnvironment } from './config';

// Ensure environment variables are loaded based on NODE_ENV
loadEnvironment();

neonConfig.webSocketConstructor = ws;

// Get the database URL from our environment configuration
const databaseUrl = getDatabaseUrl();

export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle({ client: pool, schema });
