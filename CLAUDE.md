# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
bun install

# Start local dev server (Cloudflare Worker via Wrangler)
bun run dev           # runs on http://localhost:8787

# Deploy to Cloudflare Workers
bun run deploy

# Generate TypeScript types from wrangler.jsonc bindings
bun run cf-typegen

# Type check
bun x tsc --noEmit

# Apply database migrations (D1)
wrangler d1 execute entrywise --local --file ./migrations/0001_init.sql
wrangler d1 execute entrywise --local --file ./migrations/0002_site_updates.sql
wrangler d1 execute entrywise --local --file ./migrations/0003_redesign_and_features.sql
```

## Architecture Overview

EntryWise is a **Cloudflare Workers**-based form backend service built with [Hono](https://hono.dev/) and aligned strictly with the **Zalando RESTful API Guidelines**. It receives form submissions, validates them against dynamic field schemas, persists submissions in D1, sends notification and auto-responder emails, dispatches webhooks, and blocks bots via honeypots and Cloudflare Turnstile.

### Data Model (Cloudflare D1 / SQLite)

Four core tables with cascading deletes:

```
companies → sites → fields
               ↳ submissions
```

- **companies**: Holds email provider configuration (`cloudflare` [default], `resend`, `mailersend`, `mailtrap`, `smtp2go`). Provider tokens are AES-256-GCM encrypted at rest.
- **sites**: Each belongs to one company; has a unique `api_key` (`ew_live_...`), allowed `domain`, `admin_email`, `timezone`, plus configuration for `auto_responder_*`, `webhook_*`, and `turnstile_secret_key`.
- **fields**: Per-site dynamic field definitions with types `text | email | phone | url | file`.
- **submissions**: Persistent form submission records storing submitted JSON payload, file attachment metadata, processing status (`new | read | archived | spam`), and client IP.

### Request Flow — Public Form Submission (`POST /v1/submissions`)

1. `corsMiddleware` — Handles CORS preflight and dynamic origin reflection.
2. `verifyDomain` — Checks `Origin`/`Referer` hostname against `sites.domain` (allowing localhost for development) and validates `X-API-Key` header or query parameter; sets `site_id` and `company_id` on context.
3. `rateLimiter` — Uses **Cloudflare KV** (`RATE_LIMIT_KV`) to enforce 50 requests/hour per `site_id:ip`.
4. `submitForm` controller:
   - Universal body parser: accepts raw JSON, native HTML `multipart/form-data`, or `application/x-www-form-urlencoded`.
   - Honeypot check: silently absorbs submissions containing `_gotcha`, `_honey`, `website`, etc.
   - Cloudflare Turnstile: verifies `cf-turnstile-response` token when configured.
   - Schema validation: validates field types (regex, URLs) and associates file uploads by form field name.
   - Persistence: records submission in D1 `submissions`.
   - Admin notification: formats responsive HTML email with localized timestamp and dispatches via configured email provider.
   - Auto-responder: sends confirmation email to submitter when enabled.
   - Webhook: dispatches async HTTP POST payload with HMAC-SHA256 signature (`X-EntryWise-Signature`).
   - Browser navigation: supports `_redirect` / `_next` (HTTP 303 redirect) or returns JSON / HTML.

*Note: `POST /public/submit` is maintained as a backwards-compatible alias for existing clients.*

### Zalando RESTful API Guidelines Conformance

- **API Versioning**: All core resources are prefixed with `/v1/`.
- **Error Format (RFC 7807)**: Problem Details `application/problem+json` with `type`, `title`, `status`, `detail`, and `invalid_params`.
- **HTTP Methods**: `PATCH` for partial resource updates; `PUT` for complete replacement; `DELETE` returns `204 No Content` with an empty body; `POST` creation returns `201 Created` with a `Location` header.
- **Pagination**: Paginated endpoints return `{ items, total_count, limit, offset }`.
- **Case Convention**: Strict `snake_case` across all JSON payload properties.

### Admin API Endpoints (`/v1`)

Protected by `verifyAuth` middleware (Bearer JWT from TOTP `/v1/auth/token` or static `ADMIN_API_KEY`):

- **Companies**: `GET/POST /v1/companies`, `GET/PATCH/DELETE /v1/companies/{id}`
- **Sites**: `GET/POST /v1/companies/{company_id}/sites`, `GET/POST /v1/sites`, `GET/PATCH/DELETE /v1/sites/{id}`
- **Fields**: `GET/POST/PUT /v1/sites/{site_id}/fields`, `PATCH/DELETE /v1/sites/{site_id}/fields/{field_id}`
- **Submissions**:
  - `GET /v1/sites/{site_id}/submissions` (paginated, status filter, search)
  - `GET /v1/sites/{site_id}/submissions/{id}`
  - `PATCH /v1/sites/{site_id}/submissions/{id}` (status update: read/archived/spam)
  - `DELETE /v1/sites/{site_id}/submissions/{id}` (204 No Content)
  - `GET /v1/sites/{site_id}/submissions/export?format=csv|json` (RFC 4180 CSV export)

### Cloudflare Bindings (`src/types/env.ts`)

| Binding | Type | Purpose |
|---|---|---|
| `DB` | D1Database | Main SQLite database |
| `RATE_LIMIT_KV` | KVNamespace | Sliding-window rate limit counters |
| `EMAIL` | CloudflareEmailBinding | Native Cloudflare email sending |
| `R2_BUCKET` | R2Bucket | File storage |
| `ENCRYPTION_KEY` | string (secret) | AES-GCM 256-bit key for email tokens |
| `JWT_SECRET` | string (secret) | Signs admin JWTs |
| `ADMIN_SECRET` | string (secret) | TOTP seed for admin login |
| `ADMIN_API_KEY` | string (secret) | Static API key for automated admin access |
| `BASE_URL` | string | Worker's public URL |

### API Documentation

OpenAPI spec is served at `GET /openapi`; interactive Scalar UI at `GET /docs`.
