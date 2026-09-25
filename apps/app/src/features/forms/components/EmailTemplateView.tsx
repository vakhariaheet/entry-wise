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
  Send,
  Smartphone,
  Sparkles,
  Table,
  Trash2,
  Type,
  X,
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
  | 'image'
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
  imageUrl?: string;
  imageAlt?: string;
  imageWidth?: number;
  imageLink?: string;
  imageBorderRadius?: number;
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
export type TemplateTarget = 'auto_responder' | 'submission_alert';

export interface EmailTemplateConfig {
  mode?: TemplateEditorMode;
  theme: EmailTheme;
  blocks: EmailBlock[];
  cardRadius: number;
  customHtml?: string;
  compiledHtml?: string;
  subject?: string;
}

export interface SiteEmailTemplatesConfig {
  autoResponder?: EmailTemplateConfig;
  submissionAlert?: EmailTemplateConfig;
  // Legacy top-level fallback
  mode?: TemplateEditorMode;
  theme?: EmailTheme;
  blocks?: EmailBlock[];
  cardRadius?: number;
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

export function getDefaultSubmissionAlertStarterHtml(site: Site): string {
  const brandName = site.name || site.domain;
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>New Form Submission — ${brandName}</title>
  <style type="text/css">
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .email-container { max-width: 600px; width: 100%; margin: 40px auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05); }
    .header { padding: 32px 32px 18px 32px; border-bottom: 1px solid #f1f5f9; }
    .brand-title { margin: 0; font-size: 20px; font-weight: 800; color: #0f172a; }
    .content { padding: 28px 32px; }
    .headline { font-size: 19px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 8px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; background-color: #f1f5f9; color: #475569; margin-bottom: 16px; }
    .footer { padding: 20px 32px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
    .btn { display: inline-block; padding: 12px 24px; background-color: #0f172a; color: #ffffff !important; text-decoration: none; font-weight: 600; font-size: 13px; border-radius: 8px; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1 class="brand-title">${brandName}</h1>
    </div>
    <div class="content">
      <span class="badge">Submission {{submission_id}} • {{date}}</span>
      <h2 class="headline">New Form Submission Received</h2>
      <p style="font-size: 14px; color: #475569; margin-bottom: 20px;">
        A new response was submitted via <strong>{{domain}}</strong>. Below is the complete form payload:
      </p>

      <!-- Dynamic Form Submission Table -->
      <div style="margin: 20px 0;">
        {{formData}}
      </div>

      <div style="text-align: center; margin: 28px 0 12px 0;">
        <a href="https://app.entrywise.webbound.in" class="btn" target="_blank" rel="noopener noreferrer">View Submissions in EntryWise →</a>
      </div>
    </div>
    <div class="footer">
      Automated submission notification delivered securely via EntryWise.
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

    default: // modern_receipt
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

const createAlertPresetBlocks = (presetId: string, site: Site): EmailBlock[] => {
  const brandName = site.name || site.domain;

  switch (presetId) {
    case 'alert_compact':
      return [
        { id: 'ab-1', type: 'header', companyName: brandName, alignment: 'left' },
        {
          id: 'ab-2',
          type: 'heading',
          title: 'New Lead: {{name}} (#{{submission_id}})',
          subtitle: 'Received from {{email}} on {{domain}}',
          alignment: 'left',
        },
        { id: 'ab-3', type: 'summary_table', title: 'Submitted Form Payload' },
        {
          id: 'ab-4',
          type: 'button',
          buttonText: 'Reply Directly to Submitter →',
          buttonUrl: 'mailto:{{email}}',
          buttonBg: '#0f172a',
          buttonTextColor: '#ffffff',
          buttonRadius: 8,
          alignment: 'left',
        },
        {
          id: 'ab-5',
          type: 'footer',
          footerText: `EntryWise Realtime Alert • {{domain}}`,
          alignment: 'left',
        },
      ];

    case 'alert_banner_hero':
      return [
        { id: 'ab-1', type: 'header', companyName: brandName, alignment: 'center' },
        {
          id: 'ab-2',
          type: 'image',
          imageUrl:
            'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80',
          imageAlt: 'New Submission Alert',
          imageWidth: 540,
          imageBorderRadius: 8,
          alignment: 'center',
        },
        {
          id: 'ab-3',
          type: 'heading',
          title: '⚡ New Submission Alert',
          subtitle: 'Submission #{{submission_id}} logged on {{domain}}',
          alignment: 'center',
        },
        { id: 'ab-4', type: 'summary_table', title: 'Form Details' },
        {
          id: 'ab-5',
          type: 'callout',
          calloutType: 'success',
          calloutText: '✓ Bot challenge verified & authenticated via EntryWise.',
        },
        {
          id: 'ab-6',
          type: 'button',
          buttonText: 'Open Submissions Inbox →',
          buttonUrl: 'https://app.entrywise.webbound.in',
          buttonBg: '#10b981',
          buttonTextColor: '#ffffff',
          buttonRadius: 8,
          alignment: 'center',
        },
        {
          id: 'ab-7',
          type: 'footer',
          footerText: `Delivered securely to your team via EntryWise.`,
          alignment: 'center',
        },
      ];

    default: // alert_executive
      return [
        { id: 'ab-1', type: 'header', companyName: brandName, alignment: 'left' },
        {
          id: 'ab-2',
          type: 'heading',
          title: 'New Form Submission Received',
          subtitle: 'Entry logged via {{domain}}',
          alignment: 'left',
        },
        {
          id: 'ab-3',
          type: 'callout',
          calloutType: 'info',
          calloutText: '⚡ Instant Alert: Received on {{date}} • Submission ID: {{submission_id}}',
        },
        { id: 'ab-4', type: 'summary_table', title: 'Submitted Form Payload' },
        {
          id: 'ab-5',
          type: 'button',
          buttonText: 'View in EntryWise Dashboard →',
          buttonUrl: 'https://app.entrywise.webbound.in',
          buttonBg: '#10b981',
          buttonTextColor: '#ffffff',
          buttonRadius: 8,
          alignment: 'left',
        },
        { id: 'ab-6', type: 'divider', dividerHeight: 20, dividerColor: '#e2e8f0' },
        {
          id: 'ab-7',
          type: 'footer',
          footerText: `EntryWise Realtime Notification • Delivered securely on behalf of ${brandName}`,
          alignment: 'left',
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

        case 'image': {
          const imgSrc =
            block.imageUrl ||
            'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80';
          const imgAlt = block.imageAlt || 'Banner image';
          const imgWidth = block.imageWidth || 536;
          const imgRadius = block.imageBorderRadius !== undefined ? block.imageBorderRadius : 8;
          const marginStyle =
            align === 'center' ? '0 auto' : align === 'right' ? '0 0 0 auto' : '0';
          const imgTag = `<img src="${imgSrc}" alt="${imgAlt}" width="${imgWidth}" style="display:block;max-width:100%;height:auto;border-radius:${imgRadius}px;border:0;margin:${marginStyle};" />`;
          const content = block.imageLink
            ? `<a href="${block.imageLink}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">${imgTag}</a>`
            : imgTag;
          return `
            <tr>
              <td align="${align}" style="padding: 12px 32px 18px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                ${content}
              </td>
            </tr>
          `;
        }

        case 'summary_table':
          return `
            <tr>
              <td style="padding: 12px 32px 20px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                ${
                  block.title
                    ? `<div style="font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:${themeColors.textSecondary}; margin-bottom:10px;">${block.title}</div>`
                    : ''
                }
                <!-- Dynamic Submission Summary Table injected by EntryWise runtime -->
                {{formData}}
              </td>
            </tr>
          `;

        case 'button':
          return `
            <tr>
              <td align="${align}" style="padding: 16px 32px 24px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                <!--[if mso]>
                <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${block.buttonUrl || `https://${site.domain}`}" style="height:44px;v-text-anchor:middle;width:200px;" arcsize="18%" stroke="f" fillcolor="${block.buttonBg || '#10b981'}">
                  <w:anchorlock/>
                  <center style="color:${block.buttonTextColor || '#ffffff'};font-family:sans-serif;font-size:14px;font-weight:bold;">${block.buttonText || 'Click Here'}</center>
                </v:roundrect>
                <![endif]-->
                <!--[if !mso]><!-->
                <a href="${block.buttonUrl || `https://${site.domain}`}" target="_blank" rel="noopener noreferrer" style="display:inline-block; padding:12px 28px; background-color:${block.buttonBg || '#10b981'}; color:${block.buttonTextColor || '#ffffff'} !important; text-decoration:none; font-weight:600; font-size:14px; border-radius:${block.buttonRadius ?? 8}px; text-align:center;">
                  ${block.buttonText || 'Click Here'}
                </a>
                <!--<![endif]-->
              </td>
            </tr>
          `;

        case 'callout':
          return `
            <tr>
              <td style="padding: 10px 32px 18px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${themeColors.calloutBg}; border:1px solid ${themeColors.calloutBorder}; border-radius:8px;">
                  <tr>
                    <td style="padding: 14px 18px; font-size: 13px; line-height: 1.6; color:${themeColors.calloutText}; font-weight:500;">
                      ${(block.calloutText || '').replace(/\n/g, '<br/>')}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          `;

        case 'divider':
          return `
            <tr>
              <td style="padding: ${(block.dividerHeight || 20) / 2}px 32px;">
                <hr style="border: 0; height: 1px; background-color: ${block.dividerColor || '#e2e8f0'}; margin: 0;" />
              </td>
            </tr>
          `;

        case 'footer':
          return `
            <tr>
              <td align="${align}" style="padding: 20px 32px 32px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size:11px; line-height:1.6; color:${themeColors.textSecondary}; border-top: 1px solid ${theme === 'clean_light' ? '#f1f5f9' : 'rgba(255,255,255,0.06)'};">
                ${block.footerText || `${brandName} • Delivered securely via EntryWise`}
              </td>
            </tr>
          `;

        default:
          return '';
      }
    })
    .join('');

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${brandName}</title>
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
    body, table, td, p, a, li, blockquote { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: ${themeColors.bg}; }
    @media only screen and (max-width: 620px) {
      .responsive-card { width: 100% !important; border-radius: 0 !important; }
      .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:${themeColors.bg}; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${themeColors.bg}" style="table-layout:fixed;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <!--[if mso]>
        <table cellpadding="0" cellspacing="0" border="0" width="600" align="center">
          <tr>
            <td>
        <![endif]-->
        <table class="responsive-card" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px; background-color:${themeColors.cardBg}; border:1px solid ${themeColors.cardBorder}; border-radius:${cardRadius}px; overflow:hidden; box-shadow:0 6px 20px rgba(0,0,0,0.06);">
          ${renderedRows}
        </table>
        <!--[if mso]>
            </td>
          </tr>
        </table>
        <![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ==========================================
// 4. Main Component: EmailTemplateView
// ==========================================

export const EmailTemplateView: React.FC<EmailTemplateViewProps> = ({ site, onSiteUpdated }) => {
  // Primary Dual Template Target: Auto-Responder vs Main Submission Alert
  const [activeTemplate, setActiveTemplate] = useState<TemplateTarget>('auto_responder');

  // Navigation & Sub-Tabs
  const [activeSubTab, setActiveSubTab] = useState<'studio' | 'html' | 'team'>('studio');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [simulateVariables, setSimulateVariables] = useState<boolean>(true);

  // Auto-Responder Global Settings
  const [autoResponderEnabled, setAutoResponderEnabled] = useState<boolean>(
    Boolean(site.auto_responder_enabled)
  );

  // Team Alerts Global Settings
  const [notifyOnSubmission, setNotifyOnSubmission] = useState<boolean>(
    site.notify_on_submission === undefined ? true : Boolean(site.notify_on_submission)
  );
  const [notificationEmails, setNotificationEmails] = useState<string>(
    site.notification_emails || ''
  );

  // --- Auto-Responder Template State ---
  const [autoMode, setAutoMode] = useState<TemplateEditorMode>(() => {
    if (site.auto_responder_config) {
      try {
        const parsed = JSON.parse(site.auto_responder_config);
        const autoConf = parsed.autoResponder || parsed;
        if (autoConf.mode === 'custom_html') return 'custom_html';
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

  const [autoCustomHtml, setAutoCustomHtml] = useState<string>(() => {
    if (site.auto_responder_config) {
      try {
        const parsed = JSON.parse(site.auto_responder_config);
        const autoConf = parsed.autoResponder || parsed;
        if (autoConf.customHtml) return autoConf.customHtml;
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

  const [autoSubject, setAutoSubject] = useState<string>(() => {
    if (site.auto_responder_config) {
      try {
        const parsed = JSON.parse(site.auto_responder_config);
        const autoConf = parsed.autoResponder || parsed;
        if (autoConf.subject) return autoConf.subject;
      } catch {
        // fallback
      }
    }
    return site.auto_responder_subject || 'We received your message — {{domain}}';
  });

  const [autoTheme, setAutoTheme] = useState<EmailTheme>('clean_light');
  const [autoCardRadius, setAutoCardRadius] = useState<number>(12);
  const [autoBlocks, setAutoBlocks] = useState<EmailBlock[]>(() => {
    if (site.auto_responder_config) {
      try {
        const parsed = JSON.parse(site.auto_responder_config);
        const autoConf = parsed.autoResponder || parsed;
        if (autoConf.blocks && Array.isArray(autoConf.blocks)) {
          return autoConf.blocks;
        }
      } catch {
        // fallback
      }
    }
    return createPresetBlocks('modern_receipt', site);
  });
  const [autoSelectedBlockId, setAutoSelectedBlockId] = useState<string | null>(
    () => autoBlocks[0]?.id || null
  );

  // --- Submission Alert (Main Notification) Template State ---
  const [alertMode, setAlertMode] = useState<TemplateEditorMode>(() => {
    if (site.auto_responder_config) {
      try {
        const parsed = JSON.parse(site.auto_responder_config);
        if (parsed.submissionAlert?.mode === 'custom_html') return 'custom_html';
      } catch {
        // fallback
      }
    }
    return 'blocks';
  });

  const [alertCustomHtml, setAlertCustomHtml] = useState<string>(() => {
    if (site.auto_responder_config) {
      try {
        const parsed = JSON.parse(site.auto_responder_config);
        if (parsed.submissionAlert?.customHtml) return parsed.submissionAlert.customHtml;
      } catch {
        // fallback
      }
    }
    return getDefaultSubmissionAlertStarterHtml(site);
  });

  const [alertSubject, setAlertSubject] = useState<string>(() => {
    if (site.auto_responder_config) {
      try {
        const parsed = JSON.parse(site.auto_responder_config);
        if (parsed.submissionAlert?.subject) return parsed.submissionAlert.subject;
      } catch {
        // fallback
      }
    }
    return `New Form Submission: ${site.name || site.domain} — #{{submission_id}}`;
  });

  const [alertTheme, setAlertTheme] = useState<EmailTheme>('clean_light');
  const [alertCardRadius, setAlertCardRadius] = useState<number>(12);
  const [alertBlocks, setAlertBlocks] = useState<EmailBlock[]>(() => {
    if (site.auto_responder_config) {
      try {
        const parsed = JSON.parse(site.auto_responder_config);
        if (parsed.submissionAlert?.blocks && Array.isArray(parsed.submissionAlert.blocks)) {
          return parsed.submissionAlert.blocks;
        }
      } catch {
        // fallback
      }
    }
    return createAlertPresetBlocks('alert_executive', site);
  });
  const [alertSelectedBlockId, setAlertSelectedBlockId] = useState<string | null>(
    () => alertBlocks[0]?.id || null
  );

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Feedback & Saving State
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [copiedHtml, setCopiedHtml] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Send Test Email Modal State
  const [testEmailModalOpen, setTestEmailModalOpen] = useState<boolean>(false);
  const [testEmailTarget, setTestEmailTarget] = useState<TemplateTarget>('auto_responder');
  const [testEmailRecipient, setTestEmailRecipient] = useState<string>(site.admin_email || '');
  const [isSendingTestEmail, setIsSendingTestEmail] = useState<boolean>(false);
  const [testEmailSuccess, setTestEmailSuccess] = useState<string | null>(null);
  const [testEmailError, setTestEmailError] = useState<string | null>(null);

  // Synchronize state when site prop changes
  useEffect(() => {
    setAutoResponderEnabled(Boolean(site.auto_responder_enabled));
    setNotifyOnSubmission(
      site.notify_on_submission === undefined ? true : Boolean(site.notify_on_submission)
    );
    setNotificationEmails(site.notification_emails || '');

    if (site.auto_responder_config) {
      try {
        const parsed = JSON.parse(site.auto_responder_config);
        // Load Auto-Responder
        const autoConf = parsed.autoResponder || parsed;
        if (autoConf.mode) setAutoMode(autoConf.mode);
        if (autoConf.customHtml) setAutoCustomHtml(autoConf.customHtml);
        if (autoConf.blocks && Array.isArray(autoConf.blocks)) setAutoBlocks(autoConf.blocks);
        if (autoConf.theme) setAutoTheme(autoConf.theme);
        if (autoConf.cardRadius) setAutoCardRadius(autoConf.cardRadius);
        if (autoConf.subject) setAutoSubject(autoConf.subject);

        // Load Submission Alert
        const alertConf = parsed.submissionAlert;
        if (alertConf) {
          if (alertConf.mode) setAlertMode(alertConf.mode);
          if (alertConf.customHtml) setAlertCustomHtml(alertConf.customHtml);
          if (alertConf.blocks && Array.isArray(alertConf.blocks)) setAlertBlocks(alertConf.blocks);
          if (alertConf.theme) setAlertTheme(alertConf.theme);
          if (alertConf.cardRadius) setAlertCardRadius(alertConf.cardRadius);
          if (alertConf.subject) setAlertSubject(alertConf.subject);
        }
      } catch {
        // keep current
      }
    }
  }, [site]);

  // Active Template Accessors
  const isAuto = activeTemplate === 'auto_responder';

  const editorMode = isAuto ? autoMode : alertMode;
  const setEditorMode = (m: TemplateEditorMode) => (isAuto ? setAutoMode(m) : setAlertMode(m));

  const customHtml = isAuto ? autoCustomHtml : alertCustomHtml;
  const setCustomHtml = (valOrFn: string | ((prev: string) => string)) => {
    if (isAuto) {
      setAutoCustomHtml(valOrFn);
    } else {
      setAlertCustomHtml(valOrFn);
    }
  };

  const subject = isAuto ? autoSubject : alertSubject;
  const setSubject = (s: string) => (isAuto ? setAutoSubject(s) : setAlertSubject(s));

  const theme = isAuto ? autoTheme : alertTheme;
  const setTheme = (t: EmailTheme) => (isAuto ? setAutoTheme(t) : setAlertTheme(t));

  const cardRadius = isAuto ? autoCardRadius : alertCardRadius;
  const setCardRadius = (r: number) => (isAuto ? setAutoCardRadius(r) : setAlertCardRadius(r));

  const blocks = isAuto ? autoBlocks : alertBlocks;
  const setBlocks = (valOrFn: EmailBlock[] | ((prev: EmailBlock[]) => EmailBlock[])) => {
    if (isAuto) {
      setAutoBlocks(valOrFn);
    } else {
      setAlertBlocks(valOrFn);
    }
  };

  const selectedBlockId = isAuto ? autoSelectedBlockId : alertSelectedBlockId;
  const setSelectedBlockId = (id: string | null) =>
    isAuto ? setAutoSelectedBlockId(id) : setAlertSelectedBlockId(id);

  // Selected block reference
  const selectedBlock = useMemo(() => {
    return blocks.find((b) => b.id === selectedBlockId) || null;
  }, [blocks, selectedBlockId]);

  // Compiled full HTML email string for Auto-Responder
  const compiledAutoHtml = useMemo(() => {
    return compileBulletproofHtmlEmail(autoBlocks, autoTheme, autoCardRadius, site);
  }, [autoBlocks, autoTheme, autoCardRadius, site]);

  // Compiled full HTML email string for Submission Alert
  const compiledAlertHtml = useMemo(() => {
    return compileBulletproofHtmlEmail(alertBlocks, alertTheme, alertCardRadius, site);
  }, [alertBlocks, alertTheme, alertCardRadius, site]);

  // Compiled blocks HTML for currently selected template
  const compiledBlocksHtml = isAuto ? compiledAutoHtml : compiledAlertHtml;

  // Active output HTML (Raw code if in custom_html mode, else compiled visual blocks)
  const activeOutputHtml = useMemo(() => {
    return editorMode === 'custom_html' ? customHtml : compiledBlocksHtml;
  }, [editorMode, customHtml, compiledBlocksHtml]);

  // Handle Preset Switching
  const handleApplyPreset = (presetId: string) => {
    if (isAuto) {
      const newBlocks = createPresetBlocks(presetId, site);
      setAutoBlocks(newBlocks);
      setAutoSelectedBlockId(newBlocks[0]?.id || null);

      if (presetId === 'dark_executive') {
        setAutoTheme('executive_dark');
      } else if (presetId === 'next_steps') {
        setAutoTheme('emerald_glow');
      } else {
        setAutoTheme('clean_light');
      }
    } else {
      const newBlocks = createAlertPresetBlocks(presetId, site);
      setAlertBlocks(newBlocks);
      setAlertSelectedBlockId(newBlocks[0]?.id || null);
      setAlertTheme('clean_light');
    }
  };

  // Convert current visual blocks to custom HTML
  const handleConvertBlocksToHtml = () => {
    setCustomHtml(compiledBlocksHtml);
    setEditorMode('custom_html');
  };

  // Reset custom HTML to starter boilerplate
  const handleResetStarterHtml = () => {
    if (isAuto) {
      setAutoCustomHtml(getDefaultStarterHtml(site));
    } else {
      setAlertCustomHtml(getDefaultSubmissionAlertStarterHtml(site));
    }
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
          alignment: isAuto ? 'center' : 'left',
        };
        break;
      case 'heading':
        newBlock = {
          id: newId,
          type: 'heading',
          title: isAuto ? 'Special Update' : 'New Form Submission',
          alignment: isAuto ? 'center' : 'left',
        };
        break;
      case 'text':
        newBlock = {
          id: newId,
          type: 'text',
          text: isAuto
            ? 'Hi {{name}},\n\nHere is an update regarding your request on {{domain}}.'
            : 'A new form submission was recorded on {{domain}}.',
          alignment: 'left',
        };
        break;
      case 'image':
        newBlock = {
          id: newId,
          type: 'image',
          imageUrl:
            'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80',
          imageAlt: 'Visual Banner',
          imageWidth: 540,
          imageBorderRadius: 8,
          alignment: 'center',
        };
        break;
      case 'summary_table':
        newBlock = {
          id: newId,
          type: 'summary_table',
          title: isAuto ? 'Submitted Details' : 'Form Submission Details',
        };
        break;
      case 'button':
        newBlock = {
          id: newId,
          type: 'button',
          buttonText: isAuto ? `Visit ${site.domain} →` : 'View in EntryWise →',
          buttonUrl: isAuto ? `https://${site.domain}` : 'https://app.entrywise.webbound.in',
          buttonBg: '#10b981',
          buttonTextColor: '#ffffff',
          buttonRadius: 8,
          alignment: isAuto ? 'center' : 'left',
        };
        break;
      case 'callout':
        newBlock = {
          id: newId,
          type: 'callout',
          calloutType: 'info',
          calloutText: isAuto
            ? 'Notice: Please allow up to 24 hours for review.'
            : '⚡ Instant Alert: Form response captured in real-time.',
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
          alignment: isAuto ? 'center' : 'left',
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

  const handleInsertRawHtmlVariable = (variableToken: string) => {
    setCustomHtml((prev) => `${prev} ${variableToken}`);
  };

  // Save Both Email Templates to Backend
  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage(null);

    const configPayload: SiteEmailTemplatesConfig = {
      autoResponder: {
        mode: autoMode,
        theme: autoTheme,
        blocks: autoBlocks,
        cardRadius: autoCardRadius,
        customHtml: autoCustomHtml,
        compiledHtml: compiledAutoHtml,
        subject: autoSubject,
      },
      submissionAlert: {
        mode: alertMode,
        theme: alertTheme,
        blocks: alertBlocks,
        cardRadius: alertCardRadius,
        customHtml: alertCustomHtml,
        compiledHtml: compiledAlertHtml,
        subject: alertSubject,
      },
      // Backwards compatibility mirror
      mode: autoMode,
      theme: autoTheme,
      blocks: autoBlocks,
      cardRadius: autoCardRadius,
      customHtml: autoCustomHtml,
    };

    const autoResponderCompiled = autoMode === 'custom_html' ? autoCustomHtml : compiledAutoHtml;

    try {
      const updated = await api.updateSite(site.id, {
        notify_on_submission: notifyOnSubmission,
        notification_emails: notificationEmails.trim() || null,
        auto_responder_enabled: autoResponderEnabled,
        auto_responder_subject: autoSubject.trim() || null,
        auto_responder_body: autoResponderCompiled,
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

  // Send Live Test Email
  const handleSendTestEmail = async () => {
    if (!testEmailRecipient?.includes('@')) {
      setTestEmailError('Please enter a valid recipient email address');
      return;
    }

    setIsSendingTestEmail(true);
    setTestEmailError(null);
    setTestEmailSuccess(null);

    const isTestingAuto = testEmailTarget === 'auto_responder';
    const targetMode = isTestingAuto ? autoMode : alertMode;
    const targetBlocks = isTestingAuto ? autoBlocks : alertBlocks;
    const targetTheme = isTestingAuto ? autoTheme : alertTheme;
    const targetRadius = isTestingAuto ? autoCardRadius : alertCardRadius;
    const targetCustomHtml = isTestingAuto ? autoCustomHtml : alertCustomHtml;
    const targetSubject = isTestingAuto ? autoSubject : alertSubject;

    const activeHtml =
      targetMode === 'custom_html'
        ? targetCustomHtml
        : compileBulletproofHtmlEmail(targetBlocks, targetTheme, targetRadius, site);

    try {
      const res = await api.testSiteEmail(site.id, {
        recipient_email: testEmailRecipient.trim(),
        template_type: testEmailTarget,
        custom_subject: targetSubject.trim(),
        custom_html: activeHtml,
      });

      setTestEmailSuccess(
        res.message || `Test email dispatched successfully to ${testEmailRecipient}!`
      );
    } catch (err: unknown) {
      console.error('Failed to send test email:', err);
      setTestEmailError(err instanceof Error ? err.message : 'Failed to send test email');
    } finally {
      setIsSendingTestEmail(false);
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
    link.download = `email-template-${activeTemplate}-${site.domain}.html`;
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
        .replace(
          /{{\s*date\s*}}/gi,
          new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        )
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
            Build custom auto-responder receipts and team alerts with images, visual blocks, or
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

          {/* Send Test Email Button */}
          <button
            type="button"
            onClick={() => {
              setTestEmailTarget(activeTemplate);
              setTestEmailRecipient(site.admin_email || '');
              setTestEmailSuccess(null);
              setTestEmailError(null);
              setTestEmailModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800/90 hover:bg-zinc-700 text-white font-medium text-xs border border-white/[0.1] transition shadow-sm"
          >
            <Send className="w-3.5 h-3.5 text-emerald-400" />
            <span>Send Test Email</span>
          </button>

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
      {/* PRIMARY DUAL TEMPLATE SWITCHER (AUTO-RESPONDER VS MAIN SUBMISSION ALERT)  */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border border-white/[0.08] bg-[#0d0e13]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-white">Active Template in Editor</div>
            <div className="text-[11px] text-zinc-400">
              {isAuto
                ? 'Editing confirmation receipt sent automatically to form submitters'
                : 'Editing real-time alert sent to your team or admin inbox on new submissions'}
            </div>
          </div>
        </div>

        <div className="flex items-center bg-[#070709] p-1 rounded-xl border border-white/[0.08]">
          <button
            type="button"
            onClick={() => setActiveTemplate('auto_responder')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
              isAuto
                ? 'bg-emerald-500/20 text-emerald-400 font-semibold shadow-sm border border-emerald-500/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Auto-Responder (Submitter)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTemplate('submission_alert')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
              !isAuto
                ? 'bg-emerald-500/20 text-emerald-400 font-semibold shadow-sm border border-emerald-500/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>Submission Alert (Team)</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: STUDIO & LIVE PREVIEW (WITH MODE SWITCHER)                       */}
      {/* ========================================================================= */}
      {activeSubTab === 'studio' && (
        <div className="space-y-6">
          {/* Top Control Bar: Active Toggle + Mode Selector + Subject Line */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 rounded-2xl border border-white/[0.08] bg-[#121318]">
            {/* Delivery Enable/Disable Toggle for active template */}
            <div className="lg:col-span-3 flex items-center justify-between p-3 rounded-xl border border-white/[0.06] bg-[#0c0d10]">
              <div>
                <div className="text-xs font-semibold text-white">
                  {isAuto ? 'Auto-Responder' : 'Team Alert'}
                </div>
                <div className="text-[10px] text-zinc-400">
                  {isAuto ? 'Send receipt to submitter' : 'Notify team on entry'}
                </div>
              </div>
              <label
                htmlFor="toggle-template-enabled"
                className="relative inline-flex items-center cursor-pointer"
              >
                <input
                  id="toggle-template-enabled"
                  type="checkbox"
                  checked={isAuto ? autoResponderEnabled : notifyOnSubmission}
                  onChange={(e) =>
                    isAuto
                      ? setAutoResponderEnabled(e.target.checked)
                      : setNotifyOnSubmission(e.target.checked)
                  }
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
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={
                  isAuto
                    ? 'We received your message — {{domain}}'
                    : 'New Form Submission: {{domain}} — #{{submission_id}}'
                }
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
                  {(isAuto
                    ? [
                        { id: 'modern_receipt', label: 'Receipt' },
                        { id: 'minimal_letter', label: 'Minimal' },
                        { id: 'next_steps', label: 'Next Steps' },
                        { id: 'dark_executive', label: 'Dark Executive' },
                      ]
                    : [
                        { id: 'alert_executive', label: 'Executive Alert' },
                        { id: 'alert_banner_hero', label: 'Hero Banner Alert' },
                        { id: 'alert_compact', label: 'Compact Alert' },
                      ]
                  ).map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleApplyPreset(preset.id)}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium border border-white/[0.06] bg-[#0c0d10] text-zinc-300 hover:text-white hover:border-emerald-500/40 transition"
                    >
                      {preset.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleConvertBlocksToHtml}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition ml-2"
                  >
                    <Code2 className="w-3 h-3" />
                    <span>Convert to Raw HTML</span>
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

                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { type: 'header' as EmailBlockType, label: 'Logo / Header', icon: Heading },
                        { type: 'heading' as EmailBlockType, label: 'Title', icon: Type },
                        { type: 'image' as EmailBlockType, label: 'Banner / Image', icon: Image },
                        { type: 'text' as EmailBlockType, label: 'Text Copy', icon: MessageSquare },
                        {
                          type: 'summary_table' as EmailBlockType,
                          label: 'Form Table',
                          icon: Table,
                        },
                        {
                          type: 'button' as EmailBlockType,
                          label: 'Button CTA',
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
                              className="flex items-center gap-2 flex-1 min-w-0 text-left bg-transparent border-0 p-0 cursor-pointer"
                            >
                              <span className="cursor-grab text-zinc-600 hover:text-zinc-400">
                                <GripVertical className="w-3.5 h-3.5" />
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-zinc-400 uppercase">
                                {block.type}
                              </span>
                              <span className="text-xs font-medium text-zinc-200 truncate">
                                {block.type === 'header' &&
                                  (block.logoUrl
                                    ? 'Header (Logo Image)'
                                    : block.companyName || 'Header')}
                                {block.type === 'heading' && (block.title || 'Heading')}
                                {block.type === 'text' && (block.text?.slice(0, 24) || 'Text')}
                                {block.type === 'image' &&
                                  (block.imageAlt || 'Banner / Custom Image')}
                                {block.type === 'summary_table' &&
                                  (block.title || 'Form Data Table')}
                                {block.type === 'button' && (block.buttonText || 'Button')}
                                {block.type === 'callout' && (block.calloutText || 'Callout')}
                                {block.type === 'divider' && 'Divider Line'}
                                {block.type === 'footer' && 'Footer Text'}
                              </span>
                            </button>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleMoveBlock(index, 'up')}
                                disabled={index === 0}
                                className="p-1 text-zinc-500 hover:text-white disabled:opacity-20 transition"
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveBlock(index, 'down')}
                                disabled={index === blocks.length - 1}
                                className="p-1 text-zinc-500 hover:text-white disabled:opacity-20 transition"
                              >
                                ↓
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteBlock(block.id)}
                                className="p-1 text-zinc-500 hover:text-red-400 transition"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  {/* Inspector Panel */}
                  {selectedBlock && (
                    <div className="p-4 rounded-2xl border border-white/[0.08] bg-[#121318] space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase font-semibold">
                            {selectedBlock.type}
                          </span>
                          <span className="text-xs font-semibold text-white">Block Properties</span>
                        </div>
                        {/* Alignment picker */}
                        <div className="flex items-center bg-[#0a0a0d] p-0.5 rounded-lg border border-white/[0.06]">
                          {(['left', 'center', 'right'] as const).map((align) => (
                            <button
                              key={align}
                              type="button"
                              onClick={() =>
                                handleUpdateBlock(selectedBlock.id, { alignment: align })
                              }
                              className={`p-1 rounded text-zinc-400 hover:text-white ${
                                (selectedBlock.alignment || 'left') === align
                                  ? 'bg-white/[0.1] text-white'
                                  : ''
                              }`}
                            >
                              {align === 'left' && <AlignLeft className="w-3 h-3" />}
                              {align === 'center' && <AlignCenter className="w-3 h-3" />}
                              {align === 'right' && <AlignRight className="w-3 h-3" />}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Header Block Inspector */}
                      {selectedBlock.type === 'header' && (
                        <div className="space-y-3">
                          <div>
                            <label
                              htmlFor="header-company-input"
                              className="block text-[11px] text-zinc-400 mb-1"
                            >
                              Brand / Company Name
                            </label>
                            <input
                              id="header-company-input"
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
                          {selectedBlock.logoUrl && (
                            <div className="p-2 rounded-lg bg-[#0c0d10] border border-white/[0.06] flex items-center gap-3">
                              <img
                                src={selectedBlock.logoUrl}
                                alt="Logo Preview"
                                className="h-8 max-w-[120px] object-contain"
                              />
                              <span className="text-[10px] text-zinc-400">Logo Image Active</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Image Block Inspector */}
                      {selectedBlock.type === 'image' && (
                        <div className="space-y-3">
                          <div>
                            <label
                              htmlFor="image-src-input"
                              className="block text-[11px] text-zinc-400 mb-1"
                            >
                              Banner / Image URL
                            </label>
                            <input
                              id="image-src-input"
                              type="url"
                              value={selectedBlock.imageUrl || ''}
                              onChange={(e) =>
                                handleUpdateBlock(selectedBlock.id, { imageUrl: e.target.value })
                              }
                              placeholder="https://example.com/banner.jpg"
                              className="w-full bg-[#0a0a0d] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white"
                            />
                          </div>
                          {selectedBlock.imageUrl && (
                            <div className="p-2 rounded-lg bg-[#0c0d10] border border-white/[0.06] overflow-hidden">
                              <img
                                src={selectedBlock.imageUrl}
                                alt={selectedBlock.imageAlt || 'Banner'}
                                className="w-full h-24 object-cover rounded-md"
                              />
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label
                                htmlFor="image-alt-input"
                                className="block text-[11px] text-zinc-400 mb-1"
                              >
                                Alt Text
                              </label>
                              <input
                                id="image-alt-input"
                                type="text"
                                value={selectedBlock.imageAlt || ''}
                                onChange={(e) =>
                                  handleUpdateBlock(selectedBlock.id, { imageAlt: e.target.value })
                                }
                                placeholder="Banner description"
                                className="w-full bg-[#0a0a0d] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white"
                              />
                            </div>
                            <div>
                              <label
                                htmlFor="image-width-input"
                                className="block text-[11px] text-zinc-400 mb-1"
                              >
                                Max Width ({selectedBlock.imageWidth || 540}px)
                              </label>
                              <input
                                id="image-width-input"
                                type="range"
                                min={120}
                                max={540}
                                step={10}
                                value={selectedBlock.imageWidth || 540}
                                onChange={(e) =>
                                  handleUpdateBlock(selectedBlock.id, {
                                    imageWidth: Number(e.target.value),
                                  })
                                }
                                className="w-full accent-emerald-500"
                              />
                            </div>
                          </div>
                          <div>
                            <label
                              htmlFor="image-link-input"
                              className="block text-[11px] text-zinc-400 mb-1"
                            >
                              Click Destination Link (Optional)
                            </label>
                            <input
                              id="image-link-input"
                              type="url"
                              value={selectedBlock.imageLink || ''}
                              onChange={(e) =>
                                handleUpdateBlock(selectedBlock.id, { imageLink: e.target.value })
                              }
                              placeholder="https://example.com/promo"
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
                              placeholder="Confirmation receipt"
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
                              <div className="flex items-center gap-2">
                                <input
                                  id="btn-bg-input"
                                  type="color"
                                  value={selectedBlock.buttonBg || '#10b981'}
                                  onChange={(e) =>
                                    handleUpdateBlock(selectedBlock.id, {
                                      buttonBg: e.target.value,
                                    })
                                  }
                                  className="w-7 h-7 rounded border border-white/[0.08] bg-transparent cursor-pointer"
                                />
                                <span className="text-xs font-mono text-zinc-300">
                                  {selectedBlock.buttonBg || '#10b981'}
                                </span>
                              </div>
                            </div>
                            <div>
                              <label
                                htmlFor="btn-radius-input"
                                className="block text-[11px] text-zinc-400 mb-1"
                              >
                                Corner Radius ({selectedBlock.buttonRadius || 8}px)
                              </label>
                              <input
                                id="btn-radius-input"
                                type="range"
                                min={0}
                                max={24}
                                value={selectedBlock.buttonRadius || 8}
                                onChange={(e) =>
                                  handleUpdateBlock(selectedBlock.id, {
                                    buttonRadius: Number(e.target.value),
                                  })
                                }
                                className="w-full accent-emerald-500"
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
                            title={t.label}
                          />
                        ))}
                      </div>

                      {/* Card Radius Slider */}
                      <div className="hidden sm:flex items-center gap-1.5 text-zinc-400 text-[10px] pl-2 border-l border-white/[0.08]">
                        <span>Radius:</span>
                        <input
                          type="range"
                          min={0}
                          max={24}
                          value={cardRadius}
                          onChange={(e) => setCardRadius(Number(e.target.value))}
                          className="w-14 accent-emerald-500 cursor-pointer"
                          title={`Card Radius: ${cardRadius}px`}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSimulateVariables((prev) => !prev)}
                        className={`text-[10px] px-2 py-1 rounded-lg border transition ${
                          simulateVariables
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-white/[0.04] text-zinc-400 border-white/[0.06]'
                        }`}
                      >
                        {simulateVariables ? 'Variables Active' : 'Raw Tags'}
                      </button>

                      <div className="flex items-center bg-[#0a0a0d] p-0.5 rounded-lg border border-white/[0.06]">
                        <button
                          type="button"
                          onClick={() => setPreviewDevice('desktop')}
                          className={`p-1.5 rounded text-zinc-400 hover:text-white ${
                            previewDevice === 'desktop' ? 'bg-white/[0.1] text-white' : ''
                          }`}
                          title="Desktop View"
                        >
                          <Monitor className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewDevice('mobile')}
                          className={`p-1.5 rounded text-zinc-400 hover:text-white ${
                            previewDevice === 'mobile' ? 'bg-white/[0.1] text-white' : ''
                          }`}
                          title="Mobile View"
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Simulator Canvas Frame */}
                  <div
                    className="p-6 rounded-2xl border border-white/[0.08] transition-all flex justify-center overflow-x-auto min-h-[580px]"
                    style={{
                      backgroundColor:
                        theme === 'clean_light'
                          ? '#f1f5f9'
                          : theme === 'emerald_glow'
                            ? '#090a0f'
                            : theme === 'indigo_slate'
                              ? '#0c0e17'
                              : '#09090b',
                    }}
                  >
                    <div
                      className={`transition-all duration-200 border shadow-xl overflow-hidden ${
                        previewDevice === 'mobile' ? 'w-[360px]' : 'w-full max-w-[560px]'
                      }`}
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

                            {block.type === 'image' && (
                              <div className={`px-6 py-2 text-${align}`}>
                                {block.imageUrl ? (
                                  <img
                                    src={block.imageUrl}
                                    alt={block.imageAlt || 'Banner'}
                                    className="inline-block max-w-full h-auto object-cover"
                                    style={{
                                      width: block.imageWidth ? `${block.imageWidth}px` : '100%',
                                      borderRadius: `${
                                        block.imageBorderRadius !== undefined
                                          ? block.imageBorderRadius
                                          : 8
                                      }px`,
                                    }}
                                  />
                                ) : (
                                  <div className="p-8 border-2 border-dashed border-zinc-600/50 rounded-xl text-center text-xs text-zinc-400">
                                    <Image className="w-6 h-6 mx-auto mb-2 opacity-50" />
                                    Click to set Image URL in the inspector
                                  </div>
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
                              <div className="px-6 py-2">
                                {block.title && (
                                  <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                                    {block.title}
                                  </div>
                                )}
                                <div className="border border-zinc-200 dark:border-white/[0.08] rounded-lg overflow-hidden text-xs">
                                  <div className="flex border-b border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-white/[0.03] p-2.5">
                                    <span className="w-1/3 font-semibold text-zinc-500 dark:text-zinc-400">
                                      Name
                                    </span>
                                    <span className="text-zinc-900 dark:text-zinc-100 font-medium">
                                      Alex Taylor
                                    </span>
                                  </div>
                                  <div className="flex border-b border-zinc-200 dark:border-white/[0.08] p-2.5">
                                    <span className="w-1/3 font-semibold text-zinc-500 dark:text-zinc-400">
                                      Email
                                    </span>
                                    <span className="text-zinc-900 dark:text-zinc-100 font-medium">
                                      alex.taylor@example.com
                                    </span>
                                  </div>
                                  <div className="flex p-2.5">
                                    <span className="w-1/3 font-semibold text-zinc-500 dark:text-zinc-400">
                                      Message
                                    </span>
                                    <span className="text-zinc-900 dark:text-zinc-100 font-medium leading-relaxed">
                                      We are interested in discussing partnership and enterprise
                                      licensing.
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {block.type === 'button' && (
                              <div className={`px-6 py-3 text-${align}`}>
                                <span
                                  className="inline-block px-5 py-2 font-semibold text-xs transition"
                                  style={{
                                    backgroundColor: block.buttonBg || '#10b981',
                                    color: block.buttonTextColor || '#ffffff',
                                    borderRadius: `${block.buttonRadius ?? 8}px`,
                                  }}
                                >
                                  {block.buttonText || 'Click Here'}
                                </span>
                              </div>
                            )}

                            {block.type === 'divider' && (
                              <div className="px-6">
                                <hr
                                  style={{
                                    borderColor: block.dividerColor || '#e2e8f0',
                                    margin: `${(block.dividerHeight || 20) / 2}px 0`,
                                  }}
                                />
                              </div>
                            )}

                            {block.type === 'footer' && (
                              <div
                                className={`px-6 py-4 text-[10px] border-t text-${align}`}
                                style={{
                                  borderColor:
                                    theme === 'clean_light'
                                      ? '#f1f5f9'
                                      : 'rgba(255, 255, 255, 0.08)',
                                  color: theme === 'clean_light' ? '#94a3b8' : '#71717a',
                                }}
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
          ) : (
            /* ================================================================= */
            /* MODE B: DIRECT CUSTOM HTML CODE EDITOR                            */
            /* ================================================================= */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Code Editor & Variables Chips (6 cols) */}
              <div className="lg:col-span-6 space-y-4">
                <div className="p-4 rounded-2xl border border-white/[0.08] bg-[#121318] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                      <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Custom Raw HTML Source</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleResetStarterHtml}
                      className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1 transition"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset Starter Template</span>
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                      Insert Variables:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { token: '{{name}}', label: 'Submitter Name' },
                        { token: '{{email}}', label: 'Submitter Email' },
                        { token: '{{formData}}', label: 'Submission Data Table' },
                        { token: '{{domain}}', label: 'Site Domain' },
                        { token: '{{company}}', label: 'Company Name' },
                        { token: '{{submission_id}}', label: 'Submission ID' },
                        { token: '{{date}}', label: 'Submission Date' },
                      ].map((chip) => (
                        <button
                          key={chip.token}
                          type="button"
                          onClick={() => handleInsertRawHtmlVariable(chip.token)}
                          className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/[0.04] text-zinc-300 border border-white/[0.08] hover:border-emerald-500/40 hover:text-emerald-400 transition"
                        >
                          +{chip.token}
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    rows={22}
                    value={customHtml}
                    onChange={(e) => setCustomHtml(e.target.value)}
                    className="w-full bg-[#090a0f] border border-white/[0.08] rounded-xl p-3 text-xs font-mono text-zinc-200 leading-relaxed focus:outline-none focus:border-emerald-500/50 resize-y"
                    placeholder="<!DOCTYPE html><html><body>...</body></html>"
                    spellCheck={false}
                  />
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 px-1">
                    <span>Lines: {customHtml.split('\n').length}</span>
                    <span>Characters: {customHtml.length}</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Sandboxed Live Preview (6 cols) */}
              <div className="lg:col-span-6 space-y-4">
                <div className="flex items-center justify-between p-3 rounded-2xl border border-white/[0.08] bg-[#121318]">
                  <span className="text-xs font-semibold text-zinc-200">
                    Live HTML Render Simulator
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSimulateVariables((prev) => !prev)}
                      className={`text-[10px] px-2 py-1 rounded-lg border transition ${
                        simulateVariables
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-white/[0.04] text-zinc-400 border-white/[0.06]'
                      }`}
                    >
                      {simulateVariables ? 'Variables Replaced' : 'Raw Tags'}
                    </button>
                    <div className="flex items-center bg-[#0a0a0d] p-0.5 rounded-lg border border-white/[0.06]">
                      <button
                        type="button"
                        onClick={() => setPreviewDevice('desktop')}
                        className={`p-1.5 rounded text-zinc-400 hover:text-white ${
                          previewDevice === 'desktop' ? 'bg-white/[0.1] text-white' : ''
                        }`}
                        title="Desktop View"
                      >
                        <Monitor className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewDevice('mobile')}
                        className={`p-1.5 rounded text-zinc-400 hover:text-white ${
                          previewDevice === 'mobile' ? 'bg-white/[0.1] text-white' : ''
                        }`}
                        title="Mobile View"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-white/[0.08] bg-[#0c0d10] flex justify-center">
                  <div
                    className={`transition-all duration-200 border border-white/[0.08] rounded-xl overflow-hidden bg-white shadow-xl ${
                      previewDevice === 'mobile' ? 'w-[360px]' : 'w-full'
                    }`}
                  >
                    <iframe
                      title="HTML Email Preview"
                      srcDoc={simulateText(customHtml)}
                      className="w-full h-[520px] border-0"
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
      {/* VIEW 2: HTML EXPORT & INSPECTOR                                          */}
      {/* ========================================================================= */}
      {activeSubTab === 'html' && (
        <div className="p-6 rounded-2xl border border-white/[0.08] bg-[#121318] space-y-4 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Compiled Output HTML ({isAuto ? 'Auto-Responder' : 'Submission Alert'})
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Ready for production delivery with bulletproof table scaffolding.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyHtml}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-medium transition"
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

      {/* ========================================================================= */}
      {/* SEND TEST EMAIL MODAL                                                     */}
      {/* ========================================================================= */}
      {testEmailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-[#121318] border border-white/[0.12] rounded-2xl shadow-2xl p-6 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Send Test Email</h3>
                  <p className="text-[11px] text-zinc-400">
                    Verify images, typography, and variables in a real inbox
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTestEmailModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Template Chooser */}
            <div className="space-y-1.5">
              <span className="block text-[11px] font-semibold text-zinc-300">
                Template to Test
              </span>
              <div className="grid grid-cols-2 gap-2 bg-[#0a0a0d] p-1 rounded-xl border border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setTestEmailTarget('auto_responder')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium text-center transition ${
                    testEmailTarget === 'auto_responder'
                      ? 'bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Auto-Responder
                </button>
                <button
                  type="button"
                  onClick={() => setTestEmailTarget('submission_alert')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium text-center transition ${
                    testEmailTarget === 'submission_alert'
                      ? 'bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Submission Alert
                </button>
              </div>
            </div>

            {/* Recipient Input */}
            <div className="space-y-1.5">
              <label
                htmlFor="test-email-recipient"
                className="block text-[11px] font-semibold text-zinc-300"
              >
                Recipient Email Address
              </label>
              <input
                id="test-email-recipient"
                type="email"
                value={testEmailRecipient}
                onChange={(e) => setTestEmailRecipient(e.target.value)}
                placeholder="developer@example.com"
                className="w-full bg-[#0a0a0d] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            {/* Notice Callout */}
            <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/[0.06] text-[11px] text-zinc-400 space-y-1">
              <div className="text-zinc-300 font-medium flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Live Rendering Preview</span>
              </div>
              <p>
                Dispatches a live message to your real inbox with sample fields (
                <code>&#123;&#123;name&#125;&#125;</code>,{' '}
                <code>&#123;&#123;formData&#125;&#125;</code>, images, and logos) using your
                workspace&apos;s configured email provider.
              </p>
            </div>

            {testEmailSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{testEmailSuccess}</span>
              </div>
            )}

            {testEmailError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <Trash2 className="w-4 h-4 shrink-0" />
                <span>{testEmailError}</span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTestEmailModalOpen(false)}
                className="px-3.5 py-2 rounded-xl text-xs text-zinc-400 hover:text-white hover:bg-white/[0.06] transition"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSendTestEmail}
                disabled={isSendingTestEmail || !testEmailRecipient}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                {isSendingTestEmail ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    <span>Sending Test...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-black" />
                    <span>Send Test Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
