import type { Context } from 'hono';
import { getConnInfo } from 'hono/cloudflare-workers';

/**
 * Runtime-agnostic client IP extractor.
 * Works across Cloudflare Workers, Docker/Bun behind reverse proxies (Nginx, Caddy, Traefik, Fly.io, Railway),
 * and local development without throwing when outside workerd.
 */
export function getClientIp(c: Context): string {
  const cfIp = c.req.header('CF-Connecting-IP');
  if (cfIp) return cfIp.trim();

  const forwardedFor = c.req.header('X-Forwarded-For');
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0]?.trim();
    if (firstIp) return firstIp;
  }

  const realIp = c.req.header('X-Real-IP') || c.req.header('Fly-Client-IP');
  if (realIp) return realIp.trim();

  try {
    const connIp = getConnInfo(c)?.remote?.address;
    if (connIp) return connIp;
  } catch {
    // Not running inside Cloudflare workerd runtime (e.g. Docker / Bun standalone)
  }

  return 'unknown';
}
