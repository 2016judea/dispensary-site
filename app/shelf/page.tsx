import { MENU, inStock } from '@/lib/rank';
import { currentBrand } from '@/lib/session';
import { money } from '@/lib/money';
import { localBusiness, ld } from '@/lib/jsonld';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'The whole shelf', robots: { index: false, follow: false } };

const ORDER = ['flower', 'minibuds', 'preroll', 'bigdog', 'vape', 'edible', 'beverage', 'tincture'];

export default async function Shelf() {
  const b = await currentBrand();
  const store = b.stores[0];
  const live = MENU.filter((p) => inStock(p, store.id));
  const groups = ORDER
    .map((fmt) => ({ fmt, items: live.filter((p) => p.format === fmt) }))
    .filter((g) => g.items.length);

  return (
    <main className="wrap">
      <script type="application/ld+json" dangerouslySetInnerHTML={ld(localBusiness(b, store))} />
      <h1 className="ask">{live.length} things on the shelf.</h1>
      <p className="sub">
        The finder is faster. This is here because some people want the list.{' '}
        <a href="/">Back to the question</a>
      </p>
      {groups.map((g) => (
        <section key={g.fmt}>
          <h2 style={{ fontSize: 17, margin: '24px 0 2px', textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted)' }}>
            {g.items[0].formatLabel}
          </h2>
          {g.items.map((p) => (
            <a className="alt" key={p.id} href={`/p/${p.slug}`}>
              <span className="an">{p.strain}
                <span className="am">{p.brand} · {p.size} · {p.thcPct != null ? `${p.thcPct}% THC` : `${p.thcMgPerServing}mg/serving`}</span>
              </span>
              <span className="ap">{money(p.priceCents)}</span>
            </a>
          ))}
        </section>
      ))}
      <p style={{ marginTop: 22 }}><span className="demo-tag">Demo inventory</span></p>
    </main>
  );
}
