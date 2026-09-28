import type { Context } from 'hono';
import type { CreateWebhookBody, Webhook } from '../../../schemas/webhook.schema';
import type { Env } from '../../../types/env';
import { sendCreated, sendProblemDetails } from '../../../utils/sendResponse';
import { isSafeExternalUrl } from '../../../utils/ssrf';

export const createWebhook = async (c: Context<{ Bindings: Env }>) => {
  try {
    const siteId = c.req.param('site_id');
    const body = await c.req.json<CreateWebhookBody>();

    if (!siteId || !body.url) {
      return sendProblemDetails(c, 422, 'Missing required fields', {
        invalidParams: [{ name: 'url', reason: 'Destination URL is required' }],
      });
    }

    if (!isSafeExternalUrl(body.url)) {
      return sendProblemDetails(c, 422, 'Target URL is not an allowed external address', {
        invalidParams: [{ name: 'url', reason: 'Must be a safe external HTTP or HTTPS URL' }],
      });
    }

    // Verify site exists
    const site = await c.env.DB.prepare('SELECT id FROM sites WHERE id = ?').bind(siteId).first();

    if (!site) {
      return sendProblemDetails(c, 404, `Site with ID '${siteId}' not found`);
    }

    const id = `wh_${crypto.randomUUID()}`;
    const name = body.name?.trim() || 'Webhook';
    const secret = body.secret?.trim() || null;
    const enabled = body.enabled !== false ? 1 : 0;
    const events = JSON.stringify(['submission.created']);

    await c.env.DB.prepare(`
      INSERT INTO webhooks (id, site_id, name, url, secret, enabled, events)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
      .bind(id, siteId, name, body.url.trim(), secret, enabled, events)
      .run();

    const created = await c.env.DB.prepare('SELECT * FROM webhooks WHERE id = ?')
      .bind(id)
      .first<Webhook>();

    const responseData = created
      ? { ...created, enabled: Boolean(created.enabled) }
      : {
          id,
          site_id: siteId,
          name,
          url: body.url.trim(),
          secret,
          enabled: Boolean(enabled),
          events,
        };

    return sendCreated(c, responseData, `/v1/sites/${siteId}/webhooks/${id}`);
  } catch (error) {
    console.error('Create webhook error:', error);
    return sendProblemDetails(c, 500, 'Internal server error while creating webhook');
  }
};
