import type { Context } from 'hono';
import { assertSiteOwnership } from '../../../middleware/authorize';
import type { Env } from '../../../types/env';
import type { Site, UpdateSiteBody } from '../../../types/site';
import { sendOk, sendProblemDetails } from '../../../utils/sendResponse';

const ALLOWED_SITE_COLUMNS = new Set([
  'name',
  'domain',
  'allowed_origins',
  'turnstile_secret_key',
  'admin_email',
  'timezone',
  'notify_on_submission',
  'auto_responder_enabled',
  'auto_responder_subject',
  'auto_responder_body',
  'auto_responder_config',
  'google_sheets_url',
  'slack_webhook_url',
  'discord_webhook_url',
  'webhook_url',
  'webhook_secret',
  'notification_emails',
  'block_disposable_emails',
  'spam_keywords',
  'data_retention_days',
  'anonymize_ip',
]);

export const patchSite = async (c: Context<{ Bindings: Env }>) => {
  try {
    const id = c.req.param('site_id') || c.req.param('id');
    if (!id) {
      return sendProblemDetails(c, 400, 'Site ID path parameter is required');
    }

    const authorized = await assertSiteOwnership(c, id);
    if (!authorized) {
      return sendProblemDetails(
        c,
        403,
        'Access denied: You do not have permission to modify this site'
      );
    }

    const body = (await c.req.json()) as UpdateSiteBody;

    // Check if site exists
    const { results: existingSites } = await c.env.DB.prepare(`
            SELECT * FROM sites WHERE id = ?
        `)
      .bind(id)
      .all<any>();

    if (!existingSites?.length) {
      return sendProblemDetails(c, 404, `Site with ID '${id}' not found`);
    }

    // If domain is being updated, check uniqueness
    if (body.domain) {
      const cleanDomain = body.domain
        .toLowerCase()
        .trim()
        .replace(/^(https?:\/\/)?(www\.)?/, '')
        .replace(/\/.*$/, '');
      const { results: domainExists } = await c.env.DB.prepare(`
                SELECT id FROM sites WHERE domain = ? AND id != ?
            `)
        .bind(cleanDomain, id)
        .all();

      if (domainExists?.length) {
        return sendProblemDetails(c, 409, `A site with domain '${cleanDomain}' already exists`);
      }
      body.domain = cleanDomain;
    }

    const updateBody: Record<string, any> = { ...body };
    if (typeof updateBody.auto_responder_enabled === 'boolean') {
      updateBody.auto_responder_enabled = updateBody.auto_responder_enabled ? 1 : 0;
    }
    if (typeof updateBody.notify_on_submission === 'boolean') {
      updateBody.notify_on_submission = updateBody.notify_on_submission ? 1 : 0;
    }
    if (typeof updateBody.block_disposable_emails === 'boolean') {
      updateBody.block_disposable_emails = updateBody.block_disposable_emails ? 1 : 0;
    }
    if (typeof updateBody.anonymize_ip === 'boolean') {
      updateBody.anonymize_ip = updateBody.anonymize_ip ? 1 : 0;
    }

    const updateEntries = Object.entries(updateBody).filter(
      ([key, value]) => ALLOWED_SITE_COLUMNS.has(key) && value !== undefined
    );

    const updateFields = updateEntries.map(([key]) => `${key} = ?`).join(', ');
    const updateValues = updateEntries.map(([_, value]) => value);

    if (!updateFields) {
      return sendProblemDetails(c, 400, 'At least one field must be provided to patch');
    }

    const { success } = await c.env.DB.prepare(`
            UPDATE sites SET ${updateFields} WHERE id = ?
        `)
      .bind(...updateValues, id)
      .run();

    if (!success) {
      return sendProblemDetails(c, 500, 'Failed to update site in database');
    }

    const { results: updated } = await c.env.DB.prepare(`
            SELECT * FROM sites WHERE id = ?
        `)
      .bind(id)
      .all<any>();

    const updatedSite = updated[0];
    const formattedSite: Site = {
      ...updatedSite,
      auto_responder_enabled: updatedSite.auto_responder_enabled === 1,
      notify_on_submission: updatedSite.notify_on_submission === 1,
    };

    return sendOk(c, formattedSite);
  } catch (error) {
    console.error('Patch site error:', error);
    return sendProblemDetails(c, 500, 'Internal server error while patching site');
  }
};
