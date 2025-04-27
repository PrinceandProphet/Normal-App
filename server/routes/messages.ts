/**
 * Message routes for the unified client messaging system
 * Supports multiple channels (Email, SMS, Call) with encryption
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { insertMessageSchema } from "@shared/schema";
import { authenticateUser } from "../middleware/auth";

const router = Router();

// Middleware to check if the user has access to the survivor's messages
const checkSurvivorAccess = async (req: Request, res: Response, next: Function) => {
  const { survivorId } = req.params;
  
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  
  // Super admins have access to all survivors
  if (req.user.role === "super_admin") {
    return next();
  }
  
  // If the user is the survivor, they can access their own messages
  if (req.user.userType === "survivor" && req.user.id === parseInt(survivorId)) {
    return next();
  }
  
  // If the user is a practitioner, check if they are in the same organization as the survivor
  if (req.user.userType === "practitioner") {
    try {
      const survivorOrgs = await storage.getSurvivorOrganizations(parseInt(survivorId));
      
      // Get the practitioner's organizations
      const userOrgs = await storage.getOrganizationMembers(req.user.organizationId || 0);
      
      // Check if any of the survivor's organizations match the practitioner's organization
      const hasAccess = survivorOrgs.some(survivorOrg => 
        userOrgs.some(userOrg => userOrg.organizationId === survivorOrg.organizationId)
      );
      
      if (hasAccess) {
        return next();
      }
    } catch (error) {
      console.error("Error checking survivor access:", error);
    }
  }
  
  return res.status(403).json({ error: "You don't have access to this survivor's messages" });
};

// GET /api/messages/survivor/:survivorId - Get all messages for a survivor
router.get("/survivor/:survivorId", authenticateUser, checkSurvivorAccess, async (req, res) => {
  try {
    const { survivorId } = req.params;
    const messages = await storage.getClientMessages(parseInt(survivorId));
    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// GET /api/messages/:id - Get a specific message by ID
router.get("/:id", authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const message = await storage.getMessage(parseInt(id));
    
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }
    
    // Check if the user has access to this message (simplified version)
    if (req.user?.role !== "super_admin" && 
        req.user?.userType !== "practitioner" && 
        req.user?.id !== message.survivorId) {
      return res.status(403).json({ error: "You don't have access to this message" });
    }
    
    res.json(message);
  } catch (error) {
    console.error("Error fetching message:", error);
    res.status(500).json({ error: "Failed to fetch message" });
  }
});

// POST /api/messages - Create a new message
router.post("/", authenticateUser, async (req, res) => {
  try {
    // Validate the request body
    const validatedData = insertMessageSchema.parse(req.body);
    
    // Ensure sentAt is set
    const messageData = {
      ...validatedData,
      sentAt: new Date()
    };
    
    const message = await storage.createMessage(messageData);
    res.status(201).json(message);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Error creating message:", error);
    res.status(500).json({ error: "Failed to create message" });
  }
});

// PATCH /api/messages/:id/read - Mark a message as read
router.patch("/:id/read", authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const message = await storage.markMessageAsRead(parseInt(id));
    res.json(message);
  } catch (error) {
    console.error("Error marking message as read:", error);
    res.status(500).json({ error: "Failed to mark message as read" });
  }
});

// PATCH /api/messages/:id/status - Update a message status
router.patch("/:id/status", authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }
    
    const message = await storage.updateMessageStatus(parseInt(id), status);
    res.json(message);
  } catch (error) {
    console.error("Error updating message status:", error);
    res.status(500).json({ error: "Failed to update message status" });
  }
});

// DELETE /api/messages/:id - Delete a message
router.delete("/:id", authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the message first to check access
    const message = await storage.getMessage(parseInt(id));
    
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }
    
    // Only allow deletion by super_admin or the message owner
    if (req.user?.role !== "super_admin" && req.user?.id !== message.survivorId) {
      return res.status(403).json({ error: "You don't have permission to delete this message" });
    }
    
    await storage.deleteMessage(parseInt(id));
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting message:", error);
    res.status(500).json({ error: "Failed to delete message" });
  }
});

// GET /api/messages/filter - Get messages with filtering
router.get("/filter", authenticateUser, async (req, res) => {
  try {
    const { 
      survivorId, 
      contactId, 
      channel, 
      isRead, 
      parentId, 
      startDate, 
      endDate,
      limit,
      offset
    } = req.query;
    
    // Create filter object with optional parameters
    const filter: any = {};
    
    if (survivorId) filter.survivorId = parseInt(survivorId as string);
    if (contactId) filter.contactId = parseInt(contactId as string);
    if (channel) filter.channel = channel as string;
    if (isRead) filter.isRead = isRead === 'true';
    if (parentId) filter.parentId = parseInt(parentId as string);
    if (startDate) filter.startDate = new Date(startDate as string);
    if (endDate) filter.endDate = new Date(endDate as string);
    if (limit) filter.limit = parseInt(limit as string);
    if (offset) filter.offset = parseInt(offset as string);
    
    const messages = await storage.getMessages(filter);
    res.json(messages);
  } catch (error) {
    console.error("Error filtering messages:", error);
    res.status(500).json({ error: "Failed to filter messages" });
  }
});

export default router;