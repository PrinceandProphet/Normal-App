/**
 * Migration script for the messages table to support our unified messaging system
 * Run with: npx tsx scripts/migrate-messages.ts
 */

import { db, pool } from "../server/db";
import { messages } from "../shared/schema";
import { sql } from "drizzle-orm";

async function migrateMessagesTable() {
  try {
    console.log("Starting messages table migration...");

    // First, check if we need to update the table - see if the new columns exist
    const columnsCheck = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'messages' AND column_name = 'channel'
    `);

    // If the column already exists, migration might not be needed
    if (columnsCheck.length > 0) {
      console.log("Messages table has already been migrated.");
      return;
    }

    console.log("Updating messages table schema...");

    // Drop the old table and recreate it
    await db.execute(sql`DROP TABLE IF EXISTS messages`);
    
    // Recreate the table using the new schema
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        survivor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        contact_id INTEGER REFERENCES contacts(id),
        content TEXT NOT NULL,
        subject TEXT,
        channel TEXT NOT NULL,
        is_inbound BOOLEAN NOT NULL,
        is_read BOOLEAN DEFAULT false,
        status TEXT DEFAULT 'sent',
        parent_id INTEGER REFERENCES messages(id),
        external_id TEXT UNIQUE,
        sent_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    console.log("Messages table migration completed successfully!");
  } catch (error) {
    console.error("Error during messages table migration:", error);
  } finally {
    await pool.end();
  }
}

// Run the migration
migrateMessagesTable();