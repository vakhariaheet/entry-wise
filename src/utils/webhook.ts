/**
 * Computes an HMAC-SHA256 signature for a webhook payload using Web Crypto API
 */
async function computeHmacSha256(payload: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(payload);

    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const hashArray = Array.from(new Uint8Array(signature));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export interface WebhookEventPayload {
    event: 'submission.created';
    timestamp: string;
    site_id: string;
    domain: string;
    submission_id: string;
    data: Record<string, string>;
    attachments?: Array<{ filename: string; size?: number; type?: string }>;
}

/**
 * Dispatches a submission webhook notification to an external URL
 */
export async function dispatchWebhook(
    url: string,
    payload: WebhookEventPayload,
    secret?: string | null
): Promise<{ success: boolean; status?: number; error?: string }> {
    try {
        const bodyString = JSON.stringify(payload);
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'User-Agent': 'EntryWise-Webhook/1.0',
        };

        if (secret) {
            const signature = await computeHmacSha256(bodyString, secret);
            headers['X-EntryWise-Signature'] = `sha256=${signature}`;
        }

        const res = await fetch(url, {
            method: 'POST',
            headers,
            body: bodyString,
        });

        return { success: res.ok, status: res.status };
    } catch (err: any) {
        console.error('Webhook dispatch error:', err);
        return { success: false, error: err.message || 'Webhook dispatch failed' };
    }
}
