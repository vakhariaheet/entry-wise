import type { Context } from 'hono';
import type { Env } from '../../../types/env';
import { sendNoContent, sendProblemDetails } from '../../../utils/sendResponse';

export const deleteSubmission = async (c: Context<{ Bindings: Env }>) => {
  try {
    const siteId = c.req.param('site_id');
    const id = c.req.param('id');

    if (!id) {
      return sendProblemDetails(c, 400, 'id path parameter is required');
    }

    let sql = `SELECT id FROM submissions WHERE id = ?`;
    const params: any[] = [id];
    if (siteId) {
      sql += ` AND site_id = ?`;
      params.push(siteId);
    }

    const { results } = await c.env.DB.prepare(sql)
      .bind(...params)
      .all();
    if (!results?.length) {
      return sendProblemDetails(c, 404, `Submission with ID '${id}' not found`);
    }

    const { success } = await c.env.DB.prepare(`
            DELETE FROM submissions WHERE id = ?
        `)
      .bind(id)
      .run();

    if (!success) {
      return sendProblemDetails(c, 500, 'Failed to delete submission');
    }

    return sendNoContent(c);
  } catch (error) {
    console.error('Delete submission error:', error);
    return sendProblemDetails(c, 500, 'Internal server error while deleting submission');
  }
};
