import { cookies, headers } from 'next/headers';
import { loadSkin, RISE, type Brand } from './brand';

export const SKIN_COOKIE = 'bm_skin';

/**
 * Whose store is this visitor looking at?
 *
 * Header first: middleware.ts stamps `x-demo-skin` on /demo/<slug>, so that page
 * renders in the prospect's colours and carries a disclaimer naming the right
 * company. Cookie second: set when the visitor taps "Open your store". RISE
 * otherwise, as the flagship demo.
 */
export async function currentBrand(): Promise<Brand> {
  const h = await headers();
  const fromPath = loadSkin(h.get('x-demo-skin'));
  if (fromPath) return fromPath;
  const jar = await cookies();
  return loadSkin(jar.get(SKIN_COOKIE)?.value) ?? RISE;
}
