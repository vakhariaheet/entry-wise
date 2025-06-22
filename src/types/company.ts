export type EmailProvider = 'resend' | 'mailersend' | 'mailtrap' | 'smtp2go';

export interface Company {
    id: string;
    name: string;
    admin_email: string;
    email_provider: EmailProvider;
    email_provider_token: string;
    from_email: string;
    from_name: string;
    created_at: string;
}

export type CreateCompanyBody = Omit<Company, 'id' | 'created_at'>;
export type UpdateCompanyBody = Partial<CreateCompanyBody>;