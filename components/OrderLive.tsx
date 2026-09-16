'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Two jobs, both of them one tap.
 *
 * 1. THE UNDO. A one-tap purchase with a confirm dialog in front of it is a
 *    two-tap purchase. So the confirmation moved to after the fact: the order is
 *    already placed, and for 45 seconds a bar at the bottom of the screen will
 *    take it back. Same safety, one less tap, and it only appears for the person
 *    who just bought.
 *
 * 2. THE REVIEW, on the SAME axis they bought on. Not a star out of five - "did
 *    this actually help you sleep?", answered Yes / Sort of / No. One tap, from
 *    the screen they are already looking at while they wait for the order. The
 *    answer goes straight back into the ranking (lib/rank.ts), which is the only
 *    reason the finder gets better than a chemistry guess.
 */
export default function OrderLive({
  orderId, status, undoUntil, justPlaced, feeling, prompt, items,
}: {
  orderId: string; status: string; undoUntil: string; justPlaced: boolean;
  feeling: string | null; prompt: string | null;
  items: { productId: string; label: string }[];
}) {
  const router = useRouter();
  const [left, setLeft] = useState(() => Math.max(0, Math.ceil((Date.parse(undoUntil) - Date.now()) / 1000)));
  const [undoing, setUndoing] = useState(false);
  const [reviewed, setReviewed] = useState<Record<string, number>>({});
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (left <= 0) return;
    const t = setInterval(() => setLeft((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(t);
  }, [left]);

  async function undo() {
    setUndoing(true);
    const res = await fetch(`/api/order/${orderId}`, { method: 'DELETE' });
    if (!res.ok) { setErr((await res.json()).error); setUndoing(false); return; }
    router.refresh();
  }

  async function review(productId: string, outcome: number) {
    setReviewed((r) => ({ ...r, [productId]: outcome }));
    const res = await fetch('/api/review', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, productId, feeling, outcome }),
    });
    if (!res.ok) setErr((await res.json()).error);
  }

  const showUndo = justPlaced && left > 0 && (status === 'placed' || status === 'paid');
  const canReview = status !== 'cancelled' && !!feeling && !!prompt;

  return (
    <>
      {err ? <p style={{ color: '#B3261E', fontSize: 14 }}>{err}</p> : null}

      {canReview ? (
        <div className="pick" style={{ marginTop: 16 }}>
          <span className="eyebrow">When you&apos;ve tried it</span>
          {items.map((it) => (
            <div key={it.productId} style={{ marginTop: 10 }}>
              <p style={{ fontWeight: 600, margin: '0 0 8px' }}>{prompt}</p>
              {reviewed[it.productId] !== undefined ? (
                <p className="meta" style={{ margin: 0 }}>
                  Thanks — that goes straight into what the next person chasing the same thing sees.
                </p>
              ) : (
                <div className="row2" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                  <button className="ghost" style={{ marginTop: 0 }} onClick={() => review(it.productId, 2)}>Yes</button>
                  <button className="ghost" style={{ marginTop: 0 }} onClick={() => review(it.productId, 1)}>Sort of</button>
                  <button className="ghost" style={{ marginTop: 0 }} onClick={() => review(it.productId, 0)}>No</button>
                </div>
              )}
            </div>
          ))}
          <p className="meta" style={{ marginTop: 10, marginBottom: 0 }}>
            Only people who bought it can answer this, and only about the thing they bought.
          </p>
        </div>
      ) : null}

      {showUndo ? (
        <div className="undo" role="status">
          <span>Order placed. {left}s to undo.</span>
          <button onClick={undo} disabled={undoing}>{undoing ? 'Undoing…' : 'Undo'}</button>
        </div>
      ) : null}
    </>
  );
}
