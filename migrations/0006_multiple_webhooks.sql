-- Migration 0006: Multiple Webhooks Support per Site

CREATE TABLE IF NOT EXISTS webhooks (
    id TEXT PRIMARY KEY,
    site_id TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT 'Webhook',
    url TEXT NOT NULL,
    secret TEXT,
    enabled INTEGER NOT NULL DEFAULT 1,
    events TEXT DEFAULT '["submission.created"]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_webhooks_site ON webhooks(site_id, enabled);

-- Seamless migration: Auto-import existing single webhooks from sites table into webhooks
INSERT INTO webhooks (id, site_id, name, url, secret, enabled, created_at)
SELECT 
    'wh_' || substr(id, 1, 8) || '_' || lower(hex(randomblob(4))),
    id,
    'Default Webhook',
    webhook_url,
    webhook_secret,
    1,
    CURRENT_TIMESTAMP
FROM sites
WHERE webhook_url IS NOT NULL 
  AND trim(webhook_url) != ''
  AND id NOT IN (SELECT DISTINCT site_id FROM webhooks);
