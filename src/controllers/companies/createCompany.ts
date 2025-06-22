import { Context } from 'hono';
import { Env } from '../../types/env';
import { sendResponse } from '../../utils/sendResponse';
import { CreateCompanyBody } from '../../types/company';
import { encrypt } from '../../utils/encryption';

export const createCompany = async (c: Context<{ Bindings: Env }>) => {
    try {
        const body = await c.req.json() as CreateCompanyBody;
        const id = `company_${crypto.randomUUID()}`;
        
        // Validate required fields
        if (!body.name || !body.email_provider_token || !body.from_email || 
            !body.from_name || !body.admin_email || !body.email_provider) {
            return sendResponse(c, 400, null, 'Missing required fields');
        }

        // Encrypt the provider token
        const encryptedToken = await encrypt(body.email_provider_token, c.env.ENCRYPTION_KEY);

        const { success } = await c.env.DB.prepare(`
            INSERT INTO companies (
                id, name, email_provider_token, email_provider,
                from_email, from_name, admin_email
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
            id, body.name, encryptedToken, body.email_provider,
            body.from_email, body.from_name, body.admin_email
        ).run();

        if (!success) {
            console.log(success);
            return sendResponse(c, 500, null, 'Failed to create company');
        }

        // Return the created company without the encrypted token
        const response = {
            ...body,
            id,
            created_at: new Date().toISOString()
        };

        return sendResponse(c, 201, response, 'Company created successfully');
    } catch (error) {
        console.error(error);
        return sendResponse(c, 500, null, 'Internal server error');
    }
};