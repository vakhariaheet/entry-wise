import { Check, Copy, Sparkles, X } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import type { FormField, Site } from '@/types';

interface AiPromptModalProps {
  site: Site | null;
  fields?: FormField[];
  onClose: () => void;
}

export const AiPromptModal: React.FC<AiPromptModalProps> = ({ site, fields = [], onClose }) => {
  const [activeTab, setActiveTab] = useState<'prompt' | 'react' | 'action' | 'curl'>('prompt');
  const [copied, setCopied] = useState(false);

  const apiKey = site?.api_key || 'YOUR_SITE_API_KEY';
  const siteDomain = site?.domain || 'yourdomain.com';
  const siteName = site?.name || siteDomain;
  const endpointUrl = `https://entrywise.webbound.in/f/${apiKey}`;

  const activeFields: FormField[] =
    fields.length > 0
      ? fields
      : [
          { name: 'name', type: 'text', id: '1', site_id: site?.id || '', created_at: '' },
          { name: 'email', type: 'email', id: '2', site_id: site?.id || '', created_at: '' },
          { name: 'message', type: 'text', id: '3', site_id: site?.id || '', created_at: '' },
        ];

  const hasFile = activeFields.some((f) => f.type === 'file');

  // Format schema fields for the prompt
  const schemaList = activeFields
    .map((f) => {
      const isRequired = true;
      const typeDesc =
        f.type === 'email'
          ? 'email string (valid email required)'
          : f.type === 'phone'
            ? 'phone number string'
            : f.type === 'file'
              ? 'file attachment (File binary)'
              : f.type === 'url'
                ? 'URL string'
                : f.name.toLowerCase() === 'message' || f.name.toLowerCase().includes('body')
                  ? 'multiline text (textarea)'
                  : 'text string';
      return `- \`${f.name}\`: ${typeDesc}${isRequired ? ' [required]' : ''}`;
    })
    .join('\n');

  // TypeScript interface
  const tsInterface = activeFields
    .map((f) => {
      const tsType =
        f.type === 'file' ? 'File | string' : f.type === 'phone' ? 'string | number' : 'string';
      return `  ${f.name}: ${tsType};`;
    })
    .join('\n');

  // React state fields
  const reactState = activeFields
    .filter((f) => f.type !== 'file')
    .map((f) => `    ${f.name}: '',`)
    .join('\n');

  // React input elements
  const reactInputs = activeFields
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

  // cURL payload
  const curlData = JSON.stringify(
    Object.fromEntries(
      activeFields.map((f) => [
        f.name,
        f.type === 'email'
          ? 'alex@example.com'
          : f.name === 'name'
            ? 'Alex Taylor'
            : `Sample ${f.name}`,
      ])
    ),
    null,
    2
  );

  const snippets = {
    prompt: `You are integrating EntryWise (https://entrywise.webbound.in) as the headless form backend for "${siteName}".

### Project Credentials:
- Site Domain: "${siteDomain}"
- Site API Key: "${apiKey}"
- Ingestion Endpoint: POST ${endpointUrl}
- Authenticated API: POST https://entrywise.webbound.in/v1/submissions (Header: X-Api-Key: "${apiKey}")

### Form Schema Inputs (${activeFields.length} fields):
${schemaList}

### TypeScript Data Contract:
export interface FormPayload {
${tsInterface}
}

### Integration Instructions:
1. Build a modern React / Next.js Tailwind CSS form component matching the inputs above.
2. Submit form data to: \`${endpointUrl}\` via \`${hasFile ? 'multipart/form-data (FormData)' : 'application/json'}\`.
3. Include honeypot anti-spam defense:
   <input type="text" name="_gotcha" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
4. UX requirements:
   - Handle loading state and disable submit button while in flight.
   - Display a clean success confirmation banner on 200/201 response.
   - Display error alert if the request fails.
5. EntryWise automatically captures submissions, stores them in edge D1/R2, handles Cloudflare Turnstile verification, sends notification emails, and relays events to configured webhooks/Slack/Discord/Google Sheets.`,

    react: `'use client';

import React, { useState } from 'react';

export interface FormSubmissionData {
${tsInterface}
}

export function ContactForm() {
${hasFile ? '' : `  const [formData, setFormData] = useState({\n${reactState}\n  });`}
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
${
  hasFile
    ? '        body: new FormData(e.currentTarget),'
    : `        headers: { 'Content-Type': 'application/json' },\n        body: JSON.stringify(formData),`
}
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
        <p className="text-xs text-zinc-400 mt-1">Thank you, we will get back to you shortly.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
      {/* Honeypot field for bot protection */}
      <input type="text" name="_gotcha" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />

${reactInputs}

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
}`,

    action: `'use server';

// app/actions/submitForm.ts
export async function submitEntryWiseForm(formData: FormData) {
  // Post directly to EntryWise with full credentials
  const res = await fetch('${endpointUrl}', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    return { success: false, error: errorBody.detail || 'Failed to submit form' };
  }

  return { success: true };
}

// In your Server or Client Component:
// <form action={submitEntryWiseForm}> ... </form>`,

    curl: `# Send a test submission to your live EntryWise endpoint
curl -X POST "${endpointUrl}" \\
  -H "Content-Type: application/json" \\
  -d '${curlData}'`,
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(snippets[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-prompt-title"
    >
      <div className="w-full max-w-3xl rounded-2xl border border-white/[0.1] bg-[#0c0e14] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#090a0f] shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h3 id="ai-prompt-title" className="text-sm font-semibold text-white">
                Universal AI Integration Prompt &amp; Code
              </h3>
              <p className="text-[11px] text-zinc-400">
                Pre-configured with your live API credentials and {activeFields.length} schema
                fields
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Context Credentials Bar */}
        <div className="px-6 py-3 border-b border-white/[0.06] bg-[#12141c] flex items-center justify-between text-xs font-mono flex-wrap gap-2 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-semibold text-[10px]">
              {siteDomain}
            </span>
            <span className="text-zinc-500">|</span>
            <span className="text-zinc-400 text-[11px]">
              key: <span className="text-zinc-300">{apiKey.slice(0, 12)}...</span>
            </span>
            <span className="text-zinc-500">|</span>
            <span className="text-zinc-400 text-[11px]">
              {activeFields.length} {activeFields.length === 1 ? 'field' : 'fields'}:{' '}
              <span className="text-emerald-400">{activeFields.map((f) => f.name).join(', ')}</span>
            </span>
          </div>
          <span className="text-[10px] text-zinc-500">Live edge sync</span>
        </div>

        {/* Snippet Tabs */}
        <div className="px-6 pt-3 pb-2 flex items-center justify-between border-b border-white/[0.06] bg-[#090a0f] shrink-0">
          <div className="flex items-center bg-[#12141c] p-0.5 rounded-xl border border-white/[0.08] text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('prompt')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'prompt'
                  ? 'bg-white/[0.1] text-white font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Cursor / Claude Prompt
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('react')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'react'
                  ? 'bg-white/[0.1] text-white font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              React Component
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('action')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'action'
                  ? 'bg-white/[0.1] text-white font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Server Action
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('curl')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'curl'
                  ? 'bg-white/[0.1] text-white font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              cURL API
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.1] bg-white/[0.06] hover:bg-white/[0.12] text-white text-xs font-medium transition"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-zinc-400" />
                <span>Copy to Clipboard</span>
              </>
            )}
          </button>
        </div>

        {/* Code Block */}
        <div className="p-6 overflow-y-auto flex-1">
          <pre className="p-4 rounded-xl border border-white/[0.08] bg-[#07080c] font-mono text-xs text-zinc-200 leading-relaxed overflow-x-auto select-all">
            {snippets[activeTab]}
          </pre>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/[0.08] bg-[#090a0f] flex items-center justify-between text-xs text-zinc-500 font-mono shrink-0">
          <span>Paste directly into Cursor (Cmd+K / Composer), Claude, or ChatGPT</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-medium bg-white text-black hover:bg-zinc-200 transition font-sans"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
