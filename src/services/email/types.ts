import { EmailProvider } from '../../types/company';

export interface EmailAttachment {
    filename: string;
    content: string; // base64 encoded
    type?: string;
}

export interface SendEmailParams {
    from: string;
    fromName: string;
    to: string;
    subject: string;
    html: string;
    attachments?: EmailAttachment[];
}

export interface EmailService {
    send(params: SendEmailParams): Promise<any>;
}

export interface EmailServiceConfig {
    apiKey: string;
    provider: EmailProvider;
}
