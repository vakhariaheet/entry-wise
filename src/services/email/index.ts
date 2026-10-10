import type { Company, EmailProvider } from '../../types/company';
import type { Env } from '../../types/env';
import { CloudflareEmailService } from './cloudflare.service';
import { MailerSendEmailService } from './mailersend.service';
import { MailtrapEmailService } from './mailtrap.service';
import { ResendEmailService } from './resend.service';
import { Smtp2GoEmailService } from './smtp2go.service';
import type { EmailService, EmailServiceConfig, SendEmailParams } from './types';

export class WebhookEmailService implements EmailService {
  constructor(private readonly webhookUrl: string) {}

  async send(params: SendEmailParams): Promise<unknown> {
    const response = await fetch(this.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'EntryWise-Email-Dispatcher/1.0',
      },
      body: JSON.stringify({
        event: 'email.send',
        timestamp: new Date().toISOString(),
        ...params,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Email webhook failed (${response.status}): ${errorText.slice(0, 200)}`);
    }

    return { delivered: true, provider: 'webhook', status: response.status };
  }
}

export class ConsoleEmailService implements EmailService {
  async send(params: SendEmailParams): Promise<unknown> {
    console.info(
      `[EntryWise Email Console] To: ${params.to} | From: "${params.fromName}" <${params.from}> | Subject: ${params.subject}`
    );
    return { delivered: true, provider: 'console', to: params.to, subject: params.subject };
  }
}

export interface ResolvedEmailContext {
  service: EmailService;
  provider: EmailProvider;
  fromEmail: string;
  fromName: string;
}

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
      case 'webhook':
        if (!apiKey)
          throw new Error('Webhook URL (EMAIL_WEBHOOK_URL) is required for the webhook provider');
        return new WebhookEmailService(apiKey);
      case 'console':
        return new ConsoleEmailService();
      default:
        throw new Error(`Unsupported email provider: ${provider}`);
    }
  }

  /**
   * Resolves the email provider and credentials for a workspace, falling back to
   * Docker / self-hosted environment variables when Cloudflare Email is not bound
   * or when a default provider is configured via `.env`.
   */
  static resolveForCompany(
    company: Pick<Company, 'email_provider' | 'from_email' | 'from_name' | 'name'>,
    env: Env,
    decryptedApiKey?: string
  ): ResolvedEmailContext {
    let provider: EmailProvider =
      company.email_provider || env.DEFAULT_EMAIL_PROVIDER || 'cloudflare';
    let apiKey = decryptedApiKey?.trim() || '';

    const getEnvKeyForProvider = (target: EmailProvider): string => {
      switch (target) {
        case 'resend':
          return env.RESEND_API_KEY || env.DEFAULT_EMAIL_API_KEY || '';
        case 'smtp2go':
          return env.SMTP2GO_API_KEY || env.DEFAULT_EMAIL_API_KEY || '';
        case 'mailersend':
          return env.MAILERSEND_API_KEY || env.DEFAULT_EMAIL_API_KEY || '';
        case 'mailtrap':
          return env.MAILTRAP_API_KEY || env.DEFAULT_EMAIL_API_KEY || '';
        case 'webhook':
          return env.EMAIL_WEBHOOK_URL || env.DEFAULT_EMAIL_API_KEY || '';
        default:
          return env.DEFAULT_EMAIL_API_KEY || '';
      }
    };

    // If workspace uses default 'cloudflare', check if DEFAULT_EMAIL_PROVIDER overrides it or if env.EMAIL is absent
    if (provider === 'cloudflare' && (!env.EMAIL || env.DEFAULT_EMAIL_PROVIDER)) {
      if (env.DEFAULT_EMAIL_PROVIDER && env.DEFAULT_EMAIL_PROVIDER !== 'cloudflare') {
        provider = env.DEFAULT_EMAIL_PROVIDER;
      } else if (env.RESEND_API_KEY) {
        provider = 'resend';
      } else if (env.SMTP2GO_API_KEY) {
        provider = 'smtp2go';
      } else if (env.MAILERSEND_API_KEY) {
        provider = 'mailersend';
      } else if (env.MAILTRAP_API_KEY) {
        provider = 'mailtrap';
      } else if (env.EMAIL_WEBHOOK_URL) {
        provider = 'webhook';
      } else if (!env.EMAIL) {
        provider = 'console';
      }
    }

    if (!apiKey && provider !== 'cloudflare' && provider !== 'console') {
      apiKey = getEnvKeyForProvider(provider);
    }

    const fromEmail =
      company.from_email && company.from_email !== 'no-reply@entrywise.si'
        ? company.from_email
        : env.DEFAULT_FROM_EMAIL || company.from_email || 'no-reply@entrywise.si';

    const fromName = company.from_name || env.DEFAULT_FROM_NAME || company.name || 'EntryWise';

    const service = EmailServiceFactory.createEmailService({
      provider,
      apiKey: apiKey || undefined,
      binding: provider === 'cloudflare' ? env.EMAIL : undefined,
    });

    return {
      service,
      provider,
      fromEmail,
      fromName,
    };
  }
}

export * from './cloudflare.service';
export * from './mailersend.service';
export * from './mailtrap.service';
export * from './resend.service';
export * from './smtp2go.service';
export * from './types';
