import type { Format, Product, Strength } from './types';

/**
 * The adaptive question engine.
 *
 * Rule: ask a question only when it ELIMINATES. After every answer we recompute
 * the candidate set; if it is already small enough to show, we stop and show it.
 * There is no fixed number of steps and no progress bar, because the number of
 * questions is a property of the inventory in front of this shopper, not of a
 * funnel someone drew.
 *
 * Which question next: the one with the lowest expected remaining set size
 * (Gini-style), i.e. the one that cuts hardest. Options that would return an
 * empty set are never shown.
 */

export type AnswerKey = 'speed' | 'format' | 'strength' | 'price';
export type Answers = Partial<Record<AnswerKey, string>>;

interface Attribute {
  key: AnswerKey;
  question: string;
  /** which bucket does this product fall in? */
  bucket: (p: Product) => string;
  /** display order + label for a bucket */
  options: { value: string; label: string; sub?: string }[];
}

const FAST: Format[] = ['vape', 'preroll', 'bigdog', 'flower', 'minibuds'];

export const ATTRIBUTES: Attribute[] = [
  {
    key: 'speed',
    question: 'How soon do you want to feel it?',
    bucket: (p) => (FAST.includes(p.format) ? 'fast' : 'slow'),
    options: [
      { value: 'fast', label: 'Within minutes', sub: 'Inhaled. Wears off in 1-3 hours.' },
      { value: 'slow', label: 'I can wait an hour', sub: 'Eaten or under the tongue. Lasts 4-8 hours.' },
    ],
  },
  {
    key: 'format',
    question: 'How do you want to take it?',
    bucket: (p) => p.format,
    options: [
      { value: 'flower', label: 'Flower', sub: '3.5g jar' },
      { value: 'minibuds', label: 'Mini buds', sub: '7g jar' },
      { value: 'preroll', label: 'Pre-rolls', sub: '5-pack' },
      { value: 'bigdog', label: 'One pre-roll', sub: '0.75g' },
      { value: 'vape', label: 'Vape cart', sub: '0.5g' },
      { value: 'edible', label: 'Gummies', sub: '10 x 5mg' },
      { value: 'beverage', label: 'Drink', sub: '12oz can' },
      { value: 'tincture', label: 'Tincture', sub: '30ml' },
    ],
  },
  {
    key: 'strength',
    question: 'How strong?',
    bucket: (p) => p.strength,
    options: [
      { value: 'gentle', label: 'Gentle', sub: 'New to it, or a light touch.' },
      { value: 'standard', label: 'Standard', sub: 'What most people buy.' },
      { value: 'strong', label: 'Strong', sub: 'High tolerance.' },
    ],
  },
  {
    key: 'price',
    question: 'What are you looking to spend?',
    bucket: (p) => (p.priceCents < 2500 ? 'low' : p.priceCents <= 5000 ? 'mid' : 'high'),
    options: [
      { value: 'low', label: 'Under $25' },
      { value: 'mid', label: '$25 to $50' },
      { value: 'high', label: 'Over $50' },
    ],
  },
];

const ATTR_BY_KEY = Object.fromEntries(ATTRIBUTES.map((a) => [a.key, a])) as Record<AnswerKey, Attribute>;

export function applyAnswers(products: Product[], answers: Answers): Product[] {
  let out = products;
  for (const [k, v] of Object.entries(answers)) {
    if (!v) continue;
    const attr = ATTR_BY_KEY[k as AnswerKey];
    if (!attr) continue;
    const next = out.filter((p) => attr.bucket(p) === v);
    if (next.length) out = next; // an answer that empties the shelf is ignored, never a dead end
  }
  return out;
}

/** below this the shelf is short enough to just show */
export const SHOW_AT = 6;
/** never ask more than this many narrowing questions after the feeling */
export const MAX_QUESTIONS = 3;
/**
 * A question must fit one phone screen without scrolling. At a 60px minimum tap
 * target on a 390x664 viewport, that is five options under a heading - measured,
 * not guessed. An attribute with more live buckets than this is not ELIGIBLE
 * yet; it becomes eligible as earlier answers thin the shelf.
 *
 * This is what makes the order come out human without anybody hardcoding a
 * funnel. On the 74-product demo shelf, "how do you want to take it?" splits
 * hardest but has eight live buckets, so the engine asks "how soon do you want
 * to feel it?" first (two options, halves the shelf) and format becomes askable
 * inside the half that is left.
 */
export const MAX_OPTIONS = 5;

export interface NextQuestion {
  key: AnswerKey;
  question: string;
  options: { value: string; label: string; sub?: string; count: number }[];
}

/** expected remaining candidate count if we ask this attribute */
function expectedRemaining(candidates: Product[], attr: Attribute): number {
  const groups = new Map<string, number>();
  for (const p of candidates) groups.set(attr.bucket(p), (groups.get(attr.bucket(p)) ?? 0) + 1);
  if (groups.size < 2) return candidates.length; // splits nothing
  let e = 0;
  for (const n of groups.values()) e += (n / candidates.length) * n;
  return e;
}

/**
 * Does answering this attribute CHANGE THE ANSWER, or only shorten the list?
 *
 * Aidan's rule has two halves - ask only while the set is too large AND "the
 * answer materially changes the recommendation" - and the second half is the one
 * that keeps "what are you looking to spend?" off the first screen. Price splits
 * the demo shelf harder than anything else (15/47/12 of 74), so pure elimination
 * asks it first. But the top-ranked product for someone chasing sleep is the
 * same product in every price band; the question sorts the shelf without
 * changing what we would tell them. Format and onset genuinely change it.
 *
 * So we compute it rather than assert it: run the ranker inside each bucket and
 * see whether the winner differs. An attribute that leaves the same product on
 * top in every bucket is asked only when nothing else is left to ask.
 */
function changesTheAnswer(
  candidates: Product[], attr: Attribute, topPick: (ps: Product[]) => string | null,
): boolean {
  const buckets = new Map<string, Product[]>();
  for (const p of candidates) {
    const k = attr.bucket(p);
    (buckets.get(k) ?? buckets.set(k, []).get(k)!).push(p);
  }
  const winners = new Set<string>();
  for (const ps of buckets.values()) {
    const w = topPick(ps);
    if (w) winners.add(w);
  }
  return winners.size > 1;
}

export function nextQuestion(
  candidates: Product[],
  answers: Answers,
  topPick?: (ps: Product[]) => string | null,
): NextQuestion | null {
  if (candidates.length <= SHOW_AT) return null;
  if (Object.keys(answers).filter((k) => answers[k as AnswerKey]).length >= MAX_QUESTIONS) return null;

  const liveBuckets = (attr: Attribute) =>
    new Set(candidates.map((p) => attr.bucket(p))).size;

  const eligible: { attr: Attribute; e: number; changes: boolean }[] = [];
  for (const attr of ATTRIBUTES) {
    if (answers[attr.key]) continue;
    if (liveBuckets(attr) > MAX_OPTIONS) continue; // would not fit one screen
    const e = expectedRemaining(candidates, attr);
    if (e >= candidates.length) continue; // eliminates nothing — do not ask it
    eligible.push({ attr, e, changes: topPick ? changesTheAnswer(candidates, attr, topPick) : true });
  }
  if (!eligible.length) return null;
  const pool = eligible.some((x) => x.changes) ? eligible.filter((x) => x.changes) : eligible;
  const best = pool.reduce((a, b) => (b.e < a.e ? b : a));

  const counts = new Map<string, number>();
  for (const p of candidates) counts.set(best.attr.bucket(p), (counts.get(best.attr.bucket(p)) ?? 0) + 1);
  const options = best.attr.options
    .map((o) => ({ ...o, count: counts.get(o.value) ?? 0 }))
    .filter((o) => o.count > 0);
  if (options.length < 2) return null;

  return { key: best.attr.key, question: best.attr.question, options };
}

export type { Strength };
