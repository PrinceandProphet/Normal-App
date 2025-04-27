import { Router } from "express";
import { storage } from "../storage";
import { insertFundingOpportunitySchema } from "@shared/schema";

const router = Router();

// Get all funding opportunities for the user's organization(s)
router.get("/", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  try {
    // If user is a super admin, get all funding opportunities
    if (req.user?.role === "super_admin") {
      const opportunities = await storage.getFundingOpportunities();
      return res.json(opportunities);
    }
    
    // If user is an organization admin or member, get funding opportunities for their organization
    if (req.user?.organizationId) {
      const opportunities = await storage.getFundingOpportunities(req.user.organizationId);
      return res.json(opportunities);
    }
    
    // If user is a survivor, get public funding opportunities
    const opportunities = await storage.getPublicFundingOpportunities();
    return res.json(opportunities);
  } catch (error) {
    console.error("Error fetching funding opportunities:", error);
    res.status(500).json({ message: "Error fetching funding opportunities" });
  }
});

// Get public funding opportunities (accessible without authentication)
router.get("/public", async (req, res) => {
  try {
    const opportunities = await storage.getPublicFundingOpportunities();
    res.json(opportunities);
  } catch (error) {
    console.error("Error fetching public funding opportunities:", error);
    res.status(500).json({ message: "Error fetching public funding opportunities" });
  }
});

// Get a specific funding opportunity by ID
router.get("/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  try {
    const id = parseInt(req.params.id);
    const opportunity = await storage.getFundingOpportunity(id);
    
    if (!opportunity) {
      return res.status(404).json({ message: "Funding opportunity not found" });
    }
    
    // Check if user has access to this opportunity
    if (
      req.user?.role !== "super_admin" && 
      req.user?.organizationId !== opportunity.organizationId && 
      !opportunity.isPublic
    ) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    res.json(opportunity);
  } catch (error) {
    console.error("Error fetching funding opportunity:", error);
    res.status(500).json({ message: "Error fetching funding opportunity" });
  }
});

// Create a new funding opportunity (admin or super_admin only)
router.post("/", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  try {
    // Only admin or super_admin users can create funding opportunities
    if (req.user?.role !== "admin" && req.user?.role !== "super_admin") {
      return res.status(403).json({ message: "Unauthorized: Admin access required" });
    }
    
    // Ensure the request has an organizationId first (fallback to our demo organization if needed)
    const dataWithOrg = {
      ...req.body,
      organizationId: parseInt(req.body.organizationId) || 6, // Use our demo organization as fallback
      status: req.body.status || "active" // Ensure status field is present
    };
    
    console.log("Preparing data for validation:", JSON.stringify(dataWithOrg, null, 2));
    
    // Parse and validate the request body
    const validatedData = insertFundingOpportunitySchema.safeParse(dataWithOrg);
    if (!validatedData.success) {
      console.error("Validation failed:", JSON.stringify(validatedData.error.format(), null, 2));
      console.error("Received data:", JSON.stringify(dataWithOrg, null, 2));
      return res.status(400).json({ 
        message: "Invalid funding opportunity data", 
        errors: validatedData.error.format() 
      });
    }
    
    // If user is admin (not super_admin), ensure they can only create for their organization
    if (
      req.user.role === "admin" && 
      req.user.organizationId !== validatedData.data.organizationId
    ) {
      return res.status(403).json({ 
        message: "You can only create funding opportunities for your organization" 
      });
    }
    
    console.log("Creating funding opportunity with data:", JSON.stringify(validatedData.data, null, 2));
    const created = await storage.createFundingOpportunity(validatedData.data);
    res.status(201).json(created);
  } catch (error) {
    console.error("Error creating funding opportunity:", error);
    res.status(500).json({ message: "Error creating funding opportunity" });
  }
});

// Update a funding opportunity
router.patch("/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  try {
    const id = parseInt(req.params.id);
    const opportunity = await storage.getFundingOpportunity(id);
    
    if (!opportunity) {
      return res.status(404).json({ message: "Funding opportunity not found" });
    }
    
    // Verify the user has access to update this opportunity
    if (
      req.user?.role !== "super_admin" && 
      (req.user?.role !== "admin" || req.user?.organizationId !== opportunity.organizationId)
    ) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    // Validate the update data
    const validatedData = insertFundingOpportunitySchema.partial().safeParse(req.body);
    if (!validatedData.success) {
      return res.status(400).json({ 
        message: "Invalid funding opportunity data", 
        errors: validatedData.error.format() 
      });
    }
    
    // Prevent organization admins from changing the organizationId
    if (
      req.user?.role === "admin" && 
      validatedData.data.organizationId && 
      validatedData.data.organizationId !== req.user.organizationId
    ) {
      return res.status(403).json({ 
        message: "You cannot transfer a funding opportunity to another organization" 
      });
    }
    
    const updated = await storage.updateFundingOpportunity(id, validatedData.data);
    res.json(updated);
  } catch (error) {
    console.error("Error updating funding opportunity:", error);
    res.status(500).json({ message: "Error updating funding opportunity" });
  }
});

// Delete a funding opportunity
router.delete("/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  try {
    const id = parseInt(req.params.id);
    const opportunity = await storage.getFundingOpportunity(id);
    
    if (!opportunity) {
      return res.status(404).json({ message: "Funding opportunity not found" });
    }
    
    // Verify the user has access to delete this opportunity
    if (
      req.user?.role !== "super_admin" && 
      (req.user?.role !== "admin" || req.user?.organizationId !== opportunity.organizationId)
    ) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    await storage.deleteFundingOpportunity(id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting funding opportunity:", error);
    res.status(500).json({ message: "Error deleting funding opportunity" });
  }
});

export default router;