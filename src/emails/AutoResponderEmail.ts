import { escapeHtml } from '../utils/escapeHtml';

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
  timezone = 'UTC',
}: AutoResponderEmailProps): string => {
  const rawCleanDomain = siteDomain.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/.*$/, '');
  const cleanDomain = escapeHtml(rawCleanDomain);
  const displayName = escapeHtml(companyName?.trim() || rawCleanDomain);
  const greeting = recipientName ? `Hi ${escapeHtml(recipientName)},` : 'Hello,';

  // If a full custom HTML email template is provided by the Template Studio, render directly
  if (
    customBody &&
    (customBody.includes('<!DOCTYPE') ||
      customBody.includes('<html') ||
      customBody.includes('<table'))
  ) {
    return customBody;
  }

  const unescapedBody =
    customBody ||
    `Thank you for getting in touch with us at ${companyName?.trim() || rawCleanDomain}. We have received your message and our team will get back to you shortly.`;
  const messageBodySafe = escapeHtml(unescapedBody).replace(/\n/g, '<br/>');
  const returnUrl = `https://${encodeURIComponent(rawCleanDomain)}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>We Received Your Message — ${displayName}</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #f8fafc;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #1e293b;
            -webkit-font-smoothing: antialiased;
        }
        table {
            border-collapse: collapse;
        }
        .container-table {
            background-color: #f8fafc;
            padding: 56px 16px 40px 16px;
        }
        .email-card {
            max-width: 540px;
            width: 100%;
            background-color: #ffffff;
            border-radius: 16px;
            border: 1px solid #e2e8f0;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            overflow: hidden;
        }
        .header-section {
            padding: 44px 36px 24px 36px;
            text-align: center;
            border-bottom: 1px solid #f1f5f9;
        }
        .company-name {
            font-size: 20px;
            font-weight: 700;
            color: #0f172a;
            letter-spacing: -0.02em;
        }
        .company-domain {
            font-size: 13px;
            color: #64748b;
            margin-top: 4px;
        }
        .body-section {
            padding: 32px 36px;
            text-align: center;
        }
        .check-icon {
            width: 52px;
            height: 52px;
            margin: 0 auto 18px auto;
            border-radius: 50%;
            background-color: #ecfdf5;
            border: 1px solid #a7f3d0;
            line-height: 52px;
            font-size: 22px;
            color: #059669;
            font-weight: bold;
        }
        .headline {
            font-size: 21px;
            font-weight: 700;
            color: #0f172a;
            margin: 0 0 12px 0;
            letter-spacing: -0.01em;
        }
        .greeting {
            font-size: 15px;
            font-weight: 600;
            color: #334155;
            margin: 0 0 10px 0;
        }
        .message-text {
            font-size: 15px;
            line-height: 1.6;
            color: #475569;
            margin: 0 auto 32px auto;
            max-width: 440px;
        }
        .cta-button {
            display: inline-block;
            background-color: #0f172a;
            color: #ffffff !important;
            text-decoration: none;
            font-weight: 600;
            font-size: 14px;
            padding: 12px 24px;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
        }
        .footer-section {
            background-color: #f8fafc;
            padding: 20px 36px;
            text-align: center;
            border-top: 1px solid #f1f5f9;
            font-size: 12px;
            color: #94a3b8;
            line-height: 1.5;
        }
    </style>
</head>
<body>
    <table cellpadding="0" cellspacing="0" border="0" width="100%" class="container-table" style="background-color: #f8fafc; width: 100%;">
        <tr>
            <td align="center" style="padding: 56px 16px 40px 16px; background-color: #f8fafc;">
                <table cellpadding="0" cellspacing="0" border="0" class="email-card" style="max-width: 540px; width: 100%; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); overflow: hidden;">
                    <!-- Brand Top Header -->
                    <tr>
                        <td class="header-section" style="padding: 44px 36px 24px 36px; text-align: center; border-bottom: 1px solid #f1f5f9;">
                            <div class="company-name" style="font-size: 20px; font-weight: 700; color: #0f172a; letter-spacing: -0.02em;">${displayName}</div>
                            <div class="company-domain" style="font-size: 13px; color: #64748b; margin-top: 4px;">
                                <a href="${returnUrl}" style="color: #64748b; text-decoration: none;" target="_blank">${cleanDomain}</a>
                            </div>
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td class="body-section">
                            <!-- Soft Checkmark Icon -->
                            <div class="check-icon">✓</div>

                            <h1 class="headline">We Received Your Message</h1>
                            <p class="greeting">${greeting}</p>
                            <p class="message-text">
                                ${messageBodySafe}
                            </p>

                            <!-- Clean Action Link / Button -->
                            <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                                <tr>
                                    <td align="center">
                                        <a href="${returnUrl}" class="cta-button" target="_blank">
                                            Visit ${cleanDomain} &rarr;
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
                                This confirmation was sent because you submitted a form on <strong>${cleanDomain}</strong>.
                            </p>
                            <p style="margin: 0;">
                                Delivered securely on behalf of <strong>${displayName}</strong> via <a href="https://entrywise.webbound.in" target="_blank" style="color: #64748b; text-decoration: none; font-weight: 500;">EntryWise</a>
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
