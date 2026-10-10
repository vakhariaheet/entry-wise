import { describe, expect, it, mock } from 'bun:test';
import { app } from '../src/index';
import { createMemoryKVAdapter } from '../src/runtime/kvAdapter';
import { createQueueAdapter } from '../src/runtime/queueAdapter';
import { initPersistentSqliteDb, runSqliteMigrations } from '../src/runtime/sqliteAdapter';
import { EmailServiceFactory } from '../src/services/email';
import type { Env } from '../src/types/env';
import type { SubmissionQueueMessage } from '../src/types/queue';

describe('Docker Self-Hosting & Zero Cloudflare Lock-In Runtime', () => {
  it('1. Applies all SQL migrations on bun:sqlite and runs idempotently on restart', async () => {
    const { sqlite, d1, appliedMigrations } = initPersistentSqliteDb(':memory:', './migrations');
    expect(appliedMigrations.length).toBeGreaterThanOrEqual(9);

    // Running migrations a second time should be a no-op
    const secondRun = runSqliteMigrations(sqlite, './migrations');
    expect(secondRun.length).toBe(0);

    // Verify D1-compatible prepare/bind/first/all/run works on migrated schema
    await d1
      .prepare(
        `INSERT INTO companies (id, name, email_provider, from_email, from_name) VALUES (?, ?, ?, ?, ?)`
      )
      .bind('comp_docker_1', 'Docker Corp', 'cloudflare', 'forms@dockercorp.io', 'Docker Corp')
      .run();

    const company = await d1
      .prepare('SELECT * FROM companies WHERE id = ?')
      .bind('comp_docker_1')
      .first<{ id: string; name: string }>();

    expect(company?.name).toBe('Docker Corp');
    sqlite.close();
  });

  it('2. Resolves non-Cloudflare default email provider from environment when env.EMAIL is absent', async () => {
    const { sqlite, d1 } = initPersistentSqliteDb(':memory:', './migrations');

    const baseCompany = {
      email_provider: 'cloudflare' as const,
      from_email: 'no-reply@entrywise.webbound.in',
      from_name: 'EntryWise',
      name: 'Acme Self-Hosted',
    };

    // Case A: No env.EMAIL and no API keys -> falls back safely to 'console' provider
    const consoleEnv: Env = {
      DB: d1,
      ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      JWT_SECRET: 'test-jwt-secret-32-characters-long',
      DEFAULT_FROM_EMAIL: 'alerts@selfhosted.dev',
    };
    const resolvedConsole = EmailServiceFactory.resolveForCompany(baseCompany, consoleEnv);
    expect(resolvedConsole.provider).toBe('console');
    expect(resolvedConsole.fromEmail).toBe('alerts@selfhosted.dev');

    // Case B: RESEND_API_KEY present in .env -> auto-detects 'resend' without Cloudflare Email
    const resendEnv: Env = {
      ...consoleEnv,
      RESEND_API_KEY: 're_test_docker_key',
    };
    const resolvedResend = EmailServiceFactory.resolveForCompany(baseCompany, resendEnv);
    expect(resolvedResend.provider).toBe('resend');

    // Case C: EMAIL_WEBHOOK_URL present in .env -> auto-detects 'webhook' email bridge
    const webhookEnv: Env = {
      ...consoleEnv,
      EMAIL_WEBHOOK_URL: 'https://mail-bridge.internal/send',
    };
    const resolvedWebhook = EmailServiceFactory.resolveForCompany(baseCompany, webhookEnv);
    expect(resolvedWebhook.provider).toBe('webhook');

    sqlite.close();
  });

  it('3. Supports pluggable HTTP Queue driver (QUEUE_DRIVER=http) with Bearer token auth', async () => {
    const { sqlite, d1 } = initPersistentSqliteDb(':memory:', './migrations');
    let capturedQueueBody: SubmissionQueueMessage | null = null;
    let capturedAuthHeader: string | null = null;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      capturedAuthHeader = headers.get('Authorization');
      capturedQueueBody = JSON.parse(String(init?.body)) as SubmissionQueueMessage;
      return new Response(JSON.stringify({ queued: true }), { status: 200 });
    }) as unknown as typeof fetch;

    try {
      const env: Env = {
        DB: d1,
        ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        JWT_SECRET: 'test-jwt-secret-32-characters-long',
        QUEUE_DRIVER: 'http',
        QUEUE_WEBHOOK_URL: 'https://qstash.example.com/v2/publish',
        QUEUE_WEBHOOK_TOKEN: 'qstash_secret_123',
      };

      const { queue } = createQueueAdapter(() => env);
      await queue.send({
        type: 'submission.process',
        submissionId: 'sub_http_1',
        siteId: 'site_1',
        companyId: 'comp_1',
        fields: { email: 'dev@docker.io', message: 'Hello from HTTP Queue' },
        savedAttachmentMeta: [],
        submitterEmail: 'dev@docker.io',
        submitterName: 'Docker Dev',
        ipAddress: '127.0.0.1',
        submittedAt: new Date().toISOString(),
      });

      expect(capturedAuthHeader).toBe('Bearer qstash_secret_123');
      expect(capturedQueueBody?.submissionId).toBe('sub_http_1');
      expect(queue.getStats().driver).toBe('http');
      expect(queue.getStats().processed).toBe(1);
    } finally {
      globalThis.fetch = originalFetch;
      sqlite.close();
    }
  });

  it('4. Processes end-to-end form submission via Docker runtime adapters with zero Cloudflare bindings', async () => {
    const { sqlite, d1 } = initPersistentSqliteDb(':memory:', './migrations');
    const kv = createMemoryKVAdapter();

    // Seed workspace and site in SQLite
    await d1
      .prepare(
        `INSERT INTO companies (id, name, email_provider, from_email, from_name) VALUES (?, ?, ?, ?, ?)`
      )
      .bind('comp_self', 'SelfHost Co', 'cloudflare', 'no-reply@selfhost.co', 'SelfHost Co')
      .run();

    await d1
      .prepare(
        `INSERT INTO sites (id, company_id, name, domain, api_key, admin_email, notify_on_submission) VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        'site_self',
        'comp_self',
        'Docker Contact Form',
        'selfhost.co',
        'ew_docker_live_key',
        'admin@selfhost.co',
        1
      )
      .run();

    let runtimeEnv: Env;
    const { binding: queueBinding, queue } = createQueueAdapter(() => runtimeEnv);

    runtimeEnv = {
      DB: d1,
      RATE_LIMIT_KV: kv,
      SUBMISSIONS_QUEUE: queueBinding,
      ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      JWT_SECRET: 'test-jwt-secret-32-characters-long',
      QUEUE_DRIVER: 'memory',
      DEFAULT_EMAIL_PROVIDER: 'console',
    };

    const req = new Request('http://localhost:8787/f/ew_docker_live_key', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '203.0.113.42',
      },
      body: JSON.stringify({
        name: 'Elena Rostova',
        email: 'elena@selfhost.co',
        message: 'Running EntryWise inside Docker without Cloudflare!',
      }),
    });

    const res = await app.fetch(req, runtimeEnv);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { is_success: boolean; submission_id: string };
    expect(body.is_success).toBe(true);
    expect(body.submission_id).toContain('sub_');

    // Allow microtask queue to finish processing
    await new Promise((r) => setTimeout(r, 30));
    expect(queue.getStats().enqueued).toBe(1);
    expect(queue.getStats().processed).toBe(1);

    // Verify auto-discovered fields and stored submission in SQLite
    const savedSub = await d1
      .prepare('SELECT * FROM submissions WHERE id = ?')
      .bind(body.submission_id)
      .first<{ ip_address: string; data: string }>();

    expect(savedSub?.ip_address).toBe('203.0.113.42');
    expect(JSON.parse(savedSub?.data || '{}').email).toBe('elena@selfhost.co');

    sqlite.close();
  });
});
