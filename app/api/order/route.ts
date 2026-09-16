import { NextResponse } from 'next/server';
import { productById } from '@/lib/rank';
import { totals } from '@/lib/money';
import { checkLimits } from '@/lib/limits';
import { getAeropay } from '@/lib/aeropay';
import { addOrder, upsertCustomer } from '@/lib/store';
import { loadSkin, RISE } from '@/lib/brand';
import { cookies } from 'next/headers';
import { SKIN_COOKIE } from '@/lib/session';
import { ORDERS_COOKIE, withOrder } from '@/lib/order-cookie';
import type { Order, OrderLine, FeelingId } from '@/lib/types';

export const runtime = 'nodejs';

function code() {
  const A = 'ACDEFGHJKLMNPQRTUVWXY349';
  return Array.from({ length: 4 }, () => A[Math.floor(Math.random() * A.length)]).join('');
}

/** next pickup slot: 20 minutes from now, on the quarter hour */
function pickupAt(): string {
  const d = new Date(Date.now() + 20 * 60_000);
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
  return d.toISOString();
}

export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }); }

  const jar = await cookies();
  const brand = loadSkin(jar.get(SKIN_COOKIE)?.value) ?? RISE;
  const storeId = body.shopper?.defaultStoreId || brand.stores[0]?.id;
  if (!storeId) return NextResponse.json({ error: 'no store' }, { status: 400 });

  const rawLines = Array.isArray(body.lines) ? body.lines : [];
  const resolved = rawLines
    .map((l: any) => ({ product: productById(String(l.productId)), qty: Math.max(1, Math.min(20, Number(l.qty) || 1)) }))
    .filter((l: any) => l.product);
  if (!resolved.length) return NextResponse.json({ error: 'nothing in the order' }, { status: 400 });

  // Minnesota per-transaction caps. Enforced here, not in the UI.
  const limit = checkLimits(resolved);
  if (!limit.ok) return NextResponse.json({ error: limit.reason }, { status: 400 });

  const s = body.shopper ?? {};
  if (!s.ageAffirmed) return NextResponse.json({ error: 'age must be affirmed' }, { status: 400 });
  if (!s.firstName || !s.lastName || !s.phone) {
    return NextResponse.json({ error: 'name and phone are required to hold an order' }, { status: 400 });
  }

  const lines: OrderLine[] = resolved.map((l: any) => ({
    productId: l.product.id, qty: l.qty, priceCents: l.product.priceCents,
  }));
  const subtotal = lines.reduce((n, l) => n + l.priceCents * l.qty, 0);
  const t = totals(subtotal);

  const customerId = String(s.customerId || `c_${Math.random().toString(36).slice(2, 10)}`);
  const aeropay = getAeropay();
  const id = `o_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;

  let paymentRef: string | null = null;
  let status: Order['status'] = 'placed';
  if (s.bankAccountId && s.aeropayUserId) {
    try {
      const tx = await aeropay.charge({
        userId: String(s.aeropayUserId), bankAccountId: String(s.bankAccountId),
        amountCents: t.totalCents, referenceId: id, idempotencyKey: id,
      });
      paymentRef = tx.id; status = 'paid';
    } catch (e) {
      return NextResponse.json({ error: `payment did not go through: ${e instanceof Error ? e.message : 'unknown'}` }, { status: 402 });
    }
  }

  const order: Order = {
    id, shortCode: code(), customerId, storeId, lines,
    subtotalCents: t.subtotalCents, taxCents: t.taxCents, totalCents: t.totalCents,
    feeling: (body.feeling ?? null) as FeelingId | null,
    pickupAt: pickupAt(), status, paymentRef,
    paymentProvider: aeropay.mode === 'live' ? 'aeropay' : 'aeropay-sim',
    createdAt: new Date().toISOString(),
    // The undo window replaces the confirm dialog. 45s, server-side truth.
    undoUntil: new Date(Date.now() + 45_000).toISOString(),
  };
  addOrder(order);
  upsertCustomer({
    id: customerId, firstName: String(s.firstName), lastName: String(s.lastName),
    email: String(s.email ?? ''), phone: String(s.phone), address: '',
    dob: String(s.dob ?? ''), ageAffirmed: true,
    aeropayUserId: s.aeropayUserId ?? null, bankAccountId: s.bankAccountId ?? null,
    bankLabel: s.bankLabel ?? null, defaultStoreId: storeId,
  });

  const res = NextResponse.json({ order });
  // Carry it with the visitor — see lib/order-cookie.ts for why /tmp is not enough.
  res.cookies.set(ORDERS_COOKIE, withOrder(jar.get(ORDERS_COOKIE)?.value, order), {
    path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24,
  });
  return res;
}
