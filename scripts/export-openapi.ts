import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { app } from '../src/index';

async function exportOpenApi() {
  console.log('Generating OpenAPI specification from Hono app...');
  const res = await app.request('/openapi');
  if (!res.ok) {
    throw new Error(`Failed to generate OpenAPI: HTTP ${res.status} ${res.statusText}`);
  }
  const spec = await res.json();
  const outputPath = resolve(process.cwd(), 'openapi.json');
  writeFileSync(outputPath, JSON.stringify(spec, null, 2), 'utf-8');
  console.log(
    `✓ OpenAPI specification exported to ${outputPath} (${Object.keys(spec.paths || {}).length} paths)`
  );
}

exportOpenApi().catch((err) => {
  console.error('Export failed:', err);
  process.exit(1);
});
