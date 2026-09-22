import { Hono } from 'hono';
import { Env } from '../types/env';
import { submitForm } from '../controllers/v1/submissions/submitForm';
import { corsMiddleware, verifyDomain, rateLimiter } from '../middleware/publicAuth';
import { describeRoute } from 'hono-openapi';
import { submitFormDocs } from '../docs/submission.docs';

// Extend Hono's context type to include our custom properties
declare module 'hono' {
    interface ContextVariableMap {
        site_id: string;
        company_id: string;
    }
}

const publicRouter = new Hono<{ Bindings: Env }>();

// Apply middleware
publicRouter.use('*', corsMiddleware);
publicRouter.use('*', verifyDomain);
publicRouter.use('*', rateLimiter);

// Backwards-compatible public submission route
publicRouter.post(
    '/submit', 
    describeRoute(submitFormDocs), 
    submitForm
);

export default publicRouter;