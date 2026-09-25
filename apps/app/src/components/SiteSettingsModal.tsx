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
} from 'lucide-react';
import { api } from '../services/api';

interface SiteSettingsModalProps {
  site: Site | null;
  initialTab?: TabType;
  onClose: () => void;
  onSiteUpdated: (updatedSite: Site) => void;
  onFieldsUpdated?: (fields: FormField[]) => void;
}

export type TabType = 'fields' | 'general' | 'notifications' | 'connectors' | 'template';

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
  const [snippetFormat, setSnippetFormat] = useState<'html' | 'react'>('html');

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

  // Fetch defined fields on mount
  useEffect(() => {
    const fetchFields = async () => {
      setIsLoadingFields(true);
      try {
        const fetched = await api.listFields(site.id);
        if (fetched.length > 0) {
          setFields(fetched);
        } else {
          // Provide default starter fields if none defined yet
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

  const handleAddField = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newFieldName.trim().replace(/\s+/g, '_');
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

  // Generate HTML or React code snippet matching the configured fields
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
    } else {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl rounded-2xl border border-white/[0.1] bg-[#121215] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#0c0c0e]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <span>{name || site.domain}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-white/[0.08] bg-white/[0.03] text-zinc-400">
                  {site.domain}
                </span>
              </h3>
              <p className="text-[11px] text-zinc-400">Manage form fields, endpoints, notifications, connectors, and email templates</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-white/[0.08] bg-[#0e0e11] px-6 gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('fields')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === 'fields'
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ListPlus className="w-3.5 h-3.5" />
            <span>Form Fields &amp; Schema</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === 'general'
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>General &amp; Security</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === 'notifications'
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Notification Routing</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('connectors')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === 'connectors'
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Webhook className="w-3.5 h-3.5" />
            <span>Connectors &amp; Webhooks</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('template')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === 'template'
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Template Studio</span>
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {errorMessage && (
            <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400">
              {errorMessage}
            </div>
          )}

          {/* TAB 1: Form Fields & Schema */}
          {activeTab === 'fields' && (
            <div className="space-y-6">
              {/* Form Friendly Name & Domain Header */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl border border-white/[0.08] bg-[#09090b]">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Form Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Contact Us Form"
                    className="w-full bg-[#121215] border border-white/[0.08] rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-zinc-500 transition"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">Display title shown in your dashboard and notification subjects.</p>
                </div>
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Associated Website Domain</label>
                  <input
                    type="text"
                    required
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    className="w-full bg-[#121215] border border-white/[0.08] rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-zinc-500 transition font-mono"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">Domain origin verified during incoming submissions.</p>
                </div>
              </div>

              {/* Fields Builder & Snippet Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Defined Fields List */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-zinc-200">Form Fields ({fields.length})</h4>
                      <p className="text-[11px] text-zinc-400">Define the input fields your form will collect.</p>
                    </div>

                    {/* Quick Presets */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          handleApplyPreset([
                            { name: 'name', type: 'text' },
                            { name: 'email', type: 'email' },
                            { name: 'message', type: 'text' },
                          ])
                        }
                        className="px-2 py-1 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] text-[10px] text-zinc-300 transition"
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
                        className="px-2 py-1 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] text-[10px] text-zinc-300 transition"
                      >
                        Lead Gen
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
                        className="px-2 py-1 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] text-[10px] text-zinc-300 transition"
                      >
                        Careers
                      </button>
                    </div>
                  </div>

                  {/* List of current fields */}
                  <div className="rounded-xl border border-white/[0.08] bg-[#09090b] divide-y divide-white/[0.04] overflow-hidden max-h-56 overflow-y-auto">
                    {isLoadingFields ? (
                      <div className="p-4 text-center text-zinc-500">
                        <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1" />
                        <span>Loading fields...</span>
                      </div>
                    ) : fields.length === 0 ? (
                      <div className="p-6 text-center text-zinc-500">
                        No fields defined yet. Add your first field below.
                      </div>
                    ) : (
                      fields.map((field, idx) => (
                        <div key={field.name + idx} className="p-3 flex items-center justify-between hover:bg-white/[0.02] transition">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono text-zinc-500 w-4">{idx + 1}.</span>
                            <span className="font-mono text-zinc-200 text-xs font-semibold">{field.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-white/[0.08] bg-white/[0.04] text-emerald-400 uppercase">
                              {field.type}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveField(field.name)}
                              className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition"
                              title="Delete field"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Field Inline Form */}
                  <div className="p-3 rounded-xl border border-white/[0.08] bg-[#09090b] space-y-2">
                    <div className="font-semibold text-zinc-300 text-[11px]">Add New Field</div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="field_name (e.g. phone, budget)"
                        value={newFieldName}
                        onChange={(e) => setNewFieldName(e.target.value)}
                        className="flex-1 bg-[#121215] border border-white/[0.08] rounded-xl px-3 py-2 text-zinc-200 font-mono text-xs focus:outline-none focus:border-zinc-500 transition"
                      />
                      <select
                        value={newFieldType}
                        onChange={(e) => setNewFieldType(e.target.value as FieldType)}
                        className="bg-[#121215] border border-white/[0.08] rounded-xl px-3 py-2 text-zinc-200 text-xs focus:outline-none focus:border-zinc-500 transition"
                      >
                        <option value="text">text</option>
                        <option value="email">email</option>
                        <option value="phone">phone</option>
                        <option value="url">url</option>
                        <option value="file">file (attachment)</option>
                      </select>
                      <button
                        type="button"
                        onClick={handleAddField}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right: Live Form Snippet Generator */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-zinc-200">Generated Form Code</h4>
                      <p className="text-[11px] text-zinc-400">Copy &amp; paste this snippet straight into your app.</p>
                    </div>
                    <div className="flex items-center gap-1 bg-[#09090b] p-0.5 rounded-lg border border-white/[0.08]">
                      <button
                        type="button"
                        onClick={() => setSnippetFormat('html')}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium transition ${
                          snippetFormat === 'html' ? 'bg-white/[0.1] text-white' : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        HTML Form
                      </button>
                      <button
                        type="button"
                        onClick={() => setSnippetFormat('react')}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium transition ${
                          snippetFormat === 'react' ? 'bg-white/[0.1] text-white' : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        React JSX
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <pre className="p-4 bg-[#09090b] rounded-xl border border-white/[0.08] text-[11px] text-zinc-300 font-mono overflow-x-auto max-h-72 leading-relaxed">
                      {generateSnippet()}
                    </pre>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(generateSnippet());
                        setCopiedFormSnippet(true);
                        setTimeout(() => setCopiedFormSnippet(false), 2000);
                      }}
                      className="absolute top-3 right-3 px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-white flex items-center gap-1.5 backdrop-blur-sm transition"
                    >
                      {copiedFormSnippet ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedFormSnippet ? 'Copied!' : 'Copy Code'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: General & Security */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              {/* Form Endpoint */}
              <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-2">
                <label className="block font-semibold text-emerald-400 uppercase tracking-wider text-[11px]">
                  Universal HTML Form Ingestion URL
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={endpointUrl}
                    className="w-full bg-[#09090b] border border-white/[0.08] rounded-xl px-3 py-2 font-mono text-zinc-200 text-xs focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopyEndpoint}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition whitespace-nowrap font-medium"
                  >
                    {copiedEndpoint ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedEndpoint ? 'Copied' : 'Copy URL'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Point any native HTML form: <code className="text-zinc-300 font-mono">&lt;form action="{endpointUrl}" method="POST"&gt;</code>. Works instantly without client-side JavaScript.
                </p>
              </div>

              {/* Form Friendly Name & Domain */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Form Friendly Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Lead Generation Form"
                    className="w-full bg-[#09090b] border border-white/[0.08] rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-zinc-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Primary Domain</label>
                  <input
                    type="text"
                    required
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    className="w-full bg-[#09090b] border border-white/[0.08] rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-zinc-500 transition font-mono"
                  />
                </div>
              </div>

              {/* API Key */}
              <div>
                <label className="block text-zinc-300 font-medium mb-1">Raw API Key</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={site.api_key}
                    className="w-full bg-[#09090b] border border-white/[0.08] rounded-xl px-3 py-2 font-mono text-zinc-300 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopyKey}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-white transition whitespace-nowrap"
                  >
                    {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey ? 'Copied' : 'Copy Key'}</span>
                  </button>
                </div>
              </div>

              {/* Allowed Origins */}
              <div>
                <label className="block text-zinc-300 font-medium mb-1">Allowed Origins / CORS Domains</label>
                <input
                  type="text"
                  placeholder="* or acme.com, staging.acme.com, localhost:3000"
                  value={allowedOrigins}
                  onChange={(e) => setAllowedOrigins(e.target.value)}
                  className="w-full bg-[#09090b] border border-white/[0.08] rounded-xl px-3 py-2 text-zinc-200 font-mono focus:outline-none focus:border-zinc-500 transition"
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  Leave empty to default to primary domain. Enter <code className="text-zinc-400 font-mono">*</code> to permit submissions from any domain or preview build.
                </p>
              </div>

              {/* Turnstile Anti-Bot Protection */}
              <div>
                <label className="block text-zinc-300 font-medium mb-1">Cloudflare Turnstile Secret Key</label>
                <input
                  type="password"
                  placeholder="0x4AAAAAA..."
                  value={turnstileSecretKey}
                  onChange={(e) => setTurnstileSecretKey(e.target.value)}
                  className="w-full bg-[#09090b] border border-white/[0.08] rounded-xl px-3 py-2 text-zinc-200 font-mono focus:outline-none focus:border-zinc-500 transition"
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  Optional. When configured, incoming submissions require a valid <code className="text-zinc-400 font-mono">cf-turnstile-response</code> token.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: Notification Routing */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-xl border border-white/[0.08] bg-[#09090b]">
                <div>
                  <h4 className="font-semibold text-zinc-200">Send Email Alerts on Form Submission</h4>
                  <p className="text-[11px] text-zinc-400">
                    Immediately notifies your designated team whenever someone completes your form.
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
                    <label className="block text-zinc-300 font-medium mb-1">Notification Recipient Emails</label>
                    <textarea
                      rows={3}
                      placeholder="team@acme.com, founder@acme.com, leads@marketing.com"
                      value={notificationEmails}
                      onChange={(e) => setNotificationEmails(e.target.value)}
                      className="w-full bg-[#09090b] border border-white/[0.08] rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-zinc-500 transition font-mono"
                    />
                    <p className="text-[11px] text-zinc-500 mt-1">
                      Separate multiple recipient emails with commas. If blank, notifications route to your primary account email.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0c0c0e] flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-semibold text-zinc-200 text-xs">Direct Submitter Reply-To Enabled</h5>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        When you click "Reply" to any submission alert in Gmail, Outlook, or Apple Mail, your response will automatically be addressed to the submitter's email.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Connectors */}
          {activeTab === 'connectors' && (
            <div className="space-y-6">
              {/* Google Sheets Connector */}
              <div className="p-4 rounded-xl border border-white/[0.08] bg-[#09090b] space-y-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <h4 className="font-semibold text-zinc-200">Google Sheets Auto-Append</h4>
                </div>
                <div>
                  <input
                    type="url"
                    placeholder="https://script.google.com/macros/s/.../exec or Zapier/Make URL"
                    value={googleSheetsUrl}
                    onChange={(e) => setGoogleSheetsUrl(e.target.value)}
                    className="w-full bg-[#121215] border border-white/[0.08] rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-zinc-500 transition font-mono text-xs"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Every submission is automatically forwarded and appended as a new row to your Google Sheet.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAppsScriptGuide(!showAppsScriptGuide)}
                  className="flex items-center gap-1.5 text-[11px] text-emerald-400 hover:text-emerald-300 font-medium"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>{showAppsScriptGuide ? 'Hide Google Apps Script template' : 'View free 30-second Google Apps Script setup'}</span>
                  {showAppsScriptGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                {showAppsScriptGuide && (
                  <div className="mt-2 p-3 rounded-xl border border-white/[0.06] bg-[#121215] space-y-2">
                    <p className="text-[11px] text-zinc-400">
                      1. Open your Google Sheet &rarr; Extensions &rarr; Apps Script.<br />
                      2. Paste the code below &rarr; Deploy &rarr; New Deployment &rarr; Web App (Access: Anyone).<br />
                      3. Copy the generated Web App URL and paste it above!
                    </p>
                    <div className="relative">
                      <pre className="p-3 bg-black/60 rounded-lg text-[10px] text-zinc-300 font-mono overflow-x-auto max-h-40">
                        {appsScriptCode}
                      </pre>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(appsScriptCode);
                          setCopiedScript(true);
                          setTimeout(() => setCopiedScript(false), 2000);
                        }}
                        className="absolute top-2 right-2 px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-[10px] text-white flex items-center gap-1"
                      >
                        {copiedScript ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedScript ? 'Copied' : 'Copy Script'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Slack Connector */}
              <div className="p-4 rounded-xl border border-white/[0.08] bg-[#09090b] space-y-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-amber-400" />
                  <h4 className="font-semibold text-zinc-200">Slack Notifications</h4>
                </div>
                <input
                  type="url"
                  placeholder="https://hooks.slack.com/services/..."
                  value={slackWebhookUrl}
                  onChange={(e) => setSlackWebhookUrl(e.target.value)}
                  className="w-full bg-[#121215] border border-white/[0.08] rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-zinc-500 transition font-mono text-xs"
                />
                <p className="text-[11px] text-zinc-500">
                  Sends formatted block notifications directly to your team's Slack channel.
                </p>
              </div>

              {/* Discord Connector */}
              <div className="p-4 rounded-xl border border-white/[0.08] bg-[#09090b] space-y-3">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-indigo-400" />
                  <h4 className="font-semibold text-zinc-200">Discord Notifications</h4>
                </div>
                <input
                  type="url"
                  placeholder="https://discord.com/api/webhooks/..."
                  value={discordWebhookUrl}
                  onChange={(e) => setDiscordWebhookUrl(e.target.value)}
                  className="w-full bg-[#121215] border border-white/[0.08] rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-zinc-500 transition font-mono text-xs"
                />
                <p className="text-[11px] text-zinc-500">
                  Dispatches emerald embed cards to your Discord channels.
                </p>
              </div>

              {/* Custom Webhook */}
              <div className="p-4 rounded-xl border border-white/[0.08] bg-[#09090b] space-y-3">
                <div className="flex items-center gap-2">
                  <Webhook className="w-4 h-4 text-emerald-400" />
                  <h4 className="font-semibold text-zinc-200">Custom Webhook (HMAC-SHA256 Signed)</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1">Webhook Endpoint URL</label>
                    <input
                      type="url"
                      placeholder="https://api.yourdomain.com/webhook"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      className="w-full bg-[#121215] border border-white/[0.08] rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-zinc-500 transition font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1">Secret Key (for HMAC Signature)</label>
                    <input
                      type="password"
                      placeholder="whsec_..."
                      value={webhookSecret}
                      onChange={(e) => setWebhookSecret(e.target.value)}
                      className="w-full bg-[#121215] border border-white/[0.08] rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-zinc-500 transition font-mono text-xs"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Delivered with header <code className="text-zinc-400 font-mono">X-EntryWise-Signature: sha256=...</code> with full SSRF guard and 5s timeout.
                </p>
              </div>
            </div>
          )}

          {/* TAB 5: Email Template Studio */}
          {activeTab === 'template' && (
            <div className="space-y-6">
              {/* Enable Toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-white/[0.08] bg-[#09090b]">
                <div>
                  <h4 className="font-semibold text-zinc-200">Enable Submitter Auto-Responder Email</h4>
                  <p className="text-[11px] text-zinc-400">
                    Automatically sends a confirmation email to the submitter right after they hit submit.
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
                      <label className="block text-zinc-400 text-[11px] mb-1.5 font-medium">
                        Click token to insert into template:
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {['{{name}}', '{{email}}', '{{company}}', '{{domain}}', '{{submission_id}}'].map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => handleInsertVariable(tag, 'body')}
                            className="px-2 py-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-mono transition"
                          >
                            + {tag}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Subject Line */}
                    <div>
                      <label className="block text-zinc-300 font-medium mb-1">Email Subject Line</label>
                      <input
                        type="text"
                        value={autoResponderSubject}
                        onChange={(e) => setAutoResponderSubject(e.target.value)}
                        placeholder="We received your message — {{domain}}"
                        className="w-full bg-[#09090b] border border-white/[0.08] rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-zinc-500 transition"
                      />
                    </div>

                    {/* Body Message */}
                    <div>
                      <label className="block text-zinc-300 font-medium mb-1">Confirmation Message Body</label>
                      <textarea
                        rows={6}
                        value={autoResponderBody}
                        onChange={(e) => setAutoResponderBody(e.target.value)}
                        placeholder="Thank you for getting in touch with us at {{company}}..."
                        className="w-full bg-[#09090b] border border-white/[0.08] rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-zinc-500 transition leading-relaxed"
                      />
                      <p className="text-[11px] text-zinc-500 mt-1">
                        HTML tags are safely encoded to protect against XSS. Line breaks are converted automatically.
                      </p>
                    </div>
                  </div>

                  {/* Right: Live Preview */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-zinc-300 font-medium">Live Email Preview</label>
                      <div className="flex items-center gap-1 bg-[#09090b] p-0.5 rounded-lg border border-white/[0.08]">
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

          {/* Footer Actions */}
          <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between">
            <span className="text-[11px] text-zinc-500 font-mono">
              Site ID: {site.id}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-black font-semibold hover:bg-zinc-200 transition"
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
