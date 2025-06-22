export interface Site {
    id: number;
    company_id: number;
    domain: string;
    api_key: string;
    created_at: string;
}

export type CreateSiteBody = Omit<Site, 'id' | 'created_at' | 'api_key'| 'company_id'> 
export type UpdateSiteBody = Partial<Omit<CreateSiteBody, 'company_id'>>; 