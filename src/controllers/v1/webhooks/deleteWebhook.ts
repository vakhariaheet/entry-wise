import type { Context } from 'hono';
import { assertSiteOwnership } from '../../../middleware/authorize';
import type { Env } from '../../../types/env';
import { sendNoContent, sendProblemDetails } from '../../../utils/sendResponse';

export const deleteWebhook = async (c: Context<{ Bindings: Env }>) => {
  try {
    const siteId = c.req.param('site_id');
    const webhookId = c.req.param('webhook_id');

    if (!siteId || !webhookId) {
      return sendProblemDetails(c, 400, 'site_id and webhook_id are required');
    }

    const site = await assertSiteOwnership(c, siteId);
    if (!site) {
      return sendProblemDetails(
        c,
        403,
        'Access denied: You do not have permission to delete webhooks for this site'
      );
    }

    const { success } = await c.env.DB.prepare('DELETE FROM webhooks WHERE id = ? AND site_id = ?')
      .bind(webhookId, siteId)
      .run();

    if (!success) {
      return sendProblemDetails(c, 404, `Webhook '${webhookId}' not found`);
    }

    return sendNoContent(c);
  } catch (error) {
    console.error('Delete webhook error:', error);
    return sendProblemDetails(c, 500, 'Internal server error while deleting webhook');
  }
};
