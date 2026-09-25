import type { Context } from 'hono';
import type { Env } from '../../types/env';
import type { Site } from '../../types/site';
import { sendResponse } from '../../utils/sendResponse';

export const getSites = async (c: Context<{ Bindings: Env }>) => {
  try {
    // Optional company_id filter
    const company_id = c.req.param('company_id');

    const query = `SELECT * FROM sites WHERE company_id = ?`;
    const params: any[] = [company_id];

    const { results } = await c.env.DB.prepare(query)
      .bind(...params)
      .all<Site>();

    return sendResponse(c, 200, results || [], 'Sites fetched successfully');
  } catch (error) {
    console.error('Error fetching sites:', error);
    return sendResponse(c, 500, null, 'Internal server error');
  }
};
