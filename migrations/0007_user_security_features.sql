-- Migration 0007: User-Facing Security & Privacy Engine
-- Adds disposable email blocking, spam keyword filtering, data retention auto-pruning, and zero-IP privacy mode

ALTER TABLE sites ADD COLUMN block_disposable_emails INTEGER DEFAULT 0;
ALTER TABLE sites ADD COLUMN spam_keywords TEXT;
ALTER TABLE sites ADD COLUMN data_retention_days INTEGER DEFAULT 0;
ALTER TABLE sites ADD COLUMN anonymize_ip INTEGER DEFAULT 0;
