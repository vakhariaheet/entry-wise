import { Context } from 'hono';
import { Env } from '../../../types/env';
import { sendNoContent, sendProblemDetails } from '../../../utils/sendResponse';

export const deleteSite = async (c: Context<{ Bindings: Env }>) => {
    try {
        const id = c.req.param('site_id') || c.req.param('id');
        if (!id) {
            return sendProblemDetails(c, 400, 'Site ID path parameter is required');
        }

        const { results } = await c.env.DB.prepare(`
            SELECT id FROM sites WHERE id = ?
        `).bind(id).all();

        if (!results?.length) {
            return sendProblemDetails(c, 404, `Site with ID '${id}' not found`);
        }

        const { success } = await c.env.DB.prepare(`
            DELETE FROM sites WHERE id = ?
        `).bind(id).run();

        if (!success) {
            return sendProblemDetails(c, 500, 'Failed to delete site');
        }

        return sendNoContent(c);
    } catch (error) {
        console.error('Delete site error:', error);
        return sendProblemDetails(c, 500, 'Internal server error while deleting site');
    }
};
