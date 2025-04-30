/**
 * API Routes for working with opportunity matches
 */
import { Router } from "express";
import { storage } from "../storage";
import { z } from "zod";
import { emailService } from "../services/email-simplified";

const matchingRouter = Router();

// Get all matches for an opportunity
matchingRouter.get("/opportunities/:opportunityId/matches", async (req, res) => {
  try {
    const opportunityId = parseInt(req.params.opportunityId, 10);
    if (isNaN(opportunityId)) {
      return res.status(400).json({ message: "Invalid opportunity ID" });
    }
    
    const matches = await storage.getOpportunityMatches(opportunityId);
    res.json(matches);
  } catch (error) {
    console.error("Error fetching matches for opportunity:", error);
    res.status(500).json({ message: "Failed to fetch opportunity matches" });
  }
});

// Get all matches for a survivor (client)
matchingRouter.get("/survivors/:survivorId/matches", async (req, res) => {
  try {
    const survivorId = parseInt(req.params.survivorId, 10);
    if (isNaN(survivorId)) {
      return res.status(400).json({ message: "Invalid survivor ID" });
    }
    
    const matches = await storage.getOpportunityMatches(undefined, survivorId);
    res.json(matches);
  } catch (error) {
    console.error("Error fetching matches for survivor:", error);
    res.status(500).json({ message: "Failed to fetch survivor matches" });
  }
});

// Get all matches (for admin dashboard)
matchingRouter.get("/matches", async (req, res) => {
  try {
    const matches = await storage.getOpportunityMatches();
    res.json(matches);
  } catch (error) {
    console.error("Error fetching all matches:", error);
    res.status(500).json({ message: "Failed to fetch matches" });
  }
});

// Get a specific match between an opportunity and survivor
matchingRouter.get("/opportunities/:opportunityId/survivors/:survivorId/match", async (req, res) => {
  try {
    const opportunityId = parseInt(req.params.opportunityId, 10);
    const survivorId = parseInt(req.params.survivorId, 10);
    
    if (isNaN(opportunityId) || isNaN(survivorId)) {
      return res.status(400).json({ message: "Invalid opportunity or survivor ID" });
    }
    
    const match = await storage.getOpportunityMatch(opportunityId, survivorId);
    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }
    
    res.json(match);
  } catch (error) {
    console.error("Error fetching specific match:", error);
    res.status(500).json({ message: "Failed to fetch match details" });
  }
});

// Update a match status
matchingRouter.patch("/opportunities/:opportunityId/survivors/:survivorId/match", async (req, res) => {
  try {
    const opportunityId = parseInt(req.params.opportunityId, 10);
    const survivorId = parseInt(req.params.survivorId, 10);
    
    if (isNaN(opportunityId) || isNaN(survivorId)) {
      return res.status(400).json({ message: "Invalid opportunity or survivor ID" });
    }
    
    const updateSchema = z.object({
      status: z.enum(['pending', 'notified', 'applied', 'awarded', 'funded', 'rejected']).optional(),
      notes: z.string().optional(),
      awardAmount: z.number().optional(),
    });
    
    const validationResult = updateSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: "Invalid update data", 
        errors: validationResult.error.errors 
      });
    }
    
    // First check if the match exists
    const existingMatch = await storage.getOpportunityMatch(opportunityId, survivorId);
    if (!existingMatch) {
      return res.status(404).json({ message: "Match not found" });
    }
    
    // Update the match
    const updatedMatch = await storage.updateOpportunityMatch(
      opportunityId,
      survivorId,
      validationResult.data
    );
    
    res.json(updatedMatch);
  } catch (error) {
    console.error("Error updating match:", error);
    res.status(500).json({ message: "Failed to update match" });
  }
});

// Apply for a grant (new endpoint for grant application)
matchingRouter.post("/apply/:opportunityId/survivors/:survivorId", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  try {
    const opportunityId = parseInt(req.params.opportunityId, 10);
    const survivorId = parseInt(req.params.survivorId, 10);
    
    if (isNaN(opportunityId) || isNaN(survivorId)) {
      return res.status(400).json({ message: "Invalid opportunity or survivor ID" });
    }
    
    // First check if the match exists or create one if it doesn't
    let match = await storage.getOpportunityMatch(opportunityId, survivorId);
    const opportunity = await storage.getFundingOpportunity(opportunityId);
    const survivor = await storage.getUser(survivorId);
    
    if (!opportunity) {
      return res.status(404).json({ message: "Funding opportunity not found" });
    }
    
    if (!survivor) {
      return res.status(404).json({ message: "Survivor/client not found" });
    }
    
    if (!match) {
      // Create a new match if one doesn't exist yet
      match = await storage.createOpportunityMatch({
        opportunityId,
        survivorId,
        matchScore: 100, // Direct application so score is 100%
        matchCriteria: { direct_application: true },
        status: "applied",
        appliedAt: new Date(),
        appliedById: req.user.id, // Track the acting user
      });
    } else {
      // Update existing match to applied status
      match = await storage.updateOpportunityMatch(
        opportunityId,
        survivorId,
        {
          status: "applied",
          appliedAt: new Date(),
          appliedById: req.user.id,
        }
      );
    }
    
    // Send confirmation email to the client
    // Only send if the client has an email address
    if (survivor.email) {
      await emailService.sendGrantApplicationConfirmation(
        survivor.email,
        opportunity.name,
        survivor.name,
        opportunity.organizationId
      );
    }
    
    res.json({
      success: true,
      message: "Grant application submitted successfully",
      match
    });
  } catch (error) {
    console.error("Error applying for grant:", error);
    res.status(500).json({ message: "Failed to apply for grant" });
  }
});

// Award a grant
matchingRouter.post("/award/:opportunityId/survivors/:survivorId", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  try {
    const opportunityId = parseInt(req.params.opportunityId, 10);
    const survivorId = parseInt(req.params.survivorId, 10);
    
    if (isNaN(opportunityId) || isNaN(survivorId)) {
      return res.status(400).json({ message: "Invalid opportunity or survivor ID" });
    }
    
    const awardSchema = z.object({
      awardAmount: z.number().min(0, "Award amount must be non-negative"),
      notes: z.string().optional(),
    });
    
    const validationResult = awardSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: "Invalid award data", 
        errors: validationResult.error.errors 
      });
    }
    
    // First check if the match exists and is in applied status
    const match = await storage.getOpportunityMatch(opportunityId, survivorId);
    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }
    
    if (match.status !== "applied") {
      return res.status(400).json({ 
        message: "Cannot award grant that hasn't been applied for", 
        currentStatus: match.status
      });
    }
    
    const opportunity = await storage.getFundingOpportunity(opportunityId);
    const survivor = await storage.getUser(survivorId);
    
    if (!opportunity) {
      return res.status(404).json({ message: "Funding opportunity not found" });
    }
    
    if (!survivor) {
      return res.status(404).json({ message: "Survivor/client not found" });
    }
    
    // Update the match with award data
    const updatedMatch = await storage.updateOpportunityMatch(
      opportunityId,
      survivorId,
      {
        status: "awarded",
        awardedAt: new Date(),
        awardedById: req.user.id,
        awardAmount: validationResult.data.awardAmount,
        notes: validationResult.data.notes || match.notes,
      }
    );
    
    // Add the grant to the capital stack
    await storage.createCapitalSource({
      type: "Grant",
      name: `${opportunity.name} Grant`,
      amount: validationResult.data.awardAmount,
      status: "projected", // Initially projected until funds are released
      description: `Individual assistance grant from ${opportunity.name}`,
      survivorId: survivorId,
      fundingCategory: "individual_assistance",
    });
    
    // Send award email to the client
    // Only send if the client has an email address
    if (survivor.email) {
      await emailService.sendGrantAwardNotification(
        survivor.email,
        opportunity.name,
        survivor.name,
        validationResult.data.awardAmount,
        opportunity.organizationId
      );
    }
    
    res.json({
      success: true,
      message: "Grant awarded successfully",
      match: updatedMatch
    });
  } catch (error) {
    console.error("Error awarding grant:", error);
    res.status(500).json({ message: "Failed to award grant" });
  }
});

// Mark a grant as funded
matchingRouter.post("/fund/:opportunityId/survivors/:survivorId", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  try {
    const opportunityId = parseInt(req.params.opportunityId, 10);
    const survivorId = parseInt(req.params.survivorId, 10);
    
    if (isNaN(opportunityId) || isNaN(survivorId)) {
      return res.status(400).json({ message: "Invalid opportunity or survivor ID" });
    }
    
    // Check if the match exists and is in awarded status
    const match = await storage.getOpportunityMatch(opportunityId, survivorId);
    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }
    
    if (match.status !== "awarded") {
      return res.status(400).json({ 
        message: "Cannot mark as funded a grant that hasn't been awarded", 
        currentStatus: match.status
      });
    }
    
    const opportunity = await storage.getFundingOpportunity(opportunityId);
    const survivor = await storage.getUser(survivorId);
    
    if (!opportunity) {
      return res.status(404).json({ message: "Funding opportunity not found" });
    }
    
    if (!survivor) {
      return res.status(404).json({ message: "Survivor/client not found" });
    }
    
    // Update the match with funded status
    const updatedMatch = await storage.updateOpportunityMatch(
      opportunityId,
      survivorId,
      {
        status: "funded",
        fundedAt: new Date(),
        fundedById: req.user.id,
      }
    );
    
    // Update the capital source from projected to current
    const capitalSources = await storage.getCapitalSources(survivorId);
    const grantSource = capitalSources.find(source => 
      source.type === "Grant" && 
      source.name === `${opportunity.name} Grant` &&
      source.status === "projected"
    );
    
    if (grantSource) {
      await storage.updateCapitalSource(grantSource.id, {
        status: "current" // Update status to current now that funds are available
      });
    }
    
    // Send funding notification email to the client
    // Only send if the client has an email address
    if (survivor.email) {
      await emailService.sendGrantFundingNotification(
        survivor.email,
        opportunity.name,
        survivor.name,
        match.awardAmount,
        opportunity.organizationId
      );
    }
    
    res.json({
      success: true,
      message: "Grant marked as funded successfully",
      match: updatedMatch
    });
  } catch (error) {
    console.error("Error marking grant as funded:", error);
    res.status(500).json({ message: "Failed to mark grant as funded" });
  }
});

// Manually run the matching engine
matchingRouter.post("/run", async (req, res) => {
  try {
    const newMatchCount = await storage.runMatchingEngine();
    res.json({ 
      success: true, 
      message: `Matching process completed successfully. Found ${newMatchCount} new matches.`,
      newMatchCount
    });
  } catch (error) {
    console.error("Error running matching engine:", error);
    res.status(500).json({ message: "Failed to run matching engine" });
  }
});

export default matchingRouter;