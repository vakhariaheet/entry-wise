import { Hono } from 'hono';
import { Env } from '../../types/env';
import { submitForm } from '../../controllers/v1/submissions/submitForm';
import { corsMiddleware, verifyDomain, rateLimiter } from '../../middleware/publicAuth';
import { describeRoute } from 'hono-openapi';
import { submitFormDocs } from '../../docs/submission.docs';

const submissionsRouter = new Hono<{ Bindings: Env }>();

// Apply CORS, Domain/Key Verification, and Edge Rate Limiting
submissionsRouter.use('*', corsMiddleware);
submissionsRouter.use('*', verifyDomain);
submissionsRouter.use('*', rateLimiter);

// Primary public submission endpoints (both root and /:key)
submissionsRouter.post(
    '/',
    describeRoute(submitFormDocs),
    submitForm
);

submissionsRouter.post(
    '/:key',
    describeRoute(submitFormDocs),
    submitForm
);

export default submissionsRouter;
