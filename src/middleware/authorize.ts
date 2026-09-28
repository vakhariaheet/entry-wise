import type { Context } from 'hono';
import type { Env } from '../types/env';

export interface SiteRecord {
  id: string;
  company_id: string;
  domain: string;
  user_id?: string;
  name?: string;
}

/**
 * Asserts that the authenticated caller (Clerk User, Site API Key, or Admin Key)
 * has authorized access to the requested site.
 */
export async function assertSiteOwnership(
  c: Context<{ Bindings: Env }>,
  siteId: string
): Promise<SiteRecord | null> {
  const jwt = c.get('jwtPayload') as any;
  if (!jwt) return null;

  // 1. Master Admin API Key has global access
  if (jwt.role === 'admin_api_key') {
    const site = await c.env.DB.prepare(
      'SELECT id, company_id, domain, user_id, name FROM sites WHERE id = ?'
    )
      .bind(siteId)
      .first<SiteRecord>();
    return site || null;
  }

  // 2. Site API Key (ew_live_...) only has access to its own site
  if (jwt.role === 'site_owner') {
    if (jwt.site_id !== siteId) return null;
    const site = await c.env.DB.prepare(
      'SELECT id, company_id, domain, user_id, name FROM sites WHERE id = ?'
    )
      .bind(siteId)
      .first<SiteRecord>();
    return site || null;
  }

  // 3. Clerk User must own the site directly or through the parent company
  if (jwt.role === 'clerk_user' && jwt.user_id) {
    const site = await c.env.DB.prepare(`
      SELECT s.id, s.company_id, s.domain, s.user_id, s.name 
      FROM sites s
      LEFT JOIN companies c ON s.company_id = c.id
      WHERE s.id = ? AND (s.user_id = ? OR c.user_id = ? OR (s.user_id IS NULL AND c.user_id IS NULL))
    `)
      .bind(siteId, jwt.user_id, jwt.user_id)
      .first<SiteRecord>();

    if (site && !site.user_id) {
      await c.env.DB.prepare('UPDATE sites SET user_id = ? WHERE id = ?')
        .bind(jwt.user_id, site.id)
        .run();
      site.user_id = jwt.user_id;
    }

    return site || null;
  }

  return null;
}
