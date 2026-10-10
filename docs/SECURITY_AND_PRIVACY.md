# 🛡️ Security & Privacy Architecture

EntryWise provides two complementary layers of security:
1. **End-User Privacy & Anti-Spam Controls:** Configurable per form/site via the Console or REST API to protect form owners from bots, spam, and GDPR/CCPA liability.
2. **Platform Defense-in-Depth:** Built-in cryptographic and network protections that harden the server against SSRF, XSS, Open Redirects, CRLF Header Injection, and CSV Formula Injection.

---

## 1. End-User Spam & Privacy Controls (Per-Site)

Configure these fields on any site via the Console (**Settings → Security & Privacy**) or `PUT /v1/sites/{id}`:

| Setting | Field Name | Description |
| :--- | :--- | :--- |
| **Cloudflare Turnstile** | `turnstile_secret_key` | Server-side verification of `cf-turnstile-response` tokens against `challenges.cloudflare.com/turnstile/v0/siteverify`. |
| **Disposable Email Blocker** | `block_disposable_emails` (`0` or `1`) | Blocks submissions from known throwaway/temp-mail providers (`mailinator.com`, `10minutemail.com`, `guerrillamail.com`, `yopmail.com`, etc.) with `422 Unprocessable Entity`. |
| **Spam Keyword Blacklist** | `spam_keywords` (CSV string) | Case-insensitive keyword list (e.g. `"crypto, casino, backlinks, seo agency"`). Matching submissions are stored in the `spam` tab (`status = 'spam'`) and **all downstream emails/webhooks are suppressed** to protect your sender reputation. |
| **GDPR Zero-IP Mode** | `anonymize_ip` (`0` or `1`) | Masks the final octet of IPv4 addresses (`203.0.113.42` → `203.0.113.0`) and trailing 80 bits of IPv6 addresses **before** writing to SQLite/D1 or queues. |
| **Auto-Prune Retention** | `data_retention_days` (`0`, `30`, `90`, `365`) | Automatically purges submissions older than the configured number of days (`0` = keep forever). |
| **CORS Origin Lock** | `allowed_origins` (CSV string) | Restricts cross-origin browser submissions to your exact production domains and staging URLs (supports wildcard subdomains like `*.acme.com`). |

---

## 2. Platform Defense-in-Depth

### SSRF Guard (`src/utils/ssrfGuard.ts`)
Every user-supplied webhook URL (`webhooks.url`, `slack_webhook_url`, `discord_webhook_url`, `google_sheets_url`) is validated before storage and dispatch:
- Enforces `https://` in production.
- Blocks `localhost`, `127.0.0.0/8`, `0.0.0.0`, IPv6 loopback (`::1`), link-local cloud metadata endpoints (`169.254.169.254`), and RFC1918 private networks (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`).

### Open Redirect Guard (`src/utils/redirectGuard.ts`)
When a form includes `_redirect` or `_next`:
- Relative paths (`/thank-you`) are allowed, while protocol-relative URLs (`//attacker.com`) and dangerous schemes (`javascript:`, `data:`) are rejected.
- Absolute URLs are only permitted if their hostname matches the site's registered `domain` or an entry in `allowed_origins`.

### CSV Formula Injection Defense (`CWE-1236`)
When exporting submissions to CSV (`GET /v1/sites/{site_id}/submissions/export?format=csv`), any cell value starting with `=`, `+`, `-`, `@`, `\t`, or `\r` is prefixed with a single quote (`'`) and RFC 4180-quoted so Microsoft Excel, Google Sheets, and LibreOffice Calc never execute untrusted formulas.

### Stored XSS & CRLF Header Sanitization
- All form values interpolated into HTML email templates (`FormSubmissionEmail`, `AutoResponderEmail`, and custom templates) are HTML-entity escaped via `escapeHtml`.
- Magic email header directives (`_subject`, `_replyto`, `_cc`) strip all `\r` and `\n` characters via `sanitizeHeaderValue` to prevent SMTP/HTTP header injection.

### At-Rest Encryption & Secret Redaction
- Third-party email provider tokens (`email_provider_token`) and Turnstile keys are encrypted using **Web Crypto AES-GCM-256** (`src/utils/encryption.ts`).
- Site responses pass through `redactSiteSecrets` (`src/utils/redactSite.ts`), replacing raw tokens (`airtable_token`, `notion_token`, `turnstile_secret_key`, `webhook_secret`) with boolean readiness flags (`airtable_configured: true`, `notion_configured: true`, `has_turnstile: true`).
