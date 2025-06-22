import { EmailService, SendEmailParams } from './types';


interface SMTP2GOResponse {
  request_id: string;
  data: SMTP2GOSuccessData | SMTP2GOErrorResponse;
}

interface SMTP2GOErrorResponse {
  error_code: string;
  error: string;
}

interface SMTP2GOSuccessData {
  succeeded: number;
  failed: number;
  failures: any[];
  email_id: string;
}
class Smtp2GoEmailService implements EmailService {
    private readonly SMTP2GO_API = 'https://api.smtp2go.com/v3/email/send';
    
    constructor(private readonly apiKey: string) {}
    async send(params: SendEmailParams): Promise<void> {
        const { from, fromName, to, subject, html, attachments = [] } = params;

        const payload = {
            sender: `${fromName} <${from}>`,
            to: [to],
            subject,
            html_body: html,
            attachments: attachments.length > 0 ? attachments.map(file => ({
                filename: file.filename,
                fileblob: file.content,
                mimetype: file.type ?? 'application/octet-stream',
            })) : undefined
        };

        const response = await fetch(this.SMTP2GO_API, {
            method: 'POST',
            headers: {
                'X-Smtp2go-Api-Key': this.apiKey,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        }).then<Promise<SMTP2GOResponse>>(res => res.json() as Promise<SMTP2GOResponse>);
        if ('error_code' in response.data) {
            const error: SMTP2GOErrorResponse = response.data;
            throw new Error(`SMTP2GO API error (${response.request_id}): ${JSON.stringify(error)}`);
        }
    }
}


export { Smtp2GoEmailService };
