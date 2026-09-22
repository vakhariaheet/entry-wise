import { Context } from 'hono';
import { Env } from '../../../types/env';
import { sendPaginated, sendProblemDetails } from '../../../utils/sendResponse';
import { Company } from '../../../types/company';

export const listCompanies = async (c: Context<{ Bindings: Env }>) => {
    try {
        const limit = Math.min(Math.max(parseInt(c.req.query('limit') || '20', 10), 1), 100);
        const offset = Math.max(parseInt(c.req.query('offset') || '0', 10), 0);

        const countResult = await c.env.DB.prepare(`
            SELECT COUNT(*) as total FROM companies
        `).first<{ total: number }>();
        const total = countResult?.total || 0;

        const { results } = await c.env.DB.prepare(`
            SELECT id, name, email_provider, from_email, from_name, created_at
            FROM companies
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `).bind(limit, offset).all<Company>();

        return sendPaginated(c, results || [], total, limit, offset);
    } catch (error) {
        console.error('List companies error:', error);
        return sendProblemDetails(c, 500, 'Failed to fetch companies');
    }
};
