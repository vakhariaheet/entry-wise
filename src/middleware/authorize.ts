import type { Context } from 'hono';
import type { Env } from '../types/env';

export interface SiteRecord {
  id: string;
  company_id: string;
  domain: string;
  user_id?: string;
  name?: string;
}

export interface CompanyRecord {
  id: string;
  user_id?: string | null;
}

/**
 * Asserts that the authenticated caller may access the requested company (workspace).
 *
 * Default-deny: unknown/empty roles get nothing. This closes the cross-tenant BOLA where a
 * site-scoped API key (role `site_owner`) previously fell through the clerk-only `if` guards in
 * the company controllers and gained global read/write/delete over every workspace.
 *
 * - admin_api_key: global access (master key).
 * - site_owner (ew_live_... key): only the company that owns its own site.
 * - clerk_user: companies they own, plus the shared default workspace.
 */
export async function assertCompanyOwnership(
  c: Context<{ Bindings: Env }>,
  companyId: string
): Promise<CompanyRecord | null> {
  const jwt = c.get('jwtPayload') as any;
  if (!jwt || !companyId) return null;

  if (jwt.role === 'admin_api_key') {
    const company = await c.env.DB.prepare('SELECT id, user_id FROM companies WHERE id = ?')
      .bind(companyId)
      .first<CompanyRecord>();
    return company || null;
  }

  if (jwt.role === 'site_owner' && jwt.company_id) {
    if (jwt.company_id !== companyId) return null;
    const company = await c.env.DB.prepare('SELECT id, user_id FROM companies WHERE id = ?')
      .bind(companyId)
      .first<CompanyRecord>();
    return company || null;
  }

  if (jwt.role === 'clerk_user' && jwt.user_id) {
    const company = await c.env.DB.prepare(
      "SELECT id, user_id FROM companies WHERE id = ? AND (user_id = ? OR id = 'comp_default')"
    )
      .bind(companyId, jwt.user_id)
      .first<CompanyRecord>();
    return company || null;
  }

  return null;
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
