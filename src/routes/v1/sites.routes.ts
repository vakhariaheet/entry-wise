import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { validator } from 'hono-openapi/zod';
import { z } from 'zod';
import { createField } from '../../controllers/v1/fields/createField';
import { deleteField } from '../../controllers/v1/fields/deleteField';
import { listFields } from '../../controllers/v1/fields/listFields';
import { patchField } from '../../controllers/v1/fields/patchField';
import { replaceFields } from '../../controllers/v1/fields/replaceFields';
import { createSite } from '../../controllers/v1/sites/createSite';
import { deleteSite } from '../../controllers/v1/sites/deleteSite';
import { getSite } from '../../controllers/v1/sites/getSite';
import { listSites } from '../../controllers/v1/sites/listSites';
import { patchSite } from '../../controllers/v1/sites/patchSite';
import { testSiteEmail } from '../../controllers/v1/sites/testSiteEmail';
import { deleteSubmission } from '../../controllers/v1/submissions/deleteSubmission';
import { exportSubmissions } from '../../controllers/v1/submissions/exportSubmissions';
import { getSubmission } from '../../controllers/v1/submissions/getSubmission';
import { listSubmissions } from '../../controllers/v1/submissions/listSubmissions';
import { patchSubmission } from '../../controllers/v1/submissions/patchSubmission';
import {
  deleteSubmissionDocs,
  exportSubmissionsDocs,
  getSubmissionDocs,
  listSubmissionsDocs,
  patchSubmissionDocs,
} from '../../docs/submission.docs';
import { verifyAuth } from '../../middleware/auth';
import {
  bulkCreateFieldSchema,
  createFieldSchema,
  updateFieldSchema,
} from '../../schemas/field.schema';
import { testSiteEmailSchema, updateSiteSchema } from '../../schemas/site.schema';
import { patchSubmissionSchema } from '../../schemas/submission.schema';
import { createWebhook } from '../../controllers/v1/webhooks/createWebhook';
import { deleteWebhook } from '../../controllers/v1/webhooks/deleteWebhook';
import { listWebhooks } from '../../controllers/v1/webhooks/listWebhooks';
import { patchWebhook } from '../../controllers/v1/webhooks/patchWebhook';
import { testWebhook } from '../../controllers/v1/webhooks/testWebhook';
import {
  createWebhookSchema,
  updateWebhookSchema,
} from '../../schemas/webhook.schema';
import type { Env } from '../../types/env';

const sitesRouter = new Hono<{ Bindings: Env }>();

// All site administration routes are protected by admin auth
sitesRouter.use('*', verifyAuth);

// Base Sites CRUD
sitesRouter.get(
  '/',
  describeRoute({
    summary: 'List sites',
    description: 'Retrieve a paginated list of sites, optionally filtered by company_id',
    tags: ['Sites'],
    security: [{ bearerAuth: [] }],
    responses: {
      200: { description: 'Sites fetched successfully' },
      401: { description: 'Authentication required' },
    },
  }),
  listSites
);

sitesRouter.post(
  '/',
  describeRoute({
    summary: 'Create site',
    description: 'Create a new site with company_id provided in request body',
    tags: ['Sites'],
    security: [{ bearerAuth: [] }],
    responses: {
      201: { description: 'Site created successfully' },
      400: { description: 'Invalid site payload' },
      401: { description: 'Authentication required' },
    },
  }),
  createSite
);

sitesRouter.get(
  '/:id',
  describeRoute({
    summary: 'Get site',
    description: 'Get site details by ID',
    tags: ['Sites'],
    security: [{ bearerAuth: [] }],
    responses: {
      200: { description: 'Site retrieved successfully' },
      404: { description: 'Site not found' },
    },
  }),
  validator('param', z.object({ id: z.string() })),
  getSite
);

sitesRouter.patch(
  '/:id',
  describeRoute({
    summary: 'Patch site',
    description:
      'Partially update site properties (domain, admin email, timezone, auto-responder, webhook, turnstile)',
    tags: ['Sites'],
    security: [{ bearerAuth: [] }],
    responses: {
      200: { description: 'Site updated successfully' },
      400: { description: 'Invalid update payload' },
      404: { description: 'Site not found' },
    },
  }),
  validator('param', z.object({ id: z.string() })),
  validator('json', updateSiteSchema),
  patchSite
);

sitesRouter.post(
  '/:id/test-email',
  describeRoute({
    summary: 'Send test site email',
    description:
      'Dispatch a test preview of the auto-responder or main submission alert template to verify images, styling, and variables in a real inbox',
    tags: ['Sites'],
    security: [{ bearerAuth: [] }],
    responses: {
      200: { description: 'Test email dispatched successfully' },
      400: { description: 'Invalid recipient or test email delivery failed' },
      404: { description: 'Site or parent workspace not found' },
    },
  }),
  validator('param', z.object({ id: z.string() })),
  validator('json', testSiteEmailSchema),
  testSiteEmail
);

sitesRouter.delete(
  '/:id',
  describeRoute({
    summary: 'Delete site',
    description: 'Delete a site and all its fields and submissions permanently',
    tags: ['Sites'],
    security: [{ bearerAuth: [] }],
    responses: {
      200: { description: 'Site deleted successfully' },
      404: { description: 'Site not found' },
    },
  }),
  validator('param', z.object({ id: z.string() })),
  deleteSite
);

// ----------------------------------------------------
// Fields Sub-Resource: /v1/sites/{site_id}/fields
// ----------------------------------------------------
sitesRouter.get(
  '/:site_id/fields',
  describeRoute({
    summary: 'List fields for site',
    description: 'Get all dynamic field definitions for this site',
    tags: ['Fields'],
    security: [{ bearerAuth: [] }],
    responses: {
      200: { description: 'Fields retrieved successfully' },
      404: { description: 'Site not found' },
    },
  }),
  validator('param', z.object({ site_id: z.string() })),
  listFields
);

sitesRouter.post(
  '/:site_id/fields',
  describeRoute({
    summary: 'Add field to site',
    description: 'Add a new dynamic field definition to this site',
    tags: ['Fields'],
    security: [{ bearerAuth: [] }],
    responses: {
      201: { description: 'Field created successfully' },
      400: { description: 'Invalid field payload' },
      404: { description: 'Site not found' },
    },
  }),
  validator('param', z.object({ site_id: z.string() })),
  validator('json', createFieldSchema),
  createField
);

sitesRouter.put(
  '/:site_id/fields',
  describeRoute({
    summary: 'Replace all fields for site',
    description: 'Atomically replace all field definitions for this site',
    tags: ['Fields'],
    security: [{ bearerAuth: [] }],
    responses: {
      200: { description: 'Fields replaced successfully' },
      400: { description: 'Invalid fields payload' },
      404: { description: 'Site not found' },
    },
  }),
  validator('param', z.object({ site_id: z.string() })),
  validator('json', bulkCreateFieldSchema),
  replaceFields
);

sitesRouter.patch(
  '/:site_id/fields/:field_id',
  describeRoute({
    summary: 'Patch field',
    description: 'Partially update field name or type',
    tags: ['Fields'],
    security: [{ bearerAuth: [] }],
    responses: {
      200: { description: 'Field updated successfully' },
      400: { description: 'Invalid update payload' },
      404: { description: 'Field or site not found' },
    },
  }),
  validator('param', z.object({ site_id: z.string(), field_id: z.string() })),
  validator('json', updateFieldSchema),
  patchField
);

sitesRouter.delete(
  '/:site_id/fields/:field_id',
  describeRoute({
    summary: 'Delete field',
    description: 'Delete a field definition from the site',
    tags: ['Fields'],
    security: [{ bearerAuth: [] }],
    responses: {
      200: { description: 'Field deleted successfully' },
      404: { description: 'Field or site not found' },
    },
  }),
  validator('param', z.object({ site_id: z.string(), field_id: z.string() })),
  deleteField
);

// ----------------------------------------------------
// Webhooks Sub-Resource: /v1/sites/{site_id}/webhooks
// ----------------------------------------------------
sitesRouter.get(
  '/:site_id/webhooks',
  describeRoute({
    summary: 'List webhooks',
    description: 'Retrieve all configured outgoing webhooks for a site',
    tags: ['Webhooks'],
    security: [{ bearerAuth: [] }],
    responses: {
      200: { description: 'Webhooks retrieved successfully' },
      401: { description: 'Authentication required' },
    },
  }),
  validator('param', z.object({ site_id: z.string() })),
  listWebhooks
);

sitesRouter.post(
  '/:site_id/webhooks',
  describeRoute({
    summary: 'Create webhook',
    description: 'Register a new outgoing webhook endpoint for form submission events',
    tags: ['Webhooks'],
    security: [{ bearerAuth: [] }],
    responses: {
      201: { description: 'Webhook created successfully' },
      400: { description: 'Invalid webhook payload' },
      404: { description: 'Site not found' },
    },
  }),
  validator('param', z.object({ site_id: z.string() })),
  validator('json', createWebhookSchema),
  createWebhook
);

sitesRouter.patch(
  '/:site_id/webhooks/:webhook_id',
  describeRoute({
    summary: 'Update webhook',
    description: 'Update webhook destination URL, secret, name, or active status',
    tags: ['Webhooks'],
    security: [{ bearerAuth: [] }],
    responses: {
      200: { description: 'Webhook updated successfully' },
      400: { description: 'Invalid payload' },
      404: { description: 'Webhook or site not found' },
    },
  }),
  validator('param', z.object({ site_id: z.string(), webhook_id: z.string() })),
  validator('json', updateWebhookSchema),
  patchWebhook
);

sitesRouter.delete(
  '/:site_id/webhooks/:webhook_id',
  describeRoute({
    summary: 'Delete webhook',
    description: 'Remove an outgoing webhook configuration',
    tags: ['Webhooks'],
    security: [{ bearerAuth: [] }],
    responses: {
      204: { description: 'Webhook deleted successfully' },
      404: { description: 'Webhook not found' },
    },
  }),
  validator('param', z.object({ site_id: z.string(), webhook_id: z.string() })),
  deleteWebhook
);

sitesRouter.post(
  '/:site_id/webhooks/:webhook_id/test',
  describeRoute({
    summary: 'Test webhook dispatch',
    description: 'Sends an immediate test submission event to verify destination connectivity',
    tags: ['Webhooks'],
    security: [{ bearerAuth: [] }],
    responses: {
      200: { description: 'Test event dispatched' },
      404: { description: 'Webhook not found' },
    },
  }),
  validator('param', z.object({ site_id: z.string(), webhook_id: z.string() })),
  testWebhook
);

// ----------------------------------------------------
// Submissions Sub-Resource: /v1/sites/{site_id}/submissions
// ----------------------------------------------------
sitesRouter.get(
  '/:site_id/submissions',
  describeRoute(listSubmissionsDocs),
  validator('param', z.object({ site_id: z.string() })),
  listSubmissions
);

sitesRouter.get(
  '/:site_id/submissions/export',
  describeRoute(exportSubmissionsDocs),
  validator('param', z.object({ site_id: z.string() })),
  exportSubmissions
);

sitesRouter.get(
  '/:site_id/submissions/:id',
  describeRoute(getSubmissionDocs),
  validator('param', z.object({ site_id: z.string(), id: z.string() })),
  getSubmission
);

sitesRouter.patch(
  '/:site_id/submissions/:id',
  describeRoute(patchSubmissionDocs),
  validator('param', z.object({ site_id: z.string(), id: z.string() })),
  validator('json', patchSubmissionSchema),
  patchSubmission
);

sitesRouter.delete(
  '/:site_id/submissions/:id',
  describeRoute(deleteSubmissionDocs),
  validator('param', z.object({ site_id: z.string(), id: z.string() })),
  deleteSubmission
);

export default sitesRouter;
