import React, { useState, useEffect } from 'react';
import type { Site, FormField, FieldType } from '../types';
import {
  X,
  Copy,
  Check,
  Save,
  Shield,
  Mail,
  Webhook,
  Key,
  Radio,
  FileSpreadsheet,
  MessageSquare,
  Sparkles,
  Smartphone,
  Monitor,
  Code2,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2,
  ListPlus,
  Trash2,
  Plus,
  ArrowRight,
  SlidersHorizontal,
} from 'lucide-react';
import { api } from '../services/api';

interface SiteSettingsModalProps {
  site: Site | null;
  initialTab?: TabType;
  onClose: () => void;
  onSiteUpdated: (updatedSite: Site) => void;
  onFieldsUpdated?: (fields: FormField[]) => void;
}

export type TabType = 'fields' | 'embed' | 'general' | 'notifications' | 'connectors' | 'template';

export const SiteSettingsModal: React.FC<SiteSettingsModalProps> = ({
  site,
  initialTab = 'fields',
  onClose,
  onSiteUpdated,
  onFieldsUpdated,
}) => {
  if (!site) return null;

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedFormSnippet, setCopiedFormSnippet] = useState(false);
  const [showAppsScriptGuide, setShowAppsScriptGuide] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [snippetFormat, setSnippetFormat] = useState<'html' | 'react' | 'curl'>('html');

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form Fields State
  const [fields, setFields] = useState<FormField[]>([]);
  const [isLoadingFields, setIsLoadingFields] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<FieldType>('text');

  // General & Security
  const [name, setName] = useState(site.name || '');
  const [domain, setDomain] = useState(site.domain || '');
  const [turnstileSecretKey, setTurnstileSecretKey] = useState(site.turnstile_secret_key || '');
  const [allowedOrigins, setAllowedOrigins] = useState(site.allowed_origins || '');

  // Notifications
  const [notifyOnSubmission, setNotifyOnSubmission] = useState(
    site.notify_on_submission === undefined ? true : Boolean(site.notify_on_submission)
  );
  const [notificationEmails, setNotificationEmails] = useState(site.notification_emails || '');

  // Connectors
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState(site.google_sheets_url || '');
  const [slackWebhookUrl, setSlackWebhookUrl] = useState(site.slack_webhook_url || '');
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState(site.discord_webhook_url || '');
  const [webhookUrl, setWebhookUrl] = useState(site.webhook_url || '');
  const [webhookSecret, setWebhookSecret] = useState(site.webhook_secret || '');

  // Email Template Studio
  const [autoResponderEnabled, setAutoResponderEnabled] = useState(Boolean(site.auto_responder_enabled));
  const [autoResponderSubject, setAutoResponderSubject] = useState(
    site.auto_responder_subject || 'We received your message — {{domain}}'
  );
  const [autoResponderBody, setAutoResponderBody] = useState(
    site.auto_responder_body ||
      'Thank you for reaching out! We have received your submission and our team will get back to you shortly.'
  );

  const endpointUrl = `https://entrywise.webbound.in/f/${site.api_key}`;

  // Fetch defined fields on mount or site switch
  useEffect(() => {
    const fetchFields = async () => {
      setIsLoadingFields(true);
      try {
        const fetched = await api.listFields(site.id);
        if (fetched.length > 0) {
          setFields(fetched);
        } else {
          setFields([
            { name: 'name', type: 'text' },
            { name: 'email', type: 'email' },
            { name: 'message', type: 'text' },
          ]);
        }
      } catch (err) {
        console.error('Failed to load fields:', err);
        setFields([
          { name: 'name', type: 'text' },
          { name: 'email', type: 'email' },
          { name: 'message', type: 'text' },
        ]);
      } finally {
        setIsLoadingFields(false);
      }
    };
    fetchFields();
  }, [site.id]);

  // Sync state if site prop changes
  useEffect(() => {
    if (site) {
      setName(site.name || '');
      setDomain(site.domain || '');
      setTurnstileSecretKey(site.turnstile_secret_key || '');
      setAllowedOrigins(site.allowed_origins || '');
      setNotifyOnSubmission(site.notify_on_submission === undefined ? true : Boolean(site.notify_on_submission));
      setNotificationEmails(site.notification_emails || '');
      setGoogleSheetsUrl(site.google_sheets_url || '');
      setSlackWebhookUrl(site.slack_webhook_url || '');
      setDiscordWebhookUrl(site.discord_webhook_url || '');
      setWebhookUrl(site.webhook_url || '');
      setWebhookSecret(site.webhook_secret || '');
      setAutoResponderEnabled(Boolean(site.auto_responder_enabled));
      setAutoResponderSubject(site.auto_responder_subject || 'We received your message — {{domain}}');
      setAutoResponderBody(site.auto_responder_body || 'Thank you for reaching out! We have received your submission and our team will get back to you shortly.');
    }
  }, [site]);

  const handleAddField = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newFieldName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/^_+|_+$/g, '');

    if (!cleanName) return;

    if (fields.some((f) => f.name.toLowerCase() === cleanName.toLowerCase())) {
      setErrorMessage(`Field with name '${cleanName}' already exists.`);
      return;
    }

    setFields([...fields, { name: cleanName, type: newFieldType }]);
    setNewFieldName('');
    setErrorMessage(null);
  };

  const handleRemoveField = (fieldName: string) => {
    setFields(fields.filter((f) => f.name !== fieldName));
  };

  const handleApplyPreset = (presetFields: Array<{ name: string; type: FieldType }>) => {
    setFields(presetFields);
  };

  const handleCopyEndpoint = () => {
    navigator.clipboard.writeText(endpointUrl);
    setCopiedEndpoint(true);
    setTimeout(() => setCopiedEndpoint(false), 2000);
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(site.api_key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleInsertVariable = (token: string, target: 'subject' | 'body') => {
    if (target === 'subject') {
      setAutoResponderSubject((prev) => `${prev} ${token}`);
    } else {
      setAutoResponderBody((prev) => `${prev} ${token}`);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);

    try {
      // 1. Update site details
      const updated = await api.updateSite(site.id, {
        name: name.trim() || domain,
        domain: domain.trim(),
        turnstile_secret_key: turnstileSecretKey.trim() || null,
        allowed_origins: allowedOrigins.trim() || null,
        notify_on_submission: notifyOnSubmission,
        notification_emails: notificationEmails.trim() || null,
        google_sheets_url: googleSheetsUrl.trim() || null,
        slack_webhook_url: slackWebhookUrl.trim() || null,
        discord_webhook_url: discordWebhookUrl.trim() || null,
        webhook_url: webhookUrl.trim() || null,
        webhook_secret: webhookSecret.trim() || null,
        auto_responder_enabled: autoResponderEnabled,
        auto_responder_subject: autoResponderSubject.trim() || null,
        auto_responder_body: autoResponderBody.trim() || null,
      });

      // 2. Persist fields schema
      const updatedFields = await api.replaceFields(
        site.id,
        fields.map((f) => ({ name: f.name, type: f.type }))
      );

      if (onFieldsUpdated) {
        onFieldsUpdated(updatedFields);
      }

      onSiteUpdated(updated);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Failed to update form settings:', err);
      setErrorMessage(err.message || 'Failed to update form settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Generate HTML, React, or cURL code snippet matching the configured fields
  const generateSnippet = () => {
    if (snippetFormat === 'html') {
      const fieldInputs = fields
        .map((f) => {
          if (f.name.toLowerCase() === 'message' || f.name.toLowerCase().includes('body')) {
            return `    <label for="${f.name}">${f.name}</label>\n    <textarea id="${f.name}" name="${f.name}" required></textarea>`;
          }
          if (f.type === 'file') {
            return `    <label for="${f.name}">${f.name}</label>\n    <input type="file" id="${f.name}" name="${f.name}" />`;
          }
          return `    <label for="${f.name}">${f.name}</label>\n    <input type="${f.type}" id="${f.name}" name="${f.name}" required />`;
        })
        .join('\n\n');

      const isMultipart = fields.some((f) => f.type === 'file');

      return `<!-- Native HTML Form for ${name || site.domain} -->
<form action="${endpointUrl}" method="POST"${isMultipart ? ' enctype="multipart/form-data"' : ''}>
  <!-- Anti-spam honeypot (keep hidden from human users) -->
  <input type="text" name="_gotcha" style="display:none" tabindex="-1" autocomplete="off" />

${fieldInputs}

  <button type="submit">Submit Form</button>
</form>`;
    } else if (snippetFormat === 'react') {
      const stateInit = fields.map((f) => `    ${f.name}: '',`).join('\n');
      const inputElements = fields
        .map((f) => {
          if (f.name.toLowerCase() === 'message' || f.name.toLowerCase().includes('body')) {
            return `      <textarea\n        placeholder="${f.name}"\n        value={formData.${f.name}}\n        onChange={(e) => setFormData({ ...formData, ${f.name}: e.target.value })}\n        required\n      />`;
          }
          return `      <input\n        type="${f.type}"\n        placeholder="${f.name}"\n        value={formData.${f.name}}\n        onChange={(e) => setFormData({ ...formData, ${f.name}: e.target.value })}\n        required\n      />`;
        })
        .join('\n');

      return `// React Component for ${name || site.domain}
import React, { useState } from 'react';

export function ContactForm() {
  const [formData, setFormData] = useState({
${stateInit}
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
${inputElements}
      <button type="submit" disabled={status === 'submitting'}>
        {status === 'submitting' ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
}`;
    } else {
      const sampleJson = JSON.stringify(
        Object.fromEntries(fields.map((f) => [f.name, f.type === 'email' ? 'user@example.com' : f.name])),
        null,
        2
      );
      return `# Direct API Submission via cURL
curl -X POST "${endpointUrl}" \\
  -H "Content-Type: application/json" \\
  -d '${sampleJson}'`;
    }
  };

  // Live interpolated body for email preview
  const previewBody = (autoResponderBody || 'Thank you for reaching out!')
    .replace(/{{\s*name\s*}}/gi, 'Alex Taylor')
    .replace(/{{\s*email\s*}}/gi, 'alex@example.com')
    .replace(/{{\s*domain\s*}}/gi, site.domain)
    .replace(/{{\s*company\s*}}/gi, name || site.domain)
    .replace(/{{\s*company_name\s*}}/gi, name || site.domain)
    .replace(/{{\s*submission_id\s*}}/gi, '#EW-2026-849102');

  const previewSubject = (autoResponderSubject || 'We received your message')
    .replace(/{{\s*name\s*}}/gi, 'Alex Taylor')
    .replace(/{{\s*domain\s*}}/gi, site.domain)
    .replace(/{{\s*company\s*}}/gi, name || site.domain);

  const appsScriptCode = `// Google Apps Script to auto-append EntryWise form submissions to Google Sheets
function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    // Ensure header row exists
    var headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
    if (headers.length === 0 || headers[0] === '') {
      headers = Object.keys(data);
      sheet.appendRow(headers);
    }
    
    // Build row matching existing columns
    var row = [];
    for (var i = 0; i < headers.length; i++) {
      row.push(data[headers[i]] !== undefined ? data[headers[i]] : '');
    }
    sheet.appendRow(row);
    
    return ContentService.createTextOutput(JSON.stringify({ result: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ result: 'error', error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

  const TABS: Array<{ id: TabType; label: string; icon: any }> = [
    { id: 'fields', label: 'Form Fields & Schema', icon: ListPlus },
    { id: 'embed', label: 'Code & Embed', icon: Code2 },
    { id: 'general', label: 'General & Security', icon: Shield },
    { id: 'notifications', label: 'Notification Routing', icon: Mail },
    { id: 'connectors', label: 'Connectors & Webhooks', icon: Webhook },
    { id: 'template', label: 'Template Studio', icon: Sparkles },
  ];

  const getFieldTypeBadgeColor = (type: FieldType) => {
    switch (type) {
      case 'email':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'phone':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'url':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case 'file':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-300 border-zinc-500/20';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl rounded-2xl border border-white/[0.1] bg-[#0f1013] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#0a0a0d]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2.5">
                <span>{name || site.domain}</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                  {site.domain}
                </span>
              </h3>
              <p className="text-xs text-zinc-400">Configure form identity, custom fields, notifications, and connectors</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition focus:outline-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation (Pill Segmented Bar with zero browser outline artifacts) */}
        <div className="flex items-center gap-1.5 px-6 py-2.5 border-b border-white/[0.08] bg-[#0c0d10] overflow-x-auto no-scrollbar">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap focus:outline-none ${
                  isActive
                    ? 'bg-white/[0.08] text-white font-semibold shadow-sm border border-white/[0.1]'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03] border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-zinc-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Content Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {errorMessage && (
            <div className="p-3.5 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-xs">
              {errorMessage}
            </div>
          )}

          {/* TAB 1: Form Fields & Schema (Full Width, Spacious & Highly Readable) */}
          {activeTab === 'fields' && (
            <div className="space-y-6">
              {/* Form Friendly Name & Domain Card */}
              <div className="p-4 rounded-xl border border-white/[0.08] bg-[#14151a] grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-200 mb-1.5">
                    Form Friendly Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Contact Us Form"
                    className="w-full bg-[#0a0a0d] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/40 transition"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">Display title shown in your dashboard and notification subjects.</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-200 mb-1.5">
                    Associated Website Domain
                  </label>
                  <input
                    type="text"
                    required
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    placeholder="acme.com or localhost:3000"
                    className="w-full bg-[#0a0a0d] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 font-mono placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/40 transition"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">Domain origin verified during incoming submissions.</p>
                </div>
              </div>

              {/* Form Schema & Field Definitions (Full Width) */}
              <div className="p-5 rounded-xl border border-white/[0.08] bg-[#14151a] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
                  <div>
                    <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
                      <span>Form Schema Fields</span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-white/[0.06] text-zinc-300 border border-white/[0.08]">
                        {fields.length} {fields.length === 1 ? 'field' : 'fields'}
                      </span>
                    </h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Define the input fields captured by this form. Incoming data is structured against this schema.
                    </p>
                  </div>

                  {/* Template Presets Bar */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-zinc-500 mr-1 font-mono">Templates:</span>
                    <button
                      type="button"
                      onClick={() =>
                        handleApplyPreset([
                          { name: 'name', type: 'text' },
                          { name: 'email', type: 'email' },
                          { name: 'message', type: 'text' },
                        ])
                      }
                      className="px-2.5 py-1 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] text-xs text-zinc-300 transition"
                    >
                      Contact
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleApplyPreset([
                          { name: 'fullName', type: 'text' },
                          { name: 'email', type: 'email' },
                          { name: 'phone', type: 'phone' },
                          { name: 'company', type: 'text' },
                          { name: 'budget', type: 'text' },
                        ])
                      }
                      className="px-2.5 py-1 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] text-xs text-zinc-300 transition"
                    >
                      Lead Gen
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleApplyPreset([
                          { name: 'email', type: 'email' },
                          { name: 'referral_code', type: 'text' },
                        ])
                      }
                      className="px-2.5 py-1 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] text-xs text-zinc-300 transition"
                    >
                      Waitlist
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleApplyPreset([
                          { name: 'name', type: 'text' },
                          { name: 'email', type: 'email' },
                          { name: 'resume', type: 'file' },
                          { name: 'portfolio', type: 'url' },
                        ])
                      }
                      className="px-2.5 py-1 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] text-xs text-zinc-300 transition"
                    >
                      Careers
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset([])}
                      className="px-2 py-1 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] text-xs text-zinc-400 hover:text-red-400 transition"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Fields Table / Card List */}
                <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0d] divide-y divide-white/[0.04] overflow-hidden">
                  {isLoadingFields ? (
                    <div className="p-6 text-center text-zinc-500">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-400" />
                      <span>Loading fields...</span>
                    </div>
                  ) : fields.length === 0 ? (
                    <div className="p-8 text-center space-y-1">
                      <div className="text-sm font-semibold text-zinc-300">No fields defined yet</div>
                      <p className="text-xs text-zinc-500">
                        This form currently operates in dynamic schema mode (accepts all submitted keys). Add fields below to enforce specific inputs.
                      </p>
                    </div>
                  ) : (
                    fields.map((field, idx) => (
                      <div
                        key={field.name + idx}
                        className="px-4 py-3 flex items-center justify-between hover:bg-white/[0.02] transition group"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono text-zinc-500 w-6">#{idx + 1}</span>
                          <span className="font-mono text-sm font-semibold text-zinc-100">{field.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={`text-xs font-mono px-2.5 py-1 rounded-md border font-medium uppercase ${getFieldTypeBadgeColor(
                              field.type
                            )}`}
                          >
                            {field.type}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveField(field.name)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition"
                            title="Delete field"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Field Inline Form (Spacious & Clean) */}
                <div className="pt-2">
                  <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0c0d10] space-y-3">
                    <div className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Add Custom Field to Form</span>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          placeholder="Field name (e.g. phone_number, company_size, budget)"
                          value={newFieldName}
                          onChange={(e) => setNewFieldName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddField(e);
                            }
                          }}
                          className="w-full bg-[#070709] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 font-mono placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/40 transition"
                        />
                      </div>
                      <div className="w-full sm:w-48">
                        <select
                          value={newFieldType}
                          onChange={(e) => setNewFieldType(e.target.value as FieldType)}
                          className="w-full bg-[#070709] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500/50 transition font-mono"
                        >
                          <option value="text">text (string)</option>
                          <option value="email">email (validated)</option>
                          <option value="phone">phone (number)</option>
                          <option value="url">url (link)</option>
                          <option value="file">file (upload)</option>
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddField}
                        className="px-5 py-2.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-zinc-200 transition flex items-center justify-center gap-1.5 whitespace-nowrap shadow-sm"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Field</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick Callout to Code & Embed */}
                <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                      <Code2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-zinc-200">
                        Ready to connect this form to your website?
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        Generated HTML, React, and cURL snippets automatically match your schema.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('embed')}
                    className="px-3.5 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-semibold text-emerald-300 transition flex items-center gap-1.5 whitespace-nowrap self-start sm:self-auto"
                  >
                    <span>View Integration Code</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Code & Embed (Spacious, High-Contrast Code Generator) */}
          {activeTab === 'embed' && (
            <div className="space-y-6">
              {/* Endpoint Banner */}
              <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-semibold text-emerald-400 uppercase tracking-wider text-[11px]">
                    Universal Form Ingestion Endpoint
                  </label>
                  <span className="text-[10px] font-mono text-zinc-400">POST Request</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={endpointUrl}
                    className="w-full bg-[#0a0a0d] border border-white/[0.08] rounded-xl px-3.5 py-2 font-mono text-zinc-200 text-xs focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopyEndpoint}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition whitespace-nowrap font-medium text-xs shadow-sm"
                  >
                    {copiedEndpoint ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedEndpoint ? 'Copied' : 'Copy Endpoint'}</span>
                  </button>
                </div>
              </div>

              {/* Code Snippet Box */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-white">Integration Snippet</h4>
                    <p className="text-xs text-zinc-400">Copy and paste this snippet straight into your frontend application.</p>
                  </div>

                  {/* Format Selector */}
                  <div className="flex items-center gap-1 bg-[#0a0a0d] p-1 rounded-xl border border-white/[0.08] self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setSnippetFormat('html')}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
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
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
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
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                        snippetFormat === 'curl'
                          ? 'bg-white/[0.1] text-white shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      cURL CLI
                    </button>
                  </div>
                </div>

                {/* macOS Style Code Window */}
                <div className="rounded-xl border border-white/[0.08] bg-[#070709] overflow-hidden shadow-2xl">
                  {/* Window Bar */}
                  <div className="px-4 py-2.5 border-b border-white/[0.06] bg-[#0b0c0f] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500/80"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></span>
                      <span className="text-[11px] font-mono text-zinc-400 ml-2">
                        {snippetFormat === 'html' ? 'index.html' : snippetFormat === 'react' ? 'ContactForm.tsx' : 'submit.sh'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(generateSnippet());
                        setCopiedFormSnippet(true);
                        setTimeout(() => setCopiedFormSnippet(false), 2000);
                      }}
                      className="px-3 py-1 bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.1] rounded-lg text-xs text-white flex items-center gap-1.5 transition font-medium"
                    >
                      {copiedFormSnippet ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedFormSnippet ? 'Copied to Clipboard!' : 'Copy Code'}</span>
                    </button>
                  </div>

                  {/* Code Area */}
                  <pre className="p-5 text-xs text-zinc-200 font-mono overflow-x-auto max-h-80 leading-relaxed">
                    {generateSnippet()}
                  </pre>
                </div>

                {/* Integration Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-3.5 rounded-xl border border-white/[0.06] bg-[#14151a]">
                    <div className="text-xs font-semibold text-zinc-200">🛡️ Anti-Spam Honeypot</div>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Includes a hidden <code className="text-zinc-300 font-mono">_gotcha</code> field. Spambots filling it are silently discarded.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-white/[0.06] bg-[#14151a]">
                    <div className="text-xs font-semibold text-zinc-200">📎 File Attachments</div>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Forms with files use <code className="text-zinc-300 font-mono">enctype="multipart/form-data"</code>. Max 25MB per submission.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-white/[0.06] bg-[#14151a]">
                    <div className="text-xs font-semibold text-zinc-200">↩️ Custom Redirection</div>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Add <code className="text-zinc-300 font-mono">&lt;input name="_redirect" value="/thanks"&gt;</code> to redirect users after submit.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: General & Security */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              {/* Form Friendly Name & Domain */}
              <div className="p-5 rounded-xl border border-white/[0.08] bg-[#14151a] space-y-4">
                <h4 className="text-sm font-semibold text-white">Form Identity</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Form Friendly Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Lead Generation Form"
                      className="w-full bg-[#0a0a0d] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Primary Domain</label>
                    <input
                      type="text"
                      required
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      className="w-full bg-[#0a0a0d] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 font-mono focus:outline-none focus:border-emerald-500/50 transition"
                    />
                  </div>
                </div>
              </div>

              {/* API Key */}
              <div className="p-5 rounded-xl border border-white/[0.08] bg-[#14151a] space-y-2">
                <label className="block text-xs font-semibold text-zinc-300">Live API Key</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={site.api_key}
                    className="w-full bg-[#0a0a0d] border border-white/[0.08] rounded-xl px-3.5 py-2 font-mono text-zinc-300 text-xs focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopyKey}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-white transition whitespace-nowrap text-xs font-medium"
                  >
                    {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey ? 'Copied' : 'Copy Key'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Used in the endpoint path: <code className="text-zinc-400 font-mono">/f/{site.api_key}</code>
                </p>
              </div>

              {/* Allowed Origins */}
              <div className="p-5 rounded-xl border border-white/[0.08] bg-[#14151a] space-y-2">
                <label className="block text-xs font-semibold text-zinc-300">Allowed Origins / CORS Domains</label>
                <input
                  type="text"
                  placeholder="* or acme.com, staging.acme.com, localhost:3000"
                  value={allowedOrigins}
                  onChange={(e) => setAllowedOrigins(e.target.value)}
                  className="w-full bg-[#0a0a0d] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 font-mono focus:outline-none focus:border-emerald-500/50 transition"
                />
                <p className="text-[11px] text-zinc-500">
                  Leave empty to default to primary domain. Enter <code className="text-zinc-400 font-mono">*</code> to permit submissions from any preview deploy or origin.
                </p>
              </div>

              {/* Turnstile Anti-Bot Protection */}
              <div className="p-5 rounded-xl border border-white/[0.08] bg-[#14151a] space-y-2">
                <label className="block text-xs font-semibold text-zinc-300">Cloudflare Turnstile Secret Key (Optional)</label>
                <input
                  type="password"
                  placeholder="0x4AAAAAA..."
                  value={turnstileSecretKey}
                  onChange={(e) => setTurnstileSecretKey(e.target.value)}
                  className="w-full bg-[#0a0a0d] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 font-mono focus:outline-none focus:border-emerald-500/50 transition"
                />
                <p className="text-[11px] text-zinc-500">
                  When configured, incoming submissions require a valid <code className="text-zinc-400 font-mono">cf-turnstile-response</code> token before being accepted.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: Notification Routing */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-5 rounded-xl border border-white/[0.08] bg-[#14151a]">
                <div>
                  <h4 className="text-sm font-semibold text-zinc-200">Email Alerts on Form Submission</h4>
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
                <div className="p-5 rounded-xl border border-white/[0.08] bg-[#14151a] space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Notification Recipient Emails
                    </label>
                    <textarea
                      rows={3}
                      placeholder="team@acme.com, founder@acme.com, leads@marketing.com"
                      value={notificationEmails}
                      onChange={(e) => setNotificationEmails(e.target.value)}
                      className="w-full bg-[#0a0a0d] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition font-mono leading-relaxed"
                    />
                    <p className="text-[11px] text-zinc-500 mt-1">
                      Separate multiple recipient emails with commas. If left empty, notifications route to your primary account email.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0c0d10] flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-semibold text-zinc-200 text-xs">Direct Submitter Reply-To Enabled</h5>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        When you click "Reply" to any submission alert in Gmail, Outlook, or Apple Mail, your email client will automatically address the submitter directly.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: Connectors & Webhooks */}
          {activeTab === 'connectors' && (
            <div className="space-y-6">
              {/* Google Sheets Connector */}
              <div className="p-5 rounded-xl border border-white/[0.08] bg-[#14151a] space-y-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-sm font-semibold text-zinc-200">Google Sheets Auto-Append</h4>
                </div>
                <div>
                  <input
                    type="url"
                    placeholder="https://script.google.com/macros/s/.../exec or Zapier/Make URL"
                    value={googleSheetsUrl}
                    onChange={(e) => setGoogleSheetsUrl(e.target.value)}
                    className="w-full bg-[#0a0a0d] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition font-mono"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1.5">
                    Submissions are automatically forwarded and appended as a new row to your Google Sheet.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAppsScriptGuide(!showAppsScriptGuide)}
                  className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>{showAppsScriptGuide ? 'Hide Google Apps Script template' : 'View free 30-second Google Apps Script setup'}</span>
                  {showAppsScriptGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                {showAppsScriptGuide && (
                  <div className="mt-2 p-4 rounded-xl border border-white/[0.06] bg-[#0a0a0d] space-y-2">
                    <p className="text-xs text-zinc-400">
                      1. Open your Google Sheet &rarr; Extensions &rarr; Apps Script.<br />
                      2. Paste the script below &rarr; Deploy &rarr; New Deployment &rarr; Web App (Access: Anyone).<br />
                      3. Copy the generated Web App URL and paste it into the field above!
                    </p>
                    <div className="relative">
                      <pre className="p-3 bg-black/60 rounded-lg text-[11px] text-zinc-300 font-mono overflow-x-auto max-h-40 leading-relaxed">
                        {appsScriptCode}
                      </pre>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(appsScriptCode);
                          setCopiedScript(true);
                          setTimeout(() => setCopiedScript(false), 2000);
                        }}
                        className="absolute top-2 right-2 px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded text-xs text-white flex items-center gap-1"
                      >
                        {copiedScript ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedScript ? 'Copied' : 'Copy Script'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Slack Connector */}
              <div className="p-5 rounded-xl border border-white/[0.08] bg-[#14151a] space-y-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-amber-400" />
                  <h4 className="text-sm font-semibold text-zinc-200">Slack Notifications</h4>
                </div>
                <input
                  type="url"
                  placeholder="https://hooks.slack.com/services/..."
                  value={slackWebhookUrl}
                  onChange={(e) => setSlackWebhookUrl(e.target.value)}
                  className="w-full bg-[#0a0a0d] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-500/50 transition font-mono"
                />
                <p className="text-[11px] text-zinc-500">
                  Sends formatted block notifications directly to your designated Slack channel.
                </p>
              </div>

              {/* Discord Connector */}
              <div className="p-5 rounded-xl border border-white/[0.08] bg-[#14151a] space-y-3">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-indigo-400" />
                  <h4 className="text-sm font-semibold text-zinc-200">Discord Notifications</h4>
                </div>
                <input
                  type="url"
                  placeholder="https://discord.com/api/webhooks/..."
                  value={discordWebhookUrl}
                  onChange={(e) => setDiscordWebhookUrl(e.target.value)}
                  className="w-full bg-[#0a0a0d] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500/50 transition font-mono"
                />
                <p className="text-[11px] text-zinc-500">
                  Dispatches emerald embed cards to your Discord channel.
                </p>
              </div>

              {/* Custom Webhook */}
              <div className="p-5 rounded-xl border border-white/[0.08] bg-[#14151a] space-y-3">
                <div className="flex items-center gap-2">
                  <Webhook className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-sm font-semibold text-zinc-200">Custom Webhook (HMAC-SHA256 Signed)</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-300 text-xs font-medium mb-1">Webhook Endpoint URL</label>
                    <input
                      type="url"
                      placeholder="https://api.yourdomain.com/webhook"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      className="w-full bg-[#0a0a0d] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-300 text-xs font-medium mb-1">Secret Key (for HMAC Signature)</label>
                    <input
                      type="password"
                      placeholder="whsec_..."
                      value={webhookSecret}
                      onChange={(e) => setWebhookSecret(e.target.value)}
                      className="w-full bg-[#0a0a0d] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition font-mono"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Delivered with header <code className="text-zinc-400 font-mono">X-EntryWise-Signature: sha256=...</code> with full SSRF guard and 5s timeout.
                </p>
              </div>
            </div>
          )}

          {/* TAB 6: Email Template Studio */}
          {activeTab === 'template' && (
            <div className="space-y-6">
              {/* Enable Toggle */}
              <div className="flex items-center justify-between p-5 rounded-xl border border-white/[0.08] bg-[#14151a]">
                <div>
                  <h4 className="text-sm font-semibold text-zinc-200">Submitter Auto-Responder Email</h4>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Sends an automated branded receipt email to the user right after they submit.
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left: Template Editor */}
                  <div className="space-y-4">
                    {/* Variable Tokens */}
                    <div>
                      <label className="block text-zinc-400 text-xs mb-1.5 font-medium">
                        Click token to insert into message:
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {['{{name}}', '{{email}}', '{{company}}', '{{domain}}', '{{submission_id}}'].map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => handleInsertVariable(tag, 'body')}
                            className="px-2.5 py-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-mono transition"
                          >
                            + {tag}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Subject Line */}
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Email Subject Line</label>
                      <input
                        type="text"
                        value={autoResponderSubject}
                        onChange={(e) => setAutoResponderSubject(e.target.value)}
                        placeholder="We received your message — {{domain}}"
                        className="w-full bg-[#0a0a0d] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition"
                      />
                    </div>

                    {/* Body Message */}
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Confirmation Message Body</label>
                      <textarea
                        rows={6}
                        value={autoResponderBody}
                        onChange={(e) => setAutoResponderBody(e.target.value)}
                        placeholder="Thank you for getting in touch with us at {{company}}..."
                        className="w-full bg-[#0a0a0d] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition leading-relaxed font-sans"
                      />
                      <p className="text-[11px] text-zinc-500 mt-1">
                        HTML tags are safely encoded to protect against XSS. Line breaks are converted automatically.
                      </p>
                    </div>
                  </div>

                  {/* Right: Live Preview */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-zinc-300">Live Email Preview</label>
                      <div className="flex items-center gap-1 bg-[#0a0a0d] p-0.5 rounded-lg border border-white/[0.08]">
                        <button
                          type="button"
                          onClick={() => setPreviewDevice('desktop')}
                          className={`p-1 rounded ${
                            previewDevice === 'desktop' ? 'bg-white/[0.1] text-white' : 'text-zinc-500 hover:text-zinc-300'
                          }`}
                          title="Desktop View"
                        >
                          <Monitor className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewDevice('mobile')}
                          className={`p-1 rounded ${
                            previewDevice === 'mobile' ? 'bg-white/[0.1] text-white' : 'text-zinc-500 hover:text-zinc-300'
                          }`}
                          title="Mobile View"
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Email Card Frame */}
                    <div
                      className={`mx-auto bg-[#f8fafc] text-zinc-900 rounded-2xl border border-white/[0.1] shadow-xl overflow-hidden transition-all duration-300 ${
                        previewDevice === 'mobile' ? 'max-w-[320px]' : 'w-full'
                      }`}
                    >
                      {/* Email Header Bar */}
                      <div className="p-4 bg-white border-b border-zinc-200 text-center">
                        <div className="font-bold text-sm tracking-tight text-zinc-900">{name || site.domain}</div>
                        <div className="text-[11px] text-zinc-500">{site.domain}</div>
                      </div>

                      {/* Email Body Preview */}
                      <div className="p-6 text-center space-y-4">
                        <div className="w-10 h-10 mx-auto rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center font-bold text-lg">
                          ✓
                        </div>
                        <div>
                          <h5 className="font-bold text-sm text-zinc-900">{previewSubject}</h5>
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
                        Delivered securely on behalf of {name || site.domain} via EntryWise
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-zinc-500 font-mono hidden sm:inline">
                Endpoint:
              </span>
              <button
                type="button"
                onClick={handleCopyEndpoint}
                className="text-[11px] font-mono text-zinc-400 hover:text-emerald-400 bg-white/[0.03] border border-white/[0.08] px-2.5 py-1 rounded-lg transition flex items-center gap-1.5"
              >
                <span>/f/{site.api_key.slice(0, 14)}...</span>
                {copiedEndpoint ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-zinc-500" />}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white transition text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition shadow-lg shadow-white/5"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : saveSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
