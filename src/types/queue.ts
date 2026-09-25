/**
 * Submission Queue Contract
 * Unified message structure for async form delivery across Cloudflare Queues & Self-hosted consumers
 */
export interface SubmissionQueueMessage {
  type: 'submission.process';
  submissionId: string;
  siteId: string;
  companyId: string;
  fields: Record<string, string>;
  savedAttachmentMeta?: Array<{
    name?: string;
    filename?: string;
    url?: string;
    size?: number;
    mime_type?: string;
    type?: string;
  }>;
  submitterEmail?: string | null;
  submitterName?: string | null;
  ipAddress?: string;
  submittedAt: string;
}
