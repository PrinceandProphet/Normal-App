/**
 * Migration script to ensure user role column is not null
 * Run with: npx tsx scripts/migrate-user-role-column.ts
 */

import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function migrateUserRoleColumn() {
  console.log("Starting user role column migration...");
  
  try {
    // Update any null values first
    await db.execute(sql`
      UPDATE users 
      SET role = 'user' 
      WHERE role IS NULL;
    `);
    
    console.log("Updated any NULL role values to 'user'");
    
    // Now alter the column to be NOT NULL
    await db.execute(sql`
      ALTER TABLE users 
      ALTER COLUMN role SET NOT NULL;
    `);
    
    console.log("Successfully set role column to NOT NULL");
    
    // Verify the change
    const columnInfo = await db.execute(sql`
      SELECT column_name, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'role';
    `);
    
    console.log("Role column info:", columnInfo.rows);
    
    console.log("User role column migration completed successfully");
  } catch (error) {
    console.error("Error migrating user role column:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

migrateUserRoleColumn();