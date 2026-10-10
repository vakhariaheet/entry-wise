export interface DocCodeExample {
  label: string;
  language: string;
  filename?: string;
  code: string;
}

export interface DocTableRow {
  key: string;
  type?: string;
  defaultVal?: string;
  description: string;
}

export interface DocCallout {
  type: 'info' | 'tip' | 'warning' | 'security';
  title: string;
  body: string;
}

export interface DocSection {
  id: string;
  heading: string;
  paragraphs: string[];
  bullets?: string[];
  codeExamples?: DocCodeExample[];
  table?: {
    headers: [string, string, string, string] | [string, string, string];
    rows: DocTableRow[];
  };
  callout?: DocCallout;
}

export interface DocArticle {
  slug: string;
  title: string;
  category:
    | 'Getting Started'
    | 'Core Concepts'
    | 'Self-Hosting'
    | 'Connectors & Email'
    | 'Security & Privacy';
  sortOrder: number;
  badge: string;
  readingTime: string;
  summary: string;
  sections: DocSection[];
  bodyMarkdown?: string;
}

export const DOC_CATEGORIES: Array<DocArticle['category']> = [
  'Getting Started',
  'Core Concepts',
  'Self-Hosting',
  'Connectors & Email',
  'Security & Privacy',
];

export const DEFAULT_DOCS: DocArticle[] = [
  {
    slug: 'introduction',
    title: 'Overview & Architecture',
    category: 'Getting Started',
    sortOrder: 1,
    badge: 'Sub-20ms Edge',
    readingTime: '3 min read',
    summary:
      'Learn how EntryWise ingests form submissions in under 20ms and routes payloads to SQLite, databases, spreadsheets, webhooks, and email providers without vendor lock-in.',
    sections: [
      {
        id: 'what-is-entrywise',
        heading: 'What is EntryWise?',
        paragraphs: [
          'EntryWise is an open-source, developer-first headless form backend engineered for speed, privacy, and zero platform lock-in. Point any HTML <form>, React component, or JSON fetch() call to your EntryWise endpoint (/f/:formKey) and get instant persistence, spam defense, connector routing, and transactional emails.',
          'Unlike heavyweight form builders that force proprietary iframes or bloated client bundles onto your site, EntryWise lets you keep 100% control over your markup and styling while handling everything that happens after a user clicks Submit.',
        ],
        bullets: [
          'Sub-20ms HTTP ingestion response time. Heavy connector and email fanout runs asynchronously.',
          'Dual-runtime architecture: deploy globally on Cloudflare Workers + D1 or self-host anywhere via a single Docker container using Bun + native SQLite.',
          'Zero-OAuth connectors for Airtable, Notion, Google Sheets, Slack, and Discord.',
          'Built-in Visual Email Studio with customizable confirmation & notification templates and multi-provider failover.',
        ],
      },
      {
        id: 'ingestion-pipeline',
        heading: 'How the Parallel Ingestion Pipeline Works',
        paragraphs: [
          'Every submission to POST /f/:formKey passes through a deterministic 4-stage pipeline designed so slow third-party APIs never block your end user:',
        ],
        bullets: [
          'Stage 1, Edge Gatekeeper (<2ms): Validates CORS origins, checks rate limits, evaluates honeypot fields (_gotcha), blocks disposable email domains, filters spam keywords, and verifies optional Cloudflare Turnstile tokens.',
          'Stage 2, Schema & Persistence (<5ms): Auto-discovers new field types on the fly, validates required/typed rules, masks IP addresses if GDPR Zero-IP mode is enabled, and commits the submission to SQLite / D1.',
          'Stage 3, Instant HTTP Response (<15ms total): Returns a clean 200 JSON response (or 302 redirect if _redirect is specified) back to the browser.',
          'Stage 4, Async Queue Fanout: Dispatches background jobs to your configured Queue Driver (Cloudflare Queues, In-Memory Queue, or external HTTP Worker) for Google Sheets auto-column expansion, Notion/Airtable sync, HMAC-SHA256 webhooks, and email notifications.',
        ],
      },
      {
        id: 'runtime-comparison',
        heading: 'Cloudflare Edge vs. Docker Self-Hosting',
        paragraphs: [
          'EntryWise uses a clean runtime adapter layer (src/runtime/*) so the exact same TypeScript codebase runs natively on Cloudflare Workers or inside any standard Docker container:',
        ],
        table: {
          headers: ['Subsystem', 'Cloudflare Edge Mode', 'Docker / Bun Self-Hosted', 'Env Toggle'],
          rows: [
            {
              key: 'Database',
              type: 'Cloudflare D1',
              defaultVal: 'bun:sqlite (WAL mode)',
              description: 'Auto-applies all SQL migrations on container boot (DATABASE_PATH).',
            },
            {
              key: 'Async Queue',
              type: 'Cloudflare Queues',
              defaultVal: 'In-Memory or HTTP Webhook',
              description: 'Controlled via QUEUE_DRIVER=memory | http | cloudflare.',
            },
            {
              key: 'Email Engine',
              type: 'Workspace BYOK / Resend',
              defaultVal: 'Resend / SMTP2GO / Webhook / Console',
              description: 'Controlled via DEFAULT_EMAIL_PROVIDER with per-workspace overrides.',
            },
            {
              key: 'Rate Limit & KV',
              type: 'Cloudflare KV',
              defaultVal: 'In-Memory TTL Store',
              description: 'Zero external Redis dependency required for single-container setups.',
            },
          ],
        },
      },
    ],
  },
  {
    slug: 'quickstart',
    title: '30-Second Quickstart',
    category: 'Getting Started',
    sortOrder: 2,
    badge: '3 Ways to Connect',
    readingTime: '4 min read',
    summary:
      'Connect any form to EntryWise in 30 seconds using our <1.5KB drop-in script tag, standard HTML form action, or JSON fetch in React, Next.js, and Astro.',
    sections: [
      {
        id: 'drop-in-embed',
        heading: 'Option 1: Zero-JS Class Binder (<1.5KB embed.js)',
        paragraphs: [
          'The fastest way to wire up a form on Webflow, Framer, WordPress, Astro, or plain HTML is our ultra-lightweight embed.js helper. Include the script once and add class="entrywise-form" plus data-form-key to any <form>.',
          'It automatically intercepts submit events, disables the submit button with a loading label, injects an invisible honeypot field, submits via AJAX, and renders inline success or error feedback without a page reload.',
        ],
        codeExamples: [
          {
            label: 'HTML + embed.js',
            language: 'html',
            filename: 'index.html',
            code: `<script src="https://api.entrywise.si/embed.js" defer></script>

<form
  class="entrywise-form"
  data-form-key="ew_live_your_form_key"
  data-success-message="Thanks! We will get back to you within 24 hours."
  data-submitting-text="Sending..."
>
  <input type="text" name="name" placeholder="Jane Doe" required />
  <input type="email" name="email" placeholder="jane@company.com" required />
  <textarea name="message" placeholder="How can we help?" required></textarea>
  <button type="submit">Send Message</button>
</form>`,
          },
        ],
      },
      {
        id: 'native-html-form',
        heading: 'Option 2: Pure HTML Form (Zero JavaScript)',
        paragraphs: [
          'Building a strict zero-JS static page? Point your <form action="..."> directly at your EntryWise endpoint. Use hidden inputs like _redirect and _gotcha to control post-submission redirects and bot filtering.',
        ],
        codeExamples: [
          {
            label: 'Pure HTML5 Form',
            language: 'html',
            filename: 'contact.html',
            code: `<form action="https://api.entrywise.si/f/ew_live_your_form_key" method="POST">
  <!-- Honeypot spam trap (keep hidden) -->
  <input type="text" name="_gotcha" style="display:none" tabindex="-1" autocomplete="off" />

  <!-- Optional custom redirect after submission -->
  <input type="hidden" name="_redirect" value="https://yoursite.com/thank-you" />

  <!-- Optional dynamic email subject -->
  <input type="hidden" name="_subject" value="New Website Lead" />

  <input type="email" name="email" required placeholder="you@domain.com" />
  <textarea name="message" required placeholder="Your message"></textarea>
  <button type="submit">Submit</button>
</form>`,
          },
        ],
      },
      {
        id: 'json-fetch-react',
        heading: 'Option 3: React / Next.js / Astro JSON Fetch',
        paragraphs: [
          'For modern single-page applications or server actions, send a standard application/json POST request. EntryWise accepts any arbitrary JSON object and automatically infers your schema on the first submission.',
        ],
        codeExamples: [
          {
            label: 'React / TypeScript',
            language: 'tsx',
            filename: 'ContactForm.tsx',
            code: `async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  const formData = new FormData(e.currentTarget);

  const res = await fetch('https://api.entrywise.si/f/ew_live_your_form_key', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(Object.fromEntries(formData)),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Submission failed');
  }
  console.log('Saved submission ID:', data.submissionId);
}`,
          },
        ],
      },
    ],
  },
  {
    slug: 'magic-directives',
    title: 'Magic HTML & JSON Directives',
    category: 'Core Concepts',
    sortOrder: 3,
    badge: 'Zero Backend Code',
    readingTime: '3 min read',
    summary:
      'Control email subjects, Reply-To headers, CC recipients, custom redirects, and honeypot traps directly from your HTML inputs or JSON payload.',
    sections: [
      {
        id: 'supported-directives',
        heading: 'Built-In Underscore Directives',
        paragraphs: [
          'EntryWise recognizes special underscore-prefixed fields in both multipart/urlencoded HTML forms and application/json payloads. These directives configure email routing and response behavior per submission without exposing sensitive credentials in client code.',
        ],
        table: {
          headers: ['Directive', 'Example Value', 'Behavior'],
          rows: [
            {
              key: '_gotcha / _honeypot',
              type: '"" (empty)',
              description:
                'Invisible bot trap. If populated by an automated scraper, EntryWise returns a fake 200 OK and silently drops the payload.',
            },
            {
              key: '_subject',
              type: '"New Enterprise Lead: Acme"',
              description:
                'Overrides the notification email subject line for this specific submission.',
            },
            {
              key: '_replyto / email',
              type: '"alex@acme.com"',
              description:
                'Sets the Reply-To header on the team notification email so you can reply directly from your email client.',
            },
            {
              key: '_cc',
              type: '"sales@acme.com,ops@acme.com"',
              description:
                'Comma-separated list of up to 5 email addresses to CC on the notification email.',
            },
            {
              key: '_redirect / _next',
              type: '"https://acme.com/thanks"',
              description:
                'Redirects browser form submissions (302 Found) to your custom thank-you URL.',
            },
          ],
        },
        callout: {
          type: 'info',
          title: 'Clean Payload Storage',
          body: 'Internal directives (_gotcha, _redirect, cf-turnstile-response) are stripped before storing your submission in SQLite or syncing to Google Sheets/Airtable/Notion so your database stays clean.',
        },
      },
      {
        id: 'mock-test-mode',
        heading: 'Sandbox & Mock Testing (?mock=true)',
        paragraphs: [
          'Want to test your frontend form validation, Turnstile widget, and API key configuration during local development or CI without polluting your production database or burning email quota?',
          'Append ?mock=true to your submission URL or send the X-EntryWise-Mock: true header. EntryWise executes the full validation and configuration preflight check (verifying whether your email provider key and connectors are properly configured) and returns a detailed diagnostic payload without writing to the database.',
        ],
        codeExamples: [
          {
            label: 'cURL Mock Submission',
            language: 'bash',
            filename: 'terminal',
            code: `curl -X POST "https://api.entrywise.si/f/ew_live_your_form_key?mock=true" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Test User", "email": "test@example.com"}'`,
          },
        ],
      },
    ],
  },
  {
    slug: 'auto-schema',
    title: 'Auto-Schema Discovery & Validation',
    category: 'Core Concepts',
    sortOrder: 4,
    badge: 'Smart Inference',
    readingTime: '3 min read',
    summary:
      'EntryWise automatically learns your form fields on the first submission and lets you lock or enforce strict type validation with one click.',
    sections: [
      {
        id: 'how-auto-schema-works',
        heading: 'Zero-Config Schema Learning',
        paragraphs: [
          'When you create a new form endpoint in EntryWise, you do not need to pre-define every field column up front. As soon as your first submission arrives, EntryWise inspects each key-value pair and infers the appropriate data type:',
        ],
        bullets: [
          'Strings formatted as valid email addresses are typed as email.',
          'Numeric values are typed as number.',
          'Booleans ("true", "false", true, false) are typed as boolean.',
          'All other text values are typed as string.',
        ],
      },
      {
        id: 'locking-schema',
        heading: 'Enforcing Strict Validation in Production',
        paragraphs: [
          'Once your form is live in production, you can toggle required flags or customize field types inside the EntryWise Console under the Schema tab. If a submission violates your required fields or type rules, EntryWise rejects it at the edge with a structured 400 Bad Request listing the exact field errors.',
        ],
        codeExamples: [
          {
            label: 'Validation Error Response (400)',
            language: 'json',
            filename: 'response.json',
            code: `{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "work_email",
      "message": "Expected a valid email address"
    },
    {
      "field": "company_size",
      "message": "Field is required"
    }
  ]
}`,
          },
        ],
      },
    ],
  },
  {
    slug: 'self-hosting-docker',
    title: 'Self-Hosting with Docker & Bun',
    category: 'Self-Hosting',
    sortOrder: 5,
    badge: 'Zero Cloudflare Lock-In',
    readingTime: '5 min read',
    summary:
      'Run EntryWise on any VPS, AWS EC2, Hetzner, Railway, Fly.io, or Kubernetes cluster with Docker Compose, native SQLite, and pluggable Queue & Email drivers.',
    sections: [
      {
        id: 'docker-compose-quickstart',
        heading: '1-Command Docker Compose Deployment',
        paragraphs: [
          'EntryWise ships with a production multi-stage Dockerfile and docker-compose.yml powered by Bun and native SQLite (bun:sqlite in WAL mode). It requires zero Cloudflare accounts or bindings.',
          'On startup, src/server.ts automatically creates the SQLite database file in your mounted volume and applies all SQL migrations from ./migrations in order.',
        ],
        codeExamples: [
          {
            label: 'Docker Compose Quickstart',
            language: 'bash',
            filename: 'terminal',
            code: `# 1. Copy the environment template
cp .env.example .env

# 2. Generate secure JWT & Master Encryption keys
openssl rand -hex 32

# 3. Boot EntryWise on port 8787
docker compose up -d --build

# 4. Verify health & active runtime drivers
curl http://localhost:8787/health`,
          },
        ],
      },
      {
        id: 'pluggable-queue-drivers',
        heading: 'Pluggable Queue Drivers (QUEUE_DRIVER)',
        paragraphs: [
          'Instead of locking you into Cloudflare Queues, self-hosted EntryWise lets you choose how background jobs (webhooks, connector sync, email notifications) are processed via the QUEUE_DRIVER environment variable:',
        ],
        table: {
          headers: ['QUEUE_DRIVER', 'Required Env Vars', 'How It Works'],
          rows: [
            {
              key: 'memory (default)',
              type: 'QUEUE_MAX_RETRIES=3',
              description:
                'Processes jobs asynchronously in-process using exponential backoff after returning the HTTP response. Ideal for single-container deployments.',
            },
            {
              key: 'http',
              type: 'QUEUE_HTTP_URL, QUEUE_HTTP_SECRET',
              description:
                'Forwards each background job via HTTP POST to an external worker, n8n, BullMQ bridge, Temporal, or RabbitMQ consumer with Bearer auth and automatic local fallback.',
            },
            {
              key: 'cloudflare',
              type: 'SUBMISSION_QUEUE binding',
              description:
                'Used automatically when deployed on Cloudflare Workers.',
            },
          ],
        },
      },
      {
        id: 'pluggable-email-drivers',
        heading: 'Pluggable Email Providers (DEFAULT_EMAIL_PROVIDER)',
        paragraphs: [
          'Configure a server-wide default email driver in .env while still allowing individual workspaces in the Console to bring their own provider API keys:',
        ],
        table: {
          headers: ['DEFAULT_EMAIL_PROVIDER', 'Env Vars', 'Use Case'],
          rows: [
            {
              key: 'resend',
              type: 'RESEND_API_KEY',
              description: 'Production transactional delivery via Resend REST API.',
            },
            {
              key: 'smtp2go',
              type: 'DEFAULT_EMAIL_API_KEY',
              description: 'High-deliverability SMTP2GO REST API transport.',
            },
            {
              key: 'mailersend',
              type: 'DEFAULT_EMAIL_API_KEY',
              description: 'MailerSend transactional email API.',
            },
            {
              key: 'mailtrap',
              type: 'DEFAULT_EMAIL_API_KEY',
              description: 'MailtrapSending API for staging or production.',
            },
            {
              key: 'webhook',
              type: 'EMAIL_WEBHOOK_URL, EMAIL_WEBHOOK_SECRET',
              description:
                'POSTs { to, from, replyTo, cc, subject, html } to your own microservice, Nodemailer bridge, AWS SES Lambda, or Postal server.',
            },
            {
              key: 'console',
              type: 'None',
              description:
                'Prints formatted email metadata & HTML to stdout for local development.',
            },
          ],
        },
      },
    ],
  },
  {
    slug: 'self-hosting-cloudflare',
    title: 'Deploying on Cloudflare Workers & D1',
    category: 'Self-Hosting',
    sortOrder: 6,
    badge: '330+ Edge PoPs',
    readingTime: '4 min read',
    summary:
      'Deploy EntryWise to Cloudflare Workers with D1 SQLite, KV rate limiting, R2 file uploads, and Cloudflare Queues.',
    sections: [
      {
        id: 'cloudflare-setup',
        heading: 'Provisioning Cloudflare Resources',
        paragraphs: [
          'If you want sub-20ms global edge latency with zero server maintenance, deploy EntryWise directly to Cloudflare Workers using Wrangler:',
        ],
        codeExamples: [
          {
            label: 'Wrangler Provisioning Commands',
            language: 'bash',
            filename: 'terminal',
            code: `# 1. Create the D1 SQLite database
bunx wrangler d1 create entry-wise-db

# 2. Apply all SQL migrations to remote D1
bunx wrangler d1 migrations apply entry-wise-db --remote

# 3. Create KV namespace for edge rate limiting
bunx wrangler kv namespace create RATE_LIMIT_KV

# 4. Set your production secrets
bunx wrangler secret put JWT_SECRET
bunx wrangler secret put MASTER_ENCRYPTION_KEY

# 5. Deploy Worker to Cloudflare Edge
bun run deploy`,
          },
        ],
      },
    ],
  },
  {
    slug: 'connectors',
    title: 'Zero-OAuth Database & Messaging Connectors',
    category: 'Connectors & Email',
    sortOrder: 7,
    badge: '5 Native Integrations',
    readingTime: '4 min read',
    summary:
      'Sync submissions directly to Airtable, Notion, Google Sheets, Slack, and Discord without complex OAuth token refreshes.',
    sections: [
      {
        id: 'airtable-and-notion',
        heading: 'Airtable & Notion Direct Sync',
        paragraphs: [
          'Connect Airtable using a Personal Access Token (pat...), Base ID (app...), and Table Name. Connect Notion using an Internal Integration Secret (ntn_... or secret_...) and a Database ID.',
          'Both tokens are encrypted at rest using AES-256-GCM before being saved to the database, and are only decrypted in memory inside the background queue worker during dispatch.',
        ],
        table: {
          headers: ['Connector', 'Required Credentials', 'Field Mapping Behavior'],
          rows: [
            {
              key: 'Airtable',
              type: 'PAT + Base ID + Table Name',
              description: 'Uses typecast: true so single-select options are created automatically.',
            },
            {
              key: 'Notion Database',
              type: 'Integration Token + Database ID',
              description: 'Auto-detects Title property and appends full field summary blocks to the page body.',
            },
            {
              key: 'Google Sheets',
              type: 'Apps Script Web App URL',
              description: 'Zero-OAuth Apps Script bridge that auto-creates new columns when form fields change.',
            },
            {
              key: 'Slack & Discord',
              type: 'Incoming Webhook URL',
              description: 'Dispatches rich Block Kit / Embed cards with one-click deep links to the Console.',
            },
          ],
        },
      },
    ],
  },
  {
    slug: 'email-studio',
    title: 'Visual Email Studio & Multi-Provider Routing',
    category: 'Connectors & Email',
    sortOrder: 8,
    badge: 'Custom Branding',
    readingTime: '4 min read',
    summary:
      'Design branded respondent confirmation emails and team alerts with dynamic {{field}} interpolation and bring your own email provider.',
    sections: [
      {
        id: 'template-interpolation',
        heading: 'Dynamic {{field}} Variable Interpolation',
        paragraphs: [
          'Inside the EntryWise Console, open the Email Studio tab for any form to customize both the Team Notification Email and the Submitter Auto-Responder.',
          'Use double-curly syntax like {{name}}, {{company}}, or {{ticket_id}} in the Subject, Heading, or Body. EntryWise automatically HTML-escapes all interpolated user values to prevent email injection and XSS.',
        ],
        bullets: [
          'Live side-by-side preview for both Notification and Confirmation emails.',
          'Custom Brand Accent Color picker, Logo URL, and CTA Button builder.',
          'Reply-To automatically binds to the submitter email address so hitting Reply in Gmail/Superhuman replies directly to the lead.',
        ],
      },
    ],
  },
  {
    slug: 'webhooks',
    title: 'Multi-Webhook Fanout & HMAC Verification',
    category: 'Connectors & Email',
    sortOrder: 9,
    badge: 'HMAC-SHA256 Signed',
    readingTime: '4 min read',
    summary:
      'Fan out every submission to up to 5 concurrent webhook endpoints with cryptographic X-EntryWise-Signature verification and SSRF protection.',
    sections: [
      {
        id: 'verifying-signatures',
        heading: 'Verifying X-EntryWise-Signature',
        paragraphs: [
          'Every webhook dispatched by EntryWise includes an X-EntryWise-Signature header containing the hex-encoded HMAC-SHA256 digest of the raw JSON request body signed with your form’s Webhook Secret.',
        ],
        codeExamples: [
          {
            label: 'Node.js / Bun / Cloudflare Worker Verification',
            language: 'typescript',
            filename: 'verifyWebhook.ts',
            code: `import crypto from 'node:crypto';

export function verifyEntryWiseWebhook(
  rawBody: string,
  signatureHeader: string | null,
  webhookSecret: string
): boolean {
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    return false;
  }
  const expected =
    'sha256=' +
    crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signatureHeader),
    Buffer.from(expected)
  );
}`,
          },
        ],
      },
    ],
  },
  {
    slug: 'security-and-privacy',
    title: 'Security, Bot Defense & GDPR Privacy',
    category: 'Security & Privacy',
    sortOrder: 10,
    badge: 'Defense-in-Depth',
    readingTime: '5 min read',
    summary:
      'Protect your endpoints with Cloudflare Turnstile, disposable email blocking, keyword filtering, GDPR Zero-IP masking, and AES-256-GCM encryption.',
    sections: [
      {
        id: 'end-user-security-controls',
        heading: 'End-User Security & Anti-Abuse Controls',
        paragraphs: [
          'Every form in EntryWise can enable layered spam and abuse defenses independently from the Console Security tab:',
        ],
        table: {
          headers: ['Protection Layer', 'Configuration', 'How It Protects Your Form'],
          rows: [
            {
              key: 'Honeypot Trap (_gotcha)',
              type: 'Always active',
              description:
                'Silently drops automated bot submissions with a decoy 200 OK so scrapers never retry.',
            },
            {
              key: 'Disposable Email Blocker',
              type: 'blockDisposableEmails: true',
              description:
                'Rejects 55+ burner/temp-mail domains (Mailinator, GuerrillaMail, YOPmail, 10MinuteMail, Sharklasers) at the edge.',
            },
            {
              key: 'Blocked Keywords Filter',
              type: 'blockedKeywords: string[]',
              description:
                'Case-insensitive phrase filter across all submitted values to silently drop SEO/crypto spam.',
            },
            {
              key: 'Cloudflare Turnstile',
              type: 'turnstileSecretKey',
              description:
                'Verifies cryptographic Turnstile tokens at the edge with zero visual CAPTCHA friction.',
            },
            {
              key: 'Max Payload Size Cap',
              type: 'maxPayloadBytes (1KB–1MB)',
              description:
                'Prevents oversized JSON payload DoS attacks per form.',
            },
          ],
        },
      },
      {
        id: 'gdpr-privacy',
        heading: 'GDPR Zero-IP Mode & Automatic Retention Pruning',
        paragraphs: [
          'Need strict GDPR / EU data minimization compliance? Enable Zero-IP Mode (disableIpLogging: true) on any form so submitter IP addresses are masked as 0.0.0.0 before touching the database.',
          'You can also set a Custom Retention Window (retentionDays: 7, 30, 90, 365) so older submissions are automatically purged on schedule.',
        ],
        callout: {
          type: 'security',
          title: 'Platform Hardening Built-In',
          body: 'All third-party API keys (Resend, Airtable, Notion, Turnstile) are encrypted at rest with AES-256-GCM. All outbound webhooks pass through strict SSRF validation blocking localhost, RFC1918 private networks, and cloud metadata IPs (169.254.169.254). All CSV exports neutralize spreadsheet formula injection (=, +, -, @).',
        },
      },
    ],
  },
];

export interface LandingPageContent {
  badgeText: string;
  badgeSubtext: string;
  headlineTop: string;
  headlineGradient: string;
  subtitle: string;
  primaryCtaLabel: string;
  primaryCtaUrl: string;
}

export const DEFAULT_LANDING_CONTENT: LandingPageContent = {
  badgeText: 'Sub-20ms Edge Ingestion + Docker Self-Hosting',
  badgeSubtext: 'Cloudflare Workers • Bun + SQLite',
  headlineTop: 'The form backend that',
  headlineGradient: 'doesn’t get in your way.',
  subtitle:
    'Drop one endpoint into React, Next.js, Astro, or static HTML. Deploy on Cloudflare Workers or self-host anywhere with Docker, native SQLite, zero-OAuth connectors, and HMAC webhooks.',
  primaryCtaLabel: 'Start Free in Console',
  primaryCtaUrl: 'https://app.entrywise.si',
};
