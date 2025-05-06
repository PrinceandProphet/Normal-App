--
-- PostgreSQL database dump
--

-- Dumped from database version 16.8
-- Dumped by pg_dump version 16.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: capital_sources; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.capital_sources (
    id integer NOT NULL,
    type text NOT NULL,
    name text NOT NULL,
    amount numeric NOT NULL,
    status text NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    survivor_id integer,
    funding_category text DEFAULT 'standard'::text
);


ALTER TABLE public.capital_sources OWNER TO neondb_owner;

--
-- Name: capital_sources_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.capital_sources_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.capital_sources_id_seq OWNER TO neondb_owner;

--
-- Name: capital_sources_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.capital_sources_id_seq OWNED BY public.capital_sources.id;


--
-- Name: case_management; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.case_management (
    id integer NOT NULL,
    survivor_id integer,
    case_manager_id integer,
    organization_id integer,
    status text NOT NULL,
    notes text,
    start_date timestamp without time zone NOT NULL,
    end_date timestamp without time zone
);


ALTER TABLE public.case_management OWNER TO neondb_owner;

--
-- Name: case_management_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.case_management_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.case_management_id_seq OWNER TO neondb_owner;

--
-- Name: case_management_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.case_management_id_seq OWNED BY public.case_management.id;


--
-- Name: checklists; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.checklists (
    id integer NOT NULL,
    name text NOT NULL,
    items text[] NOT NULL,
    completed boolean[] NOT NULL
);


ALTER TABLE public.checklists OWNER TO neondb_owner;

--
-- Name: checklists_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.checklists_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.checklists_id_seq OWNER TO neondb_owner;

--
-- Name: checklists_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.checklists_id_seq OWNED BY public.checklists.id;


--
-- Name: contacts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.contacts (
    id integer NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    is_emergency boolean DEFAULT false
);


ALTER TABLE public.contacts OWNER TO neondb_owner;

--
-- Name: contacts_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.contacts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.contacts_id_seq OWNER TO neondb_owner;

--
-- Name: contacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.contacts_id_seq OWNED BY public.contacts.id;


--
-- Name: document_templates; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.document_templates (
    id integer NOT NULL,
    name text NOT NULL,
    content text NOT NULL
);


ALTER TABLE public.document_templates OWNER TO neondb_owner;

--
-- Name: document_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.document_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.document_templates_id_seq OWNER TO neondb_owner;

--
-- Name: document_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.document_templates_id_seq OWNED BY public.document_templates.id;


--
-- Name: documents; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.documents (
    id integer NOT NULL,
    name text NOT NULL,
    path text NOT NULL,
    type text NOT NULL,
    size integer NOT NULL,
    capital_source_id integer
);


ALTER TABLE public.documents OWNER TO neondb_owner;

--
-- Name: documents_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.documents_id_seq OWNER TO neondb_owner;

--
-- Name: documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.documents_id_seq OWNED BY public.documents.id;


--
-- Name: funding_opportunities; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.funding_opportunities (
    id integer NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    amount numeric,
    organization_id integer,
    created_by_id integer,
    requirements text[],
    deadline timestamp without time zone,
    status text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    award_amount numeric,
    award_minimum numeric,
    award_maximum numeric,
    application_start_date date,
    application_end_date date,
    eligibility_criteria jsonb DEFAULT '{}'::jsonb,
    is_public boolean DEFAULT true,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.funding_opportunities OWNER TO neondb_owner;

--
-- Name: funding_opportunities_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.funding_opportunities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.funding_opportunities_id_seq OWNER TO neondb_owner;

--
-- Name: funding_opportunities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.funding_opportunities_id_seq OWNED BY public.funding_opportunities.id;


--
-- Name: household_groups; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.household_groups (
    id integer NOT NULL,
    name text NOT NULL,
    property_id integer,
    type text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.household_groups OWNER TO neondb_owner;

--
-- Name: household_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.household_groups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.household_groups_id_seq OWNER TO neondb_owner;

--
-- Name: household_groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.household_groups_id_seq OWNED BY public.household_groups.id;


--
-- Name: household_members; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.household_members (
    id integer NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    group_id integer,
    date_of_birth timestamp without time zone,
    relationship text,
    occupation text,
    income_range text,
    special_needs text,
    ssn text,
    employer text,
    employment_status text,
    annual_income numeric,
    marital_status text,
    education_level text,
    primary_language text,
    is_veteran boolean DEFAULT false,
    has_disabilities boolean DEFAULT false,
    disability_notes text,
    is_student_full_time boolean DEFAULT false,
    is_senior boolean DEFAULT false,
    is_pregnant boolean DEFAULT false,
    qualifying_tags text[],
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    institution text,
    gender text,
    pronouns text,
    race text,
    ethnicity text,
    citizenship_status text,
    phone text,
    email text,
    preferred_contact_method text,
    alternate_contact_name text,
    alternate_contact_relationship text,
    alternate_contact_phone text,
    current_address text,
    move_in_date text,
    residence_type text,
    previous_address text,
    length_of_residency text,
    housing_status text,
    fema_case_number text,
    income_source text,
    medical_conditions text,
    medications text,
    mental_health_conditions text,
    mobility_devices text,
    health_insurance text,
    primary_care_provider text,
    public_assistance_programs text[],
    caseworker_name text,
    caseworker_agency text,
    notes text,
    post_disaster_access_needs text,
    lost_documents text[],
    justice_system_involvement boolean DEFAULT false,
    child_welfare_involvement boolean DEFAULT false,
    immigration_proceedings boolean DEFAULT false,
    disaster_injuries boolean DEFAULT false,
    lost_medication boolean DEFAULT false,
    transport_access boolean DEFAULT false,
    age integer,
    first_name text,
    middle_name text,
    last_name text
);


ALTER TABLE public.household_members OWNER TO neondb_owner;

--
-- Name: household_members_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.household_members_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.household_members_id_seq OWNER TO neondb_owner;

--
-- Name: household_members_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.household_members_id_seq OWNED BY public.household_members.id;


--
-- Name: messages; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.messages (
    id integer NOT NULL,
    survivor_id integer NOT NULL,
    contact_id integer,
    content text NOT NULL,
    subject text,
    channel text NOT NULL,
    is_inbound boolean NOT NULL,
    is_read boolean DEFAULT false,
    status text DEFAULT 'sent'::text,
    parent_id integer,
    external_id text,
    sent_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    organization_id integer,
    sender_id integer,
    tags text
);


ALTER TABLE public.messages OWNER TO neondb_owner;

--
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.messages_id_seq OWNER TO neondb_owner;

--
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;


--
-- Name: opportunity_matches; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.opportunity_matches (
    id integer NOT NULL,
    opportunity_id integer NOT NULL,
    survivor_id integer NOT NULL,
    match_score numeric NOT NULL,
    match_criteria jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    notes text,
    last_checked_at timestamp without time zone DEFAULT now() NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    applied_at timestamp without time zone,
    applied_by_id integer,
    awarded_at timestamp without time zone,
    awarded_by_id integer,
    funded_at timestamp without time zone,
    funded_by_id integer,
    award_amount numeric
);


ALTER TABLE public.opportunity_matches OWNER TO neondb_owner;

--
-- Name: opportunity_matches_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.opportunity_matches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.opportunity_matches_id_seq OWNER TO neondb_owner;

--
-- Name: opportunity_matches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.opportunity_matches_id_seq OWNED BY public.opportunity_matches.id;


--
-- Name: organization_members; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.organization_members (
    user_id integer NOT NULL,
    organization_id integer NOT NULL,
    role text DEFAULT 'member'::text,
    joined_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.organization_members OWNER TO neondb_owner;

--
-- Name: organization_survivors; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.organization_survivors (
    survivor_id integer NOT NULL,
    organization_id integer NOT NULL,
    is_primary boolean DEFAULT false,
    status text DEFAULT 'active'::text,
    notes text,
    added_by_id integer,
    added_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.organization_survivors OWNER TO neondb_owner;

--
-- Name: organizations; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.organizations (
    id integer NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    email text NOT NULL,
    phone text,
    website text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    address text,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    email_domain text,
    email_domain_verified boolean DEFAULT false,
    email_sender_name text,
    email_sender_email text,
    email_dkim_selector text,
    email_dkim_key text,
    email_spf_record text,
    logo_url text,
    primary_color text DEFAULT '#0070F3'::text,
    default_sms_name text,
    enable_messaging boolean DEFAULT true,
    enable_calendar boolean DEFAULT true,
    enable_action_plan boolean DEFAULT true,
    enable_documents boolean DEFAULT true,
    enable_household_management boolean DEFAULT true,
    enable_funding_opportunities boolean DEFAULT true
);


ALTER TABLE public.organizations OWNER TO neondb_owner;

--
-- Name: organizations_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.organizations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.organizations_id_seq OWNER TO neondb_owner;

--
-- Name: organizations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.organizations_id_seq OWNED BY public.organizations.id;


--
-- Name: properties; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.properties (
    id integer NOT NULL,
    address text NOT NULL,
    type text NOT NULL,
    ownership_status text NOT NULL,
    primary_residence boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    survivor_id integer,
    zip_code text
);


ALTER TABLE public.properties OWNER TO neondb_owner;

--
-- Name: properties_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.properties_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.properties_id_seq OWNER TO neondb_owner;

--
-- Name: properties_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.properties_id_seq OWNED BY public.properties.id;


--
-- Name: session; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.session (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.session OWNER TO neondb_owner;

--
-- Name: system_config; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.system_config (
    id integer NOT NULL,
    email_address text NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    inbox_id text,
    phone_number text,
    phone_id text,
    stage text DEFAULT 'S'::text
);


ALTER TABLE public.system_config OWNER TO neondb_owner;

--
-- Name: system_config_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.system_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.system_config_id_seq OWNER TO neondb_owner;

--
-- Name: system_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.system_config_id_seq OWNED BY public.system_config.id;


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.tasks (
    id integer NOT NULL,
    text text NOT NULL,
    completed boolean DEFAULT false,
    urgent boolean DEFAULT false,
    stage text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by_id integer DEFAULT 1 NOT NULL,
    created_by_type text DEFAULT 'practitioner'::text NOT NULL,
    assigned_to_id integer,
    assigned_to_type text,
    subtasks text DEFAULT '[]'::text
);


ALTER TABLE public.tasks OWNER TO neondb_owner;

--
-- Name: tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tasks_id_seq OWNER TO neondb_owner;

--
-- Name: tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.tasks_id_seq OWNED BY public.tasks.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email text NOT NULL,
    name text NOT NULL,
    role text NOT NULL,
    organization_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    username text,
    password text,
    first_name text,
    last_name text,
    updated_at timestamp without time zone DEFAULT now(),
    user_type text DEFAULT 'practitioner'::text NOT NULL,
    job_title text,
    department text,
    is_verified boolean DEFAULT false
);


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO neondb_owner;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: capital_sources id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.capital_sources ALTER COLUMN id SET DEFAULT nextval('public.capital_sources_id_seq'::regclass);


--
-- Name: case_management id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.case_management ALTER COLUMN id SET DEFAULT nextval('public.case_management_id_seq'::regclass);


--
-- Name: checklists id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.checklists ALTER COLUMN id SET DEFAULT nextval('public.checklists_id_seq'::regclass);


--
-- Name: contacts id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contacts ALTER COLUMN id SET DEFAULT nextval('public.contacts_id_seq'::regclass);


--
-- Name: document_templates id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.document_templates ALTER COLUMN id SET DEFAULT nextval('public.document_templates_id_seq'::regclass);


--
-- Name: documents id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.documents ALTER COLUMN id SET DEFAULT nextval('public.documents_id_seq'::regclass);


--
-- Name: funding_opportunities id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.funding_opportunities ALTER COLUMN id SET DEFAULT nextval('public.funding_opportunities_id_seq'::regclass);


--
-- Name: household_groups id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.household_groups ALTER COLUMN id SET DEFAULT nextval('public.household_groups_id_seq'::regclass);


--
-- Name: household_members id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.household_members ALTER COLUMN id SET DEFAULT nextval('public.household_members_id_seq'::regclass);


--
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


--
-- Name: opportunity_matches id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.opportunity_matches ALTER COLUMN id SET DEFAULT nextval('public.opportunity_matches_id_seq'::regclass);


--
-- Name: organizations id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.organizations ALTER COLUMN id SET DEFAULT nextval('public.organizations_id_seq'::regclass);


--
-- Name: properties id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.properties ALTER COLUMN id SET DEFAULT nextval('public.properties_id_seq'::regclass);


--
-- Name: system_config id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.system_config ALTER COLUMN id SET DEFAULT nextval('public.system_config_id_seq'::regclass);


--
-- Name: tasks id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tasks ALTER COLUMN id SET DEFAULT nextval('public.tasks_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: capital_sources capital_sources_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.capital_sources
    ADD CONSTRAINT capital_sources_pkey PRIMARY KEY (id);


--
-- Name: case_management case_management_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.case_management
    ADD CONSTRAINT case_management_pkey PRIMARY KEY (id);


--
-- Name: checklists checklists_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.checklists
    ADD CONSTRAINT checklists_pkey PRIMARY KEY (id);


--
-- Name: contacts contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (id);


--
-- Name: document_templates document_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.document_templates
    ADD CONSTRAINT document_templates_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: funding_opportunities funding_opportunities_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.funding_opportunities
    ADD CONSTRAINT funding_opportunities_pkey PRIMARY KEY (id);


--
-- Name: household_groups household_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.household_groups
    ADD CONSTRAINT household_groups_pkey PRIMARY KEY (id);


--
-- Name: household_members household_members_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.household_members
    ADD CONSTRAINT household_members_pkey PRIMARY KEY (id);


--
-- Name: messages messages_external_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_external_id_key UNIQUE (external_id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: opportunity_matches opportunity_matches_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.opportunity_matches
    ADD CONSTRAINT opportunity_matches_pkey PRIMARY KEY (opportunity_id, survivor_id);


--
-- Name: organization_members organization_members_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_pkey PRIMARY KEY (user_id, organization_id);


--
-- Name: organization_survivors organization_survivors_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.organization_survivors
    ADD CONSTRAINT organization_survivors_pkey PRIMARY KEY (survivor_id, organization_id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: properties properties_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_pkey PRIMARY KEY (id);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);


--
-- Name: system_config system_config_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.system_config
    ADD CONSTRAINT system_config_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "IDX_session_expire" ON public.session USING btree (expire);


--
-- Name: capital_sources capital_sources_survivor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.capital_sources
    ADD CONSTRAINT capital_sources_survivor_id_fkey FOREIGN KEY (survivor_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: case_management case_management_case_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.case_management
    ADD CONSTRAINT case_management_case_manager_id_fkey FOREIGN KEY (case_manager_id) REFERENCES public.users(id);


--
-- Name: case_management case_management_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.case_management
    ADD CONSTRAINT case_management_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: case_management case_management_survivor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.case_management
    ADD CONSTRAINT case_management_survivor_id_fkey FOREIGN KEY (survivor_id) REFERENCES public.users(id);


--
-- Name: documents documents_capital_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_capital_source_id_fkey FOREIGN KEY (capital_source_id) REFERENCES public.capital_sources(id);


--
-- Name: funding_opportunities funding_opportunities_created_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.funding_opportunities
    ADD CONSTRAINT funding_opportunities_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES public.users(id);


--
-- Name: funding_opportunities funding_opportunities_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.funding_opportunities
    ADD CONSTRAINT funding_opportunities_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: household_groups household_groups_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.household_groups
    ADD CONSTRAINT household_groups_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- Name: household_members household_members_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.household_members
    ADD CONSTRAINT household_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.household_groups(id) ON DELETE CASCADE;


--
-- Name: messages messages_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id);


--
-- Name: messages messages_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: messages messages_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.messages(id);


--
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id);


--
-- Name: messages messages_survivor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_survivor_id_fkey FOREIGN KEY (survivor_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: opportunity_matches opportunity_matches_applied_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.opportunity_matches
    ADD CONSTRAINT opportunity_matches_applied_by_id_fkey FOREIGN KEY (applied_by_id) REFERENCES public.users(id);


--
-- Name: opportunity_matches opportunity_matches_awarded_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.opportunity_matches
    ADD CONSTRAINT opportunity_matches_awarded_by_id_fkey FOREIGN KEY (awarded_by_id) REFERENCES public.users(id);


--
-- Name: opportunity_matches opportunity_matches_funded_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.opportunity_matches
    ADD CONSTRAINT opportunity_matches_funded_by_id_fkey FOREIGN KEY (funded_by_id) REFERENCES public.users(id);


--
-- Name: opportunity_matches opportunity_matches_opportunity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.opportunity_matches
    ADD CONSTRAINT opportunity_matches_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES public.funding_opportunities(id) ON DELETE CASCADE;


--
-- Name: opportunity_matches opportunity_matches_survivor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.opportunity_matches
    ADD CONSTRAINT opportunity_matches_survivor_id_fkey FOREIGN KEY (survivor_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: organization_members organization_members_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: organization_members organization_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: organization_survivors organization_survivors_added_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.organization_survivors
    ADD CONSTRAINT organization_survivors_added_by_id_fkey FOREIGN KEY (added_by_id) REFERENCES public.users(id);


--
-- Name: organization_survivors organization_survivors_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.organization_survivors
    ADD CONSTRAINT organization_survivors_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: organization_survivors organization_survivors_survivor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.organization_survivors
    ADD CONSTRAINT organization_survivors_survivor_id_fkey FOREIGN KEY (survivor_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: properties properties_survivor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_survivor_id_fkey FOREIGN KEY (survivor_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

