import { Building2, Loader2, Plus, X } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { api } from '@/lib';
import type { Company } from '@/types';

interface WorkspaceModalProps {
  onClose: () => void;
  onWorkspaceCreated: (workspace: Company) => void;
}

export const WorkspaceModal: React.FC<WorkspaceModalProps> = ({ onClose, onWorkspaceCreated }) => {
  const [name, setName] = useState('');
  const [emailProvider, setEmailProvider] = useState<
    'cloudflare' | 'resend' | 'mailersend' | 'mailtrap' | 'smtp2go'
  >('cloudflare');
  const [fromName, setFromName] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [providerToken, setProviderToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const created = await api.createCompany({
        name: name.trim(),
        email_provider: emailProvider,
        from_name: fromName.trim() || undefined,
        from_email: fromEmail.trim() || undefined,
        ...(emailProvider !== 'cloudflare' && providerToken
          ? { email_provider_token: providerToken.trim() }
          : {}),
      } as any);

      onWorkspaceCreated(created);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create workspace');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl border border-white/[0.1] bg-[#121215] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#0c0c0e]">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Create New Workspace</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="block text-zinc-300 font-medium mb-1">Workspace Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Acme Corp, Marketing Agency"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#09090b] border border-white/[0.08] rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-zinc-500 transition"
            />
          </div>

          <div>
            <label className="block text-zinc-300 font-medium mb-1">Email Delivery Engine</label>
            <select
              value={emailProvider}
              onChange={(e) => setEmailProvider(e.target.value as any)}
              className="w-full bg-[#09090b] border border-white/[0.08] rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-zinc-500 transition"
            >
              <option value="cloudflare">Cloudflare Managed Email (Zero Config)</option>
              <option value="resend">Resend API</option>
              <option value="mailersend">MailerSend</option>
              <option value="mailtrap">Mailtrap</option>
              <option value="smtp2go">SMTP2GO</option>
            </select>
            <p className="text-[11px] text-zinc-500 mt-1">
              {emailProvider === 'cloudflare'
                ? 'High-speed delivery routed via Cloudflare Workers without needing external API keys.'
                : 'Send emails through your existing verified domain and provider.'}
            </p>
          </div>

          {emailProvider !== 'cloudflare' && (
            <>
              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  Provider API Key / Token
                </label>
                <input
                  type="password"
                  required
                  placeholder="re_... or api key"
                  value={providerToken}
                  onChange={(e) => setProviderToken(e.target.value)}
                  className="w-full bg-[#09090b] border border-white/[0.08] rounded-xl px-3 py-2 text-zinc-200 font-mono focus:outline-none focus:border-zinc-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Sender Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Acme Support"
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                    className="w-full bg-[#09090b] border border-white/[0.08] rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-zinc-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Sender Email</label>
                  <input
                    type="email"
                    required
                    placeholder="hello@acme.com"
                    value={fromEmail}
                    onChange={(e) => setFromEmail(e.target.value)}
                    className="w-full bg-[#09090b] border border-white/[0.08] rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-zinc-500 transition"
                  />
                </div>
              </div>
            </>
          )}

          {/* Footer */}
          <div className="pt-4 border-t border-white/[0.08] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-black font-semibold hover:bg-zinc-200 transition"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Workspace</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
