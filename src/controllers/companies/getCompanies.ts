import type { Context } from 'hono';
import type { Company } from '../../types/company';
import type { Env } from '../../types/env';
import { sendResponse } from '../../utils/sendResponse';

export const getCompanies = async (c: Context<{ Bindings: Env }>) => {
  try {
    const jwtPayload = c.get('jwtPayload') as any;
    let sql = `SELECT id, name, email_provider, from_email, from_name, created_at, user_id FROM companies WHERE 1=1`;
    const params: string[] = [];

    if (jwtPayload?.role === 'clerk_user' && jwtPayload?.user_id) {
      sql += ` AND (user_id = ? OR id = 'comp_default')`;
      params.push(jwtPayload.user_id);
    }

    sql += ` ORDER BY created_at DESC`;

    const { results } = await c.env.DB.prepare(sql)
      .bind(...params)
      .all<Company>();

    return sendResponse(c, 200, results || [], 'Companies fetched successfully');
  } catch (error) {
    console.error('Error fetching companies:', error);
    return sendResponse(c, 500, null, 'Internal server error');
  }
};
