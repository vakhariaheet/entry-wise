import type { Context } from 'hono';
import type { Company } from '../../types/company';
import type { Env } from '../../types/env';
import { sendResponse } from '../../utils/sendResponse';

export const getCompanies = async (c: Context<{ Bindings: Env }>) => {
  try {
    const { results } = await c.env.DB.prepare(`
            SELECT * FROM companies ORDER BY created_at DESC
        `).all<Company>();

    return sendResponse(c, 200, results, 'Companies fetched successfully');
  } catch (error) {
    console.error('Error fetching companies:', error);
    return sendResponse(c, 500, null, 'Internal server error');
  }
};
