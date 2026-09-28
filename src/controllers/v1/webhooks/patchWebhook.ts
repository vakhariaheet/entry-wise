import type { Context } from 'hono';
import { assertSiteOwnership } from '../../../middleware/authorize';
import type { UpdateWebhookBody, Webhook } from '../../../schemas/webhook.schema';
import type { Env } from '../../../types/env';
import { sendOk, sendProblemDetails } from '../../../utils/sendResponse';
import { isSafeExternalUrl } from '../../../utils/ssrf';

export const patchWebhook = async (c: Context<{ Bindings: Env }>) => {
  try {
    const siteId = c.req.param('site_id');
    const webhookId = c.req.param('webhook_id');
    const body = await c.req.json<UpdateWebhookBody>();

    if (!siteId || !webhookId) {
      return sendProblemDetails(c, 400, 'site_id and webhook_id are required');
    }

    const site = await assertSiteOwnership(c, siteId);
    if (!site) {
      return sendProblemDetails(
        c,
        403,
        'Access denied: You do not have permission to modify webhooks for this site'
      );
    }

    const existing = await c.env.DB.prepare('SELECT * FROM webhooks WHERE id = ? AND site_id = ?')
      .bind(webhookId, siteId)
      .first<Webhook>();

    if (!existing) {
      return sendProblemDetails(c, 404, `Webhook '${webhookId}' not found on site '${siteId}'`);
    }

    if (body.url !== undefined) {
      if (!isSafeExternalUrl(body.url)) {
        return sendProblemDetails(c, 422, 'Target URL is not an allowed external address');
      }
    }

    const name = body.name !== undefined ? body.name.trim() : existing.name;
    const url = body.url !== undefined ? body.url.trim() : existing.url;
    const secret =
      body.secret !== undefined ? (body.secret ? body.secret.trim() : null) : existing.secret;
    const enabled = body.enabled !== undefined ? (body.enabled ? 1 : 0) : existing.enabled;

    await c.env.DB.prepare(`
      UPDATE webhooks
      SET name = ?, url = ?, secret = ?, enabled = ?
      WHERE id = ? AND site_id = ?
    `)
      .bind(name, url, secret, enabled, webhookId, siteId)
      .run();

    const updated = await c.env.DB.prepare('SELECT * FROM webhooks WHERE id = ?')
      .bind(webhookId)
      .first<Webhook>();

    return sendOk(c, {
      ...updated,
      enabled: Boolean(updated?.enabled),
    });
  } catch (error) {
    console.error('Patch webhook error:', error);
    return sendProblemDetails(c, 500, 'Internal server error while updating webhook');
  }
};
