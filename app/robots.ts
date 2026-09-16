import type { MetadataRoute } from 'next';

/**
 * Disallow everything. This is an unsolicited concept for a business we have no
 * relationship with; it must never be discoverable as if it were theirs.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', disallow: '/' }],
    sitemap: undefined,
  };
}
