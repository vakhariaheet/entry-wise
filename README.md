<div align="center">

# ⚡ EntryWise

**The Lightweight, Zero-Lock-In Headless Form Backend for Modern Developers**

Accept HTML & JSON form submissions, auto-discover schemas, block spam at the edge, send customizable emails, and sync leads directly to **Airtable, Notion, Google Sheets, Slack, Discord, and Signed Webhooks**—deployed globally on **Cloudflare Workers** or self-hosted anywhere via **Docker**.

[![OpenAPI 3.1](https://img.shields.io/badge/OpenAPI-3.1-10b981?style=flat-square)](https://entrywise.webbound.in/docs)
[![Vacuum API Score](https://img.shields.io/badge/Vacuum_Quality-100%2F100_%5BA%2B%5D-10b981?style=flat-square)](https://entrywise.webbound.in/docs)
[![Docker Ready](https://img.shields.io/badge/Self--Host-Docker_%7C_Cloudflare-3b82f6?style=flat-square)](./docs/SELF_HOSTING.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-zinc?style=flat-square)](./LICENSE)

[**Live Console**](https://entrywise-app.pages.dev) · [**Interactive API Reference (`/docs`)**](https://entrywise.webbound.in/docs) · [**Quickstart Guide**](./docs/QUICKSTART.md) · [**Self-Hosting (Docker & Cloudflare)**](./docs/SELF_HOSTING.md) · [**Connectors Guide**](./docs/CONNECTORS_AND_EMAIL.md) · [**Security & Privacy**](./docs/SECURITY_AND_PRIVACY.md)

</div>

---

## Why EntryWise?

Most form backends force an uncomfortable trade-off: either pay high monthly SaaS tiers for basic webhooks and spam filtering, or deploy a bloated, monolithic form builder that locks you into a single cloud provider.

**EntryWise is built differently:**
- **Zero Boilerplate (`<1.5KB` Drop-In Binder):** Add `class="entrywise-form"` to any HTML `<form>` or point `action="https://entrywise.webbound.in/f/YOUR_SITE_KEY"`. No client SDKs or state boilerplate required.
- **Auto-Schema Discovery:** Send your first submission and EntryWise automatically infers field types (`email`, `phone`, `url`, `file`, `text`) and builds your form schema on the fly.
- **Zero Platform Lock-In:** Run on **Cloudflare Workers + D1 + Queues**, or self-host anywhere with **`docker compose up -d`** using portable SQLite, pluggable queues (`memory` or `http`), and your choice of email engine (`Resend`, `SMTP2GO`, `MailerSend`, `Mailtrap`, or `Webhook`).
- **Direct Zero-OAuth Connectors:** Sync submissions straight into **Airtable**, **Notion**, **Google Sheets**, **Slack**, **Discord**, and **HMAC-SHA256 Signed Webhooks** without complex OAuth flows.
- **Privacy & Security First:** Built-in Cloudflare Turnstile, honeypots, disposable email blocking, spam keyword blacklists, GDPR Zero-IP anonymization (`anonymize_ip`), and auto-pruning retention policies.

---

## ⚡ 30-Second Quickstart

### Option 1: Drop-In Class Binder (`<1.5KB`, Zero JS Boilerplate)

Include `/embed.js` once and add `class="entrywise-form"` (or your own custom class via `data-class`) to any `<form>`. It automatically intercepts submit events, disables the submit button while sending, and renders accessible inline status messages:

```html
<!-- 1. Drop-in script (auto-detects cloud or self-hosted origin) -->
<script
  src="https://entrywise.webbound.in/embed.js"
  data-site-key="ew_live_your_site_key"
  defer
></script>

<!-- 2. Add class="entrywise-form" to any HTML form -->
<form
  class="entrywise-form"
  data-success="Thanks! We received your message and will reply shortly."
>
  <!-- Optional Magic HTML Directives -->
  <input type="hidden" name="_subject" value="New inquiry from acme.com" />
  <input type="hidden" name="_cc" value="sales@acme.com" />

  <input type="text" name="name" placeholder="Full Name" required />
  <input type="email" name="email" placeholder="Work Email" required />
  <textarea name="message" placeholder="How can we help?" required></textarea>

  <button type="submit">Send Message</button>
</form>
```

### Option 2: Pure HTML `<form>` (No JavaScript Required)

Works natively with static sites, Astro, Webflow, Framer, or plain HTML (`application/x-www-form-urlencoded` and `multipart/form-data`):

```html
<form
  action="https://entrywise.webbound.in/f/ew_live_your_site_key"
  method="POST"
  enctype="multipart/form-data"
>
  <!-- Invisible Honeypot Bot Trap -->
  <input type="text" name="_gotcha" style="display:none !important" tabindex="-1" autocomplete="off" />

  <!-- Optional Safe Redirect (303 See Other) -->
  <input type="hidden" name="_redirect" value="https://yourdomain.com/thank-you" />

  <input type="text" name="name" required />
  <input type="email" name="email" required />
  <input type="file" name="attachment" />

  <button type="submit">Submit</button>
</form>
```

### Option 3: Direct JSON API (`fetch` / React / Next.js Server Actions)

```ts
const response = await fetch('https://entrywise.webbound.in/f/ew_live_your_site_key', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Elena Rostova',
    email: 'elena@acme.com',
    message: 'Interested in self-hosting EntryWise.',
    _subject: 'Enterprise Inquiry — Acme Corp',
    _replyto: 'elena@acme.com',
  }),
});

const result = await response.json();
// => { is_success: true, submission_id: "sub_...", message: "Submission received successfully" }
```

---

## 🪄 Magic Form Directives

Control email routing and post-submission behavior directly from your HTML inputs or JSON keys—all `_`-prefixed directives are sanitized against CRLF header injection and stripped before database storage:

| Directive | Description | Example |
| :--- | :--- | :--- |
| `_subject` | Overrides the admin notification email subject (supports `{{variable}}` interpolation). | `"New Lead from {{name}}"` |
| `_replyto` | Sets the `Reply-To` header on the admin notification email (auto-defaults to the submitter's `email` field). | `"customer@domain.com"` |
| `_cc` | Comma-separated list of up to 5 additional recipients to CC on the notification email. | `"team@acme.com,founder@acme.com"` |
| `_redirect` / `_next` | Redirects browser form submissions (`303 See Other`) to a verified same-domain or allowlisted URL. | `"https://acme.com/thanks"` |
| `_gotcha` / `_honeypot` | Invisible bot trap field; if filled by an automated scraper, the submission is silently rejected. | `""` |

---

## 🔌 Built-In Connectors & Delivery Pipeline

Every valid submission is persisted immediately and dispatched asynchronously through the delivery pipeline:

| Connector | Setup Requirements | Highlights |
| :--- | :--- | :--- |
| **Email Notifications & Auto-Responders** | Resend, SMTP2GO, MailerSend, Mailtrap, Webhook, or Cloudflare Email | Visual Email Studio with live preview, custom HTML mode, and `{{variable}}` interpolation. |
| **Airtable** | Personal Access Token (`pat...`), Base ID (`app...`), Table Name | Uses `typecast: true` so single-select options, dates, and numbers convert automatically. |
| **Notion** | Internal Integration Secret (`ntn_...`), Database ID or URL | Auto-discovers your database's `title` column and maps matching properties + full page body blocks. |
| **Google Sheets** | Apps Script Web App URL | Appends timestamped rows in real time with zero OAuth token expiration issues. |
| **Slack & Discord** | Incoming Webhook URL | Rich formatted blocks/embeds with field tables and direct inbox triage links. |
| **Signed Webhooks** | Target HTTPS URL + Optional Signing Secret | Multi-webhook fanout signed with `X-EntryWise-Signature` (`HMAC-SHA256` + timestamp replay protection). |

---

## 🐳 Self-Hosting: Docker or Cloudflare (Zero Lock-In)

EntryWise runs identically on **Docker / any VPS** and **Cloudflare Workers**.

### Architecture Matrix

| Layer | Docker / VPS / Railway / Fly.io (`src/server.ts`) | Cloudflare Edge (`src/index.ts`) |
| :--- | :--- | :--- |
| **HTTP Runtime** | `Bun.serve` (`oven/bun:1-alpine`) | Cloudflare Workers (`workerd`) |
| **Database** | Portable `bun:sqlite` D1 Adapter (`./data/entrywise.sqlite`) | Cloudflare D1 Serverless SQLite |
| **Queue Engine** | `QUEUE_DRIVER=memory` (in-process retry queue) or `QUEUE_DRIVER=http` (QStash / BullMQ / n8n) | Cloudflare Queues (`SUBMISSIONS_QUEUE`) or `QUEUE_DRIVER=http` |
| **Default Email Engine** | `DEFAULT_EMAIL_PROVIDER=resend \| smtp2go \| mailersend \| mailtrap \| webhook \| console` | Cloudflare Email (`env.EMAIL`) or any configured provider |
| **Rate Limiting & Files** | In-Memory TTL KV + Local Disk Volume (`./data/uploads`) | Cloudflare KV + Cloudflare R2 |

### Option A: Deploy with Docker Compose (Any Server / VPS)

```bash
git clone https://github.com/vakhariaheet/entry-wise.git
cd entry-wise
cp .env.example .env

# Configure your preferred Queue & Email provider in .env:
# QUEUE_DRIVER=memory
# DEFAULT_EMAIL_PROVIDER=resend
# RESEND_API_KEY=re_xxxxxxxxx
# DEFAULT_FROM_EMAIL=notifications@yourdomain.com

docker compose up -d
```

On startup, EntryWise automatically initializes `./data/entrywise.sqlite` (WAL mode) and applies all SQL migrations in `./migrations`.

### Option B: Deploy on Cloudflare Workers & D1

```bash
git clone https://github.com/vakhariaheet/entry-wise.git
cd entry-wise && bun install

# Create D1 database & apply migrations
bunx wrangler d1 create entrywise
bunx wrangler d1 migrations apply entrywise --remote

# Deploy Worker
bunx wrangler deploy --minify
```

See the full [**Self-Hosting Guide (`docs/SELF_HOSTING.md`)**](./docs/SELF_HOSTING.md) for reverse-proxy SSL configs (Caddy / Nginx), external HTTP queues, and backup strategies.

---

## 🛡️ Security & Privacy Engine

EntryWise is engineered to **Zalando RESTful API Guidelines** (scoring **100/100 [A+]** on Vacuum OpenAPI linting) and includes defense-in-depth protections for both platform operators and form owners:

- **SSRF Protection (`src/utils/ssrfGuard.ts`):** Blocks loopback, link-local, cloud metadata (`169.254.169.254`), and RFC1918 private IPs on all outbound webhooks and connectors.
- **Open Redirect Guard (`src/utils/redirectGuard.ts`):** Validates `_redirect` / `_next` URLs against the registered site domain and `allowed_origins`, blocking protocol-relative (`//evil.com`) and `javascript:` payloads.
- **CSV Formula Injection Defense (CWE-1236):** Neutralizes leading `=`, `+`, `-`, `@`, `\t`, and `\r` characters on CSV exports so spreadsheet apps never execute injected formulas.
- **User-Facing Privacy Controls:**
  - **Disposable Email Blocker (`block_disposable_emails`):** Rejects throwaway/temp-mail domains at ingestion.
  - **Spam Keyword Blacklist (`spam_keywords`):** Auto-routes matching submissions to the `spam` folder and suppresses downstream notifications.
  - **GDPR Zero-IP Mode (`anonymize_ip`):** Masks the final octet of IPv4 (`203.0.113.0`) and trailing 80 bits of IPv6 before database commit.
  - **Auto-Prune Data Retention (`data_retention_days`):** Automatically purges submissions older than $N$ days on rolling ingestion.
- **Secret Encryption & Redaction:** Provider tokens and connector credentials are encrypted at rest with **AES-GCM-256** (`ENCRYPTION_KEY`) and redacted from all `GET` API responses.

---

## 📚 Documentation Hub

| Guide | What It Covers |
| :--- | :--- |
| [**Quickstart & Integration Guide**](./docs/QUICKSTART.md) | HTML forms, `/embed.js` class binder, React/Next.js snippets, Magic HTML fields, and Auto-Schema Discovery. |
| [**Self-Hosting & Docker Guide**](./docs/SELF_HOSTING.md) | Running via `docker compose`, configuring `QUEUE_DRIVER` and `DEFAULT_EMAIL_PROVIDER`, Cloudflare Workers setup, and Caddy/Nginx SSL. |
| [**Connectors & Email Studio**](./docs/CONNECTORS_AND_EMAIL.md) | Connecting Resend/SMTP2GO/MailerSend/Mailtrap/Webhook email, Airtable, Notion, Google Sheets, Slack, Discord, and verifying `X-EntryWise-Signature`. |
| [**Security & Privacy Architecture**](./docs/SECURITY_AND_PRIVACY.md) | Bot defense, GDPR Zero-IP mode, data retention auto-pruning, SSRF/XSS/CSV hardening, and Pipeline Diagnostics. |
| [**Interactive OpenAPI 3.1 Reference**](https://entrywise.webbound.in/docs) | Live Scalar API reference for all 30 REST endpoints (`/v1/companies`, `/v1/sites`, `/v1/submissions`, `/f/:apiKey`). |

---

## 🧪 Local Development & Quality Gates

```bash
# Run the full unit & integration test suite (50+ tests including Docker SQLite/Queue adapters)
bun test

# Run in local Docker/Bun standalone mode (auto-migrates ./data/entrywise.sqlite)
bun run dev:docker

# Run in Cloudflare Workers local simulator
bun run dev

# Format & lint with Biome + verify OpenAPI 3.1 Vacuum score (100/100 [A+])
bun run check
bun run security:check
```

---

## License

MIT © [Webbound](https://webbound.in) — see [LICENSE](./LICENSE) for details.
