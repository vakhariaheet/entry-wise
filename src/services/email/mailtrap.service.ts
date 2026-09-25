import type { EmailService, SendEmailParams } from './types';

export class MailtrapEmailService implements EmailService {
  private readonly MAILTRAP_API = 'https://send.api.mailtrap.io/api/send';

  constructor(private readonly apiKey: string) {}

  async send(params: SendEmailParams) {
    const { from, fromName, to, subject, html, replyTo, attachments = [] } = params;

    const payload: Record<string, any> = {
      from: {
        email: from,
        name: fromName,
      },
      to: [{ email: to }],
      subject,
      html,
      attachments: attachments.length > 0 ? attachments : undefined,
    };

    if (replyTo) {
      payload.headers = { 'Reply-To': replyTo };
    }

    const response = await fetch(this.MAILTRAP_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Mailtrap API error (${response.status}): ${JSON.stringify(error)}`);
    }

    return await response.json();
  }
}
