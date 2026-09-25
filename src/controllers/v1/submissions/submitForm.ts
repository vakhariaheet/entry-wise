import type { Context } from 'hono';
import { getConnInfo } from 'hono/cloudflare-workers';
import { processSubmissionDelivery } from '../../../queue/submissionProcessor';
import type { EmailAttachment } from '../../../services/email';
import { renderConfirmationPage } from '../../../templates/ConfirmationPage';
import type { Env } from '../../../types/env';
import type { SubmissionQueueMessage } from '../../../types/queue';
import { HONEYPOT_FIELDS, MAX_FILE_SIZE, VALID_FILE_TYPES } from '../../../types/submission';
import { validateRedirectUrl } from '../../../utils/redirectGuard';
import { sendProblemDetails } from '../../../utils/sendResponse';
import { verifyTurnstileToken } from '../../../utils/turnstile';

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
async function parseSubmissionRequest(
  c: Context<{ Bindings: Env }>
): Promise<ParsedSubmissionPayload> {
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
      if (
        !HONEYPOT_FIELDS.includes(key) &&
        !key.startsWith('_') &&
        key !== 'cf-turnstile-response' &&
        key !== 'api_key'
      ) {
        fields[key] =
          typeof value === 'string'
            ? value
            : value !== null && value !== undefined
              ? JSON.stringify(value)
              : '';
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
        const foundSite = await c.env.DB.prepare(
          'SELECT id, company_id FROM sites WHERE api_key = ?'
        )
          .bind(apiKey)
          .first<{ id: string; company_id: string }>();
        if (foundSite) {
          siteId = foundSite.id;
          companyId = foundSite.company_id;
        }
      }
    }

    if (!siteId || !companyId) {
      return sendProblemDetails(c, 403, 'Site configuration not found or invalid API key');
    }

    const { fields, files, honeypotTriggered, turnstileToken, redirectUrl } =
      await parseSubmissionRequest(c);

    // Fetch site configuration
    const { results: sites } = await c.env.DB.prepare(`
            SELECT * FROM sites WHERE id = ?
        `)
      .bind(siteId)
      .all<any>();

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
        return c.html(
          renderConfirmationPage({
            companyName: site.name || site.domain,
            siteDomain: site.domain,
          }),
          200
        );
      }
      return c.json({ is_success: true, message: 'Submission received successfully' }, 200);
    }

    // 2. Cloudflare Turnstile Bot Verification (if enabled on site)
    if (site.turnstile_secret_key) {
      if (!turnstileToken) {
        return sendProblemDetails(
          c,
          422,
          'Cloudflare Turnstile token required (cf-turnstile-response)',
          {
            invalidParams: [
              { name: 'cf-turnstile-response', reason: 'Verification token is required' },
            ],
          }
        );
      }

      const verification = await verifyTurnstileToken(
        turnstileToken,
        site.turnstile_secret_key,
        ipAddress
      );
      if (!verification.success) {
        return sendProblemDetails(c, 422, 'Turnstile bot challenge failed', {
          invalidParams: [
            { name: 'cf-turnstile-response', reason: verification.error || 'Failed bot challenge' },
          ],
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
      if (
        lowerKey === 'email' ||
        lowerKey === 'e-mail' ||
        lowerKey.includes('email') ||
        lowerKey.includes('e_mail')
      ) {
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
        `)
      .bind(siteId)
      .all<{ name: string; type: string }>();

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
    const savedAttachmentMeta: Array<{
      filename: string;
      size: number;
      type: string;
      field: string;
    }> = [];

    for (const [fieldName, file] of files.entries()) {
      if (file.size > MAX_FILE_SIZE) {
        return sendProblemDetails(
          c,
          422,
          `File '${file.name}' exceeds the maximum allowed size of 5MB`,
          {
            invalidParams: [
              { name: fieldName, reason: `File size exceeds 5MB limit (${file.size} bytes)` },
            ],
          }
        );
      }

      if (file.type && !VALID_FILE_TYPES.includes(file.type)) {
        return sendProblemDetails(
          c,
          422,
          `Invalid file type '${file.type}' for file '${file.name}'`,
          {
            invalidParams: [
              { name: fieldName, reason: `MIME type '${file.type}' is not supported` },
            ],
          }
        );
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
        `)
      .bind(submissionId, siteId, submissionDataJson, attachmentsJson, ipAddress)
      .run();

    // 6. Async Delivery: Cloudflare Queue (Primary) or waitUntil fallback (Self-Hosted / Dev)
    const queuePayload: SubmissionQueueMessage = {
      type: 'submission.process',
      submissionId,
      siteId: site.id,
      companyId,
      fields,
      savedAttachmentMeta,
      submitterEmail: submitterEmail || null,
      submitterName: submitterName || null,
      ipAddress,
      submittedAt: new Date().toISOString(),
    };

    if (c.env.SUBMISSIONS_QUEUE) {
      try {
        await c.env.SUBMISSIONS_QUEUE.send(queuePayload);
      } catch (queueErr) {
        console.error(
          '[SubmitForm] Failed to enqueue submission message, falling back to waitUntil:',
          queueErr
        );
        if (c.executionCtx) {
          c.executionCtx.waitUntil(processSubmissionDelivery(queuePayload, c.env));
        } else {
          processSubmissionDelivery(queuePayload, c.env).catch(console.error);
        }
      }
    } else {
      // Self-hosted / Free plan / Local dev fallback
      if (c.executionCtx) {
        c.executionCtx.waitUntil(processSubmissionDelivery(queuePayload, c.env));
      } else {
        processSubmissionDelivery(queuePayload, c.env).catch(console.error);
      }
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

      return c.html(
        renderConfirmationPage({
          companyName: site.name || site.domain,
          siteDomain: site.domain,
          submissionId,
          submittedAt: submittedAtFormatted,
          returnUrl,
        }),
        200
      );
    }

    // Default: Standard Zalando-compliant JSON response
    return c.json(
      {
        is_success: true,
        submission_id: submissionId,
        message: 'Submission received successfully',
      },
      200
    );
  } catch (error) {
    console.error('Submission handling error:', error);
    return sendProblemDetails(c, 500, 'Internal server error while processing submission');
  }
};
