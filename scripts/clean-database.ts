/**
 * Script to clean the database for production deployment
 * 
 * This script:
 * 1. Removes all client/survivor data that was created during testing
 * 2. Removes all case management records, properties, organizations, and households
 * 3. Preserves essential seed data and super admin users
 * 4. Handles foreign key constraints to safely remove records
 * 
 * IMPORTANT: This script preserves users with IDs 1 and 4, and any user with the 'super_admin' role.
 * If your seed data uses different IDs, modify the preservedUserIds array in this script.
 * 
 * Usage: Run this script before deploying to production to clear test data
 * Command: npx tsx scripts/clean-database.ts
 */

import { db } from "../server/db";
import { 
  householdMembers, 
  householdGroups, 
  properties, 
  documents, 
  contacts, 
  messages,
  tasks,
  capitalSources,
  users,
  organizationMembers,
  organizationSurvivors,
  organizations
} from "../shared/schema";
import { eq, ne, isNull, and, or, not, sql } from "drizzle-orm";

// We'll use raw SQL for tables that aren't in shared/schema.ts

async function cleanDatabase() {
  console.log("Starting database cleaning process...");
  
  try {
    // Count records before deletion
    const [{ count: userCount }] = await db.select({ 
      count: sql<number>`count(*)` 
    }).from(users);
    
    const [{ count: propCount }] = await db.select({ 
      count: sql<number>`count(*)` 
    }).from(properties);
    
    const [{ count: docsCount }] = await db.select({ 
      count: sql<number>`count(*)` 
    }).from(documents);
    
    console.log(`Before cleaning: ${userCount} users, ${propCount} properties, ${docsCount} documents`);
    
    // Keep only the super admin user (usually id = 1) and the demo admin user (id = 4)
    // Adjust these IDs based on your specific seed data
    const preservedUserIds = [1, 4];
    
    // First, we need to handle foreign key constraints
    // Delete records from tables with foreign keys to users
    
    // 1. Clean case_management table (has FK to users)
    console.log("Cleaning case_management table...");
    try {
      await db.execute(sql`DELETE FROM case_management`);
      console.log("  - case_management table cleaned");
    } catch (error) {
      console.error("  - Failed to clean case_management:", error);
    }
    
    // 2. Clean funding_opportunities table (has FK to users)
    console.log("Cleaning funding_opportunities table...");
    try {
      await db.execute(sql`DELETE FROM funding_opportunities`);
      console.log("  - funding_opportunities table cleaned");
    } catch (error) {
      console.error("  - Failed to clean funding_opportunities:", error);
    }
    
    // Now clean relationship tables
    console.log("Removing organization relationships...");
    await db.delete(organizationSurvivors);
    
    console.log("Removing organization members...");
    await db.delete(organizationMembers);
    
    // Delete user-created records from each table
    console.log("Removing household members...");
    await db.delete(householdMembers);
    
    console.log("Removing household groups...");
    await db.delete(householdGroups);
    
    console.log("Removing properties...");
    await db.delete(properties);
    
    console.log("Removing documents...");
    await db.delete(documents);
    
    console.log("Removing contacts...");
    await db.delete(contacts);
    
    console.log("Removing messages...");
    await db.delete(messages);
    
    console.log("Removing tasks...");
    await db.delete(tasks);
    
    console.log("Removing capital sources...");
    await db.delete(capitalSources);
    
    // Delete users except admin users
    console.log("Removing non-admin users...");
    
    // Check which users to preserve
    for (const userId of preservedUserIds) {
      const [userExists] = await db.select().from(users).where(eq(users.id, userId));
      if (userExists) {
        console.log(`  - User with ID ${userId} exists and will be preserved`);
      } else {
        console.log(`  - User with ID ${userId} doesn't exist!`);
      }
    }
    
    // Clear organization reference from users
    console.log("Clearing organization references from users...");
    await db.update(users)
      .set({ organizationId: null })
      .where(not(isNull(users.organizationId)));
    
    // Now that the references are removed, we can delete organizations
    console.log("Removing organizations...");
    try {
      await db.delete(organizations);
      console.log("  - All organizations removed");
    } catch (orgErr) {
      console.error("  - Failed to delete organizations:", orgErr);
    }
    
    // Delete users that aren't in the preserved list or super_admin
    // Always use the "one by one" approach since it's more reliable with IDs
    console.log("Deleting users not in preserved list...");
    
    const allUsers = await db.select().from(users);
    console.log(`Found ${allUsers.length} total users`);
    
    let deletedCount = 0;
    for (const user of allUsers) {
      // Skip preserved users and super admins
      if (preservedUserIds.includes(user.id) || user.role === "super_admin") {
        console.log(`  - Keeping user: ${user.name} (ID: ${user.id}, Role: ${user.role})`);
        continue;
      }
      
      try {
        // Delete this user
        await db.delete(users).where(eq(users.id, user.id));
        deletedCount++;
      } catch (userErr) {
        console.error(`  - Failed to delete user ID ${user.id}:`, userErr);
      }
    }
    
    console.log(`Deleted ${deletedCount} users`);
    
    
    // Count records after deletion
    const [{ count: userCountAfter }] = await db.select({ 
      count: sql<number>`count(*)` 
    }).from(users);
    
    const [{ count: propCountAfter }] = await db.select({ 
      count: sql<number>`count(*)` 
    }).from(properties);
    
    const [{ count: docsCountAfter }] = await db.select({ 
      count: sql<number>`count(*)` 
    }).from(documents);
    
    console.log(`After cleaning: ${userCountAfter} users, ${propCountAfter} properties, ${docsCountAfter} documents`);
    
    console.log("Database cleaned successfully!");
    
  } catch (error) {
    console.error("Error cleaning database:", error);
    process.exit(1);
  }
}

cleanDatabase()
  .then(() => {
    console.log("Clean-up completed successfully");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Clean-up failed:", err);
    process.exit(1);
  });