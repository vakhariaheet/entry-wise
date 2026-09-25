import { AlertCircle, Building2, Check, Loader2, Plus, Send, Settings, X } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { api } from '@/lib';
import type { Company } from '@/types';

interface WorkspaceModalProps {
  onClose: () => void;
  onWorkspaceCreated?: (workspace: Company) => void;
  onWorkspaceUpdated?: (workspace: Company) => void;
  initialWorkspace?: Company | null;
}

export const WorkspaceModal: React.FC<WorkspaceModalProps> = ({
  onClose,
  onWorkspaceCreated,
  onWorkspaceUpdated,
  initialWorkspace,
}) => {
  const isEditMode = Boolean(initialWorkspace);

  const [name, setName] = useState(initialWorkspace?.name || '');
  const [emailProvider, setEmailProvider] = useState<
    'cloudflare' | 'resend' | 'mailersend' | 'mailtrap' | 'smtp2go'
  >(
    (initialWorkspace?.email_provider as
      | 'cloudflare'
      | 'resend'
      | 'mailersend'
      | 'mailtrap'
      | 'smtp2go') || 'cloudflare'
  );
  const [fromName, setFromName] = useState(initialWorkspace?.from_name || '');
  const [fromEmail, setFromEmail] = useState(initialWorkspace?.from_email || '');
  const [providerToken, setProviderToken] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Test Email state
  const [testRecipient, setTestRecipient] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (initialWorkspace) {
      setName(initialWorkspace.name || '');
      setEmailProvider(
        (initialWorkspace.email_provider as
          | 'cloudflare'
          | 'resend'
          | 'mailersend'
          | 'mailtrap'
          | 'smtp2go') || 'cloudflare'
      );
      setFromName(initialWorkspace.from_name || '');
      setFromEmail(initialWorkspace.from_email || '');
    }
  }, [initialWorkspace]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (isEditMode && initialWorkspace) {
        const payload: Partial<Company> & { email_provider_token?: string } = {
          name: name.trim(),
          email_provider: emailProvider,
        };

        if (emailProvider !== 'cloudflare') {
          payload.from_name = fromName.trim() || undefined;
          payload.from_email = fromEmail.trim() || undefined;
          if (providerToken.trim()) {
            payload.email_provider_token = providerToken.trim();
          }
        }

        const updated = await api.updateCompany(initialWorkspace.id, payload);
        if (onWorkspaceUpdated) {
          onWorkspaceUpdated(updated);
        }
      } else {
        const created = await api.createCompany({
          name: name.trim(),
          email_provider: emailProvider,
          from_name: fromName.trim() || undefined,
          from_email: fromEmail.trim() || undefined,
          ...(emailProvider !== 'cloudflare' && providerToken
            ? { email_provider_token: providerToken.trim() }
            : {}),
        });
        if (onWorkspaceCreated) {
          onWorkspaceCreated(created);
        }
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save workspace settings');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTestEmail = async () => {
    if (!initialWorkspace) return;
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await api.testCompanyEmail(
        initialWorkspace.id,
        testRecipient.trim() || undefined
      );
      setTestResult({
        success: true,
        message: res.message || 'Test email dispatched successfully!',
      });
    } catch (err: unknown) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Test email failed to send',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-white/[0.1] bg-[#121215] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#0c0c0e]">
          <div className="flex items-center gap-2.5">
            {isEditMode ? (
              <Settings className="w-4 h-4 text-emerald-400" />
            ) : (
              <Building2 className="w-4 h-4 text-emerald-400" />
            )}
            <div>
              <h3 className="text-sm font-semibold text-white">
                {isEditMode ? 'Workspace & Email Engine Settings' : 'Create New Workspace'}
              </h3>
              <p className="text-[11px] text-zinc-400">
                {isEditMode
                  ? 'Configure workspace identity and email delivery credentials'
                  : 'Organize forms under a team or company'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label htmlFor="workspace-name-input" className="block text-zinc-300 font-medium mb-1">
              Workspace / Company Name
            </label>
            <input
              id="workspace-name-input"
              type="text"
              required
              placeholder="e.g. Acme Corp, Marketing Agency"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#09090b] border border-white/[0.08] rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-emerald-500/50 transition"
            />
          </div>

          <div className="pt-2 border-t border-white/[0.06] space-y-3">
            <div>
              <label
                htmlFor="workspace-email-provider-select"
                className="block text-zinc-300 font-medium mb-1"
              >
                Email Delivery Engine
              </label>
              <select
                id="workspace-email-provider-select"
                value={emailProvider}
                onChange={(e) =>
                  setEmailProvider(
                    e.target.value as
                      | 'cloudflare'
                      | 'resend'
                      | 'mailersend'
                      | 'mailtrap'
                      | 'smtp2go'
                  )
                }
                className="w-full bg-[#09090b] border border-white/[0.08] rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-emerald-500/50 transition font-mono"
              >
                <option value="cloudflare">⚡ Cloudflare Managed Email (Zero Config, Free)</option>
                <option value="resend">🚀 Resend API (BYOK - Custom Domain)</option>
                <option value="mailersend">✉️ MailerSend (BYOK - Custom Domain)</option>
                <option value="mailtrap">🧪 Mailtrap Sandbox / Transactional</option>
                <option value="smtp2go">📨 SMTP2GO API</option>
              </select>
              <p className="text-[11px] text-zinc-400 mt-1.5 leading-relaxed">
                {emailProvider === 'cloudflare'
                  ? 'Zero configuration required. Notifications and receipts are delivered instantly via Cloudflare Email Service from no-reply@entrywise.webbound.in.'
                  : 'Bring Your Own Key (BYOK). Emails will be dispatched using your provider account from your own verified domain.'}
              </p>
            </div>

            {emailProvider !== 'cloudflare' && (
              <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0c0d10] space-y-3">
                <div className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5">
                  <span>Custom {emailProvider.toUpperCase()} Configuration</span>
                </div>

                <div>
                  <label
                    htmlFor="workspace-provider-token-input"
                    className="block text-zinc-300 font-medium mb-1"
                  >
                    {emailProvider === 'resend'
                      ? 'Resend API Key (re_...)'
                      : emailProvider === 'mailersend'
                        ? 'MailerSend API Token'
                        : `${emailProvider.toUpperCase()} API Key`}
                  </label>
                  <input
                    id="workspace-provider-token-input"
                    type="password"
                    required={!isEditMode}
                    placeholder={
                      isEditMode
                        ? '•••••••••••• (Leave blank to keep existing key)'
                        : 're_123456789...'
                    }
                    value={providerToken}
                    onChange={(e) => setProviderToken(e.target.value)}
                    className="w-full bg-[#070709] border border-white/[0.08] rounded-xl px-3 py-2 text-zinc-200 font-mono focus:outline-none focus:border-emerald-500/50 transition"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Encrypted with AES-GCM prior to storage in Cloudflare D1.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="workspace-sender-name-input"
                      className="block text-zinc-300 font-medium mb-1"
                    >
                      Sender Name
                    </label>
                    <input
                      id="workspace-sender-name-input"
                      type="text"
                      required
                      placeholder="e.g. Acme Support"
                      value={fromName}
                      onChange={(e) => setFromName(e.target.value)}
                      className="w-full bg-[#070709] border border-white/[0.08] rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-emerald-500/50 transition"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="workspace-sender-email-input"
                      className="block text-zinc-300 font-medium mb-1"
                    >
                      Sender Email (Verified Domain)
                    </label>
                    <input
                      id="workspace-sender-email-input"
                      type="email"
                      required
                      placeholder="e.g. hello@acme.com"
                      value={fromEmail}
                      onChange={(e) => setFromEmail(e.target.value)}
                      className="w-full bg-[#070709] border border-white/[0.08] rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-emerald-500/50 transition font-mono"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-zinc-500">
                  Ensure this domain is verified with DKIM/SPF in your {emailProvider} dashboard to
                  prevent rejections.
                </p>
              </div>
            )}
          </div>

          {/* Test Email Section for Edit Mode */}
          {isEditMode && initialWorkspace && (
            <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0c0d10] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-zinc-300 font-semibold text-xs flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Verify Email Connector</span>
                </span>
                <span className="text-[10px] font-mono text-zinc-500">Live Dispatch Test</span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Send a live test message to verify your provider credentials and domain DKIM
                records.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  placeholder="recipient@example.com"
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  className="flex-1 bg-[#070709] border border-white/[0.08] rounded-xl px-3 py-1.5 text-zinc-200 font-mono text-xs focus:outline-none focus:border-emerald-500/50 transition"
                />
                <button
                  type="button"
                  onClick={handleTestEmail}
                  disabled={isTesting}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-medium text-xs transition disabled:opacity-50"
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Test</span>
                    </>
                  )}
                </button>
              </div>

              {testResult && (
                <div
                  className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
                    testResult.success
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                      : 'border-red-500/30 bg-red-500/10 text-red-400'
                  }`}
                >
                  {testResult.success ? (
                    <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>
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
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-white text-black font-semibold hover:bg-zinc-200 transition shadow-lg shadow-white/5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : isEditMode ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Workspace &amp; Engine</span>
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
