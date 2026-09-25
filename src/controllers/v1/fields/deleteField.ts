import type { Context } from 'hono';
import type { Env } from '../../../types/env';
import { sendNoContent, sendProblemDetails } from '../../../utils/sendResponse';

export const deleteField = async (c: Context<{ Bindings: Env }>) => {
  try {
    const fieldId = c.req.param('field_id') || c.req.param('id');
    if (!fieldId) {
      return sendProblemDetails(c, 400, 'field_id path parameter is required');
    }

    const { results } = await c.env.DB.prepare(`
            SELECT id FROM fields WHERE id = ?
        `)
      .bind(fieldId)
      .all();

    if (!results?.length) {
      return sendProblemDetails(c, 404, `Field with ID '${fieldId}' not found`);
    }

    const { success } = await c.env.DB.prepare(`
            DELETE FROM fields WHERE id = ?
        `)
      .bind(fieldId)
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
