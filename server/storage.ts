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
  type FundingOpportunity, type InsertFundingOpportunity, fundingOpportunities,
  type OpportunityMatch, type InsertOpportunityMatch, opportunityMatches,
  type UpdateOrganizationSettings,
  insertStaffSchema, staffSchema,
} from "@shared/schema";
import { z } from "zod";
import connectPg from "connect-pg-simple";
import session from "express-session";
import createMemoryStore from "memorystore";
import { db } from "./db";
import { eq, and, desc, like, or, gte, lte } from "drizzle-orm";
import { encrypt, decrypt, isEncrypted } from "./utils/encryption";

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
  updateOrganizationSettings(id: number, settings: UpdateOrganizationSettings): Promise<Organization>;
  deleteOrganization(id: number): Promise<void>;

  // Organization Members (practitioners/staff)
  getOrganizationMembers(orgId: number): Promise<OrganizationMember[]>;
  addOrganizationMember(member: InsertOrganizationMember): Promise<OrganizationMember>;
  removeOrganizationMember(userId: number, orgId: number): Promise<void>;
  updateOrganizationMember(userId: number, orgId: number, role: string): Promise<OrganizationMember>;
  
  // Organization Staff Management
  getOrganizationStaff(orgId: number): Promise<z.infer<typeof staffSchema>[]>;
  getStaffMember(staffId: number, orgId: number): Promise<z.infer<typeof staffSchema> | undefined>;
  addOrganizationStaff(staff: z.infer<typeof insertStaffSchema> & { organizationId: number }): Promise<z.infer<typeof staffSchema>>;
  updateOrganizationStaff(staff: z.infer<typeof staffSchema>, orgId: number): Promise<z.infer<typeof staffSchema>>;
  removeOrganizationStaff(staffId: number, orgId: number): Promise<void>;
  
  // Organization-Survivor Relationships
  getOrganizationSurvivors(orgId: number): Promise<OrganizationSurvivor[]>;
  getSurvivorOrganizations(survivorId: number): Promise<OrganizationSurvivor[]>;
  getPrimarySurvivorOrganization(survivorId: number): Promise<OrganizationSurvivor | undefined>;
  addSurvivorToOrganization(relationship: InsertOrganizationSurvivor): Promise<OrganizationSurvivor>;
  removeSurvivorFromOrganization(survivorId: number, orgId: number): Promise<void>;
  updateSurvivorOrganizationStatus(survivorId: number, orgId: number, status: string, notes?: string): Promise<OrganizationSurvivor>;
  setPrimarySurvivorOrganization(survivorId: number, orgId: number): Promise<OrganizationSurvivor>;

  // Funding Opportunities (Grants)
  getFundingOpportunities(organizationId?: number): Promise<FundingOpportunity[]>;
  getFundingOpportunity(id: number): Promise<FundingOpportunity | undefined>;
  createFundingOpportunity(opportunity: InsertFundingOpportunity): Promise<FundingOpportunity>;
  updateFundingOpportunity(id: number, opportunity: Partial<InsertFundingOpportunity>): Promise<FundingOpportunity>;
  deleteFundingOpportunity(id: number): Promise<void>;
  getPublicFundingOpportunities(): Promise<FundingOpportunity[]>;
  
  // Opportunity Matches
  getOpportunityMatches(opportunityId?: number, survivorId?: number): Promise<OpportunityMatch[]>;
  getOpportunityMatch(opportunityId: number, survivorId: number): Promise<OpportunityMatch | undefined>;
  createOpportunityMatch(match: InsertOpportunityMatch): Promise<OpportunityMatch>;
  updateOpportunityMatch(opportunityId: number, survivorId: number, match: Partial<InsertOpportunityMatch>): Promise<OpportunityMatch>;
  deleteOpportunityMatch(opportunityId: number, survivorId: number): Promise<void>;
  runMatchingEngine(): Promise<number>; // Returns count of new matches created

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
  // Get messages for a specific client/survivor
  getClientMessages(survivorId: number): Promise<Message[]>;
  // Get messages by optional filters (pagination support)
  getMessages(filters: {
    survivorId?: number;
    contactId?: number;
    channel?: string;
    isRead?: boolean;
    parentId?: number;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
    tags?: string[]; // New: filter by tags
    organizationId?: number; // New: filter by organization
  }): Promise<Message[]>;
  // Get a specific message by id
  getMessage(id: number): Promise<Message | undefined>;
  // Create a new message with encryption
  createMessage(message: InsertMessage): Promise<Message>;
  // Mark a message as read
  markMessageAsRead(id: number): Promise<Message>;
  // Update a message status
  updateMessageStatus(id: number, status: string): Promise<Message>;
  // Delete a message
  deleteMessage(id: number): Promise<void>;

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
  getCapitalSources(survivorId?: number): Promise<CapitalSource[]>;
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
    // Initialize PostgreSQL session store for persistent sessions
    const PostgresStore = connectPg(session);
    this.sessionStore = new PostgresStore({
      pool: db["$client"] as any, // Use the underlying pool connection
      tableName: 'session',
      createTableIfMissing: true,
      pruneSessionInterval: 60 * 60 // Prune expired sessions every hour
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
  
  async updateOrganizationSettings(id: number, settings: UpdateOrganizationSettings): Promise<Organization> {
    const [updated] = await db
      .update(organizations)
      .set({
        ...settings,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, id))
      .returning();
    if (!updated) throw new Error("Organization not found");
    return updated;
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
  
  // Organization Staff Management Methods
  async getOrganizationStaff(orgId: number): Promise<z.infer<typeof staffSchema>[]> {
    // This is a mock implementation since we don't have a dedicated staff table yet
    // In a production environment, we would fetch from a staff table or join users with organization data
    
    // Get all organization members with user data
    const orgMembers = await db
      .select({
        userId: organizationMembers.userId,
        organizationId: organizationMembers.organizationId,
        role: organizationMembers.role,
      })
      .from(organizationMembers)
      .where(eq(organizationMembers.organizationId, orgId));
      
    // Get the full user data for each member
    const staffMembers = await Promise.all(
      orgMembers.map(async (member) => {
        const user = await this.getUser(member.userId);
        if (!user) {
          return null;
        }
        
        // Map user data to staff schema
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone || "",
          role: user.role as any, // Map from user role
          title: user.jobTitle || "",
          status: "active", // Default all existing members to active
          lastActive: user.updatedAt?.toISOString(),
          avatarUrl: undefined,
          permissions: {
            canManageClients: true, // Default permissions
            canManageStaff: user.role === "admin",
            canViewReports: true,
            canEditOrganizationSettings: user.role === "admin",
            canManageDocuments: true,
            canSendMessages: true,
          }
        };
      })
    );
    
    // Filter out null entries (in case any users were not found)
    return staffMembers.filter(Boolean) as z.infer<typeof staffSchema>[];
  }
  
  async getStaffMember(staffId: number, orgId: number): Promise<z.infer<typeof staffSchema> | undefined> {
    // Check if this user is part of the organization
    const [orgMember] = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.userId, staffId),
          eq(organizationMembers.organizationId, orgId)
        )
      );
      
    if (!orgMember) {
      return undefined;
    }
    
    // Get the user data
    const user = await this.getUser(staffId);
    if (!user) {
      return undefined;
    }
    
    // Map user data to staff schema
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      role: user.role as any, // Map from user role
      title: user.jobTitle || "",
      status: "active", // Default to active
      lastActive: user.updatedAt?.toISOString(),
      avatarUrl: undefined,
      permissions: {
        canManageClients: true, // Default permissions
        canManageStaff: user.role === "admin",
        canViewReports: true,
        canEditOrganizationSettings: user.role === "admin",
        canManageDocuments: true,
        canSendMessages: true,
      }
    };
  }
  
  async addOrganizationStaff(staff: z.infer<typeof insertStaffSchema> & { organizationId: number }): Promise<z.infer<typeof staffSchema>> {
    // Create a new user with the staff info
    const newUser = await this.createUser({
      name: staff.name,
      username: staff.email.split('@')[0], // Create a username from email
      email: staff.email,
      password: Math.random().toString(36).substring(2, 10), // Generate random temporary password
      firstName: staff.name.split(' ')[0],
      lastName: staff.name.split(' ').slice(1).join(' '),
      userType: "practitioner",
      role: staff.role,
      jobTitle: staff.title,
      organizationId: staff.organizationId,
    });
    
    // Add the user as an organization member
    await this.addOrganizationMember({
      userId: newUser.id,
      organizationId: staff.organizationId,
      role: staff.role === "admin" ? "admin" : "member",
    });
    
    // Return the staff member info
    return {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      phone: staff.phone || "",
      role: staff.role,
      title: staff.title || "",
      status: "pending", // New staff member starts as pending
      permissions: staff.permissions,
    };
  }
  
  async updateOrganizationStaff(staff: z.infer<typeof staffSchema>, orgId: number): Promise<z.infer<typeof staffSchema>> {
    // Update the user information
    const userUpdate = await this.updateUser(staff.id, {
      name: staff.name,
      email: staff.email,
      phone: staff.phone,
      role: staff.role,
      jobTitle: staff.title,
    });
    
    // Update organization member role if needed
    await this.updateOrganizationMember(
      staff.id,
      orgId,
      staff.role === "admin" ? "admin" : "member"
    );
    
    // Return the updated staff member
    return {
      ...staff,
      lastActive: userUpdate.updatedAt?.toISOString(),
    };
  }
  
  async removeOrganizationStaff(staffId: number, orgId: number): Promise<void> {
    // Remove the organization membership
    await this.removeOrganizationMember(staffId, orgId);
    
    // Optionally, we could also delete the user entirely or just update their status
    // For now, we'll just remove the organization relationship
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

  /**
   * Decrypts a single message object
   */
  private decryptMessage(message: Message): Message {
    if (message && message.content && isEncrypted(message.content)) {
      return {
        ...message,
        content: decrypt(message.content)
      };
    }
    return message;
  }

  /**
   * Decrypts an array of messages
   */
  private decryptMessages(messages: Message[]): Message[] {
    return messages.map(this.decryptMessage.bind(this));
  }

  /**
   * Get all messages for a specific client/survivor
   */
  async getClientMessages(survivorId: number): Promise<Message[]> {
    const result = await db
      .select()
      .from(messages)
      .where(eq(messages.survivorId, survivorId))
      .orderBy(desc(messages.sentAt));
    
    // Decrypt message content before returning
    return this.decryptMessages(result);
  }

  /**
   * Get messages with flexible filtering
   */
  async getMessages(filters: {
    survivorId?: number;
    contactId?: number;
    channel?: string;
    isRead?: boolean;
    parentId?: number;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
    tags?: string[]; // New: filter by tags
    organizationId?: number; // New: filter by organization
  }): Promise<Message[]> {
    // Start with a basic query
    let query = db.select().from(messages);
    
    // Apply filters
    if (filters.survivorId !== undefined) {
      query = query.where(eq(messages.survivorId, filters.survivorId));
    }
    
    if (filters.contactId !== undefined) {
      query = query.where(eq(messages.contactId, filters.contactId));
    }
    
    if (filters.channel !== undefined) {
      query = query.where(eq(messages.channel, filters.channel));
    }
    
    if (filters.isRead !== undefined) {
      query = query.where(eq(messages.isRead, filters.isRead));
    }
    
    if (filters.parentId !== undefined) {
      query = query.where(eq(messages.parentId, filters.parentId));
    }
    
    if (filters.organizationId !== undefined) {
      query = query.where(eq(messages.organizationId, filters.organizationId));
    }
    
    // Tag filtering using LIKE queries for each tag
    if (filters.tags && filters.tags.length > 0) {
      // Use SQL LIKE for each tag with OR conditions
      query = query.where(
        or(
          ...filters.tags.map(tag => 
            // Match exact tag or tag as part of comma-separated list
            or(
              eq(messages.tags, tag),
              like(messages.tags, `${tag},%`),
              like(messages.tags, `%,${tag},%`),
              like(messages.tags, `%,${tag}`)
            )
          )
        )
      );
    }
    
    // Date range filtering
    if (filters.startDate) {
      query = query.where(
        gte(messages.sentAt, filters.startDate)
      );
    }
    
    if (filters.endDate) {
      query = query.where(
        lte(messages.sentAt, filters.endDate)
      );
    }
    
    // Order by sent date descending (newest first)
    query = query.orderBy(desc(messages.sentAt));
    
    // Apply pagination if specified
    if (filters.limit !== undefined) {
      query = query.limit(filters.limit);
      
      if (filters.offset !== undefined) {
        query = query.offset(filters.offset);
      }
    }
    
    const result = await query;
    
    // Decrypt message content before returning
    return this.decryptMessages(result);
  }

  /**
   * Get a specific message by ID
   */
  async getMessage(id: number): Promise<Message | undefined> {
    const [message] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, id));
    
    // Decrypt the message if found
    return message ? this.decryptMessage(message) : undefined;
  }

  /**
   * Create a new message with encryption
   */
  async createMessage(message: InsertMessage): Promise<Message> {
    // Auto-tag the message based on content if no tags are provided
    if (!message.tags) {
      const { autoTagMessage, formatTags } = await import('./utils/message-tagging');
      const detectedTags = autoTagMessage(message.content);
      if (detectedTags.length > 0) {
        message.tags = formatTags(detectedTags);
      }
    }

    // Encrypt the message content
    const encryptedMessage = {
      ...message,
      content: encrypt(message.content),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const [created] = await db
      .insert(messages)
      .values(encryptedMessage)
      .returning();
    
    // Decrypt before returning to the caller
    return this.decryptMessage(created);
  }

  /**
   * Mark a message as read
   */
  async markMessageAsRead(id: number): Promise<Message> {
    const [updated] = await db
      .update(messages)
      .set({ 
        isRead: true,
        updatedAt: new Date()
      })
      .where(eq(messages.id, id))
      .returning();
    
    if (!updated) {
      throw new Error("Message not found");
    }
    
    return this.decryptMessage(updated);
  }

  /**
   * Update a message status
   */
  async updateMessageStatus(id: number, status: string): Promise<Message> {
    const [updated] = await db
      .update(messages)
      .set({ 
        status,
        updatedAt: new Date()
      })
      .where(eq(messages.id, id))
      .returning();
    
    if (!updated) {
      throw new Error("Message not found");
    }
    
    return this.decryptMessage(updated);
  }

  /**
   * Delete a message
   */
  async deleteMessage(id: number): Promise<void> {
    await db.delete(messages).where(eq(messages.id, id));
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
  async getCapitalSources(survivorId?: number): Promise<CapitalSource[]> {
    if (survivorId) {
      return await db.select().from(capitalSources).where(eq(capitalSources.survivorId, survivorId));
    }
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
    const taskList = await db.select().from(tasks);

    // Process the subtasks for each task
    return taskList.map(task => {
      if (task.subtasks) {
        try {
          // If it's already an array, keep it; otherwise parse the JSON string
          if (typeof task.subtasks === 'string') {
            const parsedSubtasks = JSON.parse(task.subtasks);
            task.subtasks = parsedSubtasks;
          }
        } catch (error) {
          console.error(`Error parsing subtasks JSON for task ${task.id}:`, error);
          task.subtasks = [];
        }
      } else {
        task.subtasks = [];
      }
      return task;
    });
  }
  
  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, id));
    
    if (task) {
      // Process the subtasks field
      if (task.subtasks) {
        try {
          // If it's already an array, keep it; otherwise parse the JSON string
          if (typeof task.subtasks === 'string') {
            const parsedSubtasks = JSON.parse(task.subtasks);
            task.subtasks = parsedSubtasks;
          }
        } catch (error) {
          console.error(`Error parsing subtasks JSON for task ${task.id}:`, error);
          task.subtasks = [];
        }
      } else {
        task.subtasks = [];
      }
    }
    
    return task;
  }

  async createTask(task: InsertTask): Promise<Task> {
    // Handle subtasks
    let taskToInsert = { ...task };
    
    if (taskToInsert.subtasks !== undefined) {
      // If subtasks is already a string, keep it as is
      // Otherwise, stringify the array of objects
      if (typeof taskToInsert.subtasks !== 'string') {
        const subtasksJson = JSON.stringify(taskToInsert.subtasks);
        taskToInsert = { ...taskToInsert, subtasks: subtasksJson };
      }
    }
    
    console.log(`Creating task with data:`, { 
      ...taskToInsert,
      subtasks: typeof taskToInsert.subtasks === 'string' 
        ? `String of length ${taskToInsert.subtasks.length}` 
        : taskToInsert.subtasks 
    });
    
    const [created] = await db.insert(tasks).values({
      ...taskToInsert,
      createdAt: new Date(),
    }).returning();
    
    // Process the subtasks in the returned task
    if (created.subtasks) {
      try {
        // If it's already an array, keep it; otherwise parse the JSON string
        if (typeof created.subtasks === 'string') {
          const parsedSubtasks = JSON.parse(created.subtasks);
          created.subtasks = parsedSubtasks;
        }
      } catch (error) {
        console.error(`Error parsing subtasks JSON for new task ${created.id}:`, error);
        created.subtasks = [];
      }
    } else {
      created.subtasks = [];
    }
    
    return created;
  }

  async updateTask(id: number, task: Partial<InsertTask>): Promise<Task> {
    // Create a copy of the task data to avoid modifying the original
    let taskToUpdate = { ...task };
    
    // Handle subtasks specially - convert to JSON if provided
    if (taskToUpdate.subtasks !== undefined) {
      // If subtasks is already a string, keep it as is
      // Otherwise, stringify the array of objects
      if (typeof taskToUpdate.subtasks !== 'string') {
        const subtasksJson = JSON.stringify(taskToUpdate.subtasks);
        taskToUpdate = { ...taskToUpdate, subtasks: subtasksJson };
      }
    }

    // Print debug info to help diagnose issues
    console.log(`Updating task ${id} with data:`, { 
      ...taskToUpdate,
      subtasks: typeof taskToUpdate.subtasks === 'string' 
        ? `String of length ${taskToUpdate.subtasks.length}` 
        : taskToUpdate.subtasks 
    });

    const [updated] = await db
      .update(tasks)
      .set(taskToUpdate)
      .where(eq(tasks.id, id))
      .returning();
    
    if (!updated) throw new Error("Task not found");
    
    // Process the subtasks field in the returned task
    if (updated.subtasks) {
      try {
        // If it's already an array, keep it; otherwise parse the JSON string
        if (typeof updated.subtasks === 'string') {
          const parsedSubtasks = JSON.parse(updated.subtasks);
          updated.subtasks = parsedSubtasks;
        }
      } catch (error) {
        console.error(`Error parsing subtasks JSON for task ${id}:`, error);
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

  // Funding Opportunities (Grants)
  async getFundingOpportunities(organizationId?: number): Promise<FundingOpportunity[]> {
    if (organizationId) {
      return await db
        .select()
        .from(fundingOpportunities)
        .where(eq(fundingOpportunities.organizationId, organizationId));
    }
    return await db.select().from(fundingOpportunities);
  }

  async getFundingOpportunity(id: number): Promise<FundingOpportunity | undefined> {
    const [opportunity] = await db
      .select()
      .from(fundingOpportunities)
      .where(eq(fundingOpportunities.id, id));
    return opportunity;
  }

  async createFundingOpportunity(opportunity: InsertFundingOpportunity): Promise<FundingOpportunity> {
    try {
      console.log("Creating funding opportunity:", JSON.stringify(opportunity, null, 2));
      
      // Format eligibility criteria as JSON if it's an array
      const formattedOpportunity = {
        ...opportunity,
        // Ensure we have a status field
        status: opportunity.status || "active",
        // Convert application dates to string format for database
        applicationStartDate: opportunity.applicationStartDate ? 
          opportunity.applicationStartDate.toISOString().substring(0, 10) : null,
        applicationEndDate: opportunity.applicationEndDate ? 
          opportunity.applicationEndDate.toISOString().substring(0, 10) : null,
        // Ensure awardAmount is a number (not a string)
        awardAmount: typeof opportunity.awardAmount === 'string' ? 
          parseFloat(opportunity.awardAmount) : opportunity.awardAmount,
        // Format eligibility criteria as JSON string
        eligibilityCriteria: Array.isArray(opportunity.eligibilityCriteria)
          ? JSON.stringify(opportunity.eligibilityCriteria)
          : opportunity.eligibilityCriteria || '[]'
      };

      // Ensure organization ID is valid
      if (!formattedOpportunity.organizationId || formattedOpportunity.organizationId <= 0) {
        throw new Error("Invalid organization ID");
      }

      console.log("Formatted opportunity:", JSON.stringify(formattedOpportunity, null, 2));
      
      const [created] = await db
        .insert(fundingOpportunities)
        .values({
          name: formattedOpportunity.name,
          description: formattedOpportunity.description,
          organizationId: formattedOpportunity.organizationId,
          status: formattedOpportunity.status,
          awardAmount: formattedOpportunity.awardAmount,
          awardMinimum: formattedOpportunity.awardMinimum,
          awardMaximum: formattedOpportunity.awardMaximum,
          applicationStartDate: formattedOpportunity.applicationStartDate,
          applicationEndDate: formattedOpportunity.applicationEndDate,
          eligibilityCriteria: formattedOpportunity.eligibilityCriteria,
          isPublic: formattedOpportunity.isPublic,
        })
        .returning();
      
      return created;
    } catch (error) {
      console.error("Error creating funding opportunity:", error);
      throw error;
    }
  }

  async updateFundingOpportunity(id: number, opportunity: Partial<InsertFundingOpportunity>): Promise<FundingOpportunity> {
    try {
      console.log("Updating funding opportunity:", id, JSON.stringify(opportunity, null, 2));
      
      // Format data for update
      let updateData = { 
        ...opportunity, 
        updatedAt: new Date() 
      };
      
      // Handle date conversions if needed
      if (opportunity.applicationStartDate instanceof Date) {
        updateData.applicationStartDate = opportunity.applicationStartDate.toISOString().substring(0, 10);
      }
      
      if (opportunity.applicationEndDate instanceof Date) {
        updateData.applicationEndDate = opportunity.applicationEndDate.toISOString().substring(0, 10);
      }
      
      // Format eligibility criteria as JSON if it's an array
      if (Array.isArray(opportunity.eligibilityCriteria)) {
        updateData.eligibilityCriteria = JSON.stringify(opportunity.eligibilityCriteria);
      }
      
      // Ensure awardAmount is a number (not a string)
      if (typeof opportunity.awardAmount === 'string') {
        updateData.awardAmount = parseFloat(opportunity.awardAmount) || 0;
      }
      
      console.log("Formatted update data:", JSON.stringify(updateData, null, 2));
      
      const [updated] = await db
        .update(fundingOpportunities)
        .set(updateData)
        .where(eq(fundingOpportunities.id, id))
        .returning();
      
      if (!updated) throw new Error("Funding opportunity not found");
      return updated;
    } catch (error) {
      console.error("Error updating funding opportunity:", error);
      throw error;
    }
  }

  async deleteFundingOpportunity(id: number): Promise<void> {
    await db.delete(fundingOpportunities).where(eq(fundingOpportunities.id, id));
  }

  async getPublicFundingOpportunities(): Promise<FundingOpportunity[]> {
    return await db
      .select()
      .from(fundingOpportunities)
      .where(eq(fundingOpportunities.isPublic, true));
  }

  // Opportunity Matches
  async getOpportunityMatches(opportunityId?: number, survivorId?: number): Promise<(OpportunityMatch & { 
    opportunityName: string;
    survivorName: string;
    awardAmount: number | null;
    applicationEndDate: Date | null;
  })[]> {
    const result = await db
      .select({
        ...opportunityMatches,
        opportunityName: fundingOpportunities.name,
        survivorName: users.name,
        awardAmount: fundingOpportunities.awardAmount,
        applicationEndDate: fundingOpportunities.applicationEndDate,
      })
      .from(opportunityMatches)
      .leftJoin(fundingOpportunities, eq(opportunityMatches.opportunityId, fundingOpportunities.id))
      .leftJoin(users, eq(opportunityMatches.survivorId, users.id))
      .where(
        and(
          opportunityId ? eq(opportunityMatches.opportunityId, opportunityId) : undefined,
          survivorId ? eq(opportunityMatches.survivorId, survivorId) : undefined
        )
      )
      .orderBy(desc(opportunityMatches.matchScore));
    
    return result;
  }
  
  async getOpportunityMatch(opportunityId: number, survivorId: number): Promise<(OpportunityMatch & { 
    opportunityName: string;
    survivorName: string;
    awardAmount: number | null;
    applicationEndDate: Date | null;
  }) | undefined> {
    const [match] = await db
      .select({
        ...opportunityMatches,
        opportunityName: fundingOpportunities.name,
        survivorName: users.name,
        awardAmount: fundingOpportunities.awardAmount,
        applicationEndDate: fundingOpportunities.applicationEndDate,
      })
      .from(opportunityMatches)
      .leftJoin(fundingOpportunities, eq(opportunityMatches.opportunityId, fundingOpportunities.id))
      .leftJoin(users, eq(opportunityMatches.survivorId, users.id))
      .where(
        and(
          eq(opportunityMatches.opportunityId, opportunityId),
          eq(opportunityMatches.survivorId, survivorId)
        )
      );
    return match;
  }
  
  async createOpportunityMatch(match: InsertOpportunityMatch): Promise<OpportunityMatch> {
    const [created] = await db
      .insert(opportunityMatches)
      .values({
        ...match,
        lastCheckedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return created;
  }
  
  async updateOpportunityMatch(opportunityId: number, survivorId: number, match: Partial<InsertOpportunityMatch>): Promise<OpportunityMatch> {
    const [updated] = await db
      .update(opportunityMatches)
      .set({
        ...match,
        lastCheckedAt: new Date(),
        updatedAt: new Date()
      })
      .where(
        and(
          eq(opportunityMatches.opportunityId, opportunityId),
          eq(opportunityMatches.survivorId, survivorId)
        )
      )
      .returning();
    
    if (!updated) throw new Error("Opportunity match not found");
    return updated;
  }
  
  async deleteOpportunityMatch(opportunityId: number, survivorId: number): Promise<void> {
    await db
      .delete(opportunityMatches)
      .where(
        and(
          eq(opportunityMatches.opportunityId, opportunityId),
          eq(opportunityMatches.survivorId, survivorId)
        )
      );
  }
  
  async runMatchingEngine(): Promise<number> {
    try {
      // 1. Get all active funding opportunities
      const opportunities = await db
        .select()
        .from(fundingOpportunities)
        .where(eq(fundingOpportunities.status, "active"));
      
      if (opportunities.length === 0) return 0;
      
      // 2. Get all survivors (clients) who are users
      const survivors = await db
        .select()
        .from(users)
        .where(eq(users.userType, "survivor"));
      
      if (survivors.length === 0) return 0;
      
      let newMatchesCount = 0;
      
      // 3. For each opportunity, check if each survivor matches the criteria
      for (const opportunity of opportunities) {
        // Skip if no eligibility criteria defined
        if (!opportunity.eligibilityCriteria || 
            typeof opportunity.eligibilityCriteria !== 'object' || 
            Array.isArray(opportunity.eligibilityCriteria) && opportunity.eligibilityCriteria.length === 0) {
          continue;
        }
        
        const eligibilityCriteria = Array.isArray(opportunity.eligibilityCriteria) 
          ? opportunity.eligibilityCriteria 
          : [];
        
        for (const survivor of survivors) {
          // Skip if already matched with this opportunity
          const existingMatch = await this.getOpportunityMatch(opportunity.id, survivor.id);
          if (existingMatch) {
            // Update last checked timestamp but don't count as a new match
            await this.updateOpportunityMatch(opportunity.id, survivor.id, {
              matchScore: existingMatch.matchScore,
              matchCriteria: existingMatch.matchCriteria
            });
            continue;
          }
          
          // Evaluate criteria
          const { matches, matchScore, matchDetails } = await this.evaluateSurvivorEligibility(
            survivor.id,
            eligibilityCriteria
          );
          
          // If matches, create a new match record
          if (matches) {
            await this.createOpportunityMatch({
              opportunityId: opportunity.id,
              survivorId: survivor.id,
              matchScore,
              matchCriteria: matchDetails,
              status: "pending"
            });
            newMatchesCount++;
          }
        }
      }
      
      return newMatchesCount;
    } catch (error) {
      console.error("Error running matching engine:", error);
      return 0;
    }
  }
  
  // Helper method to evaluate if a survivor matches criteria
  private async evaluateSurvivorEligibility(
    survivorId: number, 
    criteria: any[]
  ): Promise<{ matches: boolean; matchScore: number; matchDetails: Record<string, any> }> {
    // Get survivor user
    const survivor = await this.getUser(survivorId);
    if (!survivor) {
      return { matches: false, matchScore: 0, matchDetails: {} };
    }
    
    // Get survivor's property details (for zip code)
    const properties = await this.getProperties();
    const survivorProperty = properties.find(p => p.survivorId === survivorId);
    
    // Extract zip code from address if zipCode field is not populated
    let zipCode = null;
    if (survivorProperty) {
      if (survivorProperty.zipCode) {
        zipCode = survivorProperty.zipCode;
      } else if (survivorProperty.address) {
        // Try to extract ZIP code from address
        const zipMatch = survivorProperty.address.match(/\b\d{5}(?:-\d{4})?\b/);
        if (zipMatch) {
          zipCode = zipMatch[0];
          
          // Update the property with the extracted zip code for future use
          await db
            .update(properties)
            .set({ zipCode })
            .where(eq(properties.id, survivorProperty.id));
        }
      }
    }
    
    // Get survivor's household members for household size and income data
    const householdGroups = await this.getHouseholdGroups();
    const survivorGroups = householdGroups.filter(g => 
      g.propertyId && properties.some(p => p.id === g.propertyId && p.survivorId === survivorId)
    );
    
    const survivorHouseholdMembers: HouseholdMember[] = [];
    for (const group of survivorGroups) {
      const members = await this.getHouseholdMembers(group.id);
      survivorHouseholdMembers.push(...members);
    }
    
    // Calculate total income
    const totalHouseholdIncome = survivorHouseholdMembers.reduce((sum, member) => {
      return sum + (Number(member.annualIncome) || 0);
    }, 0);
    
    // Initialize matching results
    let matchCount = 0;
    let evaluatedCount = 0;
    const matchDetails: Record<string, any> = {};
    
    // Evaluate each criteria
    for (const criterion of criteria) {
      evaluatedCount++;
      
      switch(criterion.type) {
        case 'zipCode':
          if (zipCode) {
            const zipCodeMatches = criterion.ranges.some((range: any) => {
              // Convert to numbers for comparison
              const min = parseInt(range.min, 10);
              const max = parseInt(range.max, 10);
              const zip = parseInt(zipCode, 10);
              
              return zip >= min && zip <= max;
            });
            
            if (zipCodeMatches) {
              matchCount++;
              matchDetails.zipCode = {
                matches: true,
                value: zipCode
              };
            } else {
              matchDetails.zipCode = {
                matches: false,
                value: zipCode
              };
            }
          } else {
            matchDetails.zipCode = {
              matches: false,
              reason: "No property or zip code found"
            };
          }
          break;
          
        case 'income':
          const incomeMatches = criterion.ranges.some((range: any) => {
            return totalHouseholdIncome >= range.min && totalHouseholdIncome <= range.max;
          });
          
          if (incomeMatches) {
            matchCount++;
            matchDetails.income = {
              matches: true,
              value: totalHouseholdIncome
            };
          } else {
            matchDetails.income = {
              matches: false,
              value: totalHouseholdIncome
            };
          }
          break;
          
        case 'householdSize':
          const householdSize = survivorHouseholdMembers.length;
          const householdSizeMatches = criterion.ranges.some((range: any) => {
            return householdSize >= range.min && householdSize <= range.max;
          });
          
          if (householdSizeMatches) {
            matchCount++;
            matchDetails.householdSize = {
              matches: true,
              value: householdSize
            };
          } else {
            matchDetails.householdSize = {
              matches: false,
              value: householdSize
            };
          }
          break;
          
        case 'disasterEvent':
          // This would require more complex logic connecting disasters to survivors
          // For now, we'll implement a simple approach
          const survivorDisasterEvents = survivorHouseholdMembers.flatMap(m => 
            m.qualifyingTags || []
          ).filter(tag => tag.startsWith('disaster:'));
          
          const disasterMatches = criterion.events.some((event: string) => 
            survivorDisasterEvents.includes(`disaster:${event}`)
          );
          
          if (disasterMatches) {
            matchCount++;
            matchDetails.disasterEvent = {
              matches: true,
              events: survivorDisasterEvents
            };
          } else {
            matchDetails.disasterEvent = {
              matches: false,
              events: survivorDisasterEvents
            };
          }
          break;
          
        case 'custom':
          // Custom criteria would require specific implementation based on user needs
          // For now we'll match against qualifyingTags
          const survivorTags = survivorHouseholdMembers.flatMap(m => 
            m.qualifyingTags || []
          );
          
          const tagMatches = criterion.values.some((value: string) => 
            survivorTags.includes(`${criterion.key}:${value}`)
          );
          
          if (tagMatches) {
            matchCount++;
            matchDetails.custom = {
              matches: true,
              key: criterion.key,
              tags: survivorTags
            };
          } else {
            matchDetails.custom = {
              matches: false,
              key: criterion.key,
              tags: survivorTags
            };
          }
          break;
      }
    }
    
    // Calculate match score (percentage of criteria matched)
    const matchScore = evaluatedCount > 0 
      ? Math.round((matchCount / evaluatedCount) * 100) 
      : 0;
    
    // A match requires at least one criterion to match
    const matches = matchCount > 0;
    
    return { 
      matches, 
      matchScore, 
      matchDetails 
    };
  }
}

export const storage = new DatabaseStorage();