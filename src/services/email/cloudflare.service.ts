import type { EmailAttachment, EmailService, SendEmailParams } from './types';

const CF_FROM_EMAIL = 'no-reply@entrywise.webbound.in';

type EmailMessageClass = new (from: string, to: string, raw: string) => unknown;

let CachedEmailMessage: EmailMessageClass | null = null;
async function getEmailMessageClass(): Promise<EmailMessageClass> {
  if (CachedEmailMessage) return CachedEmailMessage;
  try {
    const mod = await import('cloudflare:email');
    CachedEmailMessage = mod.EmailMessage;
    return mod.EmailMessage;
  } catch {
    CachedEmailMessage = class FallbackEmailMessage {
      constructor(
        public from: string,
        public to: string,
        public raw: string
      ) {}
    } as unknown as EmailMessageClass;
    return CachedEmailMessage;
  }
}

function buildMimeMessage(
  fromName: string,
  fromEmail: string,
  to: string,
  subject: string,
  html: string,
  attachments: EmailAttachment[] = [],
  replyTo?: string
): string {
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`;

  const lines: string[] = [
    `From: ${fromName} <${fromEmail}>`,
    `To: ${to}`,
    ...(replyTo ? [`Reply-To: ${replyTo}`] : []),
    `Subject: ${encodedSubject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    Buffer.from(html).toString('base64'),
  ];

  for (const att of attachments) {
    lines.push(
      ``,
      `--${boundary}`,
      `Content-Type: ${att.type || 'application/octet-stream'}; name="${att.filename}"`,
      `Content-Transfer-Encoding: base64`,
      `Content-Disposition: attachment; filename="${att.filename}"`,
      ``,
      att.content
    );
  }

  lines.push(``, `--${boundary}--`, ``);
  return lines.join('\r\n');
}

interface SendEmailBinding {
  send: (message: unknown) => Promise<{ messageId?: string } | undefined>;
}

export class CloudflareEmailService implements EmailService {
  constructor(private binding: SendEmailBinding | unknown) {}

  async send(params: SendEmailParams): Promise<{ messageId: string }> {
    const fromEmail = params.from || CF_FROM_EMAIL;
    const fromName = params.fromName || 'EntryWise';

    const emailBinding = this.binding as SendEmailBinding;

    // 1. Try structured message format (supported by modern Cloudflare Email Service)
    try {
      const sendOptions: Record<string, unknown> = {
        to: params.to,
        from: { email: fromEmail, name: fromName },
        subject: params.subject,
        html: params.html,
        text: params.html
          ? params.html
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
          : '',
        attachments: (params.attachments || []).map((att) => ({
          filename: att.filename,
          content: att.content,
          type: att.type || 'application/octet-stream',
          disposition: 'attachment' as const,
        })),
      };
      if (params.replyTo) {
        sendOptions.replyTo = params.replyTo;
      }

      const result = await emailBinding.send(sendOptions);
      return {
        messageId:
          result &&
          typeof result === 'object' &&
          'messageId' in result &&
          typeof result.messageId === 'string'
            ? result.messageId
            : `cf_${Date.now()}`,
      };
    } catch (builderError: unknown) {
      // 2. Fallback to EmailMessage MIME API if binding expects EmailMessage class
      try {
        const rawMime = buildMimeMessage(
          fromName,
          fromEmail,
          params.to,
          params.subject,
          params.html,
          params.attachments || [],
          params.replyTo
        );
        const EmailMsg = await getEmailMessageClass();
        const message = new EmailMsg(fromEmail, params.to, rawMime);
        await emailBinding.send(message);
        return { messageId: `cf_${Date.now()}` };
      } catch (mimeError: unknown) {
        const errCode =
          (mimeError && typeof mimeError === 'object' && 'code' in mimeError
            ? String(mimeError.code)
            : undefined) ||
          (builderError && typeof builderError === 'object' && 'code' in builderError
            ? String(builderError.code)
            : undefined) ||
          'E_SEND_FAILED';
        const errMsg =
          (mimeError instanceof Error ? mimeError.message : undefined) ||
          (builderError instanceof Error ? builderError.message : undefined) ||
          String(mimeError || builderError);

        console.error('Cloudflare SendEmail failed:', {
          code: errCode,
          message: errMsg,
          from: fromEmail,
          to: params.to,
          builderError: builderError instanceof Error ? builderError.message : String(builderError),
          mimeError: mimeError instanceof Error ? mimeError.message : String(mimeError),
        });

        throw new Error(`Cloudflare email delivery failed [${errCode}]: ${errMsg}`);
      }
    }
  }
}
