// @ts-check

import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import { d1, r2 } from '@emdash-cms/cloudflare';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import emdash from 'emdash/astro';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: cloudflare(),
  site: 'https://entrywise.si',
  integrations: [
    react(),
    emdash({
      database: d1({ binding: 'DB' }),
      storage: r2({ binding: 'MEDIA' }),
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
