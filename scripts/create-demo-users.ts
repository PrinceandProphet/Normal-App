/**
 * Script to create demo users with different roles
 * Run with: npx tsx scripts/create-demo-users.ts
 */

import { db } from "../server/db";
import { users, organizations, organizationMembers } from "../shared/schema";
import { eq } from "drizzle-orm";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function createDemoUsers() {
  try {
    console.log("Starting creation of demo users...");

    // Check if Demo Organization exists, if not create it
    let demoOrgId = 6; // Default from earlier check
    const demoOrg = await db.select().from(organizations).where(eq(organizations.id, demoOrgId));
    if (demoOrg.length === 0) {
      const [newOrg] = await db.insert(organizations)
        .values({
          name: "Demo Organization",
          type: "non_profit",
          address: "123 Main St, Anytown, USA",
          phone: "555-123-4567",
          email: "demo@example.com",
          website: "https://demo.example.com",
        })
        .returning();
      demoOrgId = newOrg.id;
      console.log(`Created Demo Organization with ID: ${demoOrgId}`);
    } else {
      console.log(`Using existing Demo Organization with ID: ${demoOrgId}`);
    }

    // 1. Super Admin (already exists with ID 9)
    const superAdminId = 9;
    await db.update(users)
      .set({
        password: await hashPassword("superadmin123"),
        organizationId: null, // Super admin not tied to specific org
        role: "super_admin",
        userType: "practitioner"
      })
      .where(eq(users.id, superAdminId));
    console.log("Updated Super Admin user (ID: 9)");

    // 2. Organization Admin
    let orgAdminId = 0;
    const existingOrgAdmin = await db.select().from(users).where(eq(users.username, "orgadmin"));
    
    if (existingOrgAdmin.length === 0) {
      const [orgAdmin] = await db.insert(users)
        .values({
          name: "Organization Admin",
          username: "orgadmin",
          password: await hashPassword("orgadmin123"),
          email: "orgadmin@example.com",
          firstName: "Org",
          lastName: "Admin",
          userType: "practitioner",
          role: "admin",
          organizationId: demoOrgId
        })
        .returning();
      orgAdminId = orgAdmin.id;
      console.log(`Created Organization Admin user with ID: ${orgAdminId}`);
    } else {
      orgAdminId = existingOrgAdmin[0].id;
      await db.update(users)
        .set({
          password: await hashPassword("orgadmin123"),
          organizationId: demoOrgId,
          role: "admin"
        })
        .where(eq(users.id, orgAdminId));
      console.log(`Updated existing Organization Admin user with ID: ${orgAdminId}`);
    }

    // Make sure the org admin is connected to the organization
    const orgMemberExists = await db.select().from(organizationMembers)
      .where(eq(organizationMembers.userId, orgAdminId))
      .where(eq(organizationMembers.organizationId, demoOrgId));
    
    if (orgMemberExists.length === 0) {
      await db.insert(organizationMembers)
        .values({
          userId: orgAdminId,
          organizationId: demoOrgId,
          role: "admin"
        });
      console.log(`Added Organization Admin to organization members`);
    }

    // 3. Practitioner
    let practitionerId = 0;
    const existingPractitioner = await db.select().from(users).where(eq(users.username, "practitioner"));
    
    if (existingPractitioner.length === 0) {
      const [practitioner] = await db.insert(users)
        .values({
          name: "Case Manager",
          username: "practitioner",
          password: await hashPassword("practitioner123"),
          email: "practitioner@example.com",
          firstName: "Case",
          lastName: "Manager",
          userType: "practitioner",
          role: "case_manager",
          organizationId: demoOrgId
        })
        .returning();
      practitionerId = practitioner.id;
      console.log(`Created Practitioner user with ID: ${practitionerId}`);
    } else {
      practitionerId = existingPractitioner[0].id;
      await db.update(users)
        .set({
          password: await hashPassword("practitioner123"),
          organizationId: demoOrgId,
          role: "case_manager"
        })
        .where(eq(users.id, practitionerId));
      console.log(`Updated existing Practitioner user with ID: ${practitionerId}`);
    }

    // Make sure the practitioner is connected to the organization
    const practitionerMemberExists = await db.select().from(organizationMembers)
      .where(eq(organizationMembers.userId, practitionerId))
      .where(eq(organizationMembers.organizationId, demoOrgId));
    
    if (practitionerMemberExists.length === 0) {
      await db.insert(organizationMembers)
        .values({
          userId: practitionerId,
          organizationId: demoOrgId,
          role: "case_manager"
        });
      console.log(`Added Practitioner to organization members`);
    }

    // 4. Survivor
    let survivorId = 39; // Default from earlier query
    const existingSurvivor = await db.select().from(users).where(eq(users.id, survivorId));
    
    if (existingSurvivor.length > 0) {
      await db.update(users)
        .set({
          password: await hashPassword("survivor123"),
          role: "user",
          userType: "survivor"
        })
        .where(eq(users.id, survivorId));
      console.log(`Updated existing Survivor user with ID: ${survivorId}`);
    } else {
      const [survivor] = await db.insert(users)
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
      survivorId = survivor.id;
      console.log(`Created Survivor user with ID: ${survivorId}`);
    }

    console.log("\n----------------------------------------");
    console.log("DEMO USER LOGIN CREDENTIALS");
    console.log("----------------------------------------");
    console.log("1. Super Admin");
    console.log("   Username: superadmin");
    console.log("   Password: superadmin123");
    console.log("   Role: super_admin");
    console.log("");
    console.log("2. Organization Admin");
    console.log("   Username: orgadmin");
    console.log("   Password: orgadmin123");
    console.log("   Role: admin");
    console.log("   Organization: Demo Organization (ID: " + demoOrgId + ")");
    console.log("");
    console.log("3. Practitioner (Case Manager)");
    console.log("   Username: practitioner");
    console.log("   Password: practitioner123");
    console.log("   Role: case_manager");
    console.log("   Organization: Demo Organization (ID: " + demoOrgId + ")");
    console.log("");
    console.log("4. Survivor");
    console.log("   Username: survivor");
    console.log("   Password: survivor123");
    console.log("   Role: user");
    console.log("----------------------------------------\n");

    console.log("All demo users created/updated successfully!");
  } catch (error) {
    console.error("Error creating demo users:", error);
  }
  
  process.exit(0);
}

createDemoUsers();