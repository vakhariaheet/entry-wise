import React, { useState } from 'react';
import type { Site, FormField } from '../../types';
import {
  Code2,
  Copy,
  Check,
} from 'lucide-react';

interface CodeEmbedViewProps {
  site: Site;
  fields: FormField[];
}

export const CodeEmbedView: React.FC<CodeEmbedViewProps> = ({ site, fields }) => {
  const [snippetFormat, setSnippetFormat] = useState<'html' | 'react' | 'curl'>('html');
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

      const hasFileInput = fields.some((f) => f.type === 'file');

      return `<!-- EntryWise Form Integration for ${site.domain} -->
<form
  action="${endpointUrl}"
  method="POST"${hasFileInput ? '\n  enctype="multipart/form-data"' : ''}
>
  <!-- Anti-spam Honeypot (hide with CSS) -->
  <input type="text" name="_gotcha" style="display:none !important" tabindex="-1" autocomplete="off" />

  <!-- Form Fields -->
${fieldInputs || '  <input type="text" name="name" placeholder="Your Name" required />\n  <input type="email" name="email" placeholder="Your Email" required />'}

  <button type="submit">Send Message</button>
</form>`;
    } else if (snippetFormat === 'react') {
      const stateInit = fields
        .map((f) => `    ${f.name}: '',`)
        .join('\n');

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
${inputElements || "      <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />"}
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
          <label className="block font-semibold text-emerald-400 uppercase tracking-wider text-xs">
            Universal Form Ingestion Endpoint
          </label>
          <span className="text-[11px] font-mono text-zinc-400 bg-white/[0.04] border border-white/[0.08] px-2 py-0.5 rounded">
            POST Request
          </span>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <input
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

      {/* Snippet Studio */}
      <div className="p-6 rounded-2xl border border-white/[0.08] bg-[#121318] space-y-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Integration Snippet Studio</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Copy and paste this snippet directly into your code. It reflects your active schema fields.
            </p>
          </div>

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

        {/* macOS Terminal Window */}
        <div className="rounded-xl border border-white/[0.08] bg-[#070709] overflow-hidden shadow-2xl">
          <div className="px-4 py-3 border-b border-white/[0.06] bg-[#0b0c0f] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500/80"></span>
              <span className="w-3 h-3 rounded-full bg-amber-500/80"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-500/80"></span>
              <span className="text-xs font-mono text-zinc-400 ml-2">
                {snippetFormat === 'html' ? 'index.html' : snippetFormat === 'react' ? 'ContactForm.tsx' : 'submit.sh'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleCopyCode}
              className="px-3.5 py-1.5 bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.1] rounded-lg text-xs text-white flex items-center gap-1.5 transition font-medium"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
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
              Includes a hidden <code className="text-zinc-300 font-mono">_gotcha</code> input. Spambots filling it are silently discarded.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-white/[0.06] bg-[#0e0f13] space-y-1">
            <div className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
              <span>📎 File Attachments</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Forms with files use <code className="text-zinc-300 font-mono">enctype="multipart/form-data"</code>. Max 25MB per submission uploaded to R2 / S3.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-white/[0.06] bg-[#0e0f13] space-y-1">
            <div className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
              <span>↩️ Custom Redirection</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Add <code className="text-zinc-300 font-mono">&lt;input name="_redirect" value="/thanks"&gt;</code> to redirect users after submitting.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
