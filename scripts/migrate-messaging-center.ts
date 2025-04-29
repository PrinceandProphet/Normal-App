/**
 * Migration script to add organization, sender, and tag fields to the messages table
 * Run with: npx tsx scripts/migrate-messaging-center.ts
 */

import { db, pool } from "../server/db";
import { messages } from "../shared/schema";
import { sql } from "drizzle-orm";

async function migrateMessagingCenter() {
  try {
    console.log("Starting messaging center migration...");

    // First, check if we need to update the table - see if the new columns exist
    const columnsCheck = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'messages' AND column_name = 'tags'
    `);

    // If the column already exists, migration might not be needed
    if (columnsCheck.length > 0) {
      console.log("Messages table has already been migrated with tag fields.");
      return;
    }

    console.log("Updating messages table schema with new fields...");

    // Add organization and sender ID columns
    await db.execute(sql`
      ALTER TABLE messages 
      ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id),
      ADD COLUMN IF NOT EXISTS sender_id INTEGER REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS tags TEXT;
    `);

    console.log("Migration complete: Added organization, sender, and tag fields to messages table");

  } catch (error) {
    console.error("Error during messaging center migration:", error);
  } finally {
    // Close the database connection
    await pool.end();
  }
}

// Run the migration
migrateMessagingCenter();