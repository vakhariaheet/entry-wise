import { processSubmissionDelivery } from '../queue/submissionProcessor';
import type { Env } from '../types/env';
import type { SubmissionQueueMessage } from '../types/queue';

export interface PluggableQueueStats {
  driver: 'cloudflare' | 'memory' | 'http';
  enqueued: number;
  processed: number;
  failed: number;
  pending: number;
}

/**
 * Pluggable Queue Adapter for EntryWise
 * Removes Cloudflare Queue lock-in by supporting:
 * - 'memory': In-process async background queue with automatic retries & backoff (default for Docker/VPS)
 * - 'http': External webhook/HTTP queue bridge (Upstash QStash, BullMQ HTTP bridge, n8n, RabbitMQ HTTP)
 * - 'cloudflare': Native Cloudflare Queues binding
 */
export class PluggableSubmissionQueue {
  private pendingCount = 0;
  private enqueuedCount = 0;
  private processedCount = 0;
  private failedCount = 0;

  constructor(private readonly getEnv: () => Env) {}

  getStats(): PluggableQueueStats {
    const env = this.getEnv();
    const driver =
      env.QUEUE_DRIVER ||
      (env.QUEUE_WEBHOOK_URL ? 'http' : env.SUBMISSIONS_QUEUE ? 'cloudflare' : 'memory');
    return {
      driver,
      enqueued: this.enqueuedCount,
      processed: this.processedCount,
      failed: this.failedCount,
      pending: this.pendingCount,
    };
  }

  async send(message: SubmissionQueueMessage): Promise<void> {
    const env = this.getEnv();
    const driver = env.QUEUE_DRIVER || (env.QUEUE_WEBHOOK_URL ? 'http' : 'memory');
    const maxRetries = Math.max(1, Number.parseInt(env.QUEUE_MAX_RETRIES || '3', 10) || 3);

    this.enqueuedCount++;

    if (driver === 'http' && env.QUEUE_WEBHOOK_URL) {
      await this.dispatchHttpQueue(message, env, maxRetries);
      return;
    }

    // Default 'memory' async background queue with retries
    this.pendingCount++;
    queueMicrotask(() => {
      this.processWithRetry(message, env, maxRetries)
        .catch((err) => {
          console.error('[QueueAdapter] Unhandled background queue error:', err);
        })
        .finally(() => {
          this.pendingCount = Math.max(0, this.pendingCount - 1);
        });
    });
  }

  async sendBatch(messages: Iterable<{ body: SubmissionQueueMessage }>): Promise<void> {
    for (const item of messages) {
      await this.send(item.body);
    }
  }

  private async dispatchHttpQueue(
    message: SubmissionQueueMessage,
    env: Env,
    maxRetries: number
  ): Promise<void> {
    const webhookUrl = env.QUEUE_WEBHOOK_URL;
    if (!webhookUrl) {
      await this.processWithRetry(message, env, maxRetries);
      return;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'EntryWise-Queue-Driver/1.0',
    };
    if (env.QUEUE_WEBHOOK_TOKEN) {
      headers.Authorization = `Bearer ${env.QUEUE_WEBHOOK_TOKEN}`;
    }

    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(message),
        });
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`HTTP Queue returned ${res.status}: ${text.slice(0, 200)}`);
        }
        this.processedCount++;
        return;
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 150 * attempt));
        }
      }
    }

    this.failedCount++;
    console.error(
      `[QueueAdapter] HTTP queue dispatch to ${webhookUrl} failed after ${maxRetries} attempts; falling back to local processor:`,
      lastError
    );
    await this.processWithRetry(message, env, 1);
  }

  private async processWithRetry(
    message: SubmissionQueueMessage,
    env: Env,
    maxRetries: number
  ): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const result = await processSubmissionDelivery(message, env);
      if (result.success) {
        this.processedCount++;
        return;
      }
      console.warn(
        `[QueueAdapter] Attempt ${attempt}/${maxRetries} had delivery errors for '${message.submissionId}':`,
        result.errors.join('; ')
      );
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 200 * attempt));
      }
    }
    this.failedCount++;
  }
}

/**
 * Creates a Cloudflare Queue-compatible binding object backed by PluggableSubmissionQueue.
 */
export function createQueueAdapter(getEnv: () => Env): {
  queue: PluggableSubmissionQueue;
  binding: NonNullable<Env['SUBMISSIONS_QUEUE']>;
} {
  const queue = new PluggableSubmissionQueue(getEnv);
  const binding = {
    send: (msg: SubmissionQueueMessage) => queue.send(msg),
    sendBatch: (msgs: Iterable<{ body: SubmissionQueueMessage }>) => queue.sendBatch(msgs),
  } as unknown as NonNullable<Env['SUBMISSIONS_QUEUE']>;

  return { queue, binding };
}
