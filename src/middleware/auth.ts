import { Context, Next } from 'hono';
import { verify } from 'hono/jwt';
import { sendResponse } from '../utils/sendResponse';
import { Env } from '../types/env';
import { HTTPException } from 'hono/http-exception';

export const verifyAuth = async (c: Context<{ Bindings: Env }>, next: Next) => {
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

        try {
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
    } catch (error) {
    
        if(error instanceof HTTPException) {
            throw new HTTPException(error.status, {
                message: error.message,
                cause: error.cause,
                res: error.res
                
            });
        }
        return sendResponse(c, 500, null, 'Internal server error');
    }
}; 