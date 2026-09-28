import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Download,
  Inbox,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type React from 'react';
import { useMemo, useState } from 'react';
import type { Submission } from '@/types';

interface SubmissionsTableProps {
  submissions: Submission[];
  total: number;
  currentStatus: string;
  onStatusChange: (status: string) => void;
  onSelectSubmission: (submission: Submission) => void;
  onUpdateStatus: (id: string, status: 'new' | 'read' | 'archived' | 'spam') => void;
  onDeleteSubmission: (id: string) => void;
  onExportCsv: () => void;
  isLoading: boolean;
  selectedSubmissionId?: string | null;
}

export const SubmissionsTable: React.FC<SubmissionsTableProps> = ({
  submissions,
  total,
  currentStatus,
  onStatusChange,
  onSelectSubmission,
  onUpdateStatus,
  onDeleteSubmission,
  onExportCsv,
  isLoading,
  selectedSubmissionId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Status Counts for Tabs & Stats
  const counts = useMemo(() => {
    let unreadCount = 0;
    let readCount = 0;
    let archivedCount = 0;
    let spamCount = 0;

    for (const sub of submissions) {
      if (sub.status === 'new') unreadCount++;
      else if (sub.status === 'read') readCount++;
      else if (sub.status === 'archived') archivedCount++;
      else if (sub.status === 'spam') spamCount++;
    }

    return {
      all: submissions.length,
      new: unreadCount,
      read: readCount,
      archived: archivedCount,
      spam: spamCount,
    };
  }, [submissions]);

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      const dataStr = JSON.stringify(sub.data).toLowerCase();
      const ipStr = (sub.ip_address || '').toLowerCase();
      return dataStr.includes(term) || ipStr.includes(term);
    });
  }, [submissions, searchTerm]);

  const getStatusBadge = (status: Submission['status']) => {
    switch (status) {
      case 'new':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            New
          </span>
        );
      case 'read':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
            Read
          </span>
        );
      case 'archived':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
            Archived
          </span>
        );
      case 'spam':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            Spam
          </span>
        );
    }
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. KPI Micro-Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl border border-white/[0.08] bg-[#0e1017] flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
              Total Inflow
            </div>
            <div className="text-xl font-bold text-white mt-0.5">{total || counts.all}</div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-400">
            <Inbox className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl border border-white/[0.08] bg-[#0e1017] flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">
              New Unread
            </div>
            <div className="text-xl font-bold text-emerald-400 mt-0.5">{counts.new}</div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl border border-white/[0.08] bg-[#0e1017] flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
              Turnstile Verified
            </div>
            <div className="text-xl font-bold text-white mt-0.5">{counts.all - counts.spam}</div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl border border-white/[0.08] bg-[#0e1017] flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-rose-400">
              Spam Blocked
            </div>
            <div className="text-xl font-bold text-rose-400 mt-0.5">{counts.spam}</div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* 2. Toolbar: Status Filter Pills, Search, Export */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        {/* Status Pills */}
        <div className="flex items-center bg-[#0d0f15] p-1 rounded-xl border border-white/[0.08] text-xs font-medium overflow-x-auto">
          {(
            [
              { id: 'all', label: 'All', count: counts.all },
              { id: 'new', label: 'New', count: counts.new },
              { id: 'read', label: 'Read', count: counts.read },
              { id: 'archived', label: 'Archived', count: counts.archived },
              { id: 'spam', label: 'Spam', count: counts.spam },
            ] as const
          ).map((st) => {
            const isActive = currentStatus === st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => onStatusChange(st.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                  isActive
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-white border border-transparent'
                }`}
              >
                <span>{st.label}</span>
                {st.count > 0 && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                      isActive
                        ? 'bg-emerald-500/25 text-emerald-200'
                        : 'bg-white/[0.06] text-zinc-400'
                    }`}
                  >
                    {st.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search & Export Actions */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search sender, email, fields..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0d0f15] border border-white/[0.08] rounded-xl pl-8 pr-8 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 transition font-sans"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-zinc-500 bg-white/[0.05] px-1 py-0.2 rounded border border-white/[0.06] pointer-events-none">
              /
            </span>
          </div>

          <button
            type="button"
            onClick={onExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.08] bg-[#0d0f15] hover:bg-white/[0.06] text-xs font-medium text-zinc-300 hover:text-white transition shrink-0"
            title="Export CSV (RFC 4180 format)"
          >
            <Download className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* 3. Submissions Table Card */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0e1017] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-[#090a0f] border-b border-white/[0.06] text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3 w-12">Status</th>
                <th className="px-4 py-3">Sender / Identity</th>
                <th className="px-4 py-3">Submission Summary</th>
                <th className="px-4 py-3 hidden md:table-cell">Client IP</th>
                <th className="px-4 py-3">Received</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center text-zinc-400">
                    <div className="inline-flex items-center gap-2.5">
                      <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      <span>Syncing submissions from Cloudflare edge D1...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center mx-auto text-zinc-500">
                      <ShieldCheck className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div className="text-sm text-zinc-200 font-semibold">
                      No submissions in this filter
                    </div>
                    <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                      Submissions to this form endpoint will automatically stream in here in
                      realtime.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((sub) => {
                  const isSelected = selectedSubmissionId === sub.id;
                  const senderName = String(
                    sub.data.name || sub.data.fullName || sub.data.author || 'Anonymous'
                  );
                  const senderEmail = sub.data.email
                    ? String(sub.data.email)
                    : sub.data.from
                      ? String(sub.data.from)
                      : '';
                  const rawMessage = sub.data.message || sub.data.body || sub.data.inquiry;
                  const messagePreview = rawMessage
                    ? typeof rawMessage === 'object'
                      ? JSON.stringify(rawMessage)
                      : String(rawMessage)
                    : JSON.stringify(sub.data);

                  return (
                    <tr
                      key={sub.id}
                      onClick={() => onSelectSubmission(sub)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectSubmission(sub);
                        }
                      }}
                      tabIndex={0}
                      className={`cursor-pointer transition focus:outline-none ${
                        isSelected
                          ? 'bg-emerald-500/[0.08] hover:bg-emerald-500/[0.12]'
                          : 'hover:bg-white/[0.03]'
                      }`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {isSelected && (
                            <span className="w-1 h-4 rounded-full bg-emerald-400 -ml-2" />
                          )}
                          {getStatusBadge(sub.status)}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-semibold text-white">{senderName}</div>
                        {senderEmail && (
                          <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                            {senderEmail}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-xs sm:max-w-md truncate">
                        <span className="text-zinc-300 font-normal">{messagePreview}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap hidden md:table-cell font-mono text-[11px] text-zinc-500">
                        {sub.ip_address || '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-zinc-400 font-mono text-[11px]">
                        {formatDate(sub.created_at)}
                      </td>
                      <td
                        className="px-4 py-3 whitespace-nowrap text-right"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-1 text-zinc-400">
                          {sub.status === 'new' && (
                            <button
                              type="button"
                              onClick={() => onUpdateStatus(sub.id, 'read')}
                              title="Mark Read"
                              className="p-1 hover:text-white hover:bg-white/[0.08] rounded transition"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400" />
                            </button>
                          )}
                          {sub.status !== 'archived' && (
                            <button
                              type="button"
                              onClick={() => onUpdateStatus(sub.id, 'archived')}
                              title="Archive"
                              className="p-1 hover:text-purple-400 hover:bg-white/[0.08] rounded transition"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {sub.status !== 'spam' && (
                            <button
                              type="button"
                              onClick={() => onUpdateStatus(sub.id, 'spam')}
                              title="Mark Spam"
                              className="p-1 hover:text-rose-400 hover:bg-white/[0.08] rounded transition"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm('Delete submission permanently?')) {
                                onDeleteSubmission(sub.id);
                              }
                            }}
                            title="Delete Permanently"
                            className="p-1 hover:text-rose-400 hover:bg-rose-500/10 rounded transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="px-5 py-3 border-t border-white/[0.06] bg-[#090a0f] flex items-center justify-between text-xs text-zinc-500 font-mono">
          <span>
            Showing {filteredSubmissions.length} of {submissions.length} submissions
          </span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Edge Encrypted &amp; Replicated
          </span>
        </div>
      </div>
    </div>
  );
};
