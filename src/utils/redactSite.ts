/**
 * Removes server-side secrets from a site row before it is returned over the API, replacing them
 * with boolean "configured" flags so the dashboard can still show state without ever receiving the
 * actual secret value. The public ingestion `api_key` is intentionally retained.
 */
export function redactSiteSecrets<T extends Record<string, unknown>>(
  row: T
): T & {
  turnstile_configured: boolean;
  webhook_secret_configured: boolean;
  airtable_configured: boolean;
  notion_configured: boolean;
} {
  const turnstile_configured = Boolean(
    row.turnstile_secret_key && String(row.turnstile_secret_key).trim()
  );
  const webhook_secret_configured = Boolean(
    row.webhook_secret && String(row.webhook_secret).trim()
  );
  const airtable_configured = Boolean(row.airtable_token && String(row.airtable_token).trim());
  const notion_configured = Boolean(row.notion_token && String(row.notion_token).trim());
  return {
    ...row,
    turnstile_secret_key: null,
    webhook_secret: null,
    airtable_token: null,
    notion_token: null,
    turnstile_configured,
    webhook_secret_configured,
    airtable_configured,
    notion_configured,
  };
}
