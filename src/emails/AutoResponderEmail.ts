interface AutoResponderEmailProps {
    siteDomain: string;
    recipientName?: string;
    customBody?: string | null;
    customSubject?: string | null;
}

export const renderAutoResponderEmail = ({
    siteDomain,
    recipientName,
    customBody,
}: AutoResponderEmailProps): string => {
    const greeting = recipientName ? `Hi ${recipientName},` : 'Hello,';
    const messageBody = customBody || 'Thank you for reaching out to us. We have received your message and will get back to you as soon as possible.';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Thank you for contacting us</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f9fafb; padding: 40px 0;">
        <tr>
            <td align="center">
                <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #5755fe 0%, #7c3aed 100%); padding: 32px 40px; text-align: center;">
                            <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0;">
                                We Received Your Submission
                            </h1>
                            <p style="color: rgba(255, 255, 255, 0.9); font-size: 14px; margin: 8px 0 0 0;">
                                ${siteDomain}
                            </p>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding: 36px 40px; color: #374151; font-size: 16px; line-height: 1.6;">
                            <p style="margin: 0 0 16px 0; font-weight: 600;">
                                ${greeting}
                            </p>
                            <p style="margin: 0 0 24px 0;">
                                ${messageBody}
                            </p>
                            <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
                            <p style="margin: 0; font-size: 14px; color: #6b7280;">
                                This is an automated confirmation sent on behalf of <strong>${siteDomain}</strong>.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8fafc; padding: 20px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                                Powered by EntryWise
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
};
