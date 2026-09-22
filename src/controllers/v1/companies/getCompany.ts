import { Context } from 'hono';
import { Env } from '../../../types/env';
import { sendOk, sendProblemDetails } from '../../../utils/sendResponse';
import { Company } from '../../../types/company';

export const getCompany = async (c: Context<{ Bindings: Env }>) => {
    try {
        const id = c.req.param('id');
        if (!id) {
            return sendProblemDetails(c, 400, 'Company ID path parameter is required');
        }

        const { results } = await c.env.DB.prepare(`
            SELECT id, name, email_provider, from_email, from_name, created_at
            FROM companies WHERE id = ?
        `).bind(id).all<Company>();

        if (!results?.length) {
            return sendProblemDetails(c, 404, `Company with ID '${id}' not found`);
        }

        return sendOk(c, results[0]);
    } catch (error) {
        console.error('Get company error:', error);
        return sendProblemDetails(c, 500, 'Internal server error while fetching company');
    }
};
