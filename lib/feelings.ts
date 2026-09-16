import type { FeelingId, Lineage, Product, Terpenes } from './types';

/**
 * The feeling model.
 *
 * Every weight here is documented, with its source and its evidence strength,
 * in docs/feeling-model.md. Read that before changing a number.
 *
 * Honest framing, because MN Stat. 342.64 subd.1(2) bans unverified health
 * claims: this ranks products by how closely their measured chemistry matches
 * a profile, and then re-ranks by what other shoppers chasing the same feeling
 * actually reported. It is a shopping heuristic. It is not a medical claim, and
 * nothing in the UI may phrase it as one.
 */

export interface Feeling {
  id: FeelingId;
  label: string;
  /** shopper-facing, non-therapeutic phrasing */
  blurb: string;
  /**
   * What the shopper sees. Written as the SHOPPER'S GOAL, never as a claim about
   * what the product does - Minn. Stat. 342.64 subd. 1(2) bans "unverified claims
   * about the health or therapeutic benefits or effects" of cannabis. "Heading
   * for bed" describes the person. "Helps you sleep" describes the product and
   * would be a claim. See docs/compliance-mn.md.
   */
  shopperBlurb: string;
  terpeneWeights: Partial<Record<keyof Terpenes, number>>;
  lineageWeights: Record<Lineage, number>;
  /** preferred CBD:THC posture. 0 = THC-forward, 1 = CBD-forward */
  cbdPreference: number;
  /** preferred potency posture, 0 = low, 1 = high */
  potencyPreference: number;
}

export const FEELINGS: Feeling[] = [
  {
    id: 'sleep',
    label: 'Sleepy',
    shopperBlurb: 'Heading for bed.',
    blurb: 'Heavier, myrcene- and linalool-forward, usually indica.',
    terpeneWeights: { myrcene: 1.0, linalool: 0.8, humulene: 0.2, caryophyllene: 0.2, limonene: -0.4, terpinolene: -0.6, pinene: -0.5 },
    lineageWeights: { indica: 1.0, hybrid: 0.4, sativa: -0.4 },
    cbdPreference: 0.25,
    potencyPreference: 0.6,
  },
  {
    id: 'calm',
    label: 'Relaxed',
    shopperBlurb: 'Taking the edge off.',
    blurb: 'Linalool-forward with CBD in the mix, gentler on potency.',
    terpeneWeights: { linalool: 1.0, myrcene: 0.5, caryophyllene: 0.4, limonene: 0.1, terpinolene: -0.3, pinene: -0.1 },
    lineageWeights: { indica: 0.7, hybrid: 0.7, sativa: -0.2 },
    cbdPreference: 0.8,
    potencyPreference: 0.25,
  },
  {
    id: 'focus',
    label: 'Clear-headed',
    shopperBlurb: 'Something to get through.',
    blurb: 'Pinene-forward, low myrcene, kept deliberately low-potency.',
    terpeneWeights: { pinene: 1.0, limonene: 0.5, terpinolene: 0.3, myrcene: -0.8, linalool: -0.4 },
    lineageWeights: { sativa: 0.9, hybrid: 0.3, indica: -0.7 },
    cbdPreference: 0.5,
    potencyPreference: 0.2,
  },
  {
    id: 'social',
    label: 'Energetic',
    shopperBlurb: 'Out with people.',
    blurb: 'Limonene-forward, bright, usually sativa or sativa-leaning hybrid.',
    terpeneWeights: { limonene: 1.0, terpinolene: 0.5, pinene: 0.3, myrcene: -0.5, linalool: -0.3 },
    lineageWeights: { sativa: 0.8, hybrid: 0.5, indica: -0.5 },
    cbdPreference: 0.2,
    potencyPreference: 0.5,
  },
  {
    id: 'relief',
    label: 'Pain free',
    shopperBlurb: 'Something aches.',
    blurb: 'Caryophyllene- and CBD-forward. The one profile with direct receptor evidence.',
    terpeneWeights: { caryophyllene: 1.0, humulene: 0.4, myrcene: 0.4, linalool: 0.3, terpinolene: -0.2 },
    lineageWeights: { indica: 0.6, hybrid: 0.6, sativa: 0.0 },
    cbdPreference: 0.85,
    potencyPreference: 0.45,
  },
  {
    id: 'creative',
    label: 'Creative',
    shopperBlurb: 'Making something.',
    blurb: 'Terpinolene- and limonene-forward, sativa-leaning.',
    terpeneWeights: { terpinolene: 1.0, limonene: 0.6, pinene: 0.3, myrcene: -0.5, linalool: -0.2 },
    lineageWeights: { sativa: 0.8, hybrid: 0.5, indica: -0.5 },
    cbdPreference: 0.3,
    potencyPreference: 0.45,
  },
];

export const FEELING_BY_ID = Object.fromEntries(FEELINGS.map((f) => [f.id, f])) as Record<FeelingId, Feeling>;

/** "did this actually help you sleep?" — the review prompt, per feeling */
export const REVIEW_PROMPT: Record<FeelingId, string> = {
  sleep: 'Did this actually help you sleep?',
  calm: 'Did this actually take the edge off?',
  focus: 'Did this actually keep you clear-headed?',
  social: 'Did this actually work for a night out?',
  relief: 'Did this actually help the ache?',
  creative: 'Did this actually get you making something?',
};

/** Past tense, for the one line under a ranked product. */
export const WANTED_IT_FOR: Record<FeelingId, string> = {
  sleep: 'wanted to sleep',
  calm: 'wanted to take the edge off',
  focus: 'wanted to stay clear-headed',
  social: 'wanted a night out',
  relief: 'had something aching',
  creative: 'wanted to make something',
};

/**
 * RISE's own menu already carries these axes. Measured on their live St. Paul
 * menu 2026-09-15: the facet `refinementList[feelings][]` offers Blissful,
 * Creative, Energetic, Hungry, Pain free, Relaxed, Sleepy, and the Animal Face
 * product page prints "TOP FEELINGS MENTIONED: Relaxed (2055), Pain free (992),
 * Blissful (990)" under 2,858 reviews. Our labels are deliberately theirs where
 * they overlap, so the vocabulary a St. Paul shopper already knows carries over.
 */
export const RISE_FACET_EQUIVALENT: Record<FeelingId, string> = {
  sleep: 'Sleepy', calm: 'Relaxed', focus: 'Energetic',
  social: 'Blissful', relief: 'Pain free', creative: 'Creative',
};

function cbdShare(p: Product): number {
  const thc = p.thcPct ?? (p.thcMgPerServing ?? 5) / 2; // tinctures/edibles: coarse proxy
  const cbd = p.cbdPct ?? 0;
  if (thc + cbd === 0) return 0;
  return cbd / (thc + cbd);
}

function potencyShare(p: Product): number {
  if (p.thcPct != null) return Math.min(1, p.thcPct / 28);
  if (p.thcMgPerServing != null) return Math.min(1, p.thcMgPerServing / 20);
  return 0.5;
}

/** chemistry-only match, 0..1 */
export function chemistryScore(p: Product, f: Feeling): number {
  let terp = 0;
  for (const [k, w] of Object.entries(f.terpeneWeights)) {
    terp += (p.terpenes[k as keyof Terpenes] ?? 0) * (w as number);
  }
  // terpene shares sum to ~1, weights are -1..1, so terp lands roughly -0.8..1
  const terpN = (terp + 0.8) / 1.8;
  const lineageN = (f.lineageWeights[p.lineage] + 1) / 2;
  const cbdN = 1 - Math.abs(cbdShare(p) - f.cbdPreference);
  const potN = 1 - Math.abs(potencyShare(p) - f.potencyPreference);
  const raw = 0.5 * terpN + 0.2 * lineageN + 0.18 * cbdN + 0.12 * potN;
  return Math.max(0, Math.min(1, raw));
}
