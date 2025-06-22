import { z } from 'zod';
import "zod-openapi/extend"
import { createApiResponse } from '../utils/sendResponse';

export const siteSchema = z.object({
    id: z.string().openapi({
        description: 'The unique identifier for the site',
        example: 'site_123',
    }),
    company_id: z.string().openapi({
        description: 'The ID of the company this site belongs to',
        example: 'company_123',
    }),
    domain: z.string().min(1, 'Domain is required').openapi({
        description: 'The domain name of the site',
        example: 'example.com',
    }),
    api_key: z.string().openapi({
        description: 'The API key for the site',
        example: 'site_api_key_123',
    }),
    created_at: z.string().datetime().openapi({
        description: 'The date and time the site was created',
        example: '2021-01-01T00:00:00Z',
    }),
});

export const createSiteSchema = siteSchema.omit({ 
    id: true, 
    created_at: true,
    api_key: true 
});

export const updateSiteSchema = createSiteSchema.partial().omit({
    company_id: true
});

export const getSiteSchema = z.object({
    id: z.string().openapi({
        description: 'The unique identifier for the site',
        example: 'site_123',
    }),
});

export const deleteSiteSchema = getSiteSchema;

// API Response Schemas
export const createApiSuccessResponseSchema = createApiResponse(siteSchema);
export const updateApiSuccessResponseSchema = createApiResponse(siteSchema);
export const deleteApiSuccessResponseSchema = createApiResponse(z.null());
export const getApiSuccessResponseSchema = createApiResponse(siteSchema);
export const getAllApiSuccessResponseSchema = createApiResponse(z.array(siteSchema));

// API Types
export type Site = z.infer<typeof siteSchema>;
export type CreateSiteBody = z.infer<typeof createSiteSchema>;
export type UpdateSiteBody = z.infer<typeof updateSiteSchema>;
export type GetSiteBody = z.infer<typeof getSiteSchema>;
export type DeleteSiteBody = z.infer<typeof deleteSiteSchema>; 
