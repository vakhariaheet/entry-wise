import { Context } from 'hono';
import { Env } from '../../types/env';
import { sendResponse } from '../../utils/sendResponse';
import { UpdateCompanyBody } from '../../types/company';
import { encrypt } from '../../utils/encryption';

export const updateCompany = async (c: Context<{ Bindings: Env }>) => {
    try {
        const id = c.req.param('id');
        const body = await c.req.json() as UpdateCompanyBody;
        
        if (!id) {
            return sendResponse(c, 400, null, 'Company ID is required');
        }

        // Check if company exists
        const { results } = await c.env.DB.prepare(`
            SELECT id FROM companies WHERE id = ?
        `).bind(id).all();

        if (!results?.length) {
            return sendResponse(c, 404, null, 'Company not found');
        }

        // If email_provider_token is being updated, encrypt it
        if (body.email_provider_token) {
            body.email_provider_token = await encrypt(body.email_provider_token, c.env.ENCRYPTION_KEY);
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

        // If email_provider is being updated, validate that email_provider_token is also provided
        if (body.email_provider && !body.email_provider_token) {
            return sendResponse(c, 400, null, 'Email provider token is required when changing email provider');
        }

        const { success } = await c.env.DB.prepare(`
            UPDATE companies 
            SET ${updateFields}
            WHERE id = ?
        `).bind(...updateValues, id).run();

        if (!success) {
            return sendResponse(c, 500, null, 'Failed to update company');
        }

        // Get updated company data
        const { results: updated } = await c.env.DB.prepare(`
            SELECT id, name, email_provider, from_email, from_name, admin_email, created_at
            FROM companies WHERE id = ?
        `).bind(id).all();

        return sendResponse(c, 200, updated[0], 'Company updated successfully');
    } catch (error) {
        console.error(error);
        return sendResponse(c, 500, null, 'Internal server error');
    }
};