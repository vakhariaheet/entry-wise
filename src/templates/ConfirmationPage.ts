export interface ConfirmationPageProps {
  companyName?: string;
  siteDomain: string;
  submissionId?: string;
  submittedAt?: string;
  returnUrl?: string;
}

export const renderConfirmationPage = ({
  companyName,
  siteDomain,
  submissionId,
  submittedAt,
  returnUrl,
}: ConfirmationPageProps): string => {
  const displayName = companyName?.trim() || siteDomain;
  const cleanDomain = siteDomain.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/.*$/, '');
  const targetReturnUrl = returnUrl || `https://${cleanDomain}`;
  const displayDate = submittedAt || new Date().toUTCString();

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Submission Confirmed — ${displayName}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-page: #f8fafc;
            --bg-card: #ffffff;
            --bg-receipt: #f1f5f9;
            --text-title: #0f172a;
            --text-body: #475569;
            --text-muted: #94a3b8;
            --border: #e2e8f0;
            --primary-start: #5755fe;
            --primary-end: #7c3aed;
            --brand-ring: rgba(87, 85, 254, 0.15);
            --success-bg: #ecfdf5;
            --success-border: #a7f3d0;
            --success-color: #059669;
            --success-glow: rgba(16, 185, 129, 0.25);
            --code-bg: #e2e8f0;
        }

        @media (prefers-color-scheme: dark) {
            :root {
                --bg-page: #0b0f19;
                --bg-card: #131b2e;
                --bg-receipt: #1e293b;
                --text-title: #f8fafc;
                --text-body: #cbd5e1;
                --text-muted: #64748b;
                --border: #334155;
                --primary-start: #6366f1;
                --primary-end: #8b5cf6;
                --brand-ring: rgba(99, 102, 241, 0.25);
                --success-bg: #064e3b;
                --success-border: #047857;
                --success-color: #34d399;
                --success-glow: rgba(52, 211, 153, 0.25);
                --code-bg: #0f172a;
            }
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: var(--bg-page);
            color: var(--text-body);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding: 24px 16px;
            -webkit-font-smoothing: antialiased;
        }

        .container {
            width: 100%;
            max-width: 520px;
        }

        .card {
            background-color: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 20px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);
            padding: 40px 32px;
            text-align: center;
            position: relative;
            overflow: hidden;
        }

        /* Top subtle gradient accent */
        .card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 5px;
            background: linear-gradient(90deg, var(--primary-start), var(--primary-end));
        }

        .icon-wrapper {
            margin: 0 auto 20px auto;
            width: 72px;
            height: 72px;
            border-radius: 50%;
            background-color: var(--success-bg);
            border: 1px solid var(--success-border);
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            box-shadow: 0 0 0 8px var(--success-glow);
            animation: pulse-ring 2s infinite cubic-bezier(0.4, 0, 0.6, 1);
        }

        @keyframes pulse-ring {
            0%, 100% {
                box-shadow: 0 0 0 6px var(--success-glow);
            }
            50% {
                box-shadow: 0 0 0 12px var(--success-glow);
            }
        }

        .icon-check {
            width: 36px;
            height: 36px;
            stroke: var(--success-color);
            stroke-width: 2.5;
            stroke-linecap: round;
            stroke-linejoin: round;
            fill: none;
        }

        h1 {
            color: var(--text-title);
            font-size: 24px;
            font-weight: 700;
            letter-spacing: -0.02em;
            margin-bottom: 8px;
        }

        .subtitle {
            font-size: 15px;
            line-height: 1.5;
            color: var(--text-body);
            margin-bottom: 24px;
        }

        .company-pill {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background-color: var(--bg-receipt);
            border: 1px solid var(--border);
            padding: 4px 12px;
            border-radius: 9999px;
            font-size: 14px;
            font-weight: 600;
            color: var(--text-title);
            margin-top: 6px;
        }

        .company-pill svg {
            width: 14px;
            height: 14px;
            color: var(--primary-start);
        }

        /* Receipt Box */
        .receipt-card {
            background-color: var(--bg-receipt);
            border: 1px solid var(--border);
            border-radius: 14px;
            padding: 16px 20px;
            margin-bottom: 24px;
            text-align: left;
            font-size: 13px;
        }

        .receipt-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px dashed var(--border);
        }

        .receipt-row:last-child {
            border-bottom: none;
            padding-bottom: 0;
        }

        .receipt-row:first-child {
            padding-top: 0;
        }

        .receipt-label {
            color: var(--text-muted);
            font-weight: 500;
        }

        .receipt-value {
            color: var(--text-title);
            font-weight: 600;
            text-align: right;
        }

        .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            background-color: var(--success-bg);
            color: var(--success-color);
            padding: 2px 8px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
        }

        .status-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background-color: var(--success-color);
        }

        .ref-code {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            background-color: var(--code-bg);
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 12px;
            cursor: pointer;
            user-select: all;
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }

        /* Actions */
        .actions {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .btn-primary {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            background: linear-gradient(135deg, var(--primary-start) 0%, var(--primary-end) 100%);
            color: #ffffff;
            font-weight: 600;
            font-size: 15px;
            padding: 13px 24px;
            border-radius: 12px;
            text-decoration: none;
            transition: all 0.2s ease;
            box-shadow: 0 4px 12px rgba(87, 85, 254, 0.25);
        }

        .btn-primary:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 16px rgba(87, 85, 254, 0.35);
        }

        .btn-primary svg {
            width: 16px;
            height: 16px;
            transition: transform 0.2s ease;
        }

        .btn-primary:hover svg {
            transform: translateX(-3px);
        }

        .btn-secondary {
            color: var(--text-muted);
            font-size: 13px;
            text-decoration: none;
            padding: 6px;
            transition: color 0.2s ease;
        }

        .btn-secondary:hover {
            color: var(--text-body);
        }

        /* Footer Branding */
        .footer {
            margin-top: 24px;
            text-align: center;
            font-size: 12px;
            color: var(--text-muted);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }

        .footer a {
            color: var(--text-muted);
            text-decoration: none;
            font-weight: 600;
            transition: color 0.2s;
        }

        .footer a:hover {
            color: var(--primary-start);
        }

        .shield-icon {
            width: 13px;
            height: 13px;
            display: inline-block;
            vertical-align: middle;
        }
    </style>
</head>
<body>
    <main class="container">
        <div class="card">
            <!-- Animated Check Icon -->
            <div class="icon-wrapper" aria-hidden="true">
                <svg class="icon-check" viewBox="0 0 24 24">
                    <path d="M20 6L9 17L4 12"></path>
                </svg>
            </div>

            <!-- Header -->
            <h1>Submission Received!</h1>
            <p class="subtitle">
                Your message has been sent successfully to<br>
                <span class="company-pill">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="2" y1="12" x2="22" y2="12"></line>
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                    </svg>
                    ${displayName}
                </span>
            </p>

            <!-- Structured Receipt -->
            <div class="receipt-card">
                <div class="receipt-row">
                    <span class="receipt-label">Recipient</span>
                    <span class="receipt-value">${displayName}</span>
                </div>
                <div class="receipt-row">
                    <span class="receipt-label">Destination Domain</span>
                    <span class="receipt-value">${cleanDomain}</span>
                </div>
                <div class="receipt-row">
                    <span class="receipt-label">Delivery Status</span>
                    <span class="receipt-value">
                        <span class="status-badge">
                            <span class="status-dot"></span> Delivered
                        </span>
                    </span>
                </div>
                ${
                  submissionId
                    ? `
                <div class="receipt-row">
                    <span class="receipt-label">Reference ID</span>
                    <span class="receipt-value">
                        <span class="ref-code" title="Click to copy" onclick="navigator.clipboard.writeText('${submissionId}')">
                            ${submissionId}
                        </span>
                    </span>
                </div>
                `
                    : ''
                }
                <div class="receipt-row">
                    <span class="receipt-label">Time</span>
                    <span class="receipt-value">${displayDate}</span>
                </div>
            </div>

            <!-- Action Buttons -->
            <div class="actions">
                <a href="${targetReturnUrl}" class="btn-primary">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                    Return to ${cleanDomain}
                </a>
                <a href="javascript:window.close()" class="btn-secondary">Close this window</a>
            </div>
        </div>

        <!-- Trust / Verification Footer -->
        <footer class="footer">
            <svg class="shield-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
            Secured & delivered via <a href="https://entrywise.webbound.in" target="_blank" rel="noopener">EntryWise</a>
        </footer>
    </main>
</body>
</html>`;
};
