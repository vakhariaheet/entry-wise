import type { Context } from 'hono';
import type { CreateCompanyBody } from '../../types/company';
import type { Env } from '../../types/env';
import { encrypt } from '../../utils/encryption';
import { sendResponse } from '../../utils/sendResponse';

const CF_FROM_EMAIL = 'no-reply@entrywise.webbound.in';
const CF_FROM_NAME = 'EntryWise';

export const createCompany = async (c: Context<{ Bindings: Env }>) => {
  try {
    const body = (await c.req.json()) as CreateCompanyBody;
    const id = `company_${crypto.randomUUID()}`;

    const provider = body.email_provider ?? 'cloudflare';
    const isCloudflare = provider === 'cloudflare';

    if (!body.name) {
      return sendResponse(c, 400, null, 'Missing required fields');
    }

    if (!isCloudflare && !body.from_name) {
      return sendResponse(c, 400, null, 'from_name is required for third-party providers');
    }

    // Token is required for all providers except cloudflare
    if (!isCloudflare && !body.email_provider_token) {
      return sendResponse(
        c,
        400,
        null,
        'email_provider_token is required for the selected provider'
      );
    }

    // from_email and from_name are fixed for cloudflare — ignore whatever was sent
    const fromEmail = isCloudflare ? CF_FROM_EMAIL : (body.from_email ?? CF_FROM_EMAIL);
    const fromName = isCloudflare ? CF_FROM_NAME : body.from_name!;
    const encryptedToken = body.email_provider_token
      ? await encrypt(body.email_provider_token, c.env.ENCRYPTION_KEY)
      : null;

    const { success } = await c.env.DB.prepare(`
            INSERT INTO companies (id, name, email_provider, email_provider_token, from_email, from_name)
            VALUES (?, ?, ?, ?, ?, ?)
        `)
      .bind(id, body.name, provider, encryptedToken, fromEmail, fromName)
      .run();

    if (!success) {
      return sendResponse(c, 500, null, 'Failed to create company');
    }

    return sendResponse(
      c,
      201,
      {
        id,
        name: body.name,
        email_provider: provider,
        from_email: fromEmail,
        from_name: fromName,
        email_provider_token: body.email_provider_token ?? null,
        created_at: new Date().toISOString(),
      },
      'Company created successfully'
    );
  } catch (error) {
    console.error(error);
    return sendResponse(c, 500, null, 'Internal server error');
  }
};
