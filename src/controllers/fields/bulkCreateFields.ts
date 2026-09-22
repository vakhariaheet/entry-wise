import { Context } from 'hono';
import { Env } from '../../types/env';
import { sendResponse } from '../../utils/sendResponse';
import { BulkCreateFieldBody, Field, FieldType } from '../../schemas/field.schema';

export const bulkCreateFields = async (c: Context<{ Bindings: Env }>) => {
    try {
        const body = await c.req.json() as BulkCreateFieldBody;
        const site_id = c.req.param('site_id');
        // Check if site exists
        const { results: siteExists } = await c.env.DB.prepare(`
            SELECT id FROM sites WHERE id = ?
        `).bind(site_id).all();

        if (!siteExists?.length) {
            return sendResponse(c, 404, null, 'Site not found');
        }

        // Check for duplicate field names in the request
        const fieldNames = body.fields.map((field: { name: string }) => field.name);
        const uniqueFieldNames = new Set(fieldNames);
        if (fieldNames.length !== uniqueFieldNames.size) {
            return sendResponse(c, 400, null, 'Duplicate field names in request');
        }

        // Check if any field names already exist for this site
        const placeholders = body.fields.map(() => '?').join(',');
        const { results: existingFields } = await c.env.DB.prepare(`
            SELECT name FROM fields 
            WHERE site_id = ? AND name IN (${placeholders})
        `).bind(site_id, ...fieldNames).all<{ name: string }>();

        if (existingFields?.length) {
            const duplicateNames = existingFields.map(field => field.name).join(', ');
            return sendResponse(c, 400, null, `Field names already exist: ${duplicateNames}`);
        }

        // Create fields in a transaction
        const stmt = c.env.DB.prepare(`
            INSERT INTO fields (id, site_id, name, type)
            VALUES (?, ?, ?, ?)
        `);

        const batchResults = await c.env.DB.batch(
            body.fields.map((field: { name: string, type: FieldType }) => 
                stmt.bind(`field_${crypto.randomUUID()}`, site_id, field.name, field.type)
            )
        );

        if (!batchResults.every(result => result.success)) {
            return sendResponse(c, 500, null, 'Failed to create fields');
        }

        // Fetch all created fields
        const { results: createdFields } = await c.env.DB.prepare(`
            SELECT * FROM fields 
            WHERE site_id = ? AND name IN (${placeholders})
            ORDER BY created_at DESC
        `).bind(site_id, ...fieldNames).all<Field>();

        return sendResponse(c, 201, createdFields, 'Fields created successfully');
    } catch (error) {
        console.error('Bulk create fields error:', error);
        return sendResponse(c, 500, null, 'Internal server error');
    }
}; 