import { Check, Code2, Copy, Server, Sparkles, Wand2 } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import type { FormField, Site } from '@/types';

interface CodeEmbedViewProps {
  site: Site;
  fields: FormField[];
  onNavigateToStudio?: () => void;
}

export type CodeSnippetFormat =
  | 'script'
  | 'react'
  | 'nextjs'
  | 'html'
  | 'typescript'
  | 'curl'
  | 'selfhost';

export const CodeEmbedView: React.FC<CodeEmbedViewProps> = ({ site, fields }) => {
  const [snippetFormat, setSnippetFormat] = useState<CodeSnippetFormat>('script');
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Self-hosted & class-name customization state
  const [isSelfHosted, setIsSelfHosted] = useState(false);
  const [customBaseUrl, setCustomBaseUrl] = useState('https://forms.yourdomain.com');
  const [customClassName, setCustomClassName] = useState('entrywise-form');

  // Magic HTML fields toggles
  const [includeSubject, setIncludeSubject] = useState(true);
  const [includeReplyTo, setIncludeReplyTo] = useState(false);
  const [includeCc, setIncludeCc] = useState(false);

  const cleanBaseUrl = (isSelfHosted ? customBaseUrl : 'https://api.entrywise.si')
    .trim()
    .replace(/\/+$/, '');
  const endpointUrl = `${cleanBaseUrl}/f/${site.api_key}`;
  const embedScriptUrl = `${cleanBaseUrl}/embed.js`;
  const effectiveClass = customClassName.trim().replace(/^\.+/, '') || 'entrywise-form';
  const isCustomClass = effectiveClass !== 'entrywise-form' && effectiveClass !== 'ew-form';

  const activeFields =
    fields.length > 0
      ? fields
      : [
          { name: 'name', type: 'text' as const, id: '1', site_id: site.id, created_at: '' },
          { name: 'email', type: 'email' as const, id: '2', site_id: site.id, created_at: '' },
          { name: 'message', type: 'text' as const, id: '3', site_id: site.id, created_at: '' },
        ];

  const hasFile = activeFields.some((f) => f.type === 'file');

  const handleCopyEndpoint = () => {
    navigator.clipboard.writeText(endpointUrl);
    setCopiedEndpoint(true);
    setTimeout(() => setCopiedEndpoint(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generateSnippet());
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const getMagicHtmlInputs = (indent = '  ') => {
    const lines: string[] = [];
    if (includeSubject) {
      lines.push(
        `${indent}<input type="hidden" name="_subject" value="New submission from ${site.domain}" />`
      );
    }
    if (includeReplyTo) {
      lines.push(
        `${indent}<!-- Overrides Reply-To header (defaults to 'email' field automatically) -->`,
        `${indent}<input type="hidden" name="_replyto" value="customer@example.com" />`
      );
    }
    if (includeCc) {
      lines.push(`${indent}<input type="hidden" name="_cc" value="team@${site.domain}" />`);
    }
    return lines.length > 0 ? `${lines.join('\n')}\n\n` : '';
  };

  const generateSnippet = () => {
    switch (snippetFormat) {
      case 'script': {
        const fieldInputs = activeFields
          .map((f) => {
            const label = f.name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
            const isTextarea =
              f.name.toLowerCase() === 'message' || f.name.toLowerCase().includes('body');
            if (isTextarea) {
              return `  <textarea name="${f.name}" placeholder="${label}" required></textarea>`;
            }
            if (f.type === 'file') {
              return `  <input type="file" name="${f.name}" />`;
            }
            const inputType =
              f.type === 'email'
                ? 'email'
                : f.type === 'phone'
                  ? 'tel'
                  : f.type === 'url'
                    ? 'url'
                    : 'text';
            return `  <input type="${inputType}" name="${f.name}" placeholder="${label}" required />`;
          })
          .join('\n');

        const magicInputs = getMagicHtmlInputs('  ');

        return `<!-- 1. Drop-in <1.5KB script (auto-detects ${isSelfHosted ? 'your self-hosted origin' : 'EntryWise edge'} & binds by class name) -->
<script
  src="${embedScriptUrl}"
  data-site-key="${site.api_key}"${isCustomClass ? `\n  data-class="${effectiveClass}"` : ''}
  defer
></script>

<!-- 2. Add class="${effectiveClass}" to any <form> — zero JS boilerplate needed -->
<form
  class="${effectiveClass}"
  data-success="Thanks! We received your message and will reply shortly."
>
${magicInputs}${fieldInputs}
  <button type="submit">Send Message</button>
</form>`;
      }

      case 'react': {
        const magicStateLines: string[] = [];
        if (includeSubject)
          magicStateLines.push(`    _subject: 'New submission from ${site.domain}',`);
        if (includeReplyTo) magicStateLines.push(`    _replyto: '',`);
        if (includeCc) magicStateLines.push(`    _cc: 'team@${site.domain}',`);

        const stateFields = [
          ...activeFields.filter((f) => f.type !== 'file').map((f) => `    ${f.name}: '',`),
          ...magicStateLines,
        ].join('\n');

        const inputs = activeFields
          .map((f) => {
            const label = f.name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
            const isTextarea =
              f.name.toLowerCase() === 'message' || f.name.toLowerCase().includes('body');

            if (isTextarea) {
              return `        <div>
          <label htmlFor="${f.name}" className="block text-xs font-medium text-zinc-400 mb-1">
            ${label}
          </label>
          <textarea
            id="${f.name}"
            name="${f.name}"
            required
            rows={4}
            value={formData.${f.name}}
            onChange={(e) => setFormData({ ...formData, ${f.name}: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
          />
        </div>`;
            }

            if (f.type === 'file') {
              return `        <div>
          <label htmlFor="${f.name}" className="block text-xs font-medium text-zinc-400 mb-1">
            ${label}
          </label>
          <input
            id="${f.name}"
            name="${f.name}"
            type="file"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-emerald-500/10 file:text-emerald-400 hover:file:bg-emerald-500/20"
          />
        </div>`;
            }

            const inputType =
              f.type === 'email'
                ? 'email'
                : f.type === 'phone'
                  ? 'tel'
                  : f.type === 'url'
                    ? 'url'
                    : 'text';

            return `        <div>
          <label htmlFor="${f.name}" className="block text-xs font-medium text-zinc-400 mb-1">
            ${label}
          </label>
          <input
            id="${f.name}"
            name="${f.name}"
            type="${inputType}"
            required
            value={formData.${f.name}}
            onChange={(e) => setFormData({ ...formData, ${f.name}: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
          />
        </div>`;
          })
          .join('\n\n');

        if (hasFile) {
          return `'use client';

import React, { useState } from 'react';

export function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Automatic multipart/form-data upload for file attachments
      const data = new FormData(e.currentTarget);

      const res = await fetch('${endpointUrl}', {
        method: 'POST',
        body: data,
      });

      if (!res.ok) {
        throw new Error('Failed to submit form');
      }

      setIsSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="p-6 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-center">
        <h3 className="font-semibold text-sm">Submission Received!</h3>
        <p className="text-xs text-zinc-400 mt-1">Thank you, your details have been received.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
${inputs}

      {error && <p className="text-xs text-rose-400">{error}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-semibold text-xs transition"
      >
        {isSubmitting ? 'Submitting...' : 'Submit Form'}
      </button>
    </form>
  );
}`;
        }

        return `'use client';

import React, { useState } from 'react';

export function ContactForm() {
  const [formData, setFormData] = useState({
${stateFields}
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('${endpointUrl}', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        throw new Error('Failed to submit form');
      }

      setIsSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="p-6 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-center">
        <h3 className="font-semibold text-sm">Submission Received!</h3>
        <p className="text-xs text-zinc-400 mt-1">Thank you, your details have been received.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
${inputs}

      {error && <p className="text-xs text-rose-400">{error}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-semibold text-xs transition"
      >
        {isSubmitting ? 'Submitting...' : 'Send Message'}
      </button>
    </form>
  );
}`;
      }

      case 'nextjs': {
        const fieldsMapping = activeFields
          .map((f) => `    ${f.name}: formData.get('${f.name}'),`)
          .join('\n');

        return `'use server';

// app/actions/submitForm.ts
export async function submitEntryWiseForm(formData: FormData) {
  // Extract typed fields matching your schema
  const payload = {
${fieldsMapping}${includeSubject ? `\n    _subject: 'New submission from ${site.domain}',` : ''}${includeCc ? `\n    _cc: 'team@${site.domain}',` : ''}
  };

  const res = await fetch('${endpointUrl}', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    return { success: false, error: errorBody.detail || 'Failed to submit form' };
  }

  return { success: true };
}

// In your Next.js Page or Component:
// <form action={submitEntryWiseForm}>
//   <!-- Input fields matching your schema: -->
//   ${activeFields.map((f) => `<input name="${f.name}" />`).join('\n//   ')}
//   <button type="submit">Submit</button>
// </form>`;
      }

      case 'typescript': {
        const types = activeFields
          .map((f) => {
            const tsType =
              f.type === 'file'
                ? 'File | string'
                : f.type === 'phone'
                  ? 'string | number'
                  : 'string';
            return `  ${f.name}: ${tsType};`;
          })
          .join('\n');

        return `/**
 * TypeScript Data Contract for EntryWise Form:
 * Domain: ${site.domain}
 * Site ID: ${site.id}
 * Total Schema Fields: ${activeFields.length}
 */
export interface ${site.name ? site.name.replace(/[^a-zA-Z0-9]/g, '') : 'Form'}SubmissionData {
${types}
  /** Optional Magic HTML / JSON Directives */
  _subject?: string;
  _replyto?: string;
  _cc?: string;
  _redirect?: string;
}

export interface EntryWiseSubmissionResponse {
  success: boolean;
  submission_id: string;
  timestamp: string;
  redirect?: string;
}`;
      }

      case 'curl': {
        if (hasFile) {
          const formParts = activeFields
            .map((f) => {
              if (f.type === 'file') {
                return `  -F "${f.name}=@/path/to/attachment.pdf"`;
              }
              const val =
                f.type === 'email'
                  ? 'alex@example.com'
                  : f.name === 'name'
                    ? 'Alex Taylor'
                    : `Sample ${f.name}`;
              return `  -F "${f.name}=${val}"`;
            })
            .join(' \\\n');

          return `# Test submission with file attachment (multipart/form-data)
curl -X POST "${endpointUrl}" \\
${formParts}`;
        }

        const payloadObj: Record<string, string> = Object.fromEntries(
          activeFields.map((f) => [
            f.name,
            f.type === 'email'
              ? 'alex@example.com'
              : f.name === 'name'
                ? 'Alex Taylor'
                : `Sample ${f.name} value`,
          ])
        );
        if (includeSubject) payloadObj._subject = `New inquiry from ${site.domain}`;
        if (includeReplyTo) payloadObj._replyto = 'alex@example.com';
        if (includeCc) payloadObj._cc = `team@${site.domain}`;

        const samplePayload = JSON.stringify(payloadObj, null, 2);

        return `# Direct API Ingestion via cURL (JSON)
curl -X POST "${endpointUrl}" \\
  -H "Content-Type: application/json" \\
  -d '${samplePayload}'`;
      }

      case 'html': {
        const fieldInputs = activeFields
          .map((f) => {
            const label = f.name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
            const isTextarea =
              f.name.toLowerCase() === 'message' || f.name.toLowerCase().includes('body');
            if (isTextarea) {
              return `  <div>\n    <label for="${f.name}">${label}</label>\n    <textarea id="${f.name}" name="${f.name}" required></textarea>\n  </div>`;
            }
            if (f.type === 'file') {
              return `  <div>\n    <label for="${f.name}">${label}</label>\n    <input type="file" id="${f.name}" name="${f.name}" />\n  </div>`;
            }
            return `  <div>\n    <label for="${f.name}">${label}</label>\n    <input type="${f.type === 'email' ? 'email' : f.type === 'phone' ? 'tel' : f.type === 'url' ? 'url' : 'text'}" id="${f.name}" name="${f.name}" required />\n  </div>`;
          })
          .join('\n');

        const magicInputs = getMagicHtmlInputs('  ');

        return `<!-- Clean HTML form for Webflow, Framer, Astro, or static sites -->
<form
  action="${endpointUrl}"
  method="POST"${hasFile ? '\n  enctype="multipart/form-data"' : ''}
>
  <!-- Honeypot anti-spam (invisible to users) -->
  <input type="text" name="_gotcha" style="display:none !important" tabindex="-1" autocomplete="off" />

${magicInputs}${fieldInputs}

  <button type="submit">Submit</button>
</form>`;
      }

      case 'selfhost': {
        return `# Option A: Self-Host via Docker Compose (Any VPS, Railway, Fly.io — Zero Cloudflare Lock-In)
git clone https://github.com/vakhariaheet/entry-wise.git
cd entry-wise && cp .env.example .env

# Configure your preferred Queue & Email engine in .env (no Cloudflare required):
# QUEUE_DRIVER=memory                  # 'memory' (built-in retry queue) or 'http' (QStash/BullMQ/n8n)
# DEFAULT_EMAIL_PROVIDER=resend        # 'resend' | 'smtp2go' | 'mailersend' | 'mailtrap' | 'webhook'
# RESEND_API_KEY=re_xxxxxxxxx
# DEFAULT_FROM_EMAIL=forms@${site.domain}

docker compose up -d

# ------------------------------------------------------------------------------
# Option B: Self-Host on Cloudflare Workers & D1 Edge
# bunx wrangler d1 create entrywise && bunx wrangler d1 migrations apply entrywise --remote
# bunx wrangler deploy
# ------------------------------------------------------------------------------

# Point your HTML forms or class-name binder to your self-hosted instance:
# <script
#   src="${cleanBaseUrl}/embed.js"
#   data-site-key="${site.api_key}"${isCustomClass ? `\n#   data-class="${effectiveClass}"` : ''}
#   defer
# ></script>
# <form class="${effectiveClass}">...</form>`;
      }
    }
  };

  const getFileName = () => {
    switch (snippetFormat) {
      case 'script':
        return 'index.html (Drop-in Class Binder)';
      case 'react':
        return 'ContactForm.tsx';
      case 'nextjs':
        return 'submitForm.ts';
      case 'typescript':
        return 'types/form.ts';
      case 'curl':
        return 'submit.sh';
      case 'html':
        return 'form.html';
      case 'selfhost':
        return 'docker-compose & self-host.sh';
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Bar */}
      <div className="pb-4 border-b border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Code2 className="w-5 h-5 text-emerald-400" />
            <span>Code, Class Binder &amp; Self-Hosting</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Bind any form using a single CSS class name, native HTML, React/Next.js, or your own
            self-hosted Cloudflare Worker.
          </p>
        </div>

        {/* Cloud vs Self-Hosted Toggle */}
        <div className="flex items-center gap-1 bg-[#0a0a0d] p-1 rounded-xl border border-white/[0.08] self-start">
          <button
            type="button"
            onClick={() => setIsSelfHosted(false)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              !isSelfHosted
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Managed Cloud
          </button>
          <button
            type="button"
            onClick={() => setIsSelfHosted(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
              isSelfHosted
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Self-Hosted URL</span>
          </button>
        </div>
      </div>

      {/* Universal Ingestion Endpoint */}
      <div className="p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] space-y-4 shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <label
            htmlFor="universal-endpoint-input"
            className="block font-semibold text-emerald-400 uppercase tracking-wider text-xs"
          >
            {isSelfHosted
              ? 'Self-Hosted Worker Ingestion Endpoint'
              : 'Universal Ingestion Endpoint'}
          </label>
          <span className="text-[11px] font-mono text-zinc-400 bg-white/[0.04] border border-white/[0.08] px-2 py-0.5 rounded">
            POST JSON / FormData &bull; Auto-Schema Discovery Enabled
          </span>
        </div>

        {isSelfHosted && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-1">
            <div>
              <label
                htmlFor="self-hosted-base-url"
                className="block text-[11px] font-medium text-zinc-400 mb-1"
              >
                Your Self-Hosted Worker Origin
              </label>
              <input
                id="self-hosted-base-url"
                type="url"
                value={customBaseUrl}
                onChange={(e) => setCustomBaseUrl(e.target.value)}
                placeholder="https://forms.yourdomain.com"
                className="w-full bg-[#0a0a0d] border border-emerald-500/30 rounded-xl px-3.5 py-2 font-mono text-emerald-300 text-xs focus:outline-none focus:border-emerald-400"
              />
            </div>
            <div className="flex items-end">
              <p className="text-[11px] text-zinc-400 leading-relaxed pb-1">
                All snippets below — including <code className="text-zinc-200">/embed.js</code> —
                automatically point to your custom Worker origin.
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <input
            id="universal-endpoint-input"
            type="text"
            readOnly
            value={endpointUrl}
            className="w-full bg-[#0a0a0d] border border-white/[0.08] rounded-xl px-4 py-2.5 font-mono text-zinc-100 text-xs focus:outline-none"
          />
          <button
            type="button"
            onClick={handleCopyEndpoint}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition whitespace-nowrap font-medium text-xs shadow-sm"
          >
            {copiedEndpoint ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copiedEndpoint ? 'Copied' : 'Copy Endpoint URL'}</span>
          </button>
        </div>
      </div>

      {/* Lightweight Customizer Bar: Custom Class Name + Magic HTML Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Custom Class Name Input */}
        <div className="p-4 rounded-2xl border border-white/[0.08] bg-[#121318] flex flex-col justify-between gap-2.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="custom-class-input"
              className="text-xs font-semibold text-white flex items-center gap-1.5"
            >
              <Wand2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Form CSS Class Name</span>
            </label>
            <span className="text-[10px] font-mono text-zinc-500">
              Used by /embed.js auto-binder
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-500 select-none">class=&quot;</span>
            <input
              id="custom-class-input"
              type="text"
              value={customClassName}
              onChange={(e) => setCustomClassName(e.target.value)}
              placeholder="entrywise-form"
              className="flex-1 bg-[#0a0a0d] border border-white/[0.08] focus:border-emerald-500/50 rounded-lg px-3 py-1.5 text-xs font-mono text-emerald-400 focus:outline-none"
            />
            <span className="text-xs font-mono text-zinc-500 select-none">&quot;</span>
            {customClassName !== 'entrywise-form' && (
              <button
                type="button"
                onClick={() => setCustomClassName('entrywise-form')}
                className="text-[11px] text-zinc-400 hover:text-white px-2 py-1 rounded bg-white/[0.04]"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Magic HTML Directives */}
        <div className="p-4 rounded-2xl border border-white/[0.08] bg-[#121318] flex flex-col justify-between gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Magic HTML Directives</span>
            </span>
            <span className="text-[10px] font-mono text-zinc-500">Zero-config email routing</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIncludeSubject(!includeSubject)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono border transition ${
                includeSubject
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : 'bg-[#0a0a0d] border-white/[0.08] text-zinc-400 hover:text-zinc-200'
              }`}
            >
              _subject
            </button>
            <button
              type="button"
              onClick={() => setIncludeReplyTo(!includeReplyTo)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono border transition ${
                includeReplyTo
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : 'bg-[#0a0a0d] border-white/[0.08] text-zinc-400 hover:text-zinc-200'
              }`}
            >
              _replyto
            </button>
            <button
              type="button"
              onClick={() => setIncludeCc(!includeCc)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono border transition ${
                includeCc
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : 'bg-[#0a0a0d] border-white/[0.08] text-zinc-400 hover:text-zinc-200'
              }`}
            >
              _cc
            </button>
          </div>
        </div>
      </div>

      {/* Code Snippets Studio */}
      <div className="p-6 rounded-2xl border border-white/[0.08] bg-[#121318] space-y-5 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Integration Snippets</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Synced with your {activeFields.length} schema fields (
              {activeFields.map((f) => f.name).join(', ')}).
            </p>
          </div>

          {/* Format Selector Pills */}
          <div className="flex items-center gap-1 bg-[#0a0a0d] p-1 rounded-xl border border-white/[0.08] overflow-x-auto">
            {(
              [
                { id: 'script', label: '✨ Class Script' },
                { id: 'html', label: 'Plain HTML' },
                { id: 'react', label: 'React / Next.js' },
                { id: 'nextjs', label: 'Server Action' },
                { id: 'typescript', label: 'TS Types' },
                { id: 'curl', label: 'cURL' },
                { id: 'selfhost', label: 'Self-Host CLI' },
              ] as const
            ).map((fmt) => (
              <button
                key={fmt.id}
                type="button"
                onClick={() => setSnippetFormat(fmt.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                  snippetFormat === fmt.id
                    ? 'bg-white/[0.1] text-white font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {fmt.label}
              </button>
            ))}
          </div>
        </div>

        {/* macOS Terminal Window */}
        <div className="rounded-xl border border-white/[0.08] bg-[#070709] overflow-hidden shadow-2xl">
          <div className="px-4 py-3 border-b border-white/[0.06] bg-[#0b0c0f] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500/80" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="text-xs font-mono text-zinc-400 ml-2">{getFileName()}</span>
            </div>

            <button
              type="button"
              onClick={handleCopyCode}
              className="px-3.5 py-1.5 bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.1] rounded-lg text-xs text-white flex items-center gap-1.5 transition font-medium"
            >
              {copiedCode ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>

          <pre className="p-5 text-xs text-emerald-300/90 font-mono overflow-x-auto max-h-[460px] leading-relaxed select-all">
            {generateSnippet()}
          </pre>
        </div>

        {/* Quick Features Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl border border-white/[0.06] bg-[#0e0f13] space-y-1">
            <div className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
              <span>⚡ Auto-Schema Discovery</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              No upfront schema setup required. Your first submission automatically populates field
              names and types.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-white/[0.06] bg-[#0e0f13] space-y-1">
            <div className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
              <span>🎯 Class-Name Binding</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Add{' '}
              <code className="text-zinc-300 font-mono">class=&quot;{effectiveClass}&quot;</code>{' '}
              for automatic AJAX submission, button loading states, and inline thank-you alerts.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-white/[0.06] bg-[#0e0f13] space-y-1">
            <div className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
              <span>🛡️ Honeypot &amp; Magic Fields</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Control <code className="text-zinc-300 font-mono">_subject</code>,{' '}
              <code className="text-zinc-300 font-mono">_replyto</code>,{' '}
              <code className="text-zinc-300 font-mono">_cc</code>, and{' '}
              <code className="text-zinc-300 font-mono">_redirect</code> directly from HTML inputs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
