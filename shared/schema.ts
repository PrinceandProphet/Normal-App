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
  type: text("type").notNull(), // 'email' | 'sms'
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
  type: text("type").notNull(), // 'FEMA' | 'Insurance' | 'Grant'
  name: text("name").notNull(),
  amount: numeric("amount").notNull(),
  status: text("status").notNull(), // 'current' | 'projected'
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSystemConfigSchema = createInsertSchema(systemConfig).omit({ id: true, updatedAt: true });
export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true });
export const insertContactSchema = createInsertSchema(contacts).omit({ id: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true });
export const insertTemplateSchema = createInsertSchema(documentTemplates).omit({ id: true });
export const insertChecklistSchema = createInsertSchema(checklists).omit({ id: true });

// Custom schema for capital source to handle numeric amount
export const insertCapitalSourceSchema = z.object({
  type: z.enum(["FEMA", "Insurance", "Grant"]),
  name: z.string().min(1, "Name is required"),
  amount: z.number().min(0, "Amount must be non-negative"),
  status: z.enum(["current", "projected"]),
  description: z.string().optional(),
});

export type SystemConfig = typeof systemConfig.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type DocumentTemplate = typeof documentTemplates.$inferSelect;
export type Checklist = typeof checklists.$inferSelect;
export type CapitalSource = typeof capitalSources.$inferSelect;

export type InsertSystemConfig = z.infer<typeof insertSystemConfigSchema>;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type InsertChecklist = z.infer<typeof insertChecklistSchema>;
export type InsertCapitalSource = z.infer<typeof insertCapitalSourceSchema>;