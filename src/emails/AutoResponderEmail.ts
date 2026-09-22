export interface AutoResponderEmailProps {
    siteDomain: string;
    companyName?: string;
    recipientName?: string;
    customBody?: string | null;
    customSubject?: string | null;
    submissionId?: string;
    timezone?: string;
}

export const renderAutoResponderEmail = ({
    siteDomain,
    companyName,
    recipientName,
    customBody,
    submissionId,
    timezone = 'UTC',
}: AutoResponderEmailProps): string => {
    const cleanDomain = siteDomain.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/.*$/, '');
    const displayName = companyName?.trim() || cleanDomain;
    const greeting = recipientName ? `Hi ${recipientName},` : 'Hello,';
    const messageBody = customBody || `Thank you for getting in touch with us at ${displayName}. We have received your message submitted via ${cleanDomain} and will get back to you shortly.`;

    let formattedDate = new Date().toUTCString();
    try {
        formattedDate = new Intl.DateTimeFormat('en-US', {
            dateStyle: 'medium',
            timeStyle: 'short',
            timeZone: timezone,
        }).format(new Date());
    } catch {
        formattedDate = new Date().toUTCString();
    }

    const returnUrl = `https://${cleanDomain}`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Submission Confirmed — ${displayName}</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #f4f6f8;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #1e293b;
            -webkit-font-smoothing: antialiased;
        }
        table {
            border-collapse: collapse;
        }
        .container-table {
            background-color: #f4f6f8;
            padding: 40px 16px;
        }
        .email-card {
            max-width: 580px;
            width: 100%;
            background-color: #ffffff;
            border-radius: 16px;
            border: 1px solid #e2e8f0;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            overflow: hidden;
        }
        .header-bar {
            height: 6px;
            background: linear-gradient(90deg, #5755fe 0%, #7c3aed 100%);
        }
        .header-section {
            padding: 32px 36px 20px 36px;
            text-align: left;
            border-bottom: 1px solid #f1f5f9;
        }
        .company-badge {
            display: inline-block;
            background-color: #f1f5f9;
            border: 1px solid #e2e8f0;
            border-radius: 9999px;
            padding: 4px 12px;
            font-size: 13px;
            font-weight: 600;
            color: #475569;
            margin-bottom: 12px;
        }
        .header-title {
            margin: 0;
            font-size: 22px;
            font-weight: 700;
            color: #0f172a;
            line-height: 1.3;
        }
        .body-section {
            padding: 28px 36px;
            font-size: 15px;
            line-height: 1.6;
            color: #334155;
        }
        .receipt-box {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 16px 20px;
            margin: 24px 0;
        }
        .receipt-row {
            padding: 6px 0;
            font-size: 13px;
        }
        .receipt-label {
            color: #64748b;
            font-weight: 500;
        }
        .receipt-value {
            color: #0f172a;
            font-weight: 600;
            text-align: right;
        }
        .status-pill {
            display: inline-block;
            background-color: #ecfdf5;
            color: #059669;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #5755fe 0%, #7c3aed 100%);
            color: #ffffff !important;
            text-decoration: none;
            font-weight: 600;
            font-size: 14px;
            padding: 12px 24px;
            border-radius: 10px;
            margin-top: 8px;
        }
        .footer-section {
            background-color: #f8fafc;
            padding: 20px 36px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
            font-size: 12px;
            color: #94a3b8;
            line-height: 1.5;
        }
        .footer-section a {
            color: #64748b;
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <table cellpadding="0" cellspacing="0" border="0" width="100%" class="container-table">
        <tr>
            <td align="center">
                <table cellpadding="0" cellspacing="0" border="0" class="email-card">
                    <!-- Top Accent Color Bar -->
                    <tr>
                        <td class="header-bar"></td>
                    </tr>

                    <!-- Header -->
                    <tr>
                        <td class="header-section">
                            <div class="company-badge">
                                ${displayName}
                            </div>
                            <h1 class="header-title">
                                We Received Your Submission
                            </h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td class="body-section">
                            <p style="margin: 0 0 16px 0; font-weight: 600; color: #0f172a;">
                                ${greeting}
                            </p>
                            <p style="margin: 0 0 20px 0; color: #334155; line-height: 1.6;">
                                ${messageBody.replace(/\n/g, '<br/>')}
                            </p>

                            <!-- Submission Receipt Table -->
                            <table cellpadding="0" cellspacing="0" border="0" width="100%" class="receipt-box">
                                <tr class="receipt-row">
                                    <td class="receipt-label">Recipient:</td>
                                    <td class="receipt-value">${displayName}</td>
                                </tr>
                                <tr class="receipt-row">
                                    <td class="receipt-label">Website:</td>
                                    <td class="receipt-value">
                                        <a href="${returnUrl}" style="color: #5755fe; text-decoration: none;">${cleanDomain}</a>
                                    </td>
                                </tr>
                                <tr class="receipt-row">
                                    <td class="receipt-label">Status:</td>
                                    <td class="receipt-value">
                                        <span class="status-pill">✓ Delivered</span>
                                    </td>
                                </tr>
                                ${submissionId ? `
                                <tr class="receipt-row">
                                    <td class="receipt-label">Reference ID:</td>
                                    <td class="receipt-value" style="font-family: monospace; font-size: 12px; color: #475569;">
                                        ${submissionId}
                                    </td>
                                </tr>
                                ` : ''}
                                <tr class="receipt-row">
                                    <td class="receipt-label">Time:</td>
                                    <td class="receipt-value" style="color: #64748b; font-size: 12px;">
                                        ${formattedDate}
                                    </td>
                                </tr>
                            </table>

                            <!-- Return to Website Button -->
                            <table cellpadding="0" cellspacing="0" border="0" style="margin-top: 10px;">
                                <tr>
                                    <td>
                                        <a href="${returnUrl}" class="cta-button" target="_blank">
                                            Return to ${cleanDomain} &rarr;
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td class="footer-section">
                            <p style="margin: 0 0 4px 0;">
                                This automated confirmation was sent on behalf of <strong>${displayName}</strong> (${cleanDomain}).
                            </p>
                            <p style="margin: 0;">
                                Powered by <a href="https://entrywise.webbound.in" target="_blank">EntryWise</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`.trim();
};
