import { createNoop, type EditProxy, getEmDashCollection, getEmDashEntry } from 'emdash';
import {
  DEFAULT_DOCS,
  DEFAULT_LANDING_CONTENT,
  type DocArticle,
  type DocSection,
  type LandingPageContent,
} from '../data/defaultDocs';

export interface ResolvedDocArticle extends DocArticle {
  id: string;
  isFromCms: boolean;
  edit: EditProxy;
}

function parseSectionsJson(raw: unknown, fallback: DocSection[]): DocSection[] {
  if (!raw) return fallback;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as DocSection[];
    }
  } catch {
    // Ignore invalid JSON and use fallback
  }
  return fallback;
}

function mapCmsEntryToDoc(
  entry: { id: string; data: Record<string, unknown>; edit?: EditProxy },
  fallback?: DocArticle
): ResolvedDocArticle {
  const data = entry.data || {};
  const slug = typeof data.slug === 'string' && data.slug ? data.slug : entry.id;
  const matchedFallback = fallback ?? DEFAULT_DOCS.find((d) => d.slug === slug);

  const categoryRaw = typeof data.category === 'string' ? data.category : matchedFallback?.category;
  const validCategories: Array<DocArticle['category']> = [
    'Getting Started',
    'Core Concepts',
    'Self-Hosting',
    'Connectors & Email',
    'Security & Privacy',
  ];
  const category: DocArticle['category'] = validCategories.includes(
    categoryRaw as DocArticle['category']
  )
    ? (categoryRaw as DocArticle['category'])
    : (matchedFallback?.category ?? 'Getting Started');

  return {
    id: entry.id,
    slug,
    title:
      typeof data.title === 'string' && data.title.trim()
        ? data.title
        : (matchedFallback?.title ?? slug),
    category,
    sortOrder:
      typeof data.sort_order === 'number'
        ? data.sort_order
        : Number(data.sort_order) || (matchedFallback?.sortOrder ?? 99),
    badge:
      typeof data.badge === 'string' && data.badge.trim()
        ? data.badge
        : (matchedFallback?.badge ?? 'Guide'),
    readingTime:
      typeof data.reading_time === 'string' && data.reading_time.trim()
        ? data.reading_time
        : (matchedFallback?.readingTime ?? '3 min read'),
    summary:
      typeof data.summary === 'string' && data.summary.trim()
        ? data.summary
        : (matchedFallback?.summary ?? ''),
    sections: parseSectionsJson(data.sections_json, matchedFallback?.sections ?? []),
    bodyMarkdown:
      typeof data.body_markdown === 'string' && data.body_markdown.trim()
        ? data.body_markdown
        : matchedFallback?.bodyMarkdown,
    isFromCms: true,
    edit: entry.edit ?? createNoop(),
  };
}

/**
 * Fetch all documentation articles from EmDash `docs` collection,
 * seamlessly merging or falling back to `DEFAULT_DOCS` if the CMS DB has not been seeded yet.
 */
export async function getAllDocs(): Promise<ResolvedDocArticle[]> {
  try {
    const { entries, error } = await getEmDashCollection('docs');
    if (!error && entries && entries.length > 0) {
      const cmsBySlug = new Map<string, ResolvedDocArticle>();
      for (const entry of entries) {
        const mapped = mapCmsEntryToDoc(entry);
        cmsBySlug.set(mapped.slug, mapped);
      }

      // Include any default docs not yet in CMS so navigation is always complete
      for (const def of DEFAULT_DOCS) {
        if (!cmsBySlug.has(def.slug)) {
          cmsBySlug.set(def.slug, {
            ...def,
            id: def.slug,
            isFromCms: false,
            edit: createNoop(),
          });
        }
      }

      return Array.from(cmsBySlug.values()).sort((a, b) => a.sortOrder - b.sortOrder);
    }
  } catch {
    // Fallback to static default docs when DB is uninitialized
  }

  return DEFAULT_DOCS.map((doc) => ({
    ...doc,
    id: doc.slug,
    isFromCms: false,
    edit: createNoop(),
  })).sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Fetch a single documentation article by slug from EmDash `docs` collection,
 * with fallback to `DEFAULT_DOCS`.
 */
export async function getDocBySlug(slug: string): Promise<ResolvedDocArticle | null> {
  const fallback = DEFAULT_DOCS.find((d) => d.slug === slug);

  try {
    const { entry, error } = await getEmDashEntry('docs', slug);
    if (!error && entry) {
      return mapCmsEntryToDoc(entry, fallback);
    }
  } catch {
    // Ignore DB lookup errors and use fallback
  }

  if (!fallback) return null;
  return {
    ...fallback,
    id: fallback.slug,
    isFromCms: false,
    edit: createNoop(),
  };
}

/**
 * Fetch customizable landing page hero copy from EmDash `pages` collection (slug: `home`),
 * falling back to `DEFAULT_LANDING_CONTENT`.
 */
export async function getLandingContent(): Promise<{
  content: LandingPageContent;
  isFromCms: boolean;
  edit: EditProxy;
}> {
  try {
    const { entry, error } = await getEmDashEntry('pages', 'home');
    if (!error && entry) {
      const d = entry.data || {};
      return {
        content: {
          badgeText:
            typeof d.badge_text === 'string' && d.badge_text.trim()
              ? d.badge_text
              : DEFAULT_LANDING_CONTENT.badgeText,
          badgeSubtext:
            typeof d.badge_subtext === 'string' && d.badge_subtext.trim()
              ? d.badge_subtext
              : DEFAULT_LANDING_CONTENT.badgeSubtext,
          headlineTop:
            typeof d.headline_top === 'string' && d.headline_top.trim()
              ? d.headline_top
              : DEFAULT_LANDING_CONTENT.headlineTop,
          headlineGradient:
            typeof d.headline_gradient === 'string' && d.headline_gradient.trim()
              ? d.headline_gradient
              : DEFAULT_LANDING_CONTENT.headlineGradient,
          subtitle:
            typeof d.subtitle === 'string' && d.subtitle.trim()
              ? d.subtitle
              : DEFAULT_LANDING_CONTENT.subtitle,
          primaryCtaLabel:
            typeof d.primary_cta_label === 'string' && d.primary_cta_label.trim()
              ? d.primary_cta_label
              : DEFAULT_LANDING_CONTENT.primaryCtaLabel,
          primaryCtaUrl:
            typeof d.primary_cta_url === 'string' && d.primary_cta_url.trim()
              ? d.primary_cta_url
              : DEFAULT_LANDING_CONTENT.primaryCtaUrl,
        },
        isFromCms: true,
        edit: entry.edit ?? createNoop(),
      };
    }
  } catch {
    // Fallback to default landing content
  }

  return {
    content: DEFAULT_LANDING_CONTENT,
    isFromCms: false,
    edit: createNoop(),
  };
}
