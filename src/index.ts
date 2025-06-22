import { Hono } from 'hono'
import { Scalar } from '@scalar/hono-api-reference';
import authRoutes from './routes/auth.routes';
import companiesRoutes from './routes/companies.routes';
import sitesRoutes from './routes/sites.routes';
import fieldsRoutes from './routes/fields.routes';
import publicRoutes from './routes/public.routes';
import filesRoutes from './routes/files.routes';
import {cors} from 'hono/cors';
import { Env } from './types/env';
import { openAPISpecs } from 'hono-openapi';


const app = new Hono<{ Bindings: Env }>()
app.use("/public/*", cors({
  origin: "*"
}));



app.get('/openapi', openAPISpecs(app, {

  documentation: {
   
    info: {
      title: 'EntryWise API',
      description: 'API for EntryWise',
      version: '1.0.0',
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
    servers: [ {
      url: 'https://entrywise.webbound.in', description: 'Production server'
    }, {
      url: 'http://localhost:8787',
      description: 'Local server',
      },
      {
        url: 'https://matrix-proof-memories-pakistan.trycloudflare.com',
        description: 'Cloudflare server'
      }
    ],
    externalDocs: {
      url: 'https://entrywise.webbound.in',
      description: 'EntryWise API',
    },
    
    tags: [ { name: 'auth' }, { name: 'companies' }, { name: 'sites' }, { name: 'fields' }, { name: 'public' } ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-KEY',
        },
      },

    }
  }
}))

app.get(
  "/docs",
  Scalar({
    theme: "bluePlanet",
    url: "/openapi",
    favicon: "/assets/logo.png",
    pageTitle: "EntryWise API",
    hideClientButton: true,
    defaultHttpClient: {
      targetKey: "node",
      clientKey:"fetch"
    },
    
    
  })
);


app.route('/auth', authRoutes);
app.route('/companies', companiesRoutes);
app.route('/sites', sitesRoutes);
app.route('/fields', fieldsRoutes);
app.route('/public', publicRoutes);
app.route('/files', filesRoutes);
  app.get('/', async (c) => {
    return c.json({ message: 'Welcome to EntryWise API', version: '1.0.0' });
  }); 


export default app
