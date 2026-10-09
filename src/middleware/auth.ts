import type { Context, Next } from 'hono';
import { verify } from 'hono/jwt';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { Env } from '../types/env';
import { sendProblemDetails } from '../utils/sendResponse';

// Cache remote JWKS instances per issuer URL so we don't refetch on every request
const jwksMap = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function getRemoteJWKS(issuer: string) {
  let jwks = jwksMap.get(issuer);
  if (!jwks) {
    const cleanIssuer = issuer.replace(/\/+$/, '');
    jwks = createRemoteJWKSet(new URL(`${cleanIssuer}/.well-known/jwks.json`));
    jwksMap.set(issuer, jwks);
  }
  return jwks;
}

/**
 * SECURITY: the JWKS endpoint is derived from the token's `iss` claim. We MUST only fetch keys from
 * an allow-listed issuer. Otherwise an attacker can set `iss` to a host they control, serve their
 * own JWKS, sign a token with their key, and be accepted as any `clerk_user` (full auth bypass),
 * while also turning the key fetch into an SSRF primitive. Trust is granted only to:
 *   - exact issuers configured via the CLERK_ISSUER env (comma-separated URLs or hostnames), and
 *   - official Clerk Frontend API domains (*.clerk.accounts.dev / *.clerk.accounts.com).
 */
function isTrustedClerkIssuer(issuer: string, env: Env): boolean {
  try {
    const url = new URL(issuer);
    if (url.protocol !== 'https:') return false;
    const host = url.hostname.toLowerCase();

    const configured = (env.CLERK_ISSUER || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    for (const entry of configured) {
      try {
        const entryHost = entry.startsWith('http') ? new URL(entry).hostname.toLowerCase() : entry;
        if (host === entryHost) return true;
      } catch {
        // ignore malformed allow-list entry
      }
    }

    if (host.endsWith('.clerk.accounts.dev') || host.endsWith('.clerk.accounts.com')) return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * Constant-time string comparison to prevent timing side-channel attacks on secret keys
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export const verifyAuth = async (c: Context<{ Bindings: Env }>, next: Next) => {
  try {
    const adminKeyHeader = c.req.header('X-Admin-Key') || c.req.header('X-Admin-Api-Key');
    const apiKeyHeader = c.req.header('X-Api-Key');
    const authHeader = c.req.header('Authorization');

    // 1. Check for Static Admin API Key if configured (constant-time check)
    if (c.env.ADMIN_API_KEY) {
      if (adminKeyHeader && timingSafeEqual(adminKeyHeader, c.env.ADMIN_API_KEY)) {
        c.set('jwtPayload', { sub: 'admin', role: 'admin_api_key' });
        return await next();
      }
      if (authHeader?.startsWith('Bearer ')) {
        const candidateKey = authHeader.slice(7).trim();
        if (timingSafeEqual(candidateKey, c.env.ADMIN_API_KEY)) {
          c.set('jwtPayload', { sub: 'admin', role: 'admin_api_key' });
          return await next();
        }
      }
    }

    // 2. Check for Site API Key (ew_live_...) in header or Bearer
    const potentialApiKey =
      apiKeyHeader ||
      (authHeader?.startsWith('Bearer ew_live_') ? authHeader.slice(7).trim() : null);

    if (potentialApiKey && potentialApiKey.startsWith('ew_live_')) {
      const site = await c.env.DB.prepare(
        'SELECT id, company_id, domain FROM sites WHERE api_key = ?'
      )
        .bind(potentialApiKey)
        .first<{ id: string; company_id: string; domain: string }>();

      if (site) {
        c.set('jwtPayload', {
          sub: site.id,
          role: 'site_owner',
          site_id: site.id,
          company_id: site.company_id,
        });
        return await next();
      }
    }

    // 3. Check for JWT Bearer token
    if (!authHeader?.startsWith('Bearer ')) {
      return sendProblemDetails(c, 401, 'Authentication token or valid API key is required');
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      return sendProblemDetails(c, 401, 'Invalid Bearer token format');
    }

    // Check for Clerk JWT or Internal JWT
    try {
      // 3a. If internal JWT_SECRET is configured, attempt verify
      if (c.env.JWT_SECRET) {
        try {
          const payload = await verify(token, c.env.JWT_SECRET);
          const expSec =
            typeof payload.exp === 'number' && payload.exp > 1e11
              ? Math.floor(payload.exp / 1000)
              : (payload.exp as number | undefined);

          if (expSec && expSec < Math.floor(Date.now() / 1000)) {
            return sendProblemDetails(c, 401, 'Authentication token has expired');
          }
          c.set('jwtPayload', payload);
          return await next();
        } catch {
          // Fallback to checking if it's a Clerk JWT
        }
      }

      // 3b. Cryptographically verify Clerk JWT via JWKS — but only for an allow-listed issuer.
      const parts = token.split('.');
      if (parts.length === 3) {
        let issuer: string | undefined;
        try {
          const payloadJson = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
          const unverifiedClaims = JSON.parse(payloadJson);
          issuer = typeof unverifiedClaims.iss === 'string' ? unverifiedClaims.iss : undefined;
        } catch {
          issuer = undefined;
        }

        if (issuer && isTrustedClerkIssuer(issuer, c.env)) {
          try {
            const jwks = getRemoteJWKS(issuer);
            const { payload } = await jwtVerify(token, jwks, { issuer });

            c.set('jwtPayload', {
              sub: payload.sub,
              role: 'clerk_user',
              user_id: payload.sub,
              claims: payload,
            });
            return await next();
          } catch (clerkErr) {
            console.error('Clerk JWKS cryptographic verification failed:', clerkErr);
            return sendProblemDetails(c, 401, 'Invalid or untrusted Clerk authentication token');
          }
        }
      }

      return sendProblemDetails(c, 401, 'Invalid authentication token');
    } catch (error) {
      console.error('JWT verification error:', error);
      return sendProblemDetails(c, 401, 'Invalid authentication token');
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return sendProblemDetails(c, 500, 'Internal authentication error');
  }
};
