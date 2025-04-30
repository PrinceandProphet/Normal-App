/**
 * Migration script to update the capital_sources table to support individual assistance grants
 * Run with: npx tsx scripts/migrate-capital-sources.ts
 */
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function migrateCapitalSourcesTable() {
  console.log("Starting migration for capital_sources table...");

  try {
    // Check if the survivor_id column exists
    const columnCheckResult = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'capital_sources'
        AND column_name = 'survivor_id'
    `);

    if (columnCheckResult.rows.length === 0) {
      console.log("Columns do not exist, proceeding with migration...");

      // Add tracker columns
      await db.execute(sql`
        ALTER TABLE capital_sources
        ADD COLUMN survivor_id INTEGER REFERENCES users (id) ON DELETE CASCADE,
        ADD COLUMN funding_category TEXT DEFAULT 'standard'
      `);

      console.log("Migration successful: added survivor_id and funding_category columns");
    } else {
      console.log("Migration skipped: columns already exist");
    }

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrateCapitalSourcesTable().then(() => process.exit(0));