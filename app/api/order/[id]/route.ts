import { NextResponse } from 'next/server';
import { getOrder, updateOrder } from '@/lib/store';

export const runtime = 'nodejs';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const order = getOrder(id);
  if (!order) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ order });
}

/** The undo. Only inside the window, and only from placed/paid. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const order = getOrder(id);
  if (!order) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (Date.now() > Date.parse(order.undoUntil)) {
    return NextResponse.json({ error: 'the undo window has closed — call the store' }, { status: 409 });
  }
  if (order.status !== 'placed' && order.status !== 'paid') {
    return NextResponse.json({ error: `cannot undo an order that is ${order.status}` }, { status: 409 });
  }
  const next = updateOrder(id, { status: 'cancelled' });
  return NextResponse.json({ order: next });
}
