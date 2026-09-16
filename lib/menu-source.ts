import type { Product } from './types';
import { FixtureMenuAdapter } from './adapters/fixture';
import { JaneAdapter } from './adapters/jane';
import { DutchieAdapter } from './adapters/dutchie';

/**
 * ONE interface, three implementations. Nothing above this file knows which
 * menu platform a given dispensary runs.
 *
 * Which one is live is a deployment decision, not a code change:
 *   MENU_SOURCE=dutchie  DUTCHIE_API_KEY=... DUTCHIE_DISPENSARY_ID=...
 *   MENU_SOURCE=jane     JANE_API_KEY=...    JANE_STORE_ID=...
 *   (unset)              -> fixture, the committed demo shelf
 *
 * Why Dutchie is implemented first, against the brief's "Jane native":
 * of the 12 Saint Paul dispensary sites that resolve, four run Dutchie, two run
 * Dispense, one Weedmaps, one BLAZE/Tymber, two plain WordPress and two are
 * effectively empty. None runs Jane's storefront. RISE is the exception and it
 * is not a Jane storefront either - risecannabis.com is Green Thumb Industries'
 * own Next.js application (see docs/INTEGRATIONS.md) that sources its catalogue
 * and reviews FROM Jane. So Jane matters as a data source, Dutchie as a
 * storefront to replace. Both sit behind this interface as peers.
 */
export interface MenuAdapter {
  readonly source: 'fixture' | 'jane' | 'dutchie';
  /** true when this adapter has ever been run against a real API by us */
  readonly verified: boolean;
  listProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
}

let cached: MenuAdapter | null = null;

export function getMenuAdapter(): MenuAdapter {
  if (cached) return cached;
  const src = (process.env.MENU_SOURCE || '').toLowerCase();
  const { DUTCHIE_API_KEY, DUTCHIE_DISPENSARY_ID, JANE_API_KEY, JANE_STORE_ID } = process.env;
  if (src === 'dutchie' && DUTCHIE_API_KEY && DUTCHIE_DISPENSARY_ID) {
    cached = new DutchieAdapter(DUTCHIE_API_KEY, DUTCHIE_DISPENSARY_ID);
  } else if (src === 'jane' && JANE_API_KEY && JANE_STORE_ID) {
    cached = new JaneAdapter(JANE_API_KEY, JANE_STORE_ID);
  } else {
    cached = new FixtureMenuAdapter();
  }
  return cached;
}

export { FixtureMenuAdapter, JaneAdapter, DutchieAdapter };
