import {
  AlertCircle,
  Check,
  Clock,
  Copy,
  ExternalLink,
  EyeOff,
  Globe,
  Key,
  Loader2,
  Lock,
  Save,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import React, { useState } from 'react';
import { api } from '@/lib';
import type { Site } from '@/types';

interface GeneralSettingsViewProps {
  site: Site;
  onSiteUpdated: (site: Site) => void;
  onSiteDeleted: (siteId: string) => void;
}

const COMMON_SPAM_KEYWORDS = [
  'casino',
  'viagra',
  'crypto bonus',
  'seo ranking',
  'telegram: @',
  'whatsapp: +',
  'make money fast',
];

export const GeneralSettingsView: React.FC<GeneralSettingsViewProps> = ({
  site,
  onSiteUpdated,
  onSiteDeleted,
}) => {
  // Identity & General
  const [name, setName] = useState(site.name || '');
  const [domain, setDomain] = useState(site.domain || '');
  const [allowedOrigins, setAllowedOrigins] = useState(site.allowed_origins || '');

  // Spam & Bot Shield
  const [blockDisposableEmails, setBlockDisposableEmails] = useState(
    Boolean(site.block_disposable_emails)
  );
  const [spamFilterEnabled, setSpamFilterEnabled] = useState(
    Boolean(site.spam_keywords && site.spam_keywords.trim().length > 0)
  );
  const [spamKeywords, setSpamKeywords] = useState(site.spam_keywords || '');

  const [turnstileEnabled, setTurnstileEnabled] = useState(
    Boolean(site.turnstile_secret_key && site.turnstile_secret_key.trim().length > 0)
  );
  const [turnstileSecretKey, setTurnstileSecretKey] = useState(site.turnstile_secret_key || '');

  // Privacy & GDPR
  const [dataRetentionDays, setDataRetentionDays] = useState<number>(site.data_retention_days ?? 0);
  const [anonymizeIp, setAnonymizeIp] = useState(Boolean(site.anonymize_ip));

  // State management
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);
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
    setBlockDisposableEmails(Boolean(site.block_disposable_emails));
    setSpamFilterEnabled(Boolean(site.spam_keywords && site.spam_keywords.trim().length > 0));
    setSpamKeywords(site.spam_keywords || '');
    setTurnstileEnabled(
      Boolean(site.turnstile_secret_key && site.turnstile_secret_key.trim().length > 0)
    );
    setTurnstileSecretKey(site.turnstile_secret_key || '');
    setDataRetentionDays(site.data_retention_days ?? 0);
    setAnonymizeIp(Boolean(site.anonymize_ip));
  }, [site]);

  const endpointUrl = `https://entrywise.webbound.in/f/${site.api_key}`;

  const handleCopyKey = () => {
    navigator.clipboard.writeText(site.api_key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleCopyEndpoint = () => {
    navigator.clipboard.writeText(endpointUrl);
    setCopiedEndpoint(true);
    setTimeout(() => setCopiedEndpoint(false), 2000);
  };

  const handleAddKeyword = (kw: string) => {
    const current = spamKeywords
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);
    if (!current.includes(kw)) {
      const updated = [...current, kw].join(', ');
      setSpamKeywords(updated);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const finalTurnstileKey = turnstileEnabled ? turnstileSecretKey.trim() || null : null;
      const finalSpamKeywords = spamFilterEnabled ? spamKeywords.trim() || null : null;

      const updated = await api.updateSite(site.id, {
        name: name.trim() || domain,
        domain: domain.trim(),
        allowed_origins: allowedOrigins.trim() || null,
        turnstile_secret_key: finalTurnstileKey,
        block_disposable_emails: blockDisposableEmails ? 1 : 0,
        spam_keywords: finalSpamKeywords,
        data_retention_days: dataRetentionDays > 0 ? dataRetentionDays : null,
        anonymize_ip: anonymizeIp ? 1 : 0,
      });

      onSiteUpdated(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: unknown) {
      console.error('Failed to update form settings:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update form settings');
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
    } catch (err: unknown) {
      console.error('Failed to delete form:', err);
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete form');
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-400" />
            <span>Form Settings &amp; Security</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Configure form routing, origin security, automated spam filtering, and privacy
            compliance.
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleSave()}
          disabled={isSaving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition shadow-lg shadow-white/5 disabled:opacity-50 self-start sm:self-auto cursor-pointer"
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
              <span>Save Changes</span>
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

      {/* 1. Form Identity & Ingestion Endpoint Card */}
      <div className="p-6 rounded-2xl border border-white/[0.08] bg-[#121318] space-y-5 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Key className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Form Identity &amp; Routing Key</h3>
            <p className="text-xs text-zinc-400">
              Basic identification and unique public endpoint routing.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="form-name-input"
              className="block text-xs font-semibold text-zinc-300 mb-1.5"
            >
              Form Friendly Name
            </label>
            <input
              id="form-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Contact Us or Waitlist Form"
              className="w-full bg-[#0a0a0d] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition"
            />
          </div>
          <div>
            <label
              htmlFor="primary-domain-input"
              className="block text-xs font-semibold text-zinc-300 mb-1.5"
            >
              Primary Domain
            </label>
            <input
              id="primary-domain-input"
              type="text"
              required
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full bg-[#0a0a0d] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-zinc-100 font-mono focus:outline-none focus:border-emerald-500/50 transition"
            />
          </div>
        </div>

        {/* Public Ingestion Key & Endpoint */}
        <div className="pt-2 border-t border-white/[0.06] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-semibold text-zinc-300">Public Form API Key</span>
              <p className="text-[11px] text-zinc-500">
                Safe to use in your client-side form HTML action or JS fetch handler.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <code className="px-3 py-1.5 rounded-lg bg-[#0a0a0d] border border-white/[0.08] font-mono text-zinc-300 text-xs">
                {site.api_key}
              </code>
              <button
                type="button"
                onClick={handleCopyKey}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-white transition text-xs font-medium cursor-pointer"
              >
                {copiedKey ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedKey ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-white/[0.04]">
            <div className="min-w-0">
              <span className="text-xs font-semibold text-zinc-300">Direct Ingestion Endpoint</span>
              <p className="text-[11px] text-zinc-500 truncate">
                Target URL for form POST requests.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <code className="px-3 py-1.5 rounded-lg bg-[#0a0a0d] border border-white/[0.08] font-mono text-emerald-400/90 text-xs truncate max-w-xs sm:max-w-md">
                {endpointUrl}
              </code>
              <button
                type="button"
                onClick={handleCopyEndpoint}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-white transition text-xs font-medium shrink-0 cursor-pointer"
              >
                {copiedEndpoint ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedEndpoint ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Spam & Bot Shield (Refero Progressive Disclosure) */}
      <div className="p-6 rounded-2xl border border-white/[0.08] bg-[#121318] space-y-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Spam &amp; Abuse Shield</h3>
              <p className="text-xs text-zinc-400">
                Protect your team from spambots, malicious links, and disposable accounts.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Zero-Friction Guard Active
          </span>
        </div>

        {/* Built-in Honeypot Informational Banner */}
        <div className="p-3.5 rounded-xl border border-white/[0.06] bg-[#0a0a0d] flex items-start gap-3">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <span className="font-semibold text-zinc-200">
              Built-in Honeypot Trap (Always Enabled)
            </span>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              EntryWise automatically monitors hidden fields like{' '}
              <code className="text-emerald-400/90 font-mono">_gotcha</code> or{' '}
              <code className="text-emerald-400/90 font-mono">_trap</code>. Automated bots fill them
              in while human visitors never see them, discarding spam with zero CAPTCHA friction.
            </p>
          </div>
        </div>

        {/* Toggles Container */}
        <div className="divide-y divide-white/[0.06] space-y-4">
          {/* Toggle: Block Disposable Emails */}
          <div className="pt-4 first:pt-0 flex items-start justify-between gap-4">
            <div className="space-y-1 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-white">
                  Block Disposable &amp; Burner Emails
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                  Recommended
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Automatically rejects submissions from over 100+ known temporary email services
                (e.g. Mailinator, GuerillaMail, 10MinuteMail, YOPmail) to keep your lead quality
                high.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={blockDisposableEmails}
              onClick={() => setBlockDisposableEmails(!blockDisposableEmails)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                blockDisposableEmails ? 'bg-emerald-500' : 'bg-white/10'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  blockDisposableEmails ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Toggle: Spam Keyword Blacklist with Progressive Disclosure */}
          <div className="pt-4 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 max-w-xl">
                <span className="text-xs font-semibold text-white">Spam Keyword Blacklist</span>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Submissions containing specified phrases or domains will be flagged as{' '}
                  <code className="text-zinc-300 font-mono">spam</code> and will silently skip email
                  notifications and webhook dispatches.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={spamFilterEnabled}
                onClick={() => setSpamFilterEnabled(!spamFilterEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  spamFilterEnabled ? 'bg-emerald-500' : 'bg-white/10'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    spamFilterEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Expanded Keyword Filter Input */}
            {spamFilterEnabled && (
              <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0a0a0d] space-y-3 mt-2">
                <div>
                  <label
                    htmlFor="spam-keywords-input"
                    className="block text-xs font-semibold text-zinc-300 mb-1"
                  >
                    Blocked Keywords &amp; Phrases (comma separated)
                  </label>
                  <input
                    id="spam-keywords-input"
                    type="text"
                    value={spamKeywords}
                    onChange={(e) => setSpamKeywords(e.target.value)}
                    placeholder="e.g. crypto, casino, telegram, viagra, whatsapp"
                    className="w-full bg-[#121318] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-zinc-100 font-mono focus:outline-none focus:border-emerald-500/50 transition"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-zinc-500 block mb-1.5">
                    Click to add common spam triggers:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {COMMON_SPAM_KEYWORDS.map((kw) => (
                      <button
                        key={kw}
                        type="button"
                        onClick={() => handleAddKeyword(kw)}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-mono bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-zinc-200 border border-white/[0.06] transition cursor-pointer"
                      >
                        + {kw}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Toggle: Cloudflare Turnstile with Progressive Disclosure */}
          <div className="pt-4 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 max-w-xl">
                <span className="text-xs font-semibold text-white">
                  Cloudflare Turnstile Anti-Bot Challenge
                </span>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Require interactive or invisible CAPTCHA tokens for high-traffic or targeted web
                  forms.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={turnstileEnabled}
                onClick={() => setTurnstileEnabled(!turnstileEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  turnstileEnabled ? 'bg-emerald-500' : 'bg-white/10'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    turnstileEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Expanded Turnstile Secret Key Input */}
            {turnstileEnabled && (
              <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0a0a0d] space-y-3 mt-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="turnstile-secret-input"
                    className="block text-xs font-semibold text-zinc-300"
                  >
                    Cloudflare Turnstile Secret Key
                  </label>
                  <a
                    href="https://dash.cloudflare.com/?to=/:account/turnstile"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium transition"
                  >
                    <span>Turnstile Dashboard</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <input
                  id="turnstile-secret-input"
                  type="password"
                  value={turnstileSecretKey}
                  onChange={(e) => setTurnstileSecretKey(e.target.value)}
                  placeholder="0x4AAAAAA..."
                  className="w-full bg-[#121318] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-zinc-100 font-mono focus:outline-none focus:border-emerald-500/50 transition"
                />
                <p className="text-[11px] text-zinc-500">
                  When enabled, form submissions must include a valid{' '}
                  <code className="text-zinc-400 font-mono">cf-turnstile-response</code> token in
                  the POST payload.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Privacy & GDPR Compliance Card */}
      <div className="p-6 rounded-2xl border border-white/[0.08] bg-[#121318] space-y-6 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Privacy &amp; GDPR Compliance</h3>
            <p className="text-xs text-zinc-400">
              Configure data minimization schedules and submitter IP anonymization.
            </p>
          </div>
        </div>

        <div className="divide-y divide-white/[0.06] space-y-4">
          {/* Submission Retention Auto-Pruning */}
          <div className="pt-4 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 max-w-xl">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-semibold text-white">
                  Automatic Submission Retention
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Automatically delete historical submission records and file metadata after the
                selected retention window.
              </p>
            </div>
            <div className="shrink-0 w-full sm:w-56">
              <select
                aria-label="Automatic Submission Retention Period"
                value={dataRetentionDays}
                onChange={(e) => setDataRetentionDays(Number(e.target.value))}
                className="w-full bg-[#0a0a0d] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500/50 cursor-pointer"
              >
                <option value={0}>Indefinite (Keep forever)</option>
                <option value={30}>30 Days (Strict GDPR)</option>
                <option value={60}>60 Days</option>
                <option value={90}>90 Days (Recommended)</option>
                <option value={180}>180 Days (Half-year)</option>
                <option value={365}>365 Days (1 Year)</option>
              </select>
            </div>
          </div>

          {/* Anonymize IP Addresses (Zero-IP Mode) */}
          <div className="pt-4 flex items-start justify-between gap-4">
            <div className="space-y-1 max-w-xl">
              <div className="flex items-center gap-2">
                <EyeOff className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-semibold text-white">
                  Anonymize IP Addresses (Zero-IP Mode)
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Mask the last octet of IPv4 (
                <code className="text-zinc-300 font-mono">192.168.1.xxx</code>) and trailing 80 bits
                of IPv6 addresses before writing to database storage. Ensures no personally
                identifiable network telemetry is retained.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={anonymizeIp}
              onClick={() => setAnonymizeIp(!anonymizeIp)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                anonymizeIp ? 'bg-emerald-500' : 'bg-white/10'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  anonymizeIp ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Origin & CORS Security Card */}
      <div className="p-6 rounded-2xl border border-white/[0.08] bg-[#121318] space-y-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Allowed Origins / CORS Security</h3>
            <p className="text-xs text-zinc-400">
              Restrict client-side browser submissions (
              <code className="font-mono text-zinc-300">fetch</code> /{' '}
              <code className="font-mono text-zinc-300">XMLHttpRequest</code>) to authorized
              domains.
            </p>
          </div>
        </div>

        <div>
          <label
            htmlFor="allowed-origins-input"
            className="block text-xs font-semibold text-zinc-300 mb-1.5"
          >
            Allowed Origins
          </label>
          <input
            id="allowed-origins-input"
            type="text"
            placeholder="acme.com, staging.acme.com, localhost:3000"
            value={allowedOrigins}
            onChange={(e) => setAllowedOrigins(e.target.value)}
            className="w-full bg-[#0a0a0d] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-zinc-100 font-mono focus:outline-none focus:border-emerald-500/50 transition"
          />
          <p className="text-[11px] text-zinc-500 mt-2 leading-relaxed">
            Leave blank to restrict submissions exclusively to your Primary Domain (
            <code className="text-zinc-300 font-mono">{domain || 'your domain'}</code>). Set to{' '}
            <code className="text-zinc-300 font-mono">*</code> during local development or for
            dynamic branch deployments (e.g. Vercel / Netlify preview URLs).
          </p>
        </div>
      </div>

      {/* 5. Danger Zone Card */}
      <div className="p-6 rounded-2xl border border-red-500/20 bg-red-500/[0.03] space-y-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-red-400">Danger Zone: Delete Form</h3>
            <p className="text-xs text-zinc-400">
              Permanently remove this form, its API key, all historical submissions, and webhook
              configurations.
            </p>
          </div>
        </div>

        {!showDeleteConfirm ? (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 transition text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete This Form...</span>
          </button>
        ) : (
          <div className="p-4 rounded-xl border border-red-500/30 bg-[#0c0d10] space-y-3">
            <p className="text-xs text-red-300 font-medium leading-relaxed">
              This action is permanent and cannot be undone. To confirm, please type{' '}
              <span className="font-mono font-bold text-white bg-red-500/20 px-1.5 py-0.5 rounded">
                {site.domain}
              </span>{' '}
              below:
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
                className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white transition text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSite}
                disabled={isDeleting || deleteInput.trim() !== site.domain.trim()}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition disabled:opacity-40 cursor-pointer"
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
