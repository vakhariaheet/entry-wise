import { Resend } from 'resend';
import type { EmailService, SendEmailParams } from './types';

export class ResendEmailService implements EmailService {
  private client: Resend;

  constructor(apiKey: string) {
    this.client = new Resend(apiKey);
  }

  async send(params: SendEmailParams) {
    const { from, fromName, to, subject, html, replyTo, attachments = [] } = params;

    return await this.client.emails.send({
      from: `${fromName} <${from}>`,
      to,
      subject,
      html,
      replyTo,
      attachments: attachments.map((file) => ({
        filename: file.filename,
        content: file.content,
        contentType: file.type ?? 'application/octet-stream',
      })),
    });
  }
}
