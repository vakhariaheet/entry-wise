import { renderAutoResponderEmail } from '../emails/AutoResponderEmail';
import { renderFormSubmissionEmail } from '../emails/FormSubmissionEmail';
import { dispatchDiscordNotification } from '../services/connectors/discord';
import { dispatchGoogleSheets } from '../services/connectors/googleSheets';
import { dispatchSlackNotification } from '../services/connectors/slack';
import { type EmailAttachment, EmailServiceFactory } from '../services/email';
import type { Company } from '../types/company';
import type { Env } from '../types/env';
import type { SubmissionQueueMessage } from '../types/queue';
import type { Site } from '../types/site';
import { decrypt } from '../utils/encryption';
import { escapeHtml } from '../utils/escapeHtml';
import { dispatchWebhook } from '../utils/webhook';

function recipientListFirst(
  site: Pick<Site, 'notification_emails'> & { admin_email?: string }
): string | undefined {
  if (site.notification_emails) {
    const first = site.notification_emails.split(/[,;\n]/)[0]?.trim();
    if (first && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(first)) return first;
  }
  return site.admin_email || undefined;
}

/**
 * Universal Submission Delivery Processor
 * Executes all external integrations (Email, Webhooks, Slack, Discord, Google Sheets).
 * Designed for both Cloudflare Queues batch processing and fallback waitUntil execution.
 */
export async function processSubmissionDelivery(
  message: SubmissionQueueMessage,
  env: Env
): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];
  const {
    submissionId,
    siteId,
    companyId,
    fields,
    savedAttachmentMeta,
    submitterEmail,
    submitterName,
  } = message;

  try {
    // 1. Fetch Site Configuration
    const site = await env.DB.prepare('SELECT * FROM sites WHERE id = ?')
      .bind(siteId)
      .first<Site>();
    if (!site) {
      console.error(
        `[Queue Processor] Site '${siteId}' not found for submission '${submissionId}'`
      );
      return { success: false, errors: [`Site '${siteId}' not found`] };
    }

    // 2. Fetch Company Configuration
    const company = await env.DB.prepare('SELECT * FROM companies WHERE id = ?')
      .bind(companyId)
      .first<Company>();
    if (!company) {
      console.error(`[Queue Processor] Company '${companyId}' not found for site '${siteId}'`);
      return { success: false, errors: [`Company '${companyId}' not found`] };
    }

    // 3. Prepare Email Service
    let decryptedApiKey = '';
    if (company.email_provider_token && env.ENCRYPTION_KEY) {
      try {
        decryptedApiKey = await decrypt(company.email_provider_token, env.ENCRYPTION_KEY);
      } catch (err: unknown) {
        console.error('[Queue Processor] Decryption error:', err);
        errors.push(`Decryption error: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    const emailService = EmailServiceFactory.createEmailService({
      provider: company.email_provider || 'cloudflare',
      apiKey: decryptedApiKey || undefined,
      binding: company.email_provider === 'cloudflare' ? env.EMAIL : undefined,
    });

    // Convert savedAttachmentMeta to email attachment references if any
    const emailAttachments: EmailAttachment[] = (savedAttachmentMeta || []).map((f) => ({
      filename: f.filename || f.name || 'attachment',
      content: f.url ? `URL: ${f.url}` : '',
      type: f.mime_type || f.type || 'application/octet-stream',
    }));

    const deliveryTasks: Promise<unknown>[] = [];

    // Common template data interpolation preparation
    let fieldsTableHtml =
      '<table cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:540px;border-collapse:collapse;margin:16px 0;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;font-size:13px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">';
    let rowIdx = 0;
    for (const [k, v] of Object.entries(fields)) {
      if (k.startsWith('_')) continue;
      const valStr = typeof v === 'object' ? JSON.stringify(v) : String(v ?? '');
      const bg = rowIdx % 2 === 0 ? '#ffffff' : '#f8fafc';
      fieldsTableHtml += `<tr style="background:${bg};"><td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#475569;width:35%;vertical-align:top;">${escapeHtml(k)}</td><td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;color:#0f172a;vertical-align:top;">${escapeHtml(valStr)}</td></tr>`;
      rowIdx++;
    }
    fieldsTableHtml += '</table>';

    const companyDisplayName = site.name || company.name || company.from_name || site.domain;
    const templateVars: Record<string, string> = {
      ...fields,
      name: submitterName || '',
      email: submitterEmail || '',
      company: companyDisplayName,
      company_name: companyDisplayName,
      domain: site.domain,
      site_domain: site.domain,
      submission_id: submissionId,
      date: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      formData: fieldsTableHtml,
      form_data: fieldsTableHtml,
      submission_summary: fieldsTableHtml,
      all_fields: fieldsTableHtml,
    };

    const interpolateVars = (text: string): string => {
      let res = text;
      for (const [k, val] of Object.entries(templateVars)) {
        const regex = new RegExp(`{{\\s*${k}\\s*}}`, 'gi');
        res = res.replace(regex, val);
      }
      return res;
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

    let parsedConfig: StoredSiteConfig | null = null;
    if (site.auto_responder_config) {
      try {
        parsedConfig = JSON.parse(site.auto_responder_config);
      } catch {
        parsedConfig = null;
      }
    }

    // 4. Admin Notification Email
    if (site.notify_on_submission !== 0) {
      const recipientList: string[] = [];
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (site.notification_emails) {
        const parsed = site.notification_emails
          .split(/[,;\n]/)
          .map((e: string) => e.trim())
          .filter((e: string) => emailRegex.test(e));
        recipientList.push(...parsed);
      }
      if (
        recipientList.length === 0 &&
        site.admin_email &&
        emailRegex.test(site.admin_email.trim())
      ) {
        recipientList.push(site.admin_email.trim());
      }

      if (recipientList.length > 0) {
        let alertHtml = '';
        let alertSubject = `New Form Submission: ${site.name || site.domain}`;

        const alertConf = parsedConfig?.submissionAlert;
        if (alertConf) {
          const rawAlertHtml =
            alertConf.mode === 'custom_html' && alertConf.customHtml
              ? alertConf.customHtml
              : alertConf.compiledHtml;
          if (rawAlertHtml) {
            alertHtml = interpolateVars(rawAlertHtml);
          }
          if (alertConf.subject) {
            alertSubject = interpolateVars(alertConf.subject);
          }
        }

        if (!alertHtml) {
          alertHtml = renderFormSubmissionEmail({
            siteDomain: site.domain,
            formData: fields,
            companyName: companyDisplayName,
            timezone: site.timezone,
            submissionId,
            attachments: emailAttachments.map((f) => ({ filename: f.filename })),
          });
        }

        for (const recipient of recipientList) {
          deliveryTasks.push(
            emailService
              .send({
                from: company.from_email || 'no-reply@entrywise.webbound.in',
                fromName: site.name || company.from_name || 'EntryWise',
                to: recipient,
                subject: alertSubject,
                html: alertHtml,
                replyTo: submitterEmail || undefined,
                attachments: emailAttachments,
              })
              .catch((err) => {
                console.error(`[Queue] Notification email to ${recipient} failed:`, err);
                errors.push(`Admin email error: ${err.message}`);
              })
          );
        }
      }
    }

    // 5. Submitter Auto-Responder Email
    if (site.auto_responder_enabled && submitterEmail) {
      let interpolatedSubject =
        site.auto_responder_subject || `Thank you for reaching out — ${companyDisplayName}`;
      let interpolatedBody = site.auto_responder_body || '';

      interpolatedSubject = interpolateVars(interpolatedSubject);
      if (interpolatedBody) {
        interpolatedBody = interpolateVars(interpolatedBody);
      }

      const autoReplyHtml = renderAutoResponderEmail({
        siteDomain: site.domain,
        companyName: companyDisplayName,
        recipientName: submitterName || undefined,
        customBody: interpolatedBody || null,
        customSubject: interpolatedSubject,
        submissionId,
        timezone: site.timezone,
      });

      deliveryTasks.push(
        emailService
          .send({
            from: company.from_email || 'no-reply@entrywise.webbound.in',
            fromName: site.name || company.from_name || 'EntryWise',
            to: submitterEmail,
            subject: interpolatedSubject,
            html: autoReplyHtml,
            replyTo: recipientListFirst(site),
          })
          .catch((err) => {
            console.error('[Queue] Auto-responder delivery failed:', err);
            errors.push(`Autoresponder error: ${err.message}`);
          })
      );
    }

    // 6. Outgoing Webhook
    if (site.webhook_url) {
      deliveryTasks.push(
        dispatchWebhook(
          site.webhook_url,
          {
            event: 'submission.created',
            timestamp: message.submittedAt || new Date().toISOString(),
            site_id: site.id,
            domain: site.domain,
            submission_id: submissionId,
            data: fields,
            attachments: savedAttachmentMeta?.map((f) => ({
              filename: f.filename || f.name || 'attachment',
              size: f.size,
              type: f.mime_type || f.type,
            })),
          },
          site.webhook_secret
        ).catch((err) => {
          console.error('[Queue] Webhook dispatch error:', err);
          errors.push(`Webhook error: ${err.message}`);
        })
      );
    }

    // 7. Slack Connector
    if (site.slack_webhook_url) {
      deliveryTasks.push(
        dispatchSlackNotification(site.slack_webhook_url, {
          siteDomain: site.name ? `${site.name} (${site.domain})` : site.domain,
          submissionId,
          formData: fields,
          submittedAt: message.submittedAt || new Date().toISOString(),
        }).catch((err) => {
          console.error('[Queue] Slack connector error:', err);
          errors.push(`Slack error: ${err.message}`);
        })
      );
    }

    // 8. Discord Connector
    if (site.discord_webhook_url) {
      deliveryTasks.push(
        dispatchDiscordNotification(site.discord_webhook_url, {
          siteDomain: site.name ? `${site.name} (${site.domain})` : site.domain,
          submissionId,
          formData: fields,
          submittedAt: message.submittedAt || new Date().toISOString(),
        }).catch((err) => {
          console.error('[Queue] Discord connector error:', err);
          errors.push(`Discord error: ${err.message}`);
        })
      );
    }

    // 9. Google Sheets Connector
    if (site.google_sheets_url) {
      deliveryTasks.push(
        dispatchGoogleSheets(site.google_sheets_url, {
          siteDomain: site.domain,
          submissionId,
          formData: fields,
          submittedAt: message.submittedAt || new Date().toISOString(),
        }).catch((err) => {
          console.error('[Queue] Google Sheets dispatch error:', err);
          errors.push(`Google Sheets error: ${err.message}`);
        })
      );
    }

    await Promise.allSettled(deliveryTasks);
    return { success: errors.length === 0, errors };
  } catch (err: unknown) {
    console.error(
      `[Queue Processor] Unexpected failure processing submission '${submissionId}':`,
      err
    );
    return {
      success: false,
      errors: [err instanceof Error ? err.message : 'Unknown processing error'],
    };
  }
}
