import type { Product } from './types';

/**
 * Minn. Stat. 342.27 subd. 2(c): a retailer may sell an individual customer, in
 * a single transaction, up to two ounces of adult-use cannabis flower, up to
 * eight grams of adult-use cannabis concentrate, and (342.09 subd. 1) edible
 * products totalling no more than 800 milligrams of THC.
 *
 * This is the one rule that sits between "one tap" and "order placed", so it is
 * enforced in code rather than trusted to the UI. See docs/compliance-mn.md.
 *
 * The AGE CHECK is deliberately NOT here. Minn. Stat. 342.27 subd. 4(a) requires
 * that "prior to initiating a sale, an EMPLOYEE ... must verify that the customer
 * is at least 21 years of age" against a government-issued ID. That is a person
 * looking at a card at the counter. A pickup order is not the sale; the sale
 * happens when they hand it over. So one-tap ordering does not skip anything the
 * statute requires online - and the order screen says, in words, that ID is
 * checked at the counter.
 */
export const FLOWER_GRAM_LIMIT = 56.7;   // 2 oz
export const CONCENTRATE_GRAM_LIMIT = 8;
export const EDIBLE_THC_MG_LIMIT = 800;

const FLOWER_GRAMS: Record<string, number> = {
  flower: 3.5, minibuds: 7, preroll: 1.75, bigdog: 0.75,
};

export interface LimitCheck { ok: boolean; reason?: string }

export function checkLimits(lines: { product: Product; qty: number }[]): LimitCheck {
  let flower = 0, concentrate = 0, edibleMg = 0;
  for (const { product, qty } of lines) {
    if (FLOWER_GRAMS[product.format]) flower += FLOWER_GRAMS[product.format] * qty;
    else if (product.format === 'vape') concentrate += 0.5 * qty;
    else edibleMg += (product.totalThcMg || 0) * qty;
  }
  if (flower > FLOWER_GRAM_LIMIT)
    return { ok: false, reason: `Minnesota caps one purchase at two ounces of flower. This order is ${flower.toFixed(1)}g.` };
  if (concentrate > CONCENTRATE_GRAM_LIMIT)
    return { ok: false, reason: `Minnesota caps one purchase at 8g of concentrate. This order is ${concentrate.toFixed(1)}g.` };
  if (edibleMg > EDIBLE_THC_MG_LIMIT)
    return { ok: false, reason: `Minnesota caps one purchase at 800mg of edible THC. This order is ${edibleMg}mg.` };
  return { ok: true };
}
