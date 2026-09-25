import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { z } from 'zod';
import { createCompany } from '../controllers/companies/createCompany';
import { deleteCompany } from '../controllers/companies/deleteCompany';
import { getCompanies } from '../controllers/companies/getCompanies';
import { getCompany } from '../controllers/companies/getCompany';
import { updateCompany } from '../controllers/companies/updateCompany';
import {
  createCompanyDocs,
  deleteCompanyDocs,
  getCompaniesDocs,
  getCompanyDocs,
  updateCompanyDocs,
} from '../docs/company.docs';
import { verifyAuth } from '../middleware/auth';
import {
  createApiSuccessResponseSchema,
  createCompanySchema,
  updateCompanySchema,
} from '../schemas/company.schema';
import type { Env } from '../types/env';

const companiesRouter = new Hono<{ Bindings: Env }>();

// Apply auth middleware to all routes
companiesRouter.use('*', verifyAuth);

// Routes
companiesRouter.post(
  '/',
  describeRoute(createCompanyDocs),
  validator('json', createCompanySchema),
  createCompany
);
companiesRouter.get('/', describeRoute(getCompaniesDocs), getCompanies);
companiesRouter.get(
  '/:id',
  describeRoute(getCompanyDocs),
  validator('param', z.object({ id: z.string() })),
  getCompany
);
companiesRouter.put(
  '/:id',
  describeRoute(updateCompanyDocs),
  validator('param', z.object({ id: z.string() })),
  validator('json', updateCompanySchema),
  updateCompany
);
companiesRouter.delete(
  '/:id',
  describeRoute(deleteCompanyDocs),
  validator('param', z.object({ id: z.string() })),
  deleteCompany
);

export default companiesRouter;
