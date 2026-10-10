export interface AirtableConfig {
  token: string;
  baseId: string;
  tableName: string;
}

export interface AirtablePayload {
  siteDomain: string;
  submissionId: string;
  formData: Record<string, string>;
  submittedAt?: string;
}

/**
 * Dispatches submission data directly to an Airtable Base & Table using Personal Access Token.
 * Uses `typecast: true` so Airtable automatically converts string form inputs into numbers,
 * booleans, dates, and single/multi-select options without manual type mapping.
 */
export async function dispatchAirtable(
  config: AirtableConfig,
  payload: AirtablePayload
): Promise<{ success: boolean; status?: number; error?: string }> {
  try {
    const token = config.token?.trim();
    const baseId = config.baseId?.trim();
    const tableName = config.tableName?.trim();

    if (!token || !baseId || !tableName) {
      return { success: false, error: 'Missing Airtable token, Base ID, or Table Name' };
    }

    const url = `https://api.airtable.com/v0/${encodeURIComponent(baseId)}/${encodeURIComponent(tableName)}`;
    const cleanFields: Record<string, string> = {};
    for (const [k, v] of Object.entries(payload.formData)) {
      if (!k.startsWith('_')) {
        cleanFields[k] = String(v ?? '');
      }
    }

    const sendRequest = async (fieldsToSend: Record<string, string>) => {
      return fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'EntryWise-Airtable/1.0',
        },
        body: JSON.stringify({
          records: [{ fields: fieldsToSend }],
          typecast: true,
        }),
        signal: AbortSignal.timeout(6000),
      });
    };

    let res = await sendRequest(cleanFields);

    // Smart fallback: If Airtable rejects due to case-sensitive column names (e.g., 'Name' vs 'name'),
    // retry with Title Case keys which match Airtable's default table columns.
    if (res.status === 422) {
      const titleCaseFields: Record<string, string> = {};
      for (const [k, v] of Object.entries(cleanFields)) {
        const titleKey = k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        titleCaseFields[titleKey] = v;
      }
      const retryRes = await sendRequest(titleCaseFields);
      if (retryRes.ok) {
        return { success: true, status: retryRes.status };
      }
      res = retryRes;
    }

    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({}))) as {
        error?: { message?: string; type?: string };
      };
      return {
        success: false,
        status: res.status,
        error: errBody?.error?.message || `Airtable HTTP ${res.status}`,
      };
    }

    return { success: true, status: res.status };
  } catch (err: unknown) {
    console.error('Airtable dispatch error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Airtable dispatch failed',
    };
  }
}
