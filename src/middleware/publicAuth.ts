import { Context, Next } from 'hono';
import { Env } from '../types/env';
import { sendResponse } from '../utils/sendResponse';
import { getConnInfo } from 'hono/cloudflare-workers'
import { verify } from 'hono/jwt';
/**
 * Middleware to verify domain and API key
 */
export const verifyDomain = async (c: Context<{ Bindings: Env, }>, next: Next) => {
    try {
        const origin = c.req.header('Origin') || c.req.header('Referer');
        if (!origin) {
            return sendResponse(c, 403, null, 'Origin not provided');
        }
        

        const domain = new URL(origin).hostname;
        const api_key = c.req.header('X-API-Key');

        console.log(domain,api_key,origin,c.req.header('Origin') || c.req.header('Referer'));
        if (!api_key) {
            return sendResponse(c, 401, null, 'API key not provided');
        }
        // Check if site exists with this domain and API key
        const { results } = await c.env.DB.prepare(`
            SELECT id, company_id FROM sites 
            WHERE domain = ? AND api_key = ?
        `).bind(domain, api_key).all<{ id: number, company_id: number }>();
       
        if (!results?.length) {
            return sendResponse(c, 403, null, 'Invalid API key or domain');
        }

        // Add site info to context for later use
        c.set('site_id', results[0].id);
        c.set('company_id', results[0].company_id);
        await next();
    } catch (error) {
        console.error(error);
        return sendResponse(c, 403, null, 'Invalid origin');
    }
};

/**
 * Rate limiting middleware using Cloudflare KV
 */
export const rateLimiter = async (c: Context<{ Bindings: Env }>, next: Next) => {
    const ip = getConnInfo(c).remote.address;
    const site_id = c.get('site_id');
    const key = `${site_id}:${ip}`;
    
    // Get current count from KV
    const count = await c.env.RATE_LIMIT_KV.get(key);
    const currentCount = count ? parseInt(count) : 0;

    if (currentCount >= 50) { // 50 requests per hour
        return sendResponse(c, 429, null, 'Too many requests. Please try again later.');
    }

    // Increment count with 1-hour expiry
    await c.env.RATE_LIMIT_KV.put(key, (currentCount + 1).toString(), {
        expirationTtl: 3600 // 1 hour
    });
    
    await next();
};

/**
 * CORS middleware with dynamic origin checking
 */
export const corsMiddleware = async (c: Context<{ Bindings: Env }>, next: Next) => {
    const origin = c.req.header('Origin');
 
    if (origin) {
        // Get allowed domains from DB
        const { results } = await c.env.DB.prepare(`
            SELECT domain FROM sites WHERE api_key = ?
        `).bind(c.req.header('X-API-Key') ?? '').all();

        const allowedDomains = results?.map(r => `https://${r.domain}`) || [];
        
        if (allowedDomains.includes(origin)) {
            c.res.headers.set('Access-Control-Allow-Origin', origin);
            c.res.headers.set('Access-Control-Allow-Methods', 'POST');
            c.res.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
            c.res.headers.set('Access-Control-Max-Age', '86400');
        }
    }

    // Handle preflight requests
    if (c.req.method === 'OPTIONS') {
        return new Response(null, { status: 204 });
    }

    await next();
}; 

/**
 * Public authentication middleware for R2 operations
 */
export const publicAuth = async (c: Context<{ Bindings: Env }>, next: Next) => {
    try {
        // Get the Authorization header
        const authHeader = c.req.header('Authorization');
        
        if (!authHeader?.startsWith('Bearer ')) {
            return sendResponse(c, 401, null, 'No token provided');
        }

        // Extract the token
        const token = authHeader.split(' ')[1];
        
        if (!token) {
            return sendResponse(c, 401, null, 'Invalid token format');
        }

        // Verify the token
        const payload = await verify(token, c.env.JWT_SECRET);
        
        // Check if token is expired
        if (payload.exp && payload.exp < Date.now()) {
            return sendResponse(c, 401, null, 'Token expired');
        }

        // Add the payload to the context variables for later use
        c.set('jwtPayload', payload);
        
        // Continue to the next middleware/route handler
        await next();
    } catch (error) {
        console.error('JWT verification error:', error);
        return sendResponse(c, 401, null, 'Invalid token');
    }
}

export const verifySiteApiKey = async (c: Context<{ Bindings: Env }>, next: Next) => { 
    const site_id = c.req.query('site_id');
    const api_key = c.req.header('X-API-Key');
    const domain = c.req.header('Origin') || c.req.header('Referer');
    if (!domain) {
        return sendResponse(c, 400, null, 'Domain is required');
    }
    if (!api_key) {
        return sendResponse(c, 400, null, 'API key is required');
    }
    if (!site_id) {
        return sendResponse(c, 400, null, 'Site ID is required');
    }
    const { results } = await c.env.DB.prepare(`
        SELECT id FROM sites WHERE id = ? AND api_key = ? 
    `).bind(site_id, api_key).all<{ id: number }>();
    if (!results?.length) {
        return sendResponse(c, 403, null, 'Forbidden');
    }

    await next();
}