import { Context } from 'hono';
import { Env } from '../../../types/env';
import { sendCreated, sendProblemDetails } from '../../../utils/sendResponse';
import { CreateSiteBody, Site } from '../../../types/site';
import { generateApiKey } from '../../../utils/generateApiKey';

export const createSite = async (c: Context<{ Bindings: Env }>) => {
    try {
        const body = await c.req.json<CreateSiteBody & { company_id?: string }>();
        const companyId = c.req.param('company_id') || body.company_id;

        if (!companyId) {
            return sendProblemDetails(c, 422, 'company_id is required', {
                invalidParams: [{ name: 'company_id', reason: 'Field is required' }],
            });
        }

        if (!body.domain || !body.admin_email) {
            const invalidParams = [];
            if (!body.domain) invalidParams.push({ name: 'domain', reason: 'Domain is required' });
            if (!body.admin_email) invalidParams.push({ name: 'admin_email', reason: 'Admin recipient email is required' });
            return sendProblemDetails(c, 422, 'Missing required fields for site creation', { invalidParams });
        }

        // Verify company exists
        const { results: companyExists } = await c.env.DB.prepare(`
            SELECT id FROM companies WHERE id = ?
        `).bind(companyId).all();

        if (!companyExists?.length) {
            return sendProblemDetails(c, 404, `Company with ID '${companyId}' not found`);
        }

        // Sanitize domain (strip protocol, www, and trailing slash/path)
        const cleanDomain = body.domain
            .toLowerCase()
            .trim()
            .replace(/^(https?:\/\/)?(www\.)?/, '')
            .replace(/\/.*$/, '');
        const { results: domainExists } = await c.env.DB.prepare(`
            SELECT id FROM sites WHERE domain = ?
        `).bind(cleanDomain).all();

        if (domainExists?.length) {
            return sendProblemDetails(c, 409, `A site with domain '${cleanDomain}' already exists`);
        }

        const id = `site_${crypto.randomUUID()}`;
        const apiKey = await generateApiKey();
        const timezone = body.timezone || 'UTC';
        const autoResponderEnabled = body.auto_responder_enabled ? 1 : 0;
        const autoResponderSubject = body.auto_responder_subject || null;
        const autoResponderBody = body.auto_responder_body || null;
        const webhookUrl = body.webhook_url || null;
        const webhookSecret = body.webhook_secret || null;
        const turnstileSecretKey = body.turnstile_secret_key || null;

        const { success } = await c.env.DB.prepare(`
            INSERT INTO sites (
                id, company_id, domain, api_key, admin_email, timezone,
                auto_responder_enabled, auto_responder_subject, auto_responder_body,
                webhook_url, webhook_secret, turnstile_secret_key
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            id, companyId, cleanDomain, apiKey, body.admin_email, timezone,
            autoResponderEnabled, autoResponderSubject, autoResponderBody,
            webhookUrl, webhookSecret, turnstileSecretKey
        ).run();

        if (!success) {
            return sendProblemDetails(c, 500, 'Failed to insert site into database');
        }

        const createdSite: Site = {
            id,
            company_id: companyId,
            domain: cleanDomain,
            api_key: apiKey,
            admin_email: body.admin_email,
            timezone,
            auto_responder_enabled: autoResponderEnabled === 1,
            auto_responder_subject: autoResponderSubject,
            auto_responder_body: autoResponderBody,
            webhook_url: webhookUrl,
            webhook_secret: webhookSecret,
            turnstile_secret_key: turnstileSecretKey,
            created_at: new Date().toISOString(),
        };

        return sendCreated(c, createdSite, `/v1/sites/${id}`);
    } catch (error) {
        console.error('Create site error:', error);
        return sendProblemDetails(c, 500, 'Internal server error while creating site');
    }
};
