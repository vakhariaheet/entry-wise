import { z } from 'zod';
import "zod-openapi/extend"
import { createApiResponse } from '../utils/sendResponse';

export const fieldTypeEnum = z.enum(['text', 'email', 'phone', 'url','file']).openapi({
    description: 'The type of field',
    example: 'text',
});

export const fieldSchema = z.object({
    id: z.string().openapi({
        description: 'The unique identifier for the field',
        example: 'field_123',
    }),
    site_id: z.string().openapi({
        description: 'The ID of the site this field belongs to',
        example: 'site_123',
    }),
    name: z.string().min(1, 'Field name is required').openapi({
        description: 'The name of the field',
        example: 'firstName',
    }),
    type: fieldTypeEnum,
    created_at: z.string().datetime().openapi({
        description: 'The date and time the field was created',
        example: '2021-01-01T00:00:00Z',
    }),
});

export const createFieldSchema = fieldSchema.omit({ 
    id: true, 
    created_at: true,
    site_id: true
});

// Schema for bulk field creation
export const bulkCreateFieldSchema = z.object({
    fields: z.array(z.object({
        name: z.string().min(1, 'Field name is required').openapi({
            description: 'The name of the field',
            example: 'firstName',
        }),
        type: fieldTypeEnum,
    })).min(1, 'At least one field is required').openapi({
        description: 'Array of fields to create',
        example: [
            { name: 'firstName', type: 'text' },
            { name: 'email', type: 'email' },
            { name: 'phone', type: 'phone' }
        ]
    }),
});

export const updateFieldSchema = createFieldSchema.partial();

export const getFieldSchema = z.object({
    id: z.string().openapi({
        description: 'The unique identifier for the field',
        example: 'field_123',
    }),
});

export const deleteFieldSchema = getFieldSchema;

// API Response Schemas
export const createApiSuccessResponseSchema = createApiResponse(fieldSchema);
export const bulkCreateApiSuccessResponseSchema = createApiResponse(z.array(fieldSchema));
export const updateApiSuccessResponseSchema = createApiResponse(fieldSchema);
export const deleteApiSuccessResponseSchema = createApiResponse(z.null());
export const getApiSuccessResponseSchema = createApiResponse(fieldSchema);
export const getAllApiSuccessResponseSchema = createApiResponse(z.array(fieldSchema));

// API Types
export type Field = z.infer<typeof fieldSchema>;
export type CreateFieldBody = z.infer<typeof createFieldSchema>;
export type BulkCreateFieldBody = z.infer<typeof bulkCreateFieldSchema>;
export type UpdateFieldBody = z.infer<typeof updateFieldSchema>;
export type GetFieldBody = z.infer<typeof getFieldSchema>;
export type DeleteFieldBody = z.infer<typeof deleteFieldSchema>;
export type FieldType = z.infer<typeof fieldTypeEnum>; 