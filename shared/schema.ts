import { pgTable, text, serial, integer, boolean, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const systemConfig = pgTable("system_config", {
  id: serial("id").primaryKey(),
  emailAddress: text("email_address").notNull(),
  inboxId: text("inbox_id").notNull(),
  phoneNumber: text("phone_number"),
  phoneId: text("phone_id"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  path: text("path").notNull(),
  type: text("type").notNull(),
  size: integer("size").notNull(),
  capitalSourceId: integer("capital_source_id").references(() => capitalSources.id),
});

export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  isEmergency: boolean("is_emergency").default(false),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").notNull(),
  content: text("content").notNull(),
  type: text("type").notNull(), 
  isInbound: boolean("is_inbound").notNull(),
  timestamp: timestamp("timestamp").notNull(),
});

export const documentTemplates = pgTable("document_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  content: text("content").notNull(),
});

export const checklists = pgTable("checklists", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  items: text("items").array().notNull(),
  completed: boolean("completed").array().notNull(),
});

export const capitalSources = pgTable("capital_sources", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), 
  name: text("name").notNull(),
  amount: numeric("amount").notNull(),
  status: text("status").notNull(), 
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(),
  completed: boolean("completed").default(false),
  urgent: boolean("urgent").default(false),
  stage: text("stage").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  address: text("address").notNull(),
  type: text("type").notNull(), 
  ownershipStatus: text("ownership_status").notNull(), 
  primaryResidence: boolean("primary_residence").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const householdGroups = pgTable("household_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  propertyId: integer("property_id").references(() => properties.id),
  type: text("type").notNull(), 
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const householdMembers = pgTable("household_members", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), 
  groupId: integer("group_id").references(() => householdGroups.id),

  // Sensitive Information - Consider encryption at rest
  ssn: text("ssn"),
  dateOfBirth: timestamp("date_of_birth"),

  // Employment Information
  employer: text("employer"),
  occupation: text("occupation"),
  employmentStatus: text("employment_status"),
  annualIncome: numeric("annual_income"),

  // Demographic & Relationship Info
  relationship: text("relationship"),
  maritalStatus: text("marital_status"),
  educationLevel: text("education_level"),
  primaryLanguage: text("primary_language"),

  // Grant Qualification Attributes
  isVeteran: boolean("is_veteran").default(false),
  hasDisabilities: boolean("has_disabilities").default(false),
  disabilityNotes: text("disability_notes"),
  specialNeeds: text("special_needs"),

  // Additional Qualifiers
  isStudentFullTime: boolean("is_student_full_time").default(false),
  isSenior: boolean("is_senior").default(false),
  isPregnant: boolean("is_pregnant").default(false),

  // Tags for Grant Matching
  qualifyingTags: text("qualifying_tags").array(),

  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCapitalSourceSchema = z.object({
  type: z.enum(["FEMA", "Insurance", "Grant"]),
  name: z.string().min(1, "Name is required"),
  amount: z.number().min(0, "Amount must be non-negative"),
  status: z.enum(["current", "projected"]),
  description: z.string().optional(),
});

export const insertSystemConfigSchema = createInsertSchema(systemConfig).omit({ id: true, updatedAt: true });
export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true });
export const insertContactSchema = createInsertSchema(contacts).omit({ id: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true });
export const insertTemplateSchema = createInsertSchema(documentTemplates).omit({ id: true });
export const insertChecklistSchema = createInsertSchema(checklists).omit({ id: true });
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true });

export const insertPropertySchema = createInsertSchema(properties)
  .extend({
    type: z.enum(['single_family', 'multi_family', 'apartment', 'mobile_home', 'other']),
    ownershipStatus: z.enum(['owned', 'rented', 'other']),
  })
  .omit({ id: true, createdAt: true });

export const insertHouseholdGroupSchema = createInsertSchema(householdGroups)
  .extend({
    type: z.enum(['nuclear', 'extended', 'multi_generational']),
  })
  .omit({ id: true, createdAt: true });

export const insertHouseholdMemberSchema = createInsertSchema(householdMembers)
  .extend({
    name: z.string().min(1, "Name is required"),
    dateOfBirth: z.date({ required_error: "Date of birth is required" }),
    type: z.enum(['adult', 'child', 'senior', 'dependent']).optional(),
    relationship: z.enum([
      'head',
      'spouse',
      'child',
      'parent',
      'grandparent',
      'other'
    ]).optional(),

    // Employment Status Options
    employmentStatus: z.enum([
      'full_time',
      'part_time',
      'self_employed',
      'unemployed',
      'retired',
      'student'
    ]).optional(),

    // Education Level Options
    educationLevel: z.enum([
      'less_than_high_school',
      'high_school',
      'some_college',
      'associates',
      'bachelors',
      'masters',
      'doctorate'
    ]).optional(),

    // Marital Status Options
    maritalStatus: z.enum([
      'single',
      'married',
      'divorced',
      'widowed',
      'separated'
    ]).optional(),

    // Sensitive Data Validation
    ssn: z.string()
      .regex(/^\d{3}-?\d{2}-?\d{4}$/, "Invalid SSN format")
      .optional(),

    annualIncome: z.number().min(0).optional(),

    // Arrays and Other Fields
    qualifyingTags: z.array(z.string()).optional(),

    // Boolean Fields
    isVeteran: z.boolean().optional(),
    hasDisabilities: z.boolean().optional(),
    isStudentFullTime: z.boolean().optional(),
    isSenior: z.boolean().optional(),
    isPregnant: z.boolean().optional(),
  })
  .omit({ id: true, createdAt: true, updatedAt: true });

export type SystemConfig = typeof systemConfig.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type DocumentTemplate = typeof documentTemplates.$inferSelect;
export type Checklist = typeof checklists.$inferSelect;
export type CapitalSource = typeof capitalSources.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type HouseholdMember = typeof householdMembers.$inferSelect;
export type Property = typeof properties.$inferSelect;
export type HouseholdGroup = typeof householdGroups.$inferSelect;

export type InsertSystemConfig = z.infer<typeof insertSystemConfigSchema>;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type InsertChecklist = z.infer<typeof insertChecklistSchema>;
export type InsertCapitalSource = z.infer<typeof insertCapitalSourceSchema>;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type InsertHouseholdGroup = z.infer<typeof insertHouseholdGroupSchema>;
export type InsertHouseholdMember = z.infer<typeof insertHouseholdMemberSchema>;