import { EmailService, EmailServiceConfig } from './types';
import { ResendEmailService } from './resend.service';
import { MailerSendEmailService } from './mailersend.service';
import { MailtrapEmailService } from './mailtrap.service';
import { Smtp2GoEmailService } from './smtp2go.service';

export class EmailServiceFactory {
    static createEmailService({ provider, apiKey }: EmailServiceConfig): EmailService {
        switch (provider) {
            case 'resend':
                return new ResendEmailService(apiKey);
            case 'mailersend':
                return new MailerSendEmailService(apiKey);
            case 'mailtrap':
                return new MailtrapEmailService(apiKey);
            case 'smtp2go':
                return new Smtp2GoEmailService(apiKey);
            default:
                throw new Error(`Unsupported email provider: ${provider}`);
        }
    }
}
    
// Export everything for convenience
export * from './types';
export * from './resend.service';
export * from './mailersend.service';
export * from './mailtrap.service';
export * from './smtp2go.service';