import {
  type Document, type InsertDocument,
  type Contact, type InsertContact,
  type Message, type InsertMessage,
  type DocumentTemplate, type InsertTemplate,
  type Checklist, type InsertChecklist,
  documents, contacts, messages, documentTemplates, checklists,
  type SystemConfig, type InsertSystemConfig, systemConfig,
  type CapitalSource, type InsertCapitalSource, capitalSources,
  type Property, type InsertProperty, properties,
  type HouseholdGroup, type InsertHouseholdGroup, householdGroups,
  type HouseholdMember, type InsertHouseholdMember, householdMembers,
  type User, type InsertUser, users,
  type Organization, type InsertOrganization, organizations,
  type OrganizationMember, type InsertOrganizationMember, organizationMembers,
  type OrganizationSurvivor, type InsertOrganizationSurvivor, organizationSurvivors,
  type Task, type InsertTask, tasks,
} from "@shared/schema";
import connectPg from "connect-pg-simple";
import session from "express-session";
import createMemoryStore from "memorystore";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Session Store (for authentication)
  sessionStore: session.Store;

  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  deleteUser(id: number): Promise<void>;

  // Organizations
  getOrganizations(): Promise<Organization[]>;
  getOrganization(id: number): Promise<Organization | undefined>;
  createOrganization(org: InsertOrganization): Promise<Organization>;
  updateOrganization(id: number, org: Partial<InsertOrganization>): Promise<Organization>;
  deleteOrganization(id: number): Promise<void>;

  // Organization Members (practitioners/staff)
  getOrganizationMembers(orgId: number): Promise<OrganizationMember[]>;
  addOrganizationMember(member: InsertOrganizationMember): Promise<OrganizationMember>;
  removeOrganizationMember(userId: number, orgId: number): Promise<void>;
  updateOrganizationMember(userId: number, orgId: number, role: string): Promise<OrganizationMember>;
  
  // Organization-Survivor Relationships
  getOrganizationSurvivors(orgId: number): Promise<OrganizationSurvivor[]>;
  getSurvivorOrganizations(survivorId: number): Promise<OrganizationSurvivor[]>;
  getPrimarySurvivorOrganization(survivorId: number): Promise<OrganizationSurvivor | undefined>;
  addSurvivorToOrganization(relationship: InsertOrganizationSurvivor): Promise<OrganizationSurvivor>;
  removeSurvivorFromOrganization(survivorId: number, orgId: number): Promise<void>;
  updateSurvivorOrganizationStatus(survivorId: number, orgId: number, status: string, notes?: string): Promise<OrganizationSurvivor>;
  setPrimarySurvivorOrganization(survivorId: number, orgId: number): Promise<OrganizationSurvivor>;

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

  // Properties
  getProperties(): Promise<Property[]>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(id: number, property: Partial<InsertProperty>): Promise<Property>;
  deleteProperty(id: number): Promise<void>;

  // Household Groups
  getHouseholdGroups(propertyId?: number): Promise<HouseholdGroup[]>;
  createHouseholdGroup(group: InsertHouseholdGroup): Promise<HouseholdGroup>;
  updateHouseholdGroup(id: number, group: Partial<InsertHouseholdGroup>): Promise<HouseholdGroup>;
  deleteHouseholdGroup(id: number): Promise<void>;

  // Household Members
  getHouseholdMembers(groupId?: number): Promise<HouseholdMember[]>;
  createHouseholdMember(member: InsertHouseholdMember): Promise<HouseholdMember>;
  updateHouseholdMember(id: number, member: Partial<InsertHouseholdMember>): Promise<HouseholdMember>;
  deleteHouseholdMember(id: number): Promise<void>;
  
  // Tasks
  getTasks(): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task>;
  deleteTask(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Create PostgreSQL session store for authentication
  public sessionStore: session.Store;

  constructor() {
    // Initialize memory session store for simplicity
    const MemoryStore = createMemoryStore(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async createUser(user: InsertUser): Promise<User> {
    // Generate a name from first name and last name if available, or use username
    const name = user.firstName && user.lastName 
      ? `${user.firstName} ${user.lastName}` 
      : user.username;
    
    const [created] = await db.insert(users).values({
      ...user,
      name, // Add name field for backward compatibility
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return created;
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User> {
    // Update name field if firstName or lastName are changing
    let updateData = { ...user, updatedAt: new Date() };
    
    if (user.firstName || user.lastName) {
      const currentUser = await this.getUser(id);
      if (currentUser) {
        const firstName = user.firstName || currentUser.firstName;
        const lastName = user.lastName || currentUser.lastName;
        if (firstName && lastName) {
          updateData.name = `${firstName} ${lastName}`;
        }
      }
    }
    
    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    if (!updated) throw new Error("User not found");
    return updated;
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Organizations
  async getOrganizations(): Promise<Organization[]> {
    return await db.select().from(organizations);
  }

  async getOrganization(id: number): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    return org;
  }

  async createOrganization(org: InsertOrganization): Promise<Organization> {
    const [created] = await db.insert(organizations).values({
      ...org,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return created;
  }

  async updateOrganization(id: number, org: Partial<InsertOrganization>): Promise<Organization> {
    const [updated] = await db
      .update(organizations)
      .set({
        ...org,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, id))
      .returning();
    if (!updated) throw new Error("Organization not found");
    return updated;
  }

  async deleteOrganization(id: number): Promise<void> {
    await db.delete(organizations).where(eq(organizations.id, id));
  }

  // Organization Members
  async getOrganizationMembers(orgId: number): Promise<OrganizationMember[]> {
    return await db
      .select()
      .from(organizationMembers)
      .where(eq(organizationMembers.organizationId, orgId));
  }

  async addOrganizationMember(member: InsertOrganizationMember): Promise<OrganizationMember> {
    const [created] = await db
      .insert(organizationMembers)
      .values({
        ...member,
        joinedAt: new Date(),
      })
      .returning();
    return created;
  }

  async removeOrganizationMember(userId: number, orgId: number): Promise<void> {
    await db
      .delete(organizationMembers)
      .where(
        eq(organizationMembers.userId, userId) && 
        eq(organizationMembers.organizationId, orgId)
      );
  }

  async updateOrganizationMember(userId: number, orgId: number, role: string): Promise<OrganizationMember> {
    const [updated] = await db
      .update(organizationMembers)
      .set({ role })
      .where(
        eq(organizationMembers.userId, userId) && 
        eq(organizationMembers.organizationId, orgId)
      )
      .returning();
    if (!updated) throw new Error("Organization member not found");
    return updated;
  }

  // Organization-Survivor Relationships
  async getOrganizationSurvivors(orgId: number): Promise<OrganizationSurvivor[]> {
    return await db
      .select()
      .from(organizationSurvivors)
      .where(eq(organizationSurvivors.organizationId, orgId));
  }

  async getSurvivorOrganizations(survivorId: number): Promise<OrganizationSurvivor[]> {
    return await db
      .select()
      .from(organizationSurvivors)
      .where(eq(organizationSurvivors.survivorId, survivorId));
  }

  async getPrimarySurvivorOrganization(survivorId: number): Promise<OrganizationSurvivor | undefined> {
    const [primary] = await db
      .select()
      .from(organizationSurvivors)
      .where(
        eq(organizationSurvivors.survivorId, survivorId) &&
        eq(organizationSurvivors.isPrimary, true)
      );
    return primary;
  }

  async addSurvivorToOrganization(relationship: InsertOrganizationSurvivor): Promise<OrganizationSurvivor> {
    // Check if this will be marked as primary
    if (relationship.isPrimary) {
      // If setting as primary, clear any existing primary flags for this survivor
      await db
        .update(organizationSurvivors)
        .set({ isPrimary: false })
        .where(eq(organizationSurvivors.survivorId, relationship.survivorId));
    }

    const [created] = await db
      .insert(organizationSurvivors)
      .values({
        ...relationship,
        addedAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return created;
  }

  async removeSurvivorFromOrganization(survivorId: number, orgId: number): Promise<void> {
    await db
      .delete(organizationSurvivors)
      .where(
        eq(organizationSurvivors.survivorId, survivorId) && 
        eq(organizationSurvivors.organizationId, orgId)
      );
  }

  async updateSurvivorOrganizationStatus(
    survivorId: number, 
    orgId: number, 
    status: string, 
    notes?: string
  ): Promise<OrganizationSurvivor> {
    const updateData: any = { 
      status,
      updatedAt: new Date() 
    };
    
    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const [updated] = await db
      .update(organizationSurvivors)
      .set(updateData)
      .where(
        eq(organizationSurvivors.survivorId, survivorId) && 
        eq(organizationSurvivors.organizationId, orgId)
      )
      .returning();
    
    if (!updated) throw new Error("Organization-survivor relationship not found");
    return updated;
  }

  async setPrimarySurvivorOrganization(survivorId: number, orgId: number): Promise<OrganizationSurvivor> {
    // First, clear any existing primary flags for this survivor
    await db
      .update(organizationSurvivors)
      .set({ 
        isPrimary: false,
        updatedAt: new Date()
      })
      .where(eq(organizationSurvivors.survivorId, survivorId));
    
    // Then set the new primary organization
    const [updated] = await db
      .update(organizationSurvivors)
      .set({ 
        isPrimary: true,
        updatedAt: new Date()
      })
      .where(
        eq(organizationSurvivors.survivorId, survivorId) && 
        eq(organizationSurvivors.organizationId, orgId)
      )
      .returning();
    
    if (!updated) throw new Error("Organization-survivor relationship not found");
    return updated;
  }

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

  // Properties
  async getProperties(survivorId?: number): Promise<Property[]> {
    if (survivorId) {
      return await db.select().from(properties).where(eq(properties.survivorId, survivorId));
    }
    return await db.select().from(properties);
  }

  async createProperty(property: InsertProperty): Promise<Property> {
    const [created] = await db.insert(properties).values(property).returning();
    return created;
  }

  async updateProperty(id: number, property: Partial<InsertProperty>): Promise<Property> {
    const [updated] = await db
      .update(properties)
      .set(property)
      .where(eq(properties.id, id))
      .returning();
    if (!updated) throw new Error("Property not found");
    return updated;
  }
  
  async getProperty(id: number): Promise<Property | undefined> {
    const [property] = await db
      .select()
      .from(properties)
      .where(eq(properties.id, id));
    return property;
  }

  async deleteProperty(id: number): Promise<void> {
    await db.delete(properties).where(eq(properties.id, id));
  }

  // Household Groups
  async getHouseholdGroups(propertyId?: number): Promise<HouseholdGroup[]> {
    let query = db.select().from(householdGroups);
    if (propertyId) {
      query = query.where(eq(householdGroups.propertyId, propertyId));
    }
    return await query;
  }
  
  async getHouseholdGroup(id: number): Promise<HouseholdGroup | undefined> {
    const [group] = await db
      .select()
      .from(householdGroups)
      .where(eq(householdGroups.id, id));
    return group;
  }

  async createHouseholdGroup(group: InsertHouseholdGroup): Promise<HouseholdGroup> {
    const [created] = await db.insert(householdGroups).values(group).returning();
    return created;
  }

  async updateHouseholdGroup(id: number, group: Partial<InsertHouseholdGroup>): Promise<HouseholdGroup> {
    const [updated] = await db
      .update(householdGroups)
      .set(group)
      .where(eq(householdGroups.id, id))
      .returning();
    if (!updated) throw new Error("Household group not found");
    return updated;
  }

  async deleteHouseholdGroup(id: number): Promise<void> {
    await db.delete(householdGroups).where(eq(householdGroups.id, id));
  }

  // Household Members
  async getHouseholdMembers(groupId?: number): Promise<HouseholdMember[]> {
    let query = db.select().from(householdMembers);
    if (groupId) {
      query = query.where(eq(householdMembers.groupId, groupId));
    }
    return await query;
  }
  
  async getHouseholdMember(id: number): Promise<HouseholdMember | undefined> {
    const [member] = await db
      .select()
      .from(householdMembers)
      .where(eq(householdMembers.id, id));
    return member;
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

  // Tasks
  async getTasks(): Promise<Task[]> {
    return await db.select().from(tasks);
  }
  
  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, id));
    return task;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [created] = await db.insert(tasks).values({
      ...task,
      createdAt: new Date(),
    }).returning();
    return created;
  }

  async updateTask(id: number, task: Partial<InsertTask>): Promise<Task> {
    // Handle subtasks specially - convert to JSON if provided
    if (task.subtasks) {
      // Store subtasks as a JSON string
      const subtasksJson = JSON.stringify(task.subtasks);
      task = { ...task, subtasks: subtasksJson };
    }

    const [updated] = await db
      .update(tasks)
      .set(task)
      .where(eq(tasks.id, id))
      .returning();
    
    if (!updated) throw new Error("Task not found");
    
    // Process the subtasks field in the returned task
    if (updated.subtasks) {
      try {
        // Parse the subtasks JSON string back to an array
        const parsedSubtasks = JSON.parse(updated.subtasks as string);
        updated.subtasks = parsedSubtasks;
      } catch (error) {
        console.error("Error parsing subtasks JSON:", error);
        updated.subtasks = [];
      }
    } else {
      updated.subtasks = [];
    }
    
    return updated;
  }

  async deleteTask(id: number): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }
}

export const storage = new DatabaseStorage();