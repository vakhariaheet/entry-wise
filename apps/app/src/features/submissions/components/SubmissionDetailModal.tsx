import {
  AlertTriangle,
  Archive,
  Check,
  CheckCircle2,
  Copy,
  Paperclip,
  Trash2,
  X,
} from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import type { Submission } from '@/types';

interface SubmissionDetailModalProps {
  submission: Submission | null;
  onClose: () => void;
  onUpdateStatus: (id: string, status: 'new' | 'read' | 'archived' | 'spam') => void;
  onDeleteSubmission: (id: string) => void;
}

export const SubmissionDetailModal: React.FC<SubmissionDetailModalProps> = ({
  submission,
  onClose,
  onUpdateStatus,
  onDeleteSubmission,
}) => {
  const [copiedJson, setCopiedJson] = useState(false);

  if (!submission) return null;

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(submission, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl border border-white/[0.1] bg-[#121215] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#0c0c0e]">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-zinc-500">Submission ID:</span>
            <span className="text-xs font-mono text-white font-semibold">{submission.id}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Meta stats bar */}
          <div className="grid grid-cols-3 gap-3 p-3 rounded-xl border border-white/[0.06] bg-[#09090b] text-xs">
            <div>
              <div className="text-[10px] uppercase font-semibold text-zinc-500">Status</div>
              <div className="capitalize font-medium text-emerald-400 mt-0.5">
                {submission.status}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-semibold text-zinc-500">Client IP</div>
              <div className="font-mono text-zinc-300 mt-0.5">
                {submission.ip_address || 'Unavailable'}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-semibold text-zinc-500">Timestamp</div>
              <div className="font-mono text-zinc-300 mt-0.5">
                {new Date(submission.created_at).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Form Fields Key-Values */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Captured Payload
            </h4>
            <div className="rounded-xl border border-white/[0.06] bg-[#09090b] divide-y divide-white/[0.04] text-xs">
              {Object.entries(submission.data).map(([key, val]) => (
                <div
                  key={key}
                  className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-start justify-between gap-2"
                >
                  <span className="font-mono text-zinc-400 font-medium sm:w-1/3 truncate">
                    {key}
                  </span>
                  <span className="text-white sm:w-2/3 break-words font-sans">
                    {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Attachments (if any) */}
          {submission.attachments && submission.attachments.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Attachments
              </h4>
              <div className="space-y-2">
                {submission.attachments.map((att, idx) => (
                  <a
                    key={idx}
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-xl border border-white/[0.08] bg-[#09090b] hover:border-white/[0.2] transition text-xs group"
                  >
                    <div className="flex items-center gap-2 text-zinc-300 group-hover:text-white truncate">
                      <Paperclip className="w-3.5 h-3.5 text-zinc-500" />
                      <span className="truncate">
                        {att.name || att.filename || `Attachment ${idx + 1}`}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-zinc-500">
                      {att.size ? `${(att.size / 1024).toFixed(1)} KB →` : 'Download →'}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Raw JSON View */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Raw JSON
              </h4>
              <button
                onClick={handleCopyJson}
                className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 hover:text-white transition"
              >
                {copiedJson ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>{copiedJson ? 'Copied' : 'Copy JSON'}</span>
              </button>
            </div>
            <pre className="p-4 rounded-xl border border-white/[0.06] bg-[#09090b] font-mono text-[11px] text-zinc-400 overflow-x-auto max-h-40">
              {JSON.stringify(submission, null, 2)}
            </pre>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3 border-t border-white/[0.08] bg-[#0c0c0e] flex items-center justify-between">
          <div className="flex items-center gap-2">
            {submission.status !== 'read' && (
              <button
                onClick={() => {
                  onUpdateStatus(submission.id, 'read');
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-white transition"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Mark Read</span>
              </button>
            )}
            {submission.status !== 'archived' && (
              <button
                onClick={() => {
                  onUpdateStatus(submission.id, 'archived');
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-purple-300 transition"
              >
                <Archive className="w-3.5 h-3.5 text-purple-400" />
                <span>Archive</span>
              </button>
            )}
            {submission.status !== 'spam' && (
              <button
                onClick={() => {
                  onUpdateStatus(submission.id, 'spam');
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-amber-300 transition"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Mark Spam</span>
              </button>
            )}
          </div>

          <button
            onClick={() => {
              onDeleteSubmission(submission.id);
              onClose();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
};
