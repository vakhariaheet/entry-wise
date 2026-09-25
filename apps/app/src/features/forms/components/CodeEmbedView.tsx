import { Check, Code2, Copy, Sparkles } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import type { FormField, Site } from '@/types';

interface CodeEmbedViewProps {
  site: Site;
  fields: FormField[];
  onNavigateToStudio?: () => void;
}

export const CodeEmbedView: React.FC<CodeEmbedViewProps> = ({
  site,
  fields,
  onNavigateToStudio,
}) => {
  const [snippetFormat, setSnippetFormat] = useState<'html' | 'react' | 'curl'>('html');
  const [htmlMode, setHtmlMode] = useState<'full' | 'snippet'>('full');
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const endpointUrl = `https://entrywise.webbound.in/f/${site.api_key}`;

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
    if (snippetFormat === 'html') {
      const hasFileInput = fields.some((f) => f.type === 'file');

      if (htmlMode === 'snippet') {
        const fieldInputs = fields
          .map((f) => {
            if (f.name.toLowerCase() === 'message' || f.name.toLowerCase().includes('body')) {
              return `  <div>\n    <label for="${f.name}">${f.name}</label>\n    <textarea id="${f.name}" name="${f.name}" required></textarea>\n  </div>`;
            }
            if (f.type === 'file') {
              return `  <div>\n    <label for="${f.name}">${f.name}</label>\n    <input type="file" id="${f.name}" name="${f.name}" />\n  </div>`;
            }
            return `  <div>\n    <label for="${f.name}">${f.name}</label>\n    <input type="${f.type === 'email' ? 'email' : f.type === 'phone' ? 'tel' : f.type === 'url' ? 'url' : 'text'}" id="${f.name}" name="${f.name}" required />\n  </div>`;
          })
          .join('\n');

        return `<!-- EntryWise Form Integration for ${site.domain} -->
<form
  action="${endpointUrl}"
  method="POST"${hasFileInput ? '\n  enctype="multipart/form-data"' : ''}
>
  <!-- Anti-spam Honeypot (hide with CSS) -->
  <input type="text" name="_gotcha" style="display:none !important" tabindex="-1" autocomplete="off" />

  <!-- Form Fields -->
${fieldInputs || '  <input type="text" name="name" placeholder="Your Name" required />\n  <input type="email" name="email" placeholder="Your Email" required />'}

  <button type="submit">Submit Form</button>
</form>`;
      }

      // Full HTML Document Mode
      const fullInputs = (
        fields.length > 0
          ? fields
          : [
              { name: 'name', type: 'text', id: '1', site_id: site.id, created_at: '' },
              { name: 'email', type: 'email', id: '2', site_id: site.id, created_at: '' },
              { name: 'message', type: 'text', id: '3', site_id: site.id, created_at: '' },
            ]
      )
        .map((f) => {
          const label = f.name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
          if (f.name.toLowerCase() === 'message' || f.name.toLowerCase().includes('body')) {
            return `        <div class="form-group">
          <label for="${f.name}">${label} <span class="required">*</span></label>
          <textarea id="${f.name}" name="${f.name}" rows="4" placeholder="Enter your ${label.toLowerCase()}..." required></textarea>
        </div>`;
          }
          if (f.type === 'file') {
            return `        <div class="form-group">
          <label for="${f.name}">${label}</label>
          <input type="file" id="${f.name}" name="${f.name}" />
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
          return `        <div class="form-group">
          <label for="${f.name}">${label} <span class="required">*</span></label>
          <input type="${inputType}" id="${f.name}" name="${f.name}" placeholder="Enter your ${label.toLowerCase()}..." required />
        </div>`;
        })
        .join('\n\n');

      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${site.name || site.domain} — Contact Form</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #09090b;
      --card-bg: #121215;
      --border: rgba(255, 255, 255, 0.08);
      --text: #f4f4f5;
      --muted: #a1a1aa;
      --input-bg: #0a0a0d;
      --input-border: rgba(255, 255, 255, 0.1);
      --focus-ring: #10b981;
      --btn-bg: #ffffff;
      --btn-text: #09090b;
      --btn-hover: #e4e4e7;
      --radius: 14px;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 32px 16px;
    }
    .card {
      width: 100%;
      max-width: 500px;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 36px 32px;
      box-shadow: 0 20px 40px -15px rgba(0,0,0,0.5);
    }
    .header { margin-bottom: 24px; }
    .title { font-size: 22px; font-weight: 700; margin-bottom: 6px; }
    .desc { font-size: 13px; color: var(--muted); line-height: 1.5; }
    .form-group { margin-bottom: 18px; display: flex; flex-direction: column; }
    .form-group label { font-size: 13px; font-weight: 600; margin-bottom: 6px; }
    .required { color: #ef4444; }
    .form-group input, .form-group textarea {
      width: 100%;
      background: var(--input-bg);
      border: 1px solid var(--input-border);
      border-radius: 10px;
      padding: 10px 14px;
      font-size: 14px;
      color: var(--text);
      outline: none;
      transition: all 0.15s ease;
    }
    .form-group input:focus, .form-group textarea:focus {
      border-color: var(--focus-ring);
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
    }
    .btn {
      width: 100%;
      background: var(--btn-bg);
      color: var(--btn-text);
      font-size: 14px;
      font-weight: 600;
      padding: 12px 20px;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .btn:hover { background: var(--btn-hover); }
    .banner-error {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #fca5a5;
      font-size: 13px;
      padding: 10px 14px;
      border-radius: 10px;
      margin-bottom: 16px;
      display: none;
    }
    .success-box {
      text-align: center;
      padding: 24px 0;
      display: none;
    }
    .success-icon {
      width: 44px; height: 44px;
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 12px;
      font-size: 20px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div id="form-container">
      <div class="header">
        <h1 class="title">${site.name || site.domain}</h1>
        <p class="desc">Send us a message and our team will get back to you shortly.</p>
      </div>
      <div id="error-alert" class="banner-error"></div>
      <form id="contact-form" action="${endpointUrl}" method="POST"${hasFileInput ? ' enctype="multipart/form-data"' : ''}>
        <input type="text" name="_gotcha" style="display:none !important" tabindex="-1" autocomplete="off" />
${fullInputs}
        <button type="submit" id="submit-btn" class="btn">Send Message</button>
      </form>
    </div>
    <div id="success-state" class="success-box">
      <div class="success-icon">✓</div>
      <h2 style="font-size:18px;margin-bottom:6px;">Message Sent!</h2>
      <p style="font-size:13px;color:var(--muted);margin-bottom:18px;">Thank you! Your submission has been received.</p>
      <button type="button" class="btn" onclick="location.reload()" style="max-width:180px;margin:0 auto;display:block;">Submit Another</button>
    </div>
  </div>
  <script>
    const form = document.getElementById('contact-form');
    const container = document.getElementById('form-container');
    const successBox = document.getElementById('success-state');
    const errBox = document.getElementById('error-alert');
    const btn = document.getElementById('submit-btn');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errBox.style.display = 'none';
      btn.disabled = true;
      btn.textContent = 'Submitting...';
      try {
        const formData = new FormData(form);
        const res = await fetch(form.action, {
          method: 'POST',
          body: formData,
          headers: { 'Accept': 'application/json' }
        });
        if (res.ok) {
          container.style.display = 'none';
          successBox.style.display = 'block';
        } else {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || err.message || 'Submission failed');
        }
      } catch (err) {
        errBox.textContent = err.message || 'Network error. Please try again.';
        errBox.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Send Message';
      }
    });
  </script>
</body>
</html>`;
    } else if (snippetFormat === 'react') {
      const stateInit = fields.map((f) => `    ${f.name}: '',`).join('\n');

      const inputElements = fields
        .map((f) => {
          if (f.name.toLowerCase() === 'message' || f.name.toLowerCase().includes('body')) {
            return `      <div>\n        <label>${f.name}</label>\n        <textarea\n          value={formData.${f.name}}\n          onChange={(e) => setFormData({ ...formData, ${f.name}: e.target.value })}\n          required\n        />\n      </div>`;
          }
          return `      <div>\n        <label>${f.name}</label>\n        <input\n          type="${f.type === 'email' ? 'email' : f.type === 'phone' ? 'tel' : f.type === 'url' ? 'url' : 'text'}"\n          value={formData.${f.name}}\n          onChange={(e) => setFormData({ ...formData, ${f.name}: e.target.value })}\n          required\n        />\n      </div>`;
        })
        .join('\n');

      return `import React, { useState } from 'react';

export function ContactForm() {
  const [formData, setFormData] = useState({
${stateInit || "    name: '',\n    email: '',"}
  });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    try {
      const res = await fetch('${endpointUrl}', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Submission failed');
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return <p>Thank you! Your submission has been received.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
${inputElements || '      <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />'}
      <button type="submit" disabled={status === 'submitting'}>
        {status === 'submitting' ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
}`;
    } else {
      const sampleJson = JSON.stringify(
        Object.fromEntries(
          fields.length > 0
            ? fields.map((f) => [f.name, f.type === 'email' ? 'alex@example.com' : f.name])
            : [
                ['name', 'Alex Taylor'],
                ['email', 'alex@example.com'],
                ['message', 'Hello from EntryWise CLI test'],
              ]
        ),
        null,
        2
      );
      return `# Direct API Ingestion via cURL
curl -X POST "${endpointUrl}" \\
  -H "Content-Type: application/json" \\
  -d '${sampleJson}'`;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Bar */}
      <div className="pb-4 border-b border-white/[0.08]">
        <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
          <Code2 className="w-5 h-5 text-emerald-400" />
          <span>Code &amp; Embed Generator</span>
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          Everything you need to connect your frontend website or mobile app to EntryWise.
        </p>
      </div>

      {/* Universal Ingestion Endpoint */}
      <div className="p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] space-y-3 shadow-lg">
        <div className="flex items-center justify-between">
          <label
            htmlFor="universal-endpoint-input"
            className="block font-semibold text-emerald-400 uppercase tracking-wider text-xs"
          >
            Universal Form Ingestion Endpoint
          </label>
          <span className="text-[11px] font-mono text-zinc-400 bg-white/[0.04] border border-white/[0.08] px-2 py-0.5 rounded">
            POST Request
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
            <span>{copiedEndpoint ? 'Copied to Clipboard' : 'Copy Endpoint URL'}</span>
          </button>
        </div>
      </div>

      {/* Email Template Studio Promo Banner */}
      {onNavigateToStudio && (
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-white">Visual Email Template Studio</h4>
              <p className="text-[11px] text-zinc-400">
                Design custom full HTML confirmation receipts and auto-responder emails sent
                automatically to your submitters.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onNavigateToStudio}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold transition shrink-0 self-end sm:self-auto shadow-sm"
          >
            Email Template Studio &rarr;
          </button>
        </div>
      )}

      {/* Snippet Studio */}
      <div className="p-6 rounded-2xl border border-white/[0.08] bg-[#121318] space-y-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Integration Snippet Studio</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Copy and paste this snippet directly into your code. It reflects your active schema
              fields.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* HTML Sub-Mode Toggle */}
            {snippetFormat === 'html' && (
              <div className="flex items-center gap-1 bg-[#0a0a0d] p-1 rounded-xl border border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setHtmlMode('full')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                    htmlMode === 'full'
                      ? 'bg-emerald-500/20 text-emerald-400 font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Full HTML Page
                </button>
                <button
                  type="button"
                  onClick={() => setHtmlMode('snippet')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                    htmlMode === 'snippet'
                      ? 'bg-emerald-500/20 text-emerald-400 font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Embed Snippet
                </button>
              </div>
            )}

            {/* Format Selector */}
            <div className="flex items-center gap-1 bg-[#0a0a0d] p-1 rounded-xl border border-white/[0.08] self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setSnippetFormat('html')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
                  snippetFormat === 'html'
                    ? 'bg-white/[0.1] text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                HTML Form
              </button>
              <button
                type="button"
                onClick={() => setSnippetFormat('react')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
                  snippetFormat === 'react'
                    ? 'bg-white/[0.1] text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                React JSX
              </button>
              <button
                type="button"
                onClick={() => setSnippetFormat('curl')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
                  snippetFormat === 'curl'
                    ? 'bg-white/[0.1] text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                cURL CLI
              </button>
            </div>
          </div>
        </div>

        {/* macOS Terminal Window */}
        <div className="rounded-xl border border-white/[0.08] bg-[#070709] overflow-hidden shadow-2xl">
          <div className="px-4 py-3 border-b border-white/[0.06] bg-[#0b0c0f] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500/80"></span>
              <span className="w-3 h-3 rounded-full bg-amber-500/80"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-500/80"></span>
              <span className="text-xs font-mono text-zinc-400 ml-2">
                {snippetFormat === 'html'
                  ? 'index.html'
                  : snippetFormat === 'react'
                    ? 'ContactForm.tsx'
                    : 'submit.sh'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleCopyCode}
              className="px-3.5 py-1.5 bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.1] rounded-lg text-xs text-white flex items-center gap-1.5 transition font-medium"
            >
              {copiedCode ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedCode ? 'Copied to Clipboard!' : 'Copy Code'}</span>
            </button>
          </div>

          <pre className="p-5 text-xs text-zinc-200 font-mono overflow-x-auto max-h-96 leading-relaxed">
            {generateSnippet()}
          </pre>
        </div>

        {/* Integration Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl border border-white/[0.06] bg-[#0e0f13] space-y-1">
            <div className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
              <span>🛡️ Anti-Spam Honeypot</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Includes a hidden <code className="text-zinc-300 font-mono">_gotcha</code> input.
              Spambots filling it are silently discarded.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-white/[0.06] bg-[#0e0f13] space-y-1">
            <div className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
              <span>📎 File Attachments</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Forms with files use{' '}
              <code className="text-zinc-300 font-mono">enctype="multipart/form-data"</code>. Max
              25MB per submission uploaded to R2 / S3.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-white/[0.06] bg-[#0e0f13] space-y-1">
            <div className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
              <span>↩️ Custom Redirection</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Add{' '}
              <code className="text-zinc-300 font-mono">
                &lt;input name="_redirect" value="/thanks"&gt;
              </code>{' '}
              to redirect users after submitting.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
