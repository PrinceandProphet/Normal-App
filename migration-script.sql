-- Migration script to move demetriusgray user and related data to production database
-- IMPORTANT: This is a dry run script. We'll review and confirm before executing.

-- Setup cross-database connection
-- First create a connection string variable 
\set neondb_connection 'dbname=neondb user=neondb_owner password=npg_Iz5mlXh2qYvK host=ep-curly-haze-a66yzzba.us-west-2.aws.neon.tech port=5432'

-- 1. First migrate the user (demetriusgray)
INSERT INTO users (id, email, name, role, organization_id, created_at, username, password, first_name, last_name, updated_at, user_type, job_title, department, is_verified)
SELECT * FROM dblink(:'neondb_connection', 'SELECT id, email, name, role, organization_id, created_at, username, password, first_name, last_name, updated_at, user_type, job_title, department, is_verified FROM users WHERE id = 4')
AS users(id integer, email text, name text, role text, organization_id integer, created_at timestamp, username text, password text, first_name text, last_name text, updated_at timestamp, user_type text, job_title text, department text, is_verified boolean);

-- 2. Look for organizations created by this user
-- We'll select the organizations directly since the owner_id might not exist,
-- but we'll assume that a super_admin might have created organizations
-- Note: This will return no results if they don't have associated organizations
INSERT INTO organizations (id, name, type, email, phone, website, created_at, address, updated_at, email_domain, email_domain_verified, email_sender_name, email_sender_email, email_dkim_selector, email_dkim_key, email_spf_record, logo_url, primary_color, default_sms_name, enable_messaging, enable_calendar, enable_action_plan, enable_documents, enable_household_management, enable_funding_opportunities)
SELECT * FROM dblink(:'neondb_connection', 'SELECT o.id, o.name, o.type, o.email, o.phone, o.website, o.created_at, o.address, o.updated_at, o.email_domain, o.email_domain_verified, o.email_sender_name, o.email_sender_email, o.email_dkim_selector, o.email_dkim_key, o.email_spf_record, o.logo_url, o.primary_color, o.default_sms_name, o.enable_messaging, o.enable_calendar, o.enable_action_plan, o.enable_documents, o.enable_household_management, o.enable_funding_opportunities FROM organizations o WHERE EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = o.id AND om.user_id = 4)')
AS orgs(id integer, name text, type text, email text, phone text, website text, created_at timestamp, address text, updated_at timestamp, email_domain text, email_domain_verified boolean, email_sender_name text, email_sender_email text, email_dkim_selector text, email_dkim_key text, email_spf_record text, logo_url text, primary_color text, default_sms_name text, enable_messaging boolean, enable_calendar boolean, enable_action_plan boolean, enable_documents boolean, enable_household_management boolean, enable_funding_opportunities boolean);

-- 3. Look for any survivor/client users related to demetriusgray
-- Since we don't have a direct relationship, we'll look for survivors in the organizations associated with demetriusgray
INSERT INTO users (id, email, name, role, organization_id, created_at, username, password, first_name, last_name, updated_at, user_type, job_title, department, is_verified)
SELECT * FROM dblink(:'neondb_connection', 'SELECT u.id, u.email, u.name, u.role, u.organization_id, u.created_at, u.username, u.password, u.first_name, u.last_name, u.updated_at, u.user_type, u.job_title, u.department, u.is_verified FROM users u WHERE u.user_type = ''survivor'' AND EXISTS (SELECT 1 FROM organization_survivors os WHERE os.survivor_id = u.id AND os.organization_id IN (SELECT o.id FROM organizations o WHERE EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = o.id AND om.user_id = 4)))')
AS survivors(id integer, email text, name text, role text, organization_id integer, created_at timestamp, username text, password text, first_name text, last_name text, updated_at timestamp, user_type text, job_title text, department text, is_verified boolean);

-- 4. Migrate organization_members for demetriusgray
INSERT INTO organization_members (user_id, organization_id, role, joined_at)
SELECT * FROM dblink(:'neondb_connection', 'SELECT user_id, organization_id, role, joined_at FROM organization_members WHERE user_id = 4')
AS org_members(user_id integer, organization_id integer, role text, joined_at timestamp);

-- 5. Migrate organization_survivors relationships
INSERT INTO organization_survivors (organization_id, survivor_id, is_primary, status, notes, added_by_id, added_at, updated_at)
SELECT * FROM dblink(:'neondb_connection', 'SELECT os.organization_id, os.survivor_id, os.is_primary, os.status, os.notes, os.added_by_id, os.added_at, os.updated_at FROM organization_survivors os WHERE os.organization_id IN (SELECT o.id FROM organizations o WHERE EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = o.id AND om.user_id = 4))')
AS org_survivors(organization_id integer, survivor_id integer, is_primary boolean, status text, notes text, added_by_id integer, added_at timestamp, updated_at timestamp);

-- 6. Migrate messages related to demetriusgray
INSERT INTO messages (id, content, created_at, updated_at, organization_id, survivor_id, contact_id, subject, read, sender_id, sender_type, recipient_id, recipient_type, status, tags, sent_at)
SELECT * FROM dblink(:'neondb_connection', 'SELECT m.id, m.content, m.created_at, m.updated_at, m.organization_id, m.survivor_id, m.contact_id, m.subject, m.read, m.sender_id, m.sender_type, m.recipient_id, m.recipient_type, m.status, m.tags, m.sent_at FROM messages m WHERE m.sender_id = 4 OR m.recipient_id = 4')
AS msgs(id integer, content text, created_at timestamp, updated_at timestamp, organization_id integer, survivor_id integer, contact_id integer, subject text, read boolean, sender_id integer, sender_type text, recipient_id integer, recipient_type text, status text, tags text[], sent_at timestamp);

-- 7. Migrate household data
INSERT INTO household_groups (id, name, created_at, updated_at, survivor_id, description, address, housing_type)
SELECT * FROM dblink(:'neondb_connection', 'SELECT hg.id, hg.name, hg.created_at, hg.updated_at, hg.survivor_id, hg.description, hg.address, hg.housing_type FROM household_groups hg WHERE hg.survivor_id IN (SELECT u.id FROM users u WHERE u.user_type = ''survivor'' AND EXISTS (SELECT 1 FROM organization_survivors os WHERE os.survivor_id = u.id AND os.organization_id IN (SELECT o.id FROM organizations o WHERE EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = o.id AND om.user_id = 4))))')
AS hgroups(id integer, name text, created_at timestamp, updated_at timestamp, survivor_id integer, description text, address text, housing_type text);

INSERT INTO household_members (id, first_name, last_name, birth_date, relationship, created_at, updated_at, household_group_id, income, employment_status, metadata)
SELECT * FROM dblink(:'neondb_connection', 'SELECT hm.id, hm.first_name, hm.last_name, hm.birth_date, hm.relationship, hm.created_at, hm.updated_at, hm.household_group_id, hm.income, hm.employment_status, hm.metadata FROM household_members hm WHERE hm.household_group_id IN (SELECT hg.id FROM household_groups hg WHERE hg.survivor_id IN (SELECT u.id FROM users u WHERE u.user_type = ''survivor'' AND EXISTS (SELECT 1 FROM organization_survivors os WHERE os.survivor_id = u.id AND os.organization_id IN (SELECT o.id FROM organizations o WHERE EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = o.id AND om.user_id = 4)))))')
AS hmembers(id integer, first_name text, last_name text, birth_date date, relationship text, created_at timestamp, updated_at timestamp, household_group_id integer, income numeric, employment_status text, metadata jsonb);

-- 8. Migrate properties
INSERT INTO properties (id, type, address, zip_code, created_at, survivor_id, ownership_status, primary_residence)
SELECT * FROM dblink(:'neondb_connection', 'SELECT p.id, p.type, p.address, p.zip_code, p.created_at, p.survivor_id, p.ownership_status, p.primary_residence FROM properties p WHERE p.survivor_id IN (SELECT u.id FROM users u WHERE u.user_type = ''survivor'' AND EXISTS (SELECT 1 FROM organization_survivors os WHERE os.survivor_id = u.id AND os.organization_id IN (SELECT o.id FROM organizations o WHERE EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = o.id AND om.user_id = 4))))')
AS props(id integer, type text, address text, zip_code text, created_at timestamp, survivor_id integer, ownership_status text, primary_residence boolean);

-- 9. Migrate funding opportunities and opportunity matches
INSERT INTO funding_opportunities (id, title, description, amount, deadline, created_at, updated_at, organization_id, status, eligibility_criteria, application_url, contact_info, funding_source, funding_type, geographic_scope)
SELECT * FROM dblink(:'neondb_connection', 'SELECT f.id, f.title, f.description, f.amount, f.deadline, f.created_at, f.updated_at, f.organization_id, f.status, f.eligibility_criteria, f.application_url, f.contact_info, f.funding_source, f.funding_type, f.geographic_scope FROM funding_opportunities f WHERE f.organization_id IN (SELECT o.id FROM organizations o WHERE EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = o.id AND om.user_id = 4))')
AS fopps(id integer, title text, description text, amount numeric, deadline timestamp, created_at timestamp, updated_at timestamp, organization_id integer, status text, eligibility_criteria jsonb, application_url text, contact_info text, funding_source text, funding_type text, geographic_scope text);

INSERT INTO opportunity_matches (id, survivor_id, opportunity_id, created_at, updated_at, status, application_date, review_date, approval_date, notes, match_score, reviewer_id, assigned_to)
SELECT * FROM dblink(:'neondb_connection', 'SELECT om.id, om.survivor_id, om.opportunity_id, om.created_at, om.updated_at, om.status, om.application_date, om.review_date, om.approval_date, om.notes, om.match_score, om.reviewer_id, om.assigned_to FROM opportunity_matches om WHERE om.survivor_id IN (SELECT u.id FROM users u WHERE u.user_type = ''survivor'' AND EXISTS (SELECT 1 FROM organization_survivors os WHERE os.survivor_id = u.id AND os.organization_id IN (SELECT o.id FROM organizations o WHERE EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = o.id AND om.user_id = 4))))')
AS opmatches(id integer, survivor_id integer, opportunity_id integer, created_at timestamp, updated_at timestamp, status text, application_date timestamp, review_date timestamp, approval_date timestamp, notes text, match_score numeric, reviewer_id integer, assigned_to integer);

-- 10. Migrate documents
INSERT INTO documents (id, title, file_path, uploaded_at, updated_at, organization_id, survivor_id, type, description, metadata, size, filename, mimetype)
SELECT * FROM dblink(:'neondb_connection', 'SELECT d.id, d.title, d.file_path, d.uploaded_at, d.updated_at, d.organization_id, d.survivor_id, d.type, d.description, d.metadata, d.size, d.filename, d.mimetype FROM documents d WHERE d.survivor_id IN (SELECT u.id FROM users u WHERE u.user_type = ''survivor'' AND EXISTS (SELECT 1 FROM organization_survivors os WHERE os.survivor_id = u.id AND os.organization_id IN (SELECT o.id FROM organizations o WHERE EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = o.id AND om.user_id = 4))))')
AS docs(id integer, title text, file_path text, uploaded_at timestamp, updated_at timestamp, organization_id integer, survivor_id integer, type text, description text, metadata jsonb, size integer, filename text, mimetype text);

-- 11. Migrate tasks
INSERT INTO tasks (id, title, description, due_date, completed, created_at, updated_at, user_id, organization_id, survivor_id, assigned_by, priority, category, completion_date, status, reminder_sent)
SELECT * FROM dblink(:'neondb_connection', 'SELECT t.id, t.title, t.description, t.due_date, t.completed, t.created_at, t.updated_at, t.user_id, t.organization_id, t.survivor_id, t.assigned_by, t.priority, t.category, t.completion_date, t.status, t.reminder_sent FROM tasks t WHERE t.user_id = 4 OR t.assigned_by = 4 OR t.survivor_id IN (SELECT u.id FROM users u WHERE u.user_type = ''survivor'' AND EXISTS (SELECT 1 FROM organization_survivors os WHERE os.survivor_id = u.id AND os.organization_id IN (SELECT o.id FROM organizations o WHERE EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = o.id AND om.user_id = 4))))')
AS tasks(id integer, title text, description text, due_date timestamp, completed boolean, created_at timestamp, updated_at timestamp, user_id integer, organization_id integer, survivor_id integer, assigned_by integer, priority text, category text, completion_date timestamp, status text, reminder_sent boolean);

-- 12. Migrate capital sources
INSERT INTO capital_sources (id, name, description, amount, source_type, created_at, updated_at, organization_id, survivor_id, application_url, contact_info, status, approval_date, expiration_date, application_deadline, notes, eligibility_criteria, grant_id, reference_number)
SELECT * FROM dblink(:'neondb_connection', 'SELECT cs.id, cs.name, cs.description, cs.amount, cs.source_type, cs.created_at, cs.updated_at, cs.organization_id, cs.survivor_id, cs.application_url, cs.contact_info, cs.status, cs.approval_date, cs.expiration_date, cs.application_deadline, cs.notes, cs.eligibility_criteria, cs.grant_id, cs.reference_number FROM capital_sources cs WHERE cs.survivor_id IN (SELECT u.id FROM users u WHERE u.user_type = ''survivor'' AND EXISTS (SELECT 1 FROM organization_survivors os WHERE os.survivor_id = u.id AND os.organization_id IN (SELECT o.id FROM organizations o WHERE EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = o.id AND om.user_id = 4))))')
AS csources(id integer, name text, description text, amount numeric, source_type text, created_at timestamp, updated_at timestamp, organization_id integer, survivor_id integer, application_url text, contact_info text, status text, approval_date timestamp, expiration_date timestamp, application_deadline timestamp, notes text, eligibility_criteria jsonb, grant_id text, reference_number text);

-- Remaining tables can be added as needed after reviewing relationships