/**
 * SSRF Guard: Validates that target URLs are valid HTTP(S) and not pointing to internal/private IPs or metadata services
 */
export function isSafeExternalUrl(urlStr: string): boolean {
    try {
        const parsed = new URL(urlStr);

        // Only allow http and https
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return false;
        }

        const hostname = parsed.hostname.toLowerCase();

        // Disallow localhost and loopbacks
        if (
            hostname === 'localhost' ||
            hostname === '127.0.0.1' ||
            hostname === '0.0.0.0' ||
            hostname === '::1' ||
            hostname.endsWith('.localhost')
        ) {
            return false;
        }

        // Disallow AWS/GCP/Azure link-local metadata IP
        if (hostname === '169.254.169.254' || hostname.startsWith('169.254.')) {
            return false;
        }

        // IPv4 regex check
        const ipv4Match = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
        if (ipv4Match) {
            const octets = ipv4Match.slice(1, 5).map(Number);
            if (octets.some(o => o < 0 || o > 255)) return false;

            // 10.0.0.0/8 (Private-Use Networks)
            if (octets[0] === 10) return false;

            // 172.16.0.0/12 (Private-Use Networks)
            if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return false;

            // 192.168.0.0/16 (Private-Use Networks)
            if (octets[0] === 192 && octets[1] === 168) return false;

            // 127.0.0.0/8 (Loopback)
            if (octets[0] === 127) return false;

            // 0.0.0.0/8 (Current network)
            if (octets[0] === 0) return false;
        }

        return true;
    } catch {
        return false;
    }
}
