import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentBrand } from '@/lib/session';
import { FEELING_BY_ID, FEELINGS, WANTED_IT_FOR } from '@/lib/feelings';
import { applyAnswers, nextQuestion, ATTRIBUTES, type Answers, type AnswerKey } from '@/lib/questions';
import { MENU, rank, inStock } from '@/lib/rank';
import { money } from '@/lib/money';
import type { FeelingId } from '@/lib/types';
import BuyButton from '@/components/BuyButton';

export const dynamic = 'force-dynamic';

/**
 * The finder. One question per screen, and a question is only asked when it
 * ELIMINATES - see lib/questions.ts.
 *
 * No client JavaScript runs the funnel. Every answer is an <a href> carrying the
 * answers so far, so a tap is a navigation: nothing to hydrate, nothing to wait
 * for, no "Next" button, and the whole path is shareable and countable. The only
 * client code on this screen is the buy button, which has to read whether this
 * phone has bought here before.
 */
export default async function Find({
  searchParams,
}: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const b = await currentBrand();
  const store = b.stores[0];
  const f = String(sp.f ?? '') as FeelingId;
  if (!FEELING_BY_ID[f]) notFound();
  const feeling = FEELING_BY_ID[f];

  const answers: Answers = {};
  for (const a of ATTRIBUTES) {
    const v = sp[a.key];
    if (typeof v === 'string' && v) answers[a.key] = v;
  }

  const stocked = MENU.filter((p) => inStock(p, store?.id ?? null));
  const candidates = applyAnswers(stocked, answers);
  // The ranker is handed to the engine so a question that does not change the
  // answer is never asked first. See lib/questions.ts.
  const q = nextQuestion(candidates, answers, (ps) => rank(ps, f)[0]?.product.id ?? null);

  const href = (extra: Record<string, string>) => {
    const u = new URLSearchParams({ f, ...(answers as Record<string, string>), ...extra });
    return `/find?${u.toString()}`;
  };

  // ---------- still narrowing ----------
  if (q) {
    return (
      <main className="wrap">
        <h1 className="ask">{q.question}</h1>
        <p className="sub">{candidates.length} on the shelf right now.</p>
        <div className="choices">
          {q.options.map((o) => (
            <Link className="choice" key={o.value} href={href({ [q.key]: o.value })}>
              <span className="n">{o.count}</span>
              <span className="lbl">{o.label}</span>
              {o.sub ? <span className="sub2">{o.sub}</span> : null}
            </Link>
          ))}
        </div>
        <Back f={f} answers={answers} />
      </main>
    );
  }

  // ---------- the answer ----------
  const ranked = rank(candidates, f);
  const top = ranked[0];
  if (!top) notFound();
  const alts = ranked.slice(1, 4);
  const o = top.outcome;
  const p = top.product;

  return (
    <main className="wrap">
      <h1 className="ask">Take this one.</h1>
      <div className="pick">
        <span className="eyebrow">{p.brand} · {p.lineage}</span>
        <h2>{p.strain}</h2>
        <p className="meta">
          {p.formatLabel} · {p.size} ·{' '}
          {p.thcPct != null ? `${p.thcPct}% THC` : `${p.thcMgPerServing}mg per serving`}
          {' · feel it in '}{p.onset}
        </p>
        <div className="price">{money(p.priceCents)}</div>

        <div className="evidence">
          {o.n >= 3 ? (
            <>
              <b>{Math.round(o.helpedPct * 100)}% of {o.n} people</b> who bought this because they{' '}
              {WANTED_IT_FOR[f]} said it did the job.
              <div className="bar"><i style={{ width: `${Math.round(o.helpedPct * 100)}%` }} /></div>
            </>
          ) : (
            <>
              Nobody has reviewed this for <b>{feeling.label.toLowerCase()}</b> yet. Ranked on its
              lab profile alone — {Math.round(top.chemistry * 100)}% match.
            </>
          )}
        </div>

        <BuyButton
          productId={p.id}
          feeling={f}
          priceCents={p.priceCents}
          label={p.strain}
        />
        <Link className="ghost" href={`/p/${p.slug}`}>Why this one</Link>
      </div>

      {alts.length ? (
        <>
          <p className="sub" style={{ margin: '22px 0 2px' }}>Or</p>
          {alts.map((s) => (
            <Link className="alt" key={s.product.id} href={`/p/${s.product.slug}`}>
              <span className="an">
                {s.product.strain}
                <span className="am">
                  {s.product.formatLabel} · {s.product.size}
                  {s.outcome.n >= 3 ? ` · ${Math.round(s.outcome.helpedPct * 100)}% of ${s.outcome.n}` : ''}
                </span>
              </span>
              <span className="ap">{money(s.product.priceCents)}</span>
            </Link>
          ))}
        </>
      ) : null}

      <p style={{ marginTop: 20 }}>
        <span className="demo-tag">Demo inventory</span>
      </p>
      <Back f={f} answers={answers} />
    </main>
  );
}

function Back({ f, answers }: { f: FeelingId; answers: Answers }) {
  const keys = Object.keys(answers) as AnswerKey[];
  if (!keys.length) return <p><Link className="linkish" href="/">Start over</Link></p>;
  const drop = keys[keys.length - 1];
  const u = new URLSearchParams({ f });
  for (const k of keys) if (k !== drop) u.set(k, answers[k]!);
  return <p><Link className="linkish" href={`/find?${u.toString()}`}>Back</Link></p>;
}

export async function generateStaticParams() { return FEELINGS.map((x) => ({ f: x.id })); }
