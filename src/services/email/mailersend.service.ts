import { EmailService, SendEmailParams } from './types';

export class MailerSendEmailService implements EmailService {
    private readonly MAILERSEND_API = 'https://api.mailersend.com/v1/email';

    constructor(private readonly apiKey: string) {}

    async send(params: SendEmailParams) {
        const { from, fromName, to, subject, html, attachments = [] } = params;

        const payload = {
            from: {
                email: from,
                name: fromName
            },
            to: [{ email: to }],
            subject,
            html,
            attachments: attachments.length > 0 ? attachments : undefined
        };

        const response = await fetch(this.MAILERSEND_API, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`MailerSend API error (${response.status}): ${JSON.stringify(error)}`);
        }

        return await response.json();
    }
}
