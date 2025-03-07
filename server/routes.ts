import type { Express } from "express";
import { createServer } from "http";
import multer from "multer";
import { storage } from "./storage";
import { insertDocumentSchema, insertContactSchema, insertMessageSchema } from "@shared/schema";
import path from "path";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

export async function registerRoutes(app: Express) {
  const server = createServer(app);

  // Documents
  app.get("/api/documents", async (req, res) => {
    const documents = await storage.getDocuments();
    res.json(documents);
  });

  app.post("/api/documents", upload.single("file"), async (req, res) => {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const doc = insertDocumentSchema.parse({
      name: req.body.name || file.originalname,
      path: `/uploads/${file.originalname}`,
      type: path.extname(file.originalname),
      size: file.size,
    });

    const document = await storage.createDocument(doc);
    res.status(201).json(document);
  });

  app.delete("/api/documents/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteDocument(id);
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

  return server;
}
