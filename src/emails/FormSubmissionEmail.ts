import { escapeHtml } from '../utils/escapeHtml';

interface FormSubmissionEmailProps {
    siteDomain: string;
    formData: {
        [key: string]: string;
    };
    companyName: string;
    timezone?: string;
    submissionId?: string;
    attachments?: { filename: string }[];
}

export const renderFormSubmissionEmail = ({
    siteDomain,
    formData,
    companyName,
    timezone = 'UTC',
    submissionId: providedSubId,
    attachments = []
}: FormSubmissionEmailProps): string => {
    let currentDate = new Date().toUTCString();
    try {
        currentDate = new Date().toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: timezone || 'UTC',
        });
    } catch {
        currentDate = new Date().toUTCString();
    }

    const safeDomain = escapeHtml(siteDomain);
    const safeSubmissionId = escapeHtml(providedSubId || `#EW-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`);
    const safeCompanyName = escapeHtml(companyName);

    const formFields = Object.entries(formData)
        .map(([key, value]) => {
            const safeKey = escapeHtml(key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()));
            const safeValue = escapeHtml(String(value ?? ''));
            const isLong = safeValue.length > 100;
            return `
            <tr>
                <td style="padding: 16px 20px; border-bottom: 1px solid #f3f4f6; vertical-align: top;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                        <tr>
                            <td style="color: #6b7280; font-size: 13px; font-weight: 600; width: 130px; vertical-align: top; padding-right: 16px;">
                                ${safeKey}:
                            </td>
                            <td style="color: #111827; font-size: 14px; font-weight: 400; word-break: break-word; ${isLong ? 'line-height: 1.6;' : ''}">
                                ${safeValue}
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        `;
        }).join('');

    const attachmentsSection = attachments.length > 0 ? `
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; margin-top: 24px;">
            <tr>
                <td style="color: #4f46e5; font-size: 15px; font-weight: 600; padding: 14px 20px; background-color: #f8fafc; border-bottom: 1px solid #e5e7eb;">
                    Attachments (${attachments.length})
                </td>
            </tr>
            ${attachments.map(({ filename }) => `
                <tr>
                    <td style="padding: 12px 20px; border-bottom: 1px solid #f3f4f6;">
                        <table cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                                <td style="color: #1f2937; font-size: 13px; font-weight: 500;">
                                    📎 ${escapeHtml(filename)}
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            `).join('')}
        </table>
    ` : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Submission — ${safeDomain}</title>
    <style type="text/css">
        @media screen and (max-width: 600px) {
            .mobile-stack { display: block !important; width: 100% !important; padding-left: 0 !important; padding-right: 0 !important; }
            .mobile-padding { padding: 20px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f8fafc; padding: 32px 12px;">
        <tr>
            <td align="center">
                <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #0f172a; padding: 28px 32px; text-align: left;">
                            <div style="color: #10b981; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 6px;">
                                EntryWise Notification
                            </div>
                            <h2 style="color: #ffffff; font-size: 20px; font-weight: 700; margin: 0; letter-spacing: -0.02em;">
                                New Form Submission
                            </h2>
                            <p style="color: #94a3b8; font-size: 13px; margin: 4px 0 0 0;">
                                Received from <strong style="color: #f1f5f9;">${safeDomain}</strong>
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 28px 32px;" class="mobile-padding">
                            <!-- Metadata Grid -->
                            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 16px 20px;">
                                        <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                            <tr>
                                                <td width="50%" style="vertical-align: top; padding-right: 12px;" class="mobile-stack">
                                                    <div style="color: #64748b; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Origin</div>
                                                    <div style="color: #0f172a; font-size: 13px; font-weight: 600;">${safeDomain}</div>
                                                    
                                                    <div style="color: #64748b; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 12px; margin-bottom: 4px;">Submission ID</div>
                                                    <div style="color: #0f172a; font-size: 12px; font-family: monospace;">${safeSubmissionId}</div>
                                                </td>
                                                <td width="50%" style="vertical-align: top; padding-left: 12px;" class="mobile-stack">
                                                    <div style="color: #64748b; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Submitted At</div>
                                                    <div style="color: #0f172a; font-size: 13px; font-weight: 500;">${escapeHtml(currentDate)}</div>
                                                    
                                                    <div style="color: #64748b; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 12px; margin-bottom: 4px;">Status</div>
                                                    <div style="color: #10b981; font-size: 13px; font-weight: 600;">Verified</div>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Form Data Table -->
                            <div style="color: #0f172a; font-size: 14px; font-weight: 700; margin-bottom: 12px;">
                                Submission Data
                            </div>
                            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;">
                                ${formFields}
                            </table>

                            ${attachmentsSection}

                            <!-- Footer -->
                            <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #f1f5f9; text-align: center;">
                                <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                                    Delivered safely by <strong style="color: #64748b;">EntryWise</strong> for ${safeCompanyName || safeDomain}
                                </p>
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
};