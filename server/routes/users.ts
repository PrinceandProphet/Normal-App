import { Router } from "express";
import { storage } from "../storage";
import { z } from "zod";
import { insertUserSchema, insertOrganizationMemberSchema } from "@shared/schema";
import { emailService } from "../services/email";

const router = Router();

// Get all users (admin only)
router.get("/", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  // Only admins and super admins can list all users
  if (req.user.role !== "admin" && req.user.role !== "super_admin") {
    return res.status(403).json({ message: "Access denied" });
  }

  try {
    // Query the database for all users
    const users = await storage.getAllUsers();
    return res.json(users);
  } catch (error) {
    console.error("Error getting users:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Create a new user 
router.post("/", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  // Only super admins can create users without restrictions
  // Org admins can only create users for their organization
  if (req.user.role !== "super_admin" && req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied" });
  }

  try {
    const userData = insertUserSchema.parse(req.body);
    
    // Check if user with this email already exists
    const existingUser = await storage.getUserByEmail(userData.email);
    if (existingUser) {
      return res.status(409).json({ message: "User with this email already exists" });
    }

    // Organization admins can only create users for their own organization
    if (req.user.role === "admin" && userData.organizationId !== req.user.organizationId) {
      return res.status(403).json({ message: "Cannot create user for another organization" });
    }

    // Create the user
    const newUser = await storage.createUser(userData);

    // If organization is specified, add user to that organization
    if (userData.organizationId) {
      const memberData = {
        userId: newUser.id,
        organizationId: userData.organizationId,
        role: userData.role || "user" 
      };
      
      await storage.addOrganizationMember(memberData);
    }

    return res.status(201).json(newUser);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("Error creating user:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Update an existing user
router.patch("/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const userId = parseInt(req.params.id);
  if (isNaN(userId)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  try {
    // Get the user to check permissions
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Permission check:
    // 1. Users can update their own information
    // 2. Admins can update users in their organization
    // 3. Super admins can update any user
    const isSelfUpdate = req.user.id === userId;
    const isOrgAdmin = req.user.role === "admin" && req.user.organizationId === user.organizationId;
    const isSuperAdmin = req.user.role === "super_admin";

    if (!isSelfUpdate && !isOrgAdmin && !isSuperAdmin) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Parse and validate the update data
    const updateData = insertUserSchema.partial().parse(req.body);

    // If not self or super_admin, prevent role elevation
    if (!isSelfUpdate && !isSuperAdmin && updateData.role) {
      if (updateData.role === "super_admin" || (req.user.role !== "super_admin" && updateData.role === "admin")) {
        return res.status(403).json({ message: "Cannot elevate user role" });
      }
    }

    // Update the user
    const updatedUser = await storage.updateUser(userId, updateData);
    
    return res.json(updatedUser);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("Error updating user:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Create a new organization and admin user in one step (super_admin only)
router.post("/create-organization-with-admin", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  // Only super_admin can use this endpoint
  if (req.user.role !== "super_admin") {
    return res.status(403).json({ message: "Access denied: Only super admins can create organizations" });
  }

  try {
    const { organization, adminEmail, adminName, sendEmail } = req.body;
    
    if (!organization || !organization.name || !adminEmail) {
      return res.status(400).json({ 
        message: "Missing required fields", 
        required: ["organization.name", "adminEmail"]
      });
    }

    // Check if admin with this email already exists
    const existingAdmin = await storage.getUserByEmail(adminEmail);
    let adminUser;

    // Create the organization
    const newOrg = await storage.createOrganization(organization);

    // 1. If admin already exists, update their role and add to organization
    if (existingAdmin) {
      adminUser = await storage.updateUser(existingAdmin.id, { 
        role: "admin",
        organizationId: newOrg.id
      });

      // Add to organization_members table
      await storage.addOrganizationMember({
        userId: existingAdmin.id,
        organizationId: newOrg.id,
        role: "admin"
      });
    } 
    // 2. If admin doesn't exist, create a new user
    else {
      // Generate a temporary password
      const tempPassword = Math.random().toString(36).slice(2, 10);
      
      adminUser = await storage.createUser({
        name: adminName || adminEmail.split('@')[0],
        email: adminEmail,
        username: adminEmail, // Use email as username
        password: tempPassword, // This should be hashed by the storage layer
        userType: "practitioner",
        role: "admin",
        organizationId: newOrg.id
      });

      // Add to organization_members table
      await storage.addOrganizationMember({
        userId: adminUser.id,
        organizationId: newOrg.id,
        role: "admin"
      });
    }

    // Send email notification if requested
    if (sendEmail) {
      // Construct the login URL
      const baseUrl = process.env.BASE_URL || `http://${req.headers.host}`;
      const loginUrl = `${baseUrl}/auth`;
      
      await emailService.sendOrganizationInvite(
        adminEmail,
        newOrg.name,
        "Administrator",
        loginUrl
      );
    }

    return res.status(201).json({
      organization: newOrg,
      admin: adminUser
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("Error creating organization with admin:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;