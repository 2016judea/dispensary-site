import { NextResponse } from 'next/server';
import { FEELINGS } from '@/lib/feelings';
import { ATTRIBUTES, applyAnswers, nextQuestion, type Answers } from '@/lib/questions';
import { MENU, inStock, rank } from '@/lib/rank';
import { loadSkin, RISE } from '@/lib/brand';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Walks EVERY path through the REAL question engine - the same functions the
 * finder renders with - and returns the distribution of how many questions a
 * shopper is asked before they are shown a product.
 *
 * It exists so the tap counts in the README are measured off the shipped code
 * rather than typed from a design intention. scripts/measure-taps.mjs prints it.
 */
export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get('skin');
  const brand = loadSkin(slug) ?? RISE;
  const storeId = brand.stores[0]?.id ?? null;
  const stocked = MENU.filter((p) => inStock(p, storeId));

  const paths: { feeling: string; answers: Answers; questions: number; shelf: number; pick: string }[] = [];

  function walk(feeling: string, answers: Answers, depth: number) {
    const candidates = applyAnswers(stocked, answers);
    const q = nextQuestion(candidates, answers, (ps) => rank(ps, feeling as any)[0]?.product.id ?? null);
    if (!q) {
      const top = rank(candidates, feeling as any)[0];
      paths.push({
        feeling, answers: { ...answers }, questions: depth,
        shelf: candidates.length, pick: top ? top.product.id : '(none)',
      });
      return;
    }
    for (const o of q.options) walk(feeling, { ...answers, [q.key]: o.value }, depth + 1);
  }

  for (const f of FEELINGS) walk(f.id, {}, 0);

  const counts = paths.map((p) => p.questions).sort((a, b) => a - b);
  const median = counts[Math.floor(counts.length / 2)];
  const hist: Record<number, number> = {};
  for (const c of counts) hist[c] = (hist[c] ?? 0) + 1;

  // The shortest honest journey: answer only the feeling, take whatever the
  // engine asks, buy the top pick.
  const perFeeling = FEELINGS.map((f) => {
    const only = paths.filter((p) => p.feeling === f.id);
    const min = Math.min(...only.map((p) => p.questions));
    const max = Math.max(...only.map((p) => p.questions));
    return { feeling: f.id, label: f.label, minQuestions: min, maxQuestions: max, paths: only.length };
  });

  return NextResponse.json({
    skin: brand.slug,
    shelf: stocked.length,
    attributes: ATTRIBUTES.map((a) => a.key),
    paths: paths.length,
    questions: { min: counts[0], median, max: counts[counts.length - 1], histogram: hist },
    perFeeling,
    // taps = 1 (feeling) + questions + 1 (buy). Checkout adds one more tap for a
    // cold shopper who must link a bank first; a returning one stops at the buy.
    taps: {
      returning: { min: 1 + counts[0] + 1, median: 1 + median + 1, max: 1 + counts[counts.length - 1] + 1 },
      cold: { min: 1 + counts[0] + 1 + 2, median: 1 + median + 1 + 2, max: 1 + counts[counts.length - 1] + 1 + 2 },
    },
  });
}
