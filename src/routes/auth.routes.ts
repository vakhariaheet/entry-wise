import { Hono } from "hono";
import getAuthToken from "../controllers/auth/getToken";
import { describeRoute } from 'hono-openapi';
import { validator } from 'hono-openapi/zod';
import { authTokenRequestSchema } from '../schemas/auth.schema';
import { getTokenDocs } from '../docs/auth.docs';
import { Env } from '../types/env';

const router = new Hono<{ Bindings: Env }>();

router.post('/get-token', describeRoute(getTokenDocs), validator("json", authTokenRequestSchema), getAuthToken);

export default router;