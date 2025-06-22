import { Hono } from 'hono';
import { Env } from '../types/env';
import { submitForm } from '../controllers/public/submitForm';
import { corsMiddleware, verifyDomain, rateLimiter } from '../middleware/publicAuth';
import { describeRoute } from 'hono-openapi';
import { validator } from 'hono-openapi/zod';
import { formSubmissionSchema } from '../schemas/public.schema';
import { submitFormDocs } from '../docs/public.docs';

// Extend Hono's context type to include our custom properties
declare module 'hono' {
    interface ContextVariableMap {
        site_id: number;
        company_id: number;
    }
}

const publicRouter = new Hono<{ Bindings: Env }>();

// Apply middleware
// publicRouter.use('*', corsMiddleware);
// publicRouter.use('*', verifyDomain);
// publicRouter.use('*', rateLimiter);

// Routes
publicRouter.post('/submit', 
    describeRoute(submitFormDocs), 
    validator('form', formSubmissionSchema),
    submitForm
);

export default publicRouter;