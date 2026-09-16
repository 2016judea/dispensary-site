import { notFound } from 'next/navigation';
import { loadSkin, RISE } from '@/lib/brand';
import selfScanJson from '@/data/self-scan.json';

export const dynamic = 'force-dynamic';

interface SelfScan { measuredAt: string; base: string; summary: { ms: number; bytes: number; jsonld: number; viewport: boolean; https: boolean; iframes: number } }
const _raw = selfScanJson as unknown as Partial<SelfScan>;
const SELF: SelfScan | null = _raw && _raw.summary ? (_raw as SelfScan) : null;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = loadSkin(slug);
  return { title: s ? s.storeName : 'Demo', robots: { index: false, follow: false } };
}

const kb = (n?: number) => (n == null ? '—' : `${Math.round(n / 1024)} KB`);
const ms = (n?: number) => (n == null ? '—' : `${(n / 1000).toFixed(2)}s`);

/**
 * The per-prospect door. Their measured site beside this one, then the button
 * that puts them inside their own skin.
 *
 * Every number on the left is from data/prospects.json - a real fetch of their
 * real homepage. Every number on the right is from data/self-scan.json, this
 * site measured the same way by scripts/self-scan.mjs. Neither column is typed.
 */
export default async function DemoSkin({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const b = loadSkin(slug);
  if (!b) notFound();
  const scan = b.scan;
  const isRise = b.slug === RISE.slug;
  const store = b.stores[0];

  return (
    <main className="wrap" style={{ ['--accent' as string]: b.colors.accent, ['--ground' as string]: b.colors.ground }}>
      <h1 className="ask" style={{ marginBottom: 4 }}>{b.storeName}</h1>
      <p className="sub">
        {store?.street}, {store?.city}, MN{b.rating ? ` · ${b.rating}★ from ${b.reviews} Google reviews` : ''}
      </p>

      <a className="go" href={`/api/skin/${b.slug}`}>Open your store</a>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8, textAlign: 'center' }}>
        The whole site, in your name and your colours. Nothing to install.
      </p>

      <h2 style={{ fontSize: 19, margin: '30px 0 2px' }}>Your site, measured</h2>
      <p className="sub" style={{ marginTop: 2 }}>
        {scan?.ok
          ? <>Fetched {scan.final ?? scan.url} on a phone user-agent.</>
          : <>We could not fetch a site for you: {scan?.error ?? 'none on file'}.</>}
        {SELF ? <> This build measured the same way on {new Date(SELF.measuredAt).toLocaleDateString('en-US')}.</> : null}
      </p>

      <div className="scroller">
        <table className="cmp">
          <thead>
            <tr><th></th><th style={{ textAlign: 'right' }}>Yours</th><th style={{ textAlign: 'right' }}>This build</th></tr>
          </thead>
          <tbody>
            <tr><td>Homepage load</td><td className="n">{scan?.ok ? ms(scan.ms) : '—'}</td><td className="n">{SELF ? ms(SELF.summary.ms) : 'not measured'}</td></tr>
            <tr><td>Page weight</td><td className="n">{scan?.ok ? kb(scan.bytes) : '—'}</td><td className="n">{SELF ? kb(SELF.summary.bytes) : 'not measured'}</td></tr>
            <tr><td>Structured data blocks</td><td className="n">{scan?.ok ? scan.jsonld ?? 0 : '—'}</td><td className="n">{SELF ? SELF.summary.jsonld : 'not measured'}</td></tr>
            <tr><td>Mobile viewport tag</td><td className="n">{scan?.ok ? (scan.viewport ? 'yes' : 'no') : '—'}</td><td className="n">{SELF ? (SELF.summary.viewport ? 'yes' : 'no') : '—'}</td></tr>
            <tr><td>Menu in an iframe</td><td className="n">{scan?.ok ? (scan.iframes ? `${scan.iframes}` : 'no') : '—'}</td><td className="n">no</td></tr>
            <tr><td>Menu platform</td><td className="n">{scan?.platforms?.length ? scan.platforms.join(', ') : '—'}</td><td className="n">any</td></tr>
          </tbody>
        </table>
      </div>

      {b.openerFact ? (
        <div className="pick">
          <span className="eyebrow">The one line that matters</span>
          <p style={{ margin: '8px 0 0', fontSize: 18, lineHeight: 1.35 }}>{b.openerFact}</p>
        </div>
      ) : null}

      <h2 style={{ fontSize: 19, margin: '26px 0 8px' }}>What we did not do</h2>
      <ul style={{ paddingLeft: 20, fontSize: 15.5, lineHeight: 1.5, color: 'var(--muted)' }}>
        <li>We did not copy your logo. The wordmark above is your name, set in this site&apos;s own type.</li>
        <li>Colours {b.colorSource && b.colorSource !== 'default'
          ? <>were read off {b.colorSource}</>
          : <>are a neutral default — we could not read usable colours off a site of yours</>}.</li>
        <li>{store?.hours ? 'Hours are the ones your site publishes.' : 'Hours are blank because we have not verified yours. Send them and they go in.'}</li>
        <li>The shelf inside is demo inventory, labelled as such on every screen. Your real menu
          plugs in behind one adapter — Dutchie and Jane both already written.</li>
      </ul>

      <p style={{ marginTop: 22 }}>
        <a className="linkish" href="/demo">Every other store we built this for</a>
      </p>
      {isRise ? null : (
        <p className="warn">
          Unsolicited concept. {b.storeName} has not asked for this, endorsed it, or seen it before now.
        </p>
      )}
    </main>
  );
}
