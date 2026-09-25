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
        const htmlEmail = renderFormSubmissionEmail({
          siteDomain: site.domain,
          formData: fields,
          companyName: site.name || company.name || site.domain,
          timezone: site.timezone,
          submissionId,
          attachments: emailAttachments.map((f) => ({ filename: f.filename })),
        });

        for (const recipient of recipientList) {
          deliveryTasks.push(
            emailService
              .send({
                from: company.from_email || 'no-reply@entrywise.webbound.in',
                fromName: site.name || company.from_name || 'EntryWise',
                to: recipient,
                subject: `New Form Submission: ${site.name || site.domain}`,
                html: htmlEmail,
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
      const companyDisplayName = site.name || company.name || company.from_name || site.domain;
      let interpolatedSubject =
        site.auto_responder_subject || `Thank you for reaching out — ${companyDisplayName}`;
      let interpolatedBody = site.auto_responder_body || '';

      const templateVars: Record<string, string> = {
        ...fields,
        name: submitterName || '',
        email: submitterEmail,
        company: companyDisplayName,
        company_name: companyDisplayName,
        domain: site.domain,
        site_domain: site.domain,
        submission_id: submissionId,
      };

      for (const [k, val] of Object.entries(templateVars)) {
        const regex = new RegExp(`{{\\s*${k}\\s*}}`, 'gi');
        interpolatedSubject = interpolatedSubject.replace(regex, val);
        if (interpolatedBody) {
          interpolatedBody = interpolatedBody.replace(regex, val);
        }
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
