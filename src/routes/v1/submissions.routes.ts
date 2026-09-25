import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { submitForm } from '../../controllers/v1/submissions/submitForm';
import { submitFormDocs } from '../../docs/submission.docs';
import { corsMiddleware, rateLimiter, verifyDomain } from '../../middleware/publicAuth';
import type { Env } from '../../types/env';

const submissionsRouter = new Hono<{ Bindings: Env }>();

// Apply CORS, Domain/Key Verification, and Edge Rate Limiting
submissionsRouter.use('*', corsMiddleware);
submissionsRouter.use('*', verifyDomain);
submissionsRouter.use('*', rateLimiter);

// Primary public submission endpoints (both root and /:key)
submissionsRouter.post('/', describeRoute(submitFormDocs), submitForm);

submissionsRouter.post('/:key', describeRoute(submitFormDocs), submitForm);

export default submissionsRouter;
