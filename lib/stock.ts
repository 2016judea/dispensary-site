import { inStock } from './rank';
import type { Product } from './types';

/**
 * The lines on an order that the shelf cannot fill. The README's own argument
 * for this product is a customer who drove across town on a confirmed pickup
 * order that was not on the shelf; until 2026-10-18 /api/order checked the
 * Minnesota caps and never this, so a product with zero stock everywhere could
 * be ordered. Same stock reading as the finder (inStock), so what can be bought
 * is exactly what is shown.
 */
export function offShelf(lines: { product: Product; qty: number }[], storeId: string | null): Product[] {
  return lines.filter((l) => !inStock(l.product, storeId)).map((l) => l.product);
}
