import { describe, expect, it, mock } from 'bun:test';
import {
  inferFieldType,
  sanitizeHeaderValue,
  submitForm,
} from '../src/controllers/v1/submissions/submitForm';
import { app } from '../src/index';
import { dispatchAirtable } from '../src/services/connectors/airtable';
import {
  dispatchNotion,
  normalizeNotionDatabaseId,
} from '../src/services/connectors/notion';
import { redactSiteSecrets } from '../src/utils/redactSite';

describe('Lightweight Competitor Features & Self-Hosted Class Binder', () => {
  describe('1. Magic HTML Directives & Header Sanitization', () => {
    it('strips CRLF and control characters from _subject, _replyto, and _cc', () => {
      expect(sanitizeHeaderValue('New Inquiry\r\nBcc: attacker@evil.com')).toBe(
        'New Inquiry Bcc: attacker@evil.com'
      );
      expect(sanitizeHeaderValue('  Hello World  ')).toBe('Hello World');
      expect(sanitizeHeaderValue(null)).toBeUndefined();
      expect(sanitizeHeaderValue('')).toBeUndefined();
    });
  });

  describe('2. Auto-Schema Discovery Type Inference', () => {
    it('accurately infers email, phone, url, and text types from field names and values', () => {
      expect(inferFieldType('work_email', 'alex@acme.com')).toBe('email');
      expect(inferFieldType('contact', 'user@domain.org')).toBe('email');
      expect(inferFieldType('phone_number', '+1 555-019-2834')).toBe('phone');
      expect(inferFieldType('whatsapp', '1234567890')).toBe('phone');
      expect(inferFieldType('portfolio_url', 'https://example.com')).toBe('url');
      expect(inferFieldType('bio', 'https://github.com/user')).toBe('url');
      expect(inferFieldType('full_name', 'Alex Rivera')).toBe('text');
    });

    it('auto-populates site schema on first submission when 0 fields are defined and strips magic _* fields', async () => {
      const insertedFields: Array<{ name: string; type: string }> = [];
      let storedSubmissionData = '';
      let enqueuedMessage: any = null;

      const mockEnv: any = {
        DB: {
          prepare: (sql: string) => ({
            bind: (...args: any[]) => ({
              all: async () => {
                if (sql.includes('FROM sites')) {
                  return {
                    results: [
                      {
                        id: 'site_123',
                        company_id: 'comp_123',
                        domain: 'acme.com',
                        name: 'Acme Form',
                        anonymize_ip: 0,
                      },
                    ],
                  };
                }
                if (sql.includes('FROM fields')) return { results: [] };
                return { results: [] };
              },
              run: async () => {
                if (sql.includes('INSERT INTO submissions')) {
                  storedSubmissionData = args[2];
                }
                if (sql.includes('INSERT INTO fields')) {
                  insertedFields.push({ name: args[2], type: args[3] });
                }
                return { success: true };
              },
            }),
          }),
          batch: async (stmts: any[]) => {
            for (const s of stmts) await s.run();
            return [];
          },
        },
        SUBMISSIONS_QUEUE: {
          send: async (msg: any) => {
            enqueuedMessage = msg;
          },
        },
      };

      const req = new Request('https://entrywise.si/f/ew_live_test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          name: 'Alex Rivera',
          email: 'alex@acme.com',
          website: 'https://acme.com',
          _subject: 'Custom Subject Line\r\nInjected',
          _replyto: 'reply@acme.com',
          _cc: 'team@acme.com, sales@acme.com',
          _gotcha: '',
        }),
      });

      const ctx: any = {
        req: {
          raw: req,
          param: () => 'ew_live_test',
          query: () => undefined,
          header: (name: string) => req.headers.get(name) ?? undefined,
          json: () => req.clone().json(),
        },
        env: mockEnv,
        get: (key: string) => {
          if (key === 'site_id') return 'site_123';
          if (key === 'company_id') return 'comp_123';
          return undefined;
        },
        json: (body: any, status = 200) =>
          new Response(JSON.stringify(body), { status }),
      };

      const res = await submitForm(ctx);
      expect(res.status).toBe(200);

      // Verify magic _* fields were stripped from stored data
      const parsedStored = JSON.parse(storedSubmissionData);
      expect(parsedStored).toEqual({
        name: 'Alex Rivera',
        email: 'alex@acme.com',
        website: 'https://acme.com',
      });
      expect(parsedStored._subject).toBeUndefined();
      expect(parsedStored._replyto).toBeUndefined();
      expect(parsedStored._cc).toBeUndefined();

      // Verify magic fields were sanitized and passed to queue message
      expect(enqueuedMessage.magicSubject).toBe('Custom Subject Line Injected');
      expect(enqueuedMessage.magicReplyTo).toBe('reply@acme.com');
      expect(enqueuedMessage.magicCc).toBe('team@acme.com, sales@acme.com');

      // Verify Auto-Schema Discovery populated the 3 fields with inferred types
      expect(insertedFields).toEqual([
        { name: 'name', type: 'text' },
        { name: 'email', type: 'email' },
        { name: 'website', type: 'url' },
      ]);
    });
  });

  describe('3. Drop-in Class-Name Auto-Binder (/embed.js)', () => {
    it('serves GET /embed.js with CORS headers, custom class support, and self-hosted origin detection', async () => {
      const res = await app.request('http://localhost/embed.js');
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('application/javascript');
      expect(res.headers.get('access-control-allow-origin')).toBe('*');

      const scriptText = await res.text();
      expect(scriptText).toContain('.entrywise-form');
      expect(scriptText).toContain('data-class');
      expect(scriptText).toContain('data-endpoint');
      expect(scriptText).toContain('EntryWise');
      expect(scriptText.length).toBeLessThan(4000);
    });
  });

  describe('4. Airtable & Notion Connectors + Secret Redaction', () => {
    it('redacts airtable_token and notion_token while exposing boolean configured flags', () => {
      const rawSite = {
        id: 'site_1',
        name: 'Test',
        airtable_token: 'patSecret123',
        airtable_base_id: 'appBase123',
        notion_token: 'ntn_Secret456',
        notion_database_id: 'db456',
      };
      const redacted = redactSiteSecrets(rawSite);
      expect(redacted.airtable_token).toBeNull();
      expect(redacted.notion_token).toBeNull();
      expect(redacted.airtable_configured).toBe(true);
      expect(redacted.notion_configured).toBe(true);
    });

    it('normalizes Notion Database IDs from full URLs and raw 32-char hex strings', () => {
      const url =
        'https://www.notion.so/myworkspace/a8aec43384f447ed84390e8e42c2e089?v=123456';
      expect(normalizeNotionDatabaseId(url)).toBe(
        'a8aec43384f447ed84390e8e42c2e089'
      );
      expect(
        normalizeNotionDatabaseId('a8aec433-84f4-47ed-8439-0e8e42c2e089')
      ).toBe('a8aec433-84f4-47ed-8439-0e8e42c2e089');
    });

    it('dispatches Airtable records with typecast: true', async () => {
      const originalFetch = globalThis.fetch;
      let capturedBody: any = null;
      globalThis.fetch = mock(async (_url: any, init: any) => {
        capturedBody = JSON.parse(init.body);
        return new Response(JSON.stringify({ records: [{ id: 'rec123' }] }), {
          status: 200,
        });
      }) as any;

      try {
        const res = await dispatchAirtable(
          { token: 'pat_test', baseId: 'app12345', tableName: 'Leads' },
          {
            siteDomain: 'acme.com',
            submissionId: 'sub_123',
            formData: { name: 'Alex', email: 'alex@acme.com' },
          }
        );
        expect(res.success).toBe(true);
        expect(capturedBody.typecast).toBe(true);
        expect(capturedBody.records[0].fields).toEqual({
          name: 'Alex',
          email: 'alex@acme.com',
        });
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('dispatches Notion database pages with auto-discovered title & properties', async () => {
      const originalFetch = globalThis.fetch;
      let pagePayload: any = null;

      globalThis.fetch = mock(async (url: any, init: any) => {
        if (String(url).includes('/v1/databases/')) {
          return new Response(
            JSON.stringify({
              properties: {
                Name: { id: 'title', type: 'title' },
                Email: { id: 'email_1', type: 'email' },
              },
            }),
            { status: 200 }
          );
        }
        pagePayload = JSON.parse(init.body);
        return new Response(JSON.stringify({ id: 'page_123' }), { status: 200 });
      }) as any;

      try {
        const res = await dispatchNotion(
          {
            token: 'ntn_secret',
            databaseId: 'a8aec43384f447ed84390e8e42c2e089',
          },
          {
            siteDomain: 'acme.com',
            submissionId: 'sub_123',
            formData: {
              name: 'Alex Rivera',
              email: 'alex@acme.com',
              message: 'Hello Notion',
            },
          }
        );
        expect(res.success).toBe(true);
        expect(pagePayload.parent.database_id).toBe(
          'a8aec43384f447ed84390e8e42c2e089'
        );
        expect(pagePayload.properties.Name.title[0].text.content).toBe(
          'Alex Rivera'
        );
        expect(pagePayload.properties.Email.email).toBe('alex@acme.com');
        expect(pagePayload.children.length).toBeGreaterThan(0);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});
