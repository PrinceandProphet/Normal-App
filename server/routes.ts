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
    const properties = await storage.getProperties();
    res.json(properties);
  });

  app.post("/api/properties", async (req, res) => {
    const property = insertPropertySchema.parse(req.body);
    const created = await storage.createProperty(property);
    res.status(201).json(created);
  });

  app.patch("/api/properties/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const property = insertPropertySchema.partial().parse(req.body);
    const updated = await storage.updateProperty(id, property);
    res.json(updated);
  });

  app.delete("/api/properties/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteProperty(id);
    res.status(204).send();
  });

  // Household Groups
  app.get("/api/household-groups", async (req, res) => {
    const propertyId = req.query.propertyId ? parseInt(req.query.propertyId as string) : undefined;
    const groups = await storage.getHouseholdGroups(propertyId);
    res.json(groups);
  });

  app.post("/api/household-groups", async (req, res) => {
    const group = insertHouseholdGroupSchema.parse(req.body);
    const created = await storage.createHouseholdGroup(group);
    res.status(201).json(created);
  });

  app.patch("/api/household-groups/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const group = insertHouseholdGroupSchema.partial().parse(req.body);
    const updated = await storage.updateHouseholdGroup(id, group);
    res.json(updated);
  });

  app.delete("/api/household-groups/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteHouseholdGroup(id);
    res.status(204).send();
  });

  // Household Members
  app.get("/api/household-members", async (req, res) => {
    const groupId = req.query.groupId ? parseInt(req.query.groupId as string) : undefined;
    const members = await storage.getHouseholdMembers(groupId);
    res.json(members);
  });

  app.post("/api/household-members", async (req, res) => {
    const member = insertHouseholdMemberSchema.parse(req.body);
    const created = await storage.createHouseholdMember(member);
    res.status(201).json(created);
  });

  app.patch("/api/household-members/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const member = insertHouseholdMemberSchema.partial().parse(req.body);
    const updated = await storage.updateHouseholdMember(id, member);
    res.json(updated);
  });

  app.delete("/api/household-members/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteHouseholdMember(id);
    res.status(204).send();
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