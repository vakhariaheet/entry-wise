import { isSafeExternalUrl } from '../../utils/ssrf';

export interface GoogleSheetsPayload {
    siteDomain: string;
    submissionId: string;
    formData: Record<string, string>;
    submittedAt?: string;
}

/**
 * Dispatches submission data to a Google Sheets webhook or Google Apps Script Web App
 */
export async function dispatchGoogleSheets(
    webhookUrl: string,
    payload: GoogleSheetsPayload
): Promise<{ success: boolean; status?: number; error?: string }> {
    try {
        if (!isSafeExternalUrl(webhookUrl)) {
            console.warn(`SSRF Block: Google Sheets webhook aborted for unsafe URL: ${webhookUrl}`);
            return { success: false, error: 'Unsafe webhook URL' };
        }

        const body = {
            _submission_id: payload.submissionId,
            _domain: payload.siteDomain,
            _submitted_at: payload.submittedAt || new Date().toISOString(),
            ...payload.formData,
        };

        const res = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'EntryWise-GoogleSheets/1.0',
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(5000),
            // Follow redirects because Google Apps Script Web App redirects 302 to script.googleusercontent.com
            redirect: 'follow',
        });

        return { success: res.ok, status: res.status };
    } catch (err: any) {
        console.error('Google Sheets dispatch error:', err);
        return { success: false, error: err.message || 'Google Sheets dispatch failed' };
    }
}
