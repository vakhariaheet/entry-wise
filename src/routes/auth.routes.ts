import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { validator } from 'hono-openapi/zod';
import getAuthToken from '../controllers/auth/getToken';
import { getTokenDocs } from '../docs/auth.docs';
import { authTokenRequestSchema } from '../schemas/auth.schema';
import type { Env } from '../types/env';

const router = new Hono<{ Bindings: Env }>();

router.post(
  '/get-token',
  describeRoute(getTokenDocs),
  validator('json', authTokenRequestSchema),
  getAuthToken
);

export default router;
