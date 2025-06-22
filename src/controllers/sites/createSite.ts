import { Context } from 'hono';
import { Env } from '../../types/env';
import { sendResponse } from '../../utils/sendResponse';
import { CreateSiteBody, Site } from '../../types/site';
import { generateApiKey } from '../../utils/generateApiKey';

export const createSite = async (c: Context<{ Bindings: Env }>) => {
    try {
        const companyId = c.req.param('company_id');
        const body = await c.req.json<CreateSiteBody>() ;
        const id = `site_${crypto.randomUUID()}`;
        // Validate required fields
        if (!companyId || !body.domain) {
            return sendResponse(c, 400, null, 'Missing required fields');
        }

        // Check if company exists
        const { results: companyExists } = await c.env.DB.prepare(`
            SELECT id FROM companies WHERE id = ?
        `).bind(companyId).all();

        if (!companyExists?.length) {
            return sendResponse(c, 404, null, 'Company not found');
        }

        // Check if domain already exists
        const { results: domainExists } = await c.env.DB.prepare(`
            SELECT id FROM sites WHERE domain = ?
        `).bind(body.domain).all();

        if (domainExists?.length) {
            return sendResponse(c, 400, null, 'Domain already exists');
        }

        // Generate API key
        const api_key = await generateApiKey();

        const { success, results } = await c.env.DB.prepare(`
            INSERT INTO sites (id, company_id, domain, api_key)
            VALUES (?, ?, ?, ?)
            RETURNING *
        `).bind(id, companyId, body.domain, api_key)
        .run<Site>();

        if (!success || !results?.length) {
            return sendResponse(c, 500, null, 'Failed to create site');
        }

        return sendResponse(c, 201, results[0], 'Site created successfully');
    } catch (error) {
        console.error('Error creating site:', error);
        return sendResponse(c, 500, null, 'Internal server error');
    }
}; 