-- Migration 0003: Submissions persistence, auto-responder, webhooks, and Turnstile

-- 1. Recreate submissions table with string UUIDs, status, attachments, and ip_address
DROP TABLE IF EXISTS submissions;

CREATE TABLE submissions (
    id TEXT PRIMARY KEY,
    site_id TEXT NOT NULL,
    data TEXT NOT NULL,
    attachments TEXT,
    status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new', 'read', 'archived', 'spam')),
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_submissions_site_created ON submissions(site_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_site_status ON submissions(site_id, status);

-- 2. Add feature columns to sites table
ALTER TABLE sites ADD COLUMN auto_responder_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sites ADD COLUMN auto_responder_subject TEXT;
ALTER TABLE sites ADD COLUMN auto_responder_body TEXT;
ALTER TABLE sites ADD COLUMN webhook_url TEXT;
ALTER TABLE sites ADD COLUMN webhook_secret TEXT;
ALTER TABLE sites ADD COLUMN turnstile_secret_key TEXT;
