import { Context } from 'hono';
import { Env } from '../../types/env';

export const getObject = async (c: Context<{Bindings:Env}>) => {
  const r2 = c.env.R2_BUCKET;
  const key = c.req.param('key');
  const object = await r2.get(key);
  if (!object) return c.json({ error: 'Not found' }, 404);
  return new Response(object.body, { headers: { 'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream' } });
};
