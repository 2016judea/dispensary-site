import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { MENU, productsForStrain, outcomeFor } from '@/lib/rank';
import { FEELINGS } from '@/lib/feelings';
import { currentBrand } from '@/lib/session';
import { money } from '@/lib/money';
import { localBusiness, ld, siteUrl } from '@/lib/jsonld';

export const dynamic = 'force-dynamic';

export async function generateStaticParams() {
  return [...new Set(MENU.map((p) => p.strainSlug))].map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const ps = productsForStrain(slug);
  if (!ps.length) return {};
  const b = await currentBrand();
  return {
    title: `${ps[0].strain}`,
    description: `${ps[0].strain} at ${b.storeName} in ${b.stores[0]?.city}, MN — ${ps.length} format${ps.length > 1 ? 's' : ''} from ${money(Math.min(...ps.map((p) => p.priceCents)))}.`,
    alternates: { canonical: `${siteUrl()}/strain/${slug}` },
    robots: { index: false, follow: false },
  };
}

export default async function StrainPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ps = productsForStrain(slug);
  if (!ps.length) notFound();
  const b = await currentBrand();
  const s = ps[0];
  const byFeeling = FEELINGS.map((f) => {
    let n = 0, helped = 0;
    for (const p of ps) { const o = outcomeFor(p.id, f.id); n += o.n; helped += o.helpedPct * o.n; }
    return { f, n, pct: n ? helped / n : 0 };
  }).filter((x) => x.n >= 3).sort((a, bb) => bb.pct - a.pct);

  return (
    <main className="wrap">
      <script type="application/ld+json" dangerouslySetInnerHTML={ld(localBusiness(b, b.stores[0]))} />
      <h1 className="ask" style={{ marginBottom: 6 }}>{s.strain}</h1>
      <p className="sub">{s.lineage} · {ps.length} format{ps.length > 1 ? 's' : ''} on the shelf</p>

      {byFeeling.length ? (
        <>
          <h2 style={{ fontSize: 19, margin: '18px 0 8px' }}>What it actually did</h2>
          {byFeeling.map(({ f, n, pct }) => (
            <div key={f.id} style={{ padding: '10px 0', borderTop: '1px solid var(--line)' }}>
              <div className="line" style={{ padding: 0 }}>
                <span style={{ fontWeight: 600 }}>{f.label}</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{Math.round(pct * 100)}% of {n}</span>
              </div>
              <div className="bar"><i style={{ width: `${Math.round(pct * 100)}%` }} /></div>
            </div>
          ))}
        </>
      ) : null}

      <h2 style={{ fontSize: 19, margin: '26px 0 4px' }}>Buy it as</h2>
      {ps.map((p) => (
        <a className="alt" key={p.id} href={`/p/${p.slug}`}>
          <span className="an">{p.formatLabel}
            <span className="am">{p.size} · {p.brand} · {p.thcPct != null ? `${p.thcPct}% THC` : `${p.thcMgPerServing}mg/serving`}</span>
          </span>
          <span className="ap">{money(p.priceCents)}</span>
        </a>
      ))}
      <p style={{ marginTop: 20 }}><span className="demo-tag">Demo inventory</span></p>
    </main>
  );
}
