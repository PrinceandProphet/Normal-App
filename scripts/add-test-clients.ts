/**
 * Script to add test clients (survivors) and assign them to organizations
 * Run with: npx tsx scripts/add-test-clients.ts
 */
import { db } from "../server/db";
import { users, organizationSurvivors } from "../shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function main() {
  try {
    console.log("Creating test clients...");

    // Create test survivors (clients)
    const clients = [
      {
        name: "John Smith",
        username: "john.smith@example.com",
        password: await hashPassword("password123"),
        email: "john.smith@example.com",
        userType: "survivor",
        role: "user",
        firstName: "John",
        lastName: "Smith",
        phoneNumber: "+1 (555) 123-4567",
        address: "123 Main St, Anytown, CA 12345",
        isVerified: true,
      },
      {
        name: "Maria Garcia",
        username: "maria.garcia@example.com",
        password: await hashPassword("password123"),
        email: "maria.garcia@example.com",
        userType: "survivor",
        role: "user",
        firstName: "Maria",
        lastName: "Garcia",
        phoneNumber: "+1 (555) 987-6543",
        address: "456 Oak Ave, Othercity, FL 67890",
        isVerified: true,
      },
      {
        name: "David Johnson",
        username: "david.johnson@example.com",
        password: await hashPassword("password123"),
        email: "david.johnson@example.com",
        userType: "survivor",
        role: "user",
        firstName: "David",
        lastName: "Johnson",
        phoneNumber: "+1 (555) 222-3333",
        address: "789 Pine Rd, Somewhere, TX 54321",
        isVerified: true,
      },
      {
        name: "Sarah Williams",
        username: "sarah.williams@example.com",
        password: await hashPassword("password123"),
        email: "sarah.williams@example.com",
        userType: "survivor",
        role: "user",
        firstName: "Sarah",
        lastName: "Williams",
        phoneNumber: "+1 (555) 444-5555",
        address: "321 Elm Blvd, Nowhere, NY 13579",
        isVerified: true,
      },
      {
        name: "James Brown",
        username: "james.brown@example.com",
        password: await hashPassword("password123"),
        email: "james.brown@example.com",
        userType: "survivor",
        role: "user",
        firstName: "James",
        lastName: "Brown",
        phoneNumber: "+1 (555) 777-8888",
        address: "654 Birch St, Someplace, WA 97531",
        isVerified: true,
      }
    ];

    // Insert clients
    console.log("Inserting client records...");
    const createdClients = [];
    
    for (const client of clients) {
      const [insertedClient] = await db
        .insert(users)
        .values(client as any)
        .returning();
      
      createdClients.push(insertedClient);
      console.log(`Created client: ${insertedClient.firstName} ${insertedClient.lastName}`);
    }

    // Connect clients to organizations
    console.log("\nAssigning clients to organizations...");
    
    // Get organizations
    const organizations = await db.query.organizations.findMany();
    
    if (organizations.length === 0) {
      console.log("No organizations found. Please create organizations first.");
      return;
    }
    
    // Distribute clients among organizations
    for (let i = 0; i < createdClients.length; i++) {
      const client = createdClients[i];
      const orgIndex = i % organizations.length;
      const organization = organizations[orgIndex];
      
      const isPrimary = i < organizations.length; // First client for each org is primary
      
      await db
        .insert(organizationSurvivors)
        .values({
          organizationId: organization.id,
          survivorId: client.id,
          status: "active",
          isPrimary,
          notes: `Test client assigned to ${organization.name}`
        });
      
      console.log(`Assigned ${client.firstName} ${client.lastName} to ${organization.name} (Primary: ${isPrimary})`);
    }

    console.log("\nTest clients created successfully!");
  } catch (error) {
    console.error("Error creating test clients:", error);
  } finally {
    process.exit(0);
  }
}

main();