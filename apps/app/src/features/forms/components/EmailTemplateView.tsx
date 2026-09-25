import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  Download,
  GripVertical,
  Heading,
  Image,
  Inbox,
  LayoutTemplate,
  Loader2,
  Mail,
  MessageSquare,
  Monitor,
  MousePointerClick,
  Plus,
  RotateCcw,
  Save,
  Smartphone,
  Sparkles,
  Table,
  Trash2,
  Type,
  Wand2,
} from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib';
import type { Site } from '@/types';

// ==========================================
// 1. Types & Data Models
// ==========================================

export type EmailBlockType =
  | 'header'
  | 'heading'
  | 'text'
  | 'summary_table'
  | 'button'
  | 'callout'
  | 'divider'
  | 'footer';

export interface EmailBlock {
  id: string;
  type: EmailBlockType;
  title?: string;
  subtitle?: string;
  text?: string;
  logoUrl?: string;
  companyName?: string;
  buttonText?: string;
  buttonUrl?: string;
  buttonBg?: string;
  buttonTextColor?: string;
  buttonRadius?: number;
  calloutType?: 'info' | 'success' | 'warning';
  calloutText?: string;
  dividerHeight?: number;
  dividerColor?: string;
  footerText?: string;
  alignment?: 'left' | 'center' | 'right';
}

export type EmailTheme = 'clean_light' | 'emerald_glow' | 'indigo_slate' | 'executive_dark';
export type TemplateEditorMode = 'blocks' | 'custom_html';

interface EmailTemplateConfig {
  mode?: TemplateEditorMode;
  theme: EmailTheme;
  blocks: EmailBlock[];
  cardRadius: number;
  customHtml?: string;
}

interface EmailTemplateViewProps {
  site: Site;
  onSiteUpdated: (site: Site) => void;
}

// ==========================================
// 2. Pre-Built Designer Presets & Starter HTML
// ==========================================

export function getDefaultStarterHtml(site: Site): string {
  const brandName = site.name || site.domain;
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Receipt Confirmation — ${brandName}</title>
  <style type="text/css">
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .email-container { max-width: 600px; width: 100%; margin: 40px auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05); }
    .header { padding: 36px 32px 18px 32px; text-align: center; border-bottom: 1px solid #f1f5f9; }
    .brand-title { margin: 0; font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }
    .content { padding: 28px 32px; }
    .headline { font-size: 19px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 8px; }
    .body-copy { font-size: 14px; line-height: 1.65; color: #475569; margin-bottom: 20px; }
    .callout { background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 12px 16px; font-size: 13px; color: #065f46; margin: 18px 0; }
    .btn { display: inline-block; padding: 12px 28px; background-color: #10b981; color: #ffffff !important; text-decoration: none; font-weight: 600; font-size: 14px; border-radius: 8px; }
    .footer { padding: 20px 32px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1 class="brand-title">${brandName}</h1>
    </div>
    <div class="content">
      <h2 class="headline">We received your message!</h2>
      <p class="body-copy">
        Hi {{name}}, thank you for contacting us. We have received your submission sent via {{domain}} and our team is already reviewing it.
      </p>

      <div class="callout">
        ✓ Fast SLA: Our typical turnaround time is under 2 business hours.
      </div>

      <!-- Submission Summary Table -->
      <div style="margin: 22px 0;">
        <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 8px;">
          Submission Receipt:
        </div>
        {{formData}}
      </div>

      <div style="text-align: center; margin: 28px 0 12px 0;">
        <a href="https://${site.domain}" class="btn" target="_blank" rel="noopener noreferrer">Visit ${site.domain} →</a>
      </div>
    </div>
    <div class="footer">
      Delivered securely on behalf of ${brandName} via EntryWise.
    </div>
  </div>
</body>
</html>`;
}

const createPresetBlocks = (presetId: string, site: Site): EmailBlock[] => {
  const brandName = site.name || site.domain;

  switch (presetId) {
    case 'minimal_letter':
      return [
        {
          id: 'b-1',
          type: 'heading',
          title: 'Thanks for reaching out, {{name}}',
          alignment: 'left',
        },
        {
          id: 'b-2',
          type: 'text',
          text: 'We have received your inquiry sent via {{domain}}. Below is a summary of the details you submitted:\n\n{{formData}}\n\nIf you have any urgent details to add, feel free to reply directly to this email.',
          alignment: 'left',
        },
        {
          id: 'b-3',
          type: 'button',
          buttonText: 'Visit Our Website',
          buttonUrl: 'https://{{domain}}',
          buttonBg: '#0f172a',
          buttonTextColor: '#ffffff',
          buttonRadius: 8,
          alignment: 'left',
        },
        {
          id: 'b-4',
          type: 'divider',
          dividerHeight: 24,
          dividerColor: '#e2e8f0',
        },
        {
          id: 'b-5',
          type: 'footer',
          footerText: `${brandName} • {{domain}} • Delivered securely via EntryWise`,
          alignment: 'left',
        },
      ];

    case 'next_steps':
      return [
        {
          id: 'b-1',
          type: 'header',
          companyName: brandName,
          alignment: 'center',
        },
        {
          id: 'b-2',
          type: 'heading',
          title: 'Your Request is Confirmed (#{{submission_id}})',
          subtitle: "We're excited to connect with you!",
          alignment: 'center',
        },
        {
          id: 'b-3',
          type: 'callout',
          calloutType: 'info',
          calloutText:
            'What happens next:\n1. Review: Our team reviews your requirements.\n2. Schedule: We will send an invite for a quick 15-minute discovery call.',
        },
        {
          id: 'b-4',
          type: 'button',
          buttonText: 'Schedule a Call on Calendly →',
          buttonUrl: 'https://calendly.com',
          buttonBg: '#10b981',
          buttonTextColor: '#ffffff',
          buttonRadius: 10,
          alignment: 'center',
        },
        {
          id: 'b-5',
          type: 'summary_table',
          title: 'Your Submitted Information',
        },
        {
          id: 'b-6',
          type: 'footer',
          footerText: `Questions? Reply directly to this email. Sent on behalf of ${brandName}.`,
          alignment: 'center',
        },
      ];

    case 'dark_executive':
      return [
        {
          id: 'b-1',
          type: 'header',
          companyName: brandName,
          alignment: 'center',
        },
        {
          id: 'b-2',
          type: 'heading',
          title: 'Inquiry Logged: #{{submission_id}}',
          subtitle: 'Authentication & Delivery Receipt',
          alignment: 'center',
        },
        {
          id: 'b-3',
          type: 'text',
          text: 'Hello {{name}},\n\nYour message submitted on {{domain}} has been safely received and queued for review.',
          alignment: 'left',
        },
        {
          id: 'b-4',
          type: 'summary_table',
          title: 'Submission Payload',
        },
        {
          id: 'b-5',
          type: 'button',
          buttonText: 'View Submission Status',
          buttonUrl: 'https://{{domain}}',
          buttonBg: '#6366f1',
          buttonTextColor: '#ffffff',
          buttonRadius: 8,
          alignment: 'center',
        },
        {
          id: 'b-6',
          type: 'footer',
          footerText: `Encrypted & authenticated via EntryWise on behalf of ${brandName}.`,
          alignment: 'center',
        },
      ];

    default:
      return [
        {
          id: 'b-1',
          type: 'header',
          companyName: brandName,
          alignment: 'center',
        },
        {
          id: 'b-2',
          type: 'heading',
          title: 'We Received Your Message!',
          subtitle: `Thank you for contacting ${brandName}`,
          alignment: 'center',
        },
        {
          id: 'b-3',
          type: 'text',
          text: "Hi {{name}}, thanks for reaching out! We've received your submission and our team is already reviewing it.",
          alignment: 'center',
        },
        {
          id: 'b-4',
          type: 'callout',
          calloutType: 'success',
          calloutText:
            '✓ Fast Response Guaranteed: Our typical response window is under 2 business hours.',
        },
        {
          id: 'b-5',
          type: 'summary_table',
          title: 'Submission Receipt',
        },
        {
          id: 'b-6',
          type: 'button',
          buttonText: `Visit ${site.domain} →`,
          buttonUrl: `https://${site.domain}`,
          buttonBg: '#10b981',
          buttonTextColor: '#ffffff',
          buttonRadius: 10,
          alignment: 'center',
        },
        {
          id: 'b-7',
          type: 'divider',
          dividerHeight: 20,
          dividerColor: '#f1f5f9',
        },
        {
          id: 'b-8',
          type: 'footer',
          footerText: `Delivered securely on behalf of ${brandName} via EntryWise.`,
          alignment: 'center',
        },
      ];
  }
};

// ==========================================
// 3. Bulletproof HTML Email Compiler (Blocks Mode)
// ==========================================

export function compileBulletproofHtmlEmail(
  blocks: EmailBlock[],
  theme: EmailTheme,
  cardRadius: number,
  site: Site
): string {
  const brandName = site.name || site.domain;

  const themeColors = {
    clean_light: {
      bg: '#f8fafc',
      cardBg: '#ffffff',
      cardBorder: '#e2e8f0',
      textPrimary: '#0f172a',
      textSecondary: '#475569',
      accent: '#10b981',
      tableBg: '#f8fafc',
      calloutBg: '#ecfdf5',
      calloutBorder: '#a7f3d0',
      calloutText: '#065f46',
    },
    emerald_glow: {
      bg: '#090a0f',
      cardBg: '#12141c',
      cardBorder: 'rgba(16, 185, 129, 0.25)',
      textPrimary: '#f8fafc',
      textSecondary: '#94a3b8',
      accent: '#10b981',
      tableBg: '#181b26',
      calloutBg: 'rgba(16, 185, 129, 0.12)',
      calloutBorder: 'rgba(16, 185, 129, 0.35)',
      calloutText: '#34d399',
    },
    indigo_slate: {
      bg: '#0c0e17',
      cardBg: '#141829',
      cardBorder: 'rgba(99, 102, 241, 0.25)',
      textPrimary: '#f8fafc',
      textSecondary: '#a5b4fc',
      accent: '#6366f1',
      tableBg: '#1c223a',
      calloutBg: 'rgba(99, 102, 241, 0.12)',
      calloutBorder: 'rgba(99, 102, 241, 0.35)',
      calloutText: '#a5b4fc',
    },
    executive_dark: {
      bg: '#09090b',
      cardBg: '#121215',
      cardBorder: 'rgba(255, 255, 255, 0.1)',
      textPrimary: '#f4f4f5',
      textSecondary: '#a1a1aa',
      accent: '#ffffff',
      tableBg: '#18181d',
      calloutBg: 'rgba(255, 255, 255, 0.05)',
      calloutBorder: 'rgba(255, 255, 255, 0.15)',
      calloutText: '#e4e4e7',
    },
  }[theme];

  const renderedRows = blocks
    .map((block) => {
      const align = block.alignment || 'left';

      switch (block.type) {
        case 'header':
          return `
            <tr>
              <td align="${align}" style="padding: 32px 32px 16px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                ${
                  block.logoUrl
                    ? `<img src="${block.logoUrl}" alt="${brandName}" width="140" style="display:inline-block; border:0; max-height:48px; object-fit:contain;" />`
                    : `<span style="display:inline-block; font-size:20px; font-weight:800; letter-spacing:-0.02em; color:${themeColors.textPrimary};">${block.companyName || brandName}</span>`
                }
              </td>
            </tr>
          `;

        case 'heading':
          return `
            <tr>
              <td align="${align}" style="padding: 8px 32px 12px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                <h1 style="margin:0 0 6px 0; font-size:22px; font-weight:700; line-height:1.3; color:${themeColors.textPrimary}; letter-spacing:-0.01em;">
                  ${block.title || 'We Received Your Message'}
                </h1>
                ${
                  block.subtitle
                    ? `<p style="margin:0; font-size:14px; color:${themeColors.textSecondary}; line-height:1.5;">${block.subtitle}</p>`
                    : ''
                }
              </td>
            </tr>
          `;

        case 'text':
          return `
            <tr>
              <td align="${align}" style="padding: 10px 32px 18px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size:14px; line-height:1.65; color:${themeColors.textSecondary};">
                ${(block.text || '').replace(/\n/g, '<br/>')}
              </td>
            </tr>
          `;

        case 'summary_table':
          return `
            <tr>
              <td style="padding: 12px 32px 20px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                ${
                  block.title
                    ? `<div style="font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:${themeColors.textSecondary}; margin-bottom:10px;">${block.title}</div>`
                    : ''
                }
                <!-- Dynamic Submission Data Table Placeholder -->
                {{formData}}
              </td>
            </tr>
          `;

        case 'button':
          return `
            <tr>
              <td align="${align}" style="padding: 16px 32px 24px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                <table border="0" cellspacing="0" cellpadding="0" style="display:inline-block; border-collapse:separate;">
                  <tr>
                    <td align="center" style="border-radius:${block.buttonRadius ?? 8}px; background-color:${block.buttonBg || themeColors.accent};">
                      <a href="${block.buttonUrl || `https://${site.domain}`}" target="_blank" rel="noopener noreferrer" style="display:inline-block; padding:12px 26px; font-size:14px; font-weight:600; color:${block.buttonTextColor || '#ffffff'}; text-decoration:none; border-radius:${block.buttonRadius ?? 8}px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                        ${block.buttonText || 'Visit Website →'}
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          `;

        case 'callout':
          return `
            <tr>
              <td style="padding: 10px 32px 18px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                <div style="background-color:${themeColors.calloutBg}; border:1px solid ${themeColors.calloutBorder}; border-radius:10px; padding:14px 18px; font-size:13px; line-height:1.55; color:${themeColors.calloutText};">
                  ${(block.calloutText || '').replace(/\n/g, '<br/>')}
                </div>
              </td>
            </tr>
          `;

        case 'divider':
          return `
            <tr>
              <td style="padding: ${Math.round((block.dividerHeight ?? 24) / 2)}px 32px;">
                <hr style="border:0; border-top:1px solid ${block.dividerColor || themeColors.cardBorder}; margin:0;" />
              </td>
            </tr>
          `;

        case 'footer':
          return `
            <tr>
              <td align="${align}" style="padding: 16px 32px 28px 32px; border-top:1px solid ${themeColors.cardBorder}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size:11px; line-height:1.6; color:${themeColors.textSecondary};">
                ${(block.footerText || `Delivered securely on behalf of ${brandName} via EntryWise.`).replace(/\n/g, '<br/>')}
              </td>
            </tr>
          `;

        default:
          return '';
      }
    })
    .join('\n');

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Receipt Confirmation — ${brandName}</title>
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
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    table { border-collapse: collapse !important; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; min-width: 100%; background-color: ${themeColors.bg}; }
    @media only screen and (max-width: 620px) {
      .responsive-card { width: 100% !important; max-width: 100% !important; border-radius: 0 !important; }
      .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:${themeColors.bg}; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <center style="width: 100%; background-color: ${themeColors.bg}; padding: 40px 12px 60px 12px;">
    <!--[if mso]>
    <table role="presentation" width="600" align="center" border="0" cellspacing="0" cellpadding="0">
    <tr><td>
    <![endif]-->
    <table role="presentation" class="responsive-card" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: ${themeColors.cardBg}; border: 1px solid ${themeColors.cardBorder}; border-radius: ${cardRadius}px; overflow: hidden; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08); text-align: left;">
      ${renderedRows}
    </table>
    <!--[if mso]>
    </td></tr></table>
    <![endif]-->
  </center>
</body>
</html>`;
}

// ==========================================
// 4. Main Component: EmailTemplateView
// ==========================================

export const EmailTemplateView: React.FC<EmailTemplateViewProps> = ({ site, onSiteUpdated }) => {
  // Navigation & Sub-Tabs
  const [activeSubTab, setActiveSubTab] = useState<'studio' | 'html' | 'team'>('studio');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [simulateVariables, setSimulateVariables] = useState<boolean>(true);

  // Editor Mode: 'blocks' (drag & drop) vs 'custom_html' (direct raw HTML code)
  const [editorMode, setEditorMode] = useState<TemplateEditorMode>(() => {
    if (site.auto_responder_config) {
      try {
        const parsed = JSON.parse(site.auto_responder_config);
        if (parsed.mode === 'custom_html') return 'custom_html';
      } catch {
        // fallback
      }
    }
    if (
      site.auto_responder_body &&
      (site.auto_responder_body.includes('<!DOCTYPE') ||
        site.auto_responder_body.includes('<html')) &&
      !site.auto_responder_config
    ) {
      return 'custom_html';
    }
    return 'blocks';
  });

  // Custom Raw HTML Editor State
  const [customHtml, setCustomHtml] = useState<string>(() => {
    if (site.auto_responder_config) {
      try {
        const parsed = JSON.parse(site.auto_responder_config);
        if (parsed.customHtml) return parsed.customHtml;
      } catch {
        // fallback
      }
    }
    if (
      site.auto_responder_body &&
      (site.auto_responder_body.includes('<!DOCTYPE') ||
        site.auto_responder_body.includes('<html') ||
        site.auto_responder_body.includes('<table'))
    ) {
      return site.auto_responder_body;
    }
    return getDefaultStarterHtml(site);
  });

  // Auto-Responder Settings
  const [autoResponderEnabled, setAutoResponderEnabled] = useState<boolean>(
    Boolean(site.auto_responder_enabled)
  );
  const [autoResponderSubject, setAutoResponderSubject] = useState<string>(
    site.auto_responder_subject || 'We received your message — {{domain}}'
  );

  // Team Alerts
  const [notifyOnSubmission, setNotifyOnSubmission] = useState<boolean>(
    site.notify_on_submission === undefined ? true : Boolean(site.notify_on_submission)
  );
  const [notificationEmails, setNotificationEmails] = useState<string>(
    site.notification_emails || ''
  );

  // Visual Blocks Config State
  const [theme, setTheme] = useState<EmailTheme>('clean_light');
  const [cardRadius, setCardRadius] = useState<number>(12);
  const [blocks, setBlocks] = useState<EmailBlock[]>(() => {
    if (site.auto_responder_config) {
      try {
        const parsed = JSON.parse(site.auto_responder_config);
        if (parsed.blocks && Array.isArray(parsed.blocks)) {
          return parsed.blocks;
        }
      } catch {
        // fallback
      }
    }
    return createPresetBlocks('modern_receipt', site);
  });

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(
    () => blocks[0]?.id || null
  );
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Feedback & Saving
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [copiedHtml, setCopiedHtml] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize from site props on change
  useEffect(() => {
    setAutoResponderEnabled(Boolean(site.auto_responder_enabled));
    setAutoResponderSubject(site.auto_responder_subject || 'We received your message — {{domain}}');
    setNotifyOnSubmission(
      site.notify_on_submission === undefined ? true : Boolean(site.notify_on_submission)
    );
    setNotificationEmails(site.notification_emails || '');

    if (site.auto_responder_config) {
      try {
        const parsed = JSON.parse(site.auto_responder_config);
        if (parsed.mode) setEditorMode(parsed.mode);
        if (parsed.customHtml) setCustomHtml(parsed.customHtml);
        if (parsed.blocks && Array.isArray(parsed.blocks)) {
          setBlocks(parsed.blocks);
        }
        if (parsed.theme) setTheme(parsed.theme);
        if (parsed.cardRadius) setCardRadius(parsed.cardRadius);
      } catch {
        // keep current
      }
    }
  }, [site]);

  // Selected block reference
  const selectedBlock = useMemo(() => {
    return blocks.find((b) => b.id === selectedBlockId) || null;
  }, [blocks, selectedBlockId]);

  // Compiled full HTML email string from visual blocks
  const compiledBlocksHtml = useMemo(() => {
    return compileBulletproofHtmlEmail(blocks, theme, cardRadius, site);
  }, [blocks, theme, cardRadius, site]);

  // Active output HTML: returns customHtml if in raw mode, else compiled visual blocks
  const activeOutputHtml = useMemo(() => {
    return editorMode === 'custom_html' ? customHtml : compiledBlocksHtml;
  }, [editorMode, customHtml, compiledBlocksHtml]);

  // Handle Preset Switching (Blocks Mode)
  const handleApplyPreset = (presetId: string) => {
    const newBlocks = createPresetBlocks(presetId, site);
    setBlocks(newBlocks);
    setSelectedBlockId(newBlocks[0]?.id || null);

    if (presetId === 'dark_executive') {
      setTheme('executive_dark');
    } else if (presetId === 'next_steps') {
      setTheme('emerald_glow');
    } else {
      setTheme('clean_light');
    }
  };

  // Convert current visual blocks to custom HTML
  const handleConvertBlocksToHtml = () => {
    setCustomHtml(compiledBlocksHtml);
    setEditorMode('custom_html');
  };

  // Reset custom HTML to starter boilerplate
  const handleResetStarterHtml = () => {
    setCustomHtml(getDefaultStarterHtml(site));
  };

  // Drag and drop reordering
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const updated = [...blocks];
    const [moved] = updated.splice(draggedIndex, 1);
    updated.splice(index, 0, moved);
    setDraggedIndex(index);
    setBlocks(updated);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleMoveBlock = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= blocks.length) return;
    const updated = [...blocks];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setBlocks(updated);
  };

  const handleAddBlock = (type: EmailBlockType) => {
    const newId = `b-${Date.now().toString().slice(-4)}`;
    let newBlock: EmailBlock;

    switch (type) {
      case 'header':
        newBlock = {
          id: newId,
          type: 'header',
          companyName: site.name || site.domain,
          alignment: 'center',
        };
        break;
      case 'heading':
        newBlock = { id: newId, type: 'heading', title: 'Special Update', alignment: 'center' };
        break;
      case 'text':
        newBlock = {
          id: newId,
          type: 'text',
          text: 'Hi {{name}},\n\nHere is an update regarding your request on {{domain}}.',
          alignment: 'left',
        };
        break;
      case 'summary_table':
        newBlock = { id: newId, type: 'summary_table', title: 'Submitted Details' };
        break;
      case 'button':
        newBlock = {
          id: newId,
          type: 'button',
          buttonText: 'View Details →',
          buttonUrl: `https://${site.domain}`,
          buttonBg: '#10b981',
          buttonTextColor: '#ffffff',
          buttonRadius: 8,
          alignment: 'center',
        };
        break;
      case 'callout':
        newBlock = {
          id: newId,
          type: 'callout',
          calloutType: 'info',
          calloutText: 'Notice: Please allow up to 24 hours for review.',
        };
        break;
      case 'divider':
        newBlock = { id: newId, type: 'divider', dividerHeight: 20, dividerColor: '#e2e8f0' };
        break;
      case 'footer':
        newBlock = {
          id: newId,
          type: 'footer',
          footerText: `${site.name || site.domain} • Delivered securely via EntryWise`,
          alignment: 'center',
        };
        break;
    }

    setBlocks((prev) => [...prev, newBlock]);
    setSelectedBlockId(newId);
  };

  const handleUpdateBlock = (id: string, updates: Partial<EmailBlock>) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  };

  const handleDeleteBlock = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    if (selectedBlockId === id) {
      setSelectedBlockId(blocks.find((b) => b.id !== id)?.id || null);
    }
  };

  const handleInsertVariable = (
    variableToken: string,
    fieldKey: 'text' | 'title' | 'calloutText' | 'footerText'
  ) => {
    if (!selectedBlock) return;
    const currentVal = (selectedBlock[fieldKey] as string) || '';
    handleUpdateBlock(selectedBlock.id, {
      [fieldKey]: `${currentVal} ${variableToken}`,
    });
  };

  const handleInsertVariableIntoHtml = (tag: string) => {
    setCustomHtml((prev) => `${prev} ${tag}`);
  };

  // Save to EntryWise backend
  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage(null);

    const configPayload: EmailTemplateConfig = {
      mode: editorMode,
      theme,
      blocks,
      cardRadius,
      customHtml,
    };

    try {
      const updated = await api.updateSite(site.id, {
        notify_on_submission: notifyOnSubmission,
        notification_emails: notificationEmails.trim() || null,
        auto_responder_enabled: autoResponderEnabled,
        auto_responder_subject: autoResponderSubject.trim() || null,
        auto_responder_body: activeOutputHtml,
        auto_responder_config: JSON.stringify(configPayload),
      });

      onSiteUpdated(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: unknown) {
      console.error('Failed to save email template:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save email template');
    } finally {
      setIsSaving(false);
    }
  };

  // Copy HTML to clipboard
  const handleCopyHtml = () => {
    navigator.clipboard.writeText(activeOutputHtml);
    setCopiedHtml(true);
    setTimeout(() => setCopiedHtml(false), 2000);
  };

  // Download .html file
  const handleDownloadHtml = () => {
    const blob = new Blob([activeOutputHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `email-template-${site.domain}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Simulated values for live preview
  const simulateText = useCallback(
    (input?: string): string => {
      if (!input) return '';
      if (!simulateVariables) return input;

      const sampleTableHtml = `
        <table cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:540px;border-collapse:collapse;margin:12px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
          <tr style="background:#f8fafc;"><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#475569;width:30%;">Name</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#0f172a;">Alex Taylor</td></tr>
          <tr style="background:#ffffff;"><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#475569;">Email</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#0f172a;">alex.taylor@example.com</td></tr>
          <tr style="background:#f8fafc;"><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#475569;">Message</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#0f172a;">We are interested in discussing partnership and enterprise licensing.</td></tr>
        </table>
      `;

      return input
        .replace(/{{\s*name\s*}}/gi, 'Alex Taylor')
        .replace(/{{\s*email\s*}}/gi, 'alex.taylor@example.com')
        .replace(/{{\s*domain\s*}}/gi, site.domain)
        .replace(/{{\s*company\s*}}/gi, site.name || site.domain)
        .replace(/{{\s*company_name\s*}}/gi, site.name || site.domain)
        .replace(/{{\s*submission_id\s*}}/gi, '#EW-849102')
        .replace(/{{\s*(formData|form_data|submission_summary|all_fields)\s*}}/gi, sampleTableHtml);
    },
    [simulateVariables, site]
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Studio Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Mail className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-white tracking-tight">Email Template Studio</h2>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {editorMode === 'custom_html' ? 'Custom HTML Mode' : 'Visual Blocks Mode'}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Build custom auto-responder receipts and team alerts using drag-and-drop blocks or
            direct HTML.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Sub-tab Switcher */}
          <div className="flex items-center bg-[#0d0e12] p-1 rounded-xl border border-white/[0.08]">
            <button
              type="button"
              onClick={() => setActiveSubTab('studio')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                activeSubTab === 'studio'
                  ? 'bg-emerald-500/15 text-emerald-400 font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <LayoutTemplate className="w-3.5 h-3.5" />
              <span>Studio &amp; Preview</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('html')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                activeSubTab === 'html'
                  ? 'bg-emerald-500/15 text-emerald-400 font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>HTML Source</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('team')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                activeSubTab === 'team'
                  ? 'bg-emerald-500/15 text-emerald-400 font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>Team Routing</span>
            </button>
          </div>

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition shadow-lg shadow-white/5 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>Saving Template...</span>
              </>
            ) : saveSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Saved &amp; Active!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-black" />
                <span>Save Email Template</span>
              </>
            )}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-xs flex items-center gap-2">
          <Trash2 className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 1: STUDIO & LIVE PREVIEW (WITH MODE SWITCHER)                       */}
      {/* ========================================================================= */}
      {activeSubTab === 'studio' && (
        <div className="space-y-6">
          {/* Top Control Bar: Active Toggle + Mode Selector + Subject Line */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 rounded-2xl border border-white/[0.08] bg-[#121318]">
            {/* Auto-Responder Toggle */}
            <div className="lg:col-span-3 flex items-center justify-between p-3 rounded-xl border border-white/[0.06] bg-[#0c0d10]">
              <div>
                <div className="text-xs font-semibold text-white">Auto-Responder</div>
                <div className="text-[10px] text-zinc-400">Send receipt to submitter</div>
              </div>
              <label
                htmlFor="toggle-auto-responder"
                className="relative inline-flex items-center cursor-pointer"
              >
                <input
                  id="toggle-auto-responder"
                  type="checkbox"
                  checked={autoResponderEnabled}
                  onChange={(e) => setAutoResponderEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
              </label>
            </div>

            {/* Editor Mode Selector (Blocks vs Custom HTML) */}
            <div className="lg:col-span-4 flex flex-col justify-center">
              <span className="block text-[11px] font-semibold text-zinc-300 mb-1">
                Template Composition Mode
              </span>
              <div className="flex items-center bg-[#0a0a0d] p-1 rounded-xl border border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setEditorMode('blocks')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition ${
                    editorMode === 'blocks'
                      ? 'bg-emerald-500/15 text-emerald-400 font-semibold shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <LayoutTemplate className="w-3.5 h-3.5" />
                  <span>Visual Blocks</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditorMode('custom_html')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition ${
                    editorMode === 'custom_html'
                      ? 'bg-emerald-500/15 text-emerald-400 font-semibold shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Custom HTML</span>
                </button>
              </div>
            </div>

            {/* Subject Line Input */}
            <div className="lg:col-span-5 flex flex-col justify-center">
              <label
                htmlFor="email-subject-input"
                className="block text-[11px] font-semibold text-zinc-300 mb-1"
              >
                Email Subject Line
              </label>
              <input
                id="email-subject-input"
                type="text"
                value={autoResponderSubject}
                onChange={(e) => setAutoResponderSubject(e.target.value)}
                placeholder="We received your message — {{domain}}"
                className="w-full bg-[#0a0a0d] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>

          {/* ================================================================= */}
          {/* MODE A: VISUAL BLOCKS BUILDER                                    */}
          {/* ================================================================= */}
          {editorMode === 'blocks' ? (
            <div className="space-y-6">
              {/* Presets Bar */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-white/[0.08] bg-[#121318]">
                <span className="text-xs text-zinc-400">Quick Designer Presets:</span>
                <div className="flex items-center gap-2">
                  {[
                    { id: 'modern_receipt', label: 'Receipt' },
                    { id: 'minimal_letter', label: 'Minimal' },
                    { id: 'next_steps', label: 'Next Steps' },
                    { id: 'dark_executive', label: 'Dark' },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleApplyPreset(preset.id)}
                      className="px-3 py-1 rounded-lg border border-white/[0.08] bg-[#0c0d10] hover:bg-white/[0.06] hover:border-emerald-500/40 text-xs text-zinc-300 hover:text-white transition font-medium"
                    >
                      {preset.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleConvertBlocksToHtml}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-xs text-emerald-400 font-medium transition ml-2"
                    title="Export blocks as HTML code and switch to Custom HTML editor"
                  >
                    <Wand2 className="w-3 h-3" />
                    <span>Convert to HTML Code</span>
                  </button>
                </div>
              </div>

              {/* Main 2-Column Split */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left: Palette + Draggable Canvas + Inspector (5 cols) */}
                <div className="lg:col-span-5 space-y-4">
                  {/* Palette */}
                  <div className="p-4 rounded-2xl border border-white/[0.08] bg-[#121318] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                        <Plus className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Add Email Block</span>
                      </span>
                      <span className="text-[10px] text-zinc-500">Click to append</span>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { type: 'header' as EmailBlockType, label: 'Header', icon: Image },
                        { type: 'heading' as EmailBlockType, label: 'Title', icon: Heading },
                        { type: 'text' as EmailBlockType, label: 'Text', icon: Type },
                        {
                          type: 'summary_table' as EmailBlockType,
                          label: 'Form Table',
                          icon: Table,
                        },
                        {
                          type: 'button' as EmailBlockType,
                          label: 'Button',
                          icon: MousePointerClick,
                        },
                        { type: 'callout' as EmailBlockType, label: 'Callout', icon: Sparkles },
                        { type: 'divider' as EmailBlockType, label: 'Divider', icon: RotateCcw },
                        { type: 'footer' as EmailBlockType, label: 'Footer', icon: MessageSquare },
                      ].map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.type}
                            type="button"
                            onClick={() => handleAddBlock(item.type)}
                            className="flex flex-col items-center justify-center p-2 rounded-xl border border-white/[0.06] bg-[#0c0d10] hover:bg-emerald-500/[0.08] hover:border-emerald-500/40 text-zinc-400 hover:text-emerald-400 transition text-center group"
                          >
                            <Icon className="w-4 h-4 mb-1 group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] font-medium">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Canvas List */}
                  <div className="p-4 rounded-2xl border border-white/[0.08] bg-[#121318] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-200">
                        Template Blocks ({blocks.length})
                      </span>
                      <span className="text-[10px] text-zinc-500">Drag to reorder</span>
                    </div>

                    <ul className="space-y-2 max-h-[360px] overflow-y-auto pr-1 list-none p-0 m-0">
                      {blocks.map((block, index) => {
                        const isSelected = block.id === selectedBlockId;
                        return (
                          <li
                            key={block.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDragEnd={handleDragEnd}
                            className={`p-2.5 rounded-xl border transition flex items-center justify-between gap-2 ${
                              isSelected
                                ? 'border-emerald-500/60 bg-emerald-500/[0.08] shadow-sm'
                                : 'border-white/[0.06] bg-[#0c0d10] hover:bg-white/[0.04]'
                            } ${draggedIndex === index ? 'opacity-40 border-dashed border-emerald-400' : ''}`}
                          >
                            <button
                              type="button"
                              onClick={() => setSelectedBlockId(block.id)}
                              className="flex items-center gap-2 min-w-0 flex-1 text-left focus:outline-none"
                            >
                              <div className="cursor-grab text-zinc-500 hover:text-zinc-300 p-0.5">
                                <GripVertical className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-zinc-200 truncate flex items-center gap-1.5">
                                  <span className="capitalize">{block.type.replace('_', ' ')}</span>
                                </div>
                                <div className="text-[10px] text-zinc-400 truncate">
                                  {block.title ||
                                    block.buttonText ||
                                    block.companyName ||
                                    block.text?.slice(0, 30) ||
                                    'Configured block'}
                                </div>
                              </div>
                            </button>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleMoveBlock(index, 'up')}
                                disabled={index === 0}
                                className="p-1 rounded text-zinc-400 hover:text-white disabled:opacity-20 text-[10px]"
                                title="Move Up"
                              >
                                ▲
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveBlock(index, 'down')}
                                disabled={index === blocks.length - 1}
                                className="p-1 rounded text-zinc-400 hover:text-white disabled:opacity-20 text-[10px]"
                                title="Move Down"
                              >
                                ▼
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteBlock(block.id)}
                                className="p-1 rounded text-zinc-500 hover:text-red-400 transition"
                                title="Remove Block"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  {/* Property Inspector */}
                  {selectedBlock && (
                    <div className="p-4 rounded-2xl border border-white/[0.08] bg-[#121318] space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                        <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                          Edit {selectedBlock.type.replace('_', ' ')} Block
                        </div>
                        <div className="flex items-center gap-1 bg-[#0a0a0d] p-1 rounded-lg border border-white/[0.06]">
                          {(['left', 'center', 'right'] as const).map((align) => {
                            const Icon =
                              align === 'left'
                                ? AlignLeft
                                : align === 'center'
                                  ? AlignCenter
                                  : AlignRight;
                            return (
                              <button
                                key={align}
                                type="button"
                                onClick={() =>
                                  handleUpdateBlock(selectedBlock.id, { alignment: align })
                                }
                                className={`p-1 rounded transition ${
                                  (selectedBlock.alignment || 'left') === align
                                    ? 'bg-white/[0.1] text-emerald-400'
                                    : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                                title={`Align ${align}`}
                              >
                                <Icon className="w-3 h-3" />
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Header Block Inspector */}
                      {selectedBlock.type === 'header' && (
                        <div className="space-y-3">
                          <div>
                            <label
                              htmlFor="header-brand-input"
                              className="block text-[11px] text-zinc-400 mb-1"
                            >
                              Brand / Company Name
                            </label>
                            <input
                              id="header-brand-input"
                              type="text"
                              value={selectedBlock.companyName || ''}
                              onChange={(e) =>
                                handleUpdateBlock(selectedBlock.id, { companyName: e.target.value })
                              }
                              placeholder={site.name || site.domain}
                              className="w-full bg-[#0a0a0d] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white"
                            />
                          </div>
                          <div>
                            <label
                              htmlFor="header-logo-input"
                              className="block text-[11px] text-zinc-400 mb-1"
                            >
                              Logo Image URL (Optional)
                            </label>
                            <input
                              id="header-logo-input"
                              type="url"
                              value={selectedBlock.logoUrl || ''}
                              onChange={(e) =>
                                handleUpdateBlock(selectedBlock.id, { logoUrl: e.target.value })
                              }
                              placeholder="https://example.com/logo.png"
                              className="w-full bg-[#0a0a0d] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white"
                            />
                          </div>
                        </div>
                      )}

                      {/* Heading Block Inspector */}
                      {selectedBlock.type === 'heading' && (
                        <div className="space-y-3">
                          <div>
                            <label
                              htmlFor="heading-title-input"
                              className="block text-[11px] text-zinc-400 mb-1"
                            >
                              Heading Title
                            </label>
                            <input
                              id="heading-title-input"
                              type="text"
                              value={selectedBlock.title || ''}
                              onChange={(e) =>
                                handleUpdateBlock(selectedBlock.id, { title: e.target.value })
                              }
                              placeholder="We received your message!"
                              className="w-full bg-[#0a0a0d] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white"
                            />
                          </div>
                          <div>
                            <label
                              htmlFor="heading-sub-input"
                              className="block text-[11px] text-zinc-400 mb-1"
                            >
                              Subtitle (Optional)
                            </label>
                            <input
                              id="heading-sub-input"
                              type="text"
                              value={selectedBlock.subtitle || ''}
                              onChange={(e) =>
                                handleUpdateBlock(selectedBlock.id, { subtitle: e.target.value })
                              }
                              placeholder="Thank you for getting in touch."
                              className="w-full bg-[#0a0a0d] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white"
                            />
                          </div>
                        </div>
                      )}

                      {/* Text Block Inspector */}
                      {selectedBlock.type === 'text' && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <label
                              htmlFor="text-body-input"
                              className="block text-[11px] text-zinc-400"
                            >
                              Message Body
                            </label>
                            <div className="flex gap-1">
                              {['{{name}}', '{{domain}}', '{{company}}'].map((tag) => (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={() => handleInsertVariable(tag, 'text')}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                                >
                                  +{tag}
                                </button>
                              ))}
                            </div>
                          </div>
                          <textarea
                            id="text-body-input"
                            rows={4}
                            value={selectedBlock.text || ''}
                            onChange={(e) =>
                              handleUpdateBlock(selectedBlock.id, { text: e.target.value })
                            }
                            className="w-full bg-[#0a0a0d] border border-white/[0.08] rounded-lg px-2.5 py-2 text-xs text-white leading-relaxed font-sans"
                            placeholder="Hi {{name}}, thank you for reaching out..."
                          />
                        </div>
                      )}

                      {/* Button Block Inspector */}
                      {selectedBlock.type === 'button' && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label
                                htmlFor="btn-label-input"
                                className="block text-[11px] text-zinc-400 mb-1"
                              >
                                Button Label
                              </label>
                              <input
                                id="btn-label-input"
                                type="text"
                                value={selectedBlock.buttonText || ''}
                                onChange={(e) =>
                                  handleUpdateBlock(selectedBlock.id, {
                                    buttonText: e.target.value,
                                  })
                                }
                                placeholder="Visit Our Website →"
                                className="w-full bg-[#0a0a0d] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white"
                              />
                            </div>
                            <div>
                              <label
                                htmlFor="btn-url-input"
                                className="block text-[11px] text-zinc-400 mb-1"
                              >
                                Destination URL
                              </label>
                              <input
                                id="btn-url-input"
                                type="text"
                                value={selectedBlock.buttonUrl || ''}
                                onChange={(e) =>
                                  handleUpdateBlock(selectedBlock.id, { buttonUrl: e.target.value })
                                }
                                placeholder="https://example.com"
                                className="w-full bg-[#0a0a0d] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label
                                htmlFor="btn-bg-input"
                                className="block text-[11px] text-zinc-400 mb-1"
                              >
                                Background Color
                              </label>
                              <input
                                id="btn-bg-input"
                                type="color"
                                value={selectedBlock.buttonBg || '#10b981'}
                                onChange={(e) =>
                                  handleUpdateBlock(selectedBlock.id, { buttonBg: e.target.value })
                                }
                                className="w-full h-8 bg-transparent cursor-pointer rounded border border-white/[0.08]"
                              />
                            </div>
                            <div>
                              <label
                                htmlFor="btn-radius-input"
                                className="block text-[11px] text-zinc-400 mb-1"
                              >
                                Border Radius (px)
                              </label>
                              <input
                                id="btn-radius-input"
                                type="number"
                                min={0}
                                max={24}
                                value={selectedBlock.buttonRadius ?? 8}
                                onChange={(e) =>
                                  handleUpdateBlock(selectedBlock.id, {
                                    buttonRadius: Number(e.target.value),
                                  })
                                }
                                className="w-full bg-[#0a0a0d] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Summary Table Inspector */}
                      {selectedBlock.type === 'summary_table' && (
                        <div className="space-y-3">
                          <div>
                            <label
                              htmlFor="table-heading-input"
                              className="block text-[11px] text-zinc-400 mb-1"
                            >
                              Table Section Heading
                            </label>
                            <input
                              id="table-heading-input"
                              type="text"
                              value={selectedBlock.title || ''}
                              onChange={(e) =>
                                handleUpdateBlock(selectedBlock.id, { title: e.target.value })
                              }
                              placeholder="Submission Receipt"
                              className="w-full bg-[#0a0a0d] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white"
                            />
                          </div>
                          <p className="text-[11px] text-zinc-500 leading-relaxed">
                            When delivered, EntryWise automatically injects a styled table of all
                            fields submitted by the user (Name, Email, Message, Attachments) into
                            the <code>&#123;&#123;formData&#125;&#125;</code> placeholder.
                          </p>
                        </div>
                      )}

                      {/* Callout Inspector */}
                      {selectedBlock.type === 'callout' && (
                        <div className="space-y-3">
                          <div>
                            <label
                              htmlFor="callout-text-input"
                              className="block text-[11px] text-zinc-400 mb-1"
                            >
                              Callout Highlight Message
                            </label>
                            <textarea
                              id="callout-text-input"
                              rows={3}
                              value={selectedBlock.calloutText || ''}
                              onChange={(e) =>
                                handleUpdateBlock(selectedBlock.id, { calloutText: e.target.value })
                              }
                              className="w-full bg-[#0a0a0d] border border-white/[0.08] rounded-lg px-2.5 py-2 text-xs text-white"
                            />
                          </div>
                        </div>
                      )}

                      {/* Footer Inspector */}
                      {selectedBlock.type === 'footer' && (
                        <div className="space-y-3">
                          <div>
                            <label
                              htmlFor="footer-text-input"
                              className="block text-[11px] text-zinc-400 mb-1"
                            >
                              Footer Text / Disclaimer
                            </label>
                            <textarea
                              id="footer-text-input"
                              rows={2}
                              value={selectedBlock.footerText || ''}
                              onChange={(e) =>
                                handleUpdateBlock(selectedBlock.id, { footerText: e.target.value })
                              }
                              className="w-full bg-[#0a0a0d] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Right: Interactive Simulator (Blocks Mode) (7 cols) */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Simulator Controls */}
                  <div className="flex items-center justify-between p-3 rounded-2xl border border-white/[0.08] bg-[#121318]">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-zinc-200">
                        Email Client Simulator
                      </span>
                      {/* Theme Selector */}
                      <div className="flex items-center gap-1.5">
                        {[
                          { id: 'clean_light' as EmailTheme, label: 'Light', color: '#f8fafc' },
                          { id: 'emerald_glow' as EmailTheme, label: 'Emerald', color: '#10b981' },
                          { id: 'indigo_slate' as EmailTheme, label: 'Indigo', color: '#6366f1' },
                          { id: 'executive_dark' as EmailTheme, label: 'Dark', color: '#18181b' },
                        ].map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setTheme(t.id)}
                            className={`w-5 h-5 rounded-full border transition flex items-center justify-center ${
                              theme === t.id
                                ? 'border-white scale-110 shadow-sm'
                                : 'border-white/20 opacity-60 hover:opacity-100'
                            }`}
                            style={{ backgroundColor: t.color }}
                            title={`Theme: ${t.label}`}
                          >
                            {theme === t.id && (
                              <span className="w-1.5 h-1.5 rounded-full bg-white" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSimulateVariables((prev) => !prev)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition border ${
                          simulateVariables
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                            : 'border-white/[0.08] bg-[#0c0d10] text-zinc-400'
                        }`}
                      >
                        {simulateVariables ? 'Sample Data ON' : 'Raw {{tags}}'}
                      </button>

                      <div className="flex items-center bg-[#0c0d10] p-1 rounded-xl border border-white/[0.08]">
                        <button
                          type="button"
                          onClick={() => setPreviewDevice('desktop')}
                          className={`p-1.5 rounded-lg transition ${
                            previewDevice === 'desktop'
                              ? 'bg-white/[0.1] text-white shadow-sm'
                              : 'text-zinc-500 hover:text-zinc-300'
                          }`}
                          title="Desktop Preview"
                        >
                          <Monitor className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewDevice('mobile')}
                          className={`p-1.5 rounded-lg transition ${
                            previewDevice === 'mobile'
                              ? 'bg-white/[0.1] text-white shadow-sm'
                              : 'text-zinc-500 hover:text-zinc-300'
                          }`}
                          title="Mobile Preview"
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Mail Envelope Simulation */}
                  <div
                    className={`mx-auto rounded-2xl border border-white/[0.1] shadow-2xl overflow-hidden transition-all duration-300 ${
                      previewDevice === 'mobile' ? 'max-w-[375px]' : 'w-full'
                    }`}
                    style={{
                      backgroundColor:
                        theme === 'clean_light'
                          ? '#f8fafc'
                          : theme === 'emerald_glow'
                            ? '#090a0f'
                            : theme === 'indigo_slate'
                              ? '#0c0e17'
                              : '#09090b',
                    }}
                  >
                    {/* Mail App Header */}
                    <div className="bg-[#181920] border-b border-white/[0.08] px-4 py-3 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-zinc-400">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                        </div>
                        <span className="text-[10px] text-zinc-500">Inbox • Just now</span>
                      </div>

                      <div className="text-xs font-semibold text-white truncate">
                        {simulateText(autoResponderSubject)}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-0.5">
                        <span>
                          <strong className="text-zinc-300">From:</strong>{' '}
                          {site.name || site.domain} &lt;no-reply@entrywise.webbound.in&gt;
                        </span>
                        <span>
                          <strong className="text-zinc-300">To:</strong>{' '}
                          {simulateVariables ? 'Alex Taylor <alex@example.com>' : '{{email}}'}
                        </span>
                      </div>
                    </div>

                    {/* Email Card Canvas */}
                    <div className="p-6 md:p-8 flex justify-center">
                      <div
                        className="w-full max-w-[540px] rounded-xl shadow-lg border transition-all"
                        style={{
                          backgroundColor:
                            theme === 'clean_light'
                              ? '#ffffff'
                              : theme === 'emerald_glow'
                                ? '#12141c'
                                : theme === 'indigo_slate'
                                  ? '#141829'
                                  : '#121215',
                          borderColor:
                            theme === 'clean_light'
                              ? '#e2e8f0'
                              : theme === 'emerald_glow'
                                ? 'rgba(16, 185, 129, 0.25)'
                                : theme === 'indigo_slate'
                                  ? 'rgba(99, 102, 241, 0.25)'
                                  : 'rgba(255, 255, 255, 0.1)',
                          borderRadius: `${cardRadius}px`,
                          color: theme === 'clean_light' ? '#0f172a' : '#f8fafc',
                        }}
                      >
                        {blocks.map((block) => {
                          const align = block.alignment || 'left';
                          const isSelected = block.id === selectedBlockId;

                          return (
                            <button
                              key={block.id}
                              type="button"
                              onClick={() => setSelectedBlockId(block.id)}
                              className={`w-full text-left cursor-pointer transition border border-transparent focus:outline-none ${
                                isSelected
                                  ? 'ring-2 ring-emerald-500/80 rounded-lg'
                                  : 'hover:border-dashed hover:border-zinc-500/40'
                              }`}
                            >
                              {block.type === 'header' && (
                                <div className={`p-6 pb-2 text-${align}`}>
                                  {block.logoUrl ? (
                                    <img
                                      src={block.logoUrl}
                                      alt="Logo"
                                      className="h-10 inline-block object-contain"
                                    />
                                  ) : (
                                    <div className="text-xl font-bold tracking-tight">
                                      {block.companyName || site.name || site.domain}
                                    </div>
                                  )}
                                </div>
                              )}

                              {block.type === 'heading' && (
                                <div className={`px-6 py-2 text-${align}`}>
                                  <h3 className="text-lg font-bold tracking-tight">
                                    {simulateText(block.title)}
                                  </h3>
                                  {block.subtitle && (
                                    <p className="text-xs text-zinc-400 mt-0.5">
                                      {simulateText(block.subtitle)}
                                    </p>
                                  )}
                                </div>
                              )}

                              {block.type === 'text' && (
                                <div
                                  className={`px-6 py-2 text-xs leading-relaxed whitespace-pre-line text-${align}`}
                                  style={{ color: theme === 'clean_light' ? '#475569' : '#94a3b8' }}
                                >
                                  {simulateText(block.text)}
                                </div>
                              )}

                              {block.type === 'callout' && (
                                <div className="px-6 py-2">
                                  <div
                                    className="p-3 rounded-lg text-xs leading-relaxed border"
                                    style={{
                                      backgroundColor:
                                        theme === 'clean_light'
                                          ? '#ecfdf5'
                                          : 'rgba(16, 185, 129, 0.1)',
                                      borderColor:
                                        theme === 'clean_light'
                                          ? '#a7f3d0'
                                          : 'rgba(16, 185, 129, 0.3)',
                                      color: theme === 'clean_light' ? '#065f46' : '#34d399',
                                    }}
                                  >
                                    {simulateText(block.calloutText)}
                                  </div>
                                </div>
                              )}

                              {block.type === 'summary_table' && (
                                <div className="px-6 py-3">
                                  {block.title && (
                                    <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                                      {block.title}
                                    </div>
                                  )}
                                  <div className="rounded-lg border border-zinc-200 dark:border-white/[0.08] overflow-hidden text-xs">
                                    <table className="w-full border-collapse">
                                      <tbody>
                                        <tr className="border-b border-zinc-200 dark:border-white/[0.06] bg-zinc-50 dark:bg-white/[0.02]">
                                          <td className="p-2.5 font-semibold text-zinc-500 w-1/3">
                                            Name
                                          </td>
                                          <td className="p-2.5">
                                            {simulateVariables ? 'Alex Taylor' : '{{name}}'}
                                          </td>
                                        </tr>
                                        <tr className="border-b border-zinc-200 dark:border-white/[0.06]">
                                          <td className="p-2.5 font-semibold text-zinc-500">
                                            Email
                                          </td>
                                          <td className="p-2.5">
                                            {simulateVariables ? 'alex@example.com' : '{{email}}'}
                                          </td>
                                        </tr>
                                        <tr className="border-b border-zinc-200 dark:border-white/[0.06] bg-zinc-50 dark:bg-white/[0.02]">
                                          <td className="p-2.5 font-semibold text-zinc-500">
                                            Message
                                          </td>
                                          <td className="p-2.5">
                                            {simulateVariables
                                              ? 'Interested in discussing enterprise licensing options.'
                                              : '{{message}}'}
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}

                              {block.type === 'button' && (
                                <div className={`px-6 py-3 text-${align}`}>
                                  <span
                                    className="inline-block px-5 py-2.5 font-semibold text-xs shadow-md"
                                    style={{
                                      backgroundColor: block.buttonBg || '#10b981',
                                      color: block.buttonTextColor || '#ffffff',
                                      borderRadius: `${block.buttonRadius ?? 8}px`,
                                    }}
                                  >
                                    {block.buttonText || 'Visit Website →'}
                                  </span>
                                </div>
                              )}

                              {block.type === 'divider' && (
                                <div className="px-6 py-2">
                                  <hr
                                    style={{
                                      borderColor: block.dividerColor || '#e2e8f0',
                                      borderTopWidth: '1px',
                                      borderBottomWidth: '0px',
                                    }}
                                  />
                                </div>
                              )}

                              {block.type === 'footer' && (
                                <div
                                  className={`p-5 text-[10px] text-zinc-500 border-t border-zinc-200 dark:border-white/[0.06] text-${align}`}
                                >
                                  {simulateText(block.footerText)}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ================================================================= */
            /* MODE B: DIRECT CUSTOM HTML EDITOR                                 */
            /* ================================================================= */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left: Raw HTML Code Editor (5 cols) */}
              <div className="lg:col-span-6 space-y-4">
                <div className="p-4 rounded-2xl border border-white/[0.08] bg-[#121318] space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                    <div>
                      <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
                        <Code2 className="w-4 h-4 text-emerald-400" />
                        <span>Direct HTML Editor</span>
                      </h3>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Paste or write your full standalone HTML email markup.
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleResetStarterHtml}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-white/[0.08] bg-[#0c0d10] hover:bg-white/[0.06] text-[11px] text-zinc-400 hover:text-white transition"
                        title="Reset code to clean responsive boilerplate"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset Boilerplate</span>
                      </button>
                    </div>
                  </div>

                  {/* Dynamic Variable Chips */}
                  <div>
                    <span className="block text-[11px] text-zinc-400 mb-1.5 font-medium">
                      Insert Dynamic Variables into HTML:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        '{{name}}',
                        '{{email}}',
                        '{{company}}',
                        '{{domain}}',
                        '{{submission_id}}',
                        '{{formData}}',
                      ].map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleInsertVariableIntoHtml(tag)}
                          className="px-2 py-0.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-mono transition"
                        >
                          +{tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* HTML Editor Textarea */}
                  <div>
                    <label htmlFor="custom-html-editor" className="sr-only">
                      Custom HTML Email Source
                    </label>
                    <textarea
                      id="custom-html-editor"
                      rows={22}
                      value={customHtml}
                      onChange={(e) => setCustomHtml(e.target.value)}
                      placeholder="<!DOCTYPE html><html>...</html>"
                      className="w-full bg-[#090a0f] border border-white/[0.08] rounded-xl p-4 text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-500/50 leading-relaxed transition"
                      spellCheck={false}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
                    <span>
                      {customHtml.length} characters • {customHtml.split('\n').length} lines
                    </span>
                    <span className="text-emerald-400/80">
                      ✓ Direct delivery enabled (no escaping)
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Live Simulator Rendering Custom HTML (6 cols) */}
              <div className="lg:col-span-6 space-y-4">
                <div className="flex items-center justify-between p-3 rounded-2xl border border-white/[0.08] bg-[#121318]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-200">
                      Live HTML Email Preview
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Isolated Render
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSimulateVariables((prev) => !prev)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition border ${
                        simulateVariables
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                          : 'border-white/[0.08] bg-[#0c0d10] text-zinc-400'
                      }`}
                    >
                      {simulateVariables ? 'Sample Data ON' : 'Raw {{tags}}'}
                    </button>

                    <div className="flex items-center bg-[#0c0d10] p-1 rounded-xl border border-white/[0.08]">
                      <button
                        type="button"
                        onClick={() => setPreviewDevice('desktop')}
                        className={`p-1.5 rounded-lg transition ${
                          previewDevice === 'desktop'
                            ? 'bg-white/[0.1] text-white shadow-sm'
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                        title="Desktop Preview"
                      >
                        <Monitor className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewDevice('mobile')}
                        className={`p-1.5 rounded-lg transition ${
                          previewDevice === 'mobile'
                            ? 'bg-white/[0.1] text-white shadow-sm'
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                        title="Mobile Preview"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Email Client Envelope Frame */}
                <div
                  className={`mx-auto rounded-2xl border border-white/[0.1] shadow-2xl overflow-hidden transition-all duration-300 bg-[#121318] ${
                    previewDevice === 'mobile' ? 'max-w-[375px]' : 'w-full'
                  }`}
                >
                  {/* Mail App Header */}
                  <div className="bg-[#181920] border-b border-white/[0.08] px-4 py-3 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-zinc-400">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                      </div>
                      <span className="text-[10px] text-zinc-500">Inbox • Just now</span>
                    </div>

                    <div className="text-xs font-semibold text-white truncate">
                      {simulateText(autoResponderSubject)}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-0.5">
                      <span>
                        <strong className="text-zinc-300">From:</strong> {site.name || site.domain}{' '}
                        &lt;no-reply@entrywise.webbound.in&gt;
                      </span>
                      <span>
                        <strong className="text-zinc-300">To:</strong>{' '}
                        {simulateVariables ? 'Alex Taylor <alex@example.com>' : '{{email}}'}
                      </span>
                    </div>
                  </div>

                  {/* Sandboxed iFrame Preview of Raw HTML */}
                  <div className="bg-white">
                    <iframe
                      title="Live Custom HTML Email Preview"
                      srcDoc={simulateText(customHtml)}
                      className="w-full h-[600px] border-0"
                      sandbox="allow-same-origin"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: FULL HTML CODE EXPORT                                            */}
      {/* ========================================================================= */}
      {activeSubTab === 'html' && (
        <div className="p-6 rounded-2xl border border-white/[0.08] bg-[#121318] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Code2 className="w-4 h-4 text-emerald-400" />
                <span>
                  {editorMode === 'custom_html'
                    ? 'Active Custom HTML Email'
                    : 'Compiled Bulletproof HTML Email'}
                </span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Ready for Gmail, Outlook, Apple Mail, and standard SMTP dispatch with inlined CSS
                styles.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyHtml}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.08] bg-[#0c0d10] hover:bg-white/[0.05] text-xs font-medium text-zinc-300 hover:text-white transition"
              >
                {copiedHtml ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy HTML</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleDownloadHtml}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs font-medium transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .html</span>
              </button>
            </div>
          </div>

          <pre className="p-4 rounded-xl bg-[#090a0f] border border-white/[0.06] text-xs font-mono text-zinc-300 overflow-x-auto max-h-[520px] leading-relaxed">
            {activeOutputHtml}
          </pre>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: TEAM ROUTING & ALERTS                                            */}
      {/* ========================================================================= */}
      {activeSubTab === 'team' && (
        <div className="p-6 rounded-2xl border border-white/[0.08] bg-[#121318] space-y-6 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Inbox className="w-4 h-4 text-emerald-400" />
                <span>Team Email Alerts &amp; Routing</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Automatically forward new incoming form submissions to your team in real time.
              </p>
            </div>
            <label
              htmlFor="toggle-team-alerts"
              className="relative inline-flex items-center cursor-pointer"
            >
              <input
                id="toggle-team-alerts"
                type="checkbox"
                checked={notifyOnSubmission}
                onChange={(e) => setNotifyOnSubmission(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:width-5 after:transition-all peer-checked:bg-emerald-500" />
            </label>
          </div>

          {notifyOnSubmission && (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="notification-emails-routing"
                  className="block text-xs font-semibold text-zinc-200 mb-1.5"
                >
                  Notification Recipient Emails
                </label>
                <textarea
                  id="notification-emails-routing"
                  rows={2}
                  placeholder="team@acme.com, founder@acme.com, leads@marketing.com"
                  value={notificationEmails}
                  onChange={(e) => setNotificationEmails(e.target.value)}
                  className="w-full bg-[#0a0a0d] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition font-mono leading-relaxed"
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  Separate multiple recipient emails with commas. If left empty, alerts route to
                  your account email ({site.admin_email}).
                </p>
              </div>

              <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0c0d10] flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-zinc-200 text-xs">
                    Direct Submitter Reply-To Enabled
                  </h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    When you click &quot;Reply&quot; to any submission alert in Gmail, Outlook, or
                    Apple Mail, your email client will automatically address the submitter directly.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
