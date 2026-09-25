import React, { useState } from 'react';
import type { Site } from '../types';
import { X, Plus, Globe, Loader2 } from 'lucide-react';
import { api } from '../services/api';

interface CreateSiteModalProps {
  onClose: () => void;
  onSiteCreated: (site: Site) => void;
  activeCompanyId?: string | null;
}

export const CreateSiteModal: React.FC<CreateSiteModalProps> = ({ onClose, onSiteCreated, activeCompanyId }) => {
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [notificationEmails, setNotificationEmails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const cleanedDomain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
      const newSite = await api.createSite({
        domain: cleanedDomain,
        name: name.trim() || cleanedDomain,
        notification_emails: notificationEmails.trim() || undefined,
        company_id: activeCompanyId || undefined,
      });
      onSiteCreated(newSite);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to register form');
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
            <Globe className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Create New Form</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="block text-zinc-300 font-medium mb-1">Form Friendly Name</label>
            <input
              type="text"
              placeholder="e.g. Contact Us Form, Waitlist Page"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#09090b] border border-white/[0.08] rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-zinc-500 transition"
            />
          </div>

          <div>
            <label className="block text-zinc-300 font-medium mb-1">Primary Website Domain</label>
            <input
              type="text"
              required
              placeholder="acme.com or staging.example.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full bg-[#09090b] border border-white/[0.08] rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-zinc-500 transition font-mono"
            />
            <p className="text-[11px] text-zinc-500 mt-1">
              Used for domain origin verification and spam prevention. Localhost is allowed by default.
            </p>
          </div>

          <div>
            <label className="block text-zinc-300 font-medium mb-1">Notification Recipient Emails (Optional)</label>
            <input
              type="text"
              placeholder="team@acme.com, alerts@acme.com"
              value={notificationEmails}
              onChange={(e) => setNotificationEmails(e.target.value)}
              className="w-full bg-[#09090b] border border-white/[0.08] rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-zinc-500 transition"
            />
            <p className="text-[11px] text-zinc-500 mt-1">
              Separate multiple recipients with commas. If left empty, notifications default to your account email.
            </p>
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
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-black font-semibold hover:bg-zinc-200 transition"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Form</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
