import { Context } from 'hono';
import { Env } from '../../../types/env';
import { sendOk, sendProblemDetails } from '../../../utils/sendResponse';
import { UpdateCompanyBody } from '../../../types/company';
import { encrypt } from '../../../utils/encryption';

export const patchCompany = async (c: Context<{ Bindings: Env }>) => {
    try {
        const id = c.req.param('id');
        if (!id) {
            return sendProblemDetails(c, 400, 'Company ID path parameter is required');
        }

        const body = (await c.req.json()) as UpdateCompanyBody;

        // Check if company exists
        const { results } = await c.env.DB.prepare(`
            SELECT id, email_provider FROM companies WHERE id = ?
        `).bind(id).all<{ id: string; email_provider: string }>();

        if (!results?.length) {
            return sendProblemDetails(c, 404, `Company with ID '${id}' not found`);
        }

        const currentProvider = results[0].email_provider;
        const newProvider = body.email_provider ?? currentProvider;
        const isCloudflare = newProvider === 'cloudflare';

        // If changing to a third-party provider, token is required
        if (!isCloudflare && body.email_provider && !body.email_provider_token) {
            return sendProblemDetails(c, 422, 'email_provider_token is required when changing to a third-party provider', {
                invalidParams: [{ name: 'email_provider_token', reason: 'Token required for third-party provider' }],
            });
        }

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
            return sendProblemDetails(c, 400, 'At least one field must be provided to patch');
        }

        const { success } = await c.env.DB.prepare(`
            UPDATE companies SET ${updateFields} WHERE id = ?
        `).bind(...updateValues, id).run();

        if (!success) {
            return sendProblemDetails(c, 500, 'Failed to update company record');
        }

        const { results: updated } = await c.env.DB.prepare(`
            SELECT id, name, email_provider, from_email, from_name, created_at FROM companies WHERE id = ?
        `).bind(id).all();

        return sendOk(c, updated[0]);
    } catch (error) {
        console.error('Patch company error:', error);
        return sendProblemDetails(c, 500, 'Internal server error while patching company');
    }
};
