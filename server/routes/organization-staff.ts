import { Router } from "express";
import { storage } from "../storage";
import { staffSchema, insertStaffSchema } from "@shared/schema";
import { z } from "zod";
import { emailService } from "../services/email-simplified";

const router = Router();

// Get all staff members for a specific organization
router.get("/organizations/:id/staff", async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = parseInt(id);

    // Check if user is authorized to view this organization's staff
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const currentUser = req.user;
    
    // Only allow access if user is super_admin or admin of this organization
    if (currentUser.role !== "super_admin" && 
        (currentUser.role !== "admin" || currentUser.organizationId !== organizationId)) {
      return res.status(403).json({ message: "Not authorized to view staff for this organization" });
    }

    const staffMembers = await storage.getOrganizationStaff(organizationId);
    return res.json(staffMembers);
  } catch (error) {
    console.error("Error fetching organization staff:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Get a specific staff member
router.get("/organizations/:id/staff/:staffId", async (req, res) => {
  try {
    const { id, staffId } = req.params;
    const organizationId = parseInt(id);
    const staffMemberId = parseInt(staffId);

    // Check if user is authorized
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const currentUser = req.user;
    
    // Only allow access if user is super_admin or admin of this organization
    if (currentUser.role !== "super_admin" && 
        (currentUser.role !== "admin" || currentUser.organizationId !== organizationId)) {
      return res.status(403).json({ message: "Not authorized to view staff for this organization" });
    }

    const staffMember = await storage.getStaffMember(staffMemberId, organizationId);
    
    if (!staffMember) {
      return res.status(404).json({ message: "Staff member not found" });
    }
    
    return res.json(staffMember);
  } catch (error) {
    console.error("Error fetching staff member:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Add a new staff member to an organization
router.post("/organizations/:id/staff", async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = parseInt(id);
    
    // Check if user is authorized
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const currentUser = req.user;
    
    // Only allow access if user is super_admin or admin of this organization
    if (currentUser.role !== "super_admin" && 
        (currentUser.role !== "admin" || currentUser.organizationId !== organizationId)) {
      return res.status(403).json({ message: "Not authorized to add staff to this organization" });
    }

    // Log the request body for debugging
    console.log("Creating staff member with data:", JSON.stringify(req.body, null, 2));
    
    try {
      // Validate request body
      const validatedData = insertStaffSchema.parse(req.body);
      
      // Get the organization name for the email
      const organization = await storage.getOrganization(organizationId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Add the staff member
      const newStaffMember = await storage.addOrganizationStaff({
        ...validatedData,
        organizationId
      });
      
      // Send welcome email to the new staff member
      try {
        await emailService.sendNewStaffWelcome(
          organization.name,
          newStaffMember.email,
          organizationId
        );
        console.log(`Welcome email sent to new staff member: ${newStaffMember.email}`);
      } catch (emailError) {
        // Log the error but don't fail the request
        console.error("Error sending staff welcome email:", emailError);
      }
      
      return res.status(201).json(newStaffMember);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Staff validation error details:", JSON.stringify(error.errors, null, 2));
      }
      throw error;
    }
  } catch (error) {
    console.error("Error adding staff member:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Invalid staff member data", 
        errors: error.errors 
      });
    }
    
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Update a staff member
router.put("/organizations/:id/staff/:staffId", async (req, res) => {
  try {
    const { id, staffId } = req.params;
    const organizationId = parseInt(id);
    const staffMemberId = parseInt(staffId);
    
    // Check if user is authorized
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const currentUser = req.user;
    
    // Only allow access if user is super_admin or admin of this organization
    if (currentUser.role !== "super_admin" && 
        (currentUser.role !== "admin" || currentUser.organizationId !== organizationId)) {
      return res.status(403).json({ message: "Not authorized to update staff in this organization" });
    }

    // First check if the staff member exists
    const existingStaffMember = await storage.getStaffMember(staffMemberId, organizationId);
    
    if (!existingStaffMember) {
      return res.status(404).json({ message: "Staff member not found" });
    }
    
    // Validate request body
    const validatedData = staffSchema.parse({
      ...req.body,
      id: staffMemberId
    });
    
    // Update the staff member
    const updatedStaffMember = await storage.updateOrganizationStaff(validatedData, organizationId);
    
    return res.json(updatedStaffMember);
  } catch (error) {
    console.error("Error updating staff member:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Invalid staff member data", 
        errors: error.errors 
      });
    }
    
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Delete a staff member
router.delete("/organizations/:id/staff/:staffId", async (req, res) => {
  try {
    const { id, staffId } = req.params;
    const organizationId = parseInt(id);
    const staffMemberId = parseInt(staffId);
    
    // Check if user is authorized
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const currentUser = req.user;
    
    // Only allow access if user is super_admin or admin of this organization
    if (currentUser.role !== "super_admin" && 
        (currentUser.role !== "admin" || currentUser.organizationId !== organizationId)) {
      return res.status(403).json({ message: "Not authorized to remove staff from this organization" });
    }

    // First check if the staff member exists
    const existingStaffMember = await storage.getStaffMember(staffMemberId, organizationId);
    
    if (!existingStaffMember) {
      return res.status(404).json({ message: "Staff member not found" });
    }
    
    // Delete the staff member
    await storage.removeOrganizationStaff(staffMemberId, organizationId);
    
    return res.json({ success: true, message: "Staff member successfully removed" });
  } catch (error) {
    console.error("Error removing staff member:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;