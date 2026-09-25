import { Hono } from 'hono';
import { Scalar } from '@scalar/hono-api-reference';
import authRoutes from './routes/auth.routes';
import companiesRoutes from './routes/companies.routes';
import sitesRoutes from './routes/sites.routes';
import fieldsRoutes from './routes/fields.routes';
import publicRoutes from './routes/public.routes';
import filesRoutes from './routes/files.routes';
import v1Router from './routes/v1';
import { cors } from 'hono/cors';
import { Env } from './types/env';
import { openAPISpecs } from 'hono-openapi';
import { submitForm } from './controllers/v1/submissions/submitForm';
import { corsMiddleware, verifyDomain, rateLimiter } from './middleware/publicAuth';

const app = new Hono<{ Bindings: Env }>();

app.use(
  '*',
  cors({
    origin: (origin) => {
      if (!origin) return '*';
      if (
        origin.endsWith('entrywise.webbound.in') ||
        origin.endsWith('webbound.in') ||
        origin.includes('pages.dev') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1')
      ) {
        return origin;
      }
      return '*';
    },
    allowHeaders: ['Content-Type', 'Authorization', 'X-Api-Key', 'X-Admin-Key', 'X-Admin-Api-Key', 'cf-turnstile-response'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['Content-Disposition'],
  })
);

app.get('/openapi', openAPISpecs(app, {
  documentation: {
    info: {
      title: 'EntryWise API',
      description: 'Zalando Guidelines-compliant Form Backend-as-a-Service running globally on Cloudflare Workers.',
      version: '0.2.0-beta.1',
      contact: {
        name: 'Webbound',
        url: 'https://webbound.in',
        email: 'info@webbound.in',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'https://entrywise.webbound.in',
        description: 'Production server',
      },
      {
        url: 'http://localhost:8787',
        description: 'Local development server',
      },
    ],
    tags: [
      { name: 'Submissions', description: 'Form submission ingestion and submission inbox management' },
      { name: 'Companies', description: 'Company account and email delivery provider configuration' },
      { name: 'Sites', description: 'Site registration, domain authorization, and notification settings' },
      { name: 'Fields', description: 'Dynamic form field schema definitions' },
      { name: 'Authentication', description: 'TOTP authentication and JWT token generation' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          description: 'Enter your 1-hour JWT token or static ADMIN_API_KEY',
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'Live site API key (format: ew_live_...)',
        },
        turnstileToken: {
          type: 'apiKey',
          in: 'header',
          name: 'cf-turnstile-response',
          description: 'Cloudflare Turnstile challenge token',
        },
      },
    },
  },
}));

app.get(
  '/docs',
  Scalar({
    theme: 'bluePlanet',
    url: '/openapi',
    favicon: '/assets/logo.png',
    pageTitle: 'EntryWise API Reference',
    hideClientButton: true,
    defaultHttpClient: {
      targetKey: 'node',
      clientKey: 'fetch',
    },
  })
);

// Version 1 Routes (Zalando RESTful Guidelines Compliant)
app.route('/v1', v1Router);

// Universal Public Form Ingestion Endpoint (/f/:key)
app.use('/f/*', corsMiddleware);
app.post('/f/:key', verifyDomain, rateLimiter, submitForm);
app.get('/f/:key', (c) => c.text('EntryWise Form Ingestion Endpoint. Submit submissions via POST.', 405));

// Legacy Root & Aliases
app.route('/auth', authRoutes);
app.route('/companies', companiesRoutes);
app.route('/sites', sitesRoutes);
app.route('/fields', fieldsRoutes);
app.route('/public', publicRoutes);
app.route('/files', filesRoutes);

app.get('/', async (c) => {
  return c.json({
    service: 'EntryWise API',
    version: '0.2.0-beta.1',
    documentation: '/docs',
    endpoints: {
      v1: '/v1',
      submissions: '/v1/submissions',
      openapi: '/openapi',
    },
  });
});

import { queueConsumer } from './queue/consumer';

export { app };

export default {
  fetch: app.fetch,
  queue: queueConsumer,
};
