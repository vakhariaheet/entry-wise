-- Migration 0005: EntryWise 0.2.0 Multi-Tenancy, Connectors & Template Customization

-- 1. Upgrade sites table with friendly name, multi-recipient notifications, and connectors
ALTER TABLE sites ADD COLUMN name TEXT DEFAULT 'Default Form';
ALTER TABLE sites ADD COLUMN notification_emails TEXT;
ALTER TABLE sites ADD COLUMN notify_on_submission INTEGER DEFAULT 1;
ALTER TABLE sites ADD COLUMN google_sheets_url TEXT;
ALTER TABLE sites ADD COLUMN slack_webhook_url TEXT;
ALTER TABLE sites ADD COLUMN discord_webhook_url TEXT;
ALTER TABLE sites ADD COLUMN auto_responder_config TEXT;
ALTER TABLE sites ADD COLUMN allowed_origins TEXT;

-- 2. Performance Indices for Workspaces and Multi-Tenant Querying
CREATE INDEX IF NOT EXISTS idx_companies_user ON companies(user_id);
CREATE INDEX IF NOT EXISTS idx_sites_company ON sites(company_id);
CREATE INDEX IF NOT EXISTS idx_sites_user ON sites(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_site ON submissions(site_id, created_at DESC);
