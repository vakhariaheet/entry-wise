import { Context } from 'hono';
import { Env } from '../../../types/env';
import { sendPaginated, sendProblemDetails } from '../../../utils/sendResponse';
import { Site } from '../../../types/site';

export const listSites = async (c: Context<{ Bindings: Env }>) => {
    try {
        const companyIdParam = c.req.param('company_id');
        const companyIdQuery = c.req.query('company_id');
        const companyId = companyIdParam || companyIdQuery;

        const limit = Math.min(Math.max(parseInt(c.req.query('limit') || '20', 10), 1), 100);
        const offset = Math.max(parseInt(c.req.query('offset') || '0', 10), 0);

        let countSql = `SELECT COUNT(*) as total FROM sites`;
        let listSql = `SELECT * FROM sites`;
        const params: any[] = [];

        if (companyId) {
            countSql += ` WHERE company_id = ?`;
            listSql += ` WHERE company_id = ?`;
            params.push(companyId);
        }

        listSql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;

        const countResult = await c.env.DB.prepare(countSql).bind(...params).first<{ total: number }>();
        const total = countResult?.total || 0;

        const { results } = await c.env.DB.prepare(listSql)
            .bind(...params, limit, offset)
            .all<Site>();

        return sendPaginated(c, results || [], total, limit, offset);
    } catch (error) {
        console.error('List sites error:', error);
        return sendProblemDetails(c, 500, 'Internal server error while fetching sites');
    }
};
