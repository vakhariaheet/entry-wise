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
            SELECT id, email_provider FROM companies WHERE id = ?
        `).bind(id).all<{ id: string; email_provider: string }>();

        if (!results?.length) {
            return sendResponse(c, 404, null, 'Company not found');
        }

        const currentProvider = results[0].email_provider;
        const newProvider = body.email_provider ?? currentProvider;
        const isCloudflare = newProvider === 'cloudflare';

        // If switching away from cloudflare, token is required
        if (!isCloudflare && body.email_provider && !body.email_provider_token) {
            return sendResponse(c, 400, null, 'email_provider_token is required when changing to a third-party provider');
        }

        // from_email and from_name are fixed for cloudflare — silently ignore any updates to them
        const updateBody: Record<string, any> = { ...body };
        if (isCloudflare) {
            delete updateBody.from_email;
            delete updateBody.from_name;
        }
        if (body.email_provider_token) {
            updateBody.email_provider_token = await encrypt(body.email_provider_token, c.env.ENCRYPTION_KEY);
        }

        const updateFields = Object.entries(updateBody)
            .filter(([_, value]) => value !== undefined)
            .map(([key]) => `${key} = ?`)
            .join(', ');

        const updateValues = Object.entries(updateBody)
            .filter(([_, value]) => value !== undefined)
            .map(([_, value]) => value);

        if (!updateFields) {
            return sendResponse(c, 400, null, 'No fields to update');
        }

        const { success } = await c.env.DB.prepare(`
            UPDATE companies SET ${updateFields} WHERE id = ?
        `).bind(...updateValues, id).run();

        if (!success) {
            return sendResponse(c, 500, null, 'Failed to update company');
        }

        const { results: updated } = await c.env.DB.prepare(`
            SELECT id, name, email_provider, from_email, from_name, created_at FROM companies WHERE id = ?
        `).bind(id).all();

        return sendResponse(c, 200, updated[0], 'Company updated successfully');
    } catch (error) {
        console.error(error);
        return sendResponse(c, 500, null, 'Internal server error');
    }
};
