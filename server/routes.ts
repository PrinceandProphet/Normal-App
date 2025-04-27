import type { Express } from "express";
import { createServer } from "http";
import multer from "multer";
import { storage } from "./storage";
import { documentService } from "./services/documents";
import { 
  insertDocumentSchema, 
  insertContactSchema, 
  insertMessageSchema, 
  insertSystemConfigSchema, 
  insertCapitalSourceSchema,
  insertPropertySchema,
  insertHouseholdGroupSchema,
  insertHouseholdMemberSchema,
  insertUserSchema,
  insertOrganizationSchema,
  insertTaskSchema,
  organizationSurvivors,
  tasks
} from "@shared/schema";
import { db } from "./db";
import { and, eq } from "drizzle-orm";
import path from "path";
import express from 'express';
import { mailslurpService } from "./services/mailslurp";
import { setupAuth } from "./auth";
import organizationRoutes from "./routes/organizations";
import survivorRoutes from "./routes/survivors";
import userRoutes from "./routes/users";
import fundingRoutes from "./routes/funding";

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(process.cwd(), "uploads"));
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Optional: Add file type validation here
    cb(null, true);
  }
});

export async function registerRoutes(app: Express) {
  const server = createServer(app);

  // Set up authentication
  setupAuth(app);

  // Serve uploaded files
  app.use('/uploads', express.static(path.join(process.cwd(), "uploads")));

  // Register modular routes
  app.use("/api/organizations", organizationRoutes);
  app.use("/api/survivors", survivorRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/funding", fundingRoutes);

  // Documents
  app.get("/api/documents", async (req, res) => {
    const documents = await storage.getDocuments();
    res.json(documents);
  });

  app.post("/api/documents", upload.single("file"), async (req, res) => {
    console.log('Upload request received:', {
      body: req.body,
      file: req.file,
      headers: req.headers['content-type']
    });

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    try {
      const docData = await documentService.saveUploadedFile(req.file);
      // Add capital source ID if provided
      if (req.body.capitalSourceId) {
        docData.capitalSourceId = parseInt(req.body.capitalSourceId);
      }
      const document = await storage.createDocument(docData);
      res.status(201).json(document);
    } catch (error) {
      // If anything fails, cleanup the uploaded file
      if (req.file.path) {
        await documentService.deleteFile(req.file.path);
      }
      throw error;
    }
  });

  app.delete("/api/documents/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const doc = await storage.getDocument(id);
    if (doc) {
      await documentService.deleteFile(doc.path);
      await storage.deleteDocument(id);
    }
    res.status(204).send();
  });

  // Contacts
  app.get("/api/contacts", async (req, res) => {
    const contacts = await storage.getContacts();
    res.json(contacts);
  });

  app.post("/api/contacts", async (req, res) => {
    const contact = insertContactSchema.parse(req.body);
    const created = await storage.createContact(contact);
    res.status(201).json(created);
  });

  app.patch("/api/contacts/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const contact = insertContactSchema.partial().parse(req.body);
    const updated = await storage.updateContact(id, contact);
    res.json(updated);
  });

  app.delete("/api/contacts/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteContact(id);
    res.status(204).send();
  });

  // Messages
  app.get("/api/contacts/:contactId/messages", async (req, res) => {
    const contactId = parseInt(req.params.contactId);
    const messages = await storage.getMessages(contactId);
    res.json(messages);
  });

  app.post("/api/messages", async (req, res) => {
    const message = insertMessageSchema.parse(req.body);
    const created = await storage.createMessage(message);
    res.status(201).json(created);
  });

  // Templates
  app.get("/api/templates", async (req, res) => {
    const templates = await storage.getTemplates();
    res.json(templates);
  });

  // Checklists
  app.get("/api/checklists", async (req, res) => {
    const checklists = await storage.getChecklists();
    res.json(checklists);
  });

  app.patch("/api/checklists/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const checklist = await storage.updateChecklist(id, req.body);
    res.json(checklist);
  });

  // System Config
  app.get("/api/system/config", async (req, res) => {
    const config = await storage.getSystemConfig();
    res.json(config || { emailAddress: "", inboxId: "" });
  });

  app.post("/api/system/config/generate", async (req, res) => {
    try {
      const inboxConfig = await mailslurpService.createInbox();
      const updated = await storage.updateSystemConfig(inboxConfig);
      res.json(updated);
    } catch (error) {
      console.error('Failed to create inbox:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to create inbox"
      });
    }
  });
  
  // Update the START framework stage
  app.post("/api/system/config/stage", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // Only allow super_admin or admin to update stage
      if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Not authorized to update system stage" });
      }
      
      const { stage } = req.body;
      
      // Validate stage value
      if (!['S', 'T', 'A', 'R', 'T2'].includes(stage)) {
        return res.status(400).json({ message: "Invalid stage value. Must be one of: S, T, A, R, T2" });
      }
      
      const config = await storage.getSystemConfig();
      
      if (!config) {
        return res.status(404).json({ message: "System configuration not found" });
      }
      
      const updated = await storage.updateSystemConfig({
        ...config,
        stage
      });
      
      res.json(updated);
    } catch (error) {
      console.error('Failed to update system stage:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to update system stage"
      });
    }
  });

  app.post("/api/system/config/generate/phone", async (req, res) => {
    try {
      const phoneConfig = await mailslurpService.createPhone();
      const config = await storage.getSystemConfig();

      const updated = await storage.updateSystemConfig({
        ...config,
        phoneNumber: phoneConfig.phoneNumber,
        phoneId: phoneConfig.phoneId,
      });

      res.json(updated);
    } catch (error) {
      console.error('Failed to create phone number:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to create phone number"
      });
    }
  });

  // Capital Sources
  app.get("/api/capital-sources", async (req, res) => {
    const sources = await storage.getCapitalSources();
    res.json(sources);
  });

  app.post("/api/capital-sources", async (req, res) => {
    const source = insertCapitalSourceSchema.parse(req.body);
    const created = await storage.createCapitalSource(source);
    res.status(201).json(created);
  });

  app.patch("/api/capital-sources/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const source = insertCapitalSourceSchema.partial().parse(req.body);
    const updated = await storage.updateCapitalSource(id, source);
    res.json(updated);
  });

  app.delete("/api/capital-sources/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteCapitalSource(id);
    res.status(204).send();
  });

  //New Endpoint for capital source documents
  app.get("/api/capital-sources/:id/documents", async (req, res) => {
    const id = parseInt(req.params.id);
    const documents = await storage.getDocumentsByCapitalSource(id);
    res.json(documents);
  });

  // Properties
  app.get("/api/properties", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      let properties = [];
      // Check for survivorId query parameter for client-specific filtering
      const survivorId = req.query.survivorId ? parseInt(req.query.survivorId as string) : null;
      
      // Super admins can access all properties
      if (req.user.role === "super_admin") {
        properties = survivorId 
          ? await storage.getProperties(survivorId) 
          : await storage.getProperties();
      } 
      // Practitioners can access properties of survivors in their organization
      else if (req.user.userType === "practitioner" && req.user.organizationId) {
        // Get survivors associated with practitioner's organization
        const relationships = await storage.getOrganizationSurvivors(req.user.organizationId);
        const survivorIds = relationships.map(r => r.survivorId);
        
        // If survivorId is provided and practitioner has access to that survivor
        if (survivorId && survivorIds.includes(survivorId)) {
          properties = await storage.getProperties(survivorId);
        } 
        // Otherwise return properties for all accessible survivors
        else if (!survivorId) {
          // For now, we return all properties
          // In the future, we could filter by all accessible survivor IDs
          properties = await storage.getProperties();
        }
      } 
      // Survivors can access their own properties
      else if (req.user.userType === "survivor") {
        // Either get the specified survivorId (if it matches the current user)
        // or get the current user's properties
        const effectiveSurvivorId = survivorId && survivorId === req.user.id 
          ? survivorId 
          : req.user.id;
          
        properties = await storage.getProperties(effectiveSurvivorId);
      }
      
      res.json(properties);
    } catch (error) {
      console.error("Error getting properties:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/properties", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const property = insertPropertySchema.parse(req.body);
      
      // If survivorId is not provided in the request, check for context
      if (!property.survivorId) {
        // For survivor users, add their own ID as survivorId
        if (req.user.userType === "survivor") {
          property.survivorId = req.user.id;
        }
        // For other cases, survivorId is required as a parameter
        else {
          return res.status(400).json({ 
            message: "Validation error", 
            errors: "survivorId is required when creating a property" 
          });
        }
      }

      const created = await storage.createProperty(property);
      res.status(201).json(created);
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error creating property:", error);
        if (error.name === "ZodError") {
          return res.status(400).json({ message: "Validation error", errors: error.message });
        }
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/properties/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid property ID" });
    }

    try {
      // Get property to check access
      const property = await storage.getProperty(id);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      // Access control checks
      let canAccess = false;
      
      // Super admins can access all properties
      if (req.user.role === "super_admin") {
        canAccess = true;
      }
      // Practitioners can access properties of survivors in their organization
      else if (req.user.userType === "practitioner" && req.user.organizationId && property.survivorId) {
        // Check if the practitioner's organization has access to this survivor
        const [relationship] = await db
          .select()
          .from(organizationSurvivors)
          .where(
            and(
              eq(organizationSurvivors.survivorId, property.survivorId),
              eq(organizationSurvivors.organizationId, req.user.organizationId)
            )
          );
          
        canAccess = !!relationship && relationship.status === "active";
      }
      // Survivors can only access their own properties
      else if (req.user.userType === "survivor") {
        canAccess = property.survivorId === req.user.id;
      }

      if (!canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      const propertyUpdate = insertPropertySchema.partial().parse(req.body);
      // Prevent changing the survivorId to maintain data integrity
      if (propertyUpdate.survivorId !== undefined && propertyUpdate.survivorId !== property.survivorId) {
        return res.status(400).json({ 
          message: "Cannot change property ownership" 
        });
      }
      
      const updated = await storage.updateProperty(id, propertyUpdate);
      res.json(updated);
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error updating property:", error);
        if (error.name === "ZodError") {
          return res.status(400).json({ message: "Validation error", errors: error.message });
        }
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/properties/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid property ID" });
    }

    try {
      // Get property to check access
      const property = await storage.getProperty(id);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      // Access control checks
      let canAccess = false;
      
      // Super admins can delete all properties
      if (req.user.role === "super_admin") {
        canAccess = true;
      }
      // Practitioners need to be admins and have access to the survivor
      else if (req.user.userType === "practitioner" && req.user.role === "admin" && req.user.organizationId && property.survivorId) {
        // Check if the practitioner's organization has access to this survivor
        const [relationship] = await db
          .select()
          .from(organizationSurvivors)
          .where(
            and(
              eq(organizationSurvivors.survivorId, property.survivorId),
              eq(organizationSurvivors.organizationId, req.user.organizationId)
            )
          );
          
        canAccess = !!relationship && relationship.status === "active";
      }
      // Survivors can only delete their own properties
      else if (req.user.userType === "survivor") {
        canAccess = property.survivorId === req.user.id;
      }

      if (!canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteProperty(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting property:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Household Groups
  app.get("/api/household-groups", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const propertyId = req.query.propertyId ? parseInt(req.query.propertyId as string) : undefined;
      
      if (propertyId && isNaN(propertyId)) {
        return res.status(400).json({ message: "Invalid property ID" });
      }

      let groups = [];
      
      // Check for survivorId query parameter for client-specific filtering
      const survivorId = req.query.survivorId ? parseInt(req.query.survivorId as string) : null;
      
      // If a specific property is requested, check access to that property
      if (propertyId) {
        const property = await storage.getProperty(propertyId);
        if (!property) {
          return res.status(404).json({ message: "Property not found" });
        }

        // Access control checks
        let canAccess = false;
        
        // Super admins can access all properties
        if (req.user.role === "super_admin") {
          canAccess = true;
        }
        // Practitioners can access properties of survivors in their organization
        else if (req.user.userType === "practitioner" && req.user.organizationId && property.survivorId) {
          // Check if the practitioner's organization has access to this survivor
          const [relationship] = await db
            .select()
            .from(organizationSurvivors)
            .where(
              and(
                eq(organizationSurvivors.survivorId, property.survivorId),
                eq(organizationSurvivors.organizationId, req.user.organizationId)
              )
            );
            
          canAccess = !!relationship && relationship.status === "active";
        }
        // Survivors can only access their own properties
        else if (req.user.userType === "survivor") {
          canAccess = property.survivorId === req.user.id;
        }

        if (!canAccess) {
          return res.status(403).json({ message: "Access denied" });
        }

        groups = await storage.getHouseholdGroups(propertyId);
      } 
      // If no property specified, apply user-based filtering
      else {
        // Super admins can access all groups, optionally filtered by survivorId
        if (req.user.role === "super_admin") {
          // If survivorId is provided, filter properties by survivorId first
          if (survivorId) {
            const survivorProperties = await storage.getProperties(survivorId);
            const propertyIds = survivorProperties.map(p => p.id);
            const allGroups = await storage.getHouseholdGroups();
            groups = allGroups.filter(g => g.propertyId && propertyIds.includes(g.propertyId));
          } else {
            groups = await storage.getHouseholdGroups();
          }
        } 
        // Practitioners can only access groups of properties for survivors in their organization
        else if (req.user.userType === "practitioner" && req.user.organizationId) {
          // Get survivors associated with practitioner's organization
          const relationships = await storage.getOrganizationSurvivors(req.user.organizationId);
          let filteredSurvivorIds = relationships.map(r => r.survivorId);
          
          // If survivorId is provided and practitioner has access to that survivor
          if (survivorId) {
            if (filteredSurvivorIds.includes(survivorId)) {
              filteredSurvivorIds = [survivorId];
            } else {
              return res.status(403).json({ message: "Access denied to this survivor" });
            }
          }
          
          // Get properties for these survivors
          let accessibleProperties = [];
          for (const id of filteredSurvivorIds) {
            const props = await storage.getProperties(id);
            accessibleProperties = [...accessibleProperties, ...props];
          }
          
          const propertyIds = accessibleProperties.map(p => p.id);
          
          // Get groups for these properties
          const allGroups = await storage.getHouseholdGroups();
          groups = allGroups.filter(g => g.propertyId && propertyIds.includes(g.propertyId));
        }
        // Survivors can only access their own household groups
        else if (req.user.userType === "survivor") {
          const effectiveSurvivorId = survivorId && survivorId === req.user.id 
            ? survivorId 
            : req.user.id;
            
          const survivorProperties = await storage.getProperties(effectiveSurvivorId);
          const propertyIds = survivorProperties.map(p => p.id);
          const allGroups = await storage.getHouseholdGroups();
          groups = allGroups.filter(g => g.propertyId && propertyIds.includes(g.propertyId));
        }
      }
      
      res.json(groups);
    } catch (error) {
      console.error("Error getting household groups:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/household-groups", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const groupData = insertHouseholdGroupSchema.parse(req.body);
      
      // Check property access if propertyId is provided
      if (groupData.propertyId) {
        const property = await storage.getProperty(groupData.propertyId);
        if (!property) {
          return res.status(404).json({ message: "Property not found" });
        }

        // Access control checks
        let canAccess = false;
        
        // Super admins can access all properties
        if (req.user.role === "super_admin") {
          canAccess = true;
        }
        // Practitioners can access properties of survivors in their organization
        else if (req.user.userType === "practitioner" && req.user.organizationId && property.survivorId) {
          // Check if the practitioner's organization has access to this survivor
          const [relationship] = await db
            .select()
            .from(organizationSurvivors)
            .where(
              and(
                eq(organizationSurvivors.survivorId, property.survivorId),
                eq(organizationSurvivors.organizationId, req.user.organizationId)
              )
            );
            
          canAccess = !!relationship && relationship.status === "active";
        }
        // Survivors can only access their own properties
        else if (req.user.userType === "survivor") {
          canAccess = property.survivorId === req.user.id;
        }

        if (!canAccess) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const created = await storage.createHouseholdGroup(groupData);
      res.status(201).json(created);
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error creating household group:", error);
        if (error.name === "ZodError") {
          return res.status(400).json({ message: "Validation error", errors: error.message });
        }
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/household-groups/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid group ID" });
    }

    try {
      // Get the group to check access
      const group = await storage.getHouseholdGroup(id);
      if (!group) {
        return res.status(404).json({ message: "Household group not found" });
      }

      // If group is associated with a property, check property access
      if (group.propertyId) {
        const property = await storage.getProperty(group.propertyId);
        if (property) {
          // Access control checks
          let canAccess = false;
          
          // Super admins can access all properties
          if (req.user.role === "super_admin") {
            canAccess = true;
          }
          // Practitioners can access properties of survivors in their organization
          else if (req.user.userType === "practitioner" && req.user.organizationId && property.survivorId) {
            // Check if the practitioner's organization has access to this survivor
            const [relationship] = await db
              .select()
              .from(organizationSurvivors)
              .where(
                and(
                  eq(organizationSurvivors.survivorId, property.survivorId),
                  eq(organizationSurvivors.organizationId, req.user.organizationId)
                )
              );
              
            canAccess = !!relationship && relationship.status === "active";
          }
          // Survivors can only access their own properties
          else if (req.user.userType === "survivor") {
            canAccess = property.survivorId === req.user.id;
          }

          if (!canAccess) {
            return res.status(403).json({ message: "Access denied" });
          }
        }
      }

      const groupUpdate = insertHouseholdGroupSchema.partial().parse(req.body);
      
      // If propertyId is being updated, check access to the new property
      if (groupUpdate.propertyId && groupUpdate.propertyId !== group.propertyId) {
        const property = await storage.getProperty(groupUpdate.propertyId);
        if (!property) {
          return res.status(404).json({ message: "New property not found" });
        }

        // Access control checks
        let canAccess = false;
        
        // Super admins can access all properties
        if (req.user.role === "super_admin") {
          canAccess = true;
        }
        // Practitioners can access properties of survivors in their organization
        else if (req.user.userType === "practitioner" && req.user.organizationId && property.survivorId) {
          // Check if the practitioner's organization has access to this survivor
          const [relationship] = await db
            .select()
            .from(organizationSurvivors)
            .where(
              and(
                eq(organizationSurvivors.survivorId, property.survivorId),
                eq(organizationSurvivors.organizationId, req.user.organizationId)
              )
            );
            
          canAccess = !!relationship && relationship.status === "active";
        }
        // Survivors can only access their own properties
        else if (req.user.userType === "survivor") {
          canAccess = property.survivorId === req.user.id;
        }

        if (!canAccess) {
          return res.status(403).json({ message: "Access denied to new property" });
        }
      }

      const updated = await storage.updateHouseholdGroup(id, groupUpdate);
      res.json(updated);
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error updating household group:", error);
        if (error.name === "ZodError") {
          return res.status(400).json({ message: "Validation error", errors: error.message });
        }
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/household-groups/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid group ID" });
    }

    try {
      // Get the group to check access
      const group = await storage.getHouseholdGroup(id);
      if (!group) {
        return res.status(404).json({ message: "Household group not found" });
      }

      // If group is associated with a property, check property access
      if (group.propertyId) {
        const property = await storage.getProperty(group.propertyId);
        if (property) {
          // Access control checks
          let canAccess = false;
          
          // Super admins can access all properties
          if (req.user.role === "super_admin") {
            canAccess = true;
          }
          // Admin practitioners can access properties of survivors in their organization
          else if ((req.user.role === "admin") && req.user.userType === "practitioner" && req.user.organizationId && property.survivorId) {
            // Check if the practitioner's organization has access to this survivor
            const [relationship] = await db
              .select()
              .from(organizationSurvivors)
              .where(
                and(
                  eq(organizationSurvivors.survivorId, property.survivorId),
                  eq(organizationSurvivors.organizationId, req.user.organizationId)
                )
              );
              
            canAccess = !!relationship && relationship.status === "active";
          }
          // Survivors can only access their own properties
          else if (req.user.userType === "survivor") {
            canAccess = property.survivorId === req.user.id;
          }

          if (!canAccess) {
            return res.status(403).json({ message: "Access denied" });
          }
        }
      }

      await storage.deleteHouseholdGroup(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting household group:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Household Members
  app.get("/api/household-members", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const groupId = req.query.groupId ? parseInt(req.query.groupId as string) : undefined;
      const survivorId = req.query.survivorId ? parseInt(req.query.survivorId as string) : null;
      
      if (groupId && isNaN(groupId)) {
        return res.status(400).json({ message: "Invalid group ID" });
      }
      
      if (survivorId && isNaN(survivorId)) {
        return res.status(400).json({ message: "Invalid survivor ID" });
      }

      let members = [];
      
      // If a specific group is requested, check access to that group
      if (groupId) {
        const group = await storage.getHouseholdGroup(groupId);
        if (!group) {
          return res.status(404).json({ message: "Household group not found" });
        }

        // Check access to the property this group belongs to
        if (group.propertyId) {
          const property = await storage.getProperty(group.propertyId);
          if (property) {
            // Access control checks
            let canAccess = false;
            
            // Super admins can access all properties
            if (req.user.role === "super_admin") {
              canAccess = true;
            }
            // Practitioners can access properties of survivors in their organization
            else if (req.user.userType === "practitioner" && req.user.organizationId && property.survivorId) {
              // Check if the practitioner's organization has access to this survivor
              const [relationship] = await db
                .select()
                .from(organizationSurvivors)
                .where(
                  and(
                    eq(organizationSurvivors.survivorId, property.survivorId),
                    eq(organizationSurvivors.organizationId, req.user.organizationId)
                  )
                );
                
              canAccess = !!relationship && relationship.status === "active";
            }
            // Survivors can only access their own properties
            else if (req.user.userType === "survivor") {
              canAccess = property.survivorId === req.user.id;
            }

            if (!canAccess) {
              return res.status(403).json({ message: "Access denied" });
            }
          }
        }

        members = await storage.getHouseholdMembers(groupId);
      } 
      // If no group specified, apply user-based filtering
      else {
        // Super admins can access all members, optionally filtered by survivorId
        if (req.user.role === "super_admin") {
          if (survivorId) {
            // Get properties for this survivor
            const survivorProperties = await storage.getProperties(survivorId);
            const propertyIds = survivorProperties.map(p => p.id);
            
            // Get groups for these properties
            const allGroups = await storage.getHouseholdGroups();
            const survivorGroups = allGroups.filter(g => g.propertyId && propertyIds.includes(g.propertyId));
            const groupIds = survivorGroups.map(g => g.id);
            
            // Get members for these groups
            const allMembers = await storage.getHouseholdMembers();
            members = allMembers.filter(m => m.groupId && groupIds.includes(m.groupId));
          } else {
            members = await storage.getHouseholdMembers();
          }
        } 
        // Practitioners can only access members of groups in properties of survivors in their organization
        else if (req.user.userType === "practitioner" && req.user.organizationId) {
          // Get survivors associated with practitioner's organization
          const relationships = await storage.getOrganizationSurvivors(req.user.organizationId);
          let filteredSurvivorIds = relationships.map(r => r.survivorId);
          
          // If survivorId is provided and practitioner has access to that survivor
          if (survivorId) {
            if (filteredSurvivorIds.includes(survivorId)) {
              filteredSurvivorIds = [survivorId];
            } else {
              return res.status(403).json({ message: "Access denied to this survivor" });
            }
          }
          
          // Get properties for these survivors
          let accessibleProperties = [];
          for (const id of filteredSurvivorIds) {
            const props = await storage.getProperties(id);
            accessibleProperties = [...accessibleProperties, ...props];
          }
          
          const propertyIds = accessibleProperties.map(p => p.id);
          
          // Get groups for these properties
          const allGroups = await storage.getHouseholdGroups();
          const accessibleGroups = allGroups.filter(g => g.propertyId && propertyIds.includes(g.propertyId));
          const groupIds = accessibleGroups.map(g => g.id);
          
          // Get members for these groups
          const allMembers = await storage.getHouseholdMembers();
          members = allMembers.filter(m => m.groupId && groupIds.includes(m.groupId));
        }
        // Survivors can only access their own household members
        else if (req.user.userType === "survivor") {
          // Either use the provided survivorId (if it matches the user) or the user's ID
          const effectiveSurvivorId = survivorId && survivorId === req.user.id 
            ? survivorId 
            : req.user.id;
            
          // Get properties for this survivor
          const survivorProperties = await storage.getProperties(effectiveSurvivorId);
          const propertyIds = survivorProperties.map(p => p.id);
          
          // Get groups for these properties
          const allGroups = await storage.getHouseholdGroups();
          const survivorGroups = allGroups.filter(g => g.propertyId && propertyIds.includes(g.propertyId));
          const groupIds = survivorGroups.map(g => g.id);
          
          // Get members for these groups
          const allMembers = await storage.getHouseholdMembers();
          members = allMembers.filter(m => m.groupId && groupIds.includes(m.groupId));
        }
      }
      
      res.json(members);
    } catch (error) {
      console.error("Error getting household members:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/household-members", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const memberData = insertHouseholdMemberSchema.parse(req.body);
      
      // Check group access if groupId is provided
      if (memberData.groupId) {
        const group = await storage.getHouseholdGroup(memberData.groupId);
        if (!group) {
          return res.status(404).json({ message: "Household group not found" });
        }

        // Check access to the property this group belongs to
        if (group.propertyId) {
          const property = await storage.getProperty(group.propertyId);
          if (property) {
            // Access control checks
            let canAccess = false;
            
            // Super admins can access all properties
            if (req.user.role === "super_admin") {
              canAccess = true;
            }
            // Practitioners can access properties of survivors in their organization
            else if (req.user.userType === "practitioner" && req.user.organizationId && property.survivorId) {
              // Check if the practitioner's organization has access to this survivor
              const [relationship] = await db
                .select()
                .from(organizationSurvivors)
                .where(
                  and(
                    eq(organizationSurvivors.survivorId, property.survivorId),
                    eq(organizationSurvivors.organizationId, req.user.organizationId)
                  )
                );
                
              canAccess = !!relationship && relationship.status === "active";
            }
            // Survivors can only access their own properties
            else if (req.user.userType === "survivor") {
              canAccess = property.survivorId === req.user.id;
            }

            if (!canAccess) {
              return res.status(403).json({ message: "Access denied" });
            }
          }
        }
      }

      const created = await storage.createHouseholdMember(memberData);
      res.status(201).json(created);
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error creating household member:", error);
        if (error.name === "ZodError") {
          return res.status(400).json({ message: "Validation error", errors: error.message });
        }
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/household-members/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid member ID" });
    }

    try {
      // Get the member to check access
      const member = await storage.getHouseholdMember(id);
      if (!member) {
        return res.status(404).json({ message: "Household member not found" });
      }

      // If member is associated with a group, check group access
      if (member.groupId) {
        const group = await storage.getHouseholdGroup(member.groupId);
        if (group && group.propertyId) {
          const property = await storage.getProperty(group.propertyId);
          if (property) {
            // Access control checks
            let canAccess = false;
            
            // Super admins can access all properties
            if (req.user.role === "super_admin") {
              canAccess = true;
            }
            // Practitioners can access properties of survivors in their organization
            else if (req.user.userType === "practitioner" && req.user.organizationId && property.survivorId) {
              // Check if the practitioner's organization has access to this survivor
              const [relationship] = await db
                .select()
                .from(organizationSurvivors)
                .where(
                  and(
                    eq(organizationSurvivors.survivorId, property.survivorId),
                    eq(organizationSurvivors.organizationId, req.user.organizationId)
                  )
                );
                
              canAccess = !!relationship && relationship.status === "active";
            }
            // Survivors can only access their own properties
            else if (req.user.userType === "survivor") {
              canAccess = property.survivorId === req.user.id;
            }

            if (!canAccess) {
              return res.status(403).json({ message: "Access denied" });
            }
          }
        }
      }

      const memberUpdate = insertHouseholdMemberSchema.partial().parse(req.body);
      
      // If groupId is being updated, check access to the new group
      if (memberUpdate.groupId && memberUpdate.groupId !== member.groupId) {
        const group = await storage.getHouseholdGroup(memberUpdate.groupId);
        if (!group) {
          return res.status(404).json({ message: "New household group not found" });
        }

        if (group.propertyId) {
          const property = await storage.getProperty(group.propertyId);
          if (property) {
            // Access control checks
            let canAccess = false;
            
            // Super admins can access all properties
            if (req.user.role === "super_admin") {
              canAccess = true;
            }
            // Practitioners can access properties of survivors in their organization
            else if (req.user.userType === "practitioner" && req.user.organizationId && property.survivorId) {
              // Check if the practitioner's organization has access to this survivor
              const [relationship] = await db
                .select()
                .from(organizationSurvivors)
                .where(
                  and(
                    eq(organizationSurvivors.survivorId, property.survivorId),
                    eq(organizationSurvivors.organizationId, req.user.organizationId)
                  )
                );
                
              canAccess = !!relationship && relationship.status === "active";
            }
            // Survivors can only access their own properties
            else if (req.user.userType === "survivor") {
              canAccess = property.survivorId === req.user.id;
            }

            if (!canAccess) {
              return res.status(403).json({ message: "Access denied to new group" });
            }
          }
        }
      }

      const updated = await storage.updateHouseholdMember(id, memberUpdate);
      res.json(updated);
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error updating household member:", error);
        if (error.name === "ZodError") {
          return res.status(400).json({ message: "Validation error", errors: error.message });
        }
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/household-members/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid member ID" });
    }

    try {
      // Get the member to check access
      const member = await storage.getHouseholdMember(id);
      if (!member) {
        return res.status(404).json({ message: "Household member not found" });
      }

      // If member is associated with a group, check group access
      if (member.groupId) {
        const group = await storage.getHouseholdGroup(member.groupId);
        if (group && group.propertyId) {
          const property = await storage.getProperty(group.propertyId);
          if (property) {
            // Access control checks
            let canAccess = false;
            
            // Super admins can access all properties
            if (req.user.role === "super_admin") {
              canAccess = true;
            }
            // Admin practitioners can access properties of survivors in their organization
            else if ((req.user.role === "admin") && req.user.userType === "practitioner" && req.user.organizationId && property.survivorId) {
              // Check if the practitioner's organization has access to this survivor
              const [relationship] = await db
                .select()
                .from(organizationSurvivors)
                .where(
                  and(
                    eq(organizationSurvivors.survivorId, property.survivorId),
                    eq(organizationSurvivors.organizationId, req.user.organizationId)
                  )
                );
                
              canAccess = !!relationship && relationship.status === "active";
            }
            // Survivors can only access their own properties
            else if (req.user.userType === "survivor") {
              canAccess = property.survivorId === req.user.id;
            }

            if (!canAccess) {
              return res.status(403).json({ message: "Access denied" });
            }
          }
        }
      }

      await storage.deleteHouseholdMember(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting household member:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Action Plan Tasks
  app.get("/api/action-plan/tasks", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      let tasks = [];
      
      // Super admins can access all tasks
      if (req.user.role === "super_admin") {
        tasks = await storage.getTasks();
      } 
      // Practitioners can only access tasks related to survivors in their organization
      else if (req.user.userType === "practitioner" && req.user.organizationId) {
        // Get survivors associated with practitioner's organization
        const relationships = await storage.getOrganizationSurvivors(req.user.organizationId);
        const survivorIds = relationships.map(r => r.survivorId);
        
        // Get tasks for these survivors
        const allTasks = await storage.getTasks();
        tasks = allTasks.filter(task => 
          task.assignedToId && 
          survivorIds.includes(task.assignedToId) && 
          task.assignedToType === "survivor"
        );
      } 
      // Survivors can only access their own tasks
      else if (req.user.userType === "survivor") {
        const allTasks = await storage.getTasks();
        tasks = allTasks.filter(task => 
          (task.assignedToId === req.user.id && task.assignedToType === "survivor") ||
          (task.createdById === req.user.id && task.createdByType === "survivor")
        );
      }
      
      res.json(tasks);
    } catch (error) {
      console.error("Error getting tasks:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Create initial tasks for a user if they don't exist
  app.post("/api/action-plan/initialize-tasks", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      // Check if any secure_stabilize stage tasks already exist
      const existingS_Tasks = await db.query.tasks.findMany({
        where: eq(tasks.stage, "secure_stabilize")
      });
      
      // If there are already 4 tasks for the stage, return them without creating more
      if (existingS_Tasks.length >= 4) {
        console.log('Tasks already exist for stage secure_stabilize:', existingS_Tasks.length);
        return res.json({ 
          message: "Tasks already exist", 
          tasks: existingS_Tasks 
        });
      }
      
      // Stage S initial tasks
      const initialTasks = [
        { 
          text: "Locate safe temporary shelter", 
          completed: false, 
          urgent: true, 
          stage: "secure_stabilize", // Using the enum value from schema
          createdById: req.user.id,
          createdByType: req.user.userType,
          assignedToId: req.user.id,
          assignedToType: req.user.userType,
          subtasks: "[]" // Empty JSON array for subtasks
        },
        { 
          text: "Register with FEMA", 
          completed: false, 
          urgent: true, 
          stage: "secure_stabilize", // Using the enum value from schema
          createdById: req.user.id,
          createdByType: req.user.userType,
          assignedToId: req.user.id,
          assignedToType: req.user.userType,
          subtasks: "[]" // Empty JSON array for subtasks
        },
        { 
          text: "Address immediate medical needs", 
          completed: false, 
          urgent: true, 
          stage: "secure_stabilize", // Using the enum value from schema
          createdById: req.user.id,
          createdByType: req.user.userType,
          assignedToId: req.user.id,
          assignedToType: req.user.userType,
          subtasks: "[]" // Empty JSON array for subtasks
        },
        { 
          text: "Secure food and water supply", 
          completed: false, 
          urgent: true, 
          stage: "secure_stabilize", // Using the enum value from schema
          createdById: req.user.id,
          createdByType: req.user.userType,
          assignedToId: req.user.id,
          assignedToType: req.user.userType,
          subtasks: "[]" // Empty JSON array for subtasks
        }
      ];
      
      // Create tasks in database
      const createdTasks = [];
      for (const task of initialTasks) {
        const created = await storage.createTask(task);
        createdTasks.push(created);
      }
      
      res.status(201).json({ message: "Initial tasks created", tasks: createdTasks });
    } catch (error) {
      console.error("Error initializing tasks:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/action-plan/tasks", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const taskData = insertTaskSchema.parse(req.body);
      
      // Add creator information
      taskData.createdById = req.user.id;
      taskData.createdByType = req.user.userType;
      
      // Initialize empty subtasks array if not provided
      if (!taskData.subtasks) {
        taskData.subtasks = "[]";
      }
      
      // Check assignment permissions if task is being assigned
      if (taskData.assignedToId && taskData.assignedToType) {
        // If assigning to a survivor, check that the practitioner has access to this survivor
        if (taskData.assignedToType === "survivor" && req.user.userType === "practitioner") {
          const relationships = await storage.getOrganizationSurvivors(req.user.organizationId);
          const hasSurvivorAccess = relationships.some(r => r.survivorId === taskData.assignedToId);
          
          if (!hasSurvivorAccess && req.user.role !== "super_admin") {
            return res.status(403).json({ message: "You don't have permission to assign tasks to this survivor" });
          }
        }
        
        // If assigning to a practitioner, check that they are in the same organization
        if (taskData.assignedToType === "practitioner" && req.user.userType === "practitioner") {
          const assignedUser = await storage.getUser(taskData.assignedToId);
          
          if (!assignedUser || assignedUser.organizationId !== req.user.organizationId && req.user.role !== "super_admin") {
            return res.status(403).json({ message: "You don't have permission to assign tasks to this practitioner" });
          }
        }
      }

      const created = await storage.createTask(taskData);
      res.status(201).json(created);
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error creating task:", error);
        if (error.name === "ZodError") {
          return res.status(400).json({ message: "Validation error", errors: error.message });
        }
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/action-plan/tasks/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    try {
      // Get the task to check access
      const task = await storage.getTask(id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Check access permissions
      let hasAccess = false;
      
      // Super admin has access to all tasks
      if (req.user.role === "super_admin") {
        hasAccess = true;
      }
      // Task creator has access
      else if (task.createdById === req.user.id && task.createdByType === req.user.userType) {
        hasAccess = true;
      }
      // Task assignee has access
      else if (task.assignedToId === req.user.id && task.assignedToType === req.user.userType) {
        hasAccess = true;
      }
      // Practitioners have access to tasks assigned to survivors in their organization
      else if (req.user.userType === "practitioner" && req.user.organizationId && 
               task.assignedToType === "survivor") {
        const relationships = await storage.getOrganizationSurvivors(req.user.organizationId);
        hasAccess = relationships.some(r => r.survivorId === task.assignedToId);
      }

      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      const taskUpdate = insertTaskSchema.partial().parse(req.body);
      
      // Check assignment permissions if task assignee is being changed
      if (taskUpdate.assignedToId && taskUpdate.assignedToType && 
         (taskUpdate.assignedToId !== task.assignedToId || taskUpdate.assignedToType !== task.assignedToType)) {
        
        // If assigning to a survivor, check that the practitioner has access to this survivor
        if (taskUpdate.assignedToType === "survivor" && req.user.userType === "practitioner") {
          const relationships = await storage.getOrganizationSurvivors(req.user.organizationId);
          const hasSurvivorAccess = relationships.some(r => r.survivorId === taskUpdate.assignedToId);
          
          if (!hasSurvivorAccess && req.user.role !== "super_admin") {
            return res.status(403).json({ message: "You don't have permission to assign tasks to this survivor" });
          }
        }
        
        // If assigning to a practitioner, check that they are in the same organization
        if (taskUpdate.assignedToType === "practitioner" && req.user.userType === "practitioner") {
          const assignedUser = await storage.getUser(taskUpdate.assignedToId);
          
          if (!assignedUser || assignedUser.organizationId !== req.user.organizationId && req.user.role !== "super_admin") {
            return res.status(403).json({ message: "You don't have permission to assign tasks to this practitioner" });
          }
        }
      }

      const updated = await storage.updateTask(id, taskUpdate);
      res.json(updated);
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error updating task:", error);
        if (error.name === "ZodError") {
          return res.status(400).json({ message: "Validation error", errors: error.message });
        }
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/action-plan/tasks/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    try {
      // Get the task to check access
      const task = await storage.getTask(id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Check delete permissions
      let canDelete = false;
      
      // Super admin can delete any task
      if (req.user.role === "super_admin") {
        canDelete = true;
      }
      // Organization admin can delete tasks related to their organization
      else if (req.user.role === "admin" && req.user.userType === "practitioner" && req.user.organizationId) {
        if (task.createdByType === "practitioner") {
          const creator = await storage.getUser(task.createdById);
          if (creator && creator.organizationId === req.user.organizationId) {
            canDelete = true;
          }
        } 
        else if (task.assignedToType === "survivor") {
          const relationships = await storage.getOrganizationSurvivors(req.user.organizationId);
          canDelete = relationships.some(r => r.survivorId === task.assignedToId);
        }
      }
      // Task creator can delete their own tasks
      else if (task.createdById === req.user.id && task.createdByType === req.user.userType) {
        canDelete = true;
      }

      if (!canDelete) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteTask(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  return server;
}