import {  Hono } from 'hono';
import { verifyAuth } from '../middleware/auth';
import { createCompany } from '../controllers/companies/createCompany';
import { getCompanies } from '../controllers/companies/getCompanies';
import { getCompany } from '../controllers/companies/getCompany';
import { updateCompany } from '../controllers/companies/updateCompany';
import { deleteCompany } from '../controllers/companies/deleteCompany';
import { describeRoute } from 'hono-openapi';
import { Env } from '../types/env';
import { createApiSuccessResponseSchema, createCompanySchema, updateCompanySchema } from '../schemas/company.schema';
import { resolver,validator } from 'hono-openapi/zod';
import { createCompanyDocs, deleteCompanyDocs, getCompaniesDocs, getCompanyDocs, updateCompanyDocs } from '../docs/company.docs';
import { z } from 'zod';

const companiesRouter = new Hono<{ Bindings: Env }>();

// Apply auth middleware to all routes
companiesRouter.use('*', verifyAuth);

// Routes
companiesRouter.post('/', describeRoute(createCompanyDocs),validator("json", createCompanySchema), createCompany);
companiesRouter.get('/',describeRoute(getCompaniesDocs), getCompanies);
companiesRouter.get('/:id',describeRoute(getCompanyDocs),validator("param", z.object({ id: z.string() })), getCompany);
companiesRouter.put('/:id',describeRoute(updateCompanyDocs),validator("param", z.object({ id: z.string() })),validator("json", updateCompanySchema), updateCompany);
companiesRouter.delete('/:id',describeRoute(deleteCompanyDocs),validator("param", z.object({ id: z.string() })), deleteCompany);

export default companiesRouter; 