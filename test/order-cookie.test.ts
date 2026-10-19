/**
 * The bm_orders cookie is the ONLY proof /api/review has that an order exists
 * on a cold lambda (lib/order-cookie.ts). Before 2026-10-18 it was plain
 * base64url JSON, so anyone could mint an order for any product, post a
 * "verified-purchase" review, and move the finder's ranking (lib/rank.ts).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { encodeOrders, decodeOrders, withOrder } from "@/lib/order-cookie";
import type { Order } from "@/lib/types";

const order = (id: string): Order => ({
  id, shortCode: "ABCD", customerId: "c_1", storeId: "s1",
  lines: [{ productId: "giggle-gas-flower", qty: 1, priceCents: 1000 }],
  subtotalCents: 1000, taxCents: 249, totalCents: 1249, feeling: "sleep",
  pickupAt: "2026-10-18T20:00:00.000Z", status: "paid", paymentRef: null,
  paymentProvider: "aeropay-sim", createdAt: "2026-10-18T19:40:00.000Z", undoUntil: "2026-10-18T19:40:45.000Z",
});

test("a cookie we wrote round-trips", () => {
  const raw = encodeOrders([order("o_1")]);
  assert.deepEqual(decodeOrders(raw).map((o) => o.id), ["o_1"]);
  assert.deepEqual(decodeOrders(withOrder(raw, order("o_2"))).map((o) => o.id), ["o_1", "o_2"]);
});

test("a forged cookie (plain base64url JSON) decodes to nothing", () => {
  const forged = Buffer.from(JSON.stringify([order("o_forged")])).toString("base64url");
  assert.deepEqual(decodeOrders(forged), []);
});

test("a signed cookie with one byte of the payload changed decodes to nothing", () => {
  const raw = encodeOrders([order("o_1")]);
  const [payload, sig] = raw.split(".");
  const tampered = Buffer.from(JSON.stringify([{ ...order("o_1"), lines: [{ productId: "other", qty: 1, priceCents: 1 }] }])).toString("base64url");
  assert.deepEqual(decodeOrders(`${tampered}.${sig}`), []);
  assert.ok(payload && sig, "cookie carries a signature");
});
