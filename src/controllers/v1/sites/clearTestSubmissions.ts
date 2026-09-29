import type { Context } from 'hono';
import { assertSiteOwnership } from '../../../middleware/authorize';
import type { Env } from '../../../types/env';
import { sendOk, sendProblemDetails } from '../../../utils/sendResponse';

export const clearTestSubmissions = async (c: Context<{ Bindings: Env }>) => {
  try {
    const siteId = c.req.param('site_id') || c.req.param('id');
    if (!siteId) {
      return sendProblemDetails(c, 400, 'Site ID path parameter is required');
    }

    const authorized = await assertSiteOwnership(c, siteId);
    if (!authorized) {
      return sendProblemDetails(
        c,
        403,
        'Access denied: You do not have permission to delete submissions for this site'
      );
    }

    const { results } = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM submissions WHERE site_id = ? AND is_test = 1
    `)
      .bind(siteId)
      .all<any>();

    const count = results?.[0]?.count || 0;

    await c.env.DB.prepare(`
      DELETE FROM submissions WHERE site_id = ? AND is_test = 1
    `)
      .bind(siteId)
      .run();

    return sendOk(c, {
      success: true,
      deleted_count: count,
      message: `Cleared ${count} mock test submission${count === 1 ? '' : 's'}.`,
    });
  } catch (error) {
    console.error('Clear test submissions error:', error);
    return sendProblemDetails(c, 500, 'Internal server error while clearing test submissions');
  }
};
