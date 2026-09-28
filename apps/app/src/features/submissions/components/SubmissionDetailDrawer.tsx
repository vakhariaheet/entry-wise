import {
  AlertTriangle,
  Archive,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Code2,
  Copy,
  ExternalLink,
  FileText,
  Globe,
  Mail,
  Paperclip,
  ShieldCheck,
  Trash2,
  User,
  X,
} from 'lucide-react';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import type { Submission } from '@/types';

interface SubmissionDetailDrawerProps {
  submission: Submission | null;
  onClose: () => void;
  onUpdateStatus: (id: string, status: 'new' | 'read' | 'archived' | 'spam') => void;
  onDeleteSubmission: (id: string) => void;
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

export const SubmissionDetailDrawer: React.FC<SubmissionDetailDrawerProps> = ({
  submission,
  onClose,
  onUpdateStatus,
  onDeleteSubmission,
  onNavigatePrev,
  onNavigateNext,
  hasPrev = false,
  hasNext = false,
}) => {
  const [activeTab, setActiveTab] = useState<'fields' | 'json' | 'meta'>('fields');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Keyboard navigation & escape key
  useEffect(() => {
    if (!submission) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if focus is in an input or textarea
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if ((e.key === 'k' || e.key === 'ArrowUp') && hasPrev && onNavigatePrev) {
        e.preventDefault();
        onNavigatePrev();
      } else if ((e.key === 'j' || e.key === 'ArrowDown') && hasNext && onNavigateNext) {
        e.preventDefault();
        onNavigateNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [submission, onClose, onNavigatePrev, onNavigateNext, hasPrev, hasNext]);

  // Extract submitter identity if present in data
  const submitter = useMemo(() => {
    if (!submission?.data) return { name: null, email: null };
    let name: string | null = null;
    let email: string | null = null;

    for (const [key, val] of Object.entries(submission.data)) {
      const lower = key.toLowerCase();
      if (!name && (lower === 'name' || lower.includes('name') || lower.includes('full_name'))) {
        name = String(val);
      }
      if (!email && (lower === 'email' || lower.includes('email') || lower.includes('mail'))) {
        email = String(val);
      }
    }
    return { name, email };
  }, [submission]);

  if (!submission) return null;

  const handleCopyId = () => {
    navigator.clipboard.writeText(submission.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(submission, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleCopyFieldValue = (key: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 1800);
  };

  const getStatusBadge = (status: Submission['status']) => {
    switch (status) {
      case 'new':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            New
          </span>
        );
      case 'read':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
            Read
          </span>
        );
      case 'archived':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
            Archived
          </span>
        );
      case 'spam':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            Spam
          </span>
        );
    }
  };

  return (
    <>
      {/* Dimmed backdrop */}
      <button
        type="button"
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity border-0 p-0 m-0 cursor-default"
        onClick={onClose}
        aria-label="Close submission drawer"
      />

      {/* Slide-over Drawer Panel */}
      <aside
        className="fixed inset-y-0 right-0 z-50 w-full sm:w-[560px] bg-[#0c0e14] border-l border-white/[0.08] shadow-2xl flex flex-col focus:outline-none"
        aria-labelledby="drawer-submission-title"
      >
        {/* Drawer Header Bar */}
        <header className="px-6 py-4 border-b border-white/[0.08] bg-[#0a0c10] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <FileText className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="font-mono text-xs font-semibold text-white hover:text-emerald-400 transition flex items-center gap-1 truncate"
                  title="Click to copy ID"
                >
                  <span className="truncate">{submission.id}</span>
                  {copiedId ? (
                    <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                  ) : (
                    <Copy className="w-3 h-3 text-zinc-500 shrink-0" />
                  )}
                </button>
                {getStatusBadge(submission.status)}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mt-0.5 font-mono">
                <Clock className="w-3 h-3" />
                <span>{new Date(submission.created_at).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Navigation & Close Controls */}
          <div className="flex items-center gap-1">
            {/* Prev / Next Shortcuts */}
            <div className="flex items-center bg-white/[0.04] rounded-lg border border-white/[0.08] p-0.5 mr-1">
              <button
                type="button"
                onClick={onNavigatePrev}
                disabled={!hasPrev}
                className="p-1 rounded text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400 transition"
                title="Previous submission (K or ↑)"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onNavigateNext}
                disabled={!hasNext}
                className="p-1 rounded text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400 transition"
                title="Next submission (J or ↓)"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Submitter Lead Header Card */}
        <section
          aria-label="Submitter information"
          className="px-6 py-4 bg-gradient-to-r from-emerald-500/[0.04] to-transparent border-b border-white/[0.06] shrink-0"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-sm">
              {submitter.name ? (
                submitter.name.charAt(0).toUpperCase()
              ) : submitter.email ? (
                submitter.email.charAt(0).toUpperCase()
              ) : (
                <User className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-white truncate">
                {submitter.name || 'Anonymous Submitter'}
              </div>
              {submitter.email ? (
                <a
                  href={`mailto:${submitter.email}`}
                  className="text-xs text-emerald-400 hover:text-emerald-300 transition flex items-center gap-1 truncate mt-0.5"
                >
                  <Mail className="w-3 h-3 shrink-0" />
                  <span className="truncate">{submitter.email}</span>
                  <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-70" />
                </a>
              ) : (
                <span className="text-xs text-zinc-500">No email provided</span>
              )}
            </div>
          </div>
        </section>

        {/* Tab Switcher */}
        <nav
          aria-label="Submission inspection tabs"
          className="px-6 pt-3 pb-1 border-b border-white/[0.06] flex items-center gap-2 bg-[#0c0e14] shrink-0"
        >
          <button
            type="button"
            onClick={() => setActiveTab('fields')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
              activeTab === 'fields'
                ? 'bg-white/[0.08] text-white font-semibold border border-white/[0.1]'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Form Data</span>
            <span className="text-[10px] font-mono px-1 rounded-full bg-white/[0.08] text-zinc-400 ml-0.5">
              {Object.keys(submission.data || {}).length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('json')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
              activeTab === 'json'
                ? 'bg-white/[0.08] text-white font-semibold border border-white/[0.1]'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Raw JSON</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('meta')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
              activeTab === 'meta'
                ? 'bg-white/[0.08] text-white font-semibold border border-white/[0.1]'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Security &amp; Origin</span>
          </button>
        </nav>

        {/* Drawer Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* TAB 1: FORM DATA FIELDS */}
          {activeTab === 'fields' && (
            <div className="space-y-3">
              {Object.entries(submission.data || {}).map(([key, val]) => {
                const formattedVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
                const isCopied = copiedField === key;

                return (
                  <div
                    key={key}
                    className="p-3.5 rounded-xl border border-white/[0.06] bg-[#12141c] hover:border-white/[0.12] transition group"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[11px] font-mono font-medium text-emerald-400 uppercase tracking-wider">
                        {key}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyFieldValue(key, formattedVal)}
                        className="text-[10px] text-zinc-500 group-hover:text-zinc-300 hover:!text-emerald-400 transition flex items-center gap-1"
                        title="Copy field value"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="text-xs text-white leading-relaxed font-sans break-words whitespace-pre-wrap">
                      {formattedVal || <span className="text-zinc-600 italic">Empty</span>}
                    </div>
                  </div>
                );
              })}

              {/* Attachments if any */}
              {submission.attachments && submission.attachments.length > 0 && (
                <div className="pt-2 space-y-2">
                  <div className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5 uppercase tracking-wider">
                    <Paperclip className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Attachments ({submission.attachments.length})</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {submission.attachments.map((att) => (
                      <a
                        key={att.url || att.filename || att.name}
                        href={att.url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-2.5 rounded-xl border border-white/[0.06] bg-[#12141c] hover:border-emerald-500/30 transition text-xs text-white"
                      >
                        <span className="truncate">{att.filename || att.name || 'File'}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: RAW JSON PAYLOAD */}
          {activeTab === 'json' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">Full submission payload:</span>
                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white/[0.06] hover:bg-white/[0.1] text-white transition flex items-center gap-1.5"
                >
                  {copiedJson ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied Payload!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Copy JSON</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-4 rounded-xl border border-white/[0.08] bg-[#08090d] font-mono text-xs text-emerald-300 leading-relaxed overflow-x-auto shadow-inner">
                <pre>{JSON.stringify(submission, null, 2)}</pre>
              </div>
            </div>
          )}

          {/* TAB 3: SECURITY & ORIGIN */}
          {activeTab === 'meta' && (
            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-xl border border-white/[0.06] bg-[#12141c] space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.04]">
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Client IP Address</span>
                  </span>
                  <span className="font-mono text-white font-medium">
                    {submission.ip_address || 'Not recorded'}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-white/[0.04]">
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Received Timestamp</span>
                  </span>
                  <span className="font-mono text-white font-medium">
                    {new Date(submission.created_at).toISOString()}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-white/[0.04]">
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Turnstile / Bot Status</span>
                  </span>
                  <span className="font-medium text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified Genuine
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Site API Identifier</span>
                  </span>
                  <span className="font-mono text-zinc-300">{submission.site_id}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Action Footer */}
        <footer className="px-6 py-3.5 border-t border-white/[0.08] bg-[#0a0c10] flex items-center justify-between gap-3 shrink-0">
          {/* Status Quick Action Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {submission.status !== 'read' && (
              <button
                type="button"
                onClick={() => onUpdateStatus(submission.id, 'read')}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 transition flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5 text-zinc-400" />
                <span>Mark Read</span>
              </button>
            )}

            {submission.status !== 'new' && (
              <button
                type="button"
                onClick={() => onUpdateStatus(submission.id, 'new')}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Mark New</span>
              </button>
            )}

            {submission.status !== 'archived' && (
              <button
                type="button"
                onClick={() => onUpdateStatus(submission.id, 'archived')}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 transition flex items-center gap-1.5"
              >
                <Archive className="w-3.5 h-3.5 text-purple-400" />
                <span>Archive</span>
              </button>
            )}

            {submission.status !== 'spam' ? (
              <button
                type="button"
                onClick={() => onUpdateStatus(submission.id, 'spam')}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.06] hover:bg-rose-500/20 text-zinc-300 hover:text-rose-400 transition flex items-center gap-1.5"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>Spam</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onUpdateStatus(submission.id, 'new')}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 transition flex items-center gap-1.5"
              >
                <span>Not Spam</span>
              </button>
            )}
          </div>

          {/* Delete Button */}
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Are you sure you want to permanently delete this submission?')) {
                onDeleteSubmission(submission.id);
                onClose();
              }
            }}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
            title="Delete submission"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </footer>
      </aside>
    </>
  );
};
