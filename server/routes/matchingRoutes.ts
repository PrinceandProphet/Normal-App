/**
 * API Routes for working with opportunity matches
 */
import { Router } from "express";
import { storage } from "../storage";
import { z } from "zod";

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
      status: z.enum(['pending', 'notified', 'applied', 'approved', 'rejected']).optional(),
      notes: z.string().optional(),
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