/**
 * Script to verify the production database connection and query results
 * Run with: NODE_ENV=production npx tsx scripts/verify-production-db.js
 */

import { db } from '../server/db.js';
import { users } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import { getDatabaseUrl, getEnvironment } from '../server/config.js';

async function verifyProductionDatabaseState() {
  try {
    console.log('=== PRODUCTION DATABASE VERIFICATION ===');
    console.log(`Current environment: ${getEnvironment()}`);
    
    // Safely print database connection info
    const databaseUrl = getDatabaseUrl();
    const dbUrlParts = databaseUrl.split('@');
    if (dbUrlParts.length > 1) {
      const dbHostAndName = dbUrlParts[1].split('/');
      if (dbHostAndName.length > 1) {
        console.log(`Database Host: ${dbHostAndName[0]}`);
        console.log(`Database Name: ${dbHostAndName[1].split('?')[0]}`);
      }
    }

    // Check for demetriusgray user
    console.log('\n=== CHECKING DEMETRIUSGRAY USER ===');
    const demetriusUser = await db.select().from(users).where(eq(users.id, 4));
    if (demetriusUser && demetriusUser.length > 0) {
      console.log(`Found user: ID=${demetriusUser[0].id}, Name=${demetriusUser[0].name}, Role=${demetriusUser[0].role}`);
    } else {
      console.log('User demetriusgray not found in database!');
    }

    // Check for survivors
    console.log('\n=== CHECKING SURVIVORS ===');
    const survivors = await db.select().from(users).where(eq(users.userType, 'survivor'));
    console.log(`Total survivors found: ${survivors.length}`);
    if (survivors.length > 0) {
      console.log('First 3 survivors:');
      survivors.slice(0, 3).forEach(survivor => {
        console.log(`- ID=${survivor.id}, Name=${survivor.name}, Email=${survivor.email}`);
      });
    }

    // Check for tasks associated with demetriusgray
    console.log('\n=== CHECKING TASKS FOR DEMETRIUSGRAY ===');
    const tasks = await db.query.tasks.findMany({
      where: (tasks, { or, eq }) => or(
        eq(tasks.createdById, 4),
        eq(tasks.assignedToId, 4)
      )
    });
    console.log(`Total tasks found: ${tasks?.length || 0}`);
    if (tasks && tasks.length > 0) {
      tasks.forEach(task => {
        console.log(`- Text: ${task.text}, Stage: ${task.stage}, Completed: ${task.completed}`);
      });
    }

    console.log('\n=== VERIFICATION COMPLETE ===');
  } catch (error) {
    console.error('Error verifying production database:', error);
  } finally {
    process.exit(0);
  }
}

verifyProductionDatabaseState();