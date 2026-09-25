import { MessageBatch, ExecutionContext } from '@cloudflare/workers-types';
import { Env } from '../types/env';
import { SubmissionQueueMessage } from '../types/queue';
import { processSubmissionDelivery } from './submissionProcessor';

/**
 * Cloudflare Queues Consumer Handler
 * Batch processes queued form submission notifications with retry & exponential backoff.
 */
export async function queueConsumer(
    batch: MessageBatch<SubmissionQueueMessage>,
    env: Env,
    ctx: ExecutionContext
): Promise<void> {
    console.log(`[Queue Consumer] Processing batch of ${batch.messages.length} messages from queue: ${batch.queue}`);

    for (const message of batch.messages) {
        try {
            const payload = message.body;

            if (payload?.type !== 'submission.process') {
                console.warn(`[Queue Consumer] Unknown message type:`, payload);
                message.ack();
                continue;
            }

            console.log(`[Queue Consumer] Processing submission ID '${payload.submissionId}' (attempt: ${message.attempts})`);

            const result = await processSubmissionDelivery(payload, env);

            if (result.success) {
                console.log(`[Queue Consumer] Successfully delivered submission ID '${payload.submissionId}'`);
                message.ack();
            } else {
                console.warn(
                    `[Queue Consumer] Partial/total delivery error for submission ID '${payload.submissionId}':`,
                    result.errors
                );

                // If under max retry threshold (3 attempts), retry with exponential backoff
                if (message.attempts < 3) {
                    const delaySeconds = Math.min(300, Math.pow(2, message.attempts) * 10);
                    console.log(`[Queue Consumer] Retrying submission ID '${payload.submissionId}' in ${delaySeconds}s (attempt ${message.attempts})`);
                    message.retry({ delaySeconds });
                } else {
                    console.error(
                        `[Queue Consumer] Max retries exhausted for submission ID '${payload.submissionId}'. Forwarding to Dead Letter Queue.`
                    );
                    // Cloudflare Queues will route to dead_letter_queue when attempts exhaust
                    message.retry();
                }
            }
        } catch (err: any) {
            console.error(`[Queue Consumer] Unhandled error processing message:`, err);
            if (message.attempts < 3) {
                message.retry({ delaySeconds: 15 });
            } else {
                message.ack(); // or let DLQ handle
            }
        }
    }
}
