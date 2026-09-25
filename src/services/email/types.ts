import { EmailProvider } from '../../types/company';
import { CloudflareEmailBinding } from '../../types/env';

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
    replyTo?: string;
    attachments?: EmailAttachment[];
}

export interface EmailService {
    send(params: SendEmailParams): Promise<any>;
}

export interface EmailServiceConfig {
    provider: EmailProvider;
    apiKey?: string;
    binding?: CloudflareEmailBinding;
}
