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
INSERT INTO messages (id, content, created_at, updated_at, organization_id, survivor_id, contact_id, subject, is_read, sender_id, status, parent_id, external_id, tags, sent_at, channel, is_inbound)
SELECT * FROM dblink(:'neondb_connection', 'SELECT m.id, m.content, m.created_at, m.updated_at, m.organization_id, m.survivor_id, m.contact_id, m.subject, m.is_read, m.sender_id, m.status, m.parent_id, m.external_id, m.tags, m.sent_at, m.channel, m.is_inbound FROM messages m WHERE m.sender_id = 4')
AS msgs(id integer, content text, created_at timestamp, updated_at timestamp, organization_id integer, survivor_id integer, contact_id integer, subject text, is_read boolean, sender_id integer, status text, parent_id integer, external_id text, tags text, sent_at timestamp, channel text, is_inbound boolean);

-- 7. Migrate household data
INSERT INTO household_groups (id, name, property_id, type, created_at)
SELECT * FROM dblink(:'neondb_connection', 'SELECT hg.id, hg.name, hg.property_id, hg.type, hg.created_at FROM household_groups hg WHERE EXISTS (SELECT 1 FROM properties p WHERE p.id = hg.property_id AND p.survivor_id IN (SELECT u.id FROM users u WHERE u.user_type = ''survivor'' AND EXISTS (SELECT 1 FROM organization_survivors os WHERE os.survivor_id = u.id AND os.organization_id IN (SELECT o.id FROM organizations o WHERE EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = o.id AND om.user_id = 4)))))')
AS hgroups(id integer, name text, property_id integer, type text, created_at timestamp);

INSERT INTO household_members (id, name, type, created_at, group_id, date_of_birth, relationship, occupation, income_range, special_needs, 
                               employment_status, annual_income, qualifying_tags, updated_at)
SELECT * FROM dblink(:'neondb_connection', 'SELECT hm.id, hm.name, hm.type, hm.created_at, hm.group_id, hm.date_of_birth, hm.relationship, hm.occupation, hm.income_range, hm.special_needs, hm.employment_status, hm.annual_income, hm.qualifying_tags, hm.updated_at FROM household_members hm WHERE hm.group_id IN (SELECT hg.id FROM household_groups hg WHERE EXISTS (SELECT 1 FROM properties p WHERE p.id = hg.property_id AND p.survivor_id IN (SELECT u.id FROM users u WHERE u.user_type = ''survivor'' AND EXISTS (SELECT 1 FROM organization_survivors os WHERE os.survivor_id = u.id AND os.organization_id IN (SELECT o.id FROM organizations o WHERE EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = o.id AND om.user_id = 4))))))')
AS hmembers(id integer, name text, type text, created_at timestamp, group_id integer, date_of_birth timestamp, relationship text, occupation text, income_range text, special_needs text, employment_status text, annual_income numeric, qualifying_tags text[], updated_at timestamp);

-- 8. Migrate properties
INSERT INTO properties (id, type, address, zip_code, created_at, survivor_id, ownership_status, primary_residence)
SELECT * FROM dblink(:'neondb_connection', 'SELECT p.id, p.type, p.address, p.zip_code, p.created_at, p.survivor_id, p.ownership_status, p.primary_residence FROM properties p WHERE p.survivor_id IN (SELECT u.id FROM users u WHERE u.user_type = ''survivor'' AND EXISTS (SELECT 1 FROM organization_survivors os WHERE os.survivor_id = u.id AND os.organization_id IN (SELECT o.id FROM organizations o WHERE EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = o.id AND om.user_id = 4))))')
AS props(id integer, type text, address text, zip_code text, created_at timestamp, survivor_id integer, ownership_status text, primary_residence boolean);

-- 9. Migrate funding opportunities and opportunity matches
INSERT INTO funding_opportunities (id, name, description, amount, deadline, organization_id, created_by_id, requirements, status, created_at, eligibility_criteria, is_public, updated_at)
SELECT * FROM dblink(:'neondb_connection', 'SELECT f.id, f.name, f.description, f.amount, f.deadline, f.organization_id, f.created_by_id, f.requirements, f.status, f.created_at, f.eligibility_criteria, f.is_public, f.updated_at FROM funding_opportunities f WHERE f.organization_id IN (SELECT o.id FROM organizations o WHERE EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = o.id AND om.user_id = 4))')
AS fopps(id integer, name text, description text, amount numeric, deadline timestamp, organization_id integer, created_by_id integer, requirements text[], status text, created_at timestamp, eligibility_criteria jsonb, is_public boolean, updated_at timestamp);

INSERT INTO opportunity_matches (id, opportunity_id, survivor_id, match_score, match_criteria, status, notes, last_checked_at, created_at, updated_at, applied_at, applied_by_id)
SELECT * FROM dblink(:'neondb_connection', 'SELECT om.id, om.opportunity_id, om.survivor_id, om.match_score, om.match_criteria, om.status, om.notes, om.last_checked_at, om.created_at, om.updated_at, om.applied_at, om.applied_by_id FROM opportunity_matches om WHERE om.survivor_id IN (SELECT u.id FROM users u WHERE u.user_type = ''survivor'' AND EXISTS (SELECT 1 FROM organization_survivors os WHERE os.survivor_id = u.id AND os.organization_id IN (SELECT o.id FROM organizations o WHERE EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = o.id AND om.user_id = 4))))')
AS opmatches(id integer, opportunity_id integer, survivor_id integer, match_score numeric, match_criteria jsonb, status text, notes text, last_checked_at timestamp, created_at timestamp, updated_at timestamp, applied_at timestamp, applied_by_id integer);

-- 10. Migrate documents
INSERT INTO documents (id, name, path, type, size, capital_source_id)
SELECT * FROM dblink(:'neondb_connection', 'SELECT d.id, d.name, d.path, d.type, d.size, d.capital_source_id FROM documents d WHERE d.id IN (SELECT cs.id FROM capital_sources cs WHERE cs.survivor_id IN (SELECT u.id FROM users u WHERE u.user_type = ''survivor'' AND EXISTS (SELECT 1 FROM organization_survivors os WHERE os.survivor_id = u.id AND os.organization_id IN (SELECT o.id FROM organizations o WHERE EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = o.id AND om.user_id = 4)))))')
AS docs(id integer, name text, path text, type text, size integer, capital_source_id integer);

-- 11. Migrate tasks - with schema adjustments for the production database
INSERT INTO tasks (id, text, completed, urgent, stage, created_at, created_by_id, created_by_type, assigned_to_id, assigned_to_type, subtasks)
SELECT * FROM dblink(:'neondb_connection', 'SELECT t.id, t.text, t.completed, t.urgent, t.stage, t.created_at, t.created_by_id, t.created_by_type, t.assigned_to_id, t.assigned_to_type, t.subtasks FROM tasks t WHERE t.created_by_id = 4 OR t.assigned_to_id = 4')
AS tasks(id integer, text text, completed boolean, urgent boolean, stage text, created_at timestamp, created_by_id integer, created_by_type text, assigned_to_id integer, assigned_to_type text, subtasks text);

-- 12. Migrate capital sources
INSERT INTO capital_sources (id, type, name, amount, status, description, created_at, survivor_id, funding_category)
SELECT * FROM dblink(:'neondb_connection', 'SELECT cs.id, cs.type, cs.name, cs.amount, cs.status, cs.description, cs.created_at, cs.survivor_id, cs.funding_category FROM capital_sources cs WHERE cs.survivor_id IN (SELECT u.id FROM users u WHERE u.user_type = ''survivor'' AND EXISTS (SELECT 1 FROM organization_survivors os WHERE os.survivor_id = u.id AND os.organization_id IN (SELECT o.id FROM organizations o WHERE EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = o.id AND om.user_id = 4))))')
AS csources(id integer, type text, name text, amount numeric, status text, description text, created_at timestamp, survivor_id integer, funding_category text);

-- Remaining tables can be added as needed after reviewing relationships