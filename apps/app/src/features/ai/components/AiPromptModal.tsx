import { Check, Copy, Sparkles, X } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import type { Site } from '@/types';

interface AiPromptModalProps {
  site: Site | null;
  onClose: () => void;
}

export const AiPromptModal: React.FC<AiPromptModalProps> = ({ site, onClose }) => {
  const [activeTab, setActiveTab] = useState<'prompt' | 'fetch' | 'html' | 'curl'>('prompt');
  const [copied, setCopied] = useState(false);

  const apiKey = site?.api_key || 'YOUR_SITE_API_KEY';
  const siteDomain = site?.domain || 'yourdomain.com';

  const snippets = {
    prompt: `Integrate EntryWise (v0.2.0) into this project as the form backend for "${siteDomain}".

### Specifications:
- Endpoint: POST https://entrywise.webbound.in/v1/submissions
- Authentication: Header X-Api-Key: "${apiKey}" (or hidden input name="api_key")

### Requirements:
1. Form Payload: Send JSON { name, email, message } or multipart/form-data with file attachments.
2. Bot Defense: Add honeypot input <input name="_gotcha" style="display:none" tabIndex="-1" autoComplete="off" />.
3. Status Handling: On 201 Created show success toast. On error parse RFC 7807 problem details response.`,

    fetch: `// Production fetch() integration with EntryWise
const submitForm = async (formData: { name: string; email: string; message: string }) => {
  const response = await fetch('https://entrywise.webbound.in/v1/submissions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': '${apiKey}',
    },
    body: JSON.stringify(formData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Submission failed');
  }

  const result = await response.json();
  return result; // contains { submission_id: "...", status: "new" }
};`,

    html: `<!-- Zero-JS Native Form: Works without client-side JavaScript -->
<form action="https://entrywise.webbound.in/v1/submissions" method="POST">
  <input type="hidden" name="api_key" value="${apiKey}" />
  <input type="text" name="_gotcha" style="display:none" tabindex="-1" />
  
  <label for="name">Your Name</label>
  <input type="text" id="name" name="name" required placeholder="Alex Rivera" />

  <label for="email">Email Address</label>
  <input type="email" id="email" name="email" required placeholder="alex@company.com" />

  <label for="message">Message</label>
  <textarea id="message" name="message" required></textarea>

  <button type="submit">Send Message</button>
</form>`,

    curl: `curl -X POST https://entrywise.webbound.in/v1/submissions \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: ${apiKey}" \\
  -d '{
    "name": "Alex Rivera",
    "email": "alex@company.com",
    "message": "Testing submission for ${siteDomain}"
  }'`,
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(snippets[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl border border-white/[0.1] bg-[#121215] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#0c0c0e]">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Universal AI Integration Prompt</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Subtitle & Site Context */}
        <div className="px-6 pt-4 text-xs text-zinc-400">
          Pre-populated with live credentials for{' '}
          <span className="text-white font-semibold">{siteDomain}</span>.
        </div>

        {/* Snippet Tabs */}
        <div className="px-6 pt-4 flex items-center justify-between">
          <div className="flex items-center bg-[#09090b] p-0.5 rounded-lg border border-white/[0.06] text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('prompt')}
              className={`px-3 py-1.5 rounded-md transition ${activeTab === 'prompt' ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400 hover:text-white'}`}
            >
              Cursor / Claude Prompt
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('fetch')}
              className={`px-3 py-1.5 rounded-md transition ${activeTab === 'fetch' ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400 hover:text-white'}`}
            >
              fetch() API
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('html')}
              className={`px-3 py-1.5 rounded-md transition ${activeTab === 'html' ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400 hover:text-white'}`}
            >
              HTML &lt;form&gt;
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('curl')}
              className={`px-3 py-1.5 rounded-md transition ${activeTab === 'curl' ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400 hover:text-white'}`}
            >
              cURL
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] text-white text-xs font-medium transition"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-zinc-400" />
            )}
            <span>{copied ? 'Copied!' : 'Copy Code'}</span>
          </button>
        </div>

        {/* Code Block */}
        <div className="p-6">
          <pre className="p-4 rounded-xl border border-white/[0.08] bg-[#09090b] font-mono text-xs text-zinc-300 leading-relaxed overflow-x-auto max-h-72">
            {snippets[activeTab]}
          </pre>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/[0.08] bg-[#0c0c0e] flex items-center justify-between text-xs text-zinc-500">
          <span>Works natively with Next.js, Remix, Astro, Svelte, Vue, and plain HTML.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-medium bg-white text-black hover:bg-zinc-200 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
