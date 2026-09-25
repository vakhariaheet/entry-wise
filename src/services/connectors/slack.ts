import { isSafeExternalUrl } from '../../utils/ssrf';

export interface SlackNotificationPayload {
    siteDomain: string;
    submissionId: string;
    formData: Record<string, string>;
    submittedAt?: string;
}

/**
 * Dispatches a rich alert message to a Slack Incoming Webhook
 */
export async function dispatchSlackNotification(
    webhookUrl: string,
    payload: SlackNotificationPayload
): Promise<{ success: boolean; status?: number; error?: string }> {
    try {
        if (!isSafeExternalUrl(webhookUrl)) {
            console.warn(`SSRF Block: Slack webhook aborted for unsafe URL: ${webhookUrl}`);
            return { success: false, error: 'Unsafe webhook URL' };
        }

        const fieldEntries = Object.entries(payload.formData).slice(0, 10);
        const slackFields = fieldEntries.map(([key, val]) => ({
            type: 'mrkdwn',
            text: `*${key}:*\n${String(val || '').slice(0, 500)}`,
        }));

        const body = {
            text: `📬 New Form Submission on ${payload.siteDomain}`,
            blocks: [
                {
                    type: 'header',
                    text: {
                        type: 'plain_text',
                        text: '📬 New Form Submission',
                        emoji: true,
                    },
                },
                {
                    type: 'section',
                    fields: [
                        {
                            type: 'mrkdwn',
                            text: `*Origin:*\n${payload.siteDomain}`,
                        },
                        {
                            type: 'mrkdwn',
                            text: `*Submission ID:*\n\`${payload.submissionId}\``,
                        },
                    ],
                },
                ...(slackFields.length > 0
                    ? [
                          {
                              type: 'divider',
                          },
                          {
                              type: 'section',
                              fields: slackFields,
                          },
                      ]
                    : []),
            ],
        };

        const res = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(5000),
        });

        return { success: res.ok, status: res.status };
    } catch (err: any) {
        console.error('Slack notification error:', err);
        return { success: false, error: err.message || 'Slack notification failed' };
    }
}
