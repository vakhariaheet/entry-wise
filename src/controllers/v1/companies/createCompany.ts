import type { Context } from 'hono';
import type { JwtAuthPayload } from '../../../types/auth';
import type { CreateCompanyBody } from '../../../types/company';
import type { Env } from '../../../types/env';
import { encrypt } from '../../../utils/encryption';
import { sendCreated, sendProblemDetails } from '../../../utils/sendResponse';

const CF_FROM_EMAIL = 'no-reply@entrywise.webbound.in';
const CF_FROM_NAME = 'EntryWise';

export const createCompany = async (c: Context<{ Bindings: Env }>) => {
  try {
    const jwtPayload = c.get('jwtPayload') as JwtAuthPayload | undefined;
    const userId = jwtPayload?.user_id || null;

    const body = (await c.req.json()) as CreateCompanyBody;
    const id = `company_${crypto.randomUUID()}`;

    const provider = body.email_provider ?? c.env.DEFAULT_EMAIL_PROVIDER ?? 'cloudflare';
    const isManagedOrConsole = provider === 'cloudflare' || provider === 'console';
    const hasEnvToken = Boolean(
      c.env.DEFAULT_EMAIL_API_KEY ||
        (provider === 'resend' && c.env.RESEND_API_KEY) ||
        (provider === 'smtp2go' && c.env.SMTP2GO_API_KEY) ||
        (provider === 'mailersend' && c.env.MAILERSEND_API_KEY) ||
        (provider === 'mailtrap' && c.env.MAILTRAP_API_KEY) ||
        (provider === 'webhook' && c.env.EMAIL_WEBHOOK_URL)
    );

    if (!body.name) {
      return sendProblemDetails(c, 422, 'Workspace / Company name is required', {
        invalidParams: [{ name: 'name', reason: 'Field is required' }],
      });
    }

    if (!isManagedOrConsole && !hasEnvToken && !body.from_name && !c.env.DEFAULT_FROM_NAME) {
      return sendProblemDetails(c, 422, 'from_name is required for third-party email providers', {
        invalidParams: [
          { name: 'from_name', reason: 'Field is required when email_provider is not cloudflare' },
        ],
      });
    }

    const effectiveFromEmail = body.from_email?.trim() || c.env.DEFAULT_FROM_EMAIL || '';
    if (
      !isManagedOrConsole &&
      !hasEnvToken &&
      (!effectiveFromEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(effectiveFromEmail))
    ) {
      return sendProblemDetails(
        c,
        422,
        'A valid from_email is required for third-party email providers (e.g. notifications@yourdomain.com)',
        {
          invalidParams: [
            {
              name: 'from_email',
              reason: 'Valid verified sender email address is required',
            },
          ],
        }
      );
    }

    if (!isManagedOrConsole && !hasEnvToken && !body.email_provider_token) {
      return sendProblemDetails(
        c,
        422,
        'email_provider_token is required for third-party email providers',
        {
          invalidParams: [{ name: 'email_provider_token', reason: 'Token is required' }],
        }
      );
    }

    const fromEmail = isManagedOrConsole
      ? c.env.DEFAULT_FROM_EMAIL || CF_FROM_EMAIL
      : effectiveFromEmail || c.env.DEFAULT_FROM_EMAIL || CF_FROM_EMAIL;
    const fromName = isManagedOrConsole
      ? body.from_name || body.name || c.env.DEFAULT_FROM_NAME || CF_FROM_NAME
      : body.from_name?.trim() || c.env.DEFAULT_FROM_NAME || body.name || CF_FROM_NAME;
    const encryptedToken = body.email_provider_token
      ? await encrypt(body.email_provider_token, c.env.ENCRYPTION_KEY)
      : null;

    const { success } = await c.env.DB.prepare(`
            INSERT INTO companies (id, name, email_provider, email_provider_token, from_email, from_name, user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
      .bind(id, body.name, provider, encryptedToken, fromEmail, fromName, userId)
      .run();

    if (!success) {
      return sendProblemDetails(c, 500, 'Database write failed while creating workspace');
    }

    const createdResource = {
      id,
      name: body.name,
      email_provider: provider,
      from_email: fromEmail,
      from_name: fromName,
      user_id: userId,
      created_at: new Date().toISOString(),
    };

    return sendCreated(c, createdResource, `/v1/companies/${id}`);
  } catch (error) {
    console.error('Create company error:', error);
    return sendProblemDetails(c, 500, 'Internal server error while creating workspace');
  }
};
