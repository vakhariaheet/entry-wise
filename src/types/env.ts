import type { D1Database, KVNamespace, Queue, R2Bucket } from '@cloudflare/workers-types';
import { z } from 'zod';

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
  RATE_LIMIT_KV: KVNamespace;
  ENCRYPTION_KEY: string;
  CLOUDINARY_API_KEY: string;
  CLOUDINARY_API_SECRET: string;
  CLOUDINARY_CLOUD_NAME: string;
  R2_BUCKET: R2Bucket;
  BASE_URL: string;
  EMAIL: CloudflareEmailBinding;
  ADMIN_API_KEY?: string;
  SUBMISSIONS_QUEUE?: Queue<any>;
}

export interface APIResponse<T> {
  success: boolean;
  data: T;
  message: string;
}
