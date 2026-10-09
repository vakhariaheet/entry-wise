import type { Context } from 'hono';
import { assertSiteOwnership } from '../../../middleware/authorize';
import type { Env } from '../../../types/env';
import type { Field, FieldType, UpdateFieldBody } from '../../../types/field';
import { sendOk, sendProblemDetails } from '../../../utils/sendResponse';

export const patchField = async (c: Context<{ Bindings: Env }>) => {
  try {
    const siteId = c.req.param('site_id');
    const fieldId = c.req.param('field_id') || c.req.param('id');
    const body = (await c.req.json()) as UpdateFieldBody;

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

    // Verify field exists AND belongs to this site
    const { results: existingFields } = await c.env.DB.prepare(`
            SELECT * FROM fields WHERE id = ? AND site_id = ?
        `)
      .bind(fieldId, siteId)
      .all<Field>();

    if (!existingFields?.length) {
      return sendProblemDetails(c, 404, `Field with ID '${fieldId}' not found`);
    }

    const currentField = existingFields[0];
    const effectiveSiteId = siteId;

    if (body.type) {
      const validTypes: FieldType[] = ['text', 'email', 'phone', 'url', 'file'];
      if (!validTypes.includes(body.type)) {
        return sendProblemDetails(
          c,
          422,
          `Invalid field type. Must be one of: ${validTypes.join(', ')}`,
          {
            invalidParams: [{ name: 'type', reason: `Must be one of: ${validTypes.join(', ')}` }],
          }
        );
      }
    }

    if (body.name && body.name !== currentField.name) {
      const { results: nameExists } = await c.env.DB.prepare(`
                SELECT id FROM fields WHERE site_id = ? AND name = ? AND id != ?
            `)
        .bind(effectiveSiteId, body.name, fieldId)
        .all();

      if (nameExists?.length) {
        return sendProblemDetails(c, 409, `Field name '${body.name}' already exists for this site`);
      }
    }

    const updateFields = Object.entries(body)
      .filter(([_, value]) => value !== undefined)
      .map(([key]) => `${key} = ?`)
      .join(', ');

    const updateValues = Object.entries(body)
      .filter(([_, value]) => value !== undefined)
      .map(([_, value]) => value);

    if (!updateFields) {
      return sendProblemDetails(c, 400, 'At least one field property must be provided to patch');
    }

    const { success } = await c.env.DB.prepare(`
            UPDATE fields SET ${updateFields} WHERE id = ? AND site_id = ?
        `)
      .bind(...updateValues, fieldId, siteId)
      .run();

    if (!success) {
      return sendProblemDetails(c, 500, 'Failed to update field in database');
    }

    const { results: updated } = await c.env.DB.prepare(`
            SELECT id, site_id, name, type, created_at FROM fields WHERE id = ?
        `)
      .bind(fieldId)
      .all<Field>();

    return sendOk(c, updated[0]);
  } catch (error) {
    console.error('Patch field error:', error);
    return sendProblemDetails(c, 500, 'Internal server error while patching field');
  }
};
