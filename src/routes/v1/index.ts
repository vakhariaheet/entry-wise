import { Hono } from 'hono';
import type { Env } from '../../types/env';
import authRoutes from '../auth.routes';
import companiesRoutes from './companies.routes';
import sitesRoutes from './sites.routes';
import submissionsRoutes from './submissions.routes';

const v1Router = new Hono<{ Bindings: Env }>();

v1Router.route('/auth', authRoutes);
v1Router.route('/companies', companiesRoutes);
v1Router.route('/sites', sitesRoutes);
v1Router.route('/submissions', submissionsRoutes);

export default v1Router;
