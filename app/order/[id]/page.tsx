import { notFound } from 'next/navigation';
import { getOrder } from '@/lib/store';
import { cookies } from 'next/headers';
import { ORDERS_COOKIE, decodeOrders } from '@/lib/order-cookie';
import { productById } from '@/lib/rank';
import { currentBrand } from '@/lib/session';
import { money } from '@/lib/money';
import { REVIEW_PROMPT } from '@/lib/feelings';
import OrderLive from '@/components/OrderLive';
import type { FeelingId } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Your order' };

export default async function OrderPage({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const jar = await cookies();
  // The instance that placed this order may not be the instance rendering it.
  const order = getOrder(id) ?? decodeOrders(jar.get(ORDERS_COOKIE)?.value).find((o) => o.id === id);
  if (!order) notFound();
  const b = await currentBrand();
  const store = b.stores.find((s) => s.id === order.storeId) ?? b.stores[0];
  const items = order.lines.map((l) => ({ line: l, product: productById(l.productId) }));
  const when = new Date(order.pickupAt);
  const feeling = (order.feeling ?? null) as FeelingId | null;

  return (
    <main className="wrap">
      <h1 className="ask">
        {order.status === 'cancelled' ? 'Cancelled.' : 'Ready at ' +
          when.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) + '.'}
      </h1>

      {order.status !== 'cancelled' ? (
        <div className="pick">
          <span className="eyebrow">Show this at the counter</span>
          <h2 style={{ fontSize: 44, letterSpacing: '.12em', fontWeight: 800 }}>{order.shortCode}</h2>
          <p className="meta">{store.street}, {store.city} · {store.phone}</p>
          <p className="meta" style={{ marginTop: -4 }}>
            Bring a government ID. An employee checks it before the sale — Minn. Stat. 342.27 subd. 4.
          </p>
        </div>
      ) : null}

      <div className="pick">
        {items.map(({ line, product }) => (
          <div key={line.productId} className="line">
            <span>{product ? `${product.strain} · ${product.formatLabel}` : line.productId}{line.qty > 1 ? ` ×${line.qty}` : ''}</span>
            <span>{money(line.priceCents * line.qty)}</span>
          </div>
        ))}
        <div className="line"><span>Tax</span><span>{money(order.taxCents)}</span></div>
        <div className="line total">
          <span>{order.status === 'paid' ? 'Paid' : 'Total'}</span><span>{money(order.totalCents)}</span>
        </div>
        <p className="meta" style={{ marginTop: 8 }}>
          {order.paymentProvider === 'aeropay-sim'
            ? 'Payment simulated — no Aeropay merchant account is connected to this demo.'
            : 'Paid by bank through Aeropay.'}
        </p>
      </div>

      <OrderLive
        orderId={order.id}
        status={order.status}
        undoUntil={order.undoUntil}
        justPlaced={sp.new === '1'}
        feeling={feeling}
        prompt={feeling ? REVIEW_PROMPT[feeling] : null}
        items={items.map(({ line, product }) => ({
          productId: line.productId, label: product ? product.strain : line.productId,
        }))}
      />

      <p style={{ marginTop: 22 }}>
        <a className="linkish" href="/">Shop again</a>
      </p>
    </main>
  );
}
