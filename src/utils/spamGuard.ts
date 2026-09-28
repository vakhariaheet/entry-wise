/**
 * Security & Anti-Spam utilities for form submission processing
 */

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  '10minutemail.com',
  '10minutemail.net',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.org',
  'guerrillamailblock.com',
  'sharklasers.com',
  'grr.la',
  'tempmail.com',
  'temp-mail.org',
  'temp-mail.io',
  'tempmailo.com',
  'mailinator.com',
  'trashmail.com',
  'trashmail.net',
  'throwawaymail.com',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
  'getnada.com',
  'dispostable.com',
  'mytemp.email',
  'fakeinbox.com',
  'tempail.com',
  'mohmal.com',
  'burnermail.io',
  'crazymailing.com',
  'inboxbear.com',
  'generator.email',
  'emailondeck.com',
  'maildrop.cc',
  'nada.ltd',
  'fakemailgenerator.com',
  'minutemail.com',
  'inboxkitten.com',
]);

/**
 * Checks whether an email address belongs to a known temporary/disposable email provider
 */
export function isDisposableEmail(email: string): boolean {
  if (!email?.includes('@')) return false;
  const domain = email.split('@')[1]?.toLowerCase().trim();
  if (!domain) return false;
  return DISPOSABLE_EMAIL_DOMAINS.has(domain);
}

/**
 * Checks submitted fields against a customer-configured spam keyword or regex blacklist
 */
export function containsSpamKeywords(
  fields: Record<string, string>,
  spamKeywordsRaw?: string | null
): { isSpam: boolean; matchedKeyword?: string } {
  if (!spamKeywordsRaw?.trim()) {
    return { isSpam: false };
  }

  const keywords = spamKeywordsRaw
    .split(',')
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);

  if (keywords.length === 0) {
    return { isSpam: false };
  }

  for (const [_, val] of Object.entries(fields)) {
    if (!val || typeof val !== 'string') continue;
    const lowerVal = val.toLowerCase();
    for (const kw of keywords) {
      if (lowerVal.includes(kw)) {
        return { isSpam: true, matchedKeyword: kw };
      }
    }
  }

  return { isSpam: false };
}

/**
 * Anonymizes an IP address for GDPR compliance (zeroes out the host portion)
 */
export function anonymizeIpAddress(ip: string): string {
  if (!ip || ip === 'unknown') return '0.0.0.0';

  // IPv4: Zero last octet (e.g. 192.0.2.123 -> 192.0.2.0)
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length === 4) {
      parts[3] = '0';
      return parts.join('.');
    }
  }

  // IPv6: Keep first 3 groups (e.g. 2001:db8:abcd::)
  if (ip.includes(':')) {
    const parts = ip.split(':');
    return `${parts.slice(0, 3).join(':')}::`;
  }

  return '0.0.0.0';
}
