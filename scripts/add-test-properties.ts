/**
 * Script to add test properties and household data for testing
 * Run with: npx tsx scripts/add-test-properties.ts
 */
import { db } from "../server/db";
import { properties, householdGroups, householdMembers } from "../shared/schema";

async function main() {
  try {
    console.log("Adding test properties and household data...");

    // Get our newly added test users (survivors/clients)
    const survivors = await db.query.users.findMany({
      where: (users, { eq, and, gt }) => and(
        eq(users.userType, "survivor"),
        gt(users.id, 13) // Only get the new test clients we just added
      )
    });

    if (survivors.length === 0) {
      console.log("No survivors found. Please run add-test-clients.ts first.");
      return;
    }

    // Add properties for each survivor
    for (let i = 0; i < survivors.length; i++) {
      const survivor = survivors[i];
      
      // Create properties for this survivor
      const propertyTypes = ["single_family", "multi_family", "apartment"];
      const ownershipStatuses = ["owned", "rented", "temporary"];
      
      const [property1] = await db
        .insert(properties)
        .values({
          address: `${100 + i} Main Street, Anytown, USA`,
          type: propertyTypes[i % propertyTypes.length],
          ownershipStatus: ownershipStatuses[i % ownershipStatuses.length],
          primaryResidence: true,
          survivorId: survivor.id
        })
        .returning();
      
      console.log(`Created property for ${survivor.firstName} ${survivor.lastName}: ${property1.address}`);
      
      // Add a second property for the first survivor
      if (i === 0) {
        const [property2] = await db
          .insert(properties)
          .values({
            address: `${200 + i} Second Avenue, Othertown, USA`,
            type: propertyTypes[(i + 1) % propertyTypes.length],
            ownershipStatus: ownershipStatuses[(i + 1) % ownershipStatuses.length],
            primaryResidence: false,
            survivorId: survivor.id
          })
          .returning();
        
        console.log(`Created second property for ${survivor.firstName} ${survivor.lastName}: ${property2.address}`);
      }

      // Create household groups for each property
      const [group1] = await db
        .insert(householdGroups)
        .values({
          name: "Main Family",
          type: "nuclear",
          propertyId: property1.id,
          survivorId: survivor.id
        })
        .returning();
      
      console.log(`Created household group: ${group1.name} for property ${property1.address}`);
      
      // Add household members
      const [member1] = await db
        .insert(householdMembers)
        .values({
          name: `${survivor.firstName} ${survivor.lastName}`,
          type: "adult",
          relationship: "head",
          groupId: group1.id,
          survivorId: survivor.id
        })
        .returning();
      
      console.log(`Added household member: ${member1.name} (Head of household)`);
      
      // Add additional members
      const memberTypes = ["adult", "child", "senior"];
      const relationships = ["spouse", "child", "parent", "sibling"];
      
      for (let j = 0; j < 2; j++) {
        const [member] = await db
          .insert(householdMembers)
          .values({
            name: `Family Member ${j + 1}`,
            type: memberTypes[j % memberTypes.length],
            relationship: relationships[j % relationships.length],
            groupId: group1.id,
            survivorId: survivor.id
          })
          .returning();
        
        console.log(`Added household member: ${member.name} (${member.relationship})`);
      }
    }

    console.log("\nTest properties and household data added successfully!");
  } catch (error) {
    console.error("Error adding test properties:", error);
  } finally {
    process.exit(0);
  }
}

main();