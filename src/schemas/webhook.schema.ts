import { z } from 'zod';
import 'zod-openapi/extend';
import { createApiResponse } from '../utils/sendResponse';

export const webhookSchema = z.object({
  id: z.string().openapi({
    description: 'The unique identifier for the webhook',
    example: 'wh_12345678_abcd',
    format: 'text',
  }),
  site_id: z.string().openapi({
    description: 'The site ID this webhook belongs to',
    example: 'site_123',
    format: 'text',
  }),
  name: z.string().min(1, 'Webhook name is required').openapi({
    description: 'A friendly display name for the webhook destination',
    example: 'HubSpot CRM via Zapier',
    format: 'text',
  }),
  url: z.string().url('Must be a valid HTTP or HTTPS URL').openapi({
    description: 'Destination URL for HTTP POST event delivery',
    example: 'https://hooks.zapier.com/hooks/catch/123/abc',
    format: 'uri',
  }),
  secret: z.string().nullable().optional().openapi({
    description: 'Optional secret token for HMAC-SHA256 payload signing',
    example: 'whsec_9f8e7d6c5b4a',
  }),
  enabled: z
    .union([z.boolean(), z.number()])
    .transform((v) => Boolean(v))
    .openapi({
      description: 'Whether this webhook destination is actively receiving event dispatches',
      example: true,
    }),
  events: z.string().nullable().optional().openapi({
    description: 'JSON list of events subscribed to',
    example: '["submission.created"]',
  }),
  created_at: z.string().optional().openapi({
    description: 'Timestamp when the webhook was registered',
    example: '2026-09-28T18:00:00Z',
    format: 'date-time',
  }),
});

export const createWebhookSchema = z.object({
  name: z.string().min(1, 'Webhook name is required').default('Webhook').openapi({
    description: 'Friendly name for the webhook',
    example: 'Production Backend API',
  }),
  url: z.string().url('Must be a valid HTTP or HTTPS URL').openapi({
    description: 'Destination URL for event delivery',
    example: 'https://api.mycompany.com/webhooks/forms',
  }),
  secret: z.string().nullable().optional().openapi({
    description: 'HMAC secret for signature verification',
    example: 'whsec_abc123',
  }),
  enabled: z.boolean().optional().default(true).openapi({
    description: 'Initial active state of the webhook',
    example: true,
  }),
});

export const updateWebhookSchema = createWebhookSchema.partial();

export const webhookParamSchema = z.object({
  siteId: z.string().openapi({
    description: 'The site identifier',
    example: 'site_123',
    param: { name: 'siteId', in: 'path' },
  }),
  webhookId: z.string().openapi({
    description: 'The unique webhook identifier',
    example: 'wh_123',
    param: { name: 'webhookId', in: 'path' },
  }),
});

export const webhookListParamSchema = z.object({
  siteId: z.string().openapi({
    description: 'The site identifier',
    example: 'site_123',
    param: { name: 'siteId', in: 'path' },
  }),
});

// API Response Schemas
export const webhookApiResponseSchema = createApiResponse(webhookSchema);
export const webhookListApiResponseSchema = createApiResponse(z.array(webhookSchema));
export const webhookDeleteApiResponseSchema = createApiResponse(z.null());
export const webhookTestApiResponseSchema = createApiResponse(
  z.object({
    success: z.boolean().openapi({ example: true }),
    status: z.number().optional().openapi({ example: 200 }),
    error: z.string().optional().openapi({ example: 'Connection refused' }),
  })
);

export type Webhook = z.infer<typeof webhookSchema>;
export type CreateWebhookBody = z.infer<typeof createWebhookSchema>;
export type UpdateWebhookBody = z.infer<typeof updateWebhookSchema>;
