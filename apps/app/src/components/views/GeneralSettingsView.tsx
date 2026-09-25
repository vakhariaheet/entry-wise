import React, { useState } from 'react';
import type { Site } from '../../types';
import { api } from '../../services/api';
import {
  Settings,
  Copy,
  Check,
  ShieldAlert,
  Loader2,
  Save,
  AlertCircle,
  Trash2,
} from 'lucide-react';

interface GeneralSettingsViewProps {
  site: Site;
  onSiteUpdated: (site: Site) => void;
  onSiteDeleted: (siteId: string) => void;
}

export const GeneralSettingsView: React.FC<GeneralSettingsViewProps> = ({
  site,
  onSiteUpdated,
  onSiteDeleted,
}) => {
  const [name, setName] = useState(site.name || '');
  const [domain, setDomain] = useState(site.domain || '');
  const [allowedOrigins, setAllowedOrigins] = useState(site.allowed_origins || '');
  const [turnstileSecretKey, setTurnstileSecretKey] = useState(site.turnstile_secret_key || '');

  const [copiedKey, setCopiedKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Danger Zone delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  React.useEffect(() => {
    setName(site.name || '');
    setDomain(site.domain || '');
    setAllowedOrigins(site.allowed_origins || '');
    setTurnstileSecretKey(site.turnstile_secret_key || '');
  }, [site]);

  const handleCopyKey = () => {
    navigator.clipboard.writeText(site.api_key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const updated = await api.updateSite(site.id, {
        name: name.trim() || domain,
        domain: domain.trim(),
        allowed_origins: allowedOrigins.trim() || null,
        turnstile_secret_key: turnstileSecretKey.trim() || null,
      });

      onSiteUpdated(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err: any) {
      console.error('Failed to update form settings:', err);
      setErrorMessage(err.message || 'Failed to update form settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSite = async () => {
    if (deleteInput.trim() !== site.domain.trim()) {
      setDeleteError(`Please type "${site.domain}" exactly to confirm deletion.`);
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteSite(site.id);
      onSiteDeleted(site.id);
    } catch (err: any) {
      console.error('Failed to delete form:', err);
      setDeleteError(err.message || 'Failed to delete form');
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-400" />
            <span>Form Settings &amp; Security</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Manage domain origin restrictions, API access keys, spam bot challenges, and lifecycle settings.
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleSave()}
          disabled={isSaving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition shadow-lg shadow-white/5 disabled:opacity-50 self-start sm:self-auto"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-black" />
              <span>Saving Changes...</span>
            </>
          ) : saveSuccess ? (
            <>
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Saved Successfully!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4 text-black" />
              <span>Save Settings</span>
            </>
          )}
        </button>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Form Identity Card */}
      <div className="p-6 rounded-2xl border border-white/[0.08] bg-[#121318] space-y-4 shadow-lg">
        <h3 className="text-sm font-semibold text-white">Form Identity</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Form Friendly Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Lead Generation Form"
              className="w-full bg-[#0a0a0d] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Primary Domain</label>
            <input
              type="text"
              required
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full bg-[#0a0a0d] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-zinc-100 font-mono focus:outline-none focus:border-emerald-500/50 transition"
            />
          </div>
        </div>
      </div>

      {/* API Key Card */}
      <div className="p-6 rounded-2xl border border-white/[0.08] bg-[#121318] space-y-3 shadow-lg">
        <h3 className="text-sm font-semibold text-white">Live Form Ingestion Key</h3>
        <p className="text-xs text-zinc-400">
          Your unique public API key used to route submissions to this form endpoint.
        </p>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={site.api_key}
            className="w-full bg-[#0a0a0d] border border-white/[0.08] rounded-xl px-4 py-2.5 font-mono text-zinc-300 text-xs focus:outline-none"
          />
          <button
            type="button"
            onClick={handleCopyKey}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-white transition whitespace-nowrap text-xs font-medium"
          >
            {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedKey ? 'Copied' : 'Copy Key'}</span>
          </button>
        </div>
        <p className="text-[11px] text-zinc-500 font-mono">
          Endpoint: https://entrywise.webbound.in/f/{site.api_key}
        </p>
      </div>

      {/* CORS & Allowed Origins */}
      <div className="p-6 rounded-2xl border border-white/[0.08] bg-[#121318] space-y-3 shadow-lg">
        <h3 className="text-sm font-semibold text-white">Allowed Origins / CORS Domains</h3>
        <p className="text-xs text-zinc-400">
          Restrict incoming browser fetch/XHR requests to specific domains or preview URLs.
        </p>
        <input
          type="text"
          placeholder="* or acme.com, staging.acme.com, localhost:3000"
          value={allowedOrigins}
          onChange={(e) => setAllowedOrigins(e.target.value)}
          className="w-full bg-[#0a0a0d] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-zinc-100 font-mono focus:outline-none focus:border-emerald-500/50 transition"
        />
        <p className="text-[11px] text-zinc-500">
          Leave blank to default to the primary domain. Set to <code className="text-zinc-400 font-mono">*</code> to permit all origins (useful during frontend development and Vercel/Netlify preview branches).
        </p>
      </div>

      {/* Cloudflare Turnstile */}
      <div className="p-6 rounded-2xl border border-white/[0.08] bg-[#121318] space-y-3 shadow-lg">
        <h3 className="text-sm font-semibold text-white">Cloudflare Turnstile Anti-Bot Protection</h3>
        <p className="text-xs text-zinc-400">
          Enforce seamless, invisible CAPTCHA verification to block spambots before they touch your backend or queues.
        </p>
        <input
          type="password"
          placeholder="0x4AAAAAA..."
          value={turnstileSecretKey}
          onChange={(e) => setTurnstileSecretKey(e.target.value)}
          className="w-full bg-[#0a0a0d] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-zinc-100 font-mono focus:outline-none focus:border-emerald-500/50 transition"
        />
        <p className="text-[11px] text-zinc-500">
          When configured, incoming POST requests require a valid <code className="text-zinc-400 font-mono">cf-turnstile-response</code> token.
        </p>
      </div>

      {/* Danger Zone */}
      <div className="p-6 rounded-2xl border border-red-500/20 bg-red-500/[0.03] space-y-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-red-400">Danger Zone: Delete Form</h3>
            <p className="text-xs text-zinc-400">
              Permanently delete this form and all its associated submissions, field definitions, and connectors.
            </p>
          </div>
        </div>

        {!showDeleteConfirm ? (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 transition text-xs font-semibold flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete This Form...</span>
          </button>
        ) : (
          <div className="p-4 rounded-xl border border-red-500/30 bg-[#0c0d10] space-y-3">
            <p className="text-xs text-red-300 font-medium leading-relaxed">
              This action cannot be undone. To confirm, please type <span className="font-mono font-bold text-white bg-red-500/20 px-1.5 py-0.5 rounded">{site.domain}</span> below:
            </p>

            <input
              type="text"
              placeholder={site.domain}
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              className="w-full bg-[#070709] border border-red-500/30 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-red-500 transition"
            />

            {deleteError && (
              <div className="text-xs text-red-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteInput('');
                  setDeleteError(null);
                }}
                className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white transition text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSite}
                disabled={isDeleting || deleteInput.trim() !== site.domain.trim()}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition disabled:opacity-40"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting Form...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Permanently Delete Form</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
