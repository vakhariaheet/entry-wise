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

const app = new Hono<{ Bindings: Env }>();

app.use('/public/*', cors({ origin: '*' }));
app.use('/v1/submissions/*', cors({ origin: '*' }));

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

export default app;
