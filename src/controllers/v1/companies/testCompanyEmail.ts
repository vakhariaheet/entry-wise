import type { Context } from 'hono';
import { EmailServiceFactory } from '../../../services/email';
import type { JwtAuthPayload } from '../../../types/auth';
import type { Company } from '../../../types/company';
import type { Env } from '../../../types/env';
import { decrypt } from '../../../utils/encryption';
import { sendOk, sendProblemDetails } from '../../../utils/sendResponse';

export const testCompanyEmail = async (c: Context<{ Bindings: Env }>) => {
  try {
    const id = c.req.param('id');
    if (!id) {
      return sendProblemDetails(c, 400, 'Company ID path parameter is required');
    }

    const jwtPayload = c.get('jwtPayload') as JwtAuthPayload | undefined;
    let checkSql = 'SELECT * FROM companies WHERE id = ?';
    const checkParams: (string | number)[] = [id];

    if (jwtPayload?.role === 'clerk_user' && jwtPayload?.user_id) {
      checkSql += ' AND user_id = ?';
      checkParams.push(jwtPayload.user_id);
    }

    const { results } = await c.env.DB.prepare(checkSql)
      .bind(...checkParams)
      .all<Company>();

    if (!results?.length) {
      return sendProblemDetails(c, 404, `Workspace with ID '${id}' not found or access denied`);
    }

    const company = results[0];
    const body = (await c.req.json().catch(() => ({}))) as { recipient_email?: string };

    const recipient =
      body.recipient_email?.trim() ||
      jwtPayload?.email ||
      (jwtPayload?.claims?.email as string | undefined) ||
      company.from_email;

    if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
      return sendProblemDetails(
        c,
        422,
        'Please provide a valid recipient_email to receive the test message'
      );
    }

    // Resolve decrypted token
    let decryptedToken = '';
    if (company.email_provider_token && c.env.ENCRYPTION_KEY) {
      try {
        decryptedToken = await decrypt(company.email_provider_token, c.env.ENCRYPTION_KEY);
      } catch (decErr: unknown) {
        return sendProblemDetails(
          c,
          500,
          `Failed to decrypt provider token: ${decErr instanceof Error ? decErr.message : String(decErr)}`
        );
      }
    }

    if (company.email_provider !== 'cloudflare' && !decryptedToken) {
      return sendProblemDetails(
        c,
        400,
        `No API key configured for ${company.email_provider}. Please configure your provider API key first.`
      );
    }

    const emailService = EmailServiceFactory.createEmailService({
      provider: company.email_provider || 'cloudflare',
      apiKey: decryptedToken || undefined,
      binding: company.email_provider === 'cloudflare' ? c.env.EMAIL : undefined,
    });

    const testHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #09090b; color: #f4f4f5; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; width: 44px; height: 44px; line-height: 44px; border-radius: 12px; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.2); color: #10b981; font-size: 20px;">✓</div>
          <h2 style="font-size: 18px; font-weight: 700; margin: 12px 0 4px; color: #ffffff;">Email Connector Verified</h2>
          <p style="font-size: 13px; color: #a1a1aa; margin: 0;">Sent via EntryWise Workspace "${company.name}"</p>
        </div>
        <div style="background: #121215; border-radius: 12px; padding: 16px; border: 1px solid rgba(255,255,255,0.06); font-size: 12px; line-height: 1.6; margin-bottom: 24px;">
          <p style="margin: 0 0 8px;"><strong>Delivery Engine:</strong> <span style="font-family: monospace; color: #10b981;">${company.email_provider.toUpperCase()}</span></p>
          <p style="margin: 0 0 8px;"><strong>From:</strong> ${company.from_name || 'EntryWise'} &lt;${company.from_email}&gt;</p>
          <p style="margin: 0 0 8px;"><strong>To:</strong> ${recipient}</p>
          <p style="margin: 0;"><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        </div>
        <p style="font-size: 12px; color: #71717a; text-align: center; margin: 0;">Your email credentials, domain verification, and DKIM/SPF settings are working properly.</p>
      </div>
    `;

    await emailService.send({
      from: company.from_email || 'no-reply@entrywise.webbound.in',
      fromName: company.from_name || 'EntryWise Test',
      to: recipient,
      subject: `[Verified] EntryWise email test for ${company.name}`,
      html: testHtml,
    });

    return sendOk(c, {
      success: true,
      message: `Test email successfully dispatched to ${recipient} via ${company.email_provider}.`,
      provider: company.email_provider,
      recipient,
    });
  } catch (err: unknown) {
    console.error('Test email delivery failed:', err);
    return sendProblemDetails(
      c,
      400,
      `Email delivery test failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }
};
