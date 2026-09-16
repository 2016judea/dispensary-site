import type { Order } from './types';

/**
 * The order, carried in the visitor's own cookie.
 *
 * Why this exists: on Vercel each request can land on a different lambda
 * instance, and lib/store.ts writes to that instance's /tmp. The POST that
 * places an order and the GET that renders the order screen are different
 * functions, so locally the file bridges them and in production it does not —
 * measured 2026-09-15, the order page 404'd on the live deployment while
 * working perfectly on localhost. A demo that only works on the machine that
 * built it is not a demo.
 *
 * So the order travels with the person it belongs to. Last four orders, plain
 * JSON, base64url, httpOnly. On a real build this is a database row and this
 * file goes away with lib/store.ts.
 */
export const ORDERS_COOKIE = 'bm_orders';
const KEEP = 4;

export function encodeOrders(orders: Order[]): string {
  return Buffer.from(JSON.stringify(orders.slice(-KEEP))).toString('base64url');
}

export function decodeOrders(raw: string | undefined): Order[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    return Array.isArray(parsed) ? (parsed as Order[]) : [];
  } catch { return []; }
}

export function withOrder(raw: string | undefined, order: Order): string {
  const rest = decodeOrders(raw).filter((o) => o.id !== order.id);
  return encodeOrders([...rest, order]);
}
