import { existsSync } from 'node:fs';
import { join, normalize } from 'node:path';
import { app } from './index';
import { createLocalR2Adapter, createMemoryKVAdapter } from './runtime/kvAdapter';
import { createQueueAdapter } from './runtime/queueAdapter';
import { initPersistentSqliteDb } from './runtime/sqliteAdapter';
import type { EmailProvider } from './types/company';
import type { Env } from './types/env';

const PORT = Number.parseInt(process.env.PORT || '8787', 10) || 8787;
const HOST = process.env.HOST || '0.0.0.0';
const DB_PATH = process.env.DATABASE_PATH || './data/entrywise.sqlite';
const UPLOAD_DIR = process.env.UPLOAD_DIR || './data/uploads';
const MIGRATIONS_DIR = process.env.MIGRATIONS_DIR || './migrations';
const PUBLIC_DIR = process.env.PUBLIC_DIR || './public';

// 1. Initialize persistent SQLite database & run migrations automatically
const { d1, appliedMigrations } = initPersistentSqliteDb(DB_PATH, MIGRATIONS_DIR);

// 2. Initialize portable KV & R2 adapters
const rateLimitKv = createMemoryKVAdapter();
const localR2 = createLocalR2Adapter(UPLOAD_DIR);

// 3. Build runtime environment with pluggable Queue & Email configuration
let runtimeEnv: Env;
const { binding: queueBinding, queue: queueInstance } = createQueueAdapter(() => runtimeEnv);

const detectDefaultEmailProvider = (): EmailProvider => {
  const configured = process.env.DEFAULT_EMAIL_PROVIDER as EmailProvider | undefined;
  if (configured) return configured;
  if (process.env.RESEND_API_KEY) return 'resend';
  if (process.env.SMTP2GO_API_KEY) return 'smtp2go';
  if (process.env.MAILERSEND_API_KEY) return 'mailersend';
  if (process.env.MAILTRAP_API_KEY) return 'mailtrap';
  if (process.env.EMAIL_WEBHOOK_URL) return 'webhook';
  return 'console';
};

runtimeEnv = {
  DB: d1,
  RATE_LIMIT_KV: rateLimitKv,
  R2_BUCKET: localR2,
  SUBMISSIONS_QUEUE: queueBinding,
  ENCRYPTION_KEY:
    process.env.ENCRYPTION_KEY ||
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  JWT_SECRET:
    process.env.JWT_SECRET ||
    'entrywise-self-hosted-default-jwt-secret-change-in-production-32chars',
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
  CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY,
  CLERK_JWKS_URL: process.env.CLERK_JWKS_URL,
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
  DEFAULT_EMAIL_PROVIDER: detectDefaultEmailProvider(),
  DEFAULT_EMAIL_API_KEY: process.env.DEFAULT_EMAIL_API_KEY,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  SMTP2GO_API_KEY: process.env.SMTP2GO_API_KEY,
  MAILERSEND_API_KEY: process.env.MAILERSEND_API_KEY,
  MAILTRAP_API_KEY: process.env.MAILTRAP_API_KEY,
  EMAIL_WEBHOOK_URL: process.env.EMAIL_WEBHOOK_URL,
  DEFAULT_FROM_EMAIL: process.env.DEFAULT_FROM_EMAIL || 'no-reply@entrywise.local',
  DEFAULT_FROM_NAME: process.env.DEFAULT_FROM_NAME || 'EntryWise',
  QUEUE_DRIVER:
    (process.env.QUEUE_DRIVER as Env['QUEUE_DRIVER']) ||
    (process.env.QUEUE_WEBHOOK_URL ? 'http' : 'memory'),
  QUEUE_WEBHOOK_URL: process.env.QUEUE_WEBHOOK_URL,
  QUEUE_WEBHOOK_TOKEN: process.env.QUEUE_WEBHOOK_TOKEN,
  QUEUE_MAX_RETRIES: process.env.QUEUE_MAX_RETRIES || '3',
};

const executionCtx: ExecutionContext = {
  waitUntil(promise: Promise<unknown>) {
    promise.catch((err) => console.error('[ExecutionContext.waitUntil] Error:', err));
  },
  passThroughOnException() {
    // No-op in standalone server
  },
};

export const server = Bun.serve({
  hostname: HOST,
  port: PORT,
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);

    // Serve static assets from ./public (e.g. /openapi.yaml, /docs.html)
    if (req.method === 'GET' && existsSync(PUBLIC_DIR)) {
      const cleanPath = normalize(url.pathname).replace(/^(\.\.(\/|\\|$))+/, '');
      const candidatePath = join(
        PUBLIC_DIR,
        cleanPath === '/' ? 'index.html' : cleanPath.replace(/^\//, '')
      );
      if (
        (cleanPath === '/openapi.yaml' ||
          cleanPath === '/docs.html' ||
          cleanPath.startsWith('/assets/')) &&
        existsSync(candidatePath)
      ) {
        const file = Bun.file(candidatePath);
        return new Response(file);
      }
    }

    return app.fetch(req, runtimeEnv, executionCtx);
  },
});

console.info(`
┌──────────────────────────────────────────────────────────────┐
│  EntryWise Self-Hosted Server (Zero Cloudflare Lock-In)      │
├──────────────────────────────────────────────────────────────┤
│  Listening:      http://${HOST}:${PORT.toString().padEnd(36, ' ')}│
│  Database:       ${DB_PATH.padEnd(44, ' ')}│
│  Migrations:     ${`${appliedMigrations.length} newly applied`.padEnd(44, ' ')}│
│  Queue Driver:   ${(queueInstance.getStats().driver || 'memory').toUpperCase().padEnd(44, ' ')}│
│  Email Engine:   ${(runtimeEnv.DEFAULT_EMAIL_PROVIDER || 'console').toUpperCase().padEnd(44, ' ')}│
└──────────────────────────────────────────────────────────────┘
`);
