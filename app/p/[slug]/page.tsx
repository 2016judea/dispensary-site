import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { MENU, outcomeFor, rank } from '@/lib/rank';
import { FEELINGS, FEELING_BY_ID, chemistryScore, WANTED_IT_FOR } from '@/lib/feelings';
import { currentBrand } from '@/lib/session';
import { money } from '@/lib/money';
import { productLd, localBusiness, ld, siteUrl } from '@/lib/jsonld';
import BuyButton from '@/components/BuyButton';
import type { FeelingId } from '@/lib/types';
import type { Outcome } from '@/lib/rank';

export const dynamic = 'force-dynamic';

export async function generateStaticParams() {
  return MENU.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = MENU.find((x) => x.slug === slug);
  if (!p) return {};
  const b = await currentBrand();
  return {
    title: `${p.strain} ${p.formatLabel}`,
    description:
      `${p.strain} — ${p.brand} ${p.formatLabel.toLowerCase()}, ${p.size}, ` +
      `${p.thcPct != null ? `${p.thcPct}% THC` : `${p.thcMgPerServing}mg per serving`}, ` +
      `${money(p.priceCents)} at ${b.storeName} in ${b.stores[0]?.city}. Pick up today.`,
    alternates: { canonical: `${siteUrl()}/p/${p.slug}` },
    robots: { index: false, follow: false },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = MENU.find((x) => x.slug === slug);
  if (!p) notFound();
  const b = await currentBrand();
  const store = b.stores[0];

  const outcomes: Partial<Record<FeelingId, Outcome>> = {};
  for (const f of FEELINGS) outcomes[f.id] = outcomeFor(p.id, f.id);

  // What did people actually buy this for, and did it work?
  const evidence = FEELINGS
    .map((f) => ({ f, o: outcomes[f.id]!, chem: chemistryScore(p, f) }))
    .sort((a, bb) => bb.o.n - a.o.n || bb.chem - a.chem);
  const lead = evidence[0];
  const terps = Object.entries(p.terpenes).sort((a, bb) => bb[1] - a[1]).slice(0, 3);
  const sameStrain = MENU.filter((x) => x.strainSlug === p.strainSlug && x.id !== p.id);

  return (
    <main className="wrap">
      <script type="application/ld+json" dangerouslySetInnerHTML={ld(productLd(b, p, outcomes))} />
      <script type="application/ld+json" dangerouslySetInnerHTML={ld(localBusiness(b, store))} />

      <h1 className="ask" style={{ marginBottom: 6 }}>{p.strain}</h1>
      <p className="sub">
        {p.brand} · {p.formatLabel} · {p.size} · {p.lineage}
      </p>

      <div className="pick">
        <div className="price">{money(p.priceCents)}</div>
        <p className="meta">
          {p.thcPct != null ? `${p.thcPct}% THC` : `${p.thcMgPerServing}mg THC per serving, ${p.servings} servings`}
          {p.cbdPct ? ` · ${p.cbdPct}% CBD` : ''} · feel it in {p.onset} · lasts {p.duration}
          {p.thcObserved ? ' · potency as published on the live menu' : ''}
        </p>
        <BuyButton productId={p.id} feeling={lead.f.id} priceCents={p.priceCents} label={p.strain} />
      </div>

      <h2 style={{ fontSize: 19, margin: '26px 0 8px' }}>What people bought it for</h2>
      {evidence.filter((e) => e.o.n > 0).length === 0 ? (
        <p className="sub">Nobody has reviewed this yet.</p>
      ) : (
        evidence.filter((e) => e.o.n > 0).map(({ f, o }) => (
          <div key={f.id} style={{ padding: '11px 0', borderTop: '1px solid var(--line)' }}>
            <div className="line" style={{ padding: 0 }}>
              <span style={{ fontWeight: 600 }}>{f.label}</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{Math.round(o.helpedPct * 100)}% of {o.n}</span>
            </div>
            <div className="bar"><i style={{ width: `${Math.round(o.helpedPct * 100)}%` }} /></div>
            <p className="meta" style={{ margin: '6px 0 0' }}>
              of people who {WANTED_IT_FOR[f.id]} and bought this said it did the job.
            </p>
          </div>
        ))
      )}
      <p className="meta" style={{ marginTop: 10 }}>
        Verified purchases only — every one of these is tied to an order for this exact product.
      </p>

      <h2 style={{ fontSize: 19, margin: '26px 0 8px' }}>What&apos;s in it</h2>
      <p className="sub" style={{ marginTop: 0 }}>
        Top terpenes: {terps.map(([k, v]) => `${k} ${(v * 100).toFixed(0)}%`).join(' · ')}.
      </p>
      <p className="meta">
        Terpene shares in this demo are illustrative values, not lab results — see the maintenance
        notes. On a live build they come off each batch&apos;s certificate of analysis.
      </p>

      {sameStrain.length ? (
        <>
          <h2 style={{ fontSize: 19, margin: '26px 0 8px' }}>Same strain, other formats</h2>
          {sameStrain.map((x) => (
            <a className="alt" key={x.id} href={`/p/${x.slug}`}>
              <span className="an">{x.formatLabel}<span className="am">{x.size} · {x.brand}</span></span>
              <span className="ap">{money(x.priceCents)}</span>
            </a>
          ))}
        </>
      ) : null}

      <p style={{ marginTop: 20 }}>
        <span className="demo-tag">Demo inventory</span>{' '}
        <a className="linkish" href={`/strain/${p.strainSlug}`}>All {p.strain}</a>
      </p>
      <p className="warn">
        Warning: Cannabis products are not for use by anyone under the age of 21. Cannabis use may
        cause drowsiness, affect focus, reaction time, and decision-making. These products are not
        evaluated or approved by the FDA. Pregnant people should avoid cannabis due to the risk of
        low birth weight, premature birth, stillbirth, and harm to fetal brain development.
      </p>
    </main>
  );
}
