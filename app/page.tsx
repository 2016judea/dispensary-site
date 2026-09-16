import { currentBrand } from '@/lib/session';
import { FEELINGS } from '@/lib/feelings';

/**
 * The landing screen. Aidan's constraint, verbatim and binding:
 * "Landing screen leads with exactly: What sort of feeling are you chasing? -
 * nothing above it. No logo lockup, no nav, no hero image, no value prop."
 *
 * So the <h1> is the first painted element. The store's identity is below the
 * choices, not above them. The honesty line lives in the fixed footer, which is
 * chrome rather than content.
 */
export default async function Home() {
  const b = await currentBrand();
  const store = b.stores[0];
  return (
    <main className="wrap">
      <h1 className="ask">{b.headline}</h1>
      <div className="choices">
        {FEELINGS.map((f) => (
          <a className="choice" key={f.id} href={`/find?f=${f.id}`}>
            <span className="lbl">{f.label}</span>
            <span className="sub2">{f.shopperBlurb}</span>
          </a>
        ))}
      </div>
      <p style={{ marginTop: 26, fontSize: 14.5, color: 'var(--muted)' }}>
        <span className="wordmark">{b.wordmark}</span>
        {store ? <> · {store.street}, {store.city} · Pick up today</> : null}
      </p>
      <p style={{ marginTop: 10 }}>
        <a className="linkish" href="/shelf">Rather just see the whole shelf</a>
      </p>
    </main>
  );
}
