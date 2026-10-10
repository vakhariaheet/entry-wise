# 🐳 EntryWise Self-Hosting Guide (Docker & Cloudflare)

EntryWise is built on a **Zero Platform Lock-In Architecture**. You can run the exact same codebase on:
1. **Docker Compose / Any Server / VPS** (Hetzner, DigitalOcean, AWS EC2, Railway, Fly.io, Coolify, Render) using portable SQLite (`bun:sqlite`), pluggable queues (`QUEUE_DRIVER=memory | http`), and any email provider (`DEFAULT_EMAIL_PROVIDER`).
2. **Cloudflare Edge** using Cloudflare Workers, D1, Queues, KV, R2, and Cloudflare Email Routing.

---

## Architecture Comparison

| Component | Docker / Standalone (`src/server.ts`) | Cloudflare Edge (`src/index.ts`) |
| :--- | :--- | :--- |
| **Runtime** | `Bun.serve` (`oven/bun:1-alpine`) | Cloudflare Workers (`workerd`) |
| **Database** | Local SQLite (`./data/entrywise.sqlite`) via `createSqliteD1Adapter` | Cloudflare D1 Serverless SQLite |
| **Migrations** | Auto-applied on startup from `./migrations/*.sql` | Applied via `wrangler d1 migrations apply` |
| **Queue Engine** | `QUEUE_DRIVER=memory` (in-process retry queue) or `QUEUE_DRIVER=http` (QStash / BullMQ / n8n) | Cloudflare Queues (`SUBMISSIONS_QUEUE`) or `QUEUE_DRIVER=http` |
| **Default Email Engine** | `DEFAULT_EMAIL_PROVIDER=resend \| smtp2go \| mailersend \| mailtrap \| webhook \| console` | Cloudflare Email (`env.EMAIL`) or any configured provider |
| **Rate Limiting & Uploads** | In-Memory TTL KV + Local Disk Volume (`./data/uploads`) | Cloudflare KV + Cloudflare R2 |

---

## Option A: Self-Hosting via Docker Compose (Zero Cloudflare Lock-In)

### 1. Clone & Configure `.env`

```bash
git clone https://github.com/vakhariaheet/entry-wise.git
cd entry-wise
cp .env.example .env
```

Generate your encryption and JWT secrets:
```bash
openssl rand -hex 32   # Set as ENCRYPTION_KEY in .env
openssl rand -hex 32   # Set as JWT_SECRET in .env
```

### 2. Choose Your Queue Engine (`QUEUE_DRIVER`)

In `.env`, configure how background deliveries (emails, webhooks, Slack, Discord, Airtable, Notion, Google Sheets) are queued:

- **In-Process Retry Queue (Default — Zero External Dependencies):**
  ```ini
  QUEUE_DRIVER=memory
  QUEUE_MAX_RETRIES=3
  ```
  Submissions are persisted to SQLite immediately (`HTTP 200`), and delivery tasks run asynchronously in the background with exponential backoff retries.

- **External HTTP Queue Bridge (Upstash QStash, BullMQ HTTP Bridge, n8n, RabbitMQ):**
  ```ini
  QUEUE_DRIVER=http
  QUEUE_WEBHOOK_URL=https://qstash.upstash.io/v2/publish/https://your-worker.yourdomain.com/webhooks/queue
  QUEUE_WEBHOOK_TOKEN=your_bearer_token
  QUEUE_MAX_RETRIES=3
  ```
  If the external queue endpoint is temporarily unreachable, EntryWise automatically falls back to local background processing so zero submissions are lost.

### 3. Choose Your Default Email Engine (`DEFAULT_EMAIL_PROVIDER`)

You do **not** need Cloudflare Email in Docker. Configure your preferred default email engine in `.env`:

```ini
# Options: resend | smtp2go | mailersend | mailtrap | webhook | console
DEFAULT_EMAIL_PROVIDER=resend
DEFAULT_FROM_EMAIL=notifications@yourdomain.com
DEFAULT_FROM_NAME=EntryWise Forms

# Set the API key matching your chosen provider:
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx
# SMTP2GO_API_KEY=...
# MAILERSEND_API_KEY=...
# MAILTRAP_API_KEY=...
# EMAIL_WEBHOOK_URL=https://your-n8n-or-smtp-bridge.internal/send
```

> [!NOTE]
> Individual workspaces created in the Console can either inherit your server's `DEFAULT_EMAIL_PROVIDER` automatically or override it with their own workspace-specific provider API key.

### 4. Start the Container

```bash
docker compose up -d
```

Verify the server is healthy:
```bash
curl http://localhost:8787/health
```

Your self-hosted instance is now serving:
- **Form Ingestion Endpoint:** `POST http://localhost:8787/f/:site_api_key`
- **Drop-In Class Binder Script:** `GET http://localhost:8787/embed.js`
- **Interactive API Reference:** `GET http://localhost:8787/docs`
- **OpenAPI 3.1 Spec:** `GET http://localhost:8787/openapi`

### 5. Persistent Volumes & Backups

`docker-compose.yml` mounts the `entrywise_data` volume to `/app/data`:
- `/app/data/entrywise.sqlite` — SQLite database in WAL mode (automatically migrated on container startup).
- `/app/data/uploads/` — Uploaded form attachments.

Backing up your entire self-hosted instance is as simple as snapshotting `/app/data`.

---

## Option B: Self-Hosting on Cloudflare Workers & D1

### 1. Install Dependencies & Login

```bash
git clone https://github.com/vakhariaheet/entry-wise.git
cd entry-wise
bun install
bunx wrangler login
```

### 2. Provision D1 & Apply Migrations

```bash
bunx wrangler d1 create entrywise
# Update database_id in wrangler.jsonc, then run migrations:
bunx wrangler d1 migrations apply entrywise --remote
```

### 3. Set Worker Secrets & Deploy

```bash
bunx wrangler secret put ENCRYPTION_KEY
bunx wrangler secret put JWT_SECRET
bunx wrangler deploy --minify
```

---

## Production Reverse Proxy (HTTPS for Docker / VPS)

When running via Docker on a VPS, place Caddy or Nginx in front of port `8787` for automatic TLS:

### Caddy (`Caddyfile`)
```caddy
forms.yourdomain.com {
    reverse_proxy localhost:8787
}
```
