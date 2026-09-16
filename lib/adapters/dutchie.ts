import type { Product, Lineage, Format } from '../types';
import type { MenuAdapter } from '../menu-source';

/**
 * Dutchie Plus (GraphQL). The adapter that matters first in Saint Paul: four of
 * the twelve resolving dispensary sites in the city run Dutchie.
 *
 * NOT VERIFIED AGAINST A LIVE API. Dutchie Plus keys are issued per-dispensary
 * by Dutchie to the retailer, not self-serve, so we have never had one. The
 * query below follows Dutchie Plus's documented `menu` schema; the FIELD MAPPING
 * in `map()` is the part to re-check against the first real response. Terpenes
 * in particular: Dutchie exposes them only where the retailer has uploaded a
 * COA, and the shape differs between `terpenes` and `labResults`.
 */
const ENDPOINT = process.env.DUTCHIE_ENDPOINT || 'https://plus.dutchie.com/graphql';

const CATEGORY_TO_FORMAT: Record<string, Format> = {
  FLOWER: 'flower', PRE_ROLLS: 'preroll', VAPORIZERS: 'vape',
  EDIBLE: 'edible', EDIBLES: 'edible', TINCTURE: 'tincture', BEVERAGE: 'beverage',
};
const STRAIN_TO_LINEAGE: Record<string, Lineage> = {
  INDICA: 'indica', SATIVA: 'sativa', HYBRID: 'hybrid',
  INDICA_DOMINANT: 'indica', SATIVA_DOMINANT: 'sativa',
};

const QUERY = `query Menu($dispensaryId: ID!) {
  menu(dispensaryId: $dispensaryId) {
    products {
      id name brandName strainType type subcategory
      image
      potencyThc { formatted range }
      potencyCbd { formatted range }
      terpenes { terpene { name } value }
      variants { id option priceRec quantity }
    }
  }
}`;

export class DutchieAdapter implements MenuAdapter {
  readonly source = 'dutchie' as const;
  readonly verified = false;
  constructor(private apiKey: string, private dispensaryId: string) {}

  private async query(): Promise<{ products: unknown[] }> {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({ query: QUERY, variables: { dispensaryId: this.dispensaryId } }),
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error(`dutchie ${res.status}: ${await res.text()}`);
    const json = await res.json();
    if (json.errors) throw new Error(`dutchie graphql: ${JSON.stringify(json.errors)}`);
    return json.data.menu;
  }

  /**
   * The one function to re-check on the first live call. Everything else in this
   * adapter is transport.
   */
  private map(raw: any, storeId: string): Product {
    const format = CATEGORY_TO_FORMAT[String(raw.type || '').toUpperCase()] ?? 'flower';
    const lineage = STRAIN_TO_LINEAGE[String(raw.strainType || '').toUpperCase()] ?? 'hybrid';
    const variant = (raw.variants || [])[0] || {};
    const thcPct = num(raw.potencyThc?.formatted);
    const cbdPct = num(raw.potencyCbd?.formatted);
    const terp: Record<string, number> = {};
    let total = 0;
    for (const t of raw.terpenes || []) {
      const k = String(t?.terpene?.name || '').toLowerCase();
      const v = Number(t?.value) || 0;
      if (k) { terp[k] = v; total += v; }
    }
    // the feeling model wants SHARES that sum to ~1, not raw percentages
    const shares = {
      myrcene: 0, caryophyllene: 0, pinene: 0, linalool: 0,
      limonene: 0, terpinolene: 0, humulene: 0,
    };
    if (total > 0) for (const k of Object.keys(shares)) {
      (shares as any)[k] = (terp[k] ?? 0) / total;
    }
    const strength = thcPct == null ? 'standard'
      : thcPct < 12 ? 'gentle' : thcPct < 24 ? 'standard' : 'strong';
    const slug = String(raw.name || raw.id).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return {
      id: String(raw.id), slug, name: String(raw.name), strain: String(raw.name),
      strainSlug: slug, brand: String(raw.brandName || ''), lineage, format,
      formatLabel: String(raw.subcategory || raw.type || ''),
      size: String(variant.option || ''),
      onset: format === 'edible' || format === 'tincture' ? '45-90 min' : '5-10 min',
      duration: format === 'edible' ? '4-8 hr' : '2-3 hr',
      thcPct, cbdPct, thcObserved: thcPct != null,
      thcMgPerServing: null, servings: null,
      totalThcMg: 0,
      strength,
      terpenes: shares,
      priceCents: Math.round(Number(variant.priceRec || 0) * 100),
      stock: { [storeId]: Number(variant.quantity ?? 0) },
    };
  }

  async listProducts(): Promise<Product[]> {
    const menu = await this.query();
    return (menu.products || []).map((p) => this.map(p, this.dispensaryId));
  }
  async getProduct(id: string) {
    return (await this.listProducts()).find((p) => p.id === id);
  }
}

function num(s: unknown): number | null {
  if (s == null) return null;
  const m = String(s).match(/[\d.]+/);
  return m ? Number(m[0]) : null;
}
