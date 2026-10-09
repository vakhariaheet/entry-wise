import type { Context } from 'hono';
import { assertSiteOwnership } from '../../../middleware/authorize';
import type { Env } from '../../../types/env';
import { sendNoContent, sendProblemDetails } from '../../../utils/sendResponse';

export const deleteField = async (c: Context<{ Bindings: Env }>) => {
  try {
    const siteId = c.req.param('site_id');
    const fieldId = c.req.param('field_id') || c.req.param('id');
    if (!siteId) {
      return sendProblemDetails(c, 400, 'site_id path parameter is required');
    }
    if (!fieldId) {
      return sendProblemDetails(c, 400, 'field_id path parameter is required');
    }

    // Default-deny tenant isolation
    const site = await assertSiteOwnership(c, siteId);
    if (!site) {
      return sendProblemDetails(
        c,
        403,
        'Access denied: you do not have permission to modify fields for this site'
      );
    }

    // Scope by site so one site's key can never delete another site's field by id
    const { results } = await c.env.DB.prepare(`
            SELECT id FROM fields WHERE id = ? AND site_id = ?
        `)
      .bind(fieldId, siteId)
      .all();

    if (!results?.length) {
      return sendProblemDetails(c, 404, `Field with ID '${fieldId}' not found`);
    }

    const { success } = await c.env.DB.prepare(`
            DELETE FROM fields WHERE id = ? AND site_id = ?
        `)
      .bind(fieldId, siteId)
      .run();

    if (!success) {
      return sendProblemDetails(c, 500, 'Failed to delete field from database');
    }

    return sendNoContent(c);
  } catch (error) {
    console.error('Delete field error:', error);
    return sendProblemDetails(c, 500, 'Internal server error while deleting field');
  }
};
