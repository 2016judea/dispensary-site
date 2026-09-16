import menuJson from '@/data/menu.json';
import type { Product } from '../types';
import type { MenuAdapter } from '../menu-source';

/** The committed demo shelf. Regenerate with `node scripts/gen-menu.mjs`. */
export class FixtureMenuAdapter implements MenuAdapter {
  readonly source = 'fixture' as const;
  readonly verified = true;
  private products = menuJson as unknown as Product[];
  async listProducts() { return this.products; }
  async getProduct(id: string) { return this.products.find((p) => p.id === id); }
}
