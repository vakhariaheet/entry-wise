import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Code2,
  Copy,
  FileSpreadsheet,
  Loader2,
  Mail,
  MessageSquare,
  Radio,
  Save,
  Send,
  Settings,
  Share2,
  Sparkles,
  Webhook,
} from 'lucide-react';
import React, { useState } from 'react';
import { api } from '@/lib';
import type { Company, Site } from '@/types';

interface ConnectorsViewProps {
  site: Site;
  onSiteUpdated: (site: Site) => void;
  workspace?: Company | null;
  onConfigureEmailEngine?: () => void;
}

export const ConnectorsView: React.FC<ConnectorsViewProps> = ({
  site,
  onSiteUpdated,
  workspace,
  onConfigureEmailEngine,
}) => {
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState(site.google_sheets_url || '');
  const [slackWebhookUrl, setSlackWebhookUrl] = useState(site.slack_webhook_url || '');
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState(site.discord_webhook_url || '');
  const [webhookUrl, setWebhookUrl] = useState(site.webhook_url || '');
  const [webhookSecret, setWebhookSecret] = useState(site.webhook_secret || '');

  const [showAppsScriptGuide, setShowAppsScriptGuide] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Test event dispatch state
  const [testingTarget, setTestingTarget] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    target: string;
    success: boolean;
    message: string;
  } | null>(null);

  React.useEffect(() => {
    setGoogleSheetsUrl(site.google_sheets_url || '');
    setSlackWebhookUrl(site.slack_webhook_url || '');
    setDiscordWebhookUrl(site.discord_webhook_url || '');
    setWebhookUrl(site.webhook_url || '');
    setWebhookSecret(site.webhook_secret || '');
  }, [site]);

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

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const updated = await api.updateSite(site.id, {
        google_sheets_url: googleSheetsUrl.trim() || null,
        slack_webhook_url: slackWebhookUrl.trim() || null,
        discord_webhook_url: discordWebhookUrl.trim() || null,
        webhook_url: webhookUrl.trim() || null,
        webhook_secret: webhookSecret.trim() || null,
      });

      onSiteUpdated(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err: unknown) {
      console.error('Failed to update connectors:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update connectors');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTestWebhook = async (
    target: 'slack' | 'discord' | 'webhook' | 'sheets',
    url: string
  ) => {
    if (!url) return;
    setTestingTarget(target);
    setTestResult(null);

    const testPayload = {
      event: 'submission.test',
      timestamp: new Date().toISOString(),
      site_id: site.id,
      domain: site.domain,
      submission_id: `test_${Math.random().toString(36).substring(2, 8)}`,
      data: {
        name: 'Alex Taylor (Test)',
        email: 'alex.taylor@example.com',
        message: 'This is an instant connectivity test from EntryWise!',
      },
    };

    try {
      let body: string;
      if (target === 'discord') {
        body = JSON.stringify({
          content: `🧪 **EntryWise Connectivity Test** for \`${site.domain}\`\nReceived test signal successfully at ${new Date().toLocaleTimeString()}!`,
        });
      } else if (target === 'slack') {
        body = JSON.stringify({
          text: `🧪 *EntryWise Connectivity Test* for \`${site.domain}\`\nReceived test signal successfully at ${new Date().toLocaleTimeString()}!`,
        });
      } else {
        body = JSON.stringify(testPayload);
      }

      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        mode: 'no-cors',
      });

      setTestResult({
        target,
        success: true,
        message: 'Test event dispatched successfully!',
      });
    } catch (err: unknown) {
      setTestResult({
        target,
        success: false,
        message: err instanceof Error ? err.message : 'Failed to dispatch test event',
      });
    } finally {
      setTestingTarget(null);
      setTimeout(() => setTestResult(null), 3500);
    }
  };

  const provider = workspace?.email_provider || 'cloudflare';

  const activeCount = [
    true, // Email Delivery Engine
    Boolean(googleSheetsUrl),
    Boolean(slackWebhookUrl),
    Boolean(discordWebhookUrl),
    Boolean(webhookUrl),
  ].filter(Boolean).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Share2 className="w-5 h-5 text-emerald-400" />
            <span>Connectors &amp; Integrations</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {activeCount} Active
            </span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Automatically fan out incoming form submissions to your external databases, team chat
            channels, and custom webhooks.
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
              <Loader2 className="w-4 h-4 text-black animate-spin" />
              <span>Saving...</span>
            </>
          ) : saveSuccess ? (
            <>
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Saved Successfully!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4 text-black" />
              <span>Save Connectors</span>
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

      {/* Grid of Connectors */}
      <div className="grid grid-cols-1 gap-5">
        {/* 1. Email Delivery Engine */}
        <div className="p-6 rounded-2xl border border-white/[0.08] bg-[#0e1017] space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <span>Email Delivery Engine</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 font-semibold uppercase">
                    {provider}
                  </span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {provider === 'cloudflare'
                    ? 'Cloudflare Managed Email (Zero Config). Alerts and receipts are delivered from no-reply@entrywise.webbound.in.'
                    : `Custom ${provider.toUpperCase()} provider connected. Sending from ${workspace?.from_name || 'EntryWise'} <${workspace?.from_email || 'configured email'}>.`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active
              </span>
              <button
                type="button"
                onClick={onConfigureEmailEngine}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] text-xs font-medium text-white transition ml-2"
              >
                <Settings className="w-3.5 h-3.5 text-zinc-400" />
                <span>Configure Engine</span>
              </button>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-white/[0.06] bg-[#090a0f] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Want to deliver from your custom company domain via <strong>Resend</strong>,{' '}
                <strong>MailerSend</strong>, or <strong>SMTP2GO</strong>?
              </span>
            </div>
            <button
              type="button"
              onClick={onConfigureEmailEngine}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium whitespace-nowrap self-start sm:self-auto"
            >
              Switch Provider &rarr;
            </button>
          </div>
        </div>

        {/* 2. Google Sheets */}
        <div className="p-6 rounded-2xl border border-white/[0.08] bg-[#0e1017] space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Google Sheets Auto-Append</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Appends incoming form submissions as new spreadsheet rows in real time.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {googleSheetsUrl ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white/[0.04] text-zinc-500 border border-white/[0.08]">
                  Not Configured
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="sheets-url-input"
                className="block text-xs font-semibold text-zinc-300"
              >
                Google Apps Script Web App URL or Zapier / Make Webhook
              </label>
              {googleSheetsUrl && (
                <button
                  type="button"
                  onClick={() => handleSendTestWebhook('sheets', googleSheetsUrl)}
                  disabled={testingTarget === 'sheets'}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 transition flex items-center gap-1 font-medium disabled:opacity-50"
                >
                  {testingTarget === 'sheets' ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Send className="w-3 h-3" />
                  )}
                  <span>Send Test Event</span>
                </button>
              )}
            </div>

            <input
              id="sheets-url-input"
              type="url"
              placeholder="https://script.google.com/macros/s/.../exec"
              value={googleSheetsUrl}
              onChange={(e) => setGoogleSheetsUrl(e.target.value)}
              className="w-full bg-[#090a0f] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition font-mono"
            />
            {testResult?.target === 'sheets' && (
              <div
                className={`text-xs flex items-center gap-1.5 pt-1 ${
                  testResult.success ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowAppsScriptGuide(!showAppsScriptGuide)}
            className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium pt-1"
          >
            <Code2 className="w-4 h-4" />
            <span>
              {showAppsScriptGuide
                ? 'Hide Google Apps Script template'
                : 'View free 30-second Google Apps Script setup'}
            </span>
            {showAppsScriptGuide ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {showAppsScriptGuide && (
            <div className="p-4 rounded-xl border border-white/[0.06] bg-[#090a0f] space-y-3">
              <p className="text-xs text-zinc-400 leading-relaxed">
                1. Open your Google Sheet &rarr; Extensions &rarr; Apps Script.
                <br />
                2. Paste the script below &rarr; Deploy &rarr; New Deployment &rarr; Web App
                (Access: Anyone).
                <br />
                3. Copy the generated Web App URL and paste it into the field above!
              </p>
              <div className="relative">
                <pre className="p-4 bg-black/60 rounded-xl text-xs text-zinc-300 font-mono overflow-x-auto max-h-48 leading-relaxed">
                  {appsScriptCode}
                </pre>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(appsScriptCode);
                    setCopiedScript(true);
                    setTimeout(() => setCopiedScript(false), 2000);
                  }}
                  className="absolute top-2.5 right-2.5 px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-white flex items-center gap-1.5 transition"
                >
                  {copiedScript ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedScript ? 'Copied' : 'Copy Script'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 3. Slack Channel Webhook */}
        <div className="p-6 rounded-2xl border border-white/[0.08] bg-[#0e1017] space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Slack Channel Alerts</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Sends formatted block cards to your team's Slack channel upon submission.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {slackWebhookUrl ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white/[0.04] text-zinc-500 border border-white/[0.08]">
                  Not Configured
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="slack-url-input"
                className="block text-xs font-semibold text-zinc-300"
              >
                Slack Incoming Webhook URL
              </label>
              {slackWebhookUrl && (
                <button
                  type="button"
                  onClick={() => handleSendTestWebhook('slack', slackWebhookUrl)}
                  disabled={testingTarget === 'slack'}
                  className="text-[11px] text-amber-400 hover:text-amber-300 transition flex items-center gap-1 font-medium disabled:opacity-50"
                >
                  {testingTarget === 'slack' ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Send className="w-3 h-3" />
                  )}
                  <span>Send Test Message</span>
                </button>
              )}
            </div>

            <input
              id="slack-url-input"
              type="url"
              placeholder="https://hooks.slack.com/services/..."
              value={slackWebhookUrl}
              onChange={(e) => setSlackWebhookUrl(e.target.value)}
              className="w-full bg-[#090a0f] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-zinc-100 focus:outline-none focus:border-amber-500/50 transition font-mono"
            />
            {testResult?.target === 'slack' && (
              <div
                className={`text-xs flex items-center gap-1.5 pt-1 ${
                  testResult.success ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
            <p className="text-[11px] text-zinc-500">
              Create an incoming webhook in your Slack App Directory and paste the full webhook URL
              here.
            </p>
          </div>
        </div>

        {/* 4. Discord Channel Webhook */}
        <div className="p-6 rounded-2xl border border-white/[0.08] bg-[#0e1017] space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Discord Channel Webhook</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Dispatches emerald embed cards to your Discord channel.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {discordWebhookUrl ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white/[0.04] text-zinc-500 border border-white/[0.08]">
                  Not Configured
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="discord-url-input"
                className="block text-xs font-semibold text-zinc-300"
              >
                Discord Webhook URL
              </label>
              {discordWebhookUrl && (
                <button
                  type="button"
                  onClick={() => handleSendTestWebhook('discord', discordWebhookUrl)}
                  disabled={testingTarget === 'discord'}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 transition flex items-center gap-1 font-medium disabled:opacity-50"
                >
                  {testingTarget === 'discord' ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Send className="w-3 h-3" />
                  )}
                  <span>Send Test Alert</span>
                </button>
              )}
            </div>

            <input
              id="discord-url-input"
              type="url"
              placeholder="https://discord.com/api/webhooks/..."
              value={discordWebhookUrl}
              onChange={(e) => setDiscordWebhookUrl(e.target.value)}
              className="w-full bg-[#090a0f] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500/50 transition font-mono"
            />
            {testResult?.target === 'discord' && (
              <div
                className={`text-xs flex items-center gap-1.5 pt-1 ${
                  testResult.success ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
            <p className="text-[11px] text-zinc-500">
              In Discord: Server Settings &rarr; Integrations &rarr; Webhooks &rarr; Copy Webhook
              URL.
            </p>
          </div>
        </div>

        {/* 5. Custom Webhook with HMAC-SHA256 */}
        <div className="p-6 rounded-2xl border border-white/[0.08] bg-[#0e1017] space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                <Webhook className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Custom Webhook (HMAC-SHA256 Signed)
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Dispatches signed JSON payloads directly to your custom backend or microservice.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {webhookUrl ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white/[0.04] text-zinc-500 border border-white/[0.08]">
                  Not Configured
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="custom-webhook-url-input"
                  className="block text-zinc-300 text-xs font-semibold"
                >
                  Webhook Endpoint URL
                </label>
                {webhookUrl && (
                  <button
                    type="button"
                    onClick={() => handleSendTestWebhook('webhook', webhookUrl)}
                    disabled={testingTarget === 'webhook'}
                    className="text-[11px] text-teal-400 hover:text-teal-300 transition flex items-center gap-1 font-medium disabled:opacity-50"
                  >
                    {testingTarget === 'webhook' ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Send className="w-3 h-3" />
                    )}
                    <span>Send Ping</span>
                  </button>
                )}
              </div>
              <input
                id="custom-webhook-url-input"
                type="url"
                placeholder="https://api.yourdomain.com/webhooks/entrywise"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="w-full bg-[#090a0f] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-zinc-100 focus:outline-none focus:border-teal-500/50 transition font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="custom-webhook-secret-input"
                className="block text-zinc-300 text-xs font-semibold"
              >
                HMAC Signing Secret Key (Optional)
              </label>
              <input
                id="custom-webhook-secret-input"
                type="password"
                placeholder="whsec_..."
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                className="w-full bg-[#090a0f] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-zinc-100 focus:outline-none focus:border-teal-500/50 transition font-mono"
              />
            </div>
          </div>

          {testResult?.target === 'webhook' && (
            <div
              className={`text-xs flex items-center gap-1.5 pt-1 ${
                testResult.success ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          <p className="text-[11px] text-zinc-500">
            Delivered with header{' '}
            <code className="text-zinc-400 font-mono">X-EntryWise-Signature: sha256=...</code>,
            automated SSRF isolation, and 5-second timeout with automated Cloudflare Queue retries.
          </p>
        </div>
      </div>
    </div>
  );
};
