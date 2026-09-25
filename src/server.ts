import { app } from './index';

/**
 * EntryWise Standalone Server Entrypoint
 * Used for Docker, VPS, and local Node/Bun self-hosted environments.
 */
const PORT = Number(process.env.PORT) || 8787;
const HOST = process.env.HOST || '0.0.0.0';

console.log(`
┌──────────────────────────────────────────────────────────┐
│                                                          │
│   🚀 EntryWise Form Backend (Self-Hosted Standalone)     │
│   Listening on: http://${HOST}:${PORT}                   │
│   Docs:         http://${HOST}:${PORT}/docs              │
│   OpenAPI:      http://${HOST}:${PORT}/openapi           │
│   Version:      0.2.0-beta.1                             │
│                                                          │
└──────────────────────────────────────────────────────────┘
`);

export default {
    port: PORT,
    hostname: HOST,
    fetch: app.fetch,
};
