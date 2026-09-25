# EntryWise — Architecture, Connectors & Open-Source Roadmap

## 1. Vision & Core Philosophy

EntryWise is designed as a developer-first, privacy-focused, and high-performance **Form-Backend-as-a-Service (FBaaS)**. It is built to support a **Dual-Deployment Model**:

1. **Cloudflare Edge-Native (Production Managed)**: Runs globally across 300+ PoPs on Cloudflare Workers, Cloudflare D1 (SQLite), Cloudflare R2, Cloudflare Queues, and Cloudflare Pages. Delivers sub-15ms edge response times with zero server maintenance.
2. **Self-Hosted Standalone (Docker / On-Prem)**: Runs on any standard VPS, homelab, or private cloud via a single `docker compose up -d` container powered by Bun/Node.js, local SQLite/PostgreSQL, local disk storage / MinIO, and standard SMTP.

---

## 2. Hexagonal (Ports & Adapters) System

To ensure seamless portability between Cloudflare and Docker, the core domain engine is isolated from infrastructure through clean interfaces:

```
                          ┌────────────────────────┐
                          │   CORE DOMAIN ENGINE   │
                          │ (Validation, Honeypot, │
                          │  Spam, Auth, Pipeline) │
                          └───────────┬────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          │                           │                           │
          ▼                           ▼                           ▼
┌───────────────────┐       ┌───────────────────┐       ┌───────────────────┐
│  DATABASE PORTS   │       │   STORAGE PORTS   │       │    EMAIL PORTS    │
│  - Cloudflare D1  │       │  - Cloudflare R2  │       │  - Cloudflare Mail│
│  - Local SQLite   │       │  - AWS S3 / MinIO │       │  - Resend         │
│  - PostgreSQL     │       │  - Local Disk FS  │       │  - Standard SMTP  │
└───────────────────┘       └───────────────────┘       └───────────────────┘
```

### Environment Variable Driver Matrix
```bash
ENTRYWISE_DB_DRIVER=d1|sqlite|postgres
ENTRYWISE_STORAGE_DRIVER=r2|s3|local
ENTRYWISE_EMAIL_DRIVER=cloudflare|resend|postmark|smtp
ENTRYWISE_QUEUE_DRIVER=cloudflare|outbox|redis
```

---

## 3. Message Queue Architecture

### The Latency & Failure Problem Without Queues
If a public form submission synchronously triggers D1 writes, email rendering, Resend API calls, Slack webhooks, and Google Sheets updates in the HTTP request cycle, total response time stretches to **2,500ms–4,000ms**. If an external API experiences downtime or high latency, the entire submission fails for the end user.

### Decoupled Queue Solution
1. **Edge Ingestion Layer (`POST /f/:key` or `POST /v1/submissions`)**:
   - Executes fast validation: Honeypot check, Turnstile token verification, origin validation.
   - Pushes raw payload to the queue.
   - Returns immediate `HTTP 200 JSON` or `HTTP 303 Redirect` in **< 15ms**.
2. **Queue Consumer & Dispatch Pipeline**:
   - Dispatches connectors concurrently with isolated failure handling.
   - Retries failing external endpoints using exponential backoff (1m, 5m, 15m, 1h).
   - Unrecoverable failures move to a **Dead-Letter Queue (DLQ)** viewable in the dashboard with a manual "Replay / Retry" trigger.
3. **Dual Runtime Queue Support**:
   - **Cloudflare Edge**: Native `Cloudflare Queues` (`env.SUBMISSIONS_QUEUE`).
   - **Docker / Self-Hosted**: **SQLite Transactional Outbox Pattern** (zero extra Redis/RabbitMQ containers needed; fully persistent in the local SQLite database).

---

## 4. The Complete Connectors Taxonomy

Based on developer community feedback (Reddit `r/webdev`, `r/selfhosted`, `r/SaaS`, Hacker News):

### Tier 1: Spreadsheets & Data Warehouses (#1 Requested)
- **Google Sheets**: Real-time append of submissions as rows in Google Spreadsheets.
- **Airtable**: Automatic record creation in target Base and Table.
- **Notion**: Page creation inside target Notion Database.

### Tier 2: Instant Team Notification Alerts
- **Slack**: Formatted Block Kit cards to designated channel (e.g. `#leads`, `#support`).
- **Discord**: Rich Embeds with colored status banners.
- **Telegram Bot**: Instant message alerts to a group or chat ID.
- **Microsoft Teams**: Adaptive card webhooks.

### Tier 3: Automation Hubs & Webhooks
- **Custom HMAC Webhooks**: Signed payloads with `X-EntryWise-Signature: sha256=...` and customizable headers.
- **n8n**: Native workflow trigger compatibility (#1 self-hosted automation tool).
- **Zapier & Make.com**: REST Hook bundles.

### Tier 4: Email Marketing & Newsletters
- **Loops.so**: Developer-first email platform contact sync.
- **Mailchimp / Kit (ConvertKit)**: Audience list subscriptions.
- **Klaviyo / Brevo**: E-commerce lead ingestion.

### Tier 5: CRMs & Lead Pipelines
- **HubSpot**: Contact and Deal creation.
- **Attio**: Person and Company record generation.
- **Pipedrive**: Inbound sales lead creation.

### Tier 6: Developer Ticketing & Issue Trackers
- **Linear**: Automatically create Linear Issues for bug reports / user feedback forms.
- **GitHub Issues**: Create issues in target repository with formatted Markdown.

---

## 5. Security & Threat Hardening

1. **HTML Entity Encoding**: Escape all form values in email notifications and auto-responders to prevent stored XSS and email injection attacks.
2. **Open Redirect Mitigation**: Restrict `_next` and `_redirect` destinations to the registered domain or relative paths. Reject `javascript:` and dangerous protocols.
3. **SSRF Webhook Protection**: Deny private CIDR blocks (`127.0.0.0/8`, `10.0.0.0/8`, `169.254.169.254`) on webhook URLs; enforce 5-second HTTP request timeouts.
4. **Email Reply-To Injection**: Automatically set `Reply-To: ${submitterEmail}` on admin notifications for 1-click customer replies.
5. **Cryptographic JWT Validation**: Validate Clerk JWT tokens via Clerk JWKS public keys.
6. **Cloudflare Turnstile & Intelligent Honeypot**: Invisible bot challenge with zero friction for legitimate humans.
