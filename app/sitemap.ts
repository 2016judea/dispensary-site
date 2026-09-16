import type { MetadataRoute } from 'next';
import { MENU } from '@/lib/rank';
import { FEELINGS } from '@/lib/feelings';
import { siteUrl } from '@/lib/jsonld';

/**
 * A real sitemap over real URLs - the point being that this site HAS real URLs:
 * every product and every strain is a server-rendered page, not a row inside an
 * iframe. It is served so the structure is demonstrable; robots.txt still
 * disallows the whole site, because this is an unsolicited concept.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const now = new Date();
  const strains = [...new Set(MENU.map((p) => p.strainSlug))];
  return [
    { url: base, lastModified: now, priority: 1 },
    { url: `${base}/shelf`, lastModified: now, priority: 0.6 },
    { url: `${base}/about`, lastModified: now, priority: 0.3 },
    ...FEELINGS.map((f) => ({ url: `${base}/find?f=${f.id}`, lastModified: now, priority: 0.8 })),
    ...strains.map((s) => ({ url: `${base}/strain/${s}`, lastModified: now, priority: 0.7 })),
    ...MENU.map((p) => ({ url: `${base}/p/${p.slug}`, lastModified: now, priority: 0.7 })),
  ];
}
