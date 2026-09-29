import type { Context } from 'hono';
import { assertSiteOwnership } from '../../../middleware/authorize';
import { processSubmissionDelivery } from '../../../queue/submissionProcessor';
import type { Env } from '../../../types/env';
import type { Site } from '../../../types/site';
import { sendOk, sendProblemDetails } from '../../../utils/sendResponse';

export const testSubmission = async (c: Context<{ Bindings: Env }>) => {
  try {
    const siteId = c.req.param('site_id') || c.req.param('id');
    if (!siteId) {
      return sendProblemDetails(c, 400, 'Site ID path parameter is required');
    }

    const authorized = await assertSiteOwnership(c, siteId);
    if (!authorized) {
      return sendProblemDetails(
        c,
        403,
        'Access denied: You do not have permission to test this site pipeline'
      );
    }

    const site = await c.env.DB.prepare('SELECT * FROM sites WHERE id = ?')
      .bind(siteId)
      .first<Site>();

    if (!site) {
      return sendProblemDetails(c, 404, `Site with ID '${siteId}' not found`);
    }

    const body = await c.req.json().catch(() => ({}));
    const mockFields: Record<string, string> =
      body.fields && typeof body.fields === 'object' && Object.keys(body.fields).length > 0
        ? body.fields
        : {
            name: 'Alex Rivera',
            email: 'alex.rivera@example.com',
            message:
              'Testing the EntryWise pipeline! Verifying edge persistence, email, and webhooks.',
            company: 'Acme Innovations',
            phone: '+1 (555) 019-2834',
            source: 'Pipeline Smoke Test',
          };

    const submissionId = `sub_test_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
    const startTime = Date.now();

    // 1. Commit mock submission to D1
    const { success } = await c.env.DB.prepare(`
      INSERT INTO submissions (id, site_id, data, status, ip_address, is_test)
      VALUES (?, ?, ?, 'new', '127.0.0.1', 1)
    `)
      .bind(submissionId, siteId, JSON.stringify(mockFields))
      .run();

    const dbLatencyMs = Date.now() - startTime;

    if (!success) {
      return sendProblemDetails(c, 500, 'Failed to write test submission to database');
    }

    // 2. Fetch configured webhooks
    const { results: activeWebhooks } = await c.env.DB.prepare(`
      SELECT id, name, url, is_active FROM webhooks WHERE site_id = ? AND is_active = 1
    `)
      .bind(siteId)
      .all<any>();

    // 3. Dispatch real downstream delivery in background if requested or by default
    const shouldDispatch = body.dispatch_connectors !== false;
    if (shouldDispatch) {
      const queueMessage = {
        submissionId,
        siteId,
        companyId: site.company_id,
        fields: mockFields,
        submitterEmail: mockFields.email || 'alex.rivera@example.com',
        submitterName: mockFields.name || 'Alex Rivera',
        timestamp: new Date().toISOString(),
      };

      if (c.executionCtx && typeof c.executionCtx.waitUntil === 'function') {
        c.executionCtx.waitUntil(processSubmissionDelivery(queueMessage as any, c.env));
      } else {
        // Run asynchronously without awaiting to keep test endpoint responsive
        processSubmissionDelivery(queueMessage as any, c.env).catch((err) =>
          console.error('[Test Submission Delivery Error]', err)
        );
      }
    }

    return sendOk(c, {
      success: true,
      submission_id: submissionId,
      dispatched: shouldDispatch,
      latency_ms: dbLatencyMs,
      test_data: mockFields,
      pipeline: {
        edge_ingestion: {
          status: 'ok',
          latency_ms: dbLatencyMs,
          message: 'Edge D1 SQLite commit verified',
        },
        database_commit: {
          status: 'ok',
          submission_id: submissionId,
        },
        email_notification: {
          enabled: site.notify_on_submission !== 0,
          recipient: site.notification_emails || site.admin_email || 'Not configured',
        },
        google_sheets: {
          configured: Boolean(site.google_sheets_url),
          url: site.google_sheets_url ? 'Configured' : null,
        },
        slack: {
          configured: Boolean(site.slack_webhook_url),
        },
        discord: {
          configured: Boolean(site.discord_webhook_url),
        },
        webhooks: (activeWebhooks || []).map((w) => ({
          id: w.id,
          name: w.name,
          url: w.url,
        })),
      },
    });
  } catch (error) {
    console.error('Test submission error:', error);
    return sendProblemDetails(c, 500, 'Internal server error while executing test submission');
  }
};
