import type { Context } from 'hono';
import { assertCompanyOwnership } from '../../../middleware/authorize';
import type { Company } from '../../../types/company';
import type { Env } from '../../../types/env';
import { sendOk, sendProblemDetails } from '../../../utils/sendResponse';

export const getCompany = async (c: Context<{ Bindings: Env }>) => {
  try {
    const id = c.req.param('id');
    if (!id) {
      return sendProblemDetails(c, 400, 'Company ID path parameter is required');
    }

    // Default-deny tenant isolation (returns 404 for missing OR unauthorized to avoid leaking existence)
    const authorized = await assertCompanyOwnership(c, id);
    if (!authorized) {
      return sendProblemDetails(c, 404, `Workspace with ID '${id}' not found`);
    }

    const { results } = await c.env.DB.prepare(
      `SELECT id, name, email_provider, from_email, from_name, user_id, created_at FROM companies WHERE id = ?`
    )
      .bind(id)
      .all<Company>();

    if (!results?.length) {
      return sendProblemDetails(c, 404, `Workspace with ID '${id}' not found`);
    }

    return sendOk(c, results[0]);
  } catch (error) {
    console.error('Get company error:', error);
    return sendProblemDetails(c, 500, 'Internal server error while fetching workspace');
  }
};
