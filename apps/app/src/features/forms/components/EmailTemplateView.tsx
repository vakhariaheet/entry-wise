import {
  AlertCircle,
  Check,
  CheckCircle2,
  Loader2,
  Mail,
  Monitor,
  Save,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import React, { useState } from 'react';
import { api } from '@/lib';
import type { Site } from '@/types';

interface EmailTemplateViewProps {
  site: Site;
  onSiteUpdated: (site: Site) => void;
}

export const EmailTemplateView: React.FC<EmailTemplateViewProps> = ({ site, onSiteUpdated }) => {
  // Notification routing state
  const [notifyOnSubmission, setNotifyOnSubmission] = useState(
    site.notify_on_submission === undefined ? true : Boolean(site.notify_on_submission)
  );
  const [notificationEmails, setNotificationEmails] = useState(site.notification_emails || '');

  // Auto-responder state
  const [autoResponderEnabled, setAutoResponderEnabled] = useState(
    Boolean(site.auto_responder_enabled)
  );
  const [autoResponderSubject, setAutoResponderSubject] = useState(
    site.auto_responder_subject || 'We received your message — {{domain}}'
  );
  const [autoResponderBody, setAutoResponderBody] = useState(
    site.auto_responder_body ||
      'Thank you for reaching out! We have received your submission and our team will get back to you shortly.'
  );

  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  React.useEffect(() => {
    setNotifyOnSubmission(
      site.notify_on_submission === undefined ? true : Boolean(site.notify_on_submission)
    );
    setNotificationEmails(site.notification_emails || '');
    setAutoResponderEnabled(Boolean(site.auto_responder_enabled));
    setAutoResponderSubject(site.auto_responder_subject || 'We received your message — {{domain}}');
    setAutoResponderBody(
      site.auto_responder_body ||
        'Thank you for reaching out! We have received your submission and our team will get back to you shortly.'
    );
  }, [site]);

  const handleInsertVariable = (token: string, target: 'subject' | 'body') => {
    if (target === 'subject') {
      setAutoResponderSubject((prev) => `${prev} ${token}`);
    } else {
      setAutoResponderBody((prev) => `${prev} ${token}`);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const updated = await api.updateSite(site.id, {
        notify_on_submission: notifyOnSubmission,
        notification_emails: notificationEmails.trim() || null,
        auto_responder_enabled: autoResponderEnabled,
        auto_responder_subject: autoResponderSubject.trim() || null,
        auto_responder_body: autoResponderBody.trim() || null,
      });

      onSiteUpdated(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err: any) {
      console.error('Failed to update email settings:', err);
      setErrorMessage(err.message || 'Failed to update email settings');
    } finally {
      setIsSaving(false);
    }
  };

  const previewSubject = (autoResponderSubject || 'We received your message')
    .replace(/{{\s*name\s*}}/gi, 'Alex Taylor')
    .replace(/{{\s*email\s*}}/gi, 'alex@example.com')
    .replace(/{{\s*domain\s*}}/gi, site.domain)
    .replace(/{{\s*company\s*}}/gi, site.name || site.domain)
    .replace(/{{\s*company_name\s*}}/gi, site.name || site.domain)
    .replace(/{{\s*submission_id\s*}}/gi, '#EW-2026-849102');

  const previewBody = (autoResponderBody || 'Thank you for reaching out!')
    .replace(/{{\s*name\s*}}/gi, 'Alex Taylor')
    .replace(/{{\s*email\s*}}/gi, 'alex@example.com')
    .replace(/{{\s*domain\s*}}/gi, site.domain)
    .replace(/{{\s*company\s*}}/gi, site.name || site.domain)
    .replace(/{{\s*company_name\s*}}/gi, site.name || site.domain)
    .replace(/{{\s*submission_id\s*}}/gi, '#EW-2026-849102');

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Mail className="w-5 h-5 text-emerald-400" />
            <span>Email Routing &amp; Auto-Responder</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Configure real-time team submission alerts and customize automated branded receipts sent
            to submitters.
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
              <span>Save Email Settings</span>
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

      {/* 1. Team Notification Alerts */}
      <div className="p-6 rounded-2xl border border-white/[0.08] bg-[#121318] space-y-5 shadow-lg">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
          <div>
            <h3 className="text-sm font-semibold text-white">Team Email Alerts</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Notifies your team in real time whenever someone submits this form.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={notifyOnSubmission}
              onChange={(e) => setNotifyOnSubmission(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:width-5 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </div>

        {notifyOnSubmission && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-200 mb-1.5">
                Notification Recipient Emails
              </label>
              <textarea
                rows={2}
                placeholder="team@acme.com, founder@acme.com, leads@marketing.com"
                value={notificationEmails}
                onChange={(e) => setNotificationEmails(e.target.value)}
                className="w-full bg-[#0a0a0d] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition font-mono leading-relaxed"
              />
              <p className="text-[11px] text-zinc-500 mt-1">
                Separate multiple recipient emails with commas. If left empty, alerts route to your
                primary account email.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0c0d10] flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-zinc-200 text-xs">
                  Direct Submitter Reply-To Enabled
                </h4>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  When you click &quot;Reply&quot; to any submission alert in Gmail, Outlook, or
                  Apple Mail, your email client will automatically address the submitter directly.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Submitter Auto-Responder Studio */}
      <div className="p-6 rounded-2xl border border-white/[0.08] bg-[#121318] space-y-6 shadow-lg">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Submitter Auto-Responder Email</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Sends an automated, branded confirmation receipt email to the user right after they
              submit.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={autoResponderEnabled}
              onChange={(e) => setAutoResponderEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:width-5 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </div>

        {autoResponderEnabled && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Left: Template Editor */}
            <div className="space-y-5">
              {/* Dynamic Tokens */}
              <div>
                <label className="block text-zinc-400 text-xs mb-2 font-medium">
                  Insert dynamic template variables:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {['{{name}}', '{{email}}', '{{company}}', '{{domain}}', '{{submission_id}}'].map(
                    (tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleInsertVariable(tag, 'body')}
                        className="px-2.5 py-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-mono transition"
                      >
                        + {tag}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Subject Line */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Email Subject Line
                </label>
                <input
                  type="text"
                  value={autoResponderSubject}
                  onChange={(e) => setAutoResponderSubject(e.target.value)}
                  placeholder="We received your message — {{domain}}"
                  className="w-full bg-[#0a0a0d] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition"
                />
              </div>

              {/* Confirmation Message Body */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Confirmation Message Body
                </label>
                <textarea
                  rows={8}
                  value={autoResponderBody}
                  onChange={(e) => setAutoResponderBody(e.target.value)}
                  placeholder="Thank you for getting in touch with us at {{company}}..."
                  className="w-full bg-[#0a0a0d] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition leading-relaxed font-sans"
                />
                <p className="text-[11px] text-zinc-500 mt-1.5">
                  Safe HTML encoding is enforced. Paragraph breaks are styled cleanly with zero
                  layout shift.
                </p>
              </div>
            </div>

            {/* Right: Live Responsive Preview */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-300">
                  Live Rendered Email Preview
                </label>
                <div className="flex items-center gap-1 bg-[#0a0a0d] p-1 rounded-xl border border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('desktop')}
                    className={`p-1.5 rounded-lg transition ${
                      previewDevice === 'desktop'
                        ? 'bg-white/[0.1] text-white shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                    title="Desktop Preview"
                  >
                    <Monitor className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('mobile')}
                    className={`p-1.5 rounded-lg transition ${
                      previewDevice === 'mobile'
                        ? 'bg-white/[0.1] text-white shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                    title="Mobile Preview"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Email Client Simulation Frame */}
              <div
                className={`mx-auto bg-[#f8fafc] text-zinc-900 rounded-2xl border border-white/[0.1] shadow-2xl overflow-hidden transition-all duration-300 ${
                  previewDevice === 'mobile' ? 'max-w-[320px]' : 'w-full'
                }`}
              >
                {/* Email Header */}
                <div className="p-4 bg-white border-b border-zinc-200 text-center">
                  <div className="font-bold text-sm tracking-tight text-zinc-900">
                    {site.name || site.domain}
                  </div>
                  <div className="text-[11px] text-zinc-500">{site.domain}</div>
                </div>

                {/* Email Body */}
                <div className="p-6 text-center space-y-4">
                  <div className="w-10 h-10 mx-auto rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center font-bold text-lg">
                    ✓
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-zinc-900">{previewSubject}</h4>
                    <p className="text-xs font-semibold text-zinc-700 mt-1">Hi Alex Taylor,</p>
                  </div>
                  <p className="text-xs text-zinc-600 leading-relaxed max-w-xs mx-auto whitespace-pre-line">
                    {previewBody}
                  </p>

                  <div className="pt-2">
                    <span className="inline-block px-4 py-2 bg-zinc-900 text-white rounded-lg font-semibold text-[11px] shadow-sm">
                      Visit {site.domain} &rarr;
                    </span>
                  </div>
                </div>

                {/* Email Footer */}
                <div className="p-3 bg-zinc-100 border-t border-zinc-200 text-center text-[10px] text-zinc-500">
                  Delivered securely on behalf of {site.name || site.domain} via EntryWise
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
