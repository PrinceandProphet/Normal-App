import type { Express } from "express";
import { createServer } from "http";
import multer from "multer";
import { storage } from "./storage";
import { insertDocumentSchema, insertContactSchema, insertMessageSchema } from "@shared/schema";
import path from "path";
import fs from "fs";
import express from 'express';

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

console.log('Uploads directory:', uploadsDir); // Debug log

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      console.log('Saving file to:', uploadsDir); // Debug log
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      // Generate unique filename
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const filename = uniqueSuffix + path.extname(file.originalname);
      console.log('Generated filename:', filename); // Debug log
      cb(null, filename);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

export async function registerRoutes(app: Express) {
  const server = createServer(app);

  // Serve uploaded files
  app.use('/uploads', express.static(uploadsDir));

  // Documents
  app.get("/api/documents", async (req, res) => {
    const documents = await storage.getDocuments();
    res.json(documents);
  });

  app.post("/api/documents", upload.single("file"), async (req, res) => {
    console.log('Upload request received:', req.body, req.file); // Debug log

    const file = req.file;
    if (!file) {
      console.log('No file in request'); // Debug log
      return res.status(400).json({ message: "No file uploaded" });
    }

    try {
      const doc = insertDocumentSchema.parse({
        name: req.body.name || file.originalname,
        path: `/uploads/${file.filename}`,
        type: path.extname(file.originalname),
        size: file.size,
      });

      const document = await storage.createDocument(doc);
      console.log('Document created:', document); // Debug log
      res.status(201).json(document);
    } catch (error) {
      console.error('Error in document upload:', error); // Debug log
      // Clean up uploaded file if document creation fails
      if (file.path) {
        fs.unlinkSync(file.path);
      }
      throw error;
    }
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