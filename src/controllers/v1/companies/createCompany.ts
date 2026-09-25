import { Context } from 'hono';
import { Env } from '../../../types/env';
import { sendCreated, sendProblemDetails } from '../../../utils/sendResponse';
import { CreateCompanyBody } from '../../../types/company';
import { encrypt } from '../../../utils/encryption';

const CF_FROM_EMAIL = 'no-reply@entrywise.webbound.in';
const CF_FROM_NAME = 'EntryWise';

export const createCompany = async (c: Context<{ Bindings: Env }>) => {
    try {
        const jwtPayload = c.get('jwtPayload') as any;
        const userId = jwtPayload?.user_id || null;

        const body = await c.req.json() as CreateCompanyBody;
        const id = `company_${crypto.randomUUID()}`;

        const provider = body.email_provider ?? 'cloudflare';
        const isCloudflare = provider === 'cloudflare';

        if (!body.name) {
            return sendProblemDetails(c, 422, 'Workspace / Company name is required', {
                invalidParams: [{ name: 'name', reason: 'Field is required' }],
            });
        }

        if (!isCloudflare && !body.from_name) {
            return sendProblemDetails(c, 422, 'from_name is required for third-party email providers', {
                invalidParams: [{ name: 'from_name', reason: 'Field is required when email_provider is not cloudflare' }],
            });
        }

        if (!isCloudflare && !body.email_provider_token) {
            return sendProblemDetails(c, 422, 'email_provider_token is required for third-party email providers', {
                invalidParams: [{ name: 'email_provider_token', reason: 'Token is required' }],
            });
        }

        const fromEmail = isCloudflare ? CF_FROM_EMAIL : (body.from_email ?? CF_FROM_EMAIL);
        const fromName = isCloudflare ? (body.from_name || body.name || CF_FROM_NAME) : body.from_name!;
        const encryptedToken = body.email_provider_token
            ? await encrypt(body.email_provider_token, c.env.ENCRYPTION_KEY)
            : null;

        const { success } = await c.env.DB.prepare(`
            INSERT INTO companies (id, name, email_provider, email_provider_token, from_email, from_name, user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(id, body.name, provider, encryptedToken, fromEmail, fromName, userId).run();

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
