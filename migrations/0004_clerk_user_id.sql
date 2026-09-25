-- Migration 0004: Multi-tenant Clerk user ownership
ALTER TABLE companies ADD COLUMN user_id TEXT;
ALTER TABLE sites ADD COLUMN user_id TEXT;

CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);
CREATE INDEX IF NOT EXISTS idx_sites_user_id ON sites(user_id);
