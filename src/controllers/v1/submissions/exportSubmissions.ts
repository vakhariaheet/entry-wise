import { Context } from 'hono';
import { Env } from '../../../types/env';
import { sendProblemDetails } from '../../../utils/sendResponse';
import { generateSubmissionsCsv } from '../../../utils/csv';
import { SubmissionRecord } from '../../../types/submission';

export const exportSubmissions = async (c: Context<{ Bindings: Env }>) => {
    try {
        const siteId = c.req.param('site_id');
        const format = (c.req.query('format') || 'csv').toLowerCase();
        const status = c.req.query('status');

        if (!siteId) {
            return sendProblemDetails(c, 400, 'site_id path parameter is required');
        }

        let sql = `SELECT * FROM submissions WHERE site_id = ?`;
        const params: any[] = [siteId];

        if (status) {
            sql += ` AND status = ?`;
            params.push(status);
        }

        sql += ` ORDER BY created_at DESC`;

        const { results } = await c.env.DB.prepare(sql).bind(...params).all<any>();

        const formattedSubmissions: SubmissionRecord[] = (results || []).map(row => ({
            id: row.id,
            site_id: row.site_id,
            data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data,
            attachments: row.attachments && typeof row.attachments === 'string' ? JSON.parse(row.attachments) : undefined,
            status: row.status,
            ip_address: row.ip_address,
            created_at: row.created_at,
        }));

        const dateStr = new Date().toISOString().slice(0, 10);

        if (format === 'json') {
            return new Response(JSON.stringify(formattedSubmissions, null, 2), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Disposition': `attachment; filename="submissions-${siteId}-${dateStr}.json"`,
                },
            });
        }

        // CSV export
        const csvContent = generateSubmissionsCsv(formattedSubmissions);
        return new Response(csvContent, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="submissions-${siteId}-${dateStr}.csv"`,
            },
        });
    } catch (error) {
        console.error('Export submissions error:', error);
        return sendProblemDetails(c, 500, 'Internal server error while exporting submissions');
    }
};
