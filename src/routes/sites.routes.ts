import { Hono } from 'hono';
import { verifyAuth } from '../middleware/auth';
import { createSite } from '../controllers/sites/createSite';
import { getSites } from '../controllers/sites/getSites';
import { getSite } from '../controllers/sites/getSite';
import { updateSite } from '../controllers/sites/updateSite';
import { deleteSite } from '../controllers/sites/deleteSite';
import { describeRoute } from 'hono-openapi';
import { Env } from '../types/env';
import { createSiteSchema, updateSiteSchema } from '../schemas/site.schema';
import { validator } from 'hono-openapi/zod';
import { createSiteDocs, deleteSiteDocs, getSitesDocs, getSiteDocs, updateSiteDocs } from '../docs/site.docs';
import { z } from 'zod';

const sitesRouter = new Hono<{ Bindings: Env }>();

// Apply auth middleware to all routes
sitesRouter.use('*', verifyAuth);

// Routes
sitesRouter.post('/:company_id', describeRoute(createSiteDocs), validator("json", createSiteSchema), createSite);
sitesRouter.get('/:company_id/', describeRoute(getSitesDocs), getSites);
sitesRouter.get('/:company_id/:id', describeRoute(getSiteDocs), validator("param", z.object({ id: z.string() })), getSite);
sitesRouter.put('/:company_id/:id', describeRoute(updateSiteDocs), validator("param", z.object({ id: z.string() })), validator("json", updateSiteSchema), updateSite);
sitesRouter.delete('/:company_id/:id', describeRoute(deleteSiteDocs), validator("param", z.object({ id: z.string() })), deleteSite);

export default sitesRouter; 