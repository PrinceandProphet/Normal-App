/**
 * Script to create a test survivor user
 * Run with: npx tsx scripts/create-test-user.ts
 */

import { db, pool } from "../server/db";
import { users } from "../shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { eq } from "drizzle-orm";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function createTestSurvivor() {
  try {
    console.log("Creating test survivor user...");
    
    // First check if the user already exists
    const existingUser = await db.select()
      .from(users)
      .where(eq(users.username, "test-survivor"));
    
    if (existingUser.length > 0) {
      console.log("Test survivor user already exists with ID:", existingUser[0].id);
      return;
    }
    
    // Hash the password
    const hashedPassword = await hashPassword("password123");
    
    // Create the user
    const [newUser] = await db.insert(users).values({
      username: "test-survivor",
      password: hashedPassword,
      email: "test-survivor@example.com",
      name: "Test Survivor",
      userType: "survivor",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    console.log("Created test survivor user with ID:", newUser.id);
    console.log("Username: test-survivor");
    console.log("Password: password123");
  } catch (error) {
    console.error("Error creating test user:", error);
  } finally {
    await pool.end();
  }
}

// Run the function
createTestSurvivor();