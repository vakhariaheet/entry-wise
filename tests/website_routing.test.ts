import { describe, expect, test } from 'bun:test';
import { isApiPath } from '../apps/web/src/lib/apiRouting';

describe('Live EmDash website and form API routing', () => {
  test('forwards management, public form, and legacy endpoints to the backend', () => {
    for (const path of [
      '/v1/sites', '/v1/auth/me', '/f/ew_live_test', '/openapi', '/embed.js',
      '/reference', '/reference/', '/auth/login', '/companies/123', '/sites',
      '/fields/123', '/public/forms', '/files/upload',
    ]) {
      expect(isApiPath(path)).toBe(true);
    }
  });

  test('keeps website, docs, admin, and media requests in EmDash', () => {
    for (const path of [
      '/', '/docs', '/docs/quickstart', '/_emdash/admin', '/_emdash/api/mcp',
      '/_emdash/api/media/file/image.png', '/_astro/styles.css', '/_image',
      '/assets/logo.png', '/favicon.ico',
    ]) {
      expect(isApiPath(path)).toBe(false);
    }
  });

  test('does not capture unrelated paths that share an API prefix', () => {
    for (const path of ['/v10', '/forms', '/author', '/publications', '/files-guide', '/reference-guide']) {
      expect(isApiPath(path)).toBe(false);
    }
  });
});
