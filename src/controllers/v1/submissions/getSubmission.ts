import { Context } from 'hono';
import { Env } from '../../../types/env';
import { sendOk, sendProblemDetails } from '../../../utils/sendResponse';
import { SubmissionRecord } from '../../../types/submission';

export const getSubmission = async (c: Context<{ Bindings: Env }>) => {
    try {
        const siteId = c.req.param('site_id');
        const id = c.req.param('id');

        if (!id) {
            return sendProblemDetails(c, 400, 'id path parameter is required');
        }

        let sql = `SELECT * FROM submissions WHERE id = ?`;
        const params: any[] = [id];

        if (siteId) {
            sql += ` AND site_id = ?`;
            params.push(siteId);
        }

        const { results } = await c.env.DB.prepare(sql).bind(...params).all<any>();

        if (!results?.length) {
            return sendProblemDetails(c, 404, `Submission with ID '${id}' not found`);
        }

        const row = results[0];
        const formatted: SubmissionRecord = {
            id: row.id,
            site_id: row.site_id,
            data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data,
            attachments: row.attachments && typeof row.attachments === 'string' ? JSON.parse(row.attachments) : undefined,
            status: row.status,
            ip_address: row.ip_address,
            created_at: row.created_at,
        };

        return sendOk(c, formatted);
    } catch (error) {
        console.error('Get submission error:', error);
        return sendProblemDetails(c, 500, 'Internal server error while fetching submission');
    }
};
