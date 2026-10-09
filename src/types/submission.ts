export interface SubmissionData {
  [key: string]: any;
  fields: {
    [key: string]: string;
  };
}

export type SubmissionStatus = 'new' | 'read' | 'archived' | 'spam';

export interface SubmissionRecord {
  id: string;
  site_id: string;
  data: Record<string, string>;
  attachments?: Array<{ filename: string; size?: number; type?: string }>;
  status: SubmissionStatus;
  ip_address?: string;
  is_test?: number | boolean;
  notes?: string | null;
  created_at: string;
}

export interface Submission {
  id: string;
  site_id: string;
  data: SubmissionData;
  created_at: string;
}

// Honeypot field names to check.
// IMPORTANT: only underscore-prefixed internal names are used so we never collide with — and
// silently discard — real, common form fields (previously 'website' and 'url' caused legit
// submissions containing those fields to be dropped as spam). The embed code generator and the
// dashboard document `_gotcha` / `_trap` as the hidden trap inputs.
export const HONEYPOT_FIELDS = ['_gotcha', '_honey', '_trap'];
export const VALID_FILE_TYPES = ['image/jpeg', 'image/png', 'application/pdf']; // Add more as needed
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit
