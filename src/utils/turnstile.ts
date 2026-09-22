interface TurnstileVerifyResponse {
    success: boolean;
    'error-codes'?: string[];
    challenge_ts?: string;
    hostname?: string;
    action?: string;
    cdata?: string;
}

/**
 * Verifies a Cloudflare Turnstile token
 * @param token Turnstile response token (cf-turnstile-response)
 * @param secretKey Site Turnstile secret key
 * @param remoteIp Optional submitter IP address
 */
export async function verifyTurnstileToken(
    token: string,
    secretKey: string,
    remoteIp?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const formData = new FormData();
        formData.append('secret', secretKey);
        formData.append('response', token);
        if (remoteIp) {
            formData.append('remoteip', remoteIp);
        }

        const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            body: formData,
        });

        if (!res.ok) {
            return { success: false, error: `Turnstile verification request failed with status ${res.status}` };
        }

        const data = (await res.json()) as TurnstileVerifyResponse;
        if (!data.success) {
            const errorCodes = data['error-codes']?.join(', ') || 'Verification failed';
            return { success: false, error: errorCodes };
        }

        return { success: true };
    } catch (err: any) {
        console.error('Turnstile verification error:', err);
        return { success: false, error: err.message || 'Turnstile verification error' };
    }
}
