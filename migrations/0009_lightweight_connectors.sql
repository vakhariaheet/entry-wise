-- Migration: 0009_lightweight_connectors.sql
-- Adds zero-OAuth Airtable and Notion direct sync columns to sites table

ALTER TABLE sites ADD COLUMN airtable_token TEXT;
ALTER TABLE sites ADD COLUMN airtable_base_id TEXT;
ALTER TABLE sites ADD COLUMN airtable_table_name TEXT;
ALTER TABLE sites ADD COLUMN notion_token TEXT;
ALTER TABLE sites ADD COLUMN notion_database_id TEXT;
