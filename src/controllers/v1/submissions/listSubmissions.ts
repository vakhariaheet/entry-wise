import type { Context } from 'hono';
import type { Env } from '../../../types/env';
import type { SubmissionRecord } from '../../../types/submission';
import { sendPaginated, sendProblemDetails } from '../../../utils/sendResponse';

export const listSubmissions = async (c: Context<{ Bindings: Env }>) => {
  try {
    const siteId = c.req.param('site_id');
    if (!siteId) {
      return sendProblemDetails(c, 400, 'site_id path parameter is required');
    }

    const limit = Math.min(Math.max(parseInt(c.req.query('limit') || '20', 10), 1), 100);
    const offset = Math.max(parseInt(c.req.query('offset') || '0', 10), 0);
    const status = c.req.query('status');
    const query = c.req.query('query');

    let countSql = `SELECT COUNT(*) as total FROM submissions WHERE site_id = ?`;
    let listSql = `SELECT * FROM submissions WHERE site_id = ?`;
    const params: any[] = [siteId];

    if (status) {
      countSql += ` AND status = ?`;
      listSql += ` AND status = ?`;
      params.push(status);
    }

    if (query) {
      countSql += ` AND data LIKE ?`;
      listSql += ` AND data LIKE ?`;
      params.push(`%${query}%`);
    }

    listSql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;

    const countResult = await c.env.DB.prepare(countSql)
      .bind(...params)
      .first<{ total: number }>();
    const total = countResult?.total || 0;

    const { results } = await c.env.DB.prepare(listSql)
      .bind(...params, limit, offset)
      .all<any>();

    const formattedSubmissions: SubmissionRecord[] = (results || []).map((row) => ({
      id: row.id,
      site_id: row.site_id,
      data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data,
      attachments:
        row.attachments && typeof row.attachments === 'string'
          ? JSON.parse(row.attachments)
          : undefined,
      status: row.status,
      ip_address: row.ip_address,
      created_at: row.created_at,
    }));

    return sendPaginated(c, formattedSubmissions, total, limit, offset);
  } catch (error) {
    console.error('List submissions error:', error);
    return sendProblemDetails(c, 500, 'Internal server error while fetching submissions');
  }
};
