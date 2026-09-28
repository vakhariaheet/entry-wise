import type { Context } from 'hono';
import type { Env } from '../../../types/env';
import type { Webhook } from '../../../types/webhook';
import { sendOk, sendProblemDetails } from '../../../utils/sendResponse';

export const listWebhooks = async (c: Context<{ Bindings: Env }>) => {
  try {
    const siteId = c.req.param('site_id');
    if (!siteId) {
      return sendProblemDetails(c, 400, 'site_id path parameter is required');
    }

    const { results } = await c.env.DB.prepare(`
      SELECT id, site_id, name, url, secret, enabled, events, created_at
      FROM webhooks
      WHERE site_id = ?
      ORDER BY created_at ASC
    `)
      .bind(siteId)
      .all<Webhook>();

    const mapped = (results || []).map((w) => ({
      ...w,
      enabled: Boolean(w.enabled),
    }));

    return sendOk(c, mapped);
  } catch (error) {
    console.error('List webhooks error:', error);
    return sendProblemDetails(c, 500, 'Internal server error while fetching webhooks');
  }
};
