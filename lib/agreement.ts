import type { Brand } from './brand';

/** The engagement the owner signs. One page, plain words, no schedule of exhibits. */
export function agreementHtml(b: Brand, fee: string): string {
  const store = b.stores[0];
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  return `<h1>Storefront engagement</h1>
<p><b>Between</b> Brick &amp; Mortar and ${b.legalName}, ${store?.street ?? ''}, ${store?.city ?? ''}, MN. Dated ${today}.</p>
<h2>What we build</h2>
<p>The storefront you are looking at, in your name, on your domain: the feeling-first finder,
server-rendered product and strain pages, verified-purchase reviews on the same axes, a one-screen
checkout with bank payment, and one-tap reordering.</p>
<h2>What we connect it to</h2>
<p>Your existing menu platform, through an adapter we have already written for Dutchie and for Jane.
Your Aeropay merchant account. Your domain and DNS.</p>
<h2>How long</h2>
<p>Live within 48 hours of receiving the access listed in our deployment note. That clock starts when
the last credential arrives, not when this is signed.</p>
<h2>What it costs</h2>
<p>${fee}</p>
<h2>What you own</h2>
<p>All of it. The repository transfers to your GitHub account on final payment. No lock-in, no
platform fee, no per-order cut.</p>
<h2>What we are not</h2>
<p>We are not your compliance counsel. Minnesota cannabis advertising rules (Minn. Stat. 342.64) and
retail conduct rules (342.27) sit with your licensee. We build to them and we cite them; you approve
the copy.</p>
<p>Signed /sig1/</p>`;
}
