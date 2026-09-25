import {
  AlertCircle,
  ArrowRight,
  Check,
  Code2,
  Loader2,
  Plus,
  Save,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import React, { useState } from 'react';
import { api } from '@/lib';
import type { FieldType, FormField, Site } from '@/types';

interface SchemaFieldsViewProps {
  site: Site;
  fields: FormField[];
  onFieldsUpdated: (fields: FormField[]) => void;
  onSiteUpdated: (site: Site) => void;
  onNavigateToEmbed: () => void;
}

export const SchemaFieldsView: React.FC<SchemaFieldsViewProps> = ({
  site,
  fields,
  onFieldsUpdated,
  onSiteUpdated,
  onNavigateToEmbed,
}) => {
  const [localFields, setLocalFields] = useState<FormField[]>(fields);
  const [name, setName] = useState(site.name || '');
  const [domain, setDomain] = useState(site.domain || '');
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<FieldType>('text');

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync if props update
  React.useEffect(() => {
    setLocalFields(fields);
  }, [fields]);

  React.useEffect(() => {
    setName(site.name || '');
    setDomain(site.domain || '');
  }, [site]);

  const handleAddField = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newFieldName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/^_+|_+$/g, '');

    if (!cleanName) return;

    if (localFields.some((f) => f.name.toLowerCase() === cleanName.toLowerCase())) {
      setErrorMessage(`Field with name '${cleanName}' already exists.`);
      return;
    }

    setLocalFields([...localFields, { name: cleanName, type: newFieldType }]);
    setNewFieldName('');
    setErrorMessage(null);
  };

  const handleRemoveField = (fieldName: string) => {
    setLocalFields(localFields.filter((f) => f.name !== fieldName));
  };

  const handleApplyPreset = (presetFields: Array<{ name: string; type: FieldType }>) => {
    setLocalFields(presetFields);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);

    try {
      // 1. Update site details
      const updatedSite = await api.updateSite(site.id, {
        name: name.trim() || domain,
        domain: domain.trim(),
      });

      // 2. Persist fields schema
      const updatedFields = await api.replaceFields(
        site.id,
        localFields.map((f) => ({ name: f.name, type: f.type }))
      );

      onFieldsUpdated(updatedFields);
      onSiteUpdated(updatedSite);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err: any) {
      console.error('Failed to update form schema:', err);
      setErrorMessage(err.message || 'Failed to update form schema');
    } finally {
      setIsSaving(false);
    }
  };

  const getFieldTypeBadgeColor = (type: FieldType) => {
    switch (type) {
      case 'email':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'phone':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'url':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'file':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-300 border-zinc-500/20';
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner / Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-emerald-400" />
            <span>Form Schema &amp; Fields</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Define and structure the expected inputs for{' '}
            <span className="text-zinc-200 font-mono font-medium">{site.domain}</span>. Incoming
            submissions are mapped to this schema.
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
              <span>Save Schema</span>
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

      {/* Form Profile Details */}
      <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#121318] grid grid-cols-1 md:grid-cols-2 gap-5 shadow-lg">
        <div>
          <label className="block text-xs font-semibold text-zinc-200 mb-1.5">
            Form Friendly Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Contact Us Form"
            className="w-full bg-[#0a0a0d] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/40 transition"
          />
          <p className="text-[11px] text-zinc-500 mt-1.5">
            Display name visible in your dashboard, email subjects, and alerts.
          </p>
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
            className="w-full bg-[#0a0a0d] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-zinc-100 font-mono placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/40 transition"
          />
          <p className="text-[11px] text-zinc-500 mt-1.5">
            Origin domain verified during form submission ingestion.
          </p>
        </div>
      </div>

      {/* Fields Definition Card */}
      <div className="p-6 rounded-2xl border border-white/[0.08] bg-[#121318] space-y-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.06]">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <span>Schema Field Definitions</span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-white/[0.06] text-zinc-300 border border-white/[0.08]">
                {localFields.length} {localFields.length === 1 ? 'field' : 'fields'}
              </span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              These fields map to form inputs and are automatically populated in CSV exports and
              webhook payloads.
            </p>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-zinc-500 mr-1 font-mono">Quick Presets:</span>
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

        {/* Fields List */}
        <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0d] divide-y divide-white/[0.04] overflow-hidden">
          {localFields.length === 0 ? (
            <div className="p-8 text-center space-y-1.5">
              <div className="text-sm font-semibold text-zinc-300">No fields defined yet</div>
              <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
                This form operates in dynamic schema mode (accepts all submitted JSON keys). Add
                fields below to specify standard inputs and generate code snippets.
              </p>
            </div>
          ) : (
            localFields.map((field, idx) => (
              <div
                key={field.name + idx}
                className="px-4 py-3 flex items-center justify-between hover:bg-white/[0.02] transition group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-zinc-500 w-6">#{idx + 1}</span>
                  <span className="font-mono text-sm font-semibold text-zinc-100">
                    {field.name}
                  </span>
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

        {/* Add Field Inline Bar */}
        <form
          onSubmit={handleAddField}
          className="p-4 rounded-xl border border-white/[0.08] bg-[#0c0d10] space-y-3"
        >
          <div className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Add Custom Field</span>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Field name (e.g. phone_number, company_size, budget)"
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
                className="w-full bg-[#070709] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-zinc-100 font-mono placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/40 transition"
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
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-zinc-200 transition flex items-center justify-center gap-1.5 whitespace-nowrap shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Field</span>
            </button>
          </div>
        </form>

        {/* Integration Callout */}
        <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-zinc-200">
                Ready to embed this form into your website?
              </div>
              <div className="text-[11px] text-zinc-400">
                Generated HTML, React, and cURL snippets automatically match these fields.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onNavigateToEmbed}
            className="px-4 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-semibold text-emerald-300 transition flex items-center gap-1.5 whitespace-nowrap self-start sm:self-auto"
          >
            <span>View Integration Code</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
