import { z } from 'zod';
import "zod-openapi/extend"
import { createApiResponse, createPaginatedResponse } from '../utils/sendResponse';

export const emailProviderEnum = z.enum(['resend', 'mailersend', 'mailtrap', 'smtp2go', 'cloudflare']).openapi({
    description: 'The email provider to use. Use "cloudflare" (default) to send via Cloudflare Email Service at no extra cost.',
    example: 'cloudflare',
    enum: ['resend', 'mailersend', 'mailtrap', 'smtp2go', 'cloudflare'],
});

export const companySchema = z.object({
    id: z.string().openapi({
        description: 'The unique identifier for the company',
        example: 'company_123',
    }),
    name: z.string().min(1, 'Company name is required').openapi({
        description: 'The name of the company',
        example: 'Acme Inc',
    }),
    email_provider: emailProviderEnum.default('cloudflare'),
    email_provider_token: z.string().nullable().optional().openapi({
        description: 'The API token for the email provider. Not required when using Cloudflare Email Service.',
        example: 're_123456789',
    }),
    from_email: z.string().email('Invalid email format').optional().openapi({
        description: 'The email address to send from. Fixed to no-reply@entrywise.webbound.in when using Cloudflare Email Service.',
        example: 'info@acme.com',
    }),
    from_name: z.string().min(1).optional().openapi({
        description: 'The sender display name. Fixed to "EntryWise" when using Cloudflare Email Service.',
        example: 'Acme Inc',
    }),
    created_at: z.string().datetime().openapi({
        description: 'The date and time the company was created',
        example: '2021-01-01T00:00:00Z',
    }),
});

export const createCompanySchema = companySchema.omit({
    id: true,
    created_at: true
});

export const updateCompanySchema = createCompanySchema.partial();

export const deleteCompanySchema = z.object({
    id: z.string().openapi({
        description: 'The unique identifier for the company',
        example: 'company_123',
    }),
});

export const getCompanySchema = z.object({
    id: z.string().openapi({
        description: 'The unique identifier for the company',
        example: 'company_123',
    }),
});

export const listCompaniesQuerySchema = z.object({
    limit: z.coerce.number().min(1).max(100).default(20).openapi({
        description: 'Maximum number of items to return',
        example: 20,
    }),
    offset: z.coerce.number().min(0).default(0).openapi({
        description: 'Number of items to skip',
        example: 0,
    }),
});

export const paginatedCompaniesResponseSchema = createPaginatedResponse(companySchema);
export const createApiSuccessResponseSchema = createApiResponse(companySchema);
export const updateApiSuccessResponseSchema = createApiResponse(companySchema.partial());
export const deleteApiSuccessResponseSchema = createApiResponse(z.null());
export const getApiSuccessResponseSchema = createApiResponse(companySchema);
export const getAllApiSuccessResponseSchema = createApiResponse(z.array(companySchema));
// API Bodies
export type Company = z.infer<typeof companySchema>;
export type CreateCompanyBody = z.infer<typeof createCompanySchema>;
export type UpdateCompanyBody = z.infer<typeof updateCompanySchema>; 
export type DeleteCompanyBody = z.infer<typeof deleteCompanySchema>;
export type GetCompanyBody = z.infer<typeof getCompanySchema>;
// API Responses
export type CreateApiResponse = z.infer<typeof createApiSuccessResponseSchema>;
export type UpdateApiResponse = z.infer<typeof updateApiSuccessResponseSchema>;
export type DeleteApiResponse = z.infer<typeof deleteApiSuccessResponseSchema>;
export type GetApiResponse = z.infer<typeof getApiSuccessResponseSchema>;
export type getAllApiResponse = z.infer<typeof getAllApiSuccessResponseSchema>;
