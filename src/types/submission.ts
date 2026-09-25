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
  created_at: string;
}

export interface Submission {
  id: string;
  site_id: string;
  data: SubmissionData;
  created_at: string;
}

// Honeypot field names to check
export const HONEYPOT_FIELDS = ['_gotcha', 'website', 'url', 'email_confirm'];
export const VALID_FILE_TYPES = ['image/jpeg', 'image/png', 'application/pdf']; // Add more as needed
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit
