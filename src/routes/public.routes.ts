import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { submitForm } from '../controllers/v1/submissions/submitForm';
import { submitFormDocs } from '../docs/submission.docs';
import { corsMiddleware, rateLimiter, verifyDomain } from '../middleware/publicAuth';
import type { Env } from '../types/env';

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
publicRouter.post('/submit', describeRoute(submitFormDocs), submitForm);

export default publicRouter;
