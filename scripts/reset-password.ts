/**
 * Script to reset a user's password
 * Run with: npx tsx scripts/reset-password.ts
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

async function resetPassword() {
  try {
    // Set the user ID and new password
    const userId = 9; // Super Admin user
    const newPassword = "admin123";
    
    const hashedPassword = await hashPassword(newPassword);
    
    // Update the user's password
    const result = await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId));
    
    console.log(`Password reset for user ID ${userId}`);
    console.log(`You can now login with username 'superadmin' and password '${newPassword}'`);
  } catch (error) {
    console.error("Error resetting password:", error);
  }
  
  process.exit(0);
}

resetPassword();