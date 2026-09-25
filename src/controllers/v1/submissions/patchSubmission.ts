import type { Context } from 'hono';
import type { PatchSubmissionBody } from '../../../schemas/submission.schema';
import type { Env } from '../../../types/env';
import { sendOk, sendProblemDetails } from '../../../utils/sendResponse';

export const patchSubmission = async (c: Context<{ Bindings: Env }>) => {
  try {
    const siteId = c.req.param('site_id');
    const id = c.req.param('id');
    const body = (await c.req.json()) as PatchSubmissionBody;

    if (!id) {
      return sendProblemDetails(c, 400, 'id path parameter is required');
    }

    const validStatuses = ['new', 'read', 'archived', 'spam'];
    if (!body.status || !validStatuses.includes(body.status)) {
      return sendProblemDetails(
        c,
        422,
        `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        {
          invalidParams: [
            { name: 'status', reason: `Must be one of: ${validStatuses.join(', ')}` },
          ],
        }
      );
    }

    let sql = `SELECT * FROM submissions WHERE id = ?`;
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
            UPDATE submissions SET status = ? WHERE id = ?
        `)
      .bind(body.status, id)
      .run();

    if (!success) {
      return sendProblemDetails(c, 500, 'Failed to update submission status');
    }

    const { results: updated } = await c.env.DB.prepare(`
            SELECT * FROM submissions WHERE id = ?
        `)
      .bind(id)
      .all<any>();

    const row = updated[0];
    return sendOk(c, {
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
    });
  } catch (error) {
    console.error('Patch submission error:', error);
    return sendProblemDetails(c, 500, 'Internal server error while patching submission');
  }
};
