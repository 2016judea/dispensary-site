import fs from 'node:fs';
import path from 'node:path';
import type { Customer, Order, Review } from './types';
import seedReviews from '@/data/reviews.seed.json';

/**
 * Demo persistence.
 *
 * Reviews are seeded from data/reviews.seed.json (committed, so the ranking has
 * real mass from the first page view). Anything written at runtime goes to a
 * JSON file under the OS temp dir, which on Vercel is per-instance and does not
 * survive a redeploy.
 *
 * PRODUCTION SWAP POINT: replace the four read/write helpers below with Postgres,
 * Vercel KV or the dispensary's POS. Nothing outside this file touches storage.
 * See docs/MAINTENANCE.md.
 */

const FILE = path.join(process.env.DATA_DIR || '/tmp', 'dispensary-demo-state.json');

interface State { orders: Order[]; reviews: Review[]; customers: Customer[] }

/**
 * Read through to the file on EVERY call, rather than caching a module
 * singleton.
 *
 * Why: Next bundles route handlers and server components separately, so a
 * module-level cache is NOT shared between /api/order and /order/[id] - they are
 * different instances of this module in the same process. Caching produced a
 * 404 on the order page immediately after the POST that created the order.
 * The file is a few kilobytes and this is a demo; correctness wins.
 */
let cache: State = { orders: [], reviews: [], customers: [] };

function load(): State {
  try {
    cache = JSON.parse(fs.readFileSync(FILE, 'utf8')) as State;
  } catch {
    /* no file yet, or unreadable: fall back to whatever this process holds */
  }
  return cache;
}

function save() {
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(cache));
  } catch {
    /* read-only fs: the in-process copy still serves this request */
  }
}

export function allReviews(): Review[] {
  return [...(seedReviews as Review[]), ...load().reviews];
}

export function reviewsForOrder(orderId: string): Review[] {
  return load().reviews.filter((r) => r.orderId === orderId);
}

export function addReview(r: Review) {
  load().reviews.push(r);
  save();
}

export function getOrder(id: string): Order | undefined {
  return load().orders.find((o) => o.id === id);
}

export function addOrder(o: Order) {
  load().orders.push(o);
  save();
}

export function updateOrder(id: string, patch: Partial<Order>): Order | undefined {
  const s = load();
  const i = s.orders.findIndex((o) => o.id === id);
  if (i < 0) return undefined;
  s.orders[i] = { ...s.orders[i], ...patch };
  save();
  return s.orders[i];
}

export function getCustomer(id: string): Customer | undefined {
  return load().customers.find((c) => c.id === id);
}

export function upsertCustomer(c: Customer) {
  const s = load();
  const i = s.customers.findIndex((x) => x.id === c.id);
  if (i < 0) s.customers.push(c);
  else s.customers[i] = c;
  save();
}

export function ordersForCustomer(id: string): Order[] {
  return load()
    .orders.filter((o) => o.customerId === id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
