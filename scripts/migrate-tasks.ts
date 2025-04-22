import { db } from "../server/db";
import { tasks } from "../shared/schema";
import { eq, sql } from "drizzle-orm";

/**
 * Migration script to update the task table with new columns
 * Run with: npx tsx scripts/migrate-tasks.ts
 */
async function migrateTaskTable() {
  console.log("Starting task table migration...");
  
  try {
    // Get all existing tasks
    const existingTasks = await db.select().from(tasks);
    console.log(`Found ${existingTasks.length} existing tasks`);
    
    // For each task, update with default values for new columns
    for (const task of existingTasks) {
      // Set default values - assume system user (ID 1) created them
      const updatedTask = {
        createdById: 1,
        createdByType: "practitioner",
      };
      
      await db.update(tasks)
        .set(updatedTask)
        .where(eq(tasks.id, task.id));
    }
    
    console.log("Task migration completed successfully");
  } catch (error) {
    console.error("Error during task migration:", error);
  } finally {
    // Close the database connection
    await db.execute(sql`select 1`).then(() => {
      process.exit(0);
    }).catch(() => {
      process.exit(1);
    });
  }
}

// Run the migration
migrateTaskTable();