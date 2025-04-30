/**
 * Migration script to update the opportunity_matches table to support multi-role grant application workflow
 * Run with: npx tsx scripts/migrate-opportunity-matches.ts
 */
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function migrateOpportunityMatchesTable() {
  console.log("Starting migration for opportunity_matches table...");

  try {
    // Check if the applied_at column exists
    const columnCheckResult = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'opportunity_matches'
        AND column_name = 'applied_at'
    `);

    if (columnCheckResult.rows.length === 0) {
      console.log("Columns do not exist, proceeding with migration...");

      // Add application tracking columns
      await db.execute(sql`
        ALTER TABLE opportunity_matches
        ADD COLUMN applied_at TIMESTAMP,
        ADD COLUMN applied_by_id INTEGER REFERENCES users (id),
        ADD COLUMN awarded_at TIMESTAMP,
        ADD COLUMN awarded_by_id INTEGER REFERENCES users (id),
        ADD COLUMN funded_at TIMESTAMP,
        ADD COLUMN funded_by_id INTEGER REFERENCES users (id),
        ADD COLUMN award_amount NUMERIC
      `);

      console.log("Migration successful: added grant application tracking columns");
    } else {
      console.log("Migration skipped: columns already exist");
    }

    // Update status values for compatibility with new workflow
    await db.execute(sql`
      UPDATE opportunity_matches
      SET status = 'pending'
      WHERE status NOT IN ('pending', 'notified', 'applied', 'awarded', 'funded', 'rejected')
    `);

    console.log("Status values updated for compatibility");
    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrateOpportunityMatchesTable().then(() => process.exit(0));