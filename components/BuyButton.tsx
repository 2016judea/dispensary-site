'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { readShopper, canOneTap, type Shopper } from '@/lib/client-store';
import { money } from '@/lib/money';

/**
 * The one-tap buy.
 *
 * First visit it is a link to checkout - there is no bank linked yet, so there
 * is nothing to one-tap with. Once a bank is linked and a store is chosen, this
 * becomes a single button that places the order outright. No confirm dialog:
 * the order screen opens with a live undo instead, which is the same safety with
 * one less tap. Amazon's directness; none of its litter.
 */
export default function BuyButton({
  productId, feeling, priceCents, label,
}: { productId: string; feeling: string; priceCents: number; label: string }) {
  const [shopper, setShopper] = useState<Shopper | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => { setShopper(readShopper()); setReady(true); }, []);

  const checkoutHref = `/checkout?p=${encodeURIComponent(productId)}&f=${encodeURIComponent(feeling)}`;

  if (!ready) {
    // Render the cold-shopper button on the server pass so nothing jumps.
    return <a className="go" href={checkoutHref}>Pick it up — {money(priceCents)}</a>;
  }

  if (!canOneTap(shopper)) {
    return <a className="go" href={checkoutHref}>Pick it up — {money(priceCents)}</a>;
  }

  async function oneTap() {
    if (!shopper) return;
    setBusy(true); setErr(null);
    try {
      const res = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopper, feeling, lines: [{ productId, qty: 1 }], oneTap: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'could not place the order');
      router.push(`/order/${json.order.id}?new=1`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'could not place the order');
      setBusy(false);
    }
  }

  return (
    <>
      <button className="go" onClick={oneTap} disabled={busy}>
        {busy ? 'Placing…' : `Buy now — ${money(priceCents)} · ${shopper.bankLabel} ••${shopper.bankLast4}`}
      </button>
      {err ? <p style={{ color: '#B3261E', fontSize: 14, marginTop: 8 }}>{err}</p> : null}
      <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8, textAlign: 'center' }}>
        One tap places it. You get 45 seconds to undo. {label} is held at the counter; ID checked there.
      </p>
    </>
  );
}
