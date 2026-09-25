# EntryWise Self-Hosting Guide

EntryWise is designed with a **Plug-and-Play Dual Architecture**:
1. **Cloudflare Edge-Native**: Globally distributed across 300+ edge locations using Cloudflare Workers, Cloudflare D1 (SQLite), Cloudflare Queues, and Cloudflare Pages.
2. **Self-Hosted Standalone**: Runs on any private server, VPS (Hetzner, DigitalOcean, AWS EC2, Linode), or local Docker container without Cloudflare lock-in.

---

## Architecture Overview: Cloudflare vs. Self-Hosted

| Component | Managed Cloudflare Edge | Self-Hosted Docker / VPS |
| :--- | :--- | :--- |
| **Runtime** | Cloudflare Workers (`workerd`) | Bun / Node.js Container |
| **Database** | Cloudflare D1 (Serverless SQLite) | Local SQLite (`entrywise.db`) or PostgreSQL |
| **Message Queue** | Cloudflare Queues (`entrywise-submissions`) | In-Memory Async Worker or Redis |
| **File Attachments**| Cloudflare R2 | Local Mounted Volume (`/app/uploads`) or S3 / MinIO |
| **Email Delivery** | Cloudflare Send Email / Resend | SMTP (`SMTP_HOST`) or Resend API |
| **Dashboard UI** | Cloudflare Pages SPA | Bundled Static SPA inside container |
| **Latency** | Global edge (~15–30ms) | Dependent on VPS location |

---

## 1. Quickstart (Docker Compose)

### Prerequisites
- Docker Engine 24+ and Docker Compose v2 installed.

### Step 1: Clone and Configure
```bash
git clone https://github.com/vakhariaheet/entry-wise.git
cd entry-wise
cp .env.example .env
```

### Step 2: Set Secrets in `.env`
Generate random 32-byte strings for your cryptographic secrets:
```bash
# Generate keys
openssl rand -hex 16 # for ENCRYPTION_KEY (32 hex characters)
openssl rand -base64 32 # for JWT_SECRET
openssl rand -base64 32 # for ADMIN_SECRET
```
Paste these into `.env`:
```ini
JWT_SECRET=your_generated_jwt_secret
ADMIN_SECRET=your_generated_admin_secret
ENCRYPTION_KEY=your_generated_32_char_hex_key
```

### Step 3: Launch EntryWise
```bash
docker compose up -d
```

EntryWise is now live:
- **Web Dashboard**: `http://localhost:8787/app`
- **Form Ingestion Endpoint**: `POST http://localhost:8787/f/:api_key`
- **Interactive API Docs (Scalar)**: `http://localhost:8787/docs`
- **OpenAPI Schema**: `http://localhost:8787/openapi`

---

## 2. Directory Structure & Volume Persistence

The `docker-compose.yml` mounts two persistent volumes to your host:
```
entry-wise/
├── data/              # Stores entrywise.db (SQLite database)
│   └── entrywise.db   # Form definitions, sites, submissions, auth records
└── uploads/           # Stores uploaded file attachments
```
> **Backup Tip**: Backing up your entire EntryWise installation is as simple as copying the `./data` and `./uploads` directories.

---

## 3. Asynchronous Queue & Connectors in Self-Hosted Mode

When running in Docker:
1. **In-Memory Async Processing (Default)**:
   - Form submissions are saved to the database immediately and return an `HTTP 200` to the client.
   - External connectors (Slack, Discord, Google Sheets, Webhooks, Resend/SMTP emails) are processed asynchronously in the background.
2. **Distributed Redis Queue (Optional for High-Throughput)**:
   - If processing tens of thousands of submissions per hour, start the Redis profile:
     ```bash
     docker compose --profile with-redis up -d
     ```
   - Set `QUEUE_DRIVER=redis` and `REDIS_URL=redis://redis:6379` in your `.env`.

---

## 4. Production Reverse Proxy & SSL (HTTPS)

For production deployments on a VPS, expose EntryWise behind a reverse proxy for automatic SSL certificate generation.

### Option A: Caddy (Recommended — Zero Config SSL)
Create a `Caddyfile`:
```caddy
forms.yourdomain.com {
    reverse_proxy localhost:8787
}
```
Run Caddy: `caddy run`

### Option B: Nginx
```nginx
server {
    listen 80;
    server_name forms.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name forms.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/forms.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/forms.yourdomain.com/privkey.pem;

    client_max_body_size 25M;

    location / {
        proxy_pass http://127.0.0.1:8787;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 5. Connecting Forms in Self-Hosted Mode

Just like on Cloudflare, your HTML or React form points directly to the API key endpoint:
```html
<form action="https://forms.yourdomain.com/f/ew_live_abc123" method="POST">
  <input type="text" name="_gotcha" style="display:none" tabindex="-1" autocomplete="off" />
  
  <input type="text" name="name" placeholder="Your Name" required />
  <input type="email" name="email" placeholder="Your Email" required />
  <textarea name="message" placeholder="Your Message" required></textarea>

  <button type="submit">Submit Form</button>
</form>
```
