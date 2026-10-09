import type { Context } from 'hono';
import type { Env } from '../../types/env';
import type { UpdateSiteBody } from '../../types/site';
import { sendResponse } from '../../utils/sendResponse';

// Columns a client may set via this legacy endpoint. Excludes id/api_key/company_id/user_id/created_at
// to prevent mass-assignment (e.g. rotating api_key to an attacker value, or reassigning ownership).
const ALLOWED_SITE_COLUMNS = new Set([
  'name',
  'domain',
  'admin_email',
  'timezone',
  'notification_emails',
  'notify_on_submission',
  'auto_responder_enabled',
  'auto_responder_subject',
  'auto_responder_body',
  'auto_responder_config',
  'webhook_url',
  'webhook_secret',
  'turnstile_secret_key',
  'google_sheets_url',
  'slack_webhook_url',
  'discord_webhook_url',
  'allowed_origins',
  'block_disposable_emails',
  'spam_keywords',
  'data_retention_days',
  'anonymize_ip',
]);

export const updateSite = async (c: Context<{ Bindings: Env }>) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json<UpdateSiteBody>();
    const companyId = c.req.param('company_id');
    if (!companyId) {
      return sendResponse(c, 400, null, 'Company ID is required');
    }
    if (!id) {
      return sendResponse(c, 400, null, 'Site ID is required');
    }

    // Check if site exists
    const { results: siteExists } = await c.env.DB.prepare(`
            SELECT id FROM sites WHERE id = ? AND company_id = ?
        `)
      .bind(id, companyId)
      .all();

    if (!siteExists?.length) {
      return sendResponse(c, 404, null, 'Site not found');
    }

    // If domain is being updated, check if it already exists
    if (body.domain) {
      const { results: domainExists } = await c.env.DB.prepare(`
                SELECT id FROM sites WHERE domain = ? AND id != ? AND company_id = ?
            `)
        .bind(body.domain, id, companyId)
        .all();

      if (domainExists?.length) {
        return sendResponse(c, 400, null, 'Domain already exists');
      }
    }

    // Build update query from an allow-list only (prevents mass-assignment)
    const updateEntries = Object.entries(body).filter(
      ([key, value]) => ALLOWED_SITE_COLUMNS.has(key) && value !== undefined
    );
    const updateFields = updateEntries.map(([key]) => `${key} = ?`).join(', ');
    const updateValues = updateEntries.map(([_, value]) => value);

    if (!updateFields) {
      return sendResponse(c, 400, null, 'No fields to update');
    }

    const { success } = await c.env.DB.prepare(`
            UPDATE sites
            SET ${updateFields}
            WHERE id = ? AND company_id = ?
        `)
      .bind(...updateValues, id, companyId)
      .run();

    if (!success) {
      return sendResponse(c, 500, null, 'Failed to update site');
    }

    return sendResponse(c, 200, body, 'Site updated successfully');
  } catch (error) {
    console.error('Error updating site:', error);
    return sendResponse(c, 500, null, 'Internal server error');
  }
};
