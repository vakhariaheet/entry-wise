import { Context, Next } from 'hono';
import { verify } from 'hono/jwt';
import { sendProblemDetails } from '../utils/sendResponse';
import { Env } from '../types/env';

export const verifyAuth = async (c: Context<{ Bindings: Env }>, next: Next) => {
    try {
        const adminKeyHeader = c.req.header('X-Admin-Key') || c.req.header('X-Admin-Api-Key');
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

        // 2. Check for JWT Bearer token
        if (!authHeader?.startsWith('Bearer ')) {
            return sendProblemDetails(c, 401, 'Authentication token or valid admin key is required');
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return sendProblemDetails(c, 401, 'Invalid Bearer token format');
        }

        try {
            const payload = await verify(token, c.env.JWT_SECRET);
            
            // Check if token is expired
            if (payload.exp && payload.exp < Date.now()) {
                return sendProblemDetails(c, 401, 'Authentication token has expired');
            }

            c.set('jwtPayload', payload);
            await next();
        } catch (error) {
            console.error('JWT verification error:', error);
            return sendProblemDetails(c, 401, 'Invalid authentication token');
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        return sendProblemDetails(c, 500, 'Internal authentication error');
    }
};