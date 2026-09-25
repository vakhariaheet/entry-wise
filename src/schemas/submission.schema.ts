import { z } from 'zod';
import 'zod-openapi/extend';
import { createPaginatedResponse } from '../utils/sendResponse';

export const submissionStatusEnum = z.enum(['new', 'read', 'archived', 'spam']).openapi({
  description: 'Submission processing status',
  example: 'new',
});

export const submissionAttachmentSchema = z.object({
  filename: z.string().openapi({
    description: 'Original name of the uploaded file',
    example: 'resume.pdf',
  }),
  size: z.number().optional().openapi({
    description: 'Size of the file in bytes',
    example: 1048576,
  }),
  type: z.string().optional().openapi({
    description: 'MIME type of the file',
    example: 'application/pdf',
  }),
});

export const submissionRecordSchema = z.object({
  id: z.string().openapi({
    description: 'Unique identifier for the submission',
    example: 'sub_12345678',
  }),
  site_id: z.string().openapi({
    description: 'The site this submission belongs to',
    example: 'site_123',
  }),
  data: z.record(z.string(), z.any()).openapi({
    description: 'Map of submitted form field key-values',
    example: {
      name: 'Jane Doe',
      email: 'jane@example.com',
      message: 'Hello world',
    },
  }),
  attachments: z.array(submissionAttachmentSchema).optional().openapi({
    description: 'Metadata for file attachments received with the submission',
  }),
  status: submissionStatusEnum,
  ip_address: z.string().optional().openapi({
    description: 'IP address of the submitter',
    example: '192.0.2.1',
  }),
  created_at: z.string().datetime().openapi({
    description: 'Timestamp when the submission was received',
    example: '2026-09-23T00:00:00Z',
  }),
});

export const listSubmissionsQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20).openapi({
    description: 'Maximum number of items to return',
    example: 20,
  }),
  offset: z.coerce.number().min(0).default(0).openapi({
    description: 'Number of items to skip',
    example: 0,
  }),
  status: submissionStatusEnum.optional().openapi({
    description: 'Filter by submission status',
  }),
  query: z.string().optional().openapi({
    description: 'Search term across submission data',
    example: 'jane@example.com',
  }),
});

export const patchSubmissionSchema = z.object({
  status: submissionStatusEnum.openapi({
    description: 'New status for the submission',
    example: 'read',
  }),
});

export const exportSubmissionsQuerySchema = z.object({
  format: z.enum(['csv', 'json']).default('csv').openapi({
    description: 'Export format: csv or json',
    example: 'csv',
  }),
  status: submissionStatusEnum.optional().openapi({
    description: 'Filter by submission status',
  }),
});

export const paginatedSubmissionsResponseSchema = createPaginatedResponse(submissionRecordSchema);

export type SubmissionRecord = z.infer<typeof submissionRecordSchema>;
export type ListSubmissionsQuery = z.infer<typeof listSubmissionsQuerySchema>;
export type PatchSubmissionBody = z.infer<typeof patchSubmissionSchema>;
export type ExportSubmissionsQuery = z.infer<typeof exportSubmissionsQuerySchema>;
