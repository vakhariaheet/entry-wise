import { z } from 'zod';
import "zod-openapi/extend"
import { createApiResponse } from '../utils/sendResponse';

export const emailProviderEnum = z.enum(['resend', 'mailersend', 'mailtrap', 'smtp2go']).openapi({
    description: 'The email provider to use',
    example: 'resend',
    enum: ['resend', 'mailersend', 'mailtrap', 'smtp2go'],
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
    email_provider: emailProviderEnum,
    email_provider_token: z.string().min(1, 'Email provider token is required').openapi({
        description: 'The API token for the email provider (Resend, MailerSend, Mailtrap, or SMTP2Go)',
        example: 're_123456789',
    }),
    from_email: z.string().email('Invalid email format').openapi({
        description: 'The email address to send emails from',
        example: 'info@acme.com',
    }),
    from_name: z.string().min(1, 'From name is required').openapi({
        description: 'The name to send emails from',
        example: 'Acme Inc',
    }),
    admin_email: z.string().email('Invalid email format').openapi({
        description: 'The email address of the company admin',
        example: 'admin@acme.com',
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
