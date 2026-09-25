import { Context } from 'hono';
import { Env } from '../../../types/env';
import { sendProblemDetails } from '../../../utils/sendResponse';
import { HONEYPOT_FIELDS, MAX_FILE_SIZE, VALID_FILE_TYPES } from '../../../types/submission';
import { decrypt } from '../../../utils/encryption';
import { renderFormSubmissionEmail } from '../../../emails/FormSubmissionEmail';
import { renderAutoResponderEmail } from '../../../emails/AutoResponderEmail';
import { renderConfirmationPage } from '../../../templates/ConfirmationPage';
import { EmailServiceFactory, EmailAttachment } from '../../../services/email';
import { verifyTurnstileToken } from '../../../utils/turnstile';
import { dispatchWebhook } from '../../../utils/webhook';
import { dispatchSlackNotification } from '../../../services/connectors/slack';
import { dispatchDiscordNotification } from '../../../services/connectors/discord';
import { dispatchGoogleSheets } from '../../../services/connectors/googleSheets';
import { validateRedirectUrl } from '../../../utils/redirectGuard';
import { getConnInfo } from 'hono/cloudflare-workers';

interface ParsedSubmissionPayload {
    fields: Record<string, string>;
    files: Map<string, File>;
    honeypotTriggered: boolean;
    turnstileToken?: string;
    redirectUrl?: string;
}

/**
 * Universal multi-format parser: supports JSON, multipart/form-data, and urlencoded
 */
async function parseSubmissionRequest(c: Context<{ Bindings: Env }>): Promise<ParsedSubmissionPayload> {
    const contentType = c.req.header('Content-Type') || '';
    const fields: Record<string, string> = {};
    const files = new Map<string, File>();
    let honeypotTriggered = false;
    let turnstileToken = c.req.header('cf-turnstile-response');
    let redirectUrl: string | undefined;

    if (contentType.includes('application/json')) {
        const json = (await c.req.json().catch(() => ({}))) as Record<string, any>;

        // Check for honeypot
        for (const hp of HONEYPOT_FIELDS) {
            if (json[hp]) honeypotTriggered = true;
        }

        turnstileToken = turnstileToken || json['cf-turnstile-response'];
        redirectUrl = json['_redirect'] || json['_next'];

        // Extract fields
        const sourceFields = json.fields && typeof json.fields === 'object' ? json.fields : json;
        for (const [key, value] of Object.entries(sourceFields)) {
            if (!HONEYPOT_FIELDS.includes(key) && !key.startsWith('_') && key !== 'cf-turnstile-response' && key !== 'api_key') {
                fields[key] = typeof value === 'string' ? value : (value !== null && value !== undefined ? JSON.stringify(value) : '');
            }
        }
    } else {
        // multipart/form-data or application/x-www-form-urlencoded
        const formData = await c.req.formData();

        // Check for legacy metadata payload
        const metadataRaw = formData.get('metadata');
        if (metadataRaw && typeof metadataRaw === 'string') {
            try {
                const parsed = JSON.parse(metadataRaw);
                for (const hp of HONEYPOT_FIELDS) {
                    if (parsed[hp]) honeypotTriggered = true;
                }
                if (parsed.fields && typeof parsed.fields === 'object') {
                    for (const [k, v] of Object.entries(parsed.fields)) {
                        fields[k] = String(v);
                    }
                }
            } catch {
                // Ignore parse errors, proceed to read standard form data
            }
        }

        for (const [key, value] of formData.entries()) {
            if (HONEYPOT_FIELDS.includes(key)) {
                if (value) honeypotTriggered = true;
            } else if (key === 'cf-turnstile-response') {
                turnstileToken = String(value);
            } else if (key === '_redirect' || key === '_next') {
                redirectUrl = String(value);
            } else if (key === 'metadata' || key === 'api_key') {
                // skip internal fields
            } else if (value instanceof File) {
                if (value.size > 0 && value.name) {
                    files.set(key, value);
                }
            } else {
                fields[key] = String(value);
            }
        }
    }

    return { fields, files, honeypotTriggered, turnstileToken, redirectUrl };
}

export const submitForm = async (c: Context<{ Bindings: Env }>) => {
    try {
        let siteId = c.get('site_id');
        let companyId = c.get('company_id');
        const ipAddress = getConnInfo(c)?.remote?.address || 'unknown';

        // Fallback: If not passed by middleware, look up directly via param or header
        if (!siteId) {
            const apiKey = c.req.param('key') || c.req.header('X-API-Key') || c.req.query('api_key');
            if (apiKey) {
                const foundSite = await c.env.DB.prepare('SELECT id, company_id FROM sites WHERE api_key = ?').bind(apiKey).first<{ id: string; company_id: string }>();
                if (foundSite) {
                    siteId = foundSite.id;
                    companyId = foundSite.company_id;
                }
            }
        }

        if (!siteId || !companyId) {
            return sendProblemDetails(c, 403, 'Site configuration not found or invalid API key');
        }

        const { fields, files, honeypotTriggered, turnstileToken, redirectUrl } = await parseSubmissionRequest(c);

        // Fetch site configuration
        const { results: sites } = await c.env.DB.prepare(`
            SELECT * FROM sites WHERE id = ?
        `).bind(siteId).all<any>();

        if (!sites?.length) {
            return sendProblemDetails(c, 404, 'Site configuration not found');
        }

        const site = sites[0];
        const validRedirectUrl = validateRedirectUrl(redirectUrl, site.domain, site.allowed_origins);

        // 1. Honeypot Anti-Spam Check: Silent drop if bot trapped
        if (honeypotTriggered) {
            if (validRedirectUrl) {
                return c.redirect(validRedirectUrl, 303);
            }
            const acceptHeader = c.req.header('Accept') || '';
            if (acceptHeader.includes('text/html') && !acceptHeader.includes('application/json')) {
                return c.html(renderConfirmationPage({
                    companyName: site.name || site.domain,
                    siteDomain: site.domain,
                }), 200);
            }
            return c.json({ is_success: true, message: 'Submission received successfully' }, 200);
        }

        // 2. Cloudflare Turnstile Bot Verification (if enabled on site)
        if (site.turnstile_secret_key) {
            if (!turnstileToken) {
                return sendProblemDetails(c, 422, 'Cloudflare Turnstile token required (cf-turnstile-response)', {
                    invalidParams: [{ name: 'cf-turnstile-response', reason: 'Verification token is required' }],
                });
            }

            const verification = await verifyTurnstileToken(turnstileToken, site.turnstile_secret_key, ipAddress);
            if (!verification.success) {
                return sendProblemDetails(c, 422, 'Turnstile bot challenge failed', {
                    invalidParams: [{ name: 'cf-turnstile-response', reason: verification.error || 'Failed bot challenge' }],
                });
            }
        }

        // 3. Dynamic Field Identification (Schema-Less with Intelligent Auto-Detection)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        let submitterEmail: string | undefined;
        let submitterName: string | undefined;

        // Auto-detect submitter email
        for (const [key, val] of Object.entries(fields)) {
            const lowerKey = key.toLowerCase();
            if (lowerKey === 'email' || lowerKey === 'e-mail' || lowerKey.includes('email') || lowerKey.includes('e_mail')) {
                if (emailRegex.test(val.trim())) {
                    submitterEmail = val.trim();
                    break;
                }
            }
        }
        if (!submitterEmail) {
            for (const val of Object.values(fields)) {
                if (typeof val === 'string' && emailRegex.test(val.trim())) {
                    submitterEmail = val.trim();
                    break;
                }
            }
        }

        // Auto-detect submitter name
        for (const [key, val] of Object.entries(fields)) {
            const lowerKey = key.toLowerCase();
            if (
                lowerKey === 'name' ||
                lowerKey === 'fullname' ||
                lowerKey === 'full_name' ||
                lowerKey === 'first_name' ||
                lowerKey === 'firstname'
            ) {
                submitterName = val.trim();
                break;
            }
        }

        // Optional schema field check if user defined explicit fields
        const { results: definedFields } = await c.env.DB.prepare(`
            SELECT name, type FROM fields WHERE site_id = ?
        `).bind(siteId).all<{ name: string; type: string }>();

        if (definedFields && definedFields.length > 0) {
            const invalidParams: Array<{ name: string; reason: string }> = [];
            for (const field of definedFields) {
                const value = fields[field.name];
                if (value && field.type === 'email' && !emailRegex.test(value)) {
                    invalidParams.push({ name: field.name, reason: 'Invalid email address format' });
                }
            }
            if (invalidParams.length > 0) {
                return sendProblemDetails(c, 422, 'Form submission validation failed', { invalidParams });
            }
        }

        // 4. File Attachments Processing
        const emailAttachments: EmailAttachment[] = [];
        const savedAttachmentMeta: Array<{ filename: string; size: number; type: string; field: string }> = [];

        for (const [fieldName, file] of files.entries()) {
            if (file.size > MAX_FILE_SIZE) {
                return sendProblemDetails(c, 422, `File '${file.name}' exceeds the maximum allowed size of 5MB`, {
                    invalidParams: [{ name: fieldName, reason: `File size exceeds 5MB limit (${file.size} bytes)` }],
                });
            }

            if (file.type && !VALID_FILE_TYPES.includes(file.type)) {
                return sendProblemDetails(c, 422, `Invalid file type '${file.type}' for file '${file.name}'`, {
                    invalidParams: [{ name: fieldName, reason: `MIME type '${file.type}' is not supported` }],
                });
            }

            const arrayBuffer = await file.arrayBuffer();
            const base64Content = Buffer.from(arrayBuffer).toString('base64');

            emailAttachments.push({
                filename: file.name,
                content: base64Content,
                type: file.type || 'application/octet-stream',
            });

            savedAttachmentMeta.push({
                filename: file.name,
                size: file.size,
                type: file.type || 'application/octet-stream',
                field: fieldName,
            });
        }

        // 5. Database Persistence (Store Submission in D1)
        const submissionId = `sub_${crypto.randomUUID()}`;
        const submissionDataJson = JSON.stringify(fields);
        const attachmentsJson = JSON.stringify(savedAttachmentMeta);

        await c.env.DB.prepare(`
            INSERT INTO submissions (id, site_id, data, attachments, status, ip_address)
            VALUES (?, ?, ?, ?, 'new', ?)
        `).bind(submissionId, siteId, submissionDataJson, attachmentsJson, ipAddress).run();

        // 6. Fetch Company Configuration for Email Service
        const { results: companies } = await c.env.DB.prepare(`
            SELECT name, email_provider, email_provider_token, from_email, from_name
            FROM companies WHERE id = ?
        `).bind(companyId).all<any>();

        const company = companies?.[0] || {
            name: 'EntryWise',
            email_provider: 'cloudflare',
            from_email: 'no-reply@entrywise.webbound.in',
            from_name: 'EntryWise Forms',
        };

        let providerToken: string | null = null;
        if (company.email_provider !== 'cloudflare' && company.email_provider_token) {
            providerToken = await decrypt(company.email_provider_token, c.env.ENCRYPTION_KEY);
        }

        const emailService = EmailServiceFactory.createEmailService({
            provider: company.email_provider,
            apiKey: providerToken ?? undefined,
            binding: company.email_provider === 'cloudflare' ? c.env.EMAIL : undefined,
        });

        // 7. Background Async Tasks (Dispatched via c.executionCtx.waitUntil for ultra-low latency)
        const backgroundTasks: Promise<any>[] = [];

        // 7a. Admin Notification Email
        const shouldNotifyAdmins = site.notify_on_submission === undefined || site.notify_on_submission === 1 || site.notify_on_submission === true;
        if (shouldNotifyAdmins) {
            // Determine recipient emails
            const recipientList: string[] = [];
            if (site.notification_emails) {
                const parsed = site.notification_emails.split(/[,;\n]/).map((e: string) => e.trim()).filter((e: string) => emailRegex.test(e));
                recipientList.push(...parsed);
            }
            if (recipientList.length === 0 && site.admin_email && emailRegex.test(site.admin_email.trim())) {
                recipientList.push(site.admin_email.trim());
            }

            if (recipientList.length > 0) {
                const htmlEmail = renderFormSubmissionEmail({
                    siteDomain: site.domain,
                    formData: fields,
                    companyName: site.name || company.name || site.domain,
                    timezone: site.timezone,
                    submissionId,
                    attachments: emailAttachments.map(f => ({ filename: f.filename })),
                });

                for (const recipient of recipientList) {
                    const sendPromise = emailService.send({
                        from: company.from_email || 'no-reply@entrywise.webbound.in',
                        fromName: site.name || company.from_name || 'EntryWise',
                        to: recipient,
                        subject: `New Form Submission: ${site.name || site.domain}`,
                        html: htmlEmail,
                        replyTo: submitterEmail,
                        attachments: emailAttachments,
                    }).catch(err => console.error(`Admin notification email to ${recipient} failed:`, err));

                    backgroundTasks.push(sendPromise);
                }
            }
        }

        // 7b. Submitter Auto-Responder Email
        if (site.auto_responder_enabled && submitterEmail) {
            const companyDisplayName = site.name || company.name || company.from_name || site.domain;
            let interpolatedSubject = site.auto_responder_subject || `Thank you for reaching out — ${companyDisplayName}`;
            let interpolatedBody = site.auto_responder_body || '';

            const templateVars: Record<string, string> = {
                ...fields,
                name: submitterName || '',
                email: submitterEmail,
                company: companyDisplayName,
                company_name: companyDisplayName,
                domain: site.domain,
                site_domain: site.domain,
                submission_id: submissionId,
            };

            for (const [k, val] of Object.entries(templateVars)) {
                const regex = new RegExp(`{{\\s*${k}\\s*}}`, 'gi');
                interpolatedSubject = interpolatedSubject.replace(regex, val);
                if (interpolatedBody) {
                    interpolatedBody = interpolatedBody.replace(regex, val);
                }
            }

            const autoReplyHtml = renderAutoResponderEmail({
                siteDomain: site.domain,
                companyName: companyDisplayName,
                recipientName: submitterName,
                customBody: interpolatedBody || null,
                customSubject: interpolatedSubject,
                submissionId,
                timezone: site.timezone,
            });

            const autoReplyPromise = emailService.send({
                from: company.from_email || 'no-reply@entrywise.webbound.in',
                fromName: site.name || company.from_name || 'EntryWise',
                to: submitterEmail,
                subject: interpolatedSubject,
                html: autoReplyHtml,
                replyTo: recipientListFirst(site),
            }).catch(err => console.error('Auto-responder delivery failed:', err));

            backgroundTasks.push(autoReplyPromise);
        }

        // 7c. Webhook Notification
        if (site.webhook_url) {
            const webhookPromise = dispatchWebhook(
                site.webhook_url,
                {
                    event: 'submission.created',
                    timestamp: new Date().toISOString(),
                    site_id: site.id,
                    domain: site.domain,
                    submission_id: submissionId,
                    data: fields,
                    attachments: savedAttachmentMeta,
                },
                site.webhook_secret
            ).catch(err => console.error('Webhook notification error:', err));

            backgroundTasks.push(webhookPromise);
        }

        // 7d. Slack Connector
        if (site.slack_webhook_url) {
            const slackPromise = dispatchSlackNotification(site.slack_webhook_url, {
                siteDomain: site.name ? `${site.name} (${site.domain})` : site.domain,
                submissionId,
                formData: fields,
                submittedAt: new Date().toISOString(),
            }).catch(err => console.error('Slack connector dispatch error:', err));

            backgroundTasks.push(slackPromise);
        }

        // 7e. Discord Connector
        if (site.discord_webhook_url) {
            const discordPromise = dispatchDiscordNotification(site.discord_webhook_url, {
                siteDomain: site.name ? `${site.name} (${site.domain})` : site.domain,
                submissionId,
                formData: fields,
                submittedAt: new Date().toISOString(),
            }).catch(err => console.error('Discord connector dispatch error:', err));

            backgroundTasks.push(discordPromise);
        }

        // 7f. Google Sheets Connector
        if (site.google_sheets_url) {
            const sheetsPromise = dispatchGoogleSheets(site.google_sheets_url, {
                siteDomain: site.domain,
                submissionId,
                formData: fields,
                submittedAt: new Date().toISOString(),
            }).catch(err => console.error('Google Sheets dispatch error:', err));

            backgroundTasks.push(sheetsPromise);
        }

        // Pass all background tasks to Cloudflare execution context
        if (c.executionCtx && backgroundTasks.length > 0) {
            c.executionCtx.waitUntil(Promise.allSettled(backgroundTasks));
        }

        // 8. Response Handling
        // If client specified safe _redirect / _next, redirect with 303 See Other
        if (validRedirectUrl) {
            return c.redirect(validRedirectUrl, 303);
        }

        // If client requested HTML browser view, render confirmation page
        const acceptHeader = c.req.header('Accept') || '';
        if (acceptHeader.includes('text/html') && !acceptHeader.includes('application/json')) {
            let submittedAtFormatted = new Date().toUTCString();
            try {
                submittedAtFormatted = new Intl.DateTimeFormat('en-US', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                    timeZone: site.timezone || 'UTC',
                }).format(new Date());
            } catch {
                submittedAtFormatted = new Date().toUTCString();
            }

            const referer = c.req.header('Referer');
            const returnUrl = referer && !referer.includes(c.req.url) ? referer : undefined;

            return c.html(renderConfirmationPage({
                companyName: site.name || company.name || site.domain,
                siteDomain: site.domain,
                submissionId,
                submittedAt: submittedAtFormatted,
                returnUrl,
            }), 200);
        }

        // Default: Standard Zalando-compliant JSON response
        return c.json({
            is_success: true,
            submission_id: submissionId,
            message: 'Submission received successfully',
        }, 200);
    } catch (error) {
        console.error('Submission handling error:', error);
        return sendProblemDetails(c, 500, 'Internal server error while processing submission');
    }
};

function recipientListFirst(site: any): string | undefined {
    if (site.notification_emails) {
        const first = site.notification_emails.split(/[,;\n]/)[0]?.trim();
        if (first && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(first)) return first;
    }
    return site.admin_email || undefined;
}
