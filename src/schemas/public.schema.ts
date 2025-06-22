import { z } from 'zod';
import "zod-openapi/extend"
import { createApiResponse } from '../utils/sendResponse';
import { VALID_FILE_TYPES, MAX_FILE_SIZE } from '../types/submission';

// Dynamic field value validation based on type
const validateFieldValue = (type: string) => {
    switch (type) {
        case 'email':
            return z.string().email('Invalid email format').openapi({
                description: 'Email field value',
                example: 'user@example.com',
            });
        case 'phone':
            return z.string().regex(/^\+?[\d\s-()]+$/, 'Invalid phone format').openapi({
                description: 'Phone field value',
                example: '+1 (555) 123-4567',
            });
        case 'url':
            return z.string().url('Invalid URL format').openapi({
                description: 'URL field value',
                example: 'https://example.com',
            });
        case 'file':
            return z.instanceof(File).refine(
                (file) => VALID_FILE_TYPES.includes(file.type),
                'Invalid file type'
            ).refine(
                (file) => file.size <= MAX_FILE_SIZE,
                'File size exceeds limit'
            ).openapi({
                description: 'File attachment',
                type: 'string',
                format: 'binary'
            });
        default:
            return z.string().openapi({
                description: 'Text field value',
                example: 'John Doe',
            });
    }
};

// Schema for form metadata
export const formMetadataSchema = z.object({
    fields: z.record(
        z.string(),
        z.string()
    ).openapi({
        description: 'Form field values',
        example: {
            name: 'John Doe',
            email: 'john@example.com',
            message: 'Hello, world!',
        },
    }),
    // Optional honeypot fields
    _gotcha: z.string().optional(),
    website: z.string().optional(),
    url: z.string().optional(),
}).openapi({
    description: 'Form submission metadata'
});

// Schema for multipart form data submission
export const formSubmissionSchema = z.object({
    metadata: z.string().transform((str) => JSON.parse(str)).pipe(formMetadataSchema),
    attachments: z.array(z.instanceof(File)).optional().or(z.instanceof(File)).openapi({
        description: 'Array of file attachments',
    }),
}).openapi({
    description: 'Multipart form data submission with file attachments'
});

// API Response Schemas
export const submitFormSuccessResponseSchema = createApiResponse(z.null());