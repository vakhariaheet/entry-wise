import React, { useState } from 'react';
import type { Submission } from '../types';
import { Search, Download, Trash2, CheckCircle2, Archive, AlertTriangle, ShieldCheck } from 'lucide-react';

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
}

export const SubmissionsTable: React.FC<SubmissionsTableProps> = ({
  submissions,
  currentStatus,
  onStatusChange,
  onSelectSubmission,
  onUpdateStatus,
  onDeleteSubmission,
  onExportCsv,
  isLoading,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSubmissions = submissions.filter((sub) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const dataStr = JSON.stringify(sub.data).toLowerCase();
    const ipStr = (sub.ip_address || '').toLowerCase();
    return dataStr.includes(term) || ipStr.includes(term);
  });

  const getStatusBadge = (status: Submission['status']) => {
    switch (status) {
      case 'new':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> New</span>;
      case 'read':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">Read</span>;
      case 'archived':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">Archived</span>;
      case 'spam':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">Spam</span>;
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
      {/* Toolbar: Filters, Search, Export */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex items-center bg-[#121215] p-1 rounded-xl border border-white/[0.08] text-xs font-medium">
          {(['all', 'new', 'read', 'archived', 'spam'] as const).map((st) => (
            <button
              key={st}
              onClick={() => onStatusChange(st)}
              className={`px-3 py-1.5 rounded-lg capitalize transition ${
                currentStatus === st
                  ? 'bg-zinc-800 text-white font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Search & Export */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search sender, email, content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#121215] border border-white/[0.08] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition"
            />
          </div>

          <button
            onClick={onExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.08] bg-[#121215] hover:bg-white/[0.05] text-xs font-medium text-zinc-300 hover:text-white transition"
            title="Export CSV (RFC 4180)"
          >
            <Download className="w-3.5 h-3.5 text-zinc-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* High-Density Table Card */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#121215] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-[#0c0c0e] border-b border-white/[0.06] text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3 w-10">Status</th>
                <th className="px-4 py-3">Sender / Identity</th>
                <th className="px-4 py-3">Submission Preview</th>
                <th className="px-4 py-3 hidden md:table-cell">IP &amp; Origin</th>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                    <div className="inline-flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Querying edge D1 submissions...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center space-y-3">
                    <div className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center mx-auto text-zinc-500">
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="text-zinc-300 font-medium">No submissions in this view</div>
                    <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                      Form submissions sent to this site will automatically appear here with spam scores and attachments.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((sub) => {
                  const senderName = sub.data.name || sub.data.fullName || sub.data.author || 'Anonymous';
                  const senderEmail = sub.data.email || sub.data.from || '';
                  const messagePreview = sub.data.message || sub.data.body || sub.data.inquiry || JSON.stringify(sub.data);

                  return (
                    <tr
                      key={sub.id}
                      onClick={() => onSelectSubmission(sub)}
                      className="hover:bg-white/[0.02] cursor-pointer transition"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        {getStatusBadge(sub.status)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-semibold text-white">{senderName}</div>
                        {senderEmail && <div className="text-[11px] text-zinc-400 font-mono">{senderEmail}</div>}
                      </td>
                      <td className="px-4 py-3 max-w-xs sm:max-w-md truncate">
                        <span className="text-zinc-300">{messagePreview}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap hidden md:table-cell font-mono text-[11px] text-zinc-500">
                        {sub.ip_address || '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-zinc-400 font-mono text-[11px]">
                        {formatDate(sub.created_at)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-1 text-zinc-400">
                          {sub.status === 'new' && (
                            <button
                              onClick={() => onUpdateStatus(sub.id, 'read')}
                              title="Mark Read"
                              className="p-1 hover:text-white hover:bg-white/[0.06] rounded transition"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {sub.status !== 'archived' && (
                            <button
                              onClick={() => onUpdateStatus(sub.id, 'archived')}
                              title="Archive"
                              className="p-1 hover:text-purple-400 hover:bg-white/[0.06] rounded transition"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {sub.status !== 'spam' && (
                            <button
                              onClick={() => onUpdateStatus(sub.id, 'spam')}
                              title="Mark Spam"
                              className="p-1 hover:text-amber-400 hover:bg-white/[0.06] rounded transition"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => onDeleteSubmission(sub.id)}
                            title="Delete Permanently"
                            className="p-1 hover:text-red-400 hover:bg-white/[0.06] rounded transition"
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
        <div className="px-4 py-3 border-t border-white/[0.06] bg-[#0c0c0e] flex items-center justify-between text-xs text-zinc-500 font-mono">
          <span>Showing {filteredSubmissions.length} of {submissions.length} submissions</span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Cloudflare D1 Replicated
          </span>
        </div>
      </div>
    </div>
  );
};
