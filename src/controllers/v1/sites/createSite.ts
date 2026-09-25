import { Context } from 'hono';
import { Env } from '../../../types/env';
import { sendCreated, sendProblemDetails } from '../../../utils/sendResponse';
import { CreateSiteBody, Site } from '../../../types/site';
import { generateApiKey } from '../../../utils/generateApiKey';

export const createSite = async (c: Context<{ Bindings: Env }>) => {
    try {
        const jwtPayload = c.get('jwtPayload') as any;
        const userId = jwtPayload?.user_id || null;

        const body = await c.req.json<CreateSiteBody & { company_id?: string; name?: string }>();
        let companyId = c.req.param('company_id') || body.company_id;

        if (!body.domain) {
            return sendProblemDetails(c, 422, 'Missing required field: domain', {
                invalidParams: [{ name: 'domain', reason: 'Domain is required' }],
            });
        }

        // Sanitize domain (strip protocol, www, and trailing slash/path)
        const cleanDomain = body.domain
            .toLowerCase()
            .trim()
            .replace(/^(https?:\/\/)?(www\.)?/, '')
            .replace(/\/.*$/, '');

        // Determine admin_email / notification fallback
        const userClaimEmail = jwtPayload?.claims?.email || jwtPayload?.claims?.primary_email_address || null;
        const firstNotificationEmail = body.notification_emails ? body.notification_emails.split(',')[0].trim() : null;
        const adminEmail = body.admin_email?.trim() || firstNotificationEmail || userClaimEmail || `admin@${cleanDomain}`;
        const formName = body.name?.trim() || cleanDomain;

        // If companyId is not provided, ensure a company exists for this user or use default
        if (!companyId) {
            if (userId) {
                const userCompany = await c.env.DB.prepare('SELECT id FROM companies WHERE user_id = ? LIMIT 1').bind(userId).first<{ id: string }>();
                if (userCompany?.id) {
                    companyId = userCompany.id;
                } else {
                    companyId = `comp_${crypto.randomUUID()}`;
                    await c.env.DB.prepare(`
                        INSERT INTO companies (id, name, email_provider, from_email, from_name, user_id)
                        VALUES (?, ?, 'cloudflare', 'no-reply@entrywise.webbound.in', 'EntryWise Forms', ?)
                    `).bind(companyId, 'My Workspace', userId).run();
                }
            } else {
                const defaultComp = await c.env.DB.prepare("SELECT id FROM companies WHERE id = 'comp_default'").first<{ id: string }>();
                companyId = defaultComp?.id || 'comp_default';
            }
        }

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
        const autoResponderConfig = body.auto_responder_config || null;
        const webhookUrl = body.webhook_url || null;
        const webhookSecret = body.webhook_secret || null;
        const turnstileSecretKey = body.turnstile_secret_key || null;
        const notificationEmails = body.notification_emails?.trim() || null;
        const notifyOnSubmission = body.notify_on_submission === undefined ? 1 : (body.notify_on_submission ? 1 : 0);
        const googleSheetsUrl = body.google_sheets_url?.trim() || null;
        const slackWebhookUrl = body.slack_webhook_url?.trim() || null;
        const discordWebhookUrl = body.discord_webhook_url?.trim() || null;
        const allowedOrigins = body.allowed_origins?.trim() || null;

        const { success } = await c.env.DB.prepare(`
            INSERT INTO sites (
                id, company_id, domain, name, api_key, admin_email, timezone,
                notification_emails, notify_on_submission,
                auto_responder_enabled, auto_responder_subject, auto_responder_body, auto_responder_config,
                webhook_url, webhook_secret, turnstile_secret_key,
                google_sheets_url, slack_webhook_url, discord_webhook_url,
                allowed_origins, user_id
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            id, companyId, cleanDomain, formName, apiKey, adminEmail, timezone,
            notificationEmails, notifyOnSubmission,
            autoResponderEnabled, autoResponderSubject, autoResponderBody, autoResponderConfig,
            webhookUrl, webhookSecret, turnstileSecretKey,
            googleSheetsUrl, slackWebhookUrl, discordWebhookUrl,
            allowedOrigins, userId
        ).run();

        if (!success) {
            return sendProblemDetails(c, 500, 'Failed to insert site into database');
        }

        const createdSite: Site = {
            id,
            company_id: companyId,
            domain: cleanDomain,
            name: formName,
            api_key: apiKey,
            admin_email: adminEmail,
            notification_emails: notificationEmails,
            notify_on_submission: notifyOnSubmission === 1,
            timezone,
            auto_responder_enabled: autoResponderEnabled === 1,
            auto_responder_subject: autoResponderSubject,
            auto_responder_body: autoResponderBody,
            auto_responder_config: autoResponderConfig,
            webhook_url: webhookUrl,
            webhook_secret: webhookSecret,
            turnstile_secret_key: turnstileSecretKey,
            google_sheets_url: googleSheetsUrl,
            slack_webhook_url: slackWebhookUrl,
            discord_webhook_url: discordWebhookUrl,
            allowed_origins: allowedOrigins,
            user_id: userId,
            created_at: new Date().toISOString(),
        };

        return sendCreated(c, createdSite, `/v1/sites/${id}`);
    } catch (error) {
        console.error('Create site error:', error);
        return sendProblemDetails(c, 500, 'Internal server error while creating site');
    }
};
