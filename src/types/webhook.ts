export interface Webhook {
  id: string;
  site_id: string;
  name: string;
  url: string;
  secret: string | null;
  enabled: number | boolean;
  events?: string | null;
  created_at?: string;
}
