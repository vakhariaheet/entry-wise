// @ts-check

import node from '@astrojs/node';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import emdash, { local } from 'emdash/astro';
import { sqlite } from 'emdash/db';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  integrations: [
    react(),
    emdash({
      database: sqlite({
        url: process.env.EMDASH_DB_URL || 'file:./data.db',
      }),
      storage: local({
        directory: './uploads',
        baseUrl: '/_emdash/api/media/file',
      }),
      admin: {
        siteName: 'EntryWise CMS & Docs',
        footerLabel: 'EntryWise',
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  outDir: './dist',
});
