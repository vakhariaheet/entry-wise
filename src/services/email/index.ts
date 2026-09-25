import { CloudflareEmailService } from './cloudflare.service';
import { MailerSendEmailService } from './mailersend.service';
import { MailtrapEmailService } from './mailtrap.service';
import { ResendEmailService } from './resend.service';
import { Smtp2GoEmailService } from './smtp2go.service';
import type { EmailService, EmailServiceConfig } from './types';

export class EmailServiceFactory {
  static createEmailService({ provider, apiKey, binding }: EmailServiceConfig): EmailService {
    switch (provider) {
      case 'cloudflare':
        if (!binding)
          throw new Error('Cloudflare EMAIL binding is required for the cloudflare provider');
        return new CloudflareEmailService(binding);
      case 'resend':
        if (!apiKey) throw new Error('API key is required for the resend provider');
        return new ResendEmailService(apiKey);
      case 'mailersend':
        if (!apiKey) throw new Error('API key is required for the mailersend provider');
        return new MailerSendEmailService(apiKey);
      case 'mailtrap':
        if (!apiKey) throw new Error('API key is required for the mailtrap provider');
        return new MailtrapEmailService(apiKey);
      case 'smtp2go':
        if (!apiKey) throw new Error('API key is required for the smtp2go provider');
        return new Smtp2GoEmailService(apiKey);
      default:
        throw new Error(`Unsupported email provider: ${provider}`);
    }
  }
}

export * from './cloudflare.service';
export * from './mailersend.service';
export * from './mailtrap.service';
export * from './resend.service';
export * from './smtp2go.service';
// Export everything for convenience
export * from './types';
