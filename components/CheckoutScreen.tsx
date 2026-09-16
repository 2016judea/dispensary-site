'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { readShopper, writeShopper, newId, type Shopper } from '@/lib/client-store';
import { money, totals } from '@/lib/money';

interface MiniProduct { id: string; strain: string; formatLabel: string; size: string; brand: string; priceCents: number }
interface MiniStore { id: string; name: string; street: string; city: string; state: string; zip: string; hours: Record<string, string> | null }

/**
 * ONE SCREEN. What you're buying, where you pick it up, pay.
 *
 * Deliberately absent, because Aidan named them: upsells, cross-sells, ads, a
 * promo-code field competing with the pay button, and any account wall in front
 * of the purchase. You never make an account here. You type a name, a mobile
 * number and a date of birth, link a bank once, and pay. The second order skips
 * all of it (components/BuyButton.tsx).
 */
export default function CheckoutScreen({ store, menu }: { store: MiniStore; menu: MiniProduct[] }) {
  const sp = useSearchParams();
  const router = useRouter();
  const productId = sp.get('p') ?? '';
  const feeling = sp.get('f');
  const product = useMemo(() => menu.find((m) => m.id === productId), [menu, productId]);

  const [s, setS] = useState<Shopper>(() => ({
    customerId: newId(), firstName: '', lastName: '', email: '', phone: '', dob: '',
    ageAffirmed: false, aeropayUserId: null, bankAccountId: null, bankLabel: null,
    bankLast4: null, defaultStoreId: store.id, orders: [],
  }));
  const [loaded, setLoaded] = useState(false);
  const [linking, setLinking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const prev = readShopper();
    if (prev) setS({ ...prev, defaultStoreId: prev.defaultStoreId ?? store.id });
    setLoaded(true);
  }, [store.id]);

  if (!product) {
    return (<><h1 className="ask">Nothing selected.</h1><a className="go" href="/">Start over</a></>);
  }

  const t = totals(product.priceCents);
  const age21 = (() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s.dob)) return null;
    const d = new Date(s.dob + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return null;
    const cut = new Date(); cut.setFullYear(cut.getFullYear() - 21);
    return d <= cut;
  })();

  const named = s.firstName.trim() && s.lastName.trim() && s.phone.trim().length >= 10;
  const canPay = !!(named && age21 && s.bankAccountId);

  async function link() {
    setLinking(true); setErr(null);
    try {
      const res = await fetch('/api/aeropay/link', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: s.firstName, lastName: s.lastName, email: s.email, phone: s.phone,
          aeropayUserId: s.aeropayUserId,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'bank link failed');
      if (j.needsWidget) {
        // Live Aeropay: hand off to the AeroSync widget, come back with a connectionId.
        window.location.href = j.aerosync.widgetUrl;
        return;
      }
      setS((x) => ({ ...x, aeropayUserId: j.aeropayUserId, bankAccountId: j.bank.id, bankLabel: j.bank.label, bankLast4: j.bank.last4 }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'bank link failed');
    } finally { setLinking(false); }
  }

  async function pay() {
    setBusy(true); setErr(null);
    const shopper: Shopper = { ...s, ageAffirmed: true, defaultStoreId: store.id };
    try {
      const res = await fetch('/api/order', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopper, feeling, lines: [{ productId: product!.id, qty: 1 }] }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'order failed');
      writeShopper({ ...shopper, orders: [...(shopper.orders ?? []), j.order.id] });
      router.push(`/order/${j.order.id}?new=1`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'order failed'); setBusy(false);
    }
  }

  return (
    <>
      <h1 className="ask">Pick up and pay.</h1>

      <div className="pick">
        <span className="eyebrow">{product.brand}</span>
        <h2 style={{ fontSize: 21 }}>{product.strain}</h2>
        <p className="meta">{product.formatLabel} · {product.size}</p>
        <div className="line"><span>Subtotal</span><span>{money(t.subtotalCents)}</span></div>
        <div className="line"><span>Minnesota cannabis tax</span><span>{money(t.taxCents)}</span></div>
        <div className="line total"><span>Total</span><span>{money(t.totalCents)}</span></div>
      </div>

      <div className="pick">
        <span className="eyebrow">Pick up at</span>
        <h2 style={{ fontSize: 19 }}>{store.street}</h2>
        <p className="meta">{store.city}, {store.state} {store.zip} · ready in about 20 minutes</p>
      </div>

      <div className="row2">
        <div>
          <label htmlFor="fn">First name</label>
          <input id="fn" autoComplete="given-name" value={s.firstName}
            onChange={(e) => setS({ ...s, firstName: e.target.value })} />
        </div>
        <div>
          <label htmlFor="ln">Last name</label>
          <input id="ln" autoComplete="family-name" value={s.lastName}
            onChange={(e) => setS({ ...s, lastName: e.target.value })} />
        </div>
      </div>
      <label htmlFor="ph">Mobile</label>
      <input id="ph" type="tel" inputMode="tel" autoComplete="tel" placeholder="(651) 555-0100"
        value={s.phone} onChange={(e) => setS({ ...s, phone: e.target.value })} />
      <label htmlFor="dob">Date of birth</label>
      <input id="dob" type="date" autoComplete="bday" value={s.dob}
        onChange={(e) => setS({ ...s, dob: e.target.value })} />
      {age21 === false ? (
        <p style={{ color: '#B3261E', fontSize: 14, marginTop: 6 }}>
          Minnesota law is 21 and over. Nothing can be sold to you here.
        </p>
      ) : null}

      <label>Pay by bank</label>
      {s.bankAccountId ? (
        <p style={{ margin: '4px 0 0', fontWeight: 600 }}>
          {s.bankLabel} ••{s.bankLast4}{' '}
          <button className="linkish" style={{ marginLeft: 8 }}
            onClick={() => setS({ ...s, bankAccountId: null, bankLabel: null, bankLast4: null })}>
            change
          </button>
        </p>
      ) : (
        <>
          <button className="ghost" onClick={link} disabled={linking || !named}>
            {linking ? 'Opening your bank…' : 'Link a bank — Aeropay'}
          </button>
          <p style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 6 }}>
            Card networks decline cannabis, which is why the counter is debit-and-cash only. Bank
            pay is the one way to settle this before you arrive.
          </p>
        </>
      )}

      {err ? <p style={{ color: '#B3261E', fontSize: 14, marginTop: 10 }}>{err}</p> : null}

      <button className="go" onClick={pay} disabled={!canPay || busy}>
        {busy ? 'Placing…' : `Place order — ${money(t.totalCents)}`}
      </button>
      <p style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 8, textAlign: 'center' }}>
        45 seconds to undo after you tap. Bring a government ID — an employee checks it at the
        counter, which is the law in Minnesota and not something a website can do for you.
      </p>
      {loaded && s.bankAccountId ? (
        <p style={{ textAlign: 'center' }}>
          <span className="demo-tag">Next order is one tap</span>
        </p>
      ) : null}
    </>
  );
}
