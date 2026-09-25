import { Context } from 'hono';
import { Env } from '../../../types/env';
import { sendPaginated, sendProblemDetails } from '../../../utils/sendResponse';
import { Company } from '../../../types/company';

export const listCompanies = async (c: Context<{ Bindings: Env }>) => {
    try {
        const jwtPayload = c.get('jwtPayload') as any;
        const limit = Math.min(Math.max(parseInt(c.req.query('limit') || '20', 10), 1), 100);
        const offset = Math.max(parseInt(c.req.query('offset') || '0', 10), 0);

        let countSql = `SELECT COUNT(*) as total FROM companies WHERE 1=1`;
        let listSql = `SELECT id, name, email_provider, from_email, from_name, user_id, created_at FROM companies WHERE 1=1`;
        const params: any[] = [];

        // If authenticated with Clerk, show companies owned by this user
        if (jwtPayload?.role === 'clerk_user' && jwtPayload?.user_id) {
            countSql += ` AND (user_id = ? OR id = 'comp_default')`;
            listSql += ` AND (user_id = ? OR id = 'comp_default')`;
            params.push(jwtPayload.user_id);
        }

        const countResult = await c.env.DB.prepare(countSql).bind(...params).first<{ total: number }>();
        const total = countResult?.total || 0;

        listSql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
        const { results } = await c.env.DB.prepare(listSql).bind(...params, limit, offset).all<Company>();

        return sendPaginated(c, results || [], total, limit, offset);
    } catch (error) {
        console.error('List companies error:', error);
        return sendProblemDetails(c, 500, 'Failed to fetch companies');
    }
};
