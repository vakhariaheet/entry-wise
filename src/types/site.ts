export interface Site {
    id: string;
    company_id: string;
    domain: string;
    api_key: string;
    admin_email: string;
    timezone: string;
    auto_responder_enabled?: number | boolean;
    auto_responder_subject?: string | null;
    auto_responder_body?: string | null;
    webhook_url?: string | null;
    webhook_secret?: string | null;
    turnstile_secret_key?: string | null;
    created_at: string;
}

export type CreateSiteBody = Omit<Site, 'id' | 'created_at' | 'api_key'>;
export type UpdateSiteBody = Partial<Omit<CreateSiteBody, 'company_id'>>;