/**
 * Script to run database migrations with the correct environment
 * Usage:
 *   - For development: npx tsx scripts/db-migrate.ts
 *   - For staging: NODE_ENV=staging npx tsx scripts/db-migrate.ts
 *   - For production: NODE_ENV=production npx tsx scripts/db-migrate.ts
 */

import { loadEnvironment, getEnvironment } from "../server/config";
import { execSync } from "child_process";

// Load the correct environment variables
loadEnvironment();
const environment = getEnvironment();

console.log(`Running database migrations for environment: ${environment}`);

try {
  // Run the drizzle-kit push command which will use the DATABASE_URL from the environment
  execSync("npx drizzle-kit push", { stdio: "inherit" });
  console.log(`Successfully completed migrations for ${environment} environment`);
} catch (error) {
  console.error("Migration failed:", error);
  process.exit(1);
}