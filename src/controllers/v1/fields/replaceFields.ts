import type { Context } from 'hono';
import type { BulkCreateFieldBody, Field, FieldType } from '../../../schemas/field.schema';
import type { Env } from '../../../types/env';
import { sendOk, sendProblemDetails } from '../../../utils/sendResponse';

/**
 * Zalando RESTful Guideline (Rule 149): PUT on collection atomically replaces all items
 */
export const replaceFields = async (c: Context<{ Bindings: Env }>) => {
  try {
    const siteId = c.req.param('site_id');
    const body = (await c.req.json()) as BulkCreateFieldBody;

    if (!siteId) {
      return sendProblemDetails(c, 400, 'site_id path parameter is required');
    }

    if (!body.fields || !Array.isArray(body.fields)) {
      return sendProblemDetails(c, 422, 'fields must be an array', {
        invalidParams: [{ name: 'fields', reason: 'fields must be an array' }],
      });
    }

    // Verify site exists
    const { results: siteExists } = await c.env.DB.prepare(`
            SELECT id FROM sites WHERE id = ?
        `)
      .bind(siteId)
      .all();

    if (!siteExists?.length) {
      return sendProblemDetails(c, 404, `Site with ID '${siteId}' not found`);
    }

    // If array is empty, delete all fields and return empty array
    if (body.fields.length === 0) {
      await c.env.DB.prepare(`DELETE FROM fields WHERE site_id = ?`).bind(siteId).run();
      return sendOk(c, []);
    }

    // Check for duplicate names in the payload
    const names = body.fields.map((f) => f.name);
    if (new Set(names).size !== names.length) {
      return sendProblemDetails(c, 422, 'Duplicate field names found in fields payload', {
        invalidParams: [{ name: 'fields', reason: 'Field names must be unique within a site' }],
      });
    }

    // Execute atomic replacement in batch:
    // 1. Delete all existing fields for this site
    // 2. Insert all new fields
    const deleteStmt = c.env.DB.prepare(`DELETE FROM fields WHERE site_id = ?`).bind(siteId);

    const insertStmt = c.env.DB.prepare(`
            INSERT INTO fields (id, site_id, name, type)
            VALUES (?, ?, ?, ?)
        `);

    const insertBatch = body.fields.map((field: { name: string; type: FieldType }) =>
      insertStmt.bind(`field_${crypto.randomUUID()}`, siteId, field.name, field.type)
    );

    const batchResults = await c.env.DB.batch([deleteStmt, ...insertBatch]);
    if (!batchResults.every((r) => r.success)) {
      return sendProblemDetails(c, 500, 'Failed to replace fields');
    }

    const { results: updatedFields } = await c.env.DB.prepare(`
            SELECT id, site_id, name, type, created_at
            FROM fields WHERE site_id = ?
            ORDER BY created_at ASC
        `)
      .bind(siteId)
      .all<Field>();

    return sendOk(c, updatedFields || []);
  } catch (error) {
    console.error('Replace fields error:', error);
    return sendProblemDetails(c, 500, 'Internal server error while replacing fields');
  }
};
