import { currentBrand } from '@/lib/session';
import { MN_WARNING, honestyLine } from '@/lib/brand';
import { DEMO_TAX_RATE, TAX_BASIS } from '@/lib/money';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'What this is', robots: { index: false, follow: false } };

export default async function About() {
  const b = await currentBrand();
  return (
    <main className="wrap">
      <h1 className="ask">What this is.</h1>
      <p style={{ fontSize: 17.5, lineHeight: 1.5 }}>
        A working concept storefront built by Brick &amp; Mortar, unasked, to show one idea:
        a dispensary site should open with the question a customer already has, and the answer
        should be ranked by what worked for people who wanted the same thing.
      </p>
      <p style={{ fontSize: 17.5, lineHeight: 1.5 }}>
        <b>{honestyLine(b)}</b> No logo of theirs is reproduced. The wordmark is a placeholder.
        The page is marked <code>noindex,nofollow</code> and the whole site is disallowed in
        robots.txt, so it cannot turn up in a search for them.
      </p>

      <h2 style={{ fontSize: 19, marginTop: 26 }}>What is real</h2>
      <ul style={{ paddingLeft: 20, fontSize: 16, lineHeight: 1.55 }}>
        <li>The address, phone and opening hours{b.sourceUrl ? <> — read off {b.sourceUrl} on {b.verifiedOn}</> : null}.</li>
        <li>The price architecture and cultivar names, read off the live public menu.</li>
        <li>The tax: {(DEMO_TAX_RATE * 100).toFixed(2)}%, which is the effective rate their own cart quoted ({TAX_BASIS}).</li>
        <li>The Minnesota purchase caps and the age rule, enforced in code, with the statute cited.</li>
      </ul>

      <h2 style={{ fontSize: 19, marginTop: 22 }}>What is not</h2>
      <ul style={{ paddingLeft: 20, fontSize: 16, lineHeight: 1.55 }}>
        <li>Stock counts and terpene percentages — illustrative demo values.</li>
        <li>The reviews — generated, so the ranking has mass on day one. Real ones are verified-purchase only.</li>
        <li>The payment — Aeropay runs in a simulated mode until a merchant account is connected.</li>
      </ul>

      <p className="warn">{MN_WARNING}</p>
      <p style={{ marginTop: 18 }}><a className="linkish" href="/">Back</a></p>
    </main>
  );
}
