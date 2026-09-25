export interface Submission {
  id: string;
  site_id: string;
  data: Record<string, any>;
  attachments?: Array<{
    filename?: string;
    name?: string;
    url?: string;
    size?: number;
    mime_type?: string;
    type?: string;
  }>;
  status: 'new' | 'read' | 'archived' | 'spam';
  ip_address?: string;
  created_at: string;
}

export interface Site {
  id: string;
  company_id: string;
  domain: string;
  name?: string | null;
  api_key: string;
  admin_email: string;
  notification_emails?: string | null;
  notify_on_submission?: boolean | number;
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
  user_id?: string | null;
  created_at: string;
}

export interface Company {
  id: string;
  name: string;
  email_provider: string;
  from_email: string;
  from_name: string;
  user_id?: string | null;
  created_at: string;
}
