import { Context } from 'hono';
import { Env } from '../../../types/env';
import { sendPaginated, sendProblemDetails } from '../../../utils/sendResponse';
import { Site } from '../../../types/site';

export const listSites = async (c: Context<{ Bindings: Env }>) => {
    try {
        const jwtPayload = c.get('jwtPayload') as any;
        const companyIdParam = c.req.param('company_id');
        const companyIdQuery = c.req.query('company_id');
        const companyId = companyIdParam || companyIdQuery;

        const limit = Math.min(Math.max(parseInt(c.req.query('limit') || '50', 10), 1), 100);
        const offset = Math.max(parseInt(c.req.query('offset') || '0', 10), 0);

        let countSql = `SELECT COUNT(*) as total FROM sites WHERE 1=1`;
        let listSql = `SELECT * FROM sites WHERE 1=1`;
        const params: any[] = [];

        // If authenticated with a specific site API key, restrict to that site
        if (jwtPayload?.role === 'site_owner' && jwtPayload?.site_id) {
            countSql += ` AND id = ?`;
            listSql += ` AND id = ?`;
            params.push(jwtPayload.site_id);
        } else if (jwtPayload?.role === 'clerk_user' && jwtPayload?.user_id) {
            // Show sites owned by user directly or linked to user's company
            countSql += ` AND (user_id = ? OR company_id IN (SELECT id FROM companies WHERE user_id = ?))`;
            listSql += ` AND (user_id = ? OR company_id IN (SELECT id FROM companies WHERE user_id = ?))`;
            params.push(jwtPayload.user_id, jwtPayload.user_id);
        }

        if (companyId) {
            countSql += ` AND company_id = ?`;
            listSql += ` AND company_id = ?`;
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
