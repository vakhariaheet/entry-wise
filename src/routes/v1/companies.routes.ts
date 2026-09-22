import { Hono } from 'hono';
import { verifyAuth } from '../../middleware/auth';
import { listCompanies } from '../../controllers/v1/companies/listCompanies';
import { createCompany } from '../../controllers/v1/companies/createCompany';
import { getCompany } from '../../controllers/v1/companies/getCompany';
import { patchCompany } from '../../controllers/v1/companies/patchCompany';
import { deleteCompany } from '../../controllers/v1/companies/deleteCompany';
import { createSite } from '../../controllers/v1/sites/createSite';
import { listSites } from '../../controllers/v1/sites/listSites';
import { describeRoute } from 'hono-openapi';
import { validator } from 'hono-openapi/zod';
import { Env } from '../../types/env';
import { createCompanySchema, updateCompanySchema } from '../../schemas/company.schema';
import { createSiteSchema } from '../../schemas/site.schema';
import { z } from 'zod';

const companiesRouter = new Hono<{ Bindings: Env }>();

// All company routes are protected by admin auth
companiesRouter.use('*', verifyAuth);

// Base company CRUD
companiesRouter.get(
    '/',
    describeRoute({
        summary: 'List companies',
        description: 'Retrieve a paginated list of companies',
        tags: ['Companies'],
        security: [{ bearerAuth: [] }],
    }),
    listCompanies
);

companiesRouter.post(
    '/',
    describeRoute({
        summary: 'Create company',
        description: 'Create a new company with an email delivery provider',
        tags: ['Companies'],
        security: [{ bearerAuth: [] }],
    }),
    validator('json', createCompanySchema),
    createCompany
);

companiesRouter.get(
    '/:id',
    describeRoute({
        summary: 'Get company',
        description: 'Get company details by ID',
        tags: ['Companies'],
        security: [{ bearerAuth: [] }],
    }),
    validator('param', z.object({ id: z.string() })),
    getCompany
);

companiesRouter.patch(
    '/:id',
    describeRoute({
        summary: 'Patch company',
        description: 'Partially update company properties',
        tags: ['Companies'],
        security: [{ bearerAuth: [] }],
    }),
    validator('param', z.object({ id: z.string() })),
    validator('json', updateCompanySchema),
    patchCompany
);

companiesRouter.delete(
    '/:id',
    describeRoute({
        summary: 'Delete company',
        description: 'Delete a company and all child sites and fields (cascading)',
        tags: ['Companies'],
        security: [{ bearerAuth: [] }],
    }),
    validator('param', z.object({ id: z.string() })),
    deleteCompany
);

// Nested sites sub-resource: /v1/companies/{company_id}/sites
companiesRouter.post(
    '/:company_id/sites',
    describeRoute({
        summary: 'Create site under company',
        description: 'Create a new site belonging to this company',
        tags: ['Sites'],
        security: [{ bearerAuth: [] }],
    }),
    validator('param', z.object({ company_id: z.string() })),
    validator('json', createSiteSchema),
    createSite
);

companiesRouter.get(
    '/:company_id/sites',
    describeRoute({
        summary: 'List sites for company',
        description: 'List all sites belonging to this company',
        tags: ['Sites'],
        security: [{ bearerAuth: [] }],
    }),
    validator('param', z.object({ company_id: z.string() })),
    listSites
);

export default companiesRouter;
