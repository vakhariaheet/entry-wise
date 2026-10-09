import { Hono } from 'hono';
import { getObject } from '../controllers/files/getObject';
import { verifyAuth } from '../middleware/auth';

import type { Env } from '../types/env';

const filesRoutes = new Hono<{ Bindings: Env }>();

// Object storage reads require authentication (previously any object was downloadable by key).
filesRoutes.use('*', verifyAuth);
filesRoutes.get('/:key', getObject); // Download object

export default filesRoutes;
