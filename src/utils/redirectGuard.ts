/**
 * Validates a redirect URL against the site's domain and allowed origins.
 * Allows safe relative paths (e.g., '/thank-you') and prevents Open Redirect attacks.
 */
export function validateRedirectUrl(
    redirectUrl: string | undefined | null,
    siteDomain: string,
    allowedOrigins?: string | null
): string | null {
    if (!redirectUrl || typeof redirectUrl !== 'string') return null;

    const trimmed = redirectUrl.trim();
    if (!trimmed) return null;

    // 1. Safe relative paths (starts with single '/' and not protocol-relative '//')
    if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
        return trimmed;
    }

    // 2. Absolute URL check
    try {
        const url = new URL(trimmed);

        // Only allow http/https
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            return null;
        }

        const targetHostname = url.hostname.toLowerCase().replace(/^www\./, '');
        const cleanSiteDomain = siteDomain.toLowerCase().trim().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/.*$/, '');

        // Match site domain or subdomain
        if (targetHostname === cleanSiteDomain || targetHostname.endsWith(`.${cleanSiteDomain}`)) {
            return url.toString();
        }

        // Match localhost / dev
        if (targetHostname === 'localhost' || targetHostname === '127.0.0.1') {
            return url.toString();
        }

        // Match any allowed origins list if provided (comma-separated or wildcard '*')
        if (allowedOrigins) {
            const origins = allowedOrigins.split(',').map(o => o.trim().toLowerCase());
            if (origins.includes('*')) {
                return url.toString();
            }
            for (const origin of origins) {
                try {
                    const originHost = (origin.startsWith('http') ? new URL(origin).hostname : origin).replace(/^www\./, '');
                    if (targetHostname === originHost || targetHostname.endsWith(`.${originHost}`)) {
                        return url.toString();
                    }
                } catch {
                    // Ignore malformed allowed origin entries
                }
            }
        }

        return null;
    } catch {
        return null;
    }
}
