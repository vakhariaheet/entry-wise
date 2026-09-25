export type EmailProvider = 'resend' | 'mailersend' | 'mailtrap' | 'smtp2go' | 'cloudflare';

export interface Company {
  id: string;
  name: string;
  email_provider: EmailProvider;
  email_provider_token: string | null;
  from_email: string;
  from_name: string;
  user_id?: string | null;
  created_at: string;
}

export type CreateCompanyBody = Omit<Company, 'id' | 'created_at'>;
export type UpdateCompanyBody = Partial<CreateCompanyBody>;
