import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { validator } from 'hono-openapi/zod';
import { z } from 'zod';
import { createSite } from '../controllers/sites/createSite';
import { deleteSite } from '../controllers/sites/deleteSite';
import { getSite } from '../controllers/sites/getSite';
import { getSites } from '../controllers/sites/getSites';
import { updateSite } from '../controllers/sites/updateSite';
import {
  createSiteDocs,
  deleteSiteDocs,
  getSiteDocs,
  getSitesDocs,
  updateSiteDocs,
} from '../docs/site.docs';
import { verifyAuth } from '../middleware/auth';
import { createSiteSchema, updateSiteSchema } from '../schemas/site.schema';
import type { Env } from '../types/env';

const sitesRouter = new Hono<{ Bindings: Env }>();

// Apply auth middleware to all routes
sitesRouter.use('*', verifyAuth);

// Routes
sitesRouter.post(
  '/:company_id',
  describeRoute(createSiteDocs),
  validator('json', createSiteSchema),
  createSite
);
sitesRouter.get('/:company_id/', describeRoute(getSitesDocs), getSites);
sitesRouter.get(
  '/:company_id/:id',
  describeRoute(getSiteDocs),
  validator('param', z.object({ id: z.string() })),
  getSite
);
sitesRouter.put(
  '/:company_id/:id',
  describeRoute(updateSiteDocs),
  validator('param', z.object({ id: z.string() })),
  validator('json', updateSiteSchema),
  updateSite
);
sitesRouter.delete(
  '/:company_id/:id',
  describeRoute(deleteSiteDocs),
  validator('param', z.object({ id: z.string() })),
  deleteSite
);

export default sitesRouter;
