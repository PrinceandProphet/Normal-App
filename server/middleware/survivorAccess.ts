import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { eq, and } from "drizzle-orm";
import { users, organizationSurvivors } from "@shared/schema";
import { db } from "../db";

/**
 * Middleware to check if a practitioner has access to a survivor
 * @param req Express request object with survivorId parameter
 * @param res Express response object
 * @param next Express next function
 */
export async function canAccessSurvivor(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const currentUser = req.user;
  const survivorId = parseInt(req.params.survivorId);

  if (isNaN(survivorId)) {
    return res.status(400).json({ message: "Invalid survivor ID" });
  }

  try {
    // Super admins have access to all survivors
    if (currentUser.role === "super_admin") {
      return next();
    }

    // Survivor users can only access their own data
    if (currentUser.userType === "survivor") {
      if (currentUser.id === survivorId) {
        return next();
      } else {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    // Practitioners need to be part of an organization that has access to the survivor
    if (currentUser.userType === "practitioner") {
      // First, check if the user has an associated organization
      if (!currentUser.organizationId) {
        return res.status(403).json({ message: "No organization association" });
      }

      // Check if the survivor is associated with the practitioner's organization
      const [relationship] = await db
        .select()
        .from(organizationSurvivors)
        .where(
          and(
            eq(organizationSurvivors.survivorId, survivorId),
            eq(organizationSurvivors.organizationId, currentUser.organizationId)
          )
        );

      if (relationship) {
        // Check if the relationship is active
        if (relationship.status === "active") {
          return next();
        } else {
          return res.status(403).json({ 
            message: `Access denied. Relationship status: ${relationship.status}` 
          });
        }
      } else {
        return res.status(403).json({ message: "No relationship with this survivor" });
      }
    }

    // Default deny access
    return res.status(403).json({ message: "Access denied" });
  } catch (error) {
    console.error("Error in survivor access middleware:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Middleware to filter a list of survivors to only those accessible by the current user
 * Modifies req object to add filteredSurvivorIds property
 */
export async function filterAccessibleSurvivors(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const currentUser = req.user;
  
  try {
    // Super admins can access all survivors
    if (currentUser.role === "super_admin") {
      // Get all survivors
      const survivors = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.userType, "survivor"));
      
      req.filteredSurvivorIds = survivors.map(s => s.id);
      return next();
    }

    // Survivor users can only access themselves
    if (currentUser.userType === "survivor") {
      req.filteredSurvivorIds = [currentUser.id];
      return next();
    }

    // Practitioners need an organization
    if (currentUser.userType === "practitioner") {
      if (!currentUser.organizationId) {
        req.filteredSurvivorIds = [];
        return next();
      }

      // Get all survivors associated with practitioner's organization
      const relationships = await db
        .select()
        .from(organizationSurvivors)
        .where(
          and(
            eq(organizationSurvivors.organizationId, currentUser.organizationId),
            eq(organizationSurvivors.status, "active")
          )
        );
      
      req.filteredSurvivorIds = relationships.map(r => r.survivorId);
      return next();
    }

    // Default to empty list for safety
    req.filteredSurvivorIds = [];
    return next();
  } catch (error) {
    console.error("Error in survivor filter middleware:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// Extend Express Request interface to include our custom properties
declare global {
  namespace Express {
    interface Request {
      filteredSurvivorIds?: number[];
    }
  }
}