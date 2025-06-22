import { Context } from 'hono';
import { Env } from '../../types/env';
import { sendResponse } from '../../utils/sendResponse';

export const deleteCompany = async (c: Context<{ Bindings: Env }>) => {
    try {
        const id = c.req.param('id');
        
        if (!id) {
            return sendResponse(c, 400, null, 'Company ID is required');
        }

        // Check if company exists
        const { results } = await c.env.DB.prepare(`
            SELECT id FROM companies WHERE id = ?
        `).bind(id).all();

        if (!results?.length) {
            return sendResponse(c, 404, null, 'Company not found');
        }

        const { success } = await c.env.DB.prepare(`
            DELETE FROM companies WHERE id = ?
        `).bind(id).run();

        if (!success) {
            return sendResponse(c, 500, null, 'Failed to delete company');
        }

        return sendResponse(c, 200, null, 'Company deleted successfully');
    } catch (error) {
        return sendResponse(c, 500, null, 'Internal server error');
    }
}; 