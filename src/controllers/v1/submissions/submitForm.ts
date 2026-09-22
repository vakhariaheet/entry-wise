import { Context } from 'hono';
import { Env } from '../../../types/env';
import { sendProblemDetails, sendResponse } from '../../../utils/sendResponse';
import { HONEYPOT_FIELDS, MAX_FILE_SIZE, VALID_FILE_TYPES } from '../../../types/submission';
import { decrypt } from '../../../utils/encryption';
import { renderFormSubmissionEmail } from '../../../emails/FormSubmissionEmail';
import { renderAutoResponderEmail } from '../../../emails/AutoResponderEmail';
import { EmailServiceFactory, EmailAttachment } from '../../../services/email';
import { verifyTurnstileToken } from '../../../utils/turnstile';
import { dispatchWebhook } from '../../../utils/webhook';
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
        const json = (await c.req.json()) as Record<string, any>;
        
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
                fields[key] = typeof value === 'string' ? value : JSON.stringify(value);
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
        const siteId = c.get('site_id');
        const companyId = c.get('company_id');
        const ipAddress = getConnInfo(c)?.remote?.address || 'unknown';

        if (!siteId || !companyId) {
            return sendProblemDetails(c, 403, 'Site or company context missing from authentication');
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

        // 1. Honeypot Anti-Spam Check: Silent drop if bot trapped
        if (honeypotTriggered) {
            if (redirectUrl) {
                return c.redirect(redirectUrl, 303);
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

        // 3. Dynamic Field Validation against database schema
        const { results: definedFields } = await c.env.DB.prepare(`
            SELECT name, type FROM fields WHERE site_id = ?
        `).bind(siteId).all<{ name: string; type: string }>();

        const invalidParams: Array<{ name: string; reason: string }> = [];
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneRegex = /^\+?[\d\s-()]+$/;
        let submitterEmail: string | undefined;
        let submitterName: string | undefined;

        for (const field of definedFields) {
            const value = fields[field.name];

            if (field.type === 'file') {
                // File fields are validated through attachments map
                continue;
            }

            if (!value) {
                invalidParams.push({ name: field.name, reason: `Missing required field: ${field.name}` });
                continue;
            }

            switch (field.type) {
                case 'email':
                    if (!emailRegex.test(value)) {
                        invalidParams.push({ name: field.name, reason: 'Invalid email address format' });
                    } else {
                        submitterEmail = value;
                    }
                    break;
                case 'phone':
                    if (!phoneRegex.test(value)) {
                        invalidParams.push({ name: field.name, reason: 'Invalid phone number format' });
                    }
                    break;
                case 'url':
                    try {
                        new URL(value);
                    } catch {
                        invalidParams.push({ name: field.name, reason: 'Invalid URL format' });
                    }
                    break;
            }

            if (field.name.toLowerCase().includes('name')) {
                submitterName = value;
            }
        }

        if (invalidParams.length > 0) {
            return sendProblemDetails(c, 422, 'Form submission validation failed', { invalidParams });
        }

        // 4. File Attachments Processing
        const fileFields = definedFields.filter(f => f.type === 'file');
        const fileFieldNames = fileFields.map(f => f.name);

        const emailAttachments: EmailAttachment[] = [];
        const savedAttachmentMeta: Array<{ filename: string; size: number; type: string; field: string }> = [];

        for (const [fieldName, file] of files.entries()) {
            if (!fileFieldNames.includes(fieldName) && fieldName !== 'attachments') {
                return sendProblemDetails(c, 422, `File field '${fieldName}' is not defined in the site schema`, {
                    invalidParams: [{ name: fieldName, reason: 'Field not defined in form schema' }],
                });
            }

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

        // 5. Database Persistence (Feature 1: Submission Persistence)
        const submissionId = `sub_${crypto.randomUUID()}`;
        const submissionDataJson = JSON.stringify(fields);
        const attachmentsJson = JSON.stringify(savedAttachmentMeta);

        await c.env.DB.prepare(`
            INSERT INTO submissions (id, site_id, data, attachments, status, ip_address)
            VALUES (?, ?, ?, ?, 'new', ?)
        `).bind(submissionId, siteId, submissionDataJson, attachmentsJson, ipAddress).run();

        // 6. Fetch Company for Email Service Config
        const { results: companies } = await c.env.DB.prepare(`
            SELECT name, email_provider, email_provider_token, from_email, from_name
            FROM companies WHERE id = ?
        `).bind(companyId).all<any>();

        if (!companies?.length) {
            return sendProblemDetails(c, 500, 'Company email configuration not found');
        }

        const company = companies[0];
        let providerToken: string | null = null;
        if (company.email_provider !== 'cloudflare' && company.email_provider_token) {
            providerToken = await decrypt(company.email_provider_token, c.env.ENCRYPTION_KEY);
        }

        const emailService = EmailServiceFactory.createEmailService({
            provider: company.email_provider,
            apiKey: providerToken ?? undefined,
            binding: company.email_provider === 'cloudflare' ? c.env.EMAIL : undefined,
        });

        // 7. Render & Dispatch Admin Notification Email
        const htmlEmail = renderFormSubmissionEmail({
            siteDomain: site.domain,
            formData: fields,
            companyName: company.name,
            timezone: site.timezone,
            attachments: emailAttachments.map(f => ({ filename: f.filename })),
        });

        try {
            await emailService.send({
                from: company.from_email,
                fromName: company.from_name,
                to: site.admin_email,
                subject: `New Form Submission - ${site.domain}`,
                html: htmlEmail,
                attachments: emailAttachments,
            });
        } catch (emailErr: any) {
            console.error('Admin email delivery failed:', emailErr.message || emailErr);
        }

        // 8. Auto-Responder Email (Feature 2: Confirmation Email to Submitter)
        if (site.auto_responder_enabled && submitterEmail) {
            const autoReplyHtml = renderAutoResponderEmail({
                siteDomain: site.domain,
                recipientName: submitterName,
                customBody: site.auto_responder_body,
                customSubject: site.auto_responder_subject,
            });

            const autoReplyPromise = emailService.send({
                from: company.from_email,
                fromName: company.from_name,
                to: submitterEmail,
                subject: site.auto_responder_subject || `We received your message - ${site.domain}`,
                html: autoReplyHtml,
            }).catch(err => console.error('Auto-responder delivery error:', err));

            if (c.executionCtx) {
                c.executionCtx.waitUntil(autoReplyPromise);
            }
        }

        // 9. Webhook Notification (Feature 3: Real-time Dispatch)
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

            if (c.executionCtx) {
                c.executionCtx.waitUntil(webhookPromise);
            }
        }

        // 10. Response handling
        // If client specified _redirect / _next, redirect with 303 See Other
        if (redirectUrl) {
            return c.redirect(redirectUrl, 303);
        }

        // If client requested HTML browser view, render thank-you page
        const acceptHeader = c.req.header('Accept') || '';
        if (acceptHeader.includes('text/html') && !acceptHeader.includes('application/json')) {
            return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Submission Received</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background-color: #f9fafb; }
        .card { background: white; padding: 48px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); text-align: center; max-width: 440px; margin: 20px; }
        .check { width: 56px; height: 56px; background: #ecfdf5; color: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 28px; }
        h1 { margin: 0 0 8px 0; color: #111827; font-size: 24px; }
        p { color: #6b7280; font-size: 15px; margin: 0; }
    </style>
</head>
<body>
    <div class="card">
        <div class="check">✓</div>
        <h1>Thank You!</h1>
        <p>Your submission has been received successfully.</p>
    </div>
</body>
</html>
            `.trim(), 200);
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
