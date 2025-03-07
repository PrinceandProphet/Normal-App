import {
  type Document, type InsertDocument,
  type Contact, type InsertContact,
  type Message, type InsertMessage,
  type DocumentTemplate, type InsertTemplate,
  type Checklist, type InsertChecklist
} from "@shared/schema";

export interface IStorage {
  // Documents
  getDocuments(): Promise<Document[]>;
  getDocument(id: number): Promise<Document | undefined>;
  createDocument(doc: InsertDocument): Promise<Document>;
  deleteDocument(id: number): Promise<void>;

  // Contacts
  getContacts(): Promise<Contact[]>;
  getContact(id: number): Promise<Contact | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: number, contact: Partial<InsertContact>): Promise<Contact>;
  deleteContact(id: number): Promise<void>;

  // Messages
  getMessages(contactId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;

  // Templates
  getTemplates(): Promise<DocumentTemplate[]>;
  createTemplate(template: InsertTemplate): Promise<DocumentTemplate>;

  // Checklists
  getChecklists(): Promise<Checklist[]>;
  createChecklist(checklist: InsertChecklist): Promise<Checklist>;
  updateChecklist(id: number, checklist: Partial<InsertChecklist>): Promise<Checklist>;
}

export class MemStorage implements IStorage {
  private documents: Map<number, Document>;
  private contacts: Map<number, Contact>;
  private messages: Map<number, Message>;
  private templates: Map<number, DocumentTemplate>;
  private checklists: Map<number, Checklist>;
  private currentId: { [key: string]: number };

  constructor() {
    this.documents = new Map();
    this.contacts = new Map();
    this.messages = new Map();
    this.templates = new Map();
    this.checklists = new Map();
    this.currentId = {
      documents: 1,
      contacts: 1,
      messages: 1,
      templates: 1,
      checklists: 1
    };
  }

  // Documents
  async getDocuments(): Promise<Document[]> {
    return Array.from(this.documents.values());
  }

  async getDocument(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async createDocument(doc: InsertDocument): Promise<Document> {
    const id = this.currentId.documents++;
    const document = { ...doc, id };
    this.documents.set(id, document);
    return document;
  }

  async deleteDocument(id: number): Promise<void> {
    this.documents.delete(id);
  }

  // Contacts
  async getContacts(): Promise<Contact[]> {
    return Array.from(this.contacts.values());
  }

  async getContact(id: number): Promise<Contact | undefined> {
    return this.contacts.get(id);
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    const id = this.currentId.contacts++;
    const newContact = { ...contact, id };
    this.contacts.set(id, newContact);
    return newContact;
  }

  async updateContact(id: number, contact: Partial<InsertContact>): Promise<Contact> {
    const existing = await this.getContact(id);
    if (!existing) throw new Error("Contact not found");
    const updated = { ...existing, ...contact };
    this.contacts.set(id, updated);
    return updated;
  }

  async deleteContact(id: number): Promise<void> {
    this.contacts.delete(id);
  }

  // Messages
  async getMessages(contactId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(m => m.contactId === contactId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const id = this.currentId.messages++;
    const newMessage = { ...message, id };
    this.messages.set(id, newMessage);
    return newMessage;
  }

  // Templates
  async getTemplates(): Promise<DocumentTemplate[]> {
    return Array.from(this.templates.values());
  }

  async createTemplate(template: InsertTemplate): Promise<DocumentTemplate> {
    const id = this.currentId.templates++;
    const newTemplate = { ...template, id };
    this.templates.set(id, newTemplate);
    return newTemplate;
  }

  // Checklists
  async getChecklists(): Promise<Checklist[]> {
    return Array.from(this.checklists.values());
  }

  async createChecklist(checklist: InsertChecklist): Promise<Checklist> {
    const id = this.currentId.checklists++;
    const newChecklist = { ...checklist, id };
    this.checklists.set(id, newChecklist);
    return newChecklist;
  }

  async updateChecklist(id: number, checklist: Partial<InsertChecklist>): Promise<Checklist> {
    const existing = this.checklists.get(id);
    if (!existing) throw new Error("Checklist not found");
    const updated = { ...existing, ...checklist };
    this.checklists.set(id, updated);
    return updated;
  }
}

export const storage = new MemStorage();
