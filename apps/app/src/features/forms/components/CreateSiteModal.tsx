import {
  ChevronDown,
  ChevronUp,
  Globe,
  Loader2,
  Plus,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { api } from '@/lib';
import type { FieldType, Site } from '@/types';

interface CreateSiteModalProps {
  onClose: () => void;
  onSiteCreated: (site: Site) => void;
  activeCompanyId?: string | null;
}

export const CreateSiteModal: React.FC<CreateSiteModalProps> = ({
  onClose,
  onSiteCreated,
  activeCompanyId,
}) => {
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [notificationEmails, setNotificationEmails] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Form Fields State
  const [fields, setFields] = useState<Array<{ name: string; type: FieldType }>>([
    { name: 'name', type: 'text' },
    { name: 'email', type: 'email' },
    { name: 'message', type: 'text' },
  ]);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<FieldType>('text');
  const [fieldError, setFieldError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddField = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newFieldName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/^_+|_+$/g, '');

    if (!cleanName) {
      setFieldError('Please enter a valid field name');
      return;
    }

    if (fields.some((f) => f.name.toLowerCase() === cleanName.toLowerCase())) {
      setFieldError(`Field '${cleanName}' already exists.`);
      return;
    }

    setFields([...fields, { name: cleanName, type: newFieldType }]);
    setNewFieldName('');
    setFieldError(null);
  };

  const handleRemoveField = (fieldName: string) => {
    setFields(fields.filter((f) => f.name !== fieldName));
  };

  const handleApplyPreset = (presetFields: Array<{ name: string; type: FieldType }>) => {
    setFields(presetFields);
    setFieldError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const cleanedDomain = domain
        .replace(/^https?:\/\//, '')
        .replace(/\/.*$/, '')
        .trim();
      if (!cleanedDomain) {
        throw new Error(
          'Please enter a valid primary website domain (e.g. acme.com or localhost:3000)'
        );
      }

      // 1. Create site record
      const newSite = await api.createSite({
        domain: cleanedDomain,
        name: name.trim() || cleanedDomain,
        notification_emails: notificationEmails.trim() || undefined,
        company_id: activeCompanyId || undefined,
      });

      // 2. Persist initial form fields if any defined
      if (fields.length > 0) {
        try {
          await api.replaceFields(newSite.id, fields);
        } catch (fieldErr: unknown) {
          console.warn('Failed to save initial fields:', fieldErr);
        }
      }

      onSiteCreated(newSite);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to register form');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-2xl border border-white/[0.1] bg-[#121215] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#0c0c0e]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Create New Form</h3>
              <p className="text-[11px] text-zinc-400">
                Configure form identity and custom input fields
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {error && (
            <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400">
              {error}
            </div>
          )}

          {/* Section 1: Form Name & Domain */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="create-form-name-input"
                className="block text-zinc-300 font-medium mb-1"
              >
                Form Friendly Name
              </label>
              <input
                id="create-form-name-input"
                type="text"
                placeholder="e.g. Contact Us Form"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#09090b] border border-white/[0.08] rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-zinc-500 transition"
              />
              <p className="text-[10px] text-zinc-500 mt-1">
                Display name in dashboard and alerts.
              </p>
            </div>

            <div>
              <label
                htmlFor="create-form-domain-input"
                className="block text-zinc-300 font-medium mb-1"
              >
                Primary Website Domain <span className="text-emerald-400">*</span>
              </label>
              <input
                id="create-form-domain-input"
                type="text"
                required
                placeholder="acme.com or localhost:3000"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="w-full bg-[#09090b] border border-white/[0.08] rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-zinc-500 transition font-mono"
              />
              <p className="text-[10px] text-zinc-500 mt-1">Origin allowed to submit data.</p>
            </div>
          </div>

          {/* Section 2: Form Fields & Schema */}
          <div className="rounded-xl border border-white/[0.08] bg-[#0c0c0e] p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5 font-semibold text-zinc-200">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Form Fields &amp; Schema ({fields.length})</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Define the fields your form will capture and validate.
                </p>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-[10px] text-zinc-500 mr-1 font-mono">Presets:</span>
                <button
                  type="button"
                  onClick={() =>
                    handleApplyPreset([
                      { name: 'name', type: 'text' },
                      { name: 'email', type: 'email' },
                      { name: 'message', type: 'text' },
                    ])
                  }
                  className="px-2 py-0.5 rounded border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] text-[10px] text-zinc-300 transition"
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
                    ])
                  }
                  className="px-2 py-0.5 rounded border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] text-[10px] text-zinc-300 transition"
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
                  className="px-2 py-0.5 rounded border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] text-[10px] text-zinc-300 transition"
                >
                  Waitlist
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleApplyPreset([
                      { name: 'name', type: 'text' },
                      { name: 'email', type: 'email' },
                      { name: 'phone', type: 'phone' },
                      { name: 'resume', type: 'file' },
                      { name: 'portfolio', type: 'url' },
                    ])
                  }
                  className="px-2 py-0.5 rounded border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] text-[10px] text-zinc-300 transition"
                >
                  Careers
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset([])}
                  className="px-2 py-0.5 rounded border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] text-[10px] text-zinc-400 hover:text-red-400 transition"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Current Fields List */}
            <div className="rounded-lg border border-white/[0.06] bg-[#09090b] divide-y divide-white/[0.04] max-h-44 overflow-y-auto">
              {fields.length === 0 ? (
                <div className="p-4 text-center text-zinc-500 text-[11px]">
                  No fields defined. Form will accept all arbitrary incoming fields, or add fields
                  below.
                </div>
              ) : (
                fields.map((field, idx) => (
                  <div
                    key={field.name}
                    className="px-3 py-2 flex items-center justify-between hover:bg-white/[0.02] transition"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-zinc-500 w-4">{idx + 1}.</span>
                      <span className="font-mono text-zinc-200 text-xs font-semibold">
                        {field.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 uppercase">
                        {field.type}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveField(field.name)}
                        className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition"
                        title="Remove field"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add Field Row */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Field name (e.g. phone, company, budget)"
                  value={newFieldName}
                  onChange={(e) => {
                    setNewFieldName(e.target.value);
                    setFieldError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddField(e);
                    }
                  }}
                  className="flex-1 bg-[#09090b] border border-white/[0.08] rounded-xl px-3 py-1.5 text-zinc-200 font-mono text-xs focus:outline-none focus:border-zinc-500 transition"
                />
                <select
                  value={newFieldType}
                  onChange={(e) => setNewFieldType(e.target.value as FieldType)}
                  className="bg-[#09090b] border border-white/[0.08] rounded-xl px-2.5 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-zinc-500 transition font-mono"
                >
                  <option value="text">text</option>
                  <option value="email">email</option>
                  <option value="phone">phone</option>
                  <option value="url">url</option>
                  <option value="file">file</option>
                </select>
                <button
                  type="button"
                  onClick={handleAddField}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-white/[0.1] bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 hover:text-white transition font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
              {fieldError && <p className="text-[11px] text-red-400">{fieldError}</p>}
            </div>
          </div>

          {/* Section 3: Optional Settings Accordion */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 transition text-[11px]"
            >
              <span>{showAdvanced ? 'Hide' : 'Show'} Optional Notification Settings</span>
              {showAdvanced ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {showAdvanced && (
              <div className="mt-3 p-3 rounded-xl border border-white/[0.08] bg-[#09090b] space-y-2 animate-in fade-in duration-150">
                <label
                  htmlFor="create-form-notification-emails-input"
                  className="block text-zinc-300 font-medium"
                >
                  Notification Recipient Emails
                </label>
                <input
                  id="create-form-notification-emails-input"
                  type="text"
                  placeholder="team@acme.com, alerts@acme.com"
                  value={notificationEmails}
                  onChange={(e) => setNotificationEmails(e.target.value)}
                  className="w-full bg-[#121215] border border-white/[0.08] rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-zinc-500 transition"
                />
                <p className="text-[10px] text-zinc-500">
                  Comma-separated. If left empty, notifications default to your account email.
                </p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
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
                  <span>Creating Form...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Form &amp; Fields</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
