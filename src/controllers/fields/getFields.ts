import { Context } from 'hono';
import { Env } from '../../types/env';
import { sendResponse } from '../../utils/sendResponse';
import { Field } from '../../types/field';

export const getFields = async (c: Context<{ Bindings: Env }>) => {
    try {
        // Optional site_id filter
        const site_id = c.req.param('site_id');

        let query = 'SELECT * FROM fields';
        let params: any[] = [];

        if (site_id) {
            query += ' WHERE site_id = ?';
            params.push(site_id);
        }

        query += ' ORDER BY created_at DESC';

        const { results } = await c.env.DB.prepare(query)
            .bind(...params)
            .all<Field>();

        return sendResponse(c, 200, results || [], 'Fields fetched successfully');
    } catch (error) {
        return sendResponse(c, 500, null, 'Internal server error');
    }
}; 