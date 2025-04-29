import { pgTable, text, serial, integer, boolean, timestamp, numeric, primaryKey, date, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Organizations table - declaring first to avoid circular references
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // government, non-profit, etc.
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  // Email configuration fields
  emailDomain: text("email_domain"),
  emailDomainVerified: boolean("email_domain_verified").default(false),
  emailSenderName: text("email_sender_name"),
  emailSenderEmail: text("email_sender_email"),
  emailDkimSelector: text("email_dkim_selector"),
  emailDkimKey: text("email_dkim_key"),
  emailSpfRecord: text("email_spf_record"),
  // System settings fields
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color").default("#0070F3"),
  defaultSmsName: text("default_sms_name"),
  // Feature toggles
  enableMessaging: boolean("enable_messaging").default(true),
  enableCalendar: boolean("enable_calendar").default(true),
  enableActionPlan: boolean("enable_action_plan").default(true),
  enableDocuments: boolean("enable_documents").default(true),
  enableHouseholdManagement: boolean("enable_household_management").default(true),
  enableFundingOpportunities: boolean("enable_funding_opportunities").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Users table with organization reference and user type
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  username: text("username").unique(),
  password: text("password"),
  email: text("email").notNull().unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  // userType: survivor (client) or practitioner (business user)
  userType: text("user_type").notNull().default("practitioner"),
  // role: user (basic access), admin (org admin), super_admin (cross-org access), case_manager
  role: text("role").notNull().default("user"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
  organizationId: integer("organization_id").references(() => organizations.id),
  // Additional fields for practitioners
  jobTitle: text("job_title"),
  department: text("department"),
  // Additional fields for survivors/clients
  isVerified: boolean("is_verified").default(false),
});

// Organization members junction table (for practitioners/staff)
export const organizationMembers = pgTable("organization_members", {
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  role: text("role").default("member"), // Options: member, admin, owner
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.organizationId] }),
}));

// Organization-Survivor relationship table
export const organizationSurvivors = pgTable("organization_survivors", {
  survivorId: integer("survivor_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  isPrimary: boolean("is_primary").default(false),
  status: text("status").default("active"), // Options: active, pending, inactive, archived
  notes: text("notes"),
  addedById: integer("added_by_id").references(() => users.id),
  addedAt: timestamp("added_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.survivorId, t.organizationId] }),
}));

export const systemConfig = pgTable("system_config", {
  id: serial("id").primaryKey(),
  emailAddress: text("email_address").notNull(),
  inboxId: text("inbox_id").notNull(),
  phoneNumber: text("phone_number"),
  phoneId: text("phone_id"),
  stage: text("stage").default("S"), // New field for the START framework stage (S,T,A,R,T)
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  address: text("address").notNull(),
  zipCode: text("zip_code"),  // Adding zip code field
  type: text("type").notNull(),
  ownershipStatus: text("ownership_status").notNull(),
  primaryResidence: boolean("primary_residence").default(false),
  survivorId: integer("survivor_id").references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const householdGroups = pgTable("household_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  propertyId: integer("property_id").references(() => properties.id, { onDelete: 'cascade' }),
  type: text("type").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const householdMembers = pgTable("household_members", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  firstName: text("first_name"),
  middleName: text("middle_name"),
  lastName: text("last_name"),
  type: text("type").notNull(),
  groupId: integer("group_id").references(() => householdGroups.id, { onDelete: 'cascade' }),

  // 1. Personal Identification
  dateOfBirth: text("date_of_birth"),
  age: integer("age"),
  gender: text("gender"),
  pronouns: text("pronouns"),
  ssn: text("ssn"),
  maritalStatus: text("marital_status"),
  primaryLanguage: text("primary_language"),
  race: text("race"),
  ethnicity: text("ethnicity"),
  citizenshipStatus: text("citizenship_status"),
  isVeteran: boolean("is_veteran").default(false),
  hasDisabilities: boolean("has_disabilities").default(false),
  disabilityNotes: text("disability_notes"),

  // 2. Contact Info
  phone: text("phone"),
  email: text("email"),
  preferredContactMethod: text("preferred_contact_method"),
  alternateContactName: text("alternate_contact_name"),
  alternateContactRelationship: text("alternate_contact_relationship"),
  alternateContactPhone: text("alternate_contact_phone"),

  // 3. Residency Info
  currentAddress: text("current_address"),
  moveInDate: text("move_in_date"),
  residenceType: text("residence_type"),
  previousAddress: text("previous_address"),
  lengthOfResidency: text("length_of_residency"),
  housingStatus: text("housing_status"),
  femaCaseNumber: text("fema_case_number"),

  // 4. Education & Employment
  educationLevel: text("education_level"),
  isStudentFullTime: boolean("is_student_full_time").default(false),
  institution: text("institution"),
  employmentStatus: text("employment_status"),
  employer: text("employer"),
  occupation: text("occupation"),
  annualIncome: numeric("annual_income"),
  incomeSource: text("income_source"),

  // 5. Health & Wellness
  medicalConditions: text("medical_conditions"),
  medications: text("medications"),
  mentalHealthConditions: text("mental_health_conditions"),
  mobilityDevices: text("mobility_devices"),
  healthInsurance: text("health_insurance"),
  primaryCareProvider: text("primary_care_provider"),
  specialNeeds: text("special_needs"),

  // 6. Government or Institutional Involvement
  publicAssistancePrograms: text("public_assistance_programs").array(),
  caseworkerName: text("caseworker_name"),
  caseworkerAgency: text("caseworker_agency"),
  justiceSystemInvolvement: boolean("justice_system_involvement").default(false),
  childWelfareInvolvement: boolean("child_welfare_involvement").default(false),
  immigrationProceedings: boolean("immigration_proceedings").default(false),

  // 7. Custom Tags (Grant-Aware Metadata)
  qualifyingTags: text("qualifying_tags").array(),
  notes: text("notes"),

  // 8. Disaster-Specific Impacts
  disasterInjuries: boolean("disaster_injuries").default(false),
  lostMedication: boolean("lost_medication").default(false),
  postDisasterAccessNeeds: text("post_disaster_access_needs"),
  transportAccess: boolean("transport_access").default(false),
  lostDocuments: text("lost_documents").array(),

  // Other Member Properties
  relationship: text("relationship"),
  isSenior: boolean("is_senior").default(false),
  isPregnant: boolean("is_pregnant").default(false),

  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
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

// Forward declare the messages table for self-reference
export const messagesTable = "messages";

// Define messages table with type annotations
export const messages = pgTable(messagesTable, {
  id: serial("id").primaryKey(),
  // Connect messages to specific clients/survivors
  survivorId: integer("survivor_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  // Optional contactId for external contacts (can be null for system messages)
  contactId: integer("contact_id").references(() => contacts.id),
  // Encrypted message content
  content: text("content").notNull(),
  // Message metadata
  subject: text("subject"),
  // Channel type (email, sms, call, system)
  channel: text("channel").notNull(),
  // Message direction
  isInbound: boolean("is_inbound").notNull(),
  // Message read status
  isRead: boolean("is_read").default(false),
  // Message status (sent, delivered, failed)
  status: text("status").default("sent"),
  // Optional reference to other messages (for replies/threads)
  parentId: integer("parent_id").references(() => messages.id),
  // Unique external ID (for tracking in external systems)
  externalId: text("external_id").unique(),
  // Message tags for categorization (comma-separated values: housing,insurance,documents,etc.)
  tags: text("tags"),
  // Optional organization ID for messages sent on behalf of an organization
  organizationId: integer("organization_id").references(() => organizations.id),
  // Optional sender ID (practitioner who sent the message on behalf of organization)
  senderId: integer("sender_id").references(() => users.id),
  // Timestamps
  sentAt: timestamp("sent_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
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

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(),
  completed: boolean("completed").default(false),
  urgent: boolean("urgent").default(false),
  stage: text("stage").notNull(),
  
  // Task creator information
  createdById: integer("created_by_id").notNull(),
  createdByType: text("created_by_type").notNull(), // "survivor" or "practitioner"
  
  // Task assignment information
  assignedToId: integer("assigned_to_id"),
  assignedToType: text("assigned_to_type"), // "survivor" or "practitioner"
  
  // Store subtasks as a JSON array
  subtasks: text("subtasks").default("[]"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Funding opportunities (grants) table
export const fundingOpportunities = pgTable("funding_opportunities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  
  // Status field (required by database)
  status: text("status").notNull().default("active"),
  
  // Grant details
  awardAmount: numeric("award_amount"), // Single amount
  awardMinimum: numeric("award_minimum"), // For range-based awards
  awardMaximum: numeric("award_maximum"), // For range-based awards
  
  // Application period
  applicationStartDate: date("application_start_date").notNull(),
  applicationEndDate: date("application_end_date").notNull(),
  
  // Eligibility criteria
  eligibilityCriteria: json("eligibility_criteria").notNull().default({}),
  
  // Visibility settings
  isPublic: boolean("is_public").default(true),
  
  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Opportunity matches table - stores matched clients to funding opportunities
export const opportunityMatches = pgTable("opportunity_matches", {
  id: serial("id").primaryKey(),
  opportunityId: integer("opportunity_id").notNull().references(() => fundingOpportunities.id, { onDelete: 'cascade' }),
  survivorId: integer("survivor_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Match details
  matchScore: numeric("match_score").notNull(), // 0-100 score representing how well client matches criteria
  matchCriteria: json("match_criteria").notNull().default({}), // Detailed breakdown of what criteria matched
  
  // Match status
  status: text("status").notNull().default("pending"), // pending, notified, applied, approved, rejected
  
  // Additional data
  notes: text("notes"),
  lastCheckedAt: timestamp("last_checked_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  uniqueMatchIndex: primaryKey({ columns: [t.opportunityId, t.survivorId] }),
}));

// Staff member schema (for organization staff management)
export const staffSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email" }),
  phone: z.string().min(10, { message: "Please enter a valid phone number" }).optional(),
  role: z.enum(["admin", "case_manager", "intake_specialist", "data_analyst", "volunteer"]),
  title: z.string().optional(),
  status: z.enum(["active", "inactive", "pending"]).default("pending"),
  avatarUrl: z.string().optional(),
  lastActive: z.string().optional(),
  permissions: z.object({
    canManageClients: z.boolean().default(true),
    canManageStaff: z.boolean().default(false),
    canViewReports: z.boolean().default(true),
    canEditOrganizationSettings: z.boolean().default(false),
    canManageDocuments: z.boolean().default(true),
    canSendMessages: z.boolean().default(true),
  }),
});

export const insertStaffSchema = staffSchema.omit({ id: true, status: true, avatarUrl: true, lastActive: true });

// Insert schemas
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
export const insertMessageSchema = createInsertSchema(messages)
  .extend({
    // Require the channel type to be a specific value
    channel: z.enum(["email", "sms", "call", "system"]),
    // Make contactId optional
    contactId: z.number().optional(),
    // Encryption happens at the storage layer, so content is just regular text here
    content: z.string().min(1, "Message content is required"),
    // Add validation for status
    status: z.enum(["sent", "delivered", "read", "failed"]).default("sent"),
    // Optional fields
    subject: z.string().optional(),
    parentId: z.number().optional(),
    externalId: z.string().optional(),
    // Make organization and sender information optional
    organizationId: z.number().optional(),
    senderId: z.number().optional(),
    // Tags for categorization
    tags: z.string().optional()
  })
  .omit({ id: true, createdAt: true, updatedAt: true });
export const insertTemplateSchema = createInsertSchema(documentTemplates).omit({ id: true });
export const insertChecklistSchema = createInsertSchema(checklists).omit({ id: true });
export const insertTaskSchema = createInsertSchema(tasks)
  .extend({
    stage: z.enum(["secure_stabilize", "take_stock", "align_recovery", "rebuild_restore", "transition_normal"]),
    createdByType: z.enum(["survivor", "practitioner"]),
    assignedToType: z.enum(["survivor", "practitioner"]).optional(),
    // Fixed subtasks schema to handle both string JSON and parsed objects
    subtasks: z.union([
      z.string(),
      z.array(z.object({
        id: z.number().or(z.string()),
        text: z.string(),
        completed: z.boolean().default(false)
      }))
    ]).optional(),
  })
  .omit({ id: true, createdAt: true });

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
    // Basic Information
    name: z.string().min(1, "Name is required"),
    firstName: z.string().optional(),
    middleName: z.string().optional(),
    lastName: z.string().optional(),
    type: z.enum(['adult', 'child', 'senior', 'dependent']),
    
    // 1. Personal Identification
    dateOfBirth: z.string().optional(),
    age: z.number().optional(),
    relationship: z.enum([
      'head',
      'spouse',
      'child',
      'parent',
      'grandparent',
      'other'
    ]).optional(),
    gender: z.string().optional(),
    pronouns: z.string().optional(),
    race: z.string().optional(),
    ethnicity: z.string().optional(),
    primaryLanguage: z.string().optional(),
    citizenshipStatus: z.string().optional(),
    ssn: z.string()
      .regex(/^\d{3}-?\d{2}-?\d{4}$/, "Invalid SSN format")
      .optional(),
    maritalStatus: z.enum([
      'single',
      'married',
      'divorced',
      'widowed',
      'separated'
    ]).optional(),
    
    // 2. Contact Information
    phone: z.string().optional(),
    email: z.string().email("Please enter a valid email").optional().or(z.literal('')),
    preferredContactMethod: z.string().optional(),
    alternateContactName: z.string().optional(),
    alternateContactRelationship: z.string().optional(),
    alternateContactPhone: z.string().optional(),
    
    // 3. Residency Information
    currentAddress: z.string().optional(),
    moveInDate: z.string().optional(),
    residenceType: z.string().optional(),
    previousAddress: z.string().optional(),
    lengthOfResidency: z.string().optional(),
    housingStatus: z.string().optional(),
    femaCaseNumber: z.string().optional(),
    
    // 4. Education & Employment 
    employmentStatus: z.enum([
      'full_time',
      'part_time',
      'self_employed',
      'unemployed',
      'retired',
      'student'
    ]).optional(),
    educationLevel: z.enum([
      'less_than_high_school',
      'high_school',
      'some_college',
      'associates',
      'bachelors',
      'masters',
      'doctorate'
    ]).optional(),
    employer: z.string().optional(),
    occupation: z.string().optional(),
    annualIncome: z.number().min(0).optional(),
    incomeSource: z.string().optional(),
    institution: z.string().optional(),
    
    // 5. Health & Wellness
    medicalConditions: z.string().optional(),
    medications: z.string().optional(),
    mentalHealthConditions: z.string().optional(),
    mobilityDevices: z.string().optional(),
    healthInsurance: z.string().optional(),
    primaryCareProvider: z.string().optional(),
    specialNeeds: z.string().optional(),
    
    // 6. Government or Institutional Involvement
    publicAssistancePrograms: z.array(z.string()).optional(),
    caseworkerName: z.string().optional(),
    caseworkerAgency: z.string().optional(),
    
    // 7. Custom Tags (Grant-Aware Metadata)
    qualifyingTags: z.array(z.string()).optional(),
    notes: z.string().optional(),
    
    // 8. Disaster-Specific Impacts
    postDisasterAccessNeeds: z.string().optional(),
    lostDocuments: z.array(z.string()).optional(),

    // Boolean Fields
    isVeteran: z.boolean().optional(),
    hasDisabilities: z.boolean().optional(),
    disabilityNotes: z.string().optional(),
    isStudentFullTime: z.boolean().optional(),
    isSenior: z.boolean().optional(),
    isPregnant: z.boolean().optional(),
    justiceSystemInvolvement: z.boolean().optional(),
    childWelfareInvolvement: z.boolean().optional(),
    immigrationProceedings: z.boolean().optional(),
    disasterInjuries: z.boolean().optional(),
    lostMedication: z.boolean().optional(),
    transportAccess: z.boolean().optional(),
  })
  .omit({ id: true, createdAt: true, updatedAt: true });

export const insertUserSchema = createInsertSchema(users)
  .extend({
    password: z.string().min(8, "Password must be at least 8 characters"),
    email: z.string().email("Please enter a valid email"),
    username: z.string().min(3, "Username must be at least 3 characters"),
    userType: z.enum(["survivor", "practitioner"]).default("practitioner"),
    role: z.enum(["user", "admin", "super_admin"]).default("user"),
    jobTitle: z.string().optional(),
    department: z.string().optional(),
    isVerified: z.boolean().optional()
  })
  .omit({ id: true, createdAt: true, updatedAt: true, name: true });

export const insertOrganizationSchema = createInsertSchema(organizations)
  .extend({
    name: z.string().min(1, "Organization name is required"),
    type: z.enum(["government", "non_profit", "private", "other"]),
    email: z.string().email("Please enter a valid email").optional(),
    // Email configuration fields
    emailDomain: z.string().optional(),
    emailDomainVerified: z.boolean().default(false),
    emailSenderName: z.string().optional(),
    emailSenderEmail: z.string().email("Please enter a valid sender email").optional(),
    emailDkimSelector: z.string().optional(),
    emailDkimKey: z.string().optional(),
    emailSpfRecord: z.string().optional(),
    // System settings fields
    logoUrl: z.string().url("Please enter a valid URL").optional().nullable(),
    primaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Please enter a valid hex color").default("#0070F3"),
    defaultSmsName: z.string().optional(),
    // Feature toggles
    enableMessaging: z.boolean().default(true),
    enableCalendar: z.boolean().default(true),
    enableActionPlan: z.boolean().default(true),
    enableDocuments: z.boolean().default(true),
    enableHouseholdManagement: z.boolean().default(true),
    enableFundingOpportunities: z.boolean().default(true),
  })
  .omit({ id: true, createdAt: true, updatedAt: true });

// Schema for updating an organization's system settings
export const updateOrganizationSettingsSchema = z.object({
  logoUrl: z.string().url("Please enter a valid URL").optional().nullable(),
  primaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Please enter a valid hex color").optional(),
  defaultSmsName: z.string().optional().nullable(),
  enableMessaging: z.boolean().optional(),
  enableCalendar: z.boolean().optional(),
  enableActionPlan: z.boolean().optional(),
  enableDocuments: z.boolean().optional(),
  enableHouseholdManagement: z.boolean().optional(),
  enableFundingOpportunities: z.boolean().optional(),
});

export const insertOrganizationMemberSchema = createInsertSchema(organizationMembers)
  .extend({
    role: z.enum(["member", "admin", "owner"]).optional(),
  })
  .omit({ joinedAt: true });

export const insertOrganizationSurvivorSchema = createInsertSchema(organizationSurvivors)
  .extend({
    status: z.enum(["active", "pending", "inactive", "archived"]).default("active"),
    isPrimary: z.boolean().default(false),
    notes: z.string().optional(),
  })
  .omit({ addedAt: true, updatedAt: true });

// Define ZipCode range schema for funding opportunities eligibility criteria
export const zipCodeRangeSchema = z.object({
  type: z.literal('zipCode'),
  ranges: z.array(
    z.object({
      min: z.string().regex(/^\d{5}$/, "Invalid zip code format"),
      max: z.string().regex(/^\d{5}$/, "Invalid zip code format"),
    })
  ),
});

// Define Income range schema for funding opportunities eligibility criteria
export const incomeRangeSchema = z.object({
  type: z.literal('income'),
  ranges: z.array(
    z.object({
      min: z.number().min(0, "Minimum income must be non-negative"),
      max: z.number().min(0, "Maximum income must be non-negative"),
    })
  ),
});

// Define Disaster event schema for funding opportunities eligibility criteria
export const disasterEventSchema = z.object({
  type: z.literal('disasterEvent'),
  events: z.array(z.string().min(1, "Disaster event name is required")),
});

// Define household size schema for funding opportunities eligibility criteria
export const householdSizeSchema = z.object({
  type: z.literal('householdSize'),
  ranges: z.array(
    z.object({
      min: z.number().min(1, "Minimum household size must be at least 1"),
      max: z.number().min(1, "Maximum household size must be at least 1"),
    })
  ),
});

// Define custom criteria schema for funding opportunities eligibility criteria
export const customCriteriaSchema = z.object({
  type: z.literal('custom'),
  key: z.string().min(1, "Criteria key is required"),
  values: z.array(z.string().min(1, "Criteria value is required")),
});

// Union all eligibility criteria schemas
export const eligibilityCriteriaSchema = z.array(
  z.union([
    zipCodeRangeSchema,
    incomeRangeSchema,
    disasterEventSchema,
    householdSizeSchema,
    customCriteriaSchema
  ])
);

// Funding opportunities insert schema
export const insertFundingOpportunitySchema = createInsertSchema(fundingOpportunities)
  .extend({
    name: z.string().min(1, "Name is required"),
    description: z.string().min(1, "Description is required"),
    status: z.string().default("active"),
    // Either awardAmount OR both awardMinimum and awardMaximum must be provided
    awardAmount: z.number().min(0, "Award amount must be non-negative").optional(),
    awardMinimum: z.number().min(0, "Minimum award must be non-negative").optional(),
    awardMaximum: z.number().min(0, "Maximum award must be non-negative").optional(),
    applicationStartDate: z.union([z.date(), z.string()]).optional(),
    applicationEndDate: z.union([z.date(), z.string()]).optional(),
    eligibilityCriteria: eligibilityCriteriaSchema.optional(),
    isPublic: z.boolean().default(true),
  })
  .omit({ id: true, createdAt: true, updatedAt: true });

// The organization settings schema is already defined above

// Export types
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
export type User = typeof users.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type OrganizationSurvivor = typeof organizationSurvivors.$inferSelect;
export type FundingOpportunity = typeof fundingOpportunities.$inferSelect;
export type UpdateOrganizationSettings = z.infer<typeof updateOrganizationSettingsSchema>;

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
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type InsertOrganizationMember = z.infer<typeof insertOrganizationMemberSchema>;
export type InsertOrganizationSurvivor = z.infer<typeof insertOrganizationSurvivorSchema>;
export type InsertFundingOpportunity = z.infer<typeof insertFundingOpportunitySchema>;

// Opportunity matches insert schema
export const insertOpportunityMatchSchema = createInsertSchema(opportunityMatches)
  .extend({
    status: z.enum(['pending', 'notified', 'applied', 'approved', 'rejected']).default('pending'),
    matchScore: z.number().min(0).max(100),
    matchCriteria: z.record(z.string(), z.any()),
    notes: z.string().optional(),
  })
  .omit({ id: true, createdAt: true, updatedAt: true, lastCheckedAt: true });

export type OpportunityMatch = typeof opportunityMatches.$inferSelect;
export type InsertOpportunityMatch = z.infer<typeof insertOpportunityMatchSchema>;