import type { Context } from 'hono';
import type { Env } from '../../../types/env';
import type { Site } from '../../../types/site';
import type { Webhook } from '../../../types/webhook';
import { sendOk, sendProblemDetails } from '../../../utils/sendResponse';
import { dispatchWebhook } from '../../../utils/webhook';

export const testWebhook = async (c: Context<{ Bindings: Env }>) => {
  try {
    const siteId = c.req.param('site_id');
    const webhookId = c.req.param('webhook_id');

    const webhook = await c.env.DB.prepare('SELECT * FROM webhooks WHERE id = ? AND site_id = ?')
      .bind(webhookId, siteId)
      .first<Webhook>();

    if (!webhook) {
      return sendProblemDetails(c, 404, `Webhook '${webhookId}' not found`);
    }

    const site = await c.env.DB.prepare('SELECT * FROM sites WHERE id = ?')
      .bind(siteId)
      .first<Site>();

    const domain = site?.domain || 'entrywise.webbound.in';

    const testPayload = {
      event: 'submission.created' as const,
      timestamp: new Date().toISOString(),
      site_id: siteId,
      domain,
      submission_id: `test_${Math.random().toString(36).substring(2, 8)}`,
      data: {
        name: 'Alex Taylor (Test)',
        email: 'alex.taylor@example.com',
        message: 'This is an instant connectivity test from EntryWise!',
      },
    };

    const result = await dispatchWebhook(webhook.url, testPayload, webhook.secret);

    return sendOk(c, result);
  } catch (error) {
    console.error('Test webhook error:', error);
    return sendProblemDetails(c, 500, 'Internal server error while testing webhook');
  }
};
