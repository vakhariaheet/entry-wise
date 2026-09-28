import type { Context } from 'hono';
import { assertSiteOwnership } from '../../../middleware/authorize';
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
      .all<any>();
    if (!results?.length) {
      return sendProblemDetails(c, 404, `Submission with ID '${id}' not found`);
    }

    const row = results[0];
    const site = await assertSiteOwnership(c, row.site_id);
    if (!site) {
      return sendProblemDetails(
        c,
        403,
        'Access denied: You do not have permission to modify this submission'
      );
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

    const updatedRow = updated[0];
    return sendOk(c, {
      id: updatedRow.id,
      site_id: updatedRow.site_id,
      data: typeof updatedRow.data === 'string' ? JSON.parse(updatedRow.data) : updatedRow.data,
      attachments:
        updatedRow.attachments && typeof updatedRow.attachments === 'string'
          ? JSON.parse(updatedRow.attachments)
          : undefined,
      status: updatedRow.status,
      ip_address: updatedRow.ip_address,
      created_at: updatedRow.created_at,
    });
  } catch (error) {
    console.error('Patch submission error:', error);
    return sendProblemDetails(c, 500, 'Internal server error while patching submission');
  }
};
