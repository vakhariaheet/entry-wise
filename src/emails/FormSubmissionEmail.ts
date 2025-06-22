interface FormSubmissionEmailProps {
    siteDomain: string;
    formData: {
        [key: string]: string;
    };
    companyName: string;
    attachments?: { filename: string }[];
}

export const renderFormSubmissionEmail = ({
    siteDomain,
    formData,
    companyName,
    attachments = []
}: FormSubmissionEmailProps): string => {
    const currentDate = new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });

    const submissionId = `#EW-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`;

    const formFields = Object.entries(formData)
        .map(([key, value]) => `
            <tr>
                <td style="padding: 20px 24px; border-bottom: 1px solid #f3f4f6; vertical-align: top;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                        <tr>
                            <td style="color: #6b7280; font-size: 14px; font-weight: 500; width: 120px; vertical-align: top; padding-right: 16px;">
                                ${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
                            </td>
                            <td style="color: #1f2937; font-size: 14px; font-weight: 400; word-break: break-word; ${value.length > 100 ? 'line-height: 1.7;' : ''}">
                                ${value}
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        `).join('');

    const attachmentsSection = attachments.length > 0 ? `
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; margin-top: 32px;">
            <tr>
                <td style="color: #5755fe; font-size: 18px; font-weight: 600; padding: 20px 24px; background-color: #f8fafc; border-bottom: 1px solid #e5e7eb;">
                    Attachments (${attachments.length})
                </td>
            </tr>
            ${attachments.map(({ filename }) => `
                <tr>
                    <td style="padding: 16px 24px; border-bottom: 1px solid #f3f4f6;">
                        <table cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                                <td style="color: #1f2937; font-size: 14px; font-weight: 500;">
                                    📎 ${filename}
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            `).join('')}
        </table>
    ` : '';

    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>New Form Submission - EntryWise</title>
            <!--[if mso]>
            <noscript>
                <xml>
                    <o:OfficeDocumentSettings>
                        <o:PixelsPerInch>96</o:PixelsPerInch>
                    </o:OfficeDocumentSettings>
                </xml>
            </noscript>
            <![endif]-->
            <style type="text/css">
                @media screen and (max-width: 600px) {
                    .mobile-stack {
                        display: block !important;
                        width: 100% !important;
                    }
                    .mobile-padding {
                        padding: 20px !important;
                    }
                    .mobile-center {
                        text-align: center !important;
                    }
                    .mobile-hide {
                        display: none !important;
                    }
                }
            </style>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, Arial, sans-serif;">
            <!-- Main Container -->
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f9fafb; padding: 20px 0;">
                <tr>
                    <td align="center">
                        <!-- Email Container -->
                        <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                            <!-- Header Section -->
                            <tr>
                                <td style="background: linear-gradient(135deg, #5755fe 0%, #7c3aed 100%); background-color: #5755fe; padding: 32px 40px; text-align: center; border-radius: 12px 12px 0 0;">
                                    <!-- Logo -->
                                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 20px;">
                                        <tr>
                                            <td style="text-align: center;">
                                                <img src="https://entrywise.webbound.in/assets/logo.png" alt="EntryWise Logo" style="width: 100px; height: 100px; border-radius: 50px;">
                                            </td>
                                        </tr>
                                    </table>
                                    
                                    <!-- Title -->
                                    <h2 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0 0 8px 0; letter-spacing: -0.025em;">
                                        New Form Submission
                                    </h2>
                                    <p style="color: rgba(255, 255, 255, 0.9); font-size: 16px; font-weight: 400; margin: 0;">
                                        You have received a new form submission
                                    </p>
                                </td>
                            </tr>
                            
                            <!-- Content Section -->
                            <tr>
                                <td style="padding: 40px;" class="mobile-padding">
                                    <!-- Submission Information -->
                                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #fff7fc; border: 2px solid #ff71cd; border-radius: 8px; margin-bottom: 32px;">
                                        <tr>
                                            <td style="padding: 24px;">
                                                <h3 style="color: #5755fe; font-size: 20px; font-weight: 600; margin: 0 0 16px 0;">
                                                    Submission Details
                                                </h3>
                                                
                                                <!-- Info Grid -->
                                                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                                    <tr>
                                                        <td width="50%" style="vertical-align: top; padding-right: 16px;" class="mobile-stack">
                                                            <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                                                <tr>
                                                                    <td style="margin-bottom: 16px;">
                                                                        <div style="color: #6b7280; font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">
                                                                            Website
                                                                        </div>
                                                                        <div style="color: #1f2937; font-size: 14px; font-weight: 500;">
                                                                            ${siteDomain}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                                <tr>
                                                                    <td style="padding-top: 16px;">
                                                                        <div style="color: #6b7280; font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">
                                                                            Submission ID
                                                                        </div>
                                                                        <div style="color: #1f2937; font-size: 14px; font-weight: 500;">
                                                                            ${submissionId}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                        </td>
                                                        <td width="50%" style="vertical-align: top; padding-left: 16px;" class="mobile-stack">
                                                            <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                                                <tr>
                                                                    <td style="margin-bottom: 16px;">
                                                                        <div style="color: #6b7280; font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">
                                                                            Submitted At
                                                                        </div>
                                                                        <div style="color: #1f2937; font-size: 14px; font-weight: 500;">
                                                                            ${currentDate}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                                <tr>
                                                                    <td style="padding-top: 16px;">
                                                                        <div style="color: #6b7280; font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">
                                                                            Status
                                                                        </div>
                                                                        <div style="color: #1f2937; font-size: 14px; font-weight: 500;">
                                                                            New
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>
                                    </table>
                                    
                                    <!-- Form Data -->
                                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px;">
                                        <tr>
                                            <td style="color: #5755fe; font-size: 18px; font-weight: 600; padding: 20px 24px; background-color: #f8fafc; border-bottom: 1px solid #e5e7eb;">
                                                Form Data
                                            </td>
                                        </tr>
                                        ${formFields}
                                    </table>
                                    
                                    ${attachmentsSection}
                                    
                                    <!-- Footer -->
                                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top: 48px; padding-top: 24px; border-top: 1px solid #f3f4f6;">
                                        <tr>
                                            <td style="text-align: center;">
                                                <p style="color: #ff71cd; font-size: 12px; font-weight: 500; margin: 0;">
                                                    Powered by Webbound
                                                </p>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
    `;
};