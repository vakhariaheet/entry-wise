import { EmailService, SendEmailParams, EmailAttachment } from './types';
import { EmailMessage } from 'cloudflare:email';

const CF_FROM_EMAIL = 'no-reply@entrywise.webbound.in';

function buildMimeMessage(
    fromName: string,
    fromEmail: string,
    to: string,
    subject: string,
    html: string,
    attachments: EmailAttachment[] = []
): string {
    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    const encodedSubject = `=?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`;

    const lines: string[] = [
        `From: ${fromName} <${fromEmail}>`,
        `To: ${to}`,
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
        const rawMime = buildMimeMessage(
            params.fromName || 'EntryWise',
            CF_FROM_EMAIL,
            params.to,
            params.subject,
            params.html,
            params.attachments || []
        );

        try {
            const message = new EmailMessage(CF_FROM_EMAIL, params.to, rawMime);
            await this.binding.send(message);
            return { messageId: `cf_${Date.now()}` };
        } catch (error: any) {
            console.error('Cloudflare SendEmail error:', error);
            throw new Error(`Cloudflare email delivery failed: ${error.message || error}`);
        }
    }
}
