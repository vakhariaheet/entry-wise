# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.2.0-beta.1] - 2026-09-23 (Pre-release)

> **Note**: This is an active pre-release build of 0.2.0 undergoing testing and stabilization. It is not considered a final stable release.

### Added
- **Zalando RESTful API Guidelines Compliance**:
  - Mounted complete REST API surface under `/v1/` using kebab-case resource paths (`/v1/companies`, `/v1/sites`, `/v1/submissions`).
  - Standardized all JSON payloads, request queries, and response bodies to strict `snake_case`.
  - Added RFC 7807 Problem Details (`application/problem+json`) with standard fields: `type`, `title`, `status`, `detail`, `instance`, and `invalid_params`.
  - Implemented standard HTTP responses: `201 Created` with `Location` header, `204 No Content` for deletions, `PATCH` for partial resource updates, and `PUT` for atomic collection replacements.
  - Implemented standard pagination envelope `{ items: [...], total_count, limit, offset }`.
- **Submission Persistence & Inbox Management**:
  - Stored every submission in Cloudflare D1 with client IP capture, status tracking, and timestamps.
  - Added `GET /v1/sites/{id}/submissions` for listing submissions with status filter (`new`, `read`, `archived`, `spam`) and full-text keyword search.
  - Added `GET /v1/submissions/{id}` to fetch complete submission details.
  - Added `PATCH /v1/submissions/{id}` to triage submission status.
  - Added `DELETE /v1/submissions/{id}` to remove submissions.
  - Added `GET /v1/sites/{id}/submissions/export` streaming RFC 4180 CSV (`?format=csv`) or JSON (`?format=json`).
- **Auto-Responder Emails**:
  - Configurable auto-responder per site (`auto_responder_enabled`, `auto_responder_subject`, `auto_responder_body`).
  - Dynamic mustache-style interpolation of form fields (`{{name}}`, `{{email}}`, custom inputs) into confirmation emails.
  - Responsive confirmation email template rendered via `AutoResponderEmail`.
- **Signed Webhooks**:
  - Real-time HTTP POST notifications to third-party endpoints (`webhook_url`) on valid submissions.
  - Web Crypto HMAC-SHA256 signature generated in `X-EntryWise-Signature` header (`t=<timestamp>,v1=<signature>`) for tamper resistance and replay attack protection.
- **Cloudflare Turnstile Bot Protection**:
  - Native verification against Cloudflare Turnstile (`challenges.cloudflare.com/turnstile/v0/siteverify`).
  - Form validation for `cf-turnstile-response` token against configured `turnstile_secret_key`.
- **Cloudflare Native Email Support**:
  - Added `cloudflare` email provider using `cloudflare:email` Worker binding (`send_email`).
  - Constructed standard RFC 2045 multi-part MIME messages with Base64 encoding.
- **Developer Experience (DX) Improvements**:
  - Direct JSON submissions (`{ "name": "Jane", "email": "jane@example.com" }`) without required `metadata` wrappers.
  - Native HTML `<form>` submissions with `multipart/form-data` and `application/x-www-form-urlencoded`.
  - File upload mapping directly by form input name (`name="resume"`).
  - Custom redirect support (`_redirect` / `_next` returning `303 See Other`) and default thank-you landing page.
  - Static `ADMIN_API_KEY` authentication (`X-Admin-Key`, `X-Admin-Api-Key`, or `Bearer <key>`) alongside TOTP JWT auth.
- **Interactive Documentation**:
  - Integrated Scalar API documentation at `/docs` with OpenAPI 3.1 specification.

### Changed
- Migrated default sender domain from `entrywise.co.in` to `entrywise.webbound.in` (`no-reply@entrywise.webbound.in`).
- Updated problem details type URLs to `https://entrywise.webbound.in/problems/...`.
- Preserved legacy routes (`/public/submit`, `/auth`, `/companies`, `/sites`, `/fields`) as backwards-compatible aliases.

---

## [0.1.0] - 2026-09-15

### Added
- Initial project scaffold with Hono and Cloudflare Workers.
- Initial email provider services for Resend, MailerSend, Mailtrap, and SMTP2GO.
- Basic form submission endpoint with email notifications and attachment forwarding.
- Honeypot spam filtering field (`_gotcha`).
- TOTP 6-digit code authentication with JWT generation.
- AES-GCM-256 encryption at rest for provider tokens.
- Cloudflare KV rate limiting sliding window.
