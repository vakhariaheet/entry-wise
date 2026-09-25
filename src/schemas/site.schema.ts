import { z } from 'zod';
import 'zod-openapi/extend';
import { createApiResponse, createPaginatedResponse } from '../utils/sendResponse';

export const siteSchema = z.object({
  id: z.string().openapi({
    description: 'The unique identifier for the site',
    example: 'site_123',
    format: 'text',
    pattern: '^[a-zA-Z0-9_-]+$',
  }),
  company_id: z.string().openapi({
    description: 'The ID of the company this site belongs to',
    example: 'company_123',
    format: 'text',
    pattern: '^[a-zA-Z0-9_-]+$',
  }),
  domain: z.string().min(1, 'Domain is required').openapi({
    description: 'The domain name of the site',
    example: 'example.com',
    format: 'text',
  }),
  api_key: z.string().openapi({
    description: 'The API key for the site',
    example: 'ew_live_1234567890abcdef',
    format: 'text',
    pattern: '^[a-zA-Z0-9_]+$',
  }),
  admin_email: z.string().email('Invalid email format').openapi({
    description: 'The email address where form submissions are delivered for this site',
    example: 'admin@example.com',
    format: 'email',
  }),
  timezone: z.string().min(1, 'Timezone is required').default('UTC').openapi({
    description:
      'IANA timezone string used to localise the submission timestamp in notification emails',
    example: 'Asia/Kolkata',
    format: 'text',
  }),
  auto_responder_enabled: z.union([z.boolean(), z.number()]).default(false).openapi({
    description: 'Whether to send an automatic confirmation email back to the submitter',
    example: true,
  }),
  auto_responder_subject: z.string().nullable().optional().openapi({
    description: 'Custom subject line for auto-responder email',
    example: 'Thank you for reaching out!',
    format: 'text',
  }),
  auto_responder_body: z.string().nullable().optional().openapi({
    description: 'Custom message body for auto-responder email',
    example: 'We received your message and will get back to you shortly.',
    format: 'text',
  }),
  webhook_url: z.string().url().nullable().optional().openapi({
    description:
      'Webhook URL to dispatch real-time submission payloads to (Slack, Discord, Zapier, etc.)',
    example: 'https://hooks.slack.com/services/...',
    format: 'uri',
  }),
  webhook_secret: z.string().nullable().optional().openapi({
    description: 'Secret key used to compute the HMAC-SHA256 signature in X-EntryWise-Signature',
    example: 'whsec_secret_key_123',
    format: 'text',
  }),
  turnstile_secret_key: z.string().nullable().optional().openapi({
    description:
      'Cloudflare Turnstile secret key. When provided, cf-turnstile-response is strictly verified.',
    example: '0x4AAAAAA...',
    format: 'text',
  }),
  created_at: z.string().datetime().openapi({
    description: 'The date and time the site was created',
    example: '2021-01-01T00:00:00Z',
    format: 'date-time',
  }),
});

export const createSiteSchema = siteSchema.omit({
  id: true,
  created_at: true,
  api_key: true,
  company_id: true,
});

export const updateSiteSchema = createSiteSchema.partial();

export const getSiteSchema = z.object({
  id: z.string().openapi({
    description: 'The unique identifier for the site',
    example: 'site_123',
    format: 'text',
    pattern: '^[a-zA-Z0-9_-]+$',
  }),
});

export const deleteSiteSchema = getSiteSchema;

export const testSiteEmailSchema = z.object({
  recipient_email: z.string().email('Invalid email address format').openapi({
    description: 'Email address where the test preview should be sent',
    example: 'alex.taylor@example.com',
    format: 'email',
  }),
  template_type: z.enum(['auto_responder', 'submission_alert']).default('auto_responder').openapi({
    description:
      'Which email template to test: auto_responder (to submitter) or submission_alert (to team/admin)',
    example: 'auto_responder',
  }),
  custom_subject: z.string().optional().openapi({
    description: 'Optional custom subject line to test with',
    example: 'Thank you for contacting us — example.com',
    format: 'text',
  }),
  custom_html: z.string().optional().openapi({
    description: 'Optional raw HTML content to test instead of the stored template',
    example: '<!DOCTYPE html><html><body><h1>Hello Test</h1></body></html>',
    format: 'text',
  }),
});

// API Response Schemas
export const siteResponseSchema = siteSchema;
export const paginatedSitesResponseSchema = createPaginatedResponse(siteSchema);
export const createApiSuccessResponseSchema = createApiResponse(siteSchema);
export const updateApiSuccessResponseSchema = createApiResponse(siteSchema);
export const deleteApiSuccessResponseSchema = createApiResponse(z.null());
export const getApiSuccessResponseSchema = createApiResponse(siteSchema);
export const getAllApiSuccessResponseSchema = createApiResponse(z.array(siteSchema));
export const testSiteEmailSuccessResponseSchema = createApiResponse(
  z.object({
    success: z.boolean().openapi({
      description: 'Whether the test email was successfully dispatched',
      example: true,
    }),
    message: z.string().openapi({
      description: 'Human-readable result message',
      example: 'Test auto-responder email dispatched to alex.taylor@example.com',
      format: 'text',
    }),
    recipient: z.string().openapi({
      description: 'Email address the test was delivered to',
      example: 'alex.taylor@example.com',
      format: 'email',
    }),
    template_type: z.string().openapi({
      description: 'The template type that was tested',
      example: 'auto_responder',
      format: 'text',
    }),
  })
);

// API Types
export type Site = z.infer<typeof siteSchema>;
export type CreateSiteBody = z.infer<typeof createSiteSchema>;
export type UpdateSiteBody = z.infer<typeof updateSiteSchema>;
export type GetSiteBody = z.infer<typeof getSiteSchema>;
export type DeleteSiteBody = z.infer<typeof deleteSiteSchema>;
export type TestSiteEmailBody = z.infer<typeof testSiteEmailSchema>;
