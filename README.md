# EntryWise

EntryWise is a developer-friendly, production-grade form backend API built with [Hono](https://hono.dev/) and deployed globally on [Cloudflare Workers](https://workers.cloudflare.com/). It provides secure submission ingestion, submission persistence, email notifications with attachments, automated confirmations, webhooks, spam filtering, and CSV/JSON export.

The API is designed following the **Zalando RESTful API Guidelines** and standard web conventions:
- Strict `snake_case` payloads and query parameters
- Consistent `kebab-case` resource URLs
- Standard HTTP status codes (`200 OK`, `201 Created` with `Location` header, `204 No Content`, `303 See Other`)
- RFC 7807 Problem Details for all client and server errors
- Native HTML `<form>` (`multipart/form-data`, `application/x-www-form-urlencoded`) and modern JSON (`application/json`) ingestion

---

## Key Features

- 📨 **Frictionless Form Submissions**:
  - Accept direct JSON payloads (`{ "name": "Jane", "email": "jane@example.com" }`) without artificial metadata wrappers.
  - Native HTML multi-part and URL-encoded submissions with zero client-side JavaScript required.
  - Custom redirect support (`_redirect` / `_next` returning `303 See Other`) or friendly default confirmation page.
  - Attachment matching directly by form field name (`name="resume"`).
- 📥 **Submission Persistence & Inbox (Cloudflare D1)**:
  - Every submission is automatically persisted to Cloudflare D1 with IP capture and timestamping.
  - Full Inbox REST API (`GET /v1/sites/{site_id}/submissions`) with status filtering (`new`, `read`, `archived`, `spam`) and full-text keyword search.
  - Triage submissions using `PATCH /v1/submissions/{id}` to update status.
  - RFC 4180 compliant CSV export (`GET /v1/sites/{site_id}/submissions/export?format=csv`) and raw JSON export.
- 🤖 **Cloudflare Turnstile Bot Protection**:
  - Native verification against `https://challenges.cloudflare.com/turnstile/v0/siteverify`.
  - Pass the token via `cf-turnstile-response` in HTML forms or JSON requests.
  - Transparent spam rejection with RFC 7807 error or honeypot trapping.
- 🔁 **Auto-Responder Emails**:
  - Automatically send a confirmation email back to the form submitter.
  - Dynamic template variable interpolation: `{{name}}`, `{{email}}`, etc.
  - Configurable per site with custom subjects and HTML/plain-text bodies.
- 🪝 **Signed Webhooks & Third-Party Integrations**:
  - Real-time webhook dispatch upon each valid submission (compatible with Zapier, Slack, Discord, Make, or custom backends).
  - Cryptographically signed with Web Crypto HMAC-SHA256 (`X-EntryWise-Signature` header, hex-encoded `t=<timestamp>,v1=<signature>`) to prevent tampering and replay attacks.
- 📧 **Versatile Email Delivery**:
  - Cloudflare Native Email (`cloudflare:email` Worker binding)
  - Resend
  - MailerSend
  - Mailtrap
  - SMTP2GO
- 🔒 **Enterprise-Grade Security**:
  - Domain origin verification (`allowed_domains` per site)
  - Cloudflare KV-backed sliding window rate limiting
  - Admin authentication via static `ADMIN_API_KEY` or 6-digit TOTP JWTs
  - At-rest AES-GCM-256 encryption for provider API tokens and site secrets
- 📚 **Interactive OpenAPI 3.1 Documentation**:
  - Interactive Scalar API reference hosted at `/docs`.

---

## Architecture & Technology Stack

- **Runtime**: Cloudflare Workers
- **Framework**: Hono v4 + `@hono/zod-openapi`
- **Database**: Cloudflare D1 (SQLite at the edge)
- **Rate Limiting**: Cloudflare KV
- **API Spec**: OpenAPI 3.1 + Scalar API Reference
- **Package Manager**: Bun

---

## Getting Started

### Prerequisites

- [Node.js 18+](https://nodejs.org/) or [Bun](https://bun.sh/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- Cloudflare account with Workers, D1, and KV enabled

### 1. Installation

```bash
git clone https://github.com/yourusername/entry-wise.git
cd entry-wise
bun install
```

### 2. Configure Cloudflare Resources

Create your D1 database and KV rate limit namespace:

```bash
# Create D1 database
wrangler d1 create entry-wise

# Create KV namespace for rate limiting
wrangler kv:namespace create RATE_LIMIT
```

Update your `wrangler.jsonc` (or copy from `wrangler.example.jsonc`) with your D1 `database_id` and KV `id`.

### 3. Apply Database Migrations

Apply the database migrations to your local or remote D1 database:

```bash
# Local development
wrangler d1 execute entry-wise --local --file ./migrations/0001_init.sql
wrangler d1 execute entry-wise --local --file ./migrations/0002_site_updates.sql
wrangler d1 execute entry-wise --local --file ./migrations/0003_redesign_and_features.sql

# Production
wrangler d1 execute entry-wise --remote --file ./migrations/0001_init.sql
wrangler d1 execute entry-wise --remote --file ./migrations/0002_site_updates.sql
wrangler d1 execute entry-wise --remote --file ./migrations/0003_redesign_and_features.sql
```

### 4. Environment Variables

Create `.dev.vars` for local development:

```env
ENCRYPTION_KEY="your-32-byte-hex-encryption-key"
BASE_URL="http://localhost:8787"
ADMIN_API_KEY="your-secure-admin-api-key"
```

### 5. Running Locally

```bash
bun run dev
```

Open `http://localhost:8787/docs` to view the interactive Scalar API documentation.

---

## Quickstart Guide

### Step 1: Create a Company (Email Provider)

```bash
curl -X POST http://localhost:8787/v1/companies \
  -H "X-Admin-Api-Key: your-secure-admin-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Corp",
    "email_provider": "resend",
    "email_provider_token": "re_123456789",
    "from_email": "forms@acme.com",
    "from_name": "Acme Notifications",
    "admin_email": "hello@acme.com"
  }'
```

*Response `201 Created` with `Location: /v1/companies/{company_id}`*

### Step 2: Create a Site

```bash
curl -X POST http://localhost:8787/v1/companies/{company_id}/sites \
  -H "X-Admin-Api-Key: your-secure-admin-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Landing Page",
    "allowed_domains": ["acme.com", "localhost"],
    "rate_limit": 30,
    "email_recipient": "leads@acme.com",
    "auto_responder_enabled": true,
    "auto_responder_subject": "Thanks for reaching out, {{name}}!",
    "auto_responder_body": "Hi {{name}},\n\nWe received your message: \"{{message}}\". Our team will be in touch shortly!",
    "webhook_url": "https://api.acme.com/webhooks/forms",
    "webhook_secret": "whsec_supersecretkey123"
  }'
```

*Response `201 Created` contains `site_id` and the unique `api_key`.*

### Step 3: Define Expected Form Fields

```bash
curl -X POST http://localhost:8787/v1/sites/{site_id}/fields \
  -H "X-Admin-Api-Key: your-secure-admin-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "fields": [
      { "name": "name", "type": "text", "required": true },
      { "name": "email", "type": "email", "required": true },
      { "name": "message", "type": "text", "required": true },
      { "name": "resume", "type": "file", "required": false }
    ]
  }'
```

---

## Form Submission Integration

### Option A: HTML Form with File Upload (No JavaScript)

```html
<form 
  action="https://forms.yourdomain.com/v1/submissions" 
  method="POST" 
  enctype="multipart/form-data"
>
  <!-- Authentication & Routing -->
  <input type="hidden" name="api_key" value="site_api_key_here">
  <!-- Optional Redirect URL upon success -->
  <input type="hidden" name="_redirect" value="https://acme.com/thank-you">

  <!-- Honeypot for simple bots -->
  <input type="text" name="_gotcha" style="display:none" tabindex="-1" autocomplete="off">

  <!-- Cloudflare Turnstile (Optional) -->
  <div class="cf-turnstile" data-sitekey="YOUR_TURNSTILE_SITE_KEY"></div>

  <!-- Form Fields -->
  <label>Your Name: <input type="text" name="name" required></label>
  <label>Email: <input type="email" name="email" required></label>
  <label>Message: <textarea name="message" required></textarea></label>
  <label>Resume (PDF/Doc): <input type="file" name="resume"></label>

  <button type="submit">Submit Form</button>
</form>
```

### Option B: Modern JSON Submission (Single-Page Apps / Mobile)

```javascript
const response = await fetch("https://forms.yourdomain.com/v1/submissions", {
  method: "POST",
  headers: {
    "X-Api-Key": "site_api_key_here",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    name: "Jane Doe",
    email: "jane@example.com",
    message: "I would like to inquire about your enterprise plan.",
    "cf-turnstile-response": turnstileToken
  })
});

if (response.ok) {
  const result = await response.json();
  console.log("Submission ID:", result.submission_id);
} else {
  const problem = await response.json();
  console.error("Submission failed:", problem.title, problem.detail);
}
```

---

## Inbox Management & Export API

### List Submissions (Inbox)

Filter submissions by status (`new`, `read`, `archived`, `spam`) or search content:

```bash
curl -G "http://localhost:8787/v1/sites/{site_id}/submissions" \
  -H "X-Admin-Api-Key: your-secure-admin-api-key" \
  -d "status=new" \
  -d "limit=20" \
  -d "offset=0"
```

*Response:*
```json
{
  "items": [
    {
      "id": "sub_a1b2c3d4e5",
      "site_id": "site_xyz123",
      "data": {
        "name": "Jane Doe",
        "email": "jane@example.com",
        "message": "Hello world!"
      },
      "attachments": [
        {
          "name": "resume.pdf",
          "size": 140321,
          "mime_type": "application/pdf"
        }
      ],
      "status": "new",
      "ip_address": "203.0.113.1",
      "created_at": "2026-09-23T00:00:00.000Z",
      "updated_at": "2026-09-23T00:00:00.000Z"
    }
  ],
  "total_count": 1,
  "limit": 20,
  "offset": 0
}
```

### Update Submission Status (Triage)

```bash
curl -X PATCH http://localhost:8787/v1/submissions/{id} \
  -H "X-Admin-Api-Key: your-secure-admin-api-key" \
  -H "Content-Type: application/json" \
  -d '{ "status": "read" }'
```

### Export Submissions (CSV or JSON)

Download an RFC 4180 compliant CSV file for spreadsheets:

```bash
curl -G "http://localhost:8787/v1/sites/{site_id}/submissions/export?format=csv&status=new" \
  -H "X-Admin-Api-Key: your-secure-admin-api-key" \
  -o submissions.csv
```

---

## Webhook Signatures

When webhooks are configured for a site, EntryWise sends an HTTP `POST` request with JSON payload:

```json
{
  "event": "form_submission",
  "submission_id": "sub_a1b2c3d4e5",
  "site_id": "site_xyz123",
  "site_name": "Landing Page",
  "data": {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "message": "Hello world!"
  },
  "attachments": [],
  "created_at": "2026-09-23T00:00:00.000Z"
}
```

### Verifying Signatures

The `X-EntryWise-Signature` header has the format:
```
t=1774291200000,v1=9b72a...6f
```

Example verification in Node.js / Bun:

```javascript
import crypto from "node:crypto";

function verifyWebhookSignature(rawBody, signatureHeader, secret) {
  const parts = Object.fromEntries(signatureHeader.split(",").map(p => p.split("=")));
  const timestamp = parts.t;
  const expectedSig = parts.v1;

  // Prevent replay attacks (tolerance: 5 minutes)
  if (Math.abs(Date.now() - parseInt(timestamp, 10)) > 5 * 60 * 1000) {
    return false;
  }

  const payloadToSign = `${timestamp}.${rawBody}`;
  const computedSig = crypto
    .createHmac("sha256", secret)
    .update(payloadToSign)
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(expectedSig), Buffer.from(computedSig));
}
```

---

## Error Handling (RFC 7807)

All API errors return standard RFC 7807 Problem Details with `application/problem+json`:

```json
{
  "type": "https://entrywise.webbound.in/problems/validation-error",
  "title": "Validation Error",
  "status": 400,
  "detail": "Field 'email' is required",
  "invalid_params": [
    {
      "name": "email",
      "reason": "Missing required field"
    }
  ]
}
```

Common status codes:
- `400 Bad Request`: Validation failure or missing parameters
- `401 Unauthorized`: Missing or invalid authentication credentials
- `403 Forbidden`: Origin domain not allowed or invalid API key
- `404 Not Found`: Resource does not exist
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Unexpected server error

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a detailed history of changes across releases.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

