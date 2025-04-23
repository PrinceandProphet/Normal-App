/**
 * Script to clean the database for production
 * Removes all records created via forms while preserving essential seed data
 * 
 * Run with: npx tsx scripts/clean-database.ts
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
  organizationSurvivors 
} from "../shared/schema";
import { eq, ne, isNull, and, or, not, sql } from "drizzle-orm";

// Define tables that aren't in shared/schema.ts but need to be cleaned
const caseManagement = sql.table("case_management");
const fundingOpportunities = sql.table("funding_opportunities");

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
    
    // First, we need to remove relationships
    console.log("Removing organization relationships...");
    await db.delete(organizationSurvivors)
      .where(
        and(
          isNull(organizationSurvivors.isPrimary),
          or(
            isNull(organizationSurvivors.status),
            ne(organizationSurvivors.status, "seed")
          )
        )
      );
    
    console.log("Removing organization members...");
    await db.delete(organizationMembers)
      .where(
        or(
          isNull(organizationMembers.role),
          ne(organizationMembers.role, "super_admin")
        )
      );
    
    // Delete user-created records from each table
    console.log("Removing household members...");
    await db.delete(householdMembers)
      .where(
        or(
          isNull(householdMembers.createdAt),
          ne(householdMembers.type, "seed")
        )
      );
    
    console.log("Removing household groups...");
    await db.delete(householdGroups)
      .where(
        isNull(householdGroups.type) // Keep seed data marked with type
      );
    
    console.log("Removing properties...");
    await db.delete(properties)
      .where(
        or(
          isNull(properties.type),
          ne(properties.type, "seed")
        )
      );
    
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
    
    // Check which users exist first and will be preserved
    for (const userId of preservedUserIds) {
      const [userExists] = await db.select().from(users).where(eq(users.id, userId));
      if (userExists) {
        console.log(`  - User with ID ${userId} exists and will be preserved`);
      } else {
        console.log(`  - User with ID ${userId} doesn't exist!`);
      }
    }
    
    // Delete non-admin users one by one to avoid SQL array syntax issues
    const allUsers = await db.select().from(users);
    console.log(`Found ${allUsers.length} total users`);
    
    let deletedCount = 0;
    for (const user of allUsers) {
      // Skip preserved users and super admins
      if (preservedUserIds.includes(user.id) || user.role === "super_admin") {
        console.log(`  - Keeping user: ${user.name} (ID: ${user.id}, Role: ${user.role})`);
        continue;
      }
      
      // Delete this user
      await db.delete(users).where(eq(users.id, user.id));
      deletedCount++;
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