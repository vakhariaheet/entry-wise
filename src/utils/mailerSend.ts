import { Buffer } from "node:buffer";
interface Attachment {
    filename: string;
    content: string; // base64 encoded
    type?: string;
}

interface SendEmailParams {
    from: string;
    fromName: string;
    to: string;
    subject: string;
    html: string;
    attachments?: Array<{
        filename: string;
        content: string;
        type?: string;
    }>;
}

export const sendMailTrapAndMailerSendEmail = async (
    apiKey: string,
    provider: 'mailersend' | 'mailtrap',
    { from, fromName, to, subject, html, attachments = [] }: SendEmailParams
) => {
    const BASE_URL = provider === 'mailersend' ? 'https://api.mailersend.com/v1/email' : 'https://send.api.mailtrap.io/api/send';

    try {
        // Convert attachments to base64
      

        const payload = {
            from: {
                email: from,
                name: fromName
            },
            to: [
                {
                    email: to
                }
            ],
            subject,
            html,
            attachments: attachments.length > 0 ? attachments : undefined
        };

        const response = await fetch(BASE_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`${provider} API error (${response.status}): ${JSON.stringify(error)}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`Error sending email via ${provider}:`, error);
        if (error instanceof Error) {
            throw new Error(`${provider} API error: ${JSON.stringify(error)}`);
        }
        throw new Error('Unknown error occurred while sending email');
    }
};