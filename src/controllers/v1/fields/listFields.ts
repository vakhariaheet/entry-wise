import type { Context } from 'hono';
import type { Env } from '../../../types/env';
import type { Field } from '../../../types/field';
import { sendOk, sendProblemDetails } from '../../../utils/sendResponse';

export const listFields = async (c: Context<{ Bindings: Env }>) => {
  try {
    const siteId = c.req.param('site_id');
    if (!siteId) {
      return sendProblemDetails(c, 400, 'site_id path parameter is required');
    }

    const { results } = await c.env.DB.prepare(`
            SELECT id, site_id, name, type, created_at
            FROM fields WHERE site_id = ?
            ORDER BY created_at ASC
        `)
      .bind(siteId)
      .all<Field>();

    return sendOk(c, results || []);
  } catch (error) {
    console.error('List fields error:', error);
    return sendProblemDetails(c, 500, 'Internal server error while fetching fields');
  }
};
