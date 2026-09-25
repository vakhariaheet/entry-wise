import { describe, it, expect } from 'bun:test';
import { escapeHtml } from '../src/utils/escapeHtml';
import { isSafeExternalUrl } from '../src/utils/ssrf';
import { validateRedirectUrl } from '../src/utils/redirectGuard';
import { renderFormSubmissionEmail } from '../src/emails/FormSubmissionEmail';
import { renderAutoResponderEmail } from '../src/emails/AutoResponderEmail';

describe('Security: HTML Entity Escaping (Stored XSS Protection)', () => {
    it('escapes special characters correctly', () => {
        const payload = '<script>alert("xss")</script>&foo=\'bar\'';
        const escaped = escapeHtml(payload);
        expect(escaped).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;&amp;foo=&#39;bar&#39;');
    });

    it('handles null and undefined safely', () => {
        expect(escapeHtml(null)).toBe('');
        expect(escapeHtml(undefined)).toBe('');
    });

    it('sanitizes form fields in renderFormSubmissionEmail', () => {
        const emailHtml = renderFormSubmissionEmail({
            siteDomain: 'acme.com',
            formData: {
                message: '<img src=x onerror=alert(1)>',
                senderName: '<b>Hacker</b>',
            },
            companyName: 'Acme Corp',
        });

        expect(emailHtml).not.toContain('<img src=x onerror=alert(1)>');
        expect(emailHtml).toContain('&lt;img src=x onerror=alert(1)&gt;');
        expect(emailHtml).toContain('&lt;b&gt;Hacker&lt;/b&gt;');
    });

    it('sanitizes custom body in renderAutoResponderEmail', () => {
        const emailHtml = renderAutoResponderEmail({
            siteDomain: 'acme.com',
            companyName: 'Acme Corp',
            recipientName: '<script>evil()</script>',
            customBody: 'Welcome! <a href="javascript:alert(1)">Click here</a>',
        });

        expect(emailHtml).not.toContain('<script>evil()</script>');
        expect(emailHtml).not.toContain('<a href="javascript:');
        expect(emailHtml).toContain('&lt;script&gt;evil()&lt;/script&gt;');
        expect(emailHtml).toContain('&lt;a href=&quot;javascript:alert(1)&quot;&gt;');
    });
});

describe('Security: SSRF Prevention', () => {
    it('blocks loopback and localhost addresses', () => {
        expect(isSafeExternalUrl('http://localhost:8080/hook')).toBe(false);
        expect(isSafeExternalUrl('http://127.0.0.1/admin')).toBe(false);
        expect(isSafeExternalUrl('http://0.0.0.0:3000')).toBe(false);
        expect(isSafeExternalUrl('http://test.localhost/api')).toBe(false);
    });

    it('blocks cloud metadata IP (169.254.169.254)', () => {
        expect(isSafeExternalUrl('http://169.254.169.254/latest/meta-data')).toBe(false);
    });

    it('blocks RFC1918 private subnets', () => {
        expect(isSafeExternalUrl('http://10.0.0.1/internal')).toBe(false);
        expect(isSafeExternalUrl('http://172.16.0.5/api')).toBe(false);
        expect(isSafeExternalUrl('http://192.168.1.1/config')).toBe(false);
    });

    it('allows valid public webhook and connector URLs', () => {
        expect(isSafeExternalUrl('https://hooks.slack.com/services/T00/B00/X00')).toBe(true);
        expect(isSafeExternalUrl('https://discord.com/api/webhooks/123/abc')).toBe(true);
        expect(isSafeExternalUrl('https://script.google.com/macros/s/xyz/exec')).toBe(true);
        expect(isSafeExternalUrl('https://api.mycompany.com/webhook')).toBe(true);
    });
});

describe('Security: Open Redirect Guard', () => {
    it('permits safe relative redirect paths', () => {
        expect(validateRedirectUrl('/thank-you', 'acme.com')).toBe('/thank-you');
        expect(validateRedirectUrl('/success?ref=1', 'acme.com')).toBe('/success?ref=1');
    });

    it('blocks protocol-relative URL attempts', () => {
        expect(validateRedirectUrl('//evil-phishing-site.com', 'acme.com')).toBe(null);
    });

    it('allows absolute URLs matching the registered site domain', () => {
        expect(validateRedirectUrl('https://acme.com/thank-you', 'acme.com')).toBe('https://acme.com/thank-you');
        expect(validateRedirectUrl('https://sub.acme.com/confirmation', 'acme.com')).toBe('https://sub.acme.com/confirmation');
    });

    it('allows allowed_origins and wildcards', () => {
        expect(validateRedirectUrl('https://preview.vercel.app/done', 'acme.com', '*.vercel.app, preview.vercel.app')).toBe('https://preview.vercel.app/done');
        expect(validateRedirectUrl('https://anywhere.com/done', 'acme.com', '*')).toBe('https://anywhere.com/done');
    });

    it('rejects unverified external domains', () => {
        expect(validateRedirectUrl('https://phishing.com/steal-creds', 'acme.com')).toBe(null);
    });
});
