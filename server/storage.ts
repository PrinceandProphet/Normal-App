import {
  type Document, type InsertDocument,
  type Contact, type InsertContact,
  type Message, type InsertMessage,
  type DocumentTemplate, type InsertTemplate,
  type Checklist, type InsertChecklist,
  documents, contacts, messages, documentTemplates, checklists,
  type SystemConfig, type InsertSystemConfig, systemConfig,
  type CapitalSource, type InsertCapitalSource,
  capitalSources,
  type HouseholdMember, type InsertHouseholdMember,
  householdMembers,
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

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

  // System Config
  getSystemConfig(): Promise<SystemConfig | undefined>;
  updateSystemConfig(config: InsertSystemConfig): Promise<SystemConfig>;

  // Capital Sources
  getCapitalSources(): Promise<CapitalSource[]>;
  createCapitalSource(source: InsertCapitalSource): Promise<CapitalSource>;
  updateCapitalSource(id: number, source: Partial<InsertCapitalSource>): Promise<CapitalSource>;
  deleteCapitalSource(id: number): Promise<void>;
  getDocumentsByCapitalSource(capitalSourceId: number): Promise<Document[]>;

  // Add Household Members methods
  getHouseholdMembers(): Promise<HouseholdMember[]>;
  createHouseholdMember(member: InsertHouseholdMember): Promise<HouseholdMember>;
  updateHouseholdMember(id: number, member: Partial<InsertHouseholdMember>): Promise<HouseholdMember>;
  deleteHouseholdMember(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Documents
  async getDocuments(): Promise<Document[]> {
    return await db.select().from(documents);
  }

  async getDocument(id: number): Promise<Document | undefined> {
    const [doc] = await db.select().from(documents).where(eq(documents.id, id));
    return doc;
  }

  async createDocument(doc: InsertDocument): Promise<Document> {
    const [created] = await db.insert(documents).values(doc).returning();
    return created;
  }

  async deleteDocument(id: number): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }

  // Contacts
  async getContacts(): Promise<Contact[]> {
    return await db.select().from(contacts);
  }

  async getContact(id: number): Promise<Contact | undefined> {
    const [contact] = await db.select().from(contacts).where(eq(contacts.id, id));
    return contact;
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    const [created] = await db.insert(contacts).values(contact).returning();
    return created;
  }

  async updateContact(id: number, contact: Partial<InsertContact>): Promise<Contact> {
    const [updated] = await db
      .update(contacts)
      .set(contact)
      .where(eq(contacts.id, id))
      .returning();
    if (!updated) throw new Error("Contact not found");
    return updated;
  }

  async deleteContact(id: number): Promise<void> {
    await db.delete(contacts).where(eq(contacts.id, id));
  }

  // Messages
  async getMessages(contactId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.contactId, contactId))
      .orderBy(messages.timestamp);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [created] = await db.insert(messages).values(message).returning();
    return created;
  }

  // Templates
  async getTemplates(): Promise<DocumentTemplate[]> {
    return await db.select().from(documentTemplates);
  }

  async createTemplate(template: InsertTemplate): Promise<DocumentTemplate> {
    const [created] = await db.insert(documentTemplates).values(template).returning();
    return created;
  }

  // Checklists
  async getChecklists(): Promise<Checklist[]> {
    return await db.select().from(checklists);
  }

  async createChecklist(checklist: InsertChecklist): Promise<Checklist> {
    const [created] = await db.insert(checklists).values(checklist).returning();
    return created;
  }

  async updateChecklist(id: number, checklist: Partial<InsertChecklist>): Promise<Checklist> {
    const [updated] = await db
      .update(checklists)
      .set(checklist)
      .where(eq(checklists.id, id))
      .returning();
    if (!updated) throw new Error("Checklist not found");
    return updated;
  }

  // System Config
  async getSystemConfig(): Promise<SystemConfig | undefined> {
    const [config] = await db.select().from(systemConfig).limit(1);
    return config;
  }

  async updateSystemConfig(config: InsertSystemConfig): Promise<SystemConfig> {
    const [existing] = await db.select().from(systemConfig).limit(1);
    if (existing) {
      const [updated] = await db
        .update(systemConfig)
        .set({ ...config, updatedAt: new Date() })
        .where(eq(systemConfig.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(systemConfig)
        .values({ ...config, updatedAt: new Date() })
        .returning();
      return created;
    }
  }

  // Capital Sources
  async getCapitalSources(): Promise<CapitalSource[]> {
    return await db.select().from(capitalSources);
  }

  async createCapitalSource(source: InsertCapitalSource): Promise<CapitalSource> {
    const [created] = await db.insert(capitalSources).values({
      ...source,
      amount: source.amount.toString(),
    }).returning();
    return created;
  }

  async updateCapitalSource(id: number, source: Partial<InsertCapitalSource>): Promise<CapitalSource> {
    const [updated] = await db
      .update(capitalSources)
      .set({
        ...source,
        amount: source.amount?.toString(),
      })
      .where(eq(capitalSources.id, id))
      .returning();
    if (!updated) throw new Error("Capital source not found");
    return updated;
  }

  async deleteCapitalSource(id: number): Promise<void> {
    await db.delete(capitalSources).where(eq(capitalSources.id, id));
  }

  async getDocumentsByCapitalSource(capitalSourceId: number): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(eq(documents.capitalSourceId, capitalSourceId));
  }

  // Implement Household Members methods
  async getHouseholdMembers(): Promise<HouseholdMember[]> {
    return await db.select().from(householdMembers);
  }

  async createHouseholdMember(member: InsertHouseholdMember): Promise<HouseholdMember> {
    const [created] = await db.insert(householdMembers).values(member).returning();
    return created;
  }

  async updateHouseholdMember(id: number, member: Partial<InsertHouseholdMember>): Promise<HouseholdMember> {
    const [updated] = await db
      .update(householdMembers)
      .set(member)
      .where(eq(householdMembers.id, id))
      .returning();
    if (!updated) throw new Error("Household member not found");
    return updated;
  }

  async deleteHouseholdMember(id: number): Promise<void> {
    await db.delete(householdMembers).where(eq(householdMembers.id, id));
  }
}

export const storage = new DatabaseStorage();