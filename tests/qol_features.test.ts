import { describe, expect, test } from 'bun:test';
import {
  listSubmissionsQuerySchema,
  patchSubmissionSchema,
  submissionRecordSchema,
} from '../src/schemas/submission.schema';

describe('Quality of Life: Submissions Patch & Notes Schema', () => {
  test('validates updating notes independently', () => {
    const parsed = patchSubmissionSchema.safeParse({
      notes: 'Spoke with founder on Linear; scheduled demo for next Tuesday',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.notes).toBe('Spoke with founder on Linear; scheduled demo for next Tuesday');
      expect(parsed.data.status).toBeUndefined();
    }
  });

  test('validates updating status independently', () => {
    const parsed = patchSubmissionSchema.safeParse({
      status: 'spam',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.status).toBe('spam');
      expect(parsed.data.notes).toBeUndefined();
    }
  });

  test('validates updating status and notes simultaneously', () => {
    const parsed = patchSubmissionSchema.safeParse({
      status: 'archived',
      notes: 'Closed won - signed annual contract',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.status).toBe('archived');
      expect(parsed.data.notes).toBe('Closed won - signed annual contract');
    }
  });

  test('rejects invalid status values', () => {
    const parsed = patchSubmissionSchema.safeParse({
      status: 'unknown_status',
    });
    expect(parsed.success).toBe(false);
  });

  test('allows clearing notes with null', () => {
    const parsed = patchSubmissionSchema.safeParse({
      notes: null,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.notes).toBeNull();
    }
  });
});

describe('Quality of Life: Submission Record Schema & Test Flag', () => {
  const baseRecord = {
    id: 'sub_test_12345',
    site_id: 'site_test_67890',
    data: {
      name: 'Alex Rivera',
      email: 'alex.rivera@example.com',
      message: 'Smoke test mock message',
    },
    status: 'new' as const,
    created_at: new Date().toISOString(),
  };

  test('accepts record with is_test=1 and custom notes', () => {
    const record = {
      ...baseRecord,
      is_test: 1,
      notes: 'Automated pipeline smoke test',
    };
    const parsed = submissionRecordSchema.safeParse(record);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.is_test).toBe(1);
      expect(parsed.data.notes).toBe('Automated pipeline smoke test');
    }
  });

  test('accepts record with boolean is_test=true', () => {
    const record = {
      ...baseRecord,
      is_test: true,
      notes: 'Mock runner submission',
    };
    const parsed = submissionRecordSchema.safeParse(record);
    expect(parsed.success).toBe(true);
  });

  test('maintains backward compatibility when is_test and notes are absent', () => {
    const parsed = submissionRecordSchema.safeParse(baseRecord);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.is_test).toBeUndefined();
      expect(parsed.data.notes).toBeUndefined();
    }
  });
});

describe('Quality of Life: Query Filtering Schema', () => {
  test('coerces is_test query parameter', () => {
    const parsed = listSubmissionsQuerySchema.safeParse({
      is_test: '1',
      limit: '10',
      offset: '0',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.is_test).toBe(1);
      expect(parsed.data.limit).toBe(10);
    }
  });

  test('coerces is_test=0 for production-only submissions', () => {
    const parsed = listSubmissionsQuerySchema.safeParse({
      is_test: '0',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.is_test).toBe(0);
    }
  });

  test('accepts spam filter query', () => {
    const parsed = listSubmissionsQuerySchema.safeParse({
      status: 'spam',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.status).toBe('spam');
    }
  });
});
