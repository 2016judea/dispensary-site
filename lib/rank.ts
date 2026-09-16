import menuJson from '@/data/menu.json';
import { FEELING_BY_ID, chemistryScore } from './feelings';
import { allReviews } from './store';
import type { FeelingId, Product, Review } from './types';

export const MENU = menuJson as Product[];

export function productById(id: string): Product | undefined {
  return MENU.find((p) => p.id === id);
}
export function productsForStrain(slug: string): Product[] {
  return MENU.filter((p) => p.strainSlug === slug);
}

export interface Outcome { n: number; helpedPct: number; partlyPct: number }

/** verified-purchase outcomes for one product on one feeling axis */
export function outcomeFor(productId: string, feeling: FeelingId, reviews?: Review[]): Outcome {
  const rs = (reviews ?? allReviews()).filter((r) => r.productId === productId && r.feeling === feeling);
  if (!rs.length) return { n: 0, helpedPct: 0, partlyPct: 0 };
  const helped = rs.filter((r) => r.outcome === 2).length;
  const partly = rs.filter((r) => r.outcome === 1).length;
  return { n: rs.length, helpedPct: helped / rs.length, partlyPct: partly / rs.length };
}

export interface Scored {
  product: Product;
  chemistry: number;
  outcome: Outcome;
  /** blended rank score, 0..1 */
  score: number;
}

/**
 * Blend: the chemistry model is a PRIOR; verified outcomes move it.
 * Bayesian shrinkage with K pseudo-observations, so three glowing reviews do not
 * out-vote a hundred. K=8 chosen so ~8 reviews carry as much weight as the prior.
 */
const K = 8;

export function rank(products: Product[], feeling: FeelingId): Scored[] {
  const f = FEELING_BY_ID[feeling];
  const reviews = allReviews();
  return products
    .map((product) => {
      const chemistry = chemistryScore(product, f);
      const outcome = outcomeFor(product.id, feeling, reviews);
      const observed = outcome.helpedPct + 0.4 * outcome.partlyPct;
      const score = (chemistry * K + observed * outcome.n) / (K + outcome.n);
      return { product, chemistry, outcome, score };
    })
    .sort((a, b) => b.score - a.score || a.product.priceCents - b.product.priceCents);
}

/**
 * The demo shelf's stock counts are keyed to the RISE store id, because that is
 * the store the fixture was generated for. A prospect skin has its own store id
 * and no counts of its own, and treating a missing key as zero emptied the shelf
 * for every skin - a 404 on the finder, "0 things on the shelf" on /shelf.
 * Caught on production, 2026-09-16.
 *
 * So: a store we have counts for is answered from those counts. A store we have
 * no counts for falls back to "in stock anywhere", which is the honest reading of
 * a shared demo shelf. A live menu adapter always writes a key for its own store,
 * so this branch disappears the moment one is connected.
 */
export function inStock(p: Product, storeId: string | null): boolean {
  const anywhere = Object.values(p.stock).some((n) => n > 0);
  if (!storeId || !(storeId in p.stock)) return anywhere;
  return (p.stock[storeId] ?? 0) > 0;
}
