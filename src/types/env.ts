import type { D1Database, KVNamespace, Queue, R2Bucket } from '@cloudflare/workers-types';
import type { EmailProvider } from './company';

export interface CloudflareEmailBinding {
  send(params: {
    to: string | string[];
    from: string | { email: string; name?: string };
    subject: string;
    html?: string;
    text?: string;
    cc?: string | string[];
    bcc?: string | string[];
    replyTo?: string | { email: string; name?: string };
    attachments?: Array<{
      content: string | ArrayBuffer;
      filename: string;
      type: string;
      disposition: 'attachment' | 'inline';
      contentId?: string;
    }>;
  }): Promise<{ messageId: string }>;
}

export interface Env {
  DB: D1Database;
  ADMIN_SECRET: string;
  JWT_SECRET: string;
  Variables: { site_id: string; company_id: string };
  RATE_LIMIT_KV?: KVNamespace;
  ENCRYPTION_KEY: string;
  CLOUDINARY_API_KEY?: string;
  CLOUDINARY_API_SECRET?: string;
  CLOUDINARY_CLOUD_NAME?: string;
  R2_BUCKET?: R2Bucket;
  BASE_URL?: string;
  EMAIL?: CloudflareEmailBinding;
  ADMIN_API_KEY?: string;
  SUBMISSIONS_QUEUE?: Queue<any>;
  // Comma-separated allow-list of trusted Clerk issuer URLs/hostnames for JWKS verification.
  // Official *.clerk.accounts.dev / *.clerk.accounts.com are always trusted.
  CLERK_ISSUER?: string;

  // Pluggable Self-Hosted / Docker Email Defaults (used when workspace uses default provider or EMAIL binding is absent)
  DEFAULT_EMAIL_PROVIDER?: EmailProvider;
  DEFAULT_EMAIL_API_KEY?: string;
  RESEND_API_KEY?: string;
  SMTP2GO_API_KEY?: string;
  MAILERSEND_API_KEY?: string;
  MAILTRAP_API_KEY?: string;
  EMAIL_WEBHOOK_URL?: string;
  DEFAULT_FROM_EMAIL?: string;
  DEFAULT_FROM_NAME?: string;

  // Pluggable Self-Hosted / Docker Queue Configuration
  QUEUE_DRIVER?: 'cloudflare' | 'memory' | 'http';
  QUEUE_WEBHOOK_URL?: string;
  QUEUE_WEBHOOK_TOKEN?: string;
  QUEUE_MAX_RETRIES?: string;
}

export interface APIResponse<T> {
  success: boolean;
  data: T;
  message: string;
}
