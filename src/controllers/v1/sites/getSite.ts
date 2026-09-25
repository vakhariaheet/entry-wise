import type { Context } from 'hono';
import type { Env } from '../../../types/env';
import type { Site } from '../../../types/site';
import { sendOk, sendProblemDetails } from '../../../utils/sendResponse';

export const getSite = async (c: Context<{ Bindings: Env }>) => {
  try {
    const id = c.req.param('site_id') || c.req.param('id');
    if (!id) {
      return sendProblemDetails(c, 400, 'Site ID path parameter is required');
    }

    const { results } = await c.env.DB.prepare(`
            SELECT * FROM sites WHERE id = ?
        `)
      .bind(id)
      .all<any>();

    if (!results?.length) {
      return sendProblemDetails(c, 404, `Site with ID '${id}' not found`);
    }

    const site = results[0];
    const formattedSite: Site = {
      ...site,
      auto_responder_enabled: site.auto_responder_enabled === 1,
    };

    return sendOk(c, formattedSite);
  } catch (error) {
    console.error('Get site error:', error);
    return sendProblemDetails(c, 500, 'Internal server error while fetching site');
  }
};
