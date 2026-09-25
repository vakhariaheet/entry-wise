import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { app } from '../src/index';

const rateLimitHeaders = {
  'X-RateLimit-Limit': {
    description: 'The maximum number of requests allowed in the current time period',
    schema: { type: 'integer', format: 'int32', minimum: 0, maximum: 100000 },
  },
  'X-RateLimit-Remaining': {
    description: 'The number of remaining requests in the current time period',
    schema: { type: 'integer', format: 'int32', minimum: 0, maximum: 100000 },
  },
  'X-RateLimit-Reset': {
    description: 'The number of seconds until the current rate limit window resets',
    schema: { type: 'integer', format: 'int32', minimum: 0, maximum: 86400 },
  },
};

const retryAfterHeader = {
  'Retry-After': {
    description: 'The number of seconds to wait before retrying the request',
    schema: { type: 'integer', format: 'int32', minimum: 0, maximum: 86400 },
  },
};

const problemDetailsSchema = {
  type: 'object',
  required: ['type', 'title', 'status', 'detail'],
  properties: {
    type: {
      type: 'string',
      format: 'uri',
      example: 'https://entrywise.webbound.in/problems/bad-request',
    },
    title: { type: 'string', format: 'text', example: 'Bad Request' },
    status: { type: 'integer', format: 'int32', minimum: 100, maximum: 599, example: 400 },
    detail: { type: 'string', format: 'text', example: 'Request validation failed' },
    instance: { type: 'string', format: 'uri-reference', example: '/v1/sites/req_123' },
    invalid_params: {
      type: 'array',
      example: [{ name: 'email', reason: 'Invalid email address format' }],
      items: {
        type: 'object',
        required: ['name', 'reason'],
        properties: {
          name: { type: 'string', format: 'text', example: 'email' },
          reason: { type: 'string', format: 'text', example: 'Invalid email address format' },
        },
      },
    },
  },
};

const problemDetailsContent = {
  'application/problem+json': {
    schema: problemDetailsSchema,
    example: {
      type: 'https://entrywise.webbound.in/problems/bad-request',
      title: 'Bad Request',
      status: 400,
      detail: 'Request validation failed',
      instance: '/v1/sites/req_123',
    },
  },
};

function generateMock(schema: any): any {
  if (!schema) return undefined;
  if (schema.example !== undefined) return schema.example;
  if (schema.type === 'string') {
    return schema.format === 'date-time'
      ? '2026-01-01T00:00:00Z'
      : schema.enum
        ? schema.enum[0]
        : 'example_string';
  }
  if (schema.type === 'integer' || schema.type === 'number') return 1;
  if (schema.type === 'boolean') return true;
  if (schema.type === 'array') return schema.items ? [generateMock(schema.items)] : [];
  if (schema.type === 'object' || schema.properties) {
    const obj: Record<string, any> = {};
    if (schema.properties) {
      for (const [k, v] of Object.entries(schema.properties)) {
        obj[k] = generateMock(v);
      }
    }
    return obj;
  }
  return null;
}

function normalizeSchema(schema: any) {
  if (!schema || typeof schema !== 'object') return;
  if (schema.type === 'string' || (Array.isArray(schema.type) && schema.type.includes('string'))) {
    if (!schema.format && !schema.pattern && !schema.enum && !schema.const) {
      schema.format = 'text';
    }
  }
  if (schema.type === 'integer' || (Array.isArray(schema.type) && schema.type.includes('integer'))) {
    if (!schema.format) schema.format = 'int32';
    if (schema.minimum === undefined) schema.minimum = 0;
  }
  if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
    schema.maxProperties = 100;
    schema.additionalProperties = { type: 'string', format: 'text' };
  }
  if (schema.properties) {
    for (const prop of Object.values(schema.properties)) {
      normalizeSchema(prop);
    }
  }
  if (schema.items) {
    normalizeSchema(schema.items);
  }
}

async function exportOpenApi() {
  console.log('Generating OpenAPI specification from Hono app...');
  const res = await app.request('/openapi');
  if (!res.ok) {
    throw new Error(`Failed to generate OpenAPI: HTTP ${res.status} ${res.statusText}`);
  }
  const spec = await res.json();

  // Normalize all paths and operations
  for (const [pathStr, pathItem] of Object.entries<any>(spec.paths || {})) {
    for (const [method, op] of Object.entries<any>(pathItem)) {
      if (method === 'parameters') continue;
      if (!op.description) {
        op.description = op.summary || `Endpoint for ${pathStr}`;
      }
      if (op.parameters) {
        for (const param of op.parameters) {
          if (!param.description) {
            param.description = param.schema?.description || `The ${param.name} parameter`;
          }
          if (param.schema) {
            normalizeSchema(param.schema);
            if (!param.example && !param.schema.example) {
              param.example = '123e4567-e89b-12d3-a456-426614174000';
            }
          }
        }
      }
      if (op.requestBody) {
        if (!op.requestBody.description) {
          op.requestBody.description = 'Request body payload';
        }
        if (op.requestBody.content) {
          for (const media of Object.values<any>(op.requestBody.content)) {
            normalizeSchema(media.schema);
          }
        }
      }
      if (!op.responses) op.responses = {};

      // Ensure 400
      if (!op.responses['400'] && !op.responses['422']) {
        op.responses['400'] = {
          description: 'Bad Request - Validation or parameter error (RFC 7807 Problem Details)',
          content: problemDetailsContent,
          headers: { ...rateLimitHeaders },
        };
      }
      // Ensure 401 if security is required
      if (op.security && op.security.length > 0 && !op.responses['401']) {
        op.responses['401'] = {
          description:
            'Unauthorized - Authentication required or invalid bearer token (RFC 7807 Problem Details)',
          content: problemDetailsContent,
          headers: { ...rateLimitHeaders },
        };
      } else if (op.responses['401'] && !op.responses['401'].content) {
        op.responses['401'].content = problemDetailsContent;
      }
      // Ensure 429
      if (!op.responses['429']) {
        op.responses['429'] = {
          description: 'Too Many Requests - Rate limit exceeded (RFC 7807 Problem Details)',
          content: problemDetailsContent,
          headers: { ...rateLimitHeaders, ...retryAfterHeader },
        };
      }
      // Ensure 500
      if (!op.responses['500']) {
        op.responses['500'] = {
          description: 'Internal Server Error (RFC 7807 Problem Details)',
          content: problemDetailsContent,
          headers: { ...rateLimitHeaders },
        };
      }

      // Attach headers and normalize response schemas
      for (const [code, resp] of Object.entries<any>(op.responses)) {
        resp.headers = { ...rateLimitHeaders, ...(resp.headers || {}) };
        if (code === '429') {
          resp.headers = { ...resp.headers, ...retryAfterHeader };
        }
        if (resp.content) {
          for (const media of Object.values<any>(resp.content)) {
            normalizeSchema(media.schema);
            if (media.schema?.properties) {
              for (const [k, prop] of Object.entries<any>(media.schema.properties)) {
                if (k === 'data' && !prop.example) {
                  prop.example = generateMock(prop);
                }
                if (k === 'attachments' && !prop.example) {
                  prop.example = [];
                }
                if (k === 'items' && !prop.example) {
                  prop.example = prop.items ? [generateMock(prop.items)] : [];
                }
              }
            }
          }
        }
      }
    }
  }

  // Reference turnstileToken on submission routes if defined
  if (spec.components?.securitySchemes?.turnstileToken) {
    if (spec.paths?.['/v1/submissions']?.post) {
      spec.paths['/v1/submissions'].post.security = [
        { apiKey: [] },
        { turnstileToken: [] },
      ];
    }
  }

  const outputPath = resolve(process.cwd(), 'openapi.json');
  writeFileSync(outputPath, JSON.stringify(spec, null, 2), 'utf-8');
  console.log(
    `✓ OpenAPI specification exported and normalized to ${outputPath} (${Object.keys(spec.paths || {}).length} paths)`
  );
}

exportOpenApi().catch((err) => {
  console.error('Export failed:', err);
  process.exit(1);
});
