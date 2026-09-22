import { Context } from 'hono';
import { Env } from '../../../types/env';
import { sendCreated, sendProblemDetails } from '../../../utils/sendResponse';
import { CreateFieldBody, Field, FieldType } from '../../../types/field';

export const createField = async (c: Context<{ Bindings: Env }>) => {
    try {
        const siteId = c.req.param('site_id');
        const body = await c.req.json<CreateFieldBody>();

        if (!siteId || !body.name || !body.type) {
            const invalidParams = [];
            if (!body.name) invalidParams.push({ name: 'name', reason: 'Field name is required' });
            if (!body.type) invalidParams.push({ name: 'type', reason: 'Field type is required' });
            return sendProblemDetails(c, 422, 'Missing required fields', { invalidParams });
        }

        const validTypes: FieldType[] = ['text', 'email', 'phone', 'url', 'file'];
        if (!validTypes.includes(body.type)) {
            return sendProblemDetails(c, 422, `Invalid field type. Must be one of: ${validTypes.join(', ')}`, {
                invalidParams: [{ name: 'type', reason: `Must be one of: ${validTypes.join(', ')}` }],
            });
        }

        // Verify site exists
        const { results: siteExists } = await c.env.DB.prepare(`
            SELECT id FROM sites WHERE id = ?
        `).bind(siteId).all();

        if (!siteExists?.length) {
            return sendProblemDetails(c, 404, `Site with ID '${siteId}' not found`);
        }

        // Check if field already exists on this site
        const { results: fieldExists } = await c.env.DB.prepare(`
            SELECT id FROM fields WHERE site_id = ? AND name = ?
        `).bind(siteId, body.name).all();

        if (fieldExists?.length) {
            return sendProblemDetails(c, 409, `Field '${body.name}' already exists on this site`);
        }

        const id = `field_${crypto.randomUUID()}`;

        const { success } = await c.env.DB.prepare(`
            INSERT INTO fields (id, site_id, name, type)
            VALUES (?, ?, ?, ?)
        `).bind(id, siteId, body.name, body.type).run();

        if (!success) {
            return sendProblemDetails(c, 500, 'Failed to insert field into database');
        }

        const createdField: Field = {
            id: id as any,
            site_id: siteId as any,
            name: body.name,
            type: body.type,
            created_at: new Date().toISOString(),
        };

        return sendCreated(c, createdField, `/v1/sites/${siteId}/fields/${id}`);
    } catch (error) {
        console.error('Create field error:', error);
        return sendProblemDetails(c, 500, 'Internal server error while creating field');
    }
};
