import { Router } from "express";
import { storage } from "../storage";
import { z } from "zod";
import { insertUserSchema, insertOrganizationSurvivorSchema } from "@shared/schema";
import { canAccessSurvivor, filterAccessibleSurvivors } from "../middleware/survivorAccess";
import { accessControlService } from "../services/accessControl";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "@shared/schema";

const router = Router();

// Get all survivors (filtered by access control)
router.get("/", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  try {
    // Log current user accessing survivors list
    console.log(`[Survivors API] User ${req.user.id} (${req.user.name}) with role ${req.user.role} accessing survivors list`);
    
    // For admin, super_admin, and practitioner users, return all survivors
    if (
      req.user.role === "admin" || 
      req.user.role === "super_admin" || 
      req.user.userType === "practitioner"
    ) {
      // Get all users with userType "survivor"
      console.log(`[Survivors API] Querying all survivors from database`);
      const allSurvivors = await db.select().from(users).where(eq(users.userType, "survivor"));
      console.log(`[Survivors API] Found ${allSurvivors.length} survivors in the database`);
      
      // For each survivor, get their organization relationships
      const survivorsWithOrgs = await Promise.all(
        allSurvivors.map(async (survivor) => {
          const relationships = await storage.getSurvivorOrganizations(survivor.id);
          console.log(`[Survivors API] Survivor ID ${survivor.id} has ${relationships.length} organization relationships`);
          
          const orgs = await Promise.all(
            relationships.map(async r => {
              const org = await storage.getOrganization(r.organizationId);
              if (org) {
                return {
                  id: org.id,
                  name: org.name,
                  status: r.status
                };
              }
              return null;
            })
          );
          
          return {
            ...survivor,
            organizations: orgs.filter(Boolean)
          };
        })
      );
      
      return res.json(survivorsWithOrgs);
    } 
    // For regular users, use access control filtering
    else {
      console.log(`[Survivors API] Using access control filtering for user ${req.user.id}`);
      // Apply filtering middleware logic directly
      await filterAccessibleSurvivors(req, res, async () => {
        if (req.filteredSurvivorIds && req.filteredSurvivorIds.length > 0) {
          console.log(`[Survivors API] User has access to ${req.filteredSurvivorIds.length} survivors: ${JSON.stringify(req.filteredSurvivorIds)}`);
          const survivors = await Promise.all(
            req.filteredSurvivorIds.map(id => storage.getUser(id))
          );
          return res.json(survivors.filter(Boolean));
        }
        
        // Otherwise return an empty array
        console.log(`[Survivors API] No accessible survivors found for user ${req.user.id}`);
        return res.json([]);
      });
    }
  } catch (error) {
    console.error("Error getting survivors:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Get a specific survivor
router.get("/:id", canAccessSurvivor, async (req, res) => {
  const survivorId = parseInt(req.params.id);
  if (isNaN(survivorId)) {
    return res.status(400).json({ message: "Invalid survivor ID" });
  }

  try {
    const survivor = await storage.getUser(survivorId);
    if (!survivor) {
      return res.status(404).json({ message: "Survivor not found" });
    }
    
    return res.json(survivor);
  } catch (error) {
    console.error("Error getting survivor:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Create a new survivor
router.post("/", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  // Only admins, super admins, or practitioners can create survivors
  if (
    req.user.role !== "admin" && 
    req.user.role !== "super_admin" && 
    req.user.userType !== "practitioner"
  ) {
    return res.status(403).json({ message: "Access denied" });
  }

  try {
    // Force userType to "survivor" regardless of what was passed
    const validatedData = insertUserSchema.parse({
      ...req.body,
      userType: "survivor"
    });
    
    const survivor = await storage.createUser(validatedData);
    
    // If the creator is part of an organization, automatically add the survivor to that organization
    if (
      req.user.organizationId && 
      req.user.userType === "practitioner"
    ) {
      const relationship = insertOrganizationSurvivorSchema.parse({
        survivorId: survivor.id,
        organizationId: req.user.organizationId,
        status: "active",
        isPrimary: true,
        addedById: req.user.id
      });
      await storage.addSurvivorToOrganization(relationship);
    }
    
    return res.status(201).json(survivor);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("Error creating survivor:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Update a survivor
router.patch("/:id", canAccessSurvivor, async (req, res) => {
  const survivorId = parseInt(req.params.id);
  if (isNaN(survivorId)) {
    return res.status(400).json({ message: "Invalid survivor ID" });
  }

  try {
    // Allow updating a wider range of fields, but never allow changing userType from "survivor"
    const allowedFields = [
      "firstName",
      "lastName",
      "name",
      "email",
      "phone",
      "address",
      "password",
      "isVerified",
      "organizationId",
      "dateOfBirth",
      "gender",
      "pronouns",
      "ssn",
      "maritalStatus",
      "primaryLanguage",
      "race",
      "ethnicity",
      "citizenshipStatus",
      "veteranStatus",
      "disabilityStatus",
      "status"
    ];
    
    const filteredData = Object.keys(req.body)
      .filter(key => allowedFields.includes(key))
      .reduce<Record<string, any>>((obj, key) => {
        obj[key] = req.body[key];
        return obj;
      }, {});
    
    const validatedData = insertUserSchema.partial().parse(filteredData);
    const survivor = await storage.updateUser(survivorId, validatedData);
    
    return res.json(survivor);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("Error updating survivor:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Get organizations associated with a survivor
router.get("/:survivorId/organizations", async (req, res) => {
  console.log("Getting organizations for survivor:", req.params);
  const survivorId = parseInt(req.params.survivorId);
  if (isNaN(survivorId)) {
    return res.status(400).json({ message: "Invalid survivor ID format" });
  }

  try {
    const relationships = await storage.getSurvivorOrganizations(survivorId);
    
    // Get the actual organization data
    const organizations = await Promise.all(
      relationships.map(async r => {
        const org = await storage.getOrganization(r.organizationId);
        if (org) {
          return {
            ...org,
            relationship: {
              status: r.status,
              isPrimary: r.isPrimary,
              addedAt: r.addedAt,
              updatedAt: r.updatedAt
            }
          };
        }
        return null;
      })
    );
    
    // Filter out any null values (in case an organization was deleted)
    const validOrgs = organizations.filter(Boolean);
    
    return res.json(validOrgs);
  } catch (error) {
    console.error("Error getting survivor organizations:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Delete a survivor
router.delete("/:id", canAccessSurvivor, async (req, res) => {
  const survivorId = parseInt(req.params.id);
  if (isNaN(survivorId)) {
    return res.status(400).json({ message: "Invalid survivor ID" });
  }

  try {
    // Verify that the survivor exists
    const survivor = await storage.getUser(survivorId);
    if (!survivor) {
      return res.status(404).json({ message: "Survivor not found" });
    }
    
    // Only admins, super_admins, or practitioners can delete survivors
    if (
      !req.user ||
      (req.user.role !== "admin" && 
      req.user.role !== "super_admin" && 
      req.user.userType !== "practitioner")
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Delete the survivor
    await storage.deleteUser(survivorId);
    
    return res.status(200).json({ message: "Survivor deleted successfully" });
  } catch (error) {
    console.error("Error deleting survivor:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;