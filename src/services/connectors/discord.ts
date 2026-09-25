import { isSafeExternalUrl } from '../../utils/ssrf';

export interface DiscordNotificationPayload {
    siteDomain: string;
    submissionId: string;
    formData: Record<string, string>;
    submittedAt?: string;
}

/**
 * Dispatches an embed notification to a Discord Webhook
 */
export async function dispatchDiscordNotification(
    webhookUrl: string,
    payload: DiscordNotificationPayload
): Promise<{ success: boolean; status?: number; error?: string }> {
    try {
        if (!isSafeExternalUrl(webhookUrl)) {
            console.warn(`SSRF Block: Discord webhook aborted for unsafe URL: ${webhookUrl}`);
            return { success: false, error: 'Unsafe webhook URL' };
        }

        const fieldEntries = Object.entries(payload.formData).slice(0, 25);
        const discordFields = fieldEntries.map(([name, value]) => ({
            name: String(name).slice(0, 250),
            value: String(value || '—').slice(0, 1000),
            inline: true,
        }));

        const body = {
            embeds: [
                {
                    title: '📬 New Form Submission',
                    description: `Origin site: **${payload.siteDomain}**`,
                    color: 0x10b981, // Emerald green
                    fields: [
                        {
                            name: 'Submission ID',
                            value: `\`${payload.submissionId}\``,
                            inline: false,
                        },
                        ...discordFields,
                    ],
                    footer: {
                        text: 'EntryWise Forms',
                    },
                    timestamp: payload.submittedAt || new Date().toISOString(),
                },
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
        console.error('Discord notification error:', err);
        return { success: false, error: err.message || 'Discord notification failed' };
    }
}
