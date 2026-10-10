// Match the backend's namespaces without capturing CMS pages or static assets.
const API_NAMESPACES = [
  '/v1',
  '/f',
  '/auth',
  '/companies',
  '/sites',
  '/fields',
  '/public',
  '/files',
];

export function isApiPath(pathname: string): boolean {
  return (
    ['/openapi', '/embed.js', '/reference', '/reference/'].includes(pathname) ||
    API_NAMESPACES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  );
}
