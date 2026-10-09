import type { Context } from 'hono';
import { assertCompanyOwnership } from '../../../middleware/authorize';
import type { Env } from '../../../types/env';
import { sendNoContent, sendProblemDetails } from '../../../utils/sendResponse';

export const deleteCompany = async (c: Context<{ Bindings: Env }>) => {
  try {
    const id = c.req.param('id');
    if (!id) {
      return sendProblemDetails(c, 400, 'Company ID path parameter is required');
    }

    if (id === 'comp_default') {
      return sendProblemDetails(c, 403, 'The default workspace cannot be deleted');
    }

    // Default-deny tenant isolation
    const authorized = await assertCompanyOwnership(c, id);
    if (!authorized) {
      return sendProblemDetails(c, 404, `Workspace with ID '${id}' not found or access denied`);
    }

    const { success } = await c.env.DB.prepare(`
            DELETE FROM companies WHERE id = ?
        `)
      .bind(id)
      .run();

    if (!success) {
      return sendProblemDetails(c, 500, 'Failed to delete workspace');
    }

    return sendNoContent(c);
  } catch (error) {
    console.error('Delete company error:', error);
    return sendProblemDetails(c, 500, 'Internal server error while deleting workspace');
  }
};
