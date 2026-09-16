/**
 * MN cannabis tax, demo.
 *
 * 24.88% effective, which is not a rate we invented: it is the rate RISE St.
 * Paul's own cart quoted on 2026-09-15 - a $50.00 RYTHM Animal Face 3.5g showed
 * an "Estimated Total" of $62.44. ($62.44 - $50.00) / $50.00 = 0.2488.
 *
 * Minnesota levies a 10% cannabis gross receipts tax (Minn. Stat. 295.81) on top
 * of state and local sales tax; RISE does not publish the split, so we reproduce
 * the effective rate rather than assert a composition we could not verify.
 * On a live build this comes from the POS, not from here.
 */
export const DEMO_TAX_RATE = 0.2488;
export const TAX_BASIS = '$50.00 item quoted at $62.44 on risecannabis.com, 2026-09-15';

export function money(cents: number): string {
  return '$' + (cents / 100).toFixed(2);
}

export function totals(subtotalCents: number) {
  const taxCents = Math.round(subtotalCents * DEMO_TAX_RATE);
  return { subtotalCents, taxCents, totalCents: subtotalCents + taxCents };
}
