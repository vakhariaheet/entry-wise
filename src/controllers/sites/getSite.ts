import { Context } from 'hono';
import { Env } from '../../types/env';
import { sendResponse } from '../../utils/sendResponse';
import { Site } from '../../types/site';

export const getSite = async (c: Context<{ Bindings: Env }>) => {
    try {
        const id = c.req.param('id');
        const companyId = c.req.param('company_id');
        
        if (!id) {
            return sendResponse(c, 400, null, 'Site ID is required');
        }

        const { results } = await c.env.DB.prepare(`
            SELECT * FROM sites WHERE id = ? AND company_id = ?
        `).bind(id, companyId).all<Site>();

        if (!results?.length) {
            return sendResponse(c, 404, null, 'Site not found');
        }

        return sendResponse(c, 200, results[0], 'Site fetched successfully');
    } catch (error) {
        console.error('Error fetching site:', error);
        return sendResponse(c, 500, null, 'Internal server error');
    }
}; 