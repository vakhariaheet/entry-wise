import { Context } from 'hono';
import { Env } from '../../types/env';
import { sendResponse } from '../../utils/sendResponse';

export const deleteSite = async (c: Context<{ Bindings: Env }>) => {
    try {
        const id = c.req.param('id');
        const companyId = c.req.param('company_id');
        if (!id) {
            return sendResponse(c, 400, null, 'Site ID is required');
        }

        // Check if site exists
        const { results } = await c.env.DB.prepare(`
            SELECT id FROM sites WHERE id = ? AND company_id = ?
        `).bind(id, companyId).all();

        if (!results?.length) {
            return sendResponse(c, 404, null, 'Site not found');
        }

        const { success } = await c.env.DB.prepare(`
            DELETE FROM sites WHERE id = ? AND company_id = ?
        `).bind(id, companyId).run();

        if (!success) {
            return sendResponse(c, 500, null, 'Failed to delete site');
        }

        return sendResponse(c, 200, null, 'Site deleted successfully');
    } catch (error) {
        console.error('Error deleting site:', error);
        return sendResponse(c, 500, null, 'Internal server error');
    }
}; 