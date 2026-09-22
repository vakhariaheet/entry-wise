import { Context } from 'hono';
import { Env } from '../../../types/env';
import { sendNoContent, sendProblemDetails } from '../../../utils/sendResponse';

export const deleteCompany = async (c: Context<{ Bindings: Env }>) => {
    try {
        const id = c.req.param('id');
        if (!id) {
            return sendProblemDetails(c, 400, 'Company ID path parameter is required');
        }

        const { results } = await c.env.DB.prepare(`
            SELECT id FROM companies WHERE id = ?
        `).bind(id).all();

        if (!results?.length) {
            return sendProblemDetails(c, 404, `Company with ID '${id}' not found`);
        }

        const { success } = await c.env.DB.prepare(`
            DELETE FROM companies WHERE id = ?
        `).bind(id).run();

        if (!success) {
            return sendProblemDetails(c, 500, 'Failed to delete company');
        }

        return sendNoContent(c);
    } catch (error) {
        console.error('Delete company error:', error);
        return sendProblemDetails(c, 500, 'Internal server error while deleting company');
    }
};
