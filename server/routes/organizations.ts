import { Router } from "express";
import { storage } from "../storage";
import { z } from "zod";
import { 
  insertOrganizationSchema, 
  insertOrganizationSurvivorSchema,
  updateOrganizationSettingsSchema,
  users,
  organizationMembers
} from "@shared/schema";
import { canAccessSurvivor } from "../middleware/survivorAccess";
import { accessControlService } from "../services/accessControl";
import { emailService } from "../services/email-simplified";
import { db } from "../db";
import { and, eq } from "drizzle-orm";

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
    console.log("[OrganizationAPI] Creating organization with data:", JSON.stringify(req.body, null, 2));
    console.log("[OrganizationAPI] Environment:", process.env.NODE_ENV || "development");
    
    try {
      const validatedData = insertOrganizationSchema.parse(req.body);
      console.log("[OrganizationAPI] Validation succeeded:", JSON.stringify(validatedData, null, 2));
      const organization = await storage.createOrganization(validatedData);
    
      // Send welcome email notification to the organization's admin email
      if (organization.email) {
        try {
          await emailService.sendNewOrganizationWelcome(
            organization.name,
            organization.email
          );
          console.log(`Welcome email sent to organization admin: ${organization.email}`);
        } catch (emailError) {
          // Log the error but don't fail the request
          console.error("Error sending organization welcome email:", emailError);
        }
      }
      
      return res.status(201).json(organization);
    } catch (validationError) {
      console.error("[OrganizationAPI] Validation error:", validationError);
      if (validationError instanceof z.ZodError) {
        console.error("[OrganizationAPI] Validation error details:", JSON.stringify(validationError.errors, null, 2));
        return res.status(400).json({ 
          message: "Validation error", 
          errors: validationError.errors,
          environment: process.env.NODE_ENV || "development" 
        });
      }
      throw validationError;
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("[OrganizationAPI] Outer Validation error details:", JSON.stringify(error.errors, null, 2));
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("[OrganizationAPI] Error creating organization:", error);
    return res.status(500).json({ 
      message: "Internal server error",
      environment: process.env.NODE_ENV || "development" 
    });
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

// Add a member to an organization
router.post("/:id/members", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const orgId = parseInt(req.params.id);
  if (isNaN(orgId)) {
    return res.status(400).json({ message: "Invalid organization ID" });
  }
  
  const { userId, role } = req.body;
  
  // Only super admins can add members to any organization 
  // Org admins can add members to their own organization
  const canManage = 
    req.user.role === "super_admin" ||
    (req.user.role === "admin" && req.user.organizationId === orgId);
  
  if (!canManage) {
    return res.status(403).json({ message: "Access denied" });
  }

  try {
    // Verify that the user exists and is a practitioner
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.userType !== "practitioner") {
      return res.status(400).json({ message: "Only practitioners can be added to organizations" });
    }

    // Create the relationship
    const member = await storage.addOrganizationMember({
      userId,
      organizationId: orgId,
      role: role || "user"
    });

    // Update the user's organizationId field
    const updatedUser = await storage.updateUser(userId, { organizationId: orgId });
    
    return res.status(201).json({ member, user: updatedUser });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("Error adding member to organization:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Remove a member from an organization
router.delete("/:id/members/:userId", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const orgId = parseInt(req.params.id);
  const userId = parseInt(req.params.userId);
  
  if (isNaN(orgId) || isNaN(userId)) {
    return res.status(400).json({ message: "Invalid ID" });
  }

  // Only super admins can remove members from any organization
  // Org admins can only remove members from their own organization
  const canManage = 
    req.user.role === "super_admin" ||
    (req.user.role === "admin" && req.user.organizationId === orgId);
  
  if (!canManage) {
    return res.status(403).json({ message: "Access denied" });
  }

  try {
    // Remove the member from the organization
    await storage.removeOrganizationMember(userId, orgId);
    
    // Update the user's organizationId field to null
    await storage.updateUser(userId, { organizationId: null });
    
    return res.status(204).end();
  } catch (error) {
    console.error("Error removing member from organization:", error);
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

  // Users can only see members from their own organization, 
  // unless they're admins or super_admins who can access any organization
  const canAccess = 
    req.user.role === "super_admin" || 
    req.user.role === "admin" ||
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

// Update organization system settings
router.patch("/:id/settings", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const orgId = parseInt(req.params.id);
  if (isNaN(orgId)) {
    return res.status(400).json({ message: "Invalid organization ID" });
  }

  // Only organization admins or super admins can update organization settings
  const canUpdate = 
    req.user.role === "super_admin" || 
    (req.user.role === "admin" && req.user.organizationId === orgId);
  
  if (!canUpdate) {
    return res.status(403).json({ message: "Access denied" });
  }

  try {
    const validatedData = updateOrganizationSettingsSchema.parse(req.body);
    const organization = await storage.updateOrganizationSettings(orgId, validatedData);
    return res.json(organization);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("Error updating organization settings:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Email Configuration Routes

// Get DNS verification records for domain setup
router.get("/:id/email/dns-records", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  const orgId = parseInt(req.params.id);
  if (isNaN(orgId)) {
    return res.status(400).json({ message: "Invalid organization ID" });
  }
  
  // Check if user has permission to access this organization's email settings
  const canAccess = 
    req.user.role === "super_admin" ||
    (req.user.role === "admin" && req.user.organizationId === orgId);
  
  if (!canAccess) {
    return res.status(403).json({ message: "Access denied" });
  }
  
  try {
    const organization = await storage.getOrganization(orgId);
    
    if (!organization) {
      return res.status(404).json({ message: "Organization not found" });
    }
    
    if (!organization.emailDomain) {
      return res.status(400).json({ message: "No domain configured for this organization" });
    }
    
    const dnsRecords = emailService.getDomainVerificationRecords(organization.emailDomain);
    return res.json(dnsRecords);
  } catch (error) {
    console.error("Error getting DNS records:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Verify domain DNS records
router.post("/:id/email/verify-domain", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  const orgId = parseInt(req.params.id);
  if (isNaN(orgId)) {
    return res.status(400).json({ message: "Invalid organization ID" });
  }
  
  // Check if user has permission to verify this organization's domain
  const canAccess = 
    req.user.role === "super_admin" ||
    (req.user.role === "admin" && req.user.organizationId === orgId);
  
  if (!canAccess) {
    return res.status(403).json({ message: "Access denied" });
  }
  
  try {
    const organization = await storage.getOrganization(orgId);
    
    if (!organization) {
      return res.status(404).json({ message: "Organization not found" });
    }
    
    if (!organization.emailDomain) {
      return res.status(400).json({ message: "No domain configured for this organization" });
    }
    
    const verificationResult = await emailService.verifyDomain(organization.emailDomain, orgId);
    
    if (verificationResult.success) {
      // Re-fetch the organization to get the updated verification status
      const updatedOrg = await storage.getOrganization(orgId);
      return res.json({ 
        success: true, 
        message: "Domain verified successfully",
        organization: updatedOrg,
        details: verificationResult
      });
    } else {
      return res.status(400).json({ 
        success: false, 
        message: "Domain verification failed",
        details: verificationResult
      });
    }
  } catch (error) {
    console.error("Error verifying domain:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Get organization practitioners (for org admin dashboard)
router.get("/practitioners", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  // Only organization admins can access their organization's practitioners
  if (!req.user.organizationId) {
    return res.status(400).json({ message: "Invalid organization" });
  }

  const orgId = req.user.organizationId;

  try {
    // Query for practitioners that belong to this organization
    const practitioners = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: organizationMembers.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
      })
      .from(users)
      .innerJoin(
        organizationMembers,
        and(
          eq(users.id, organizationMembers.userId),
          eq(organizationMembers.organizationId, orgId)
        )
      )
      .where(eq(users.userType, "practitioner"));

    return res.json(practitioners);
  } catch (error) {
    console.error("Error getting organization practitioners:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Get current user's organization
router.get("/current", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  // User must be in an organization
  const orgId = req.user.organizationId;
  if (!orgId) {
    return res.status(404).json({ message: "No organization found for current user" });
  }

  try {
    const organization = await storage.getOrganization(orgId);
    if (!organization) {
      return res.status(404).json({ message: "Organization not found" });
    }

    return res.json(organization);
  } catch (error) {
    console.error("Error getting current organization:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;