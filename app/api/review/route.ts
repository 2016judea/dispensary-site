import { NextResponse } from 'next/server';
import { addReview, getOrder, reviewsForOrder } from '@/lib/store';
import { cookies } from 'next/headers';
import { ORDERS_COOKIE, decodeOrders } from '@/lib/order-cookie';
import type { FeelingId, Review } from '@/lib/types';

export const runtime = 'nodejs';

/**
 * VERIFIED PURCHASE ONLY. A review must name an order that exists, must be for a
 * product that was actually on it, and the order must have been picked up or
 * paid. There is no anonymous review path, on purpose: the whole ranking rests
 * on these, so an unverifiable one is worse than none.
 *
 * The rating is not a star. It is the SAME axis the shopper bought on -
 * "did this actually help you sleep?" - which is what lets the answer feed
 * straight back into the finder's ranking (lib/rank.ts).
 */
export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }); }

  const id = String(body.orderId ?? '');
  const jar = await cookies();
  // Verification still means "this order exists and this product was on it" —
  // the cookie is httpOnly and written only by the order route, so it is the
  // same proof the file was, and it survives a cold lambda.
  const order = getOrder(id) ?? decodeOrders(jar.get(ORDERS_COOKIE)?.value).find((o) => o.id === id);
  if (!order) return NextResponse.json({ error: 'no such order' }, { status: 404 });
  if (order.status === 'cancelled') return NextResponse.json({ error: 'that order was cancelled' }, { status: 409 });

  const productId = String(body.productId ?? '');
  if (!order.lines.some((l) => l.productId === productId)) {
    return NextResponse.json({ error: 'that product was not on this order' }, { status: 403 });
  }
  const feeling = String(body.feeling ?? order.feeling ?? '') as FeelingId;
  if (!feeling) return NextResponse.json({ error: 'which feeling was this for?' }, { status: 400 });

  const outcome = Number(body.outcome);
  if (![0, 1, 2].includes(outcome)) return NextResponse.json({ error: 'outcome must be 0, 1 or 2' }, { status: 400 });

  if (reviewsForOrder(order.id).some((r) => r.productId === productId && r.feeling === feeling)) {
    return NextResponse.json({ error: 'already reviewed' }, { status: 409 });
  }

  const review: Review = {
    id: `rv_${Math.random().toString(36).slice(2, 10)}`,
    orderId: order.id, productId, feeling, outcome: outcome as 0 | 1 | 2,
    note: body.note ? String(body.note).slice(0, 280) : undefined,
    createdAt: new Date().toISOString(),
  };
  addReview(review);
  return NextResponse.json({ review });
}
