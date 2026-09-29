import {
  AlertCircle,
  Check,
  CheckCircle2,
  Database,
  FileSpreadsheet,
  Loader2,
  Mail,
  Play,
  RotateCcw,
  Webhook,
  X,
  Zap,
} from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { api } from '@/lib';
import type { Site, Submission } from '@/types';

interface PipelineTestModalProps {
  site: Site;
  isOpen: boolean;
  onClose: () => void;
  onTestCompleted?: (submission: Submission) => void;
}

export const PipelineTestModal: React.FC<PipelineTestModalProps> = ({
  site,
  isOpen,
  onClose,
  onTestCompleted,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [dispatchConnectors, setDispatchConnectors] = useState(true);
  const [name, setName] = useState('Alex Rivera');
  const [email, setEmail] = useState('alex.rivera@example.com');
  const [company, setCompany] = useState('Acme Innovations');
  const [message, setMessage] = useState(
    'Testing the EntryWise pipeline! Verifying edge persistence, email notifications, and webhook delivery.'
  );

  const [testResult, setTestResult] = useState<{
    success: boolean;
    submission_id: string;
    latency_ms: number;
    dispatched: boolean;
    pipeline: Record<string, any>;
  } | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRunTest = async () => {
    setIsRunning(true);
    setErrorMessage(null);

    try {
      const payload = {
        fields: {
          name: name.trim() || 'Alex Rivera',
          email: email.trim() || 'alex.rivera@example.com',
          company: company.trim() || 'Acme Innovations',
          message: message.trim() || 'Testing EntryWise Pipeline',
          source: 'Pipeline Smoke Test',
        },
        dispatch_connectors: dispatchConnectors,
      };

      const result = await api.testSubmission(site.id, payload);
      setTestResult(result);

      if (onTestCompleted) {
        onTestCompleted({
          id: result.submission_id,
          site_id: site.id,
          data: payload.fields,
          status: 'new',
          is_test: 1,
          ip_address: '127.0.0.1',
          created_at: new Date().toISOString(),
        });
      }
    } catch (err: unknown) {
      console.error('Failed to run pipeline test:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Pipeline test failed');
    } finally {
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    setTestResult(null);
    setErrorMessage(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-[#0e1017] border border-white/[0.08] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-white/[0.08] flex items-center justify-between shrink-0 bg-[#0a0c10]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Pipeline Diagnostic &amp; Smoke Test</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                  Sandbox
                </span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Simulate an end-to-end submission to verify edge persistence, emails, and webhooks.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-2 rounded-xl hover:bg-white/[0.06] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {errorMessage && (
            <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {!testResult ? (
            /* Configure & Launch Screen */
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-white/[0.06] bg-[#0a0c10] space-y-3">
                <span className="text-xs font-semibold text-zinc-300 block">
                  Simulated Lead Payload
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="test-lead-name"
                      className="block text-[11px] font-medium text-zinc-400 mb-1"
                    >
                      Submitter Name
                    </label>
                    <input
                      id="test-lead-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-[#12141c] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="test-lead-email"
                      className="block text-[11px] font-medium text-zinc-400 mb-1"
                    >
                      Submitter Email
                    </label>
                    <input
                      id="test-lead-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#12141c] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="test-lead-company"
                    className="block text-[11px] font-medium text-zinc-400 mb-1"
                  >
                    Company Name
                  </label>
                  <input
                    id="test-lead-company"
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full bg-[#12141c] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div>
                  <label
                    htmlFor="test-lead-message"
                    className="block text-[11px] font-medium text-zinc-400 mb-1"
                  >
                    Inquiry Message
                  </label>
                  <textarea
                    id="test-lead-message"
                    rows={2}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full bg-[#12141c] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>

              {/* Delivery Option */}
              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-white/[0.06] bg-[#0a0c10] cursor-pointer hover:border-white/[0.1] transition">
                <input
                  type="checkbox"
                  checked={dispatchConnectors}
                  onChange={(e) => setDispatchConnectors(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500 accent-emerald-500 w-4 h-4 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-semibold text-zinc-200">
                    Fan out to external integrations
                  </span>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Dispatches real notification emails, Google Sheets rows, Slack/Discord alerts,
                    and webhooks.
                  </p>
                </div>
              </label>
            </div>
          ) : (
            /* Diagnostic Results Report */
            <div className="space-y-4">
              {/* Latency & Status Header Banner */}
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.08] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <div>
                    <span className="text-xs font-bold text-white">Pipeline Test Succeeded!</span>
                    <p className="text-[11px] text-emerald-300">
                      ID: <span className="font-mono">{testResult.submission_id}</span>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-emerald-400/80 font-mono">
                    Edge Commit
                  </span>
                  <div className="text-sm font-bold font-mono text-emerald-400">
                    {testResult.latency_ms}ms
                  </div>
                </div>
              </div>

              {/* Diagnostic Checklist */}
              <div className="space-y-2">
                {/* 1. Edge DB */}
                <div className="p-3.5 rounded-xl border border-white/[0.06] bg-[#0a0c10] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Database className="w-4 h-4 text-emerald-400" />
                    <div>
                      <span className="text-xs font-semibold text-white">
                        Cloudflare D1 SQLite Persistence
                      </span>
                      <p className="text-[11px] text-zinc-400">
                        Committed to database storage at the edge.
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-medium text-emerald-400 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    Verified
                  </span>
                </div>

                {/* 2. Email Notification */}
                <div className="p-3.5 rounded-xl border border-white/[0.06] bg-[#0a0c10] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-emerald-400" />
                    <div>
                      <span className="text-xs font-semibold text-white">
                        Team Email Notification
                      </span>
                      <p className="text-[11px] text-zinc-400 truncate max-w-xs sm:max-w-md">
                        {testResult.pipeline.email_notification.enabled
                          ? `Routed to ${testResult.pipeline.email_notification.recipient}`
                          : 'Email notifications disabled for this form'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-medium text-emerald-400 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    {testResult.pipeline.email_notification.enabled ? 'Dispatched' : 'Skipped'}
                  </span>
                </div>

                {/* 3. Google Sheets */}
                <div className="p-3.5 rounded-xl border border-white/[0.06] bg-[#0a0c10] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <div>
                      <span className="text-xs font-semibold text-white">Google Sheets Sync</span>
                      <p className="text-[11px] text-zinc-400">
                        {testResult.pipeline.google_sheets.configured
                          ? 'Appended new row via Apps Script connector'
                          : 'Not configured'}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-[11px] font-mono font-medium flex items-center gap-1 ${
                      testResult.pipeline.google_sheets.configured
                        ? 'text-emerald-400'
                        : 'text-zinc-500'
                    }`}
                  >
                    {testResult.pipeline.google_sheets.configured ? 'Dispatched' : 'Inactive'}
                  </span>
                </div>

                {/* 4. Multi-Webhooks */}
                <div className="p-3.5 rounded-xl border border-white/[0.06] bg-[#0a0c10] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Webhook className="w-4 h-4 text-emerald-400" />
                    <div>
                      <span className="text-xs font-semibold text-white">
                        External Webhooks ({testResult.pipeline.webhooks?.length || 0})
                      </span>
                      <p className="text-[11px] text-zinc-400">
                        {testResult.pipeline.webhooks?.length
                          ? `Signed HMAC-SHA256 payload sent to ${testResult.pipeline.webhooks.length} endpoints`
                          : 'No active webhooks configured'}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-[11px] font-mono font-medium flex items-center gap-1 ${
                      testResult.pipeline.webhooks?.length ? 'text-emerald-400' : 'text-zinc-500'
                    }`}
                  >
                    {testResult.pipeline.webhooks?.length ? 'Dispatched' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/[0.08] bg-[#0a0c10] flex items-center justify-between shrink-0">
          {!testResult ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRunTest}
                disabled={isRunning}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition shadow-lg shadow-white/5 disabled:opacity-50 cursor-pointer"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    <span>Executing Pipeline...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 text-black fill-black" />
                    <span>Run Pipeline Diagnostic</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.06] transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Test Again</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs transition cursor-pointer"
              >
                Done / View in Table
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
