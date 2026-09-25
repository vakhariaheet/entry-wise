export interface JwtAuthPayload {
  sub?: string;
  role?: 'admin_api_key' | 'site_owner' | 'clerk_user' | string;
  user_id?: string;
  site_id?: string;
  company_id?: string;
  email?: string;
  claims?: {
    email?: string;
    primary_email_address?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}
