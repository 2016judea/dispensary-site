import { createHmac, timingSafeEqual } from 'node:crypto';
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

/**
 * SIGNED, because /api/review treats this cookie as proof of purchase. Until
 * 2026-10-18 it was plain base64url JSON: anyone could mint an order for any
 * product, post a "verified-purchase" review and move the finder's ranking.
 * HMAC-SHA256 under ORDER_COOKIE_SECRET; with the secret unset NO cookie order
 * is trusted (the page still renders file-backed orders), and the server says so
 * once rather than falling back to a key that sits in a public repo.
 */
function secret(): string | null {
  const s = process.env.ORDER_COOKIE_SECRET;
  if (s) return s;
  if (!warned) { warned = true; console.error('[order-cookie] ORDER_COOKIE_SECRET is not set: orders carried by cookie are not trusted'); }
  return null;
}
let warned = false;

const sign = (payload: string, key: string) => createHmac('sha256', key).update(payload).digest('base64url');

export function encodeOrders(orders: Order[]): string {
  const payload = Buffer.from(JSON.stringify(orders.slice(-KEEP))).toString('base64url');
  const key = secret();
  return key ? `${payload}.${sign(payload, key)}` : payload;
}

export function decodeOrders(raw: string | undefined): Order[] {
  if (!raw) return [];
  const key = secret();
  if (!key) return [];
  const dot = raw.lastIndexOf('.');
  if (dot < 0) return [];
  const payload = raw.slice(0, dot), sig = raw.slice(dot + 1);
  const want = sign(payload, key);
  if (sig.length !== want.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return [];
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return Array.isArray(parsed) ? (parsed as Order[]) : [];
  } catch { return []; }
}

export function withOrder(raw: string | undefined, order: Order): string {
  const rest = decodeOrders(raw).filter((o) => o.id !== order.id);
  return encodeOrders([...rest, order]);
}
