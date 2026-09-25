import { Context, Next } from 'hono';
import { verify } from 'hono/jwt';
import { sendProblemDetails } from '../utils/sendResponse';
import { Env } from '../types/env';

export const verifyAuth = async (c: Context<{ Bindings: Env }>, next: Next) => {
    try {
        const adminKeyHeader = c.req.header('X-Admin-Key') || c.req.header('X-Admin-Api-Key');
        const apiKeyHeader = c.req.header('X-Api-Key');
        const authHeader = c.req.header('Authorization');

        // 1. Check for Static Admin API Key if configured
        if (c.env.ADMIN_API_KEY) {
            if (adminKeyHeader && adminKeyHeader === c.env.ADMIN_API_KEY) {
                c.set('jwtPayload', { sub: 'admin', role: 'admin_api_key' });
                return await next();
            }
            if (authHeader?.startsWith('Bearer ') && authHeader.split(' ')[1] === c.env.ADMIN_API_KEY) {
                c.set('jwtPayload', { sub: 'admin', role: 'admin_api_key' });
                return await next();
            }
        }

        // 2. Check for Site API Key (ew_live_...) in header or Bearer
        const potentialApiKey = apiKeyHeader || (authHeader?.startsWith('Bearer ew_live_') ? authHeader.split(' ')[1] : null);
        if (potentialApiKey && potentialApiKey.startsWith('ew_live_')) {
            const site = await c.env.DB.prepare('SELECT id, company_id, domain FROM sites WHERE api_key = ?').bind(potentialApiKey).first<{ id: string; company_id: string; domain: string }>();
            if (site) {
                c.set('jwtPayload', { sub: site.id, role: 'site_owner', site_id: site.id, company_id: site.company_id });
                return await next();
            }
        }

        // 3. Check for JWT Bearer token
        if (!authHeader?.startsWith('Bearer ')) {
            return sendProblemDetails(c, 401, 'Authentication token or valid API key is required');
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return sendProblemDetails(c, 401, 'Invalid Bearer token format');
        }

        // Check for Clerk JWT or Internal JWT
        try {
            // If internal JWT_SECRET is configured, attempt verify
            if (c.env.JWT_SECRET) {
                try {
                    const payload = await verify(token, c.env.JWT_SECRET);
                    if (payload.exp && payload.exp < Date.now()) {
                        return sendProblemDetails(c, 401, 'Authentication token has expired');
                    }
                    c.set('jwtPayload', payload);
                    return await next();
                } catch {
                    // Fallback to checking if it's a Clerk JWT
                }
            }

            // Parse Clerk JWT claims (Clerk tokens contain sub, iss, sid)
            const parts = token.split('.');
            if (parts.length === 3) {
                const payloadJson = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
                const claims = JSON.parse(payloadJson);
                
                // If Clerk token
                if (claims && (claims.iss?.includes('clerk') || claims.sub?.startsWith('user_'))) {
                    // Check expiry (exp is in seconds in standard JWTs)
                    if (claims.exp && claims.exp * 1000 < Date.now()) {
                        return sendProblemDetails(c, 401, 'Clerk session has expired');
                    }
                    c.set('jwtPayload', { sub: claims.sub, role: 'clerk_user', user_id: claims.sub, claims });
                    return await next();
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