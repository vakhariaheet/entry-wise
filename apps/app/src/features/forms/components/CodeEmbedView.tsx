import { Check, Code2, Copy } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import type { FormField, Site } from '@/types';

interface CodeEmbedViewProps {
  site: Site;
  fields: FormField[];
  onNavigateToStudio?: () => void;
}

export type CodeSnippetFormat = 'react' | 'nextjs' | 'typescript' | 'curl' | 'html';

export const CodeEmbedView: React.FC<CodeEmbedViewProps> = ({ site, fields }) => {
  const [snippetFormat, setSnippetFormat] = useState<CodeSnippetFormat>('react');
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const endpointUrl = `https://entrywise.webbound.in/f/${site.api_key}`;

  const activeFields =
    fields.length > 0
      ? fields
      : [
          { name: 'name', type: 'text' as const, id: '1', site_id: site.id, created_at: '' },
          { name: 'email', type: 'email' as const, id: '2', site_id: site.id, created_at: '' },
          { name: 'message', type: 'text' as const, id: '3', site_id: site.id, created_at: '' },
        ];

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

  const generateSnippet = () => {
    switch (snippetFormat) {
      case 'react': {
        const stateFields = activeFields.map((f) => `    ${f.name}: '',`).join('\n');

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

            const inputType =
              f.type === 'email'
                ? 'email'
                : f.type === 'phone'
                  ? 'tel'
                  : f.type === 'url'
                    ? 'url'
                    : f.type === 'file'
                      ? 'file'
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
        <h3 className="font-semibold text-sm">Message Sent!</h3>
        <p className="text-xs text-zinc-400 mt-1">Thank you, we will get back to you shortly.</p>
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
        return `'use server';

// app/actions/submitForm.ts
export async function submitEntryWiseForm(formData: FormData) {
  const data = Object.fromEntries(formData.entries());

  const res = await fetch('${endpointUrl}', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    return { success: false, error: 'Failed to submit form' };
  }

  return { success: true };
}

// In your Server or Client Component:
// <form action={submitEntryWiseForm}> ... </form>`;
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
 */
export interface ${site.name ? site.name.replace(/[^a-zA-Z0-9]/g, '') : 'Form'}SubmissionData {
${types}
}

export interface EntryWiseSubmissionResponse {
  success: boolean;
  submission_id: string;
  timestamp: string;
}`;
      }

      case 'curl': {
        const samplePayload = JSON.stringify(
          Object.fromEntries(
            activeFields.map((f) => [
              f.name,
              f.type === 'email'
                ? 'alex@example.com'
                : f.name === 'name'
                  ? 'Alex Taylor'
                  : `Sample ${f.name} value`,
            ])
          ),
          null,
          2
        );

        return `# Test submission to your live EntryWise endpoint
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
            return `  <div>\n    <label for="${f.name}">${label}</label>\n    <input type="${f.type === 'email' ? 'email' : f.type === 'phone' ? 'tel' : f.type === 'url' ? 'url' : 'text'}" id="${f.name}" name="${f.name}" required />\n  </div>`;
          })
          .join('\n');

        return `<!-- Clean HTML form for Webflow, Framer, or static sites -->
<form action="${endpointUrl}" method="POST">
  <!-- Honeypot anti-spam (invisible to users) -->
  <input type="text" name="_gotcha" style="display:none !important" tabindex="-1" autocomplete="off" />

${fieldInputs}

  <button type="submit">Submit</button>
</form>`;
      }
    }
  };

  const getFileName = () => {
    switch (snippetFormat) {
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
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Bar */}
      <div className="pb-4 border-b border-white/[0.08]">
        <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
          <Code2 className="w-5 h-5 text-emerald-400" />
          <span>Code &amp; SDK Integration</span>
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          Connect your Next.js, React, or mobile app directly to this form endpoint.
        </p>
      </div>

      {/* Universal Ingestion Endpoint */}
      <div className="p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] space-y-3 shadow-lg">
        <div className="flex items-center justify-between">
          <label
            htmlFor="universal-endpoint-input"
            className="block font-semibold text-emerald-400 uppercase tracking-wider text-xs"
          >
            Universal Ingestion Endpoint
          </label>
          <span className="text-[11px] font-mono text-zinc-400 bg-white/[0.04] border border-white/[0.08] px-2 py-0.5 rounded">
            POST JSON or FormData
          </span>
        </div>
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

      {/* Code Snippets Studio */}
      <div className="p-6 rounded-2xl border border-white/[0.08] bg-[#121318] space-y-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Integration Snippets</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Production-ready snippets typed to your schema fields.
            </p>
          </div>

          {/* Format Selector Pills */}
          <div className="flex items-center gap-1 bg-[#0a0a0d] p-1 rounded-xl border border-white/[0.08] overflow-x-auto">
            {(
              [
                { id: 'react', label: 'React / Next.js' },
                { id: 'nextjs', label: 'Server Action' },
                { id: 'typescript', label: 'TypeScript Types' },
                { id: 'curl', label: 'cURL API' },
                { id: 'html', label: 'Plain HTML' },
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
              <span>🛡️ Anti-Spam Honeypot</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Include a hidden <code className="text-zinc-300 font-mono">_gotcha</code> input.
              Automated spambots filling it are silently blocked.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-white/[0.06] bg-[#0e0f13] space-y-1">
            <div className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
              <span>📎 File Attachments</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Accepts <code className="text-zinc-300 font-mono">multipart/form-data</code> with up
              to 25MB per submission uploaded straight to R2 edge storage.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-white/[0.06] bg-[#0e0f13] space-y-1">
            <div className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
              <span>↩️ Custom Redirects</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Add <code className="text-zinc-300 font-mono">_redirect</code> to send users to a
              custom thank-you page after successful submission.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
