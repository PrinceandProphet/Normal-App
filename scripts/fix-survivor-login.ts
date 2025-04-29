/**
 * Script to fix the survivor login
 * Run with: npx tsx scripts/fix-survivor-login.ts
 */

import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function fixSurvivorLogin() {
  try {
    console.log("Creating a new survivor user with working credentials...");

    // Check if survivor with username 'survivor' exists
    const existingSurvivor = await db.select().from(users).where(eq(users.username, "survivor"));
    
    if (existingSurvivor.length > 0) {
      // Update the existing survivor
      const survivorId = existingSurvivor[0].id;
      await db.update(users)
        .set({
          password: await hashPassword("survivor123"),
          role: "user",
          userType: "survivor"
        })
        .where(eq(users.id, survivorId));
      
      console.log(`Updated existing survivor with ID: ${survivorId}`);
      console.log("Survivor login credentials:");
      console.log("Username: survivor");
      console.log("Password: survivor123");
    } else {
      // Create a new survivor
      const [newSurvivor] = await db.insert(users)
        .values({
          name: "Test Survivor",
          username: "survivor",
          password: await hashPassword("survivor123"),
          email: "survivor@example.com",
          firstName: "Test",
          lastName: "Survivor",
          userType: "survivor",
          role: "user"
        })
        .returning();
      
      console.log(`Created new survivor with ID: ${newSurvivor.id}`);
      console.log("Survivor login credentials:");
      console.log("Username: survivor");
      console.log("Password: survivor123");
    }
    
    // Also check for survivor1 user that might already exist
    const existingSurvivor1 = await db.select().from(users).where(eq(users.username, "survivor1"));
    
    if (existingSurvivor1.length > 0) {
      // Update the survivor1 credentials
      const survivor1Id = existingSurvivor1[0].id;
      await db.update(users)
        .set({
          password: await hashPassword("survivor123"),
          role: "user",
          userType: "survivor"
        })
        .where(eq(users.id, survivor1Id));
      
      console.log(`\nAlso updated survivor1 with ID: ${survivor1Id}`);
      console.log("Alternative survivor login credentials:");
      console.log("Username: survivor1");
      console.log("Password: survivor123");
    }
  } catch (error) {
    console.error("Error fixing survivor login:", error);
  }
  
  process.exit(0);
}

fixSurvivorLogin();