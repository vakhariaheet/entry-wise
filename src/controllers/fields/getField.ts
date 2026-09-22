import { Context } from 'hono';
import { Env } from '../../types/env';
import { sendResponse } from '../../utils/sendResponse';
import { Field } from '../../types/field';

export const getField = async (c: Context<{ Bindings: Env }>) => {
    try {
        const id = c.req.param('id');
        
        if (!id) {
            return sendResponse(c, 400, null, 'Field ID is required');
        }

        const { results } = await c.env.DB.prepare(`
            SELECT * FROM fields WHERE id = ?
        `).bind(id).all<Field>();

        if (!results?.length) {
            return sendResponse(c, 404, null, 'Field not found');
        }

        return sendResponse(c, 200, results[0], 'Field fetched successfully');
    } catch (error) {
        return sendResponse(c, 500, null, 'Internal server error');
    }
}; 