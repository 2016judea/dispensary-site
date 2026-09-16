import { cookies } from 'next/headers';
import { loadSkin, RISE, type Brand } from './brand';

export const SKIN_COOKIE = 'bm_skin';

/** Whose store is this visitor looking at? RISE unless a /demo/<slug> set the cookie. */
export async function currentBrand(): Promise<Brand> {
  const jar = await cookies();
  return loadSkin(jar.get(SKIN_COOKIE)?.value) ?? RISE;
}
