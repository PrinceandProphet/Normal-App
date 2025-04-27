/**
 * Migration script to add email configuration fields to the organizations table
 * Run with: npx tsx scripts/migrate-org-email-fields.ts
 */

import { db } from "../server/db";
import { organizations } from "../shared/schema";
import { sql } from "drizzle-orm";

async function migrateOrganizationsTable() {
  console.log("Starting organizations table migration for email configuration...");
  
  try {
    // Add email configuration columns if they don't exist
    await db.execute(sql`
      ALTER TABLE organizations 
      ADD COLUMN IF NOT EXISTS email_domain TEXT,
      ADD COLUMN IF NOT EXISTS email_domain_verified BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS email_sender_name TEXT,
      ADD COLUMN IF NOT EXISTS email_sender_email TEXT,
      ADD COLUMN IF NOT EXISTS email_dkim_selector TEXT,
      ADD COLUMN IF NOT EXISTS email_dkim_key TEXT,
      ADD COLUMN IF NOT EXISTS email_spf_record TEXT;
    `);
    
    console.log("Successfully added email configuration columns to organizations table");
    
    // Verify the columns were added
    const columns = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'organizations' 
      AND column_name LIKE 'email%';
    `);
    
    console.log("Email-related columns in organizations table:", columns.rows);
    
    console.log("Organizations table migration completed successfully");
  } catch (error) {
    console.error("Error migrating organizations table:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

migrateOrganizationsTable();