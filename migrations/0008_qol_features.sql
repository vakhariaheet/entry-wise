-- Migration 0008: Quality of Life Features - Pipeline Mock Testing & Internal Notes
ALTER TABLE submissions ADD COLUMN is_test INTEGER DEFAULT 0;
ALTER TABLE submissions ADD COLUMN notes TEXT;

CREATE INDEX IF NOT EXISTS idx_submissions_site_test ON submissions(site_id, is_test);
