/**
 * Migration script to add system settings and feature toggle fields to the organizations table
 * Run with: npx tsx scripts/migrate-org-system-settings.ts
 */

import { db } from "../server/db";
import { organizations } from "../shared/schema";
import { sql } from "drizzle-orm";

async function migrateOrganizationsTable() {
  console.log("Starting organizations table migration for system settings...");
  
  try {
    // Add system settings columns if they don't exist
    await db.execute(sql`
      ALTER TABLE organizations 
      ADD COLUMN IF NOT EXISTS logo_url TEXT,
      ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#0070F3',
      ADD COLUMN IF NOT EXISTS default_sms_name TEXT,
      ADD COLUMN IF NOT EXISTS enable_messaging BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS enable_calendar BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS enable_action_plan BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS enable_documents BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS enable_household_management BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS enable_funding_opportunities BOOLEAN DEFAULT TRUE;
    `);
    
    console.log("Successfully added system settings columns to organizations table");
    
    // Verify the columns were added
    const columns = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'organizations' 
      AND (column_name LIKE 'enable_%' OR column_name IN ('logo_url', 'primary_color', 'default_sms_name'));
    `);
    
    console.log("System settings columns in organizations table:", columns.rows);
    
    console.log("Organizations table migration completed successfully");
  } catch (error) {
    console.error("Error migrating organizations table:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

migrateOrganizationsTable();