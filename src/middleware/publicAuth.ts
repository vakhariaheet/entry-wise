import { Context, Next } from 'hono';
import { Env } from '../types/env';
import { sendProblemDetails } from '../utils/sendResponse';
import { getConnInfo } from 'hono/cloudflare-workers';

/**
 * Middleware to verify domain and API key
 */
export const verifyDomain = async (c: Context<{ Bindings: Env }>, next: Next) => {
    try {
        const originHeader = c.req.header('Origin') || c.req.header('Referer');
        const apiKeyHeader = c.req.header('X-API-Key') || c.req.query('api_key');

        if (!apiKeyHeader) {
            return sendProblemDetails(
                c,
                401,
                'API key must be provided via the X-API-Key header or api_key query parameter'
            );
        }

        // Fetch site by API key
        const { results } = await c.env.DB.prepare(`
            SELECT id, company_id, domain FROM sites 
            WHERE api_key = ?
        `).bind(apiKeyHeader).all<{ id: string; company_id: string; domain: string }>();

        if (!results?.length) {
            return sendProblemDetails(c, 403, 'Invalid or unrecognized API key');
        }

        const site = results[0];

        // If Origin or Referer is sent by a browser, enforce domain matching
        if (originHeader) {
            try {
                const requestHostname = new URL(originHeader).hostname.toLowerCase();
                const siteHostname = site.domain
                    .toLowerCase()
                    .trim()
                    .replace(/^(https?:\/\/)?(www\.)?/, '')
                    .replace(/\/.*$/, '');
                const cleanRequestHost = requestHostname.replace(/^www\./, '');

                const isLocalhost = cleanRequestHost === 'localhost' || cleanRequestHost === '127.0.0.1';
                const matchesDomain = cleanRequestHost === siteHostname || cleanRequestHost.endsWith(`.${siteHostname}`);

                if (!matchesDomain && !isLocalhost) {
                    return sendProblemDetails(
                        c,
                        403,
                        `Submissions from origin '${originHeader}' are not authorized for domain '${site.domain}'`
                    );
                }
            } catch {
                return sendProblemDetails(c, 403, 'Invalid Origin or Referer header URL');
            }
        }

        c.set('site_id', site.id);
        c.set('company_id', site.company_id);
        await next();
    } catch (error) {
        console.error('Domain verification error:', error);
        return sendProblemDetails(c, 500, 'Internal error verifying domain and API key');
    }
};

/**
 * Rate limiting middleware using Cloudflare KV (50 requests/hour per site:IP)
 */
export const rateLimiter = async (c: Context<{ Bindings: Env }>, next: Next) => {
    try {
        const ip = getConnInfo(c)?.remote?.address || 'unknown';
        const siteId = c.get('site_id');
        const key = `ratelimit:${siteId}:${ip}`;

        const count = await c.env.RATE_LIMIT_KV.get(key);
        const currentCount = count ? parseInt(count, 10) : 0;

        if (currentCount >= 50) {
            return sendProblemDetails(
                c,
                429,
                'Rate limit exceeded. You may only make 50 submissions per hour from this IP address.',
                { retryAfter: 3600 }
            );
        }

        await c.env.RATE_LIMIT_KV.put(key, (currentCount + 1).toString(), {
            expirationTtl: 3600,
        });

        await next();
    } catch (error) {
        console.error('Rate limiter error:', error);
        // Fail open if KV has temporary issues so valid users are not blocked
        await next();
    }
};

/**
 * CORS middleware supporting wildcard or allowed origins
 */
export const corsMiddleware = async (c: Context<{ Bindings: Env }>, next: Next) => {
    const origin = c.req.header('Origin');

    if (origin) {
        c.res.headers.set('Access-Control-Allow-Origin', origin);
        c.res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
        c.res.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-API-Key, cf-turnstile-response, Authorization');
        c.res.headers.set('Access-Control-Max-Age', '86400');
    }

    if (c.req.method === 'OPTIONS') {
        return new Response(null, { status: 204 });
    }

    await next();
};