import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { type SeedFile, validateSeed } from 'emdash/seed';
import { DEFAULT_DOCS, DEFAULT_LANDING_CONTENT } from '../src/data/defaultDocs';

const seed: SeedFile = {
  version: '1',
  meta: {
    name: 'EntryWise Website & Developer Documentation Seed',
    description:
      'EmDash CMS collections and content for EntryWise Marketing Site & Developer Documentation Hub',
    author: 'EntryWise',
  },
  settings: {
    title: 'EntryWise — Headless Form Backend & Developer Docs',
    tagline:
      'Sub-20ms edge form backend powered by Cloudflare Workers, Docker + SQLite, and Zero-OAuth Connectors.',
  },
  collections: [
    {
      slug: 'docs',
      label: 'Documentation',
      labelSingular: 'Doc Article',
      description: 'Developer guides, self-hosting docs, connectors, and security architecture',
      supports: ['drafts', 'revisions', 'search', 'seo'],
      urlPattern: '/docs/:slug',
      routable: true,
      sortOrder: 1,
      titleField: 'title',
      fields: [
        {
          slug: 'title',
          label: 'Title',
          type: 'string',
          required: true,
          searchable: true,
        },
        {
          slug: 'category',
          label: 'Category',
          type: 'string',
          required: true,
          searchable: true,
        },
        {
          slug: 'sort_order',
          label: 'Sort Order',
          type: 'integer',
          required: true,
        },
        {
          slug: 'badge',
          label: 'Badge Label',
          type: 'string',
        },
        {
          slug: 'reading_time',
          label: 'Reading Time',
          type: 'string',
        },
        {
          slug: 'summary',
          label: 'Summary',
          type: 'text',
          required: true,
          searchable: true,
        },
        {
          slug: 'body_markdown',
          label: 'Additional Custom Notes (Markdown)',
          type: 'text',
          searchable: true,
        },
        {
          slug: 'sections_json',
          label: 'Structured Sections JSON',
          type: 'json',
        },
      ],
    },
    {
      slug: 'pages',
      label: 'Site Pages',
      labelSingular: 'Page',
      description: 'Landing page hero and marketing configuration',
      supports: ['drafts', 'revisions', 'seo'],
      urlPattern: '/:slug',
      routable: true,
      sortOrder: 2,
      titleField: 'title',
      fields: [
        {
          slug: 'title',
          label: 'Page Title',
          type: 'string',
          required: true,
        },
        {
          slug: 'badge_text',
          label: 'Hero Badge Text',
          type: 'string',
        },
        {
          slug: 'badge_subtext',
          label: 'Hero Badge Subtext',
          type: 'string',
        },
        {
          slug: 'headline_top',
          label: 'Hero Headline (Line 1)',
          type: 'string',
        },
        {
          slug: 'headline_gradient',
          label: 'Hero Headline (Gradient Line 2)',
          type: 'string',
        },
        {
          slug: 'subtitle',
          label: 'Hero Subtitle',
          type: 'text',
        },
        {
          slug: 'primary_cta_label',
          label: 'Primary CTA Label',
          type: 'string',
        },
        {
          slug: 'primary_cta_url',
          label: 'Primary CTA URL',
          type: 'string',
        },
      ],
    },
  ],
  menus: [
    {
      name: 'primary',
      label: 'Primary Navigation',
      items: [
        { type: 'custom', label: 'Home', url: '/' },
        { type: 'custom', label: 'Developer Docs', url: '/docs' },
        { type: 'custom', label: 'Quickstart', url: '/docs/quickstart' },
        { type: 'custom', label: 'Self-Hosting (Docker)', url: '/docs/self-hosting-docker' },
        { type: 'custom', label: 'OpenAPI Reference', url: 'https://api.entrywise.si/reference' },
      ],
    },
  ],
  content: {
    docs: DEFAULT_DOCS.map((doc) => ({
      id: `doc-${doc.slug}`,
      slug: doc.slug,
      status: 'published',
      data: {
        title: doc.title,
        category: doc.category,
        sort_order: doc.sortOrder,
        badge: doc.badge,
        reading_time: doc.readingTime,
        summary: doc.summary,
        body_markdown: doc.bodyMarkdown ?? '',
        sections_json: doc.sections,
      },
    })),
    pages: [
      {
        id: 'page-home',
        slug: 'home',
        status: 'published',
        data: {
          title: 'EntryWise Landing Page',
          badge_text: DEFAULT_LANDING_CONTENT.badgeText,
          badge_subtext: DEFAULT_LANDING_CONTENT.badgeSubtext,
          headline_top: DEFAULT_LANDING_CONTENT.headlineTop,
          headline_gradient: DEFAULT_LANDING_CONTENT.headlineGradient,
          subtitle: DEFAULT_LANDING_CONTENT.subtitle,
          primary_cta_label: DEFAULT_LANDING_CONTENT.primaryCtaLabel,
          primary_cta_url: DEFAULT_LANDING_CONTENT.primaryCtaUrl,
        },
      },
    ],
  },
};

const validation = validateSeed(seed);
if (!validation.valid) {
  console.error('Seed validation failed:', validation.errors);
  process.exit(1);
}

const outPath = resolve(import.meta.dirname, '../seed/seed.json');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(seed, null, 2)}\n`, 'utf-8');
console.log(
  `Generated valid EmDash seed at ${outPath} (${DEFAULT_DOCS.length} docs articles + 1 home page).`
);
