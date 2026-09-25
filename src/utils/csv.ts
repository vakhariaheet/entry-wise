import type { SubmissionRecord } from '../types/submission';

/**
 * Escapes a cell according to RFC 4180 CSV specifications
 */
function escapeCsvCell(value: any): string {
  if (value === null || value === undefined) return '';
  const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Serializes a list of SubmissionRecords to a downloadable RFC 4180 CSV string
 */
export function generateSubmissionsCsv(submissions: SubmissionRecord[]): string {
  if (!submissions || submissions.length === 0) {
    return 'id,created_at,status,ip_address\n';
  }

  // Discover all unique field keys across submissions
  const dynamicFieldKeys = new Set<string>();
  for (const sub of submissions) {
    if (sub.data && typeof sub.data === 'object') {
      for (const key of Object.keys(sub.data)) {
        dynamicFieldKeys.add(key);
      }
    }
  }
  const dynamicHeaders = Array.from(dynamicFieldKeys).sort();

  const allHeaders = ['id', 'created_at', 'status', 'ip_address', ...dynamicHeaders];
  const rows: string[] = [allHeaders.map(escapeCsvCell).join(',')];

  for (const sub of submissions) {
    const row = [
      escapeCsvCell(sub.id),
      escapeCsvCell(sub.created_at),
      escapeCsvCell(sub.status),
      escapeCsvCell(sub.ip_address || ''),
      ...dynamicHeaders.map((header) => escapeCsvCell(sub.data?.[header] || '')),
    ];
    rows.push(row.join(','));
  }

  return rows.join('\r\n') + '\r\n';
}
