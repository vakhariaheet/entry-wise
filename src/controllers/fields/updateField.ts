import { Context } from 'hono';
import { Env } from '../../types/env';
import { sendResponse } from '../../utils/sendResponse';
import { UpdateFieldBody, FieldType } from '../../types/field';

export const updateField = async (c: Context<{ Bindings: Env }>) => {
    try {
        const id = c.req.param('id');
        const body = await c.req.json<UpdateFieldBody>() ;
        
        if (!id) {
            return sendResponse(c, 400, null, 'Field ID is required');
        }

        // Check if field exists and get its site_id
        const { results: fieldExists } = await c.env.DB.prepare(`
            SELECT site_id FROM fields WHERE id = ?
        `).bind(id).all();

        if (!fieldExists?.length) {
            return sendResponse(c, 404, null, 'Field not found');
        }

        // If type is being updated, validate it
        if (body.type) {
            const validTypes: FieldType[] = ['text', 'email', 'phone', 'url','file'];
            if (!validTypes.includes(body.type)) {
                return sendResponse(c, 400, null, 'Invalid field type. Must be one of: text, email, phone, url');
            }
        }

        // If name is being updated, check if it already exists for this site
        if (body.name) {
            const { results: nameExists } = await c.env.DB.prepare(`
                SELECT id FROM fields 
                WHERE site_id = ? AND name = ? AND id != ?
            `).bind(fieldExists[0].site_id, body.name, id).all();

            if (nameExists?.length) {
                return sendResponse(c, 400, null, 'Field name already exists for this site');
            }
        }

        // Build update query dynamically based on provided fields
        const updateFields = Object.entries(body)
            .filter(([_, value]) => value !== undefined)
            .map(([key]) => `${key} = ?`)
            .join(', ');
        
        const updateValues = Object.entries(body)
            .filter(([_, value]) => value !== undefined)
            .map(([_, value]) => value);

        if (!updateFields) {
            return sendResponse(c, 400, null, 'No fields to update');
        }

        const { success } = await c.env.DB.prepare(`
            UPDATE fields 
            SET ${updateFields}
            WHERE id = ?
        `).bind(...updateValues, id).run();

        if (!success) {
            return sendResponse(c, 500, null, 'Failed to update field');
        }

        return sendResponse(c, 200, body, 'Field updated successfully');
    } catch (error) {
        console.error('Update field error:', error);
        return sendResponse(c, 500, null, 'Internal server error');
    }
}; 