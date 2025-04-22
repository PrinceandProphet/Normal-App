import { Router } from "express";
import { storage } from "../storage";
import { z } from "zod";
import { insertOrganizationSchema, insertOrganizationSurvivorSchema } from "@shared/schema";
import { canAccessSurvivor } from "../middleware/survivorAccess";
import { accessControlService } from "../services/accessControl";

const router = Router();

// Get all organizations (admin only)
router.get("/", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  // Only admins and super admins can list all organizations
  if (req.user.role !== "admin" && req.user.role !== "super_admin") {
    return res.status(403).json({ message: "Access denied" });
  }

  try {
    const organizations = await storage.getOrganizations();
    return res.json(organizations);
  } catch (error) {
    console.error("Error getting organizations:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Get a specific organization
router.get("/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const orgId = parseInt(req.params.id);
  if (isNaN(orgId)) {
    return res.status(400).json({ message: "Invalid organization ID" });
  }

  try {
    const organization = await storage.getOrganization(orgId);
    if (!organization) {
      return res.status(404).json({ message: "Organization not found" });
    }

    // Users can only see their own organization, unless they're admins
    const canAccess = 
      req.user.role === "admin" || 
      req.user.role === "super_admin" ||
      req.user.organizationId === orgId;
    
    if (!canAccess) {
      return res.status(403).json({ message: "Access denied" });
    }

    return res.json(organization);
  } catch (error) {
    console.error("Error getting organization:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Create a new organization (admin only)
router.post("/", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  // Only admins and super admins can create organizations
  if (req.user.role !== "admin" && req.user.role !== "super_admin") {
    return res.status(403).json({ message: "Access denied" });
  }

  try {
    const validatedData = insertOrganizationSchema.parse(req.body);
    const organization = await storage.createOrganization(validatedData);
    return res.status(201).json(organization);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("Error creating organization:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Update an organization (admin only)
router.patch("/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const orgId = parseInt(req.params.id);
  if (isNaN(orgId)) {
    return res.status(400).json({ message: "Invalid organization ID" });
  }

  // Only admins can update organizations
  const canUpdate = 
    req.user.role === "super_admin" || 
    (req.user.role === "admin" && req.user.organizationId === orgId);
  
  if (!canUpdate) {
    return res.status(403).json({ message: "Access denied" });
  }

  try {
    const validatedData = insertOrganizationSchema.partial().parse(req.body);
    const organization = await storage.updateOrganization(orgId, validatedData);
    return res.json(organization);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("Error updating organization:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Delete an organization (super_admin only)
router.delete("/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  // Only super admins can delete organizations
  if (req.user.role !== "super_admin") {
    return res.status(403).json({ message: "Access denied" });
  }

  const orgId = parseInt(req.params.id);
  if (isNaN(orgId)) {
    return res.status(400).json({ message: "Invalid organization ID" });
  }

  try {
    await storage.deleteOrganization(orgId);
    return res.status(204).end();
  } catch (error) {
    console.error("Error deleting organization:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Get organization members
router.get("/:id/members", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const orgId = parseInt(req.params.id);
  if (isNaN(orgId)) {
    return res.status(400).json({ message: "Invalid organization ID" });
  }

  // Users can only see members from their own organization, unless they're admins
  const canAccess = 
    req.user.role === "admin" || 
    req.user.role === "super_admin" ||
    req.user.organizationId === orgId;
  
  if (!canAccess) {
    return res.status(403).json({ message: "Access denied" });
  }

  try {
    const members = await storage.getOrganizationMembers(orgId);
    return res.json(members);
  } catch (error) {
    console.error("Error getting organization members:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Get survivors associated with an organization
router.get("/:id/survivors", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const orgId = parseInt(req.params.id);
  if (isNaN(orgId)) {
    return res.status(400).json({ message: "Invalid organization ID" });
  }

  // Users can only see survivors from their own organization, unless they're super admins
  const canAccess = 
    req.user.role === "super_admin" ||
    req.user.organizationId === orgId;
  
  if (!canAccess) {
    return res.status(403).json({ message: "Access denied" });
  }

  try {
    const relationships = await storage.getOrganizationSurvivors(orgId);
    
    // Load the actual survivor data
    const survivorIds = relationships.map(r => r.survivorId);
    const survivors = await Promise.all(
      survivorIds.map(async id => {
        const user = await storage.getUser(id);
        return user;
      })
    );
    
    // Filter out any undefined values (in case a user was deleted)
    const validSurvivors = survivors.filter(Boolean);
    
    return res.json(validSurvivors);
  } catch (error) {
    console.error("Error getting organization survivors:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Add a survivor to an organization
router.post("/:id/survivors/:survivorId", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const orgId = parseInt(req.params.id);
  const survivorId = parseInt(req.params.survivorId);
  
  if (isNaN(orgId) || isNaN(survivorId)) {
    return res.status(400).json({ message: "Invalid ID" });
  }

  // Super admins can manage any organization
  // Organization admins can only manage their own organization
  const canManage = 
    req.user.role === "super_admin" || 
    (req.user.role === "admin" && req.user.organizationId === orgId);
  
  if (!canManage) {
    return res.status(403).json({ message: "Access denied" });
  }

  try {
    // Verify that the survivor exists and is actually a survivor
    const survivor = await storage.getUser(survivorId);
    if (!survivor) {
      return res.status(404).json({ message: "Survivor not found" });
    }
    if (survivor.userType !== "survivor") {
      return res.status(400).json({ message: "User is not a survivor" });
    }

    // Prepare relationship data
    const validatedData = insertOrganizationSurvivorSchema.parse({
      ...req.body,
      survivorId,
      organizationId: orgId,
      addedById: req.user.id
    });

    // Add the survivor to the organization
    const relationship = await storage.addSurvivorToOrganization(validatedData);
    return res.status(201).json(relationship);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("Error adding survivor to organization:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Remove a survivor from an organization
router.delete("/:id/survivors/:survivorId", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const orgId = parseInt(req.params.id);
  const survivorId = parseInt(req.params.survivorId);
  
  if (isNaN(orgId) || isNaN(survivorId)) {
    return res.status(400).json({ message: "Invalid ID" });
  }

  // Only org admins or super admins can remove survivors from an organization
  const canManage = 
    req.user.role === "super_admin" ||
    (req.user.role === "admin" && req.user.organizationId === orgId);
  
  if (!canManage) {
    return res.status(403).json({ message: "Access denied" });
  }

  try {
    await storage.removeSurvivorFromOrganization(survivorId, orgId);
    return res.status(204).end();
  } catch (error) {
    console.error("Error removing survivor from organization:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Update a survivor's relationship with an organization
router.patch("/:id/survivors/:survivorId", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const orgId = parseInt(req.params.id);
  const survivorId = parseInt(req.params.survivorId);
  
  if (isNaN(orgId) || isNaN(survivorId)) {
    return res.status(400).json({ message: "Invalid ID" });
  }

  // Only org admins or super admins can update survivor relationships
  const canManage = 
    req.user.role === "super_admin" ||
    (req.user.role === "admin" && req.user.organizationId === orgId);
  
  if (!canManage) {
    return res.status(403).json({ message: "Access denied" });
  }

  try {
    // Extract the data we care about
    const { status, notes, isPrimary } = req.body;
    
    let result;
    
    // Handle setting primary status separately
    if (isPrimary === true) {
      result = await storage.setPrimarySurvivorOrganization(survivorId, orgId);
    } else {
      // Update the status and notes
      result = await storage.updateSurvivorOrganizationStatus(survivorId, orgId, status, notes);
    }
    
    return res.json(result);
  } catch (error) {
    console.error("Error updating survivor relationship:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;