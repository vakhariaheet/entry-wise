import { Context } from 'hono';
import { Env } from '../../types/env';
import { sendResponse } from '../../utils/sendResponse';
import { Company } from '../../types/company';
import { decrypt } from '../../utils/encryption';

export const getCompany = async (c: Context<{ Bindings: Env }>) => {
    try {
        const id = c.req.param('id');
        
        if (!id) {
            return sendResponse(c, 400, null, 'Company ID is required');
        }

        const { results } = await c.env.DB.prepare(`
            SELECT * FROM companies WHERE id = ?
        `).bind(id).all<Company>();

        if (!results?.length) {
            return sendResponse(c, 404, null, 'Company not found');
        }

        return sendResponse(c, 200, {
            ...results[ 0 ],
            email_provider_token: results[ 0 ].email_provider_token ? await decrypt(results[ 0 ].email_provider_token, c.env.ENCRYPTION_KEY) : null
        }, 'Company fetched successfully');
    } catch (error) {
        console.error('Error fetching company:', error);
        return sendResponse(c, 500, null, 'Internal server error');
    }
}; 