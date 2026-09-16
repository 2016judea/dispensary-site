import type { Brand, Store } from './brand';
import type { Product, FeelingId } from './types';
import type { Outcome } from './rank';

const DAY_URI: Record<string, string> = {
  Mon: 'https://schema.org/Monday', Tue: 'https://schema.org/Tuesday',
  Wed: 'https://schema.org/Wednesday', Thu: 'https://schema.org/Thursday',
  Fri: 'https://schema.org/Friday', Sat: 'https://schema.org/Saturday',
  Sun: 'https://schema.org/Sunday',
};

export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://dispensary-site.vercel.app';
}

/**
 * LocalBusiness with real hours and a real address.
 *
 * Hours are emitted ONLY where we verified them. brand.json carries RISE St.
 * Paul's, read off risecannabis.com on 2026-09-15; generated prospect skins
 * carry `hours: null` and therefore emit no openingHoursSpecification at all,
 * because a plausible guess in structured data is worse than a gap.
 */
export function localBusiness(b: Brand, store: Store) {
  const hours = store.hours
    ? Object.entries(store.hours).map(([d, range]) => {
        const [opens, closes] = range.split('-');
        return { '@type': 'OpeningHoursSpecification', dayOfWeek: DAY_URI[d], opens, closes };
      })
    : undefined;
  return {
    '@context': 'https://schema.org',
    '@type': 'Store',
    '@id': `${siteUrl()}/#store`,
    name: b.storeName,
    description: `Cannabis dispensary in ${store.city}, Minnesota. Independent concept build by Brick & Mortar.`,
    url: siteUrl(),
    telephone: b.phone || undefined,
    address: {
      '@type': 'PostalAddress', streetAddress: store.street, addressLocality: store.city,
      addressRegion: store.state, postalCode: store.zip, addressCountry: 'US',
    },
    geo: { '@type': 'GeoCoordinates', latitude: store.lat, longitude: store.lng },
    openingHoursSpecification: hours,
    currenciesAccepted: 'USD',
    paymentAccepted: 'Cash, Debit, ACH bank transfer',
    ...(b.rating ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: b.rating, reviewCount: b.reviews ?? 1 } } : {}),
  };
}

export function productLd(b: Brand, p: Product, outcomes: Partial<Record<FeelingId, Outcome>>) {
  const reviewed = Object.values(outcomes).filter((o): o is Outcome => !!o && o.n > 0);
  const n = reviewed.reduce((a, o) => a + o.n, 0);
  // Map the "did it do the job" axis onto a 1-5 scale so the markup is honest:
  // helped = 5, sort of = 3, no = 1.
  const rating = n
    ? reviewed.reduce((a, o) => a + (o.helpedPct * 5 + o.partlyPct * 3 + (1 - o.helpedPct - o.partlyPct) * 1) * o.n, 0) / n
    : null;
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${siteUrl()}/p/${p.slug}#product`,
    name: p.name,
    sku: p.id,
    category: p.formatLabel,
    brand: { '@type': 'Brand', name: p.brand },
    description: `${p.strain}, a ${p.lineage} ${p.formatLabel.toLowerCase()} in ${p.size}. ` +
      (p.thcPct != null ? `${p.thcPct}% THC. ` : `${p.thcMgPerServing}mg THC per serving. `) +
      `Onset ${p.onset}, lasting ${p.duration}.`,
    additionalProperty: [
      { '@type': 'PropertyValue', name: 'Lineage', value: p.lineage },
      ...(p.thcPct != null ? [{ '@type': 'PropertyValue', name: 'Total THC', value: `${p.thcPct}%` }] : []),
      ...(p.cbdPct != null ? [{ '@type': 'PropertyValue', name: 'Total CBD', value: `${p.cbdPct}%` }] : []),
    ],
    offers: {
      '@type': 'Offer',
      url: `${siteUrl()}/p/${p.slug}`,
      price: (p.priceCents / 100).toFixed(2),
      priceCurrency: 'USD',
      availability: Object.values(p.stock).some((v) => v > 0)
        ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: b.storeName },
    },
    ...(rating && n >= 3
      ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: Number(rating.toFixed(2)), reviewCount: n, bestRating: 5, worstRating: 1 } }
      : {}),
  };
}

export function ld(obj: unknown) {
  return { __html: JSON.stringify(obj) };
}
