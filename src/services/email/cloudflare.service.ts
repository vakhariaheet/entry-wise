import { EmailService, SendEmailParams, EmailAttachment } from './types';
import { EmailMessage } from 'cloudflare:email';

const CF_FROM_EMAIL = 'no-reply@entrywise.webbound.in';

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

export class CloudflareEmailService implements EmailService {
    constructor(private binding: any) {}

    async send(params: SendEmailParams): Promise<{ messageId: string }> {
        const fromEmail = params.from || CF_FROM_EMAIL;
        const fromName = params.fromName || 'EntryWise';

        // 1. Try structured message format (supported by modern Cloudflare Email Service)
        try {
            const sendOptions: any = {
                to: params.to,
                from: { email: fromEmail, name: fromName },
                subject: params.subject,
                html: params.html,
                text: params.html ? params.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '',
                attachments: (params.attachments || []).map(att => ({
                    filename: att.filename,
                    content: att.content,
                    type: att.type || 'application/octet-stream',
                    disposition: 'attachment' as const,
                })),
            };
            if (params.replyTo) {
                sendOptions.replyTo = params.replyTo;
            }

            const result = await this.binding.send(sendOptions);
            return { messageId: result?.messageId || `cf_${Date.now()}` };
        } catch (builderError: any) {
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
                const message = new EmailMessage(fromEmail, params.to, rawMime);
                await this.binding.send(message);
                return { messageId: `cf_${Date.now()}` };
            } catch (mimeError: any) {
                const primaryError = builderError || mimeError;
                const errCode = mimeError?.code || builderError?.code || 'E_SEND_FAILED';
                const errMsg = mimeError?.message || builderError?.message || String(mimeError || builderError);

                console.error('Cloudflare SendEmail failed:', {
                    code: errCode,
                    message: errMsg,
                    from: fromEmail,
                    to: params.to,
                    builderError: builderError?.message || String(builderError),
                    mimeError: mimeError?.message || String(mimeError),
                });

                throw new Error(`Cloudflare email delivery failed [${errCode}]: ${errMsg}`);
            }
        }
    }
}
