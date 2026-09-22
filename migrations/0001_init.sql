DROP TABLE IF EXISTS fields;
DROP TABLE IF EXISTS sites;
DROP TABLE IF EXISTS companies;

-- Companies table: stores each company and its Resend.dev token
CREATE TABLE IF NOT EXISTS companies (
 id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email_provider_token TEXT NOT NULL,
  from_email TEXT NOT NULL,
  from_name TEXT NOT NULL,
  admin_email TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  email_provider TEXT NOT NULL DEFAULT 'resend'
);

-- Sites table: each site belongs to a company and has its own API key
CREATE TABLE IF NOT EXISTS sites (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  domain TEXT NOT NULL,
  api_key TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Fields table: defines dynamic fields per site
CREATE TABLE IF NOT EXISTS fields (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('text', 'email', 'phone', 'url','file')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
); 
