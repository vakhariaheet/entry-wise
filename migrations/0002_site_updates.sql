-- Safe migration: backup all tables first as constraint-free copies,
-- then drop in reverse FK order (nothing left to cascade), recreate with new schema.

-- Step 1: Snapshot all three tables into temp copies (no FK constraints on these)
CREATE TABLE companies_temp AS SELECT * FROM companies;
CREATE TABLE sites_temp AS SELECT * FROM sites;
CREATE TABLE fields_temp AS SELECT * FROM fields;

-- Step 2: Drop in leaf-first order — each drop has no child rows left to cascade
DROP TABLE fields;
DROP TABLE sites;
DROP TABLE companies;

-- Step 3: Recreate companies (no admin_email, nullable token, cloudflare default)
CREATE TABLE companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email_provider TEXT NOT NULL DEFAULT 'cloudflare',
    email_provider_token TEXT,
    from_email TEXT NOT NULL DEFAULT 'no-reply@entrywise.webbound.in',
    from_name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Step 4: Recreate sites (adds admin_email + timezone, preserves FK)
CREATE TABLE sites (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    domain TEXT NOT NULL,
    api_key TEXT NOT NULL,
    admin_email TEXT NOT NULL DEFAULT '',
    timezone TEXT NOT NULL DEFAULT 'UTC',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Step 5: Recreate fields (unchanged schema, preserves FK)
CREATE TABLE fields (
    id TEXT PRIMARY KEY,
    site_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('text', 'email', 'phone', 'url', 'file')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

-- Step 6: Restore data
INSERT INTO companies (id, name, email_provider, email_provider_token, from_email, from_name, created_at)
SELECT id, name, email_provider, email_provider_token, from_email, from_name, created_at
FROM companies_temp;

INSERT INTO sites (id, company_id, domain, api_key, admin_email, timezone, created_at)
SELECT
    s.id, s.company_id, s.domain, s.api_key,
    COALESCE((SELECT c.admin_email FROM companies_temp c WHERE c.id = s.company_id), '') AS admin_email,
    'UTC' AS timezone,
    s.created_at
FROM sites_temp s;

INSERT INTO fields SELECT * FROM fields_temp;

-- Step 7: Drop temp tables
DROP TABLE fields_temp;
DROP TABLE sites_temp;
DROP TABLE companies_temp;
