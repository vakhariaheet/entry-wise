# 🔌 Connectors, Email Studio & Signed Webhooks

EntryWise decouples **form ingestion** from **downstream delivery**. Every valid submission is first committed to SQLite / D1 and then fanned out asynchronously to your configured email providers, CRM/database connectors, chat channels, and webhooks.

---

## 1. Pluggable Email Providers & Visual Email Studio

EntryWise supports **6 email delivery engines** at both the server level (`.env` defaults) and the individual Workspace level:

| Provider | Configuration | Best For |
| :--- | :--- | :--- |
| **Resend** (`resend`) | `RESEND_API_KEY` (`re_...`) | Modern transactional email with fast domain verification. |
| **SMTP2GO** (`smtp2go`) | `SMTP2GO_API_KEY` (`api-...`) | Reliable global SMTP/API delivery. |
| **MailerSend** (`mailersend`) | `MAILERSEND_API_KEY` (`mlsn....`) | High-volume transactional templates & attachments. |
| **Mailtrap** (`mailtrap`) | `MAILTRAP_API_KEY` | Transactional sending and staging email sandboxes. |
| **Webhook Bridge** (`webhook`) | `EMAIL_WEBHOOK_URL` (`https://...`) | Custom SMTP microservices, n8n, Make, Zapier, or AWS SES bridges. |
| **Cloudflare Email** (`cloudflare`) | `env.EMAIL` Worker binding | Zero-cost native delivery when hosted on Cloudflare Workers. |

### Template Variables (`{{variable}}`)

Both **Submission Alert Emails** (sent to your team) and **Auto-Responder Emails** (sent to the submitter) support dynamic variable interpolation:
- `{{name}}` — Submitter's detected name
- `{{email}}` — Submitter's detected email address
- `{{company_name}}` / `{{domain}}` — Your site name or domain
- `{{submission_id}}` — Unique submission ID (`sub_...`)
- `{{date}}` — Formatted submission date
- `{{form_data}}` / `{{all_fields}}` — Pre-rendered, HTML-escaped table of all submitted fields
- Any custom form field name, e.g., `{{phone}}`, `{{budget}}`, `{{project_type}}`

---

## 2. Direct Zero-OAuth Connectors

All connectors validate target URLs against EntryWise's **SSRF Guard** and store API tokens encrypted at rest, redacting secrets on all `GET` responses.

### Airtable Direct Sync
Syncs each form submission directly into an Airtable base using `typecast: true` so single-select options, numbers, checkboxes, and dates convert automatically.
1. Create a Personal Access Token (`pat...`) at [airtable.com/create/tokens](https://airtable.com/create/tokens) with `data.records:write` scope.
2. In the EntryWise Console → **Connectors** → **Airtable**, enter:
   - **Personal Access Token:** `pat...`
   - **Base ID:** `app...` (found in your Airtable URL)
   - **Table Name:** e.g. `Submissions` or `Leads`
3. EntryWise maps your form fields + `Submission ID`, `Site`, and `Submitted At` columns automatically.

### Notion Database Sync
Creates a new page in your Notion database for every submission and appends a full formatted summary block to the page body.
1. Create an Internal Integration at [notion.so/profile/integrations](https://www.notion.so/profile/integrations) and copy the `ntn_...` / `secret_...` token.
2. Open your Notion database, click **`•••` → Connections**, and connect your integration.
3. In EntryWise Console → **Connectors** → **Notion**, paste your **Integration Token** and either the **full Notion Database URL** or the **32-character Database ID**.
4. EntryWise automatically discovers your database's primary `title` property and maps matching `rich_text`, `email`, `phone_number`, `url`, `number`, and `select` columns.

### Google Sheets (Apps Script Webhook)
Appends rows in real time without expiring OAuth tokens:
1. Open your Google Sheet → **Extensions → Apps Script**.
2. Paste the Web App snippet shown in the Console's Google Sheets guide and click **Deploy → Web App** (*Execute as: Me*, *Who has access: Anyone*).
3. Paste the `https://script.google.com/macros/s/.../exec` URL into `google_sheets_url`.

### Slack & Discord Incoming Webhooks
Paste your Slack (`https://hooks.slack.com/services/...`) or Discord (`https://discord.com/api/webhooks/...`) webhook URL in the Console to receive rich formatted submission cards in real time.

---

## 3. Multi-Webhook Fanout & HMAC-SHA256 Verification

You can attach multiple outgoing webhooks per site (`POST /v1/sites/{site_id}/webhooks`). Each webhook receives an HTTP `POST` with the following payload:

```json
{
  "event": "submission.created",
  "timestamp": "2026-10-11T02:00:00.000Z",
  "site_id": "site_...",
  "domain": "acme.com",
  "submission_id": "sub_...",
  "data": {
    "name": "Alex Rivera",
    "email": "alex@acme.com",
    "message": "Hello!"
  },
  "attachments": []
}
```

### Verifying `X-EntryWise-Signature`

When a webhook `secret` is configured, EntryWise signs `${timestamp}.${rawBody}` using **HMAC-SHA256** and sends:
- `X-EntryWise-Signature: t=<unix_ms>,v1=<hex_hmac>`
- `X-EntryWise-Timestamp: <unix_ms>`

```ts
import crypto from 'node:crypto';

export function verifyEntryWiseWebhook(
  rawBody: string,
  signatureHeader: string,
  secret: string
): boolean {
  const parts = Object.fromEntries(
    signatureHeader.split(',').map((part) => part.trim().split('='))
  );
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  // Reject replays older than 5 minutes
  if (Math.abs(Date.now() - Number(timestamp)) > 5 * 60 * 1000) {
    return false;
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
```
