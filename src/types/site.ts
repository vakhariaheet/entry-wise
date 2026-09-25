export interface Site {
  id: string;
  company_id: string;
  domain: string;
  name?: string | null;
  user_id?: string | null;
  api_key: string;
  admin_email: string;
  notification_emails?: string | null;
  notify_on_submission?: number | boolean;
  timezone: string;
  auto_responder_enabled?: number | boolean;
  auto_responder_subject?: string | null;
  auto_responder_body?: string | null;
  auto_responder_config?: string | null;
  webhook_url?: string | null;
  webhook_secret?: string | null;
  turnstile_secret_key?: string | null;
  google_sheets_url?: string | null;
  slack_webhook_url?: string | null;
  discord_webhook_url?: string | null;
  allowed_origins?: string | null;
  created_at: string;
}

export type CreateSiteBody = Omit<Site, 'id' | 'created_at' | 'api_key' | 'admin_email'> & {
  admin_email?: string;
  company_id?: string;
};

export type UpdateSiteBody = Partial<Omit<Site, 'id' | 'created_at' | 'api_key' | 'company_id'>>;
