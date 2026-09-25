import { Hono } from 'hono';
import { getObject } from '../controllers/files/getObject';

import type { Env } from '../types/env';

const filesRoutes = new Hono<{ Bindings: Env }>();

filesRoutes.get('/:key', getObject); // Download object

export default filesRoutes;
