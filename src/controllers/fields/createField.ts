import { Context } from 'hono';
import { Env } from '../../types/env';
import { sendResponse } from '../../utils/sendResponse';
import { CreateFieldBody, Field, FieldType } from '../../types/field';

export const createField = async (c: Context<{ Bindings: Env }>) => {
    try {
        const body = await c.req.json<CreateFieldBody>();
        console.log('body', body);
        const site_id = c.req.param('site_id');
        // Validate required fields
        if (!site_id || !body.name || !body.type) {
            return sendResponse(c, 400, null, 'Missing required fields');
        }

        // Validate field type
        const validTypes: FieldType[] = ['text', 'email', 'phone', 'url','file'];
        if (!validTypes.includes(body.type)) {
            return sendResponse(c, 400, null, 'Invalid field type. Must be one of: text, email, phone, url');
        }

        // Check if site exists
        const { results: siteExists } = await c.env.DB.prepare(`
            SELECT id FROM sites WHERE id = ?
        `).bind(site_id).all();

        if (!siteExists?.length) {
            return sendResponse(c, 404, null, 'Site not found');
        }

        // Check if field name already exists for this site
        const { results: fieldExists } = await c.env.DB.prepare(`
            SELECT id FROM fields WHERE site_id = ? AND name = ?
        `).bind(site_id, body.name).all();

        if (fieldExists?.length) {
            return sendResponse(c, 400, null, 'Field name already exists for this site');
        }

        const id = `field_${crypto.randomUUID()}`;

        const { success, results } = await c.env.DB.prepare(`
            INSERT INTO fields (id, site_id, name, type)
            VALUES (?, ?, ?, ?)
            RETURNING *
        `).bind(id, site_id, body.name, body.type)
        .run<Field>();

        if (!success || !results?.length) {
            console.error('Failed to create field:', results);
            return sendResponse(c, 500, null, 'Failed to create field');
        }

        return sendResponse(c, 201, results[0], 'Field created successfully');
    } catch (error) {
        console.error('Create field error:', error);
        return sendResponse(c, 500, null, 'Internal server error');
    }
}; 