import type { Context } from 'hono';
import { renderAutoResponderEmail } from '../../../emails/AutoResponderEmail';
import { renderFormSubmissionEmail } from '../../../emails/FormSubmissionEmail';
import { EmailServiceFactory } from '../../../services/email';
import type { JwtAuthPayload } from '../../../types/auth';
import type { Company } from '../../../types/company';
import type { Env } from '../../../types/env';
import type { Site } from '../../../types/site';
import { decrypt } from '../../../utils/encryption';
import { escapeHtml } from '../../../utils/escapeHtml';
import { sendOk, sendProblemDetails } from '../../../utils/sendResponse';

interface TestSiteEmailPayload {
  recipient_email: string;
  template_type?: 'auto_responder' | 'submission_alert';
  custom_subject?: string;
  custom_html?: string;
}

export const testSiteEmail = async (c: Context<{ Bindings: Env }>) => {
  try {
    const id = c.req.param('site_id') || c.req.param('id');
    if (!id) {
      return sendProblemDetails(c, 400, 'Site ID path parameter is required');
    }

    const jwtPayload = c.get('jwtPayload') as JwtAuthPayload | undefined;

    // 1. Fetch site
    const { results: existingSites } = await c.env.DB.prepare('SELECT * FROM sites WHERE id = ?')
      .bind(id)
      .all<Site>();

    if (!existingSites?.length) {
      return sendProblemDetails(c, 404, `Site with ID '${id}' not found`);
    }

    const site = existingSites[0];

    // Verify Clerk ownership
    if (jwtPayload?.role === 'clerk_user' && jwtPayload?.user_id) {
      if (site.user_id && site.user_id !== jwtPayload.user_id) {
        return sendProblemDetails(c, 403, 'You do not have permission to access this site');
      }
    }

    // 2. Fetch parent company for email provider configuration
    const { results: companies } = await c.env.DB.prepare('SELECT * FROM companies WHERE id = ?')
      .bind(site.company_id)
      .all<Company>();

    if (!companies?.length) {
      return sendProblemDetails(c, 404, `Workspace for site '${id}' not found`);
    }

    const company = companies[0];

    const body = (await c.req.json().catch(() => ({}))) as TestSiteEmailPayload;
    const recipient = body.recipient_email?.trim();

    if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
      return sendProblemDetails(
        c,
        422,
        'Please provide a valid recipient_email to receive the test message'
      );
    }

    // 3. Resolve and decrypt provider token
    let decryptedToken = '';
    if (company.email_provider_token && c.env.ENCRYPTION_KEY) {
      try {
        decryptedToken = await decrypt(company.email_provider_token, c.env.ENCRYPTION_KEY);
      } catch (decErr: unknown) {
        return sendProblemDetails(
          c,
          500,
          `Failed to decrypt workspace email provider credentials: ${decErr instanceof Error ? decErr.message : String(decErr)}`
        );
      }
    }

    if (company.email_provider !== 'cloudflare' && !decryptedToken) {
      return sendProblemDetails(
        c,
        400,
        `No API key configured for ${company.email_provider}. Please configure your workspace email provider credentials first.`
      );
    }

    const emailService = EmailServiceFactory.createEmailService({
      provider: company.email_provider || 'cloudflare',
      apiKey: decryptedToken || undefined,
      binding: company.email_provider === 'cloudflare' ? c.env.EMAIL : undefined,
    });

    const templateType = body.template_type || 'auto_responder';
    const companyDisplayName = site.name || company.name || site.domain;

    // 4. Sample Form Data for Template Interpolation
    const sampleFields: Record<string, string> = {
      fullName: 'Alex Taylor',
      email: 'alex.taylor@example.com',
      company: 'Acme Corporation',
      phone: '+1 (555) 234-5678',
      message:
        'Hello! We are testing our email template with custom images, banners, and layout formatting.',
    };

    let sampleFieldsTableHtml =
      '<table cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:540px;border-collapse:collapse;margin:16px 0;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;font-size:13px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">';
    let rowIdx = 0;
    for (const [k, v] of Object.entries(sampleFields)) {
      const bg = rowIdx % 2 === 0 ? '#ffffff' : '#f8fafc';
      const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
      sampleFieldsTableHtml += `<tr style="background:${bg};"><td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#475569;width:35%;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;color:#0f172a;vertical-align:top;">${escapeHtml(v)}</td></tr>`;
      rowIdx++;
    }
    sampleFieldsTableHtml += '</table>';

    const sampleVars: Record<string, string> = {
      ...sampleFields,
      name: 'Alex Taylor',
      email: recipient,
      domain: site.domain,
      site_domain: site.domain,
      company: companyDisplayName,
      company_name: companyDisplayName,
      submission_id: '#EW-TEST-94021',
      date: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      formData: sampleFieldsTableHtml,
      form_data: sampleFieldsTableHtml,
      submission_summary: sampleFieldsTableHtml,
      all_fields: sampleFieldsTableHtml,
    };

    const interpolate = (content: string): string => {
      let result = content;
      for (const [key, val] of Object.entries(sampleVars)) {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
        result = result.replace(regex, val);
      }
      return result;
    };

interface StoredTemplateConfig {
  mode?: string;
  theme?: string;
  customHtml?: string;
  compiledHtml?: string;
  subject?: string;
}

interface StoredSiteConfig {
  autoResponder?: StoredTemplateConfig;
  submissionAlert?: StoredTemplateConfig;
  customHtml?: string;
  compiledHtml?: string;
}

    let finalHtml = '';
    let finalSubject = '';

    // If custom_html / custom_subject were sent live from the Studio, test that directly!
    if (body.custom_html?.trim()) {
      finalHtml = interpolate(body.custom_html);
      finalSubject = body.custom_subject
        ? interpolate(body.custom_subject)
        : templateType === 'submission_alert'
          ? `[Test Alert] New Form Submission: ${site.name || site.domain}`
          : `[Test Preview] Thank you for contacting ${companyDisplayName}`;
    } else {
      // Parse stored auto_responder_config
      let parsedConfig: StoredSiteConfig | null = null;
      if (site.auto_responder_config) {
        try {
          parsedConfig = JSON.parse(site.auto_responder_config);
        } catch {
          parsedConfig = null;
        }
      }

      if (templateType === 'submission_alert') {
        const alertConfig = parsedConfig?.submissionAlert;
        if (alertConfig?.customHtml) {
          finalHtml = interpolate(alertConfig.customHtml);
        } else if (alertConfig?.compiledHtml) {
          finalHtml = interpolate(alertConfig.compiledHtml);
        } else {
          finalHtml = renderFormSubmissionEmail({
            siteDomain: site.domain,
            formData: sampleFields,
            companyName: companyDisplayName,
            timezone: site.timezone,
            submissionId: '#EW-TEST-94021',
          });
        }

        finalSubject = body.custom_subject
          ? interpolate(body.custom_subject)
          : alertConfig?.subject
            ? interpolate(alertConfig.subject)
            : `[Test Alert] New Form Submission: ${site.name || site.domain}`;
      } else {
        // auto_responder
        const autoConfig = parsedConfig?.autoResponder || parsedConfig;
        if (autoConfig?.customHtml) {
          finalHtml = interpolate(autoConfig.customHtml);
        } else if (autoConfig?.compiledHtml) {
          finalHtml = interpolate(autoConfig.compiledHtml);
        } else if (site.auto_responder_body) {
          finalHtml = renderAutoResponderEmail({
            siteDomain: site.domain,
            companyName: companyDisplayName,
            recipientName: 'Alex Taylor',
            customBody: interpolate(site.auto_responder_body),
            customSubject: site.auto_responder_subject || undefined,
            submissionId: '#EW-TEST-94021',
            timezone: site.timezone,
          });
        } else {
          finalHtml = renderAutoResponderEmail({
            siteDomain: site.domain,
            companyName: companyDisplayName,
            recipientName: 'Alex Taylor',
            submissionId: '#EW-TEST-94021',
            timezone: site.timezone,
          });
        }

        finalSubject = body.custom_subject
          ? interpolate(body.custom_subject)
          : site.auto_responder_subject
            ? interpolate(site.auto_responder_subject)
            : `[Test Preview] Thank you for contacting ${companyDisplayName}`;
      }
    }

    await emailService.send({
      from: company.from_email || 'no-reply@entrywise.webbound.in',
      fromName: site.name || company.from_name || 'EntryWise Preview',
      to: recipient,
      subject: finalSubject,
      html: finalHtml,
      replyTo: recipient,
    });

    return sendOk(c, {
      success: true,
      message: `Test ${templateType === 'submission_alert' ? 'submission alert' : 'auto-responder'} email dispatched to ${recipient}`,
      recipient,
      template_type: templateType,
    });
  } catch (err: unknown) {
    console.error('Test site email error:', err);
    return sendProblemDetails(
      c,
      400,
      `Failed to send test site email: ${err instanceof Error ? err.message : String(err)}`
    );
  }
};
