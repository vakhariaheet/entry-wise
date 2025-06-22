import { Context } from 'hono';
import { Env } from '../../types/env';
import { sendResponse } from '../../utils/sendResponse';

export const deleteField = async (c: Context<{ Bindings: Env }>) => {
    try {
        const id = c.req.param('field_id');
        
        if (!id) {
            return sendResponse(c, 400, null, 'Field ID is required');
        }

        // Check if field exists
        const { results } = await c.env.DB.prepare(`
            SELECT id FROM fields WHERE id = ?
        `).bind(id).all();

        if (!results?.length) {
            return sendResponse(c, 404, null, 'Field not found');
        }

        const { success } = await c.env.DB.prepare(`
            DELETE FROM fields WHERE id = ?
        `).bind(id).run();

        if (!success) {
            return sendResponse(c, 500, null, 'Failed to delete field');
        }

        return sendResponse(c, 200, null, 'Field deleted successfully');
    } catch (error) {
        return sendResponse(c, 500, null, 'Internal server error');
    }
}; 