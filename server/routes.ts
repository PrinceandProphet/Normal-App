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
  insertTaskSchema
} from "@shared/schema";
import path from "path";
import express from 'express';
import { mailslurpService } from "./services/mailslurp";
import { setupAuth } from "./auth";
import organizationRoutes from "./routes/organizations";
import survivorRoutes from "./routes/survivors";

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
      
      // Super admins can access all properties
      if (req.user.role === "super_admin") {
        properties = await storage.getProperties();
      } 
      // Practitioners can access properties of survivors in their organization
      else if (req.user.userType === "practitioner" && req.user.organizationId) {
        // Get survivors associated with practitioner's organization
        const relationships = await storage.getOrganizationSurvivors(req.user.organizationId);
        const survivorIds = relationships.map(r => r.survivorId);
        
        // Get properties associated with these survivors
        // For now, returning all properties until we add survivor-property relationship
        // TODO: Implement filtering based on survivor-property relationship
        properties = await storage.getProperties();
      } 
      // Survivors can access their own properties
      else if (req.user.userType === "survivor") {
        // Get survivor's properties
        // TODO: Implement filtering based on survivor-property relationship
        properties = await storage.getProperties();
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
      
      // Add property with organization context for practitioners
      if (req.user.userType === "practitioner" && req.user.organizationId) {
        property.organizationId = req.user.organizationId;
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

      // Access control: Super admins can access all properties
      // Organization admins can only access properties of their organization
      const canAccess = 
        req.user.role === "super_admin" ||
        (req.user.organizationId && property.organizationId === req.user.organizationId);

      if (!canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      const propertyUpdate = insertPropertySchema.partial().parse(req.body);
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

      // Access control: Super admins can delete any property
      // Organization admins can only delete properties of their organization
      const canAccess = 
        req.user.role === "super_admin" ||
        (req.user.role === "admin" && req.user.organizationId && property.organizationId === req.user.organizationId);

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
      
      // If a specific property is requested, check access to that property
      if (propertyId) {
        const property = await storage.getProperty(propertyId);
        if (!property) {
          return res.status(404).json({ message: "Property not found" });
        }

        // Check access to this property
        const canAccess = 
          req.user.role === "super_admin" ||
          (req.user.organizationId && property.organizationId === req.user.organizationId);

        if (!canAccess) {
          return res.status(403).json({ message: "Access denied" });
        }

        groups = await storage.getHouseholdGroups(propertyId);
      } 
      // If no property specified, apply user-based filtering
      else {
        // Super admins can access all groups
        if (req.user.role === "super_admin") {
          groups = await storage.getHouseholdGroups();
        } 
        // Practitioners can only access groups of properties in their organization
        else if (req.user.userType === "practitioner" && req.user.organizationId) {
          // Get all properties for this organization
          const allProperties = await storage.getProperties();
          const orgProperties = allProperties.filter(p => p.organizationId === req.user.organizationId);
          const orgPropertyIds = orgProperties.map(p => p.id);
          
          // Get groups for these properties
          const allGroups = await storage.getHouseholdGroups();
          groups = allGroups.filter(g => g.propertyId && orgPropertyIds.includes(g.propertyId));
        }
        // Survivors can only access their own household groups
        else if (req.user.userType === "survivor") {
          // TODO: Implement survivor-specific filtering
          groups = await storage.getHouseholdGroups();
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

        // Check access to this property
        const canAccess = 
          req.user.role === "super_admin" ||
          (req.user.organizationId && property.organizationId === req.user.organizationId);

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
          // Check access to this property
          const canAccess = 
            req.user.role === "super_admin" ||
            (req.user.organizationId && property.organizationId === req.user.organizationId);

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

        // Check access to this property
        const canAccess = 
          req.user.role === "super_admin" ||
          (req.user.organizationId && property.organizationId === req.user.organizationId);

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
          // Check access to this property
          const canAccess = 
            req.user.role === "super_admin" ||
            (req.user.role === "admin" && req.user.organizationId && property.organizationId === req.user.organizationId);

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
      
      if (groupId && isNaN(groupId)) {
        return res.status(400).json({ message: "Invalid group ID" });
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
            // Check access to this property
            const canAccess = 
              req.user.role === "super_admin" ||
              (req.user.organizationId && property.organizationId === req.user.organizationId);

            if (!canAccess) {
              return res.status(403).json({ message: "Access denied" });
            }
          }
        }

        members = await storage.getHouseholdMembers(groupId);
      } 
      // If no group specified, apply user-based filtering
      else {
        // Super admins can access all members
        if (req.user.role === "super_admin") {
          members = await storage.getHouseholdMembers();
        } 
        // Practitioners can only access members of groups in their organization's properties
        else if (req.user.userType === "practitioner" && req.user.organizationId) {
          // Get all properties for this organization
          const allProperties = await storage.getProperties();
          const orgProperties = allProperties.filter(p => p.organizationId === req.user.organizationId);
          const orgPropertyIds = orgProperties.map(p => p.id);
          
          // Get groups for these properties
          const allGroups = await storage.getHouseholdGroups();
          const orgGroups = allGroups.filter(g => g.propertyId && orgPropertyIds.includes(g.propertyId));
          const orgGroupIds = orgGroups.map(g => g.id);
          
          // Get members for these groups
          const allMembers = await storage.getHouseholdMembers();
          members = allMembers.filter(m => m.groupId && orgGroupIds.includes(m.groupId));
        }
        // Survivors can only access their own household members
        else if (req.user.userType === "survivor") {
          // TODO: Implement survivor-specific filtering
          members = await storage.getHouseholdMembers();
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
            // Check access to this property
            const canAccess = 
              req.user.role === "super_admin" ||
              (req.user.organizationId && property.organizationId === req.user.organizationId);

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
            // Check access to this property
            const canAccess = 
              req.user.role === "super_admin" ||
              (req.user.organizationId && property.organizationId === req.user.organizationId);

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
            // Check access to this property
            const canAccess = 
              req.user.role === "super_admin" ||
              (req.user.organizationId && property.organizationId === req.user.organizationId);

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
            // Check access to this property
            const canAccess = 
              req.user.role === "super_admin" ||
              (req.user.role === "admin" && req.user.organizationId && property.organizationId === req.user.organizationId);

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
    const tasks = await storage.getTasks();
    res.json(tasks);
  });

  app.post("/api/action-plan/tasks", async (req, res) => {
    const task = insertTaskSchema.parse(req.body);
    const created = await storage.createTask(task);
    res.status(201).json(created);
  });

  app.patch("/api/action-plan/tasks/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const task = insertTaskSchema.partial().parse(req.body);
    const updated = await storage.updateTask(id, task);
    res.json(updated);
  });

  app.delete("/api/action-plan/tasks/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteTask(id);
    res.status(204).send();
  });

  return server;
}