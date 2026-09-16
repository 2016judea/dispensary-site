import type { Product, Lineage, Format } from '../types';
import type { MenuAdapter } from '../menu-source';

/**
 * Jane (iheartjane). PARTNER-GATED: no self-serve signup, api.iheartjane.com is
 * behind Cloudflare, and a Jane partner rep must enable API access for the
 * dispensary's account. So this is NOT VERIFIED against a live API.
 *
 * Why it is here anyway, even though no Saint Paul independent runs Jane:
 * RISE St. Paul's catalogue comes from Jane. Measured 2026-09-15 on
 * risecannabis.com/dispensaries/minnesota/st-paul/6456/recreational-menu/ -
 * every product image is served from product-assets.iheartjane.com, product
 * URLs carry Jane product ids (/product/592210/rythm-animal-face/), and the
 * PDP's review block renders Jane's own review taxonomy verbatim:
 *   TOP ACTIVITIES MENTIONED: Ease my mind (1771), Get relief (1539), Get some sleep (1321)
 *   TOP FEELINGS MENTIONED:   Relaxed (2055), Pain free (992), Blissful (990)
 *
 * That last block is the single most important fact in this repo. The feeling
 * axis this whole site is built on ALREADY EXISTS in the data RISE receives from
 * Jane. It is rendered as a summary at the bottom of a product page nobody
 * scrolls to, and as a filter chip inside a grid. It never ranks anything and it
 * is never the first question. That is the gap.
 */
const BASE = process.env.JANE_API_BASE || 'https://api.iheartjane.com/v1';

const KIND_TO_LINEAGE: Record<string, Lineage> = {
  indica: 'indica', sativa: 'sativa', hybrid: 'hybrid', cbd: 'hybrid',
};
const CATEGORY_TO_FORMAT: Record<string, Format> = {
  flower: 'flower', 'pre-roll': 'preroll', preroll: 'preroll', vape: 'vape',
  extract: 'vape', edible: 'edible', tincture: 'tincture', beverage: 'beverage',
};

export interface JaneProductRaw {
  product_id: number; name: string; brand?: string; kind?: string;
  category?: string; percent_thc?: number; percent_cbd?: number;
  available_weights?: string[]; price_each?: number; price_eighth_ounce?: number;
  /** Jane's own aggregated review axes - the ones rendered on the RISE PDP */
  aggregate_rating?: number; review_count?: number;
  top_feelings?: { name: string; count: number }[];
  top_activities?: { name: string; count: number }[];
  terpenes?: { name: string; value: number }[];
}

export class JaneAdapter implements MenuAdapter {
  readonly source = 'jane' as const;
  readonly verified = false;
  constructor(private apiKey: string, private storeId: string) {}

  private async get(pathname: string) {
    const res = await fetch(`${BASE}${pathname}`, {
      headers: { Authorization: `Bearer ${this.apiKey}`, Accept: 'application/json' },
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error(`jane ${res.status} on ${pathname}`);
    return res.json();
  }

  /** The one function to re-check on the first live call. */
  private map(raw: JaneProductRaw): Product {
    const lineage = KIND_TO_LINEAGE[String(raw.kind || '').toLowerCase()] ?? 'hybrid';
    const format = CATEGORY_TO_FORMAT[String(raw.category || '').toLowerCase()] ?? 'flower';
    const terp: Record<string, number> = {};
    let total = 0;
    for (const t of raw.terpenes || []) {
      const k = String(t.name || '').toLowerCase();
      const v = Number(t.value) || 0;
      if (k) { terp[k] = v; total += v; }
    }
    const shares = { myrcene: 0, caryophyllene: 0, pinene: 0, linalool: 0, limonene: 0, terpinolene: 0, humulene: 0 };
    if (total > 0) for (const k of Object.keys(shares)) (shares as any)[k] = (terp[k] ?? 0) / total;
    const thcPct = raw.percent_thc ?? null;
    const slug = String(raw.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return {
      id: String(raw.product_id), slug, name: raw.name, strain: raw.name, strainSlug: slug,
      brand: raw.brand ?? '', lineage, format, formatLabel: raw.category ?? '',
      size: (raw.available_weights || [])[0] ?? '',
      onset: format === 'edible' || format === 'tincture' ? '45-90 min' : '5-10 min',
      duration: format === 'edible' ? '4-8 hr' : '2-3 hr',
      thcPct, cbdPct: raw.percent_cbd ?? null, thcObserved: thcPct != null,
      thcMgPerServing: null, servings: null, totalThcMg: 0,
      strength: thcPct == null ? 'standard' : thcPct < 12 ? 'gentle' : thcPct < 24 ? 'standard' : 'strong',
      terpenes: shares,
      priceCents: Math.round((raw.price_eighth_ounce ?? raw.price_each ?? 0) * 100),
      stock: { [this.storeId]: 1 },
    };
  }

  async listProducts(): Promise<Product[]> {
    const json = await this.get(`/stores/${this.storeId}/menu_products`);
    return (json.products as JaneProductRaw[]).map((p) => this.map(p));
  }
  async getProduct(id: string) {
    const json = await this.get(`/stores/${this.storeId}/menu_products/${id}`);
    return json.product ? this.map(json.product) : undefined;
  }
}
