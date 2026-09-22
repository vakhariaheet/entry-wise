import { Context } from 'hono';
import { Env } from '../../types/env';
import { sendResponse } from '../../utils/sendResponse';
import { Site } from '../../types/site';

export const getSites = async (c: Context<{ Bindings: Env }>) => {
    try {
        // Optional company_id filter
        const company_id = c.req.param('company_id');
        
        let query = `SELECT * FROM sites WHERE company_id = ?`;
        let params: any[] = [company_id];

        const { results } = await c.env.DB.prepare(query)
            .bind(...params)
            .all<Site>();

        return sendResponse(c, 200, results || [], 'Sites fetched successfully');
    } catch (error) {
        console.error('Error fetching sites:', error);
        return sendResponse(c, 500, null, 'Internal server error');
    }
}; 