import { Hono } from 'hono';
import { verifyAuth } from '../middleware/auth';
import { createField } from '../controllers/fields/createField';
import { getFields } from '../controllers/fields/getFields';
import { getField } from '../controllers/fields/getField';
import { updateField } from '../controllers/fields/updateField';
import { deleteField } from '../controllers/fields/deleteField';
import { bulkCreateFields } from '../controllers/fields/bulkCreateFields';
import { describeRoute } from 'hono-openapi';
import { Env } from '../types/env';
import { createFieldSchema, updateFieldSchema, bulkCreateFieldSchema } from '../schemas/field.schema';
import { validator } from 'hono-openapi/zod';
import { createFieldDocs, deleteFieldDocs, getFieldsDocs, getFieldDocs, updateFieldDocs, bulkCreateFieldDocs } from '../docs/field.docs';
import { z } from 'zod';

const fieldsRouter = new Hono<{ Bindings: Env }>();

// Apply auth middleware to all routes
fieldsRouter.use('*', verifyAuth);

// Routes
fieldsRouter.post('/:site_id', describeRoute(createFieldDocs), validator("param", z.object({ site_id: z.string() })), validator("json", createFieldSchema), createField);
fieldsRouter.post('/:site_id/bulk', describeRoute(bulkCreateFieldDocs), validator("param", z.object({ site_id: z.string() })), validator("json", bulkCreateFieldSchema), bulkCreateFields);
fieldsRouter.get('/:site_id', describeRoute(getFieldsDocs),validator("param", z.object({ site_id: z.string() })), getFields);
fieldsRouter.get('/:site_id/:id', describeRoute(getFieldDocs), validator("param", z.object({ site_id: z.string(), id: z.string() })), getField);
fieldsRouter.put('/:site_id/:id', describeRoute(updateFieldDocs), validator("param", z.object({ site_id: z.string(), id: z.string() })), validator("json", updateFieldSchema), updateField);
fieldsRouter.delete('/:field_id', describeRoute(deleteFieldDocs), validator("param", z.object({ field_id: z.string() })), deleteField);

export default fieldsRouter; 